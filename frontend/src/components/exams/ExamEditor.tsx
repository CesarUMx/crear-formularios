import { useState } from 'react';
import { examService } from '../../lib/examService';
import type { ExamQuestionType, ExamSectionInput, ExamQuestionInput, ExamAccessType } from '../../lib/types';
import { PageHeader, QuestionRenderer, FileUploader, RichTextEditor } from '../common';
import { useColors } from '../../hooks/useColors';
import {
  Plus,
  Trash2,
  Save,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Clock,
  FileText,
  Settings,
  Eye,
  GripVertical,
  CheckSquare,
  ListChecks,
  List,
  Columns,
  ArrowDownUp,
  Type,
  AlignLeft,
  Lock,
  Globe,
  Shuffle,
  ArrowRight,
  CheckCircle,
  Paperclip,
  Minus,
  Shield,
} from 'lucide-react';
import { useToast, ToastContainer } from '../common';

// ==================== TIPOS ====================

interface ExamEditorProps {
  examId?: string;
  initialData?: {
    title: string;
    description?: string;
    instructions?: string;
    timeLimit?: number;
    maxAttempts?: number;
    passingScore?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showResults?: boolean;
    accessType?: ExamAccessType;
    questionsPerAttempt?: number;
    sections: ExamSectionInput[];
  };
}

const QUESTION_TYPES: { value: ExamQuestionType; label: string; icon: any; description: string }[] = [
  { value: 'RADIO', label: 'Opcion Unica', icon: CheckSquare, description: 'Una sola respuesta correcta' },
  { value: 'CHECKBOX', label: 'Opcion Multiple', icon: ListChecks, description: 'Varias respuestas correctas' },
  { value: 'TRUE_FALSE', label: 'Verdadero/Falso', icon: List, description: 'Verdadero o Falso' },
  { value: 'MATCHING', label: 'Emparejar', icon: Columns, description: 'Relacionar columnas' },
  { value: 'ORDERING', label: 'Ordenar', icon: ArrowDownUp, description: 'Secuencia correcta' },
  { value: 'FILL_BLANK', label: 'Completar', icon: FileText, description: 'Completar espacios en blanco' },
  { value: 'TEXT', label: 'Respuesta Corta', icon: Type, description: 'Texto corto (calificacion manual)' },
  { value: 'TEXTAREA', label: 'Respuesta Larga', icon: AlignLeft, description: 'Texto largo (calificacion manual)' },
];

// ==================== COMPONENTE PRINCIPAL ====================

export default function ExamEditor({ examId, initialData }: ExamEditorProps) {
  const colors = useColors();
  const toast = useToast();

  // Paso actual: 1=Configuracion, 2=Preguntas, 3=Vista previa
  const [step, setStep] = useState(1);

  // Configuracion (Paso 1)
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [instructions, setInstructions] = useState(initialData?.instructions || '');
  const [timeLimit, setTimeLimit] = useState<number | undefined>(initialData?.timeLimit);
  const [maxAttempts, setMaxAttempts] = useState(initialData?.maxAttempts || 1);
  const [passingScore, setPassingScore] = useState(initialData?.passingScore || 60);
  const shuffleQuestions = true;
  const shuffleOptions = true;
  const [showResults, setShowResults] = useState(initialData?.showResults !== false);
  const [accessType, setAccessType] = useState<ExamAccessType>(initialData?.accessType || 'PUBLIC');
  const [poolEnabled, setPoolEnabled] = useState(!!initialData?.questionsPerAttempt);
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState(initialData?.questionsPerAttempt || 0);
  const [strictSecurity, setStrictSecurity] = useState(initialData?.strictSecurity || false);

  // Preguntas (Paso 2)
  const [sections, setSections] = useState<ExamSectionInput[]>(
    initialData?.sections || [{
      title: 'Seccion 1',
      description: '',
      questions: [createEmptyQuestion('RADIO')]
    }]
  );
  const [expandedSections, setExpandedSections] = useState<number[]>([0]);

  // Estado general
  const [loading, setLoading] = useState(false);

  // ==================== HELPERS ====================

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const totalPoints = sections.reduce((sum, s) =>
    sum + s.questions.reduce((qSum, q) => qSum + (q.points || 0), 0), 0
  );

  // ==================== PASO 1: VALIDACION ====================

  const validateStep1 = (): boolean => {
    if (!title.trim()) {
      toast.error('Error', 'El titulo es requerido');
      return false;
    }
    return true;
  };

  // ==================== PASO 2: SECCIONES Y PREGUNTAS ====================

  const toggleSection = (index: number) => {
    setExpandedSections(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const addSection = () => {
    setSections([...sections, {
      title: `Seccion ${sections.length + 1}`,
      description: '',
      questions: [createEmptyQuestion('RADIO')]
    }]);
    setExpandedSections([...expandedSections, sections.length]);
  };

  const removeSection = (index: number) => {
    if (sections.length === 1) {
      toast.warning('Aviso', 'Debe haber al menos una seccion');
      return;
    }
    setSections(sections.filter((_, i) => i !== index));
    setExpandedSections(expandedSections.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  const updateSection = (index: number, field: string, value: any) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  };

  const addQuestion = (sectionIndex: number, type: ExamQuestionType = 'RADIO') => {
    const newSections = [...sections];
    newSections[sectionIndex].questions.push(createEmptyQuestion(type));
    setSections(newSections);
  };

  const removeQuestion = (sectionIndex: number, questionIndex: number) => {
    const newSections = [...sections];
    if (newSections[sectionIndex].questions.length === 1) {
      toast.warning('Aviso', 'Debe haber al menos una pregunta por seccion');
      return;
    }
    newSections[sectionIndex].questions.splice(questionIndex, 1);
    setSections(newSections);
  };

  const updateQuestion = (sectionIndex: number, questionIndex: number, updates: Partial<ExamQuestionInput>) => {
    const newSections = [...sections];
    newSections[sectionIndex].questions[questionIndex] = {
      ...newSections[sectionIndex].questions[questionIndex],
      ...updates
    };
    setSections(newSections);
  };

  // ==================== DISTRIBUCION AUTOMATICA DE TIEMPO ====================

  const handleAutoDistribute = () => {
    if (!timeLimit) {
      toast.warning('Aviso', 'Primero define el tiempo limite del examen');
      return;
    }

    // Calcular tiempo ya asignado
    const assignedTime = sections.reduce((sum, s) => sum + (s.timeLimit || 0), 0);
    const availableTime = timeLimit - assignedTime;

    // Contar secciones sin tiempo
    const sectionsWithoutLimit = sections.filter(s => !s.timeLimit);

    if (sectionsWithoutLimit.length === 0) {
      toast.info('Info', 'Todas las secciones ya tienen tiempo asignado');
      return;
    }

    if (availableTime <= 0) {
      toast.error('Error', 'No hay tiempo disponible para distribuir. Reduce el tiempo de otras secciones.');
      return;
    }

    // Distribuir equitativamente
    const timePerSection = Math.floor(availableTime / sectionsWithoutLimit.length);
    const remainder = availableTime % sectionsWithoutLimit.length;

    const newSections = sections.map((s, index) => {
      if (!s.timeLimit) {
        // Asignar tiempo base más 1 extra si hay residuo
        const extraMin = remainder > 0 && sectionsWithoutLimit.indexOf(s) < remainder ? 1 : 0;
        return { ...s, timeLimit: timePerSection + extraMin };
      }
      return s;
    });

    setSections(newSections);
    toast.success('Distribuido', `${timePerSection} min asignados a ${sectionsWithoutLimit.length} secci${sectionsWithoutLimit.length > 1 ? 'ones' : 'on'}`);
  };

  const validateStep2 = (): boolean => {
    for (const section of sections) {
      if (!section.title.trim()) {
        toast.error('Error', 'Todas las secciones deben tener titulo');
        return false;
      }
      for (const q of section.questions) {
        if (!q.text.trim()) {
          toast.error('Error', 'Todas las preguntas deben tener texto');
          return false;
        }
        if (['RADIO', 'CHECKBOX', 'TRUE_FALSE'].includes(q.type)) {
          if (!q.options || q.options.length < 2) {
            toast.error('Error', `"${q.text.substring(0, 30)}..." necesita al menos 2 opciones`);
            return false;
          }
          if (!q.options.some(o => o.isCorrect)) {
            toast.error('Error', `"${q.text.substring(0, 30)}..." necesita al menos una respuesta correcta`);
            return false;
          }
        }
        if (q.type === 'MATCHING' && (!q.metadata?.pairs || q.metadata.pairs.length < 2)) {
          toast.error('Error', `"${q.text.substring(0, 30)}..." necesita al menos 2 pares`);
          return false;
        }
        if (q.type === 'ORDERING' && (!q.metadata?.items || q.metadata.items.length < 2)) {
          toast.error('Error', `"${q.text.substring(0, 30)}..." necesita al menos 2 elementos`);
          return false;
        }
      }
    }
    if (totalPoints <= 0) {
      toast.error('Error', 'Los puntos totales deben ser mayores a 0');
      return false;
    }

    // ==================== VALIDACIONES MEJORADAS DE TIEMPO ====================
    const totalSectionTime = sections.reduce((sum, s) => sum + (s.timeLimit || 0), 0);
    const sectionsWithoutLimit = sections.filter(s => !s.timeLimit);

    // Si hay tiempo global, TODAS las secciones deben tener tiempo
    if (timeLimit && sectionsWithoutLimit.length > 0) {
      toast.error('Error critico',
        `Todas las secciones deben tener tiempo limite cuando el examen tiene limite global. ` +
        `Usa el boton "Distribuir automaticamente" o asigna tiempo manualmente.`
      );
      return false;
    }

    // La suma no puede exceder el global
    if (timeLimit && totalSectionTime > timeLimit) {
      toast.error('Error',
        `La suma de tiempos de secciones (${totalSectionTime} min) excede el tiempo total del examen (${timeLimit} min)`
      );
      return false;
    }

    // Advertencia si sobra tiempo (pero ya no debería pasar con la validación anterior)
    if (timeLimit && totalSectionTime < timeLimit) {
      toast.warning('Advertencia',
        `Sobran ${timeLimit - totalSectionTime} min sin asignar. Considera ajustar los tiempos de las secciones.`,
        5000
      );
    }

    return true;
  };

  // ==================== SUBMIT ====================

  const handleSubmit = async (publish: boolean = false) => {
    setLoading(true);
    try {
      const data = {
        title,
        description: description || undefined,
        instructions: instructions || undefined,
        timeLimit: timeLimit || undefined,
        maxAttempts,
        passingScore,
        shuffleQuestions,
        shuffleOptions,
        showResults,
        accessType,
        questionsPerAttempt: poolEnabled ? questionsPerAttempt : undefined,
        strictSecurity,
        sections: sections.map(s => ({
          title: s.title,
          description: s.description,
          timeLimit: s.timeLimit,
          fileUrl: s.fileUrl,
          fileName: s.fileName,
          fileType: s.fileType,
          questions: s.questions.map(q => ({
            type: q.type,
            text: q.text,
            helpText: q.helpText,
            points: q.points,
            options: q.options,
            correctAnswer: q.correctAnswer,
            metadata: q.metadata,
            feedback: q.feedback,
            fileUrl: q.fileUrl,
            fileName: q.fileName,
            fileType: q.fileType
          }))
        }))
      };

      let savedExamId = examId;
      let savedExam: any = null;

      if (examId) {
        await examService.updateExam(examId, data);
        savedExam = await examService.getExamById(examId);
        if (publish) {
          await examService.toggleExamPublish(examId, true);
        }
      } else {
        const result = await examService.createExam(data);
        savedExamId = result.exam.id;
        savedExam = result.exam;
        if (publish) {
          await examService.toggleExamPublish(result.exam.id, true);
        }
      }

      // Subir archivos pendientes
      if (savedExamId && savedExam) {
        await uploadPendingFiles(savedExamId, savedExam);
      }

      toast.success(examId ? 'Examen actualizado' : (publish ? 'Examen publicado' : 'Examen guardado como borrador'));
      
      setTimeout(() => {
        window.location.href = '/admin/exams';
      }, 1000);
    } catch (err: any) {
      toast.error('Error', err.message || 'Error al guardar el examen');
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para subir archivos pendientes
  const uploadPendingFiles = async (savedExamId: string, savedExam: any) => {
    const promises: Promise<void>[] = [];

    // Iterar secciones
    sections.forEach((section, sIdx) => {
      const savedSection = savedExam.sections?.[sIdx];
      
      // Subir archivo de sección si está pendiente
      if (section.pendingFile && savedSection?.id) {
        promises.push(
          examService.uploadSectionFile(savedExamId, savedSection.id, section.pendingFile)
            .then(result => {
              const newSections = [...sections];
              newSections[sIdx] = {
                ...newSections[sIdx],
                id: savedSection.id,
                fileUrl: result.section.fileUrl,
                fileName: result.section.fileName,
                fileType: result.section.fileType,
                pendingFile: undefined
              };
              setSections(newSections);
            })
            .catch(err => console.error(`Error subiendo archivo de sección ${sIdx}:`, err))
        );
      }

      // Subir archivos de preguntas
      section.questions.forEach((question, qIdx) => {
        const savedQuestion = savedSection?.questions?.[qIdx];
        
        if (question.pendingFile && savedQuestion?.id) {
          promises.push(
            examService.uploadQuestionFile(savedExamId, savedQuestion.id, question.pendingFile)
              .then(result => {
                const newSections = [...sections];
                newSections[sIdx].questions[qIdx] = {
                  ...newSections[sIdx].questions[qIdx],
                  id: savedQuestion.id,
                  fileUrl: result.question.fileUrl,
                  fileName: result.question.fileName,
                  fileType: result.question.fileType,
                  pendingFile: undefined
                };
                setSections(newSections);
              })
              .catch(err => console.error(`Error subiendo archivo de pregunta S${sIdx}Q${qIdx}:`, err))
          );
        }
      });
    });

    await Promise.all(promises);
  };

  // ==================== RENDER ====================

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={FileText}
        title={examId ? 'Editar Examen' : 'Crear Nuevo Examen'}
        description={
          step === 1 ? 'Paso 1: Configuracion general' :
          step === 2 ? 'Paso 2: Crear preguntas' :
          'Paso 3: Vista previa y publicar'
        }
        primaryColor={colors.primaryColor}
      />

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />

      {/* Indicador de pasos */}
      <StepIndicator currentStep={step} primaryColor={colors.primaryColor} onStepClick={(s) => {
        if (s < step) setStep(s);
        else if (s === 2 && step === 1 && validateStep1()) setStep(2);
        else if (s === 3 && step === 2 && validateStep2()) setStep(3);
      }} />

      {/* Paso 1: Configuracion */}
      {step === 1 && (
        <Step1Configuration
          title={title} setTitle={setTitle}
          description={description} setDescription={setDescription}
          instructions={instructions} setInstructions={setInstructions}
          timeLimit={timeLimit} setTimeLimit={setTimeLimit}
          maxAttempts={maxAttempts} setMaxAttempts={setMaxAttempts}
          passingScore={passingScore} setPassingScore={setPassingScore}
          showResults={showResults} setShowResults={setShowResults}
          accessType={accessType} setAccessType={setAccessType}
          poolEnabled={poolEnabled} setPoolEnabled={setPoolEnabled}
          questionsPerAttempt={questionsPerAttempt} setQuestionsPerAttempt={setQuestionsPerAttempt}
          strictSecurity={strictSecurity} setStrictSecurity={setStrictSecurity}
          onNext={() => { if (validateStep1()) setStep(2); }}
          primaryColor={colors.primaryColor}
        />
      )}

      {/* Paso 2: Preguntas */}
      {step === 2 && (
        <Step2Questions
          examId={examId}
          sections={sections}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          addSection={addSection}
          removeSection={removeSection}
          updateSection={updateSection}
          addQuestion={addQuestion}
          removeQuestion={removeQuestion}
          updateQuestion={updateQuestion}
          totalPoints={totalPoints}
          timeLimit={timeLimit}
          handleAutoDistribute={handleAutoDistribute}
          onPrev={() => setStep(1)}
          onNext={() => { if (validateStep2()) setStep(3); }}
          primaryColor={colors.primaryColor}
        />
      )}

      {/* Paso 3: Vista previa */}
      {step === 3 && (
        <Step3Preview
          title={title}
          description={description}
          instructions={instructions}
          timeLimit={timeLimit}
          maxAttempts={maxAttempts}
          passingScore={passingScore}
          shuffleQuestions={shuffleQuestions}
          shuffleOptions={shuffleOptions}
          showResults={showResults}
          accessType={accessType}
          poolEnabled={poolEnabled}
          questionsPerAttempt={questionsPerAttempt}
          sections={sections}
          totalPoints={totalPoints}
          totalQuestions={totalQuestions}
          loading={loading}
          isEdit={!!examId}
          onPrev={() => setStep(2)}
          onSaveDraft={() => handleSubmit(false)}
          onPublish={() => handleSubmit(true)}
          primaryColor={colors.primaryColor}
        />
      )}
    </div>
  );
}

// ==================== INDICADOR DE PASOS ====================

function StepIndicator({ currentStep, primaryColor, onStepClick }: { currentStep: number; primaryColor: string; onStepClick: (step: number) => void }) {
  const steps = [
    { num: 1, label: 'Configuracion' },
    { num: 2, label: 'Preguntas' },
    { num: 3, label: 'Vista Previa' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        {steps.map((s, idx) => (
          <div key={s.num} className="contents">
            <button
              onClick={() => onStepClick(s.num)}
              className={`flex items-center gap-2 ${currentStep >= s.num ? '' : 'text-gray-400'}`}
              style={currentStep >= s.num ? { color: primaryColor } : {}}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  currentStep >= s.num ? 'text-white' : 'bg-gray-200'
                }`}
                style={currentStep >= s.num ? { backgroundColor: primaryColor } : {}}
              >
                {currentStep > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
              </div>
              <span className="font-medium">{s.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <ArrowRight className="w-5 h-5 text-gray-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== PASO 1: CONFIGURACION ====================

interface Step1Props {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  instructions: string; setInstructions: (v: string) => void;
  timeLimit: number | undefined; setTimeLimit: (v: number | undefined) => void;
  maxAttempts: number; setMaxAttempts: (v: number) => void;
  passingScore: number; setPassingScore: (v: number) => void;
  showResults: boolean; setShowResults: (v: boolean) => void;
  accessType: ExamAccessType; setAccessType: (v: ExamAccessType) => void;
  poolEnabled: boolean; setPoolEnabled: (v: boolean) => void;
  questionsPerAttempt: number; setQuestionsPerAttempt: (v: number) => void;
  strictSecurity: boolean; setStrictSecurity: (v: boolean) => void;
  onNext: () => void;
  primaryColor: string;
}

function Step1Configuration(props: Step1Props) {
  return (
    <div className="space-y-6">
      {/* Informacion basica */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Informacion del Examen
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titulo *</label>
          <input
            type="text"
            value={props.title}
            onChange={(e) => props.setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: Examen Final de Matematicas"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
          <textarea
            value={props.description}
            onChange={(e) => props.setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            placeholder="Descripcion del examen..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instrucciones para el estudiante</label>
          <textarea
            value={props.instructions}
            onChange={(e) => props.setInstructions(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Instrucciones que vera el estudiante antes de iniciar..."
          />
        </div>
      </div>

      {/* Configuracion */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuracion
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              Tiempo Limite (min)
            </label>
            <input
              type="number"
              value={props.timeLimit || ''}
              onChange={(e) => props.setTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Sin limite"
              min={1}
            />
            {props.timeLimit && (
              <p className="text-xs text-blue-600 mt-1">
                La distribucion de tiempo se configurara en el siguiente paso
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intentos Maximos</label>
            <input
              type="number"
              value={props.maxAttempts}
              onChange={(e) => props.setMaxAttempts(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={1}
              max={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calificacion Minima (%)</label>
            <input
              type="number"
              value={props.passingScore}
              onChange={(e) => props.setPassingScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={0}
              max={100}
            />
          </div>
        </div>

        {/* Tipo de acceso */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Acceso</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => props.setAccessType('PUBLIC')}
              className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                props.accessType === 'PUBLIC'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Globe className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Publico</p>
                <p className="text-xs text-gray-500">Cualquiera con el enlace</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => props.setAccessType('PRIVATE')}
              className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                props.accessType === 'PRIVATE'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Lock className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Privado</p>
                <p className="text-xs text-gray-500">Solo estudiantes autorizados</p>
              </div>
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleField
            label="Mostrar resultados"
            description="Alumno ve calificacion y respuestas"
            icon={Eye}
            checked={props.showResults}
            onChange={props.setShowResults}
          />
          <ToggleField
            label="Pool de preguntas"
            description="Mostrar subconjunto aleatorio"
            icon={Shuffle}
            checked={props.poolEnabled}
            onChange={props.setPoolEnabled}
          />
          <ToggleField
            label="Seguridad estricta"
            description="Modal bloqueante con codigo unico"
            icon={Shield}
            checked={props.strictSecurity}
            onChange={props.setStrictSecurity}
          />
        </div>

        {props.poolEnabled && (
          <div className="pl-4 border-l-2 border-blue-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preguntas por intento
            </label>
            <input
              type="number"
              value={props.questionsPerAttempt || ''}
              onChange={(e) => props.setQuestionsPerAttempt(parseInt(e.target.value) || 0)}
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={1}
              placeholder="Cantidad"
            />
            <p className="text-xs text-gray-500 mt-1">
              Debe ser menor al total de preguntas del examen
            </p>
          </div>
        )}
      </div>

      {/* Boton siguiente */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={props.onNext}
          className="flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium transition hover:opacity-90"
          style={{ backgroundColor: props.primaryColor }}
        >
          Siguiente: Preguntas
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ==================== PASO 2: PREGUNTAS ====================

interface Step2Props {
  examId?: string;
  sections: ExamSectionInput[];
  expandedSections: number[];
  toggleSection: (index: number) => void;
  addSection: () => void;
  removeSection: (index: number) => void;
  updateSection: (index: number, field: string, value: any) => void;
  addQuestion: (sectionIndex: number, type?: ExamQuestionType) => void;
  removeQuestion: (sectionIndex: number, questionIndex: number) => void;
  updateQuestion: (sectionIndex: number, questionIndex: number, updates: Partial<ExamQuestionInput>) => void;
  totalPoints: number;
  timeLimit?: number;
  handleAutoDistribute: () => void;
  onPrev: () => void;
  onNext: () => void;
  primaryColor: string;
}

function Step2Questions(props: Step2Props) {
  const [addingQuestionTo, setAddingQuestionTo] = useState<number | null>(null);
  const [showFileUploader, setShowFileUploader] = useState<Set<number>>(new Set());

  const toggleFileUploader = (sectionIndex: number) => {
    const newSet = new Set(showFileUploader);
    if (newSet.has(sectionIndex)) {
      newSet.delete(sectionIndex);
    } else {
      newSet.add(sectionIndex);
    }
    setShowFileUploader(newSet);
  };

  return (
    <div className="space-y-4">
      {/* Panel de Distribucion de Tiempo */}
      {props.timeLimit && (() => {
        const totalSectionTime = props.sections.reduce((sum, s) => sum + (s.timeLimit || 0), 0);
        const sectionsWithoutLimit = props.sections.filter(s => !s.timeLimit);
        const availableTime = props.timeLimit - totalSectionTime;
        const isValid = availableTime >= 0;
        
        return (
          <div className={`bg-white rounded-lg shadow-sm p-4 border-2 ${
            !isValid ? 'border-red-300' : 
            sectionsWithoutLimit.length > 0 || availableTime > 0 ? 'border-amber-300' : 
            'border-green-300'
          }`}>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Distribucion de Tiempo
            </h4>
            
            <div className="space-y-2 text-xs mb-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Tiempo global del examen:</span>
                <span className="font-mono font-bold text-gray-900">{props.timeLimit} min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Asignado en secciones:</span>
                <span className="font-mono font-semibold text-blue-700">{totalSectionTime} min</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-300 pt-2">
                <span className="font-medium text-gray-800">Tiempo disponible:</span>
                <span className={`font-mono font-bold text-base ${
                  availableTime < 0 ? 'text-red-600' : 
                  availableTime === 0 ? 'text-green-600' : 
                  'text-amber-600'
                }`}>
                  {availableTime} min
                </span>
              </div>
              {sectionsWithoutLimit.length > 0 && (
                <div className="flex justify-between items-center text-amber-800 bg-amber-100 rounded px-2 py-1">
                  <span className="font-medium">Secciones sin limite:</span>
                  <span className="font-bold">{sectionsWithoutLimit.length} de {props.sections.length}</span>
                </div>
              )}
            </div>
            
            {sectionsWithoutLimit.length > 0 && availableTime > 0 && (
              <button
                type="button"
                onClick={props.handleAutoDistribute}
                className="w-full px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Distribuir automaticamente ({Math.floor(availableTime / sectionsWithoutLimit.length)} min por seccion)
              </button>
            )}
            
            {!isValid && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-red-700 bg-red-100 rounded px-2 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Error:</strong> La suma de tiempos de secciones excede el limite global. 
                  Reduce los tiempos de las secciones o aumenta el tiempo del examen.
                </span>
              </div>
            )}
            
            {isValid && sectionsWithoutLimit.length > 0 && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-100 rounded px-2 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Todas las secciones deben tener tiempo limite. Usa el boton de arriba para distribuir automaticamente.
                </span>
              </div>
            )}
            
            {isValid && sectionsWithoutLimit.length === 0 && availableTime > 0 && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-100 rounded px-2 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Sobran {availableTime} minutos sin asignar. Considera distribuirlos entre las secciones o reducir el tiempo global del examen.
                </span>
              </div>
            )}
            
            {isValid && sectionsWithoutLimit.length === 0 && availableTime === 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 bg-green-100 rounded px-2 py-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                <span><strong>Perfecto:</strong> Tiempo completamente distribuido</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Resumen */}
      <div className="bg-white rounded-lg shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            {props.sections.length} seccion(es)
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">
            {props.sections.reduce((s, sec) => s + sec.questions.length, 0)} pregunta(s)
          </span>
          <span className="text-gray-300">|</span>
          <span className={`font-semibold ${props.totalPoints > 0 ? 'text-blue-600' : 'text-red-500'}`}>
            {props.totalPoints} pts total
          </span>
        </div>
      </div>

      {/* Secciones */}
      {props.sections.map((section, sIdx) => {
        const isExpanded = props.expandedSections.includes(sIdx);
        const sectionPoints = section.questions.reduce((sum, q) => sum + (q.points || 0), 0);

        return (
          <div key={sIdx} className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header de seccion */}
            <div
              className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50"
              onClick={() => props.toggleSection(sIdx)}
            >
              <GripVertical className="w-4 h-4 text-gray-300" />
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              <div className="flex-1">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => { e.stopPropagation(); props.updateSection(sIdx, 'title', e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-base font-semibold bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                  placeholder="Nombre de la seccion"
                />
              </div>
              <div className="flex items-center gap-2">
                {section.timeLimit && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    <Clock className="w-3 h-3" />
                    {section.timeLimit} min
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {section.questions.length} preg. | {sectionPoints} pts
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); props.removeSection(sIdx); }}
                className="p-1 text-gray-400 hover:text-red-500 transition"
                title="Eliminar seccion"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido de seccion */}
            {isExpanded && (
              <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                <input
                  type="text"
                  value={section.description || ''}
                  onChange={(e) => props.updateSection(sIdx, 'description', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  placeholder="Descripcion de la seccion (opcional)"
                />

                {/* Campo de tiempo limite por seccion */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-blue-900 mb-1">
                      Tiempo limite para esta seccion (opcional)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={section.timeLimit || ''}
                        onChange={(e) => props.updateSection(sIdx, 'timeLimit', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-24 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Min"
                      />
                      <span className="text-sm text-blue-700">minutos</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {section.timeLimit 
                        ? `Los estudiantes tendran ${section.timeLimit} min para completar esta seccion`
                        : 'Sin limite de tiempo especifico para esta seccion'
                      }
                    </p>
                  </div>
                </div>

                {/* Archivo de seccion - Toggle */}
                {!showFileUploader.has(sIdx) ? (
                  <button
                    type="button"
                    onClick={() => toggleFileUploader(sIdx)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {section.fileUrl || section.pendingFile ? 'Ver archivo adjunto' : 'Agregar archivo adjunto'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <Paperclip className="w-3.5 h-3.5" />
                        Archivo adjunto de seccion
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleFileUploader(sIdx)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Ocultar"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <FileUploader
                      currentFile={section.fileUrl ? { url: section.fileUrl, name: section.fileName || 'archivo', type: section.fileType || '' } : null}
                      pendingFile={section.pendingFile || null}
                      onUpload={(file) => {
                        // Si hay ID, subir inmediatamente; si no, guardar como pendiente
                        if (props.examId && section.id) {
                          examService.uploadSectionFile(props.examId, section.id, file)
                            .then(result => {
                              const s = result.section;
                              props.updateSection(sIdx, 'fileUrl', s.fileUrl);
                              props.updateSection(sIdx, 'fileName', s.fileName);
                              props.updateSection(sIdx, 'fileType', s.fileType);
                              props.updateSection(sIdx, 'pendingFile', undefined);
                            })
                            .catch(err => console.error('Error subiendo archivo de seccion:', err));
                        } else {
                          // Guardar como pendiente
                          props.updateSection(sIdx, 'pendingFile', file);
                        }
                      }}
                      onRemove={() => {
                        if (props.examId && section.id && section.fileUrl) {
                          // Si hay archivo guardado, eliminarlo del servidor
                          examService.deleteSectionFile(props.examId, section.id)
                            .then(() => {
                              props.updateSection(sIdx, 'fileUrl', undefined);
                              props.updateSection(sIdx, 'fileName', undefined);
                              props.updateSection(sIdx, 'fileType', undefined);
                            })
                            .catch(err => console.error('Error eliminando archivo de seccion:', err));
                        } else {
                          // Solo remover el archivo pendiente
                          props.updateSection(sIdx, 'pendingFile', undefined);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Preguntas */}
                {section.questions.map((question, qIdx) => (
                  <QuestionEditor
                    key={qIdx}
                    examId={props.examId}
                    sectionId={section.id}
                    question={question}
                    sectionIndex={sIdx}
                    questionIndex={qIdx}
                    questionNumber={
                      props.sections.slice(0, sIdx).reduce((sum, s) => sum + s.questions.length, 0) + qIdx + 1
                    }
                    onUpdate={(updates) => props.updateQuestion(sIdx, qIdx, updates)}
                    onRemove={() => props.removeQuestion(sIdx, qIdx)}
                  />
                ))}

                {/* Selector de tipo (para agregar pregunta) */}
                {addingQuestionTo === sIdx ? (
                  <div className="p-4 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50">
                    <p className="text-sm font-medium text-gray-700 mb-3">Selecciona el tipo de pregunta:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {QUESTION_TYPES.map(qt => (
                        <button
                          key={qt.value}
                          type="button"
                          onClick={() => { props.addQuestion(sIdx, qt.value); setAddingQuestionTo(null); }}
                          className="flex flex-col items-center gap-1 p-3 rounded-lg border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition text-center"
                        >
                          <qt.icon className="w-5 h-5 text-gray-600" />
                          <span className="text-xs font-medium">{qt.label}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddingQuestionTo(null)}
                      className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingQuestionTo(sIdx)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Pregunta
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Agregar seccion */}
      <button
        type="button"
        onClick={props.addSection}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
      >
        <Plus className="w-4 h-4" />
        Agregar Seccion
      </button>

      {/* Resumen de tiempos de secciones */}
      {(() => {
        const sectionsWithTime = props.sections.filter(s => s.timeLimit && s.timeLimit > 0);
        const totalSectionTime = props.sections.reduce((sum, s) => sum + (s.timeLimit || 0), 0);
        
        if (sectionsWithTime.length > 0) {
          return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-2">Resumen de Tiempos por Seccion</h4>
                  <div className="space-y-1 mb-3">
                    {props.sections.map((s, idx) => s.timeLimit ? (
                      <div key={idx} className="flex items-center gap-2 text-sm text-blue-800">
                        <span className="font-medium">{s.title}:</span>
                        <span>{s.timeLimit} min</span>
                      </div>
                    ) : null)}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-blue-900">Total de secciones con tiempo:</span>
                    <span className="font-bold text-blue-700">{totalSectionTime} minutos</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Navegacion */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={props.onPrev}
          className="flex items-center gap-2 px-5 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>
        
        {(() => {
          // Calcular si la distribución es válida
          const hasTimeLimit = !!props.timeLimit;
          const totalSectionTime = props.sections.reduce((sum, s) => sum + (s.timeLimit || 0), 0);
          const sectionsWithoutLimit = props.sections.filter(s => !s.timeLimit);
          const availableTime = (props.timeLimit || 0) - totalSectionTime;
          
          // Deshabilitar si hay tiempo global y (hay secciones sin límite o sobra tiempo)
          const isDisabled = hasTimeLimit && (sectionsWithoutLimit.length > 0 || availableTime !== 0);
          
          return (
            <>
              <button
                type="button"
                onClick={isDisabled ? undefined : props.onNext}
                disabled={isDisabled}
                className={`flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium transition ${
                  isDisabled 
                    ? 'opacity-50 cursor-not-allowed bg-gray-400' 
                    : 'hover:opacity-90'
                }`}
                style={!isDisabled ? { backgroundColor: props.primaryColor } : {}}
                title={isDisabled ? 'Completa la distribución de tiempo antes de continuar' : ''}
              >
                Vista Previa
                <ChevronRight className="w-4 h-4" />
              </button>
              
              {isDisabled && (
                <div className="fixed bottom-4 right-4 max-w-md bg-red-50 border-2 border-red-300 rounded-lg p-3 shadow-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <strong>Distribución incompleta:</strong>
                      {sectionsWithoutLimit.length > 0 && (
                        <p className="mt-1">• Hay {sectionsWithoutLimit.length} sección(es) sin tiempo límite</p>
                      )}
                      {availableTime > 0 && (
                        <p className="mt-1">• Sobran {availableTime} minutos sin asignar</p>
                      )}
                      {availableTime < 0 && (
                        <p className="mt-1">• Exceso de {Math.abs(availableTime)} minutos</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ==================== EDITOR DE PREGUNTA ====================

interface QuestionEditorProps {
  examId?: string;
  sectionId?: string;
  question: ExamQuestionInput;
  sectionIndex: number;
  questionIndex: number;
  questionNumber: number;
  onUpdate: (updates: Partial<ExamQuestionInput>) => void;
  onRemove: () => void;
}

function QuestionEditor({ examId, sectionId, question, questionNumber, onUpdate, onRemove }: QuestionEditorProps) {
  const typeInfo = QUESTION_TYPES.find(t => t.value === question.type) || QUESTION_TYPES[0];
  const [showFileUploader, setShowFileUploader] = useState(!!question.fileUrl || !!question.pendingFile);

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
          {questionNumber}
        </span>
        <select
          value={question.type}
          onChange={(e) => {
            const newType = e.target.value as ExamQuestionType;
            const updates: Partial<ExamQuestionInput> = { type: newType };
            // Resetear opciones/metadata segun tipo
            if (['RADIO', 'CHECKBOX'].includes(newType)) {
              updates.options = question.options?.length ? question.options : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }];
              updates.metadata = undefined;
            } else if (newType === 'TRUE_FALSE') {
              updates.options = [{ text: 'Verdadero', isCorrect: true }, { text: 'Falso', isCorrect: false }];
              updates.metadata = undefined;
            } else if (newType === 'MATCHING') {
              updates.options = undefined;
              updates.metadata = question.metadata?.pairs ? question.metadata : { pairs: [{ left: '', right: '' }, { left: '', right: '' }] };
            } else if (newType === 'ORDERING') {
              updates.options = undefined;
              updates.metadata = question.metadata?.items ? question.metadata : { items: [{ text: '', correctOrder: 1 }, { text: '', correctOrder: 2 }] };
            } else if (newType === 'FILL_BLANK') {
              updates.options = undefined;
              updates.metadata = question.metadata?.blanks ? question.metadata : { blanks: [{ position: 0, correctAnswer: '' }] };
            } else {
              updates.options = undefined;
              updates.metadata = undefined;
            }
            onUpdate(updates);
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-500"
        >
          {QUESTION_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={question.points}
            onChange={(e) => onUpdate({ points: Math.max(0, parseFloat(e.target.value) || 0) })}
            className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-center focus:ring-1 focus:ring-blue-500"
            min={0}
            step={0.5}
          />
          <span className="text-xs text-gray-500">pts</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition"
          title="Eliminar pregunta"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Texto de pregunta */}
      <RichTextEditor
        value={question.text}
        onChange={(html) => onUpdate({ text: html })}
        rows={2}
        placeholder={question.type === 'FILL_BLANK' ? 'Texto con _____ para espacios en blanco...' : 'Escribe la pregunta...'}
      />

      {/* Texto de ayuda */}
      <input
        type="text"
        value={question.helpText || ''}
        onChange={(e) => onUpdate({ helpText: e.target.value })}
        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 focus:ring-1 focus:ring-blue-500"
        placeholder="Texto de ayuda (opcional)"
      />

      {/* Editor especifico por tipo */}
      {renderTypeEditor(question, onUpdate)}

      {/* Feedback */}
      <input
        type="text"
        value={question.feedback || ''}
        onChange={(e) => onUpdate({ feedback: e.target.value })}
        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 focus:ring-1 focus:ring-blue-500"
        placeholder="Retroalimentacion (opcional)"
      />

      {/* Archivo adjunto de pregunta - Toggle */}
      {!showFileUploader ? (
        <button
          type="button"
          onClick={() => setShowFileUploader(true)}
          className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          {question.fileUrl || question.pendingFile ? 'Ver archivo adjunto' : 'Agregar archivo adjunto'}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Paperclip className="w-3.5 h-3.5" />
              Archivo adjunto
            </label>
            <button
              type="button"
              onClick={() => setShowFileUploader(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Ocultar"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
          <FileUploader
            currentFile={question.fileUrl ? { url: question.fileUrl, name: question.fileName || 'archivo', type: question.fileType || '' } : null}
            pendingFile={question.pendingFile || null}
            onUpload={(file) => {
              // Si hay ID, subir inmediatamente; si no, guardar como pendiente
              if (examId && question.id) {
                examService.uploadQuestionFile(examId, question.id, file)
                  .then(result => {
                    const q = result.question;
                    onUpdate({ fileUrl: q.fileUrl, fileName: q.fileName, fileType: q.fileType, pendingFile: undefined });
                  })
                  .catch(err => console.error('Error subiendo archivo de pregunta:', err));
              } else {
                // Guardar como pendiente
                onUpdate({ pendingFile: file });
              }
            }}
            onRemove={() => {
              if (examId && question.id && question.fileUrl) {
                // Si hay archivo guardado, eliminarlo del servidor
                examService.deleteQuestionFile(examId, question.id)
                  .then(() => {
                    onUpdate({ fileUrl: undefined, fileName: undefined, fileType: undefined });
                  })
                  .catch(err => console.error('Error eliminando archivo de pregunta:', err));
              } else {
                // Solo remover el archivo pendiente
                onUpdate({ pendingFile: undefined });
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

// ==================== EDITORES POR TIPO ====================

function renderTypeEditor(question: ExamQuestionInput, onUpdate: (updates: Partial<ExamQuestionInput>) => void) {
  switch (question.type) {
    case 'RADIO':
    case 'CHECKBOX':
      return <OptionsEditor question={question} onUpdate={onUpdate} multi={question.type === 'CHECKBOX'} />;
    case 'TRUE_FALSE':
      return <TrueFalseEditor question={question} onUpdate={onUpdate} />;
    case 'MATCHING':
      return <MatchingEditor question={question} onUpdate={onUpdate} />;
    case 'ORDERING':
      return <OrderingEditor question={question} onUpdate={onUpdate} />;
    case 'FILL_BLANK':
      return <FillBlankEditor question={question} onUpdate={onUpdate} />;
    case 'TEXT':
      return <TextAnswerEditor question={question} onUpdate={onUpdate} />;
    case 'TEXTAREA':
      return (
        <p className="text-xs text-amber-600 italic px-1">
          Esta pregunta sera calificada manualmente por el profesor.
        </p>
      );
    default:
      return null;
  }
}

function OptionsEditor({ question, onUpdate, multi }: {
  question: ExamQuestionInput;
  onUpdate: (updates: Partial<ExamQuestionInput>) => void;
  multi: boolean;
}) {
  const options = question.options || [];

  const addOption = () => {
    onUpdate({ options: [...options, { text: '', isCorrect: false }] });
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    onUpdate({ options: options.filter((_, i) => i !== idx) });
  };

  const updateOption = (idx: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...options];
    if (field === 'isCorrect' && !multi) {
      // Radio: solo una correcta
      newOptions.forEach((o, i) => { newOptions[i] = { ...o, isCorrect: i === idx }; });
    } else {
      newOptions[idx] = { ...newOptions[idx], [field]: value };
    }
    onUpdate({ options: newOptions });
  };

  return (
    <div className="space-y-2">
      {options.map((opt, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type={multi ? 'checkbox' : 'radio'}
            name={`q-${question.text}-correct`}
            checked={opt.isCorrect || false}
            onChange={() => updateOption(idx, 'isCorrect', !opt.isCorrect)}
            className="flex-shrink-0"
          />
          <input
            type="text"
            value={opt.text}
            onChange={(e) => updateOption(idx, 'text', e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            placeholder={`Opcion ${idx + 1}`}
          />
          {options.length > 2 && (
            <button type="button" onClick={() => removeOption(idx)} className="p-1 text-gray-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addOption}
        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        <Plus className="w-3 h-3" /> Agregar opcion
      </button>
    </div>
  );
}

function TrueFalseEditor({ question, onUpdate }: {
  question: ExamQuestionInput;
  onUpdate: (updates: Partial<ExamQuestionInput>) => void;
}) {
  const options = question.options || [{ text: 'Verdadero', isCorrect: true }, { text: 'Falso', isCorrect: false }];
  const correctIdx = options.findIndex(o => o.isCorrect);

  return (
    <div className="flex gap-3">
      {options.map((opt, idx) => (
        <label
          key={idx}
          className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${
            opt.isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name={`tf-${question.text}`}
            checked={opt.isCorrect || false}
            onChange={() => {
              const newOptions = options.map((o, i) => ({ ...o, isCorrect: i === idx }));
              onUpdate({ options: newOptions });
            }}
          />
          <span className="text-sm font-medium">{opt.text}</span>
        </label>
      ))}
    </div>
  );
}

function MatchingEditor({ question, onUpdate }: {
  question: ExamQuestionInput;
  onUpdate: (updates: Partial<ExamQuestionInput>) => void;
}) {
  const pairs = question.metadata?.pairs || [{ left: '', right: '' }, { left: '', right: '' }];

  const updatePair = (idx: number, side: 'left' | 'right', value: string) => {
    const newPairs = [...pairs];
    newPairs[idx] = { ...newPairs[idx], [side]: value };
    onUpdate({ metadata: { ...question.metadata, pairs: newPairs } });
  };

  const addPair = () => {
    onUpdate({ metadata: { ...question.metadata, pairs: [...pairs, { left: '', right: '' }] } });
  };

  const removePair = (idx: number) => {
    if (pairs.length <= 2) return;
    onUpdate({ metadata: { ...question.metadata, pairs: pairs.filter((_: any, i: number) => i !== idx) } });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Define los pares (izquierda - derecha):</p>
      {pairs.map((pair: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
          <input
            type="text"
            value={pair.left}
            onChange={(e) => updatePair(idx, 'left', e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            placeholder="Izquierda"
          />
          <span className="text-gray-400 text-xs">&harr;</span>
          <input
            type="text"
            value={pair.right}
            onChange={(e) => updatePair(idx, 'right', e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            placeholder="Derecha"
          />
          {pairs.length > 2 && (
            <button type="button" onClick={() => removePair(idx)} className="p-1 text-gray-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addPair}
        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        <Plus className="w-3 h-3" /> Agregar par
      </button>
    </div>
  );
}

function OrderingEditor({ question, onUpdate }: {
  question: ExamQuestionInput;
  onUpdate: (updates: Partial<ExamQuestionInput>) => void;
}) {
  const items = question.metadata?.items || [{ text: '', correctOrder: 1 }, { text: '', correctOrder: 2 }];

  const updateItem = (idx: number, text: string) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], text };
    onUpdate({ metadata: { ...question.metadata, items: newItems } });
  };

  const addItem = () => {
    onUpdate({
      metadata: {
        ...question.metadata,
        items: [...items, { text: '', correctOrder: items.length + 1 }]
      }
    });
  };

  const removeItem = (idx: number) => {
    if (items.length <= 2) return;
    const newItems = items.filter((_: any, i: number) => i !== idx).map((item: any, i: number) => ({
      ...item,
      correctOrder: i + 1
    }));
    onUpdate({ metadata: { ...question.metadata, items: newItems } });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Define los elementos en el orden correcto (de arriba a abajo):</p>
      {items.map((item: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
            {idx + 1}
          </span>
          <input
            type="text"
            value={item.text}
            onChange={(e) => updateItem(idx, e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            placeholder={`Elemento ${idx + 1}`}
          />
          {items.length > 2 && (
            <button type="button" onClick={() => removeItem(idx)} className="p-1 text-gray-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        <Plus className="w-3 h-3" /> Agregar elemento
      </button>
    </div>
  );
}

function FillBlankEditor({ question, onUpdate }: {
  question: ExamQuestionInput;
  onUpdate: (updates: Partial<ExamQuestionInput>) => void;
}) {
  const blanks = question.metadata?.blanks || [{ position: 0, correctAnswer: '' }];

  const updateBlank = (idx: number, correctAnswer: string) => {
    const newBlanks = [...blanks];
    newBlanks[idx] = { ...newBlanks[idx], correctAnswer };
    onUpdate({ metadata: { ...question.metadata, blanks: newBlanks } });
  };

  const addBlank = () => {
    onUpdate({
      metadata: {
        ...question.metadata,
        blanks: [...blanks, { position: blanks.length, correctAnswer: '' }]
      }
    });
  };

  const removeBlank = (idx: number) => {
    if (blanks.length <= 1) return;
    onUpdate({
      metadata: {
        ...question.metadata,
        blanks: blanks.filter((_: any, i: number) => i !== idx).map((b: any, i: number) => ({ ...b, position: i }))
      }
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Usa _____ (5 guiones bajos) en el texto para marcar los espacios. Define las respuestas correctas:
      </p>
      {blanks.map((blank: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">Espacio {idx + 1}:</span>
          <input
            type="text"
            value={blank.correctAnswer}
            onChange={(e) => updateBlank(idx, e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            placeholder="Respuesta correcta"
          />
          {blanks.length > 1 && (
            <button type="button" onClick={() => removeBlank(idx)} className="p-1 text-gray-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addBlank}
        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        <Plus className="w-3 h-3" /> Agregar espacio
      </button>
    </div>
  );
}

function TextAnswerEditor({ question, onUpdate }: {
  question: ExamQuestionInput;
  onUpdate: (updates: Partial<ExamQuestionInput>) => void;
}) {
  const keywords = question.correctAnswer?.keywords || [];
  const [newKeyword, setNewKeyword] = useState('');

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    onUpdate({
      correctAnswer: {
        ...question.correctAnswer,
        keywords: [...keywords, newKeyword.trim()]
      }
    });
    setNewKeyword('');
  };

  const removeKeyword = (idx: number) => {
    onUpdate({
      correctAnswer: {
        ...question.correctAnswer,
        keywords: keywords.filter((_: any, i: number) => i !== idx)
      }
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Palabras clave para calificacion automatica (opcional - si no se definen, sera calificacion manual):
      </p>
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw: string, idx: number) => (
          <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
            {kw}
            <button type="button" onClick={() => removeKeyword(idx)} className="hover:text-red-500">
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
          placeholder="Agregar palabra clave..."
        />
        <button
          type="button"
          onClick={addKeyword}
          className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

// ==================== PASO 3: VISTA PREVIA ====================

interface Step3Props {
  title: string;
  description: string;
  instructions: string;
  timeLimit: number | undefined;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: boolean;
  accessType: ExamAccessType;
  poolEnabled: boolean;
  questionsPerAttempt: number;
  sections: ExamSectionInput[];
  totalPoints: number;
  totalQuestions: number;
  loading: boolean;
  isEdit: boolean;
  onPrev: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  primaryColor: string;
}

function Step3Preview(props: Step3Props) {
  let questionCounter = 0;

  return (
    <div className="space-y-6">
      {/* Resumen de configuracion */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Resumen de Configuracion
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <ConfigItem label="Titulo" value={props.title} />
          <ConfigItem label="Acceso" value={props.accessType === 'PUBLIC' ? 'Publico' : 'Privado'} />
          <ConfigItem label="Tiempo" value={props.timeLimit ? `${props.timeLimit} min` : 'Sin limite'} />
          <ConfigItem label="Intentos" value={String(props.maxAttempts)} />
          <ConfigItem label="Aprobacion" value={`${props.passingScore}%`} />
          <ConfigItem label="Preguntas" value={String(props.totalQuestions)} />
          <ConfigItem label="Puntos" value={String(props.totalPoints)} />
          <ConfigItem label="Resultados" value={props.showResults ? 'Si' : 'No'} />
          {props.poolEnabled && (
            <ConfigItem label="Pool" value={`${props.questionsPerAttempt} de ${props.totalQuestions}`} />
          )}
        </div>
        {props.instructions && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-800 mb-1">Instrucciones:</p>
            <p className="text-sm text-blue-700">{props.instructions}</p>
          </div>
        )}
      </div>

      {/* Vista previa de preguntas */}
      {props.sections.map((section, sIdx) => (
        <div key={sIdx} className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="font-semibold text-gray-800">{section.title}</h4>
            {section.description && <p className="text-sm text-gray-500 mt-1">{section.description}</p>}
          </div>
          {section.questions.map((question, qIdx) => {
            questionCounter++;
            return (
              <QuestionRenderer
                key={`${sIdx}-${qIdx}`}
                question={{
                  type: question.type,
                  text: question.text,
                  helpText: question.helpText,
                  feedback: question.feedback,
                  points: question.points,
                  options: question.options,
                  pairs: question.metadata?.pairs,
                  blanks: question.metadata?.blanks,
                  items: question.metadata?.items,
                  metadata: question.metadata,
                }}
                questionNumber={questionCounter}
                mode="preview"
                showFeedback={!!question.feedback}
              />
            );
          })}
        </div>
      ))}

      {/* Validaciones */}
      {props.totalPoints <= 0 && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">Los puntos totales deben ser mayores a 0.</p>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={props.onPrev}
          className="flex items-center gap-2 px-5 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Editar Preguntas
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={props.onSaveDraft}
            disabled={props.loading}
            className="flex items-center gap-2 px-5 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {props.isEdit ? 'Guardar Cambios' : 'Guardar Borrador'}
          </button>
          <button
            type="button"
            onClick={props.onPublish}
            disabled={props.loading || props.totalPoints <= 0}
            className="flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: props.primaryColor }}
          >
            <Save className="w-4 h-4" />
            {props.isEdit ? 'Guardar y Publicar' : 'Publicar Examen'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== COMPONENTES AUXILIARES ====================

function ToggleField({ label, description, icon: Icon, checked, onChange }: {
  label: string;
  description: string;
  icon: any;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition">
      <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-blue-600 rounded"
      />
    </label>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}

// ==================== HELPERS ====================

function createEmptyQuestion(type: ExamQuestionType): ExamQuestionInput {
  const base: ExamQuestionInput = { type, text: '', helpText: '', points: 10 };

  switch (type) {
    case 'RADIO':
    case 'CHECKBOX':
      return { ...base, options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] };
    case 'TRUE_FALSE':
      return { ...base, options: [{ text: 'Verdadero', isCorrect: true }, { text: 'Falso', isCorrect: false }] };
    case 'MATCHING':
      return { ...base, metadata: { pairs: [{ left: '', right: '' }, { left: '', right: '' }] } };
    case 'ORDERING':
      return { ...base, metadata: { items: [{ text: '', correctOrder: 1 }, { text: '', correctOrder: 2 }] } };
    case 'FILL_BLANK':
      return { ...base, metadata: { blanks: [{ position: 0, correctAnswer: '' }] } };
    default:
      return base;
  }
}
