import { useState } from 'react';
import { examService } from '../../lib/examService';
import type { 
  ExamQuestionType, 
  ExamSectionInput, 
  ExamQuestionInput,
  ShowResultsType 
} from '../../lib/types';
import { TemplateSelector } from '../templates';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Save,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Award,
  Clock,
  Users
} from 'lucide-react';

interface ExamEditorProps {
  examId?: string;
  initialData?: {
    title: string;
    description?: string;
    templateId?: string;
    timeLimit?: number;
    maxAttempts?: number;
    passingScore?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showResults?: ShowResultsType;
    allowReview?: boolean;
    sections: ExamSectionInput[];
  };
}

const EXAM_QUESTION_TYPES: { value: ExamQuestionType; label: string; autoGrade: boolean }[] = [
  { value: 'RADIO', label: 'Opción Única', autoGrade: true },
  { value: 'CHECKBOX', label: 'Opción Múltiple', autoGrade: true },
  { value: 'TRUE_FALSE', label: 'Verdadero/Falso', autoGrade: true },
  { value: 'TEXT', label: 'Respuesta Corta', autoGrade: false },
  { value: 'TEXTAREA', label: 'Respuesta Larga', autoGrade: false },
  { value: 'MATCHING', label: 'Emparejar', autoGrade: true },
  { value: 'ORDERING', label: 'Ordenar', autoGrade: true },
];

const SHOW_RESULTS_OPTIONS: { value: ShowResultsType; label: string }[] = [
  { value: 'IMMEDIATE', label: 'Inmediato' },
  { value: 'AFTER_DEADLINE', label: 'Después de fecha límite' },
  { value: 'MANUAL', label: 'Manual (admin decide)' },
  { value: 'NEVER', label: 'Nunca mostrar' },
];

export default function ExamEditor({ examId, initialData }: ExamEditorProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [templateId, setTemplateId] = useState(initialData?.templateId || 'modern');
  
  // Configuración del examen
  const [timeLimit, setTimeLimit] = useState<number | undefined>(initialData?.timeLimit);
  const [maxAttempts, setMaxAttempts] = useState(initialData?.maxAttempts || 1);
  const [passingScore, setPassingScore] = useState(initialData?.passingScore || 60);
  const [shuffleQuestions, setShuffleQuestions] = useState(initialData?.shuffleQuestions || false);
  const [shuffleOptions, setShuffleOptions] = useState(initialData?.shuffleOptions || false);
  const [showResults, setShowResults] = useState<ShowResultsType>(initialData?.showResults || 'IMMEDIATE');
  const [allowReview, setAllowReview] = useState(initialData?.allowReview !== false);
  
  const [sections, setSections] = useState<ExamSectionInput[]>(
    initialData?.sections || [
      {
        title: 'Sección 1',
        description: '',
        questions: [
          {
            type: 'RADIO',
            text: '',
            helpText: '',
            points: 10,
            options: [
              { text: '', isCorrect: false },
              { text: '', isCorrect: false }
            ]
          }
        ]
      }
    ]
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState<number[]>([0]);

  const calculateTotalPoints = () => {
    return sections.reduce((total, section) => {
      return total + section.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    }, 0);
  };

  const toggleSection = (index: number) => {
    setExpandedSections(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const addSection = () => {
    setSections([
      ...sections,
      {
        title: `Sección ${sections.length + 1}`,
        description: '',
        questions: [
          {
            type: 'RADIO',
            text: '',
            helpText: '',
            points: 10,
            options: [
              { text: '', isCorrect: false },
              { text: '', isCorrect: false }
            ]
          }
        ]
      }
    ]);
    setExpandedSections([...expandedSections, sections.length]);
  };

  const removeSection = (index: number) => {
    if (sections.length === 1) {
      alert('Debe haber al menos una sección');
      return;
    }
    setSections(sections.filter((_, i) => i !== index));
    setExpandedSections(expandedSections.filter(i => i !== index));
  };

  const updateSection = (index: number, field: keyof ExamSectionInput, value: string) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  };

  const addQuestion = (sectionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].questions.push({
      type: 'RADIO',
      text: '',
      helpText: '',
      points: 10,
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    });
    setSections(newSections);
  };

  const removeQuestion = (sectionIndex: number, questionIndex: number) => {
    const newSections = [...sections];
    if (newSections[sectionIndex].questions.length === 1) {
      alert('Debe haber al menos una pregunta por sección');
      return;
    }
    newSections[sectionIndex].questions.splice(questionIndex, 1);
    setSections(newSections);
  };

  const updateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    field: keyof ExamQuestionInput,
    value: any
  ) => {
    const newSections = [...sections];
    newSections[sectionIndex].questions[questionIndex] = {
      ...newSections[sectionIndex].questions[questionIndex],
      [field]: value
    };
    setSections(newSections);
  };

  const addOption = (sectionIndex: number, questionIndex: number) => {
    const newSections = [...sections];
    const question = newSections[sectionIndex].questions[questionIndex];
    if (!question.options) question.options = [];
    question.options.push({ text: '', isCorrect: false });
    setSections(newSections);
  };

  const removeOption = (sectionIndex: number, questionIndex: number, optionIndex: number) => {
    const newSections = [...sections];
    const question = newSections[sectionIndex].questions[questionIndex];
    if (question.options && question.options.length > 2) {
      question.options.splice(optionIndex, 1);
      setSections(newSections);
    } else {
      alert('Debe haber al menos 2 opciones');
    }
  };

  const updateOption = (
    sectionIndex: number,
    questionIndex: number,
    optionIndex: number,
    field: 'text' | 'isCorrect',
    value: string | boolean
  ) => {
    const newSections = [...sections];
    const question = newSections[sectionIndex].questions[questionIndex];
    if (question.options) {
      question.options[optionIndex] = {
        ...question.options[optionIndex],
        [field]: value
      };
      setSections(newSections);
    }
  };

  const adjustPointsTo100 = async () => {
    try {
      const adjusted = await examService.adjustPoints(sections);
      setSections(adjusted.sections);
      setSuccess('Puntos ajustados a 100 exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al ajustar puntos');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const totalPoints = calculateTotalPoints();
    if (Math.abs(totalPoints - 100) > 0.01) {
      setError(`La suma de puntos debe ser 100. Actualmente es ${totalPoints.toFixed(2)}`);
      setLoading(false);
      return;
    }

    try {
      const data = {
        title,
        description,
        templateId,
        timeLimit: timeLimit || undefined,
        maxAttempts,
        passingScore,
        shuffleQuestions,
        shuffleOptions,
        showResults,
        allowReview,
        sections
      };

      if (examId) {
        await examService.updateExam(examId, data);
        setSuccess('Examen actualizado exitosamente');
      } else {
        const result = await examService.createExam(data);
        setSuccess('Examen creado exitosamente');
        setTimeout(() => {
          window.location.href = `/admin/exams/${result.exam.id}`;
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar el examen');
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = calculateTotalPoints();
  const pointsValid = Math.abs(totalPoints - 100) < 0.01;

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-4">
          {examId ? 'Editar Examen' : 'Crear Nuevo Examen'}
        </h2>

        {/* Información básica */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título del Examen *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Examen Final de Matemáticas"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Descripción del examen..."
            />
          </div>

          <TemplateSelector
            selectedTemplateId={templateId}
            onSelect={setTemplateId}
          />
        </div>
      </div>

      {/* Configuración del Examen */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5" />
          Configuración del Examen
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              Tiempo Límite (minutos)
            </label>
            <input
              type="number"
              value={timeLimit || ''}
              onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Sin límite"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Intentos Máximos
            </label>
            <input
              type="number"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Puntuación Mínima (%)
            </label>
            <input
              type="number"
              value={passingScore}
              onChange={(e) => setPassingScore(parseFloat(e.target.value) || 60)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
              step="0.1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mostrar Resultados
            </label>
            <select
              value={showResults}
              onChange={(e) => setShowResults(e.target.value as ShowResultsType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {SHOW_RESULTS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Mezclar preguntas</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Mezclar opciones</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowReview}
              onChange={(e) => setAllowReview(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Permitir revisar respuestas</span>
          </label>
        </div>
      </div>

      {/* Puntos Totales */}
      <div className={`bg-white rounded-lg shadow-sm p-4 border-2 ${
        pointsValid ? 'border-green-500' : 'border-red-500'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className={`w-5 h-5 ${pointsValid ? 'text-green-600' : 'text-red-600'}`} />
            <span className="font-semibold">
              Puntos Totales: {totalPoints.toFixed(2)} / 100
            </span>
          </div>
          {!pointsValid && (
            <button
              type="button"
              onClick={adjustPointsTo100}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Ajustar a 100
            </button>
          )}
        </div>
      </div>

      {/* Secciones */}
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Section Header */}
            <div className="bg-gray-50 p-4 border-b flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleSection(sectionIndex)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                {expandedSections.includes(sectionIndex) ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
                <GripVertical className="w-5 h-5 text-gray-400" />
                <span className="font-semibold">{section.title}</span>
              </button>
              <button
                type="button"
                onClick={() => removeSection(sectionIndex)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {expandedSections.includes(sectionIndex) && (
              <div className="p-4 space-y-4">
                {/* Section Info */}
                <div className="space-y-3">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Título de la sección"
                  />
                  <textarea
                    value={section.description || ''}
                    onChange={(e) => updateSection(sectionIndex, 'description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Descripción de la sección (opcional)"
                  />
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  {section.questions.map((question, questionIndex) => (
                    <div key={questionIndex} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <select
                              value={question.type}
                              onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'type', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              {EXAM_QUESTION_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                  {type.label} {!type.autoGrade && '(Manual)'}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={question.points}
                              onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'points', parseFloat(e.target.value) || 0)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Puntos"
                              min="0"
                              step="0.5"
                            />
                          </div>

                          <input
                            type="text"
                            value={question.text}
                            onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'text', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Texto de la pregunta"
                          />

                          <input
                            type="text"
                            value={question.helpText || ''}
                            onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'helpText', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Texto de ayuda (opcional)"
                          />

                          {/* Options for RADIO, CHECKBOX, TRUE_FALSE */}
                          {['RADIO', 'CHECKBOX', 'TRUE_FALSE'].includes(question.type) && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Opciones:</label>
                              {question.options?.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={option.isCorrect}
                                    onChange={(e) => updateOption(sectionIndex, questionIndex, optionIndex, 'isCorrect', e.target.checked)}
                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    title="Marcar como correcta"
                                  />
                                  <input
                                    type="text"
                                    value={option.text}
                                    onChange={(e) => updateOption(sectionIndex, questionIndex, optionIndex, 'text', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder={`Opción ${optionIndex + 1}`}
                                  />
                                  {question.type !== 'TRUE_FALSE' && (
                                    <button
                                      type="button"
                                      onClick={() => removeOption(sectionIndex, questionIndex, optionIndex)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {question.type !== 'TRUE_FALSE' && (
                                <button
                                  type="button"
                                  onClick={() => addOption(sectionIndex, questionIndex)}
                                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                  <Plus className="w-4 h-4" />
                                  Agregar opción
                                </button>
                              )}
                            </div>
                          )}

                          <input
                            type="text"
                            value={question.feedback || ''}
                            onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'feedback', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Retroalimentación (se muestra después de responder)"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeQuestion(sectionIndex, questionIndex)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addQuestion(sectionIndex)}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Agregar Pregunta
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSection}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Agregar Sección
      </button>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-800">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex-1 py-3 px-6 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !pointsValid}
          className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Guardando...' : examId ? 'Actualizar Examen' : 'Crear Examen'}
        </button>
      </div>
    </form>
  );
}
