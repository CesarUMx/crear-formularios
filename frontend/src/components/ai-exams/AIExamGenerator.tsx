import { useState, useEffect } from 'react';
import { aiExamService } from '../../lib/aiExamService';
import { useToast, ToastContainer, Dialog, useDialog, PageHeader } from '../common';
import { useColors } from '../../hooks/useColors';
import ExamLoader from './ExamLoader';
import QuestionTypeSelector from './QuestionTypeSelector';
import type { QuestionType } from './QuestionTypeSelector';
import QuestionRenderer from './QuestionRenderer';
import {
  Brain,
  Upload,
  FileText,
  Settings,
  Loader,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface GeneratedQuestion {
  text: string;
  type?: string;
  options?: {
    text: string;
    isCorrect: boolean;
  }[];
  feedback?: string;
  // Campos de metadata para diferentes tipos de preguntas
  pairs?: { left: string; right: string }[];
  blanks?: { position: number; correctAnswer: string }[];
  items?: { text: string; correctOrder: number }[];
  expectedAnswer?: string;
  keywords?: string[];
  rubric?: string;
  questions?: string[];
  solution?: string;
  imageDescription?: string;
  dataDescription?: string;
  [key: string]: any; // Permitir otros campos de metadata
}

interface AIExamGeneratorProps {
  examId?: string;
}

export default function AIExamGenerator({ examId: initialExamId }: AIExamGeneratorProps = {}) {
  const [step, setStep] = useState(1); // 1: Config, 2: Upload PDF, 3: Preview
  const cancelDialog = useDialog();
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [examId, setExamId] = useState<string | null>(initialExamId || null);
  const isEditMode = !!initialExamId;

  // Step 1: Configuración básica
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [timeLimit, setTimeLimit] = useState<number | ''>('');
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [passingScore, setPassingScore] = useState(60);
  const [accessType, setAccessType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState(10);

  // Step 2: Generación con IA
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numberOfQuestions, setNumberOfQuestions] = useState(15);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [topic, setTopic] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [regeneratingQuestionId, setRegeneratingQuestionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showQuestionTypeSelector, setShowQuestionTypeSelector] = useState(false);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>([]);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const toast = useToast();

  // Cargar datos del examen en modo edición
  useEffect(() => {
    if (isEditMode && initialExamId) {
      loadExamData(initialExamId);
    }
  }, [isEditMode, initialExamId]);

  const loadExamData = async (id: string) => {
    try {
      setLoading(true);
      const exam = await aiExamService.getExamById(id);
      
      setTitle(exam.title);
      setDescription(exam.description || '');
      setInstructions(exam.instructions || '');
      setTimeLimit(exam.timeLimit || '');
      setMaxAttempts(exam.maxAttempts);
      setPassingScore(exam.passingScore);
      setAccessType(exam.accessType);
      setQuestionsPerAttempt(exam.questionsPerAttempt);
      setIsPublished(exam.isActive); // ✅ Guardar si está publicado
      
      // Si ya tiene preguntas, ir al paso 3
      if (exam.sections && exam.sections.length > 0 && exam.sections[0].questions.length > 0) {
        const questions: GeneratedQuestion[] = exam.sections[0].questions.map((q: any) => ({
          text: q.text,
          type: q.metadata?.questionType || 'multiple_choice', // ✅ Incluir tipo
          options: q.options?.map((opt: any) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          })) || [],
          feedback: q.feedback || '',
          // ✅ Incluir todos los campos de metadata para renderizado correcto
          ...q.metadata, // pairs, blanks, items, etc.
        }));
        setGeneratedQuestions(questions);
        setStep(3);
      }
    } catch (error) {
      toast.error('Error', 'No se pudo cargar el examen');
      window.location.href = '/admin/ai-exams';
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async () => {
    if (!title.trim()) {
      toast.error('Error', 'El título es obligatorio');
      return;
    }

    if (questionsPerAttempt < 1) {
      toast.error('Error', 'Debe haber al menos 1 pregunta por intento');
      return;
    }

    setLoading(true);
    try {
      const exam = await aiExamService.createAIExam({
        title,
        description: description || undefined,
        instructions: instructions || undefined,
        timeLimit: timeLimit ? Number(timeLimit) : undefined,
        maxAttempts,
        passingScore,
        accessType,
        questionsPerAttempt,
      });

      setExamId(exam.id);
      setStep(2);
      toast.success('Examen creado', 'Ahora puedes generar preguntas con IA');
    } catch (err) {
      toast.error(
        'Error al crear examen',
        err instanceof Error ? err.message : 'Ocurrió un error inesperado'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Error', 'Solo se permiten archivos PDF');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Error', 'El archivo no debe superar 10MB');
        return;
      }
      setPdfFile(file);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!pdfFile || !examId) {
      toast.error('Error', 'Debes seleccionar un archivo PDF');
      return;
    }

    const minRequired = Math.ceil(questionsPerAttempt * 1.5);
    if (numberOfQuestions < minRequired) {
      toast.error(
        'Error',
        `Debes generar al menos ${minRequired} preguntas (50% más que las ${questionsPerAttempt} configuradas por intento)`
      );
      return;
    }

    // Mostrar selector de tipos de preguntas
    console.log('🎯 Mostrando selector de tipos de preguntas...');
    setShowQuestionTypeSelector(true);
  };

  const handleQuestionTypesConfirmed = async (types: QuestionType[]) => {
    setSelectedQuestionTypes(types);
    setShowQuestionTypeSelector(false);
    
    // Continuar con la generación

    setLoading(true);
    setShowLoader(true);
    setProgress(0);
    setProgressStep('Iniciando...');

    let eventSource: EventSource | null = null;

    try {
      if (!examId || !pdfFile) {
        toast.error('Error', 'Faltan datos requeridos');
        setLoading(false);
        setShowLoader(false);
        return;
      }

      // Generar jobId único
      const jobId = `${examId}-${Date.now()}`;
      
      // Conectar SSE inmediatamente
      eventSource = new EventSource(`http://localhost:3000/api/progress/${jobId}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setProgress(data.percentage || 0);
        setProgressStep(data.step || '');
        
        if (data.done || data.percentage >= 100) {
          eventSource?.close();
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ Error en SSE:', error);
        eventSource?.close();
      };

      // Pequeña espera para que SSE se establezca
      await new Promise(resolve => setTimeout(resolve, 100));

      // Iniciar la generación con el jobId
      const result = await aiExamService.generateQuestions(examId, {
        pdf: pdfFile,
        numberOfQuestions,
        difficulty,
        topic: topic || undefined,
        questionTypes: types.map(t => t.id),
        jobId: jobId,
      });

      setGeneratedQuestions(result.questions);
      setShowLoader(false);
      setStep(3);
      toast.success(
        'Preguntas generadas',
        `Se generaron ${result.totalGenerated} preguntas exitosamente`
      );
    } catch (err) {
      setShowLoader(false);
      toast.error(
        'Error al generar preguntas',
        err instanceof Error ? err.message : 'Ocurrió un error inesperado'
      );
    } finally {
      setLoading(false);
      eventSource?.close();
    }
  };

  const handlePublish = async () => {
    if (!examId) return;

    setLoading(true);
    try {
      await aiExamService.publishAIExam(examId);
      toast.success('Examen publicado', 'El examen está disponible para los estudiantes');
      setTimeout(() => {
        window.location.href = '/admin/ai-exams';
      }, 1500);
    } catch (err) {
     toast.error(
      'Error al publicar',
      err instanceof Error ? err.message : 'Ocurrió un error inesperado'
     );
    } finally {
      setLoading(false);      
    }
  };

  const handleSaveDraft = () => {
    toast.success('Borrador guardado', 'Puedes continuar editando más tarde');
    setTimeout(() => {
      window.location.href = '/admin/ai-exams';
    }, 1000);
  };

  const handleSaveChanges = () => {
    toast.success('Cambios guardados', 'Las preguntas se actualizaron correctamente');
    setTimeout(() => {
      window.location.href = '/admin/ai-exams';
    }, 1000);
  };

  const handleCancelEdit = () => {
    cancelDialog.open();
  };

  const confirmCancelEdit = () => {
    window.location.href = '/admin/ai-exams';
  };

  const handleUpdateConfig = async () => {
    if (!examId) return;
    
    if (!title.trim()) {
      toast.error('Error', 'El título es obligatorio');
      return;
    }

    if (questionsPerAttempt < 1) {
      toast.error('Error', 'Debe haber al menos 1 pregunta por intento');
      return;
    }

    setLoading(true);
    try {
      await aiExamService.updateExamConfig(examId, {
        title,
        description: description || undefined,
        instructions: instructions || undefined,
        timeLimit: timeLimit ? Number(timeLimit) : undefined,
        maxAttempts,
        passingScore,
        accessType,
        questionsPerAttempt,
      });

      toast.success('Configuración actualizada', 'Los cambios se guardaron correctamente');
      setShowConfigEditor(false);
    } catch (err) {
      toast.error(
        'Error al actualizar',
        err instanceof Error ? err.message : 'Ocurrió un error inesperado'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateQuestion = async (questionIndex: number) => {
    if (!examId) return;

    try {
      setRegeneratingQuestionId(questionIndex.toString());
      
      // Obtener el ID de la pregunta desde el backend
      const examData = await aiExamService.getExamById(examId);
      
      if (!examData.sections || examData.sections.length === 0) {
        throw new Error('No se encontraron secciones en el examen');
      }

      const allQuestions = examData.sections.flatMap((s: any) => s.questions);
      const questionToRegenerate = allQuestions[questionIndex];

      if (!questionToRegenerate) {
        throw new Error('Pregunta no encontrada');
      }

      const response = await fetch(`http://localhost:3000/api/ai-exams/questions/${questionToRegenerate.id}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al regenerar pregunta');
      }

      const updatedQuestion = await response.json();

      // Actualizar la pregunta en el estado local con todos los campos
      const updatedQuestions = [...generatedQuestions];
      updatedQuestions[questionIndex] = {
        ...updatedQuestion,
        // Asegurar que options esté formateado correctamente si existe
        options: updatedQuestion.options?.map((opt: any) => ({
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
      };
      setGeneratedQuestions(updatedQuestions);

      toast.success('Pregunta regenerada', 'La pregunta ha sido actualizada exitosamente');
    } catch (err) {
      toast.error(
        'Error al regenerar',
        err instanceof Error ? err.message : 'No se pudo regenerar la pregunta'
      );
    } finally {
      setRegeneratingQuestionId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        icon={Brain}
        title={isEditMode ? "Editar Examen con IA" : "Nuevo Examen con IA"}
        description="Crea exámenes automáticamente usando inteligencia artificial"
        primaryColor={colors.primaryColor}
      />
      
      {/* Progress Steps */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${step >= 1 ? '' : 'text-gray-400'}`} style={step >= 1 ? { color: colors.primaryColor } : {}}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'text-white' : 'bg-gray-200'}`} style={step >= 1 ? { backgroundColor: colors.primaryColor } : {}}>
              {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
            </div>
            <span className="font-medium">Configuración</span>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
          <div className={`flex items-center gap-2 ${step >= 2 ? '' : 'text-gray-400'}`} style={step >= 2 ? { color: colors.primaryColor } : {}}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'text-white' : 'bg-gray-200'}`} style={step >= 2 ? { backgroundColor: colors.primaryColor } : {}}>
              {step > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
            </div>
            <span className="font-medium">Generar Preguntas</span>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
          <div className={`flex items-center gap-2 ${step >= 3 ? '' : 'text-gray-400'}`} style={step >= 3 ? { color: colors.primaryColor } : {}}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'text-white' : 'bg-gray-200'}`} style={step >= 3 ? { backgroundColor: colors.primaryColor } : {}}>
              3
            </div>
            <span className="font-medium">Revisar y Publicar</span>
          </div>
        </div>
      </div>

      {/* Step 1: Configuración */}
      {step === 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Título */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título del Examen *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="Ej: Examen de Historia de México"
                required
              />
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="Descripción breve del examen..."
              />
            </div>

            {/* Instrucciones */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instrucciones para el Estudiante
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="Lee cuidadosamente cada pregunta antes de responder..."
              />
            </div>

            {/* Tiempo límite */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiempo Límite (minutos)
              </label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : '')}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="Sin límite"
              />
            </div>

            {/* Intentos máximos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intentos Máximos
              </label>
              <input
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                min="1"
                max="10"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              />
            </div>

            {/* Puntaje de aprobación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Puntaje de Aprobación (%)
              </label>
              <input
                type="number"
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                min="0"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              />
            </div>

            {/* Preguntas por intento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preguntas por Intento
              </label>
              <input
                type="number"
                value={questionsPerAttempt}
                onChange={(e) => setQuestionsPerAttempt(Number(e.target.value))}
                min="1"
                max="50"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Número de preguntas que verá cada estudiante
              </p>
            </div>

            {/* Tipo de acceso */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Acceso
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="PUBLIC"
                    checked={accessType === 'PUBLIC'}
                    onChange={(e) => setAccessType(e.target.value as 'PUBLIC')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Público (cualquiera con el link)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="PRIVATE"
                    checked={accessType === 'PRIVATE'}
                    onChange={(e) => setAccessType(e.target.value as 'PRIVATE')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Privado (solo estudiantes autorizados)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={handleCreateExam}
              disabled={loading}
              style={{ backgroundColor: colors.primaryColor }}
              className="flex items-center gap-2 px-6 py-2.5 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Generar Preguntas */}
      {step === 2 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="flex items-center gap-2 mb-4" style={{ color: colors.primaryColor }}>
            <Sparkles className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Generar Preguntas con IA</h2>
          </div>

          <div className="space-y-6">
            {/* Upload PDF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subir Documento PDF *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  {pdfFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <FileText className="w-5 h-5" />
                      <span className="font-medium">{pdfFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-600 font-medium mb-1">
                        Haz clic para seleccionar un PDF
                      </p>
                      <p className="text-sm text-gray-500">
                        Máximo 10MB - El contenido será analizado por IA
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Número de preguntas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Preguntas a Generar
                </label>
                <input
                  type="number"
                  value={numberOfQuestions}
                  onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                  min={Math.ceil(questionsPerAttempt * 1.5)}
                  max="50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  placeholder={`Mínimo: ${Math.ceil(questionsPerAttempt * 1.5)}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo: {Math.ceil(questionsPerAttempt * 1.5)} (configuradas por intento)
                </p>
              </div>

              {/* Dificultad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel de Dificultad
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                >
                  <option value="easy">Fácil</option>
                  <option value="medium">Medio</option>
                  <option value="hard">Difícil</option>
                </select>
              </div>

              {/* Tema */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tema Específico (opcional)
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  placeholder="Ej: Revolución Mexicana, Ecuaciones Cuadráticas, etc."
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Sobre la generación con IA:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>El proceso puede tardar 30-60 segundos</li>
                    <li>Se generarán preguntas de opción múltiple con 4 opciones</li>
                    <li>Podrás revisar y editar las preguntas antes de publicar</li>
                    <li>Se recomienda generar más preguntas de las necesarias para crear un pool</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Atrás
            </button>
            <button
              onClick={handleGenerateQuestions}
              disabled={loading || !pdfFile}
              style={{ backgroundColor: colors.primaryColor }}
              className="flex items-center gap-2 px-6 py-2.5 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Generando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generar Preguntas
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview y Publicar */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Preguntas Generadas Exitosamente</h2>
              </div>
              {isEditMode && (
                <button
                  onClick={() => setShowConfigEditor(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition" style={{ color: colors.primaryColor, borderColor: colors.primaryColor, backgroundColor: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors.primaryColor}10`} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Settings className="w-4 h-4" />
                  Editar Configuración
                </button>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                Se generaron <strong>{generatedQuestions.length} preguntas</strong> exitosamente.
                Puedes publicar el examen ahora o guardarlo como borrador para editarlo más tarde.
              </p>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {generatedQuestions.map((q, index) => {
                // Transformar pregunta para que tenga el tipo en el nivel superior
                const transformedQuestion = {
                  ...q,
                  type: (q as any).metadata?.questionType || (q as any).type || 'multiple_choice',
                  // Pasar todos los campos de metadata al nivel superior para QuestionRenderer
                  ...(q as any).metadata,
                };
                
                return (
                  <div key={index} className="relative">
                    <QuestionRenderer
                      question={transformedQuestion as any}
                      questionNumber={index + 1}
                      mode="preview"
                      showFeedback={true}
                    />
                    <button
                      onClick={() => handleRegenerateQuestion(index)}
                      disabled={regeneratingQuestionId === index.toString()}
                      className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm" style={{ color: colors.primaryColor, borderColor: colors.primaryColor }} onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = `${colors.primaryColor}10`)} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      title="Regenerar esta pregunta con un enfoque diferente"
                    >
                      {regeneratingQuestionId === index.toString() ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Regenerando...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span>Regenerar</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between">
            {isPublished ? (
              // Examen publicado: solo Cancelar y Guardar
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={loading}
                  style={{ backgroundColor: colors.primaryColor }}
                  className="flex items-center gap-2 px-6 py-2.5 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </>
            ) : (
              // Examen no publicado: Guardar Borrador y Publicar
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  <Save className="w-5 h-5" />
                  Guardar Borrador
                </button>
                <button
                  onClick={handlePublish}
                  disabled={loading}
                  style={{ backgroundColor: colors.primaryColor }}
                  className="flex items-center gap-2 px-6 py-2.5 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Publicar Examen
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Selector de tipos de preguntas */}
      {showQuestionTypeSelector && (
        <QuestionTypeSelector
          onConfirm={handleQuestionTypesConfirmed}
          onCancel={() => setShowQuestionTypeSelector(false)}
        />
      )}

      {/* Modal de edición de configuración */}
      {showConfigEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Editar Configuración del Examen</h3>
              <button
                onClick={() => setShowConfigEditor(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Título */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título del Examen *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    placeholder="Ej: Examen Final de Historia de México"
                  />
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    placeholder="Descripción breve del examen"
                  />
                </div>

                {/* Instrucciones */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instrucciones
                  </label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    placeholder="Instrucciones para los estudiantes"
                  />
                </div>

                {/* Tiempo límite */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiempo Límite (minutos)
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : '')}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    placeholder="Sin límite"
                  />
                </div>

                {/* Intentos máximos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intentos Máximos
                  </label>
                  <input
                    type="number"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  />
                </div>

                {/* Puntaje de aprobación */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Puntaje de Aprobación (%)
                  </label>
                  <input
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  />
                </div>

                {/* Preguntas por intento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preguntas por Intento
                  </label>
                  <input
                    type="number"
                    value={questionsPerAttempt}
                    onChange={(e) => setQuestionsPerAttempt(Number(e.target.value))}
                    min="1"
                    max="50"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Número de preguntas que verá cada estudiante
                  </p>
                </div>

                {/* Tipo de acceso */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Acceso
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="PUBLIC"
                        checked={accessType === 'PUBLIC'}
                        onChange={(e) => setAccessType(e.target.value as 'PUBLIC')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Público (cualquiera con el link)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="PRIVATE"
                        checked={accessType === 'PRIVATE'}
                        onChange={(e) => setAccessType(e.target.value as 'PRIVATE')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Privado (solo estudiantes autorizados)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowConfigEditor(false)}
                  disabled={loading}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateConfig}
                  disabled={loading}
                  style={{ backgroundColor: colors.primaryColor }}
                  className="flex items-center gap-2 px-6 py-2.5 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loader con progreso en tiempo real */}
      {showLoader && (
        <div className="fixed inset-0 bg-gray-800/80 transition-opacity z-50 flex items-center justify-center min-h-screen overflow-y-auto">
          <ExamLoader 
            controlled={true}
            externalProgress={progress}
            externalStep={progressStep}
          />
        </div>
      )}

      {/* Dialog de confirmación para cancelar edición */}
      <Dialog
        isOpen={cancelDialog.isOpen}
        onClose={cancelDialog.close}
        onConfirm={confirmCancelEdit}
        title="Cancelar Edición"
        message="¿Deseas cancelar la edición? Los cambios no guardados se perderán."
        type="warning"
        confirmText="Aceptar"
        cancelText="Cancelar"
      />

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
