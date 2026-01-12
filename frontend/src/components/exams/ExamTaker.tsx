import { useState, useEffect, useCallback } from 'react';
import { examService } from '../../lib/examService';
import type { ExamAttempt, ExamSection, ExamQuestion } from '../../lib/types';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  FileText
} from 'lucide-react';

interface ExamTakerProps {
  attemptId: string;
  initialAttempt?: ExamAttempt;
}

// Helper functions fuera del componente
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function ExamTaker({ attemptId, initialAttempt }: ExamTakerProps) {
  const [attempt, setAttempt] = useState<ExamAttempt | null>(initialAttempt || null);
  const [loading, setLoading] = useState(!initialAttempt);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [warningShown5Min, setWarningShown5Min] = useState(false);
  const [warningShown1Min, setWarningShown1Min] = useState(false);

  const loadAttempt = useCallback(async () => {
    try {
      setLoading(true);
      const data = await examService.getAttempt(attemptId);
      setAttempt(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el examen');
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  // Cargar intento si no se proporcionó initialAttempt
  useEffect(() => {
    if (!initialAttempt && attemptId) {
      loadAttempt();
    }
  }, [attemptId, initialAttempt, loadAttempt]);

  // Timer
  useEffect(() => {
    if (!attempt?.exam?.timeLimit || !attempt) return;

    const startTime = new Date(attempt.startedAt).getTime();
    const endTime = startTime + attempt.exam.timeLimit * 60 * 1000;

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const remainingSeconds = Math.floor(remaining / 1000);
      setTimeRemaining(remainingSeconds);

      // Advertencia 5 minutos
      if (remainingSeconds <= 300 && remainingSeconds > 299 && !warningShown5Min) {
        alert('⏰ Quedan 5 minutos para terminar el examen');
        setWarningShown5Min(true);
      }

      // Advertencia 1 minuto
      if (remainingSeconds <= 60 && remainingSeconds > 59 && !warningShown1Min) {
        alert('⚠️ ¡Queda 1 minuto! El examen se enviará automáticamente');
        setWarningShown1Min(true);
      }

      if (remaining === 0) {
        // Auto-submit
        alert('El tiempo ha terminado. El examen se enviará automáticamente.');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, warningShown5Min, warningShown1Min]);

  // Auto-save cada 30 segundos
  useEffect(() => {
    const autoSave = setInterval(() => {
      // Auto-save logic aquí
    }, 30000);

    return () => clearInterval(autoSave);
  }, [answers]);

  // Render condicional
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando examen...</p>
        </div>
      </div>
    );
  }

  if (!attempt || !attempt.exam) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-800 text-lg">Error</h3>
          <p className="text-red-700 mt-1">{error || 'No se pudo cargar el examen'}</p>
        </div>
      </div>
    );
  }

  const exam = attempt.exam;
  const sections = attempt.examVersion?.sections || [];
  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: No se pudo cargar la pregunta</p>
        </div>
      </div>
    );
  }

  const saveCurrentAnswer = async () => {
    if (!currentQuestion?.id) return;

    const questionId = currentQuestion.id;
    const answer = answers[questionId];
    if (!answer) return;

    try {
      setSaving(true);
      setError('');

      await examService.saveAnswer(attemptId, {
        questionId: questionId,
        textValue: answer.textValue,
        selectedOptionIds: answer.selectedOptionIds,
        jsonValue: answer.jsonValue
      });

      setLastSaved(new Date());
    } catch (err) {
      setError('Error al guardar respuesta');
    } finally {
      setSaving(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    handleAnswerChange(questionId, { textValue: text });
  };

  const handleRadioAnswer = (questionId: string, optionId: string) => {
    handleAnswerChange(questionId, { selectedOptionIds: [optionId] });
  };

  const handleCheckboxAnswer = (questionId: string, optionId: string, checked: boolean) => {
    const current = answers[questionId]?.selectedOptionIds || [];
    const updated = checked
      ? [...current, optionId]
      : current.filter((id: string) => id !== optionId);
    handleAnswerChange(questionId, { selectedOptionIds: updated });
  };

  const goToNextQuestion = async () => {
    await saveCurrentAnswer();

    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentQuestionIndex(0);
    }
  };

  const goToPreviousQuestion = async () => {
    await saveCurrentAnswer();

    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      const prevSection = sections[currentSectionIndex - 1];
      setCurrentQuestionIndex(prevSection.questions.length - 1);
    }
  };

  const getTotalQuestions = () => {
    return sections.reduce((total, section) => total + section.questions.length, 0);
  };

  const getCurrentQuestionNumber = () => {
    let count = 0;
    for (let i = 0; i < currentSectionIndex; i++) {
      count += sections[i].questions.length;
    }
    return count + currentQuestionIndex + 1;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const handleAutoSubmit = async () => {
    alert('El tiempo ha terminado. El examen se enviará automáticamente.');
    await handleSubmit();
  };

  const handleSubmit = async () => {
    const unanswered = getTotalQuestions() - getAnsweredCount();
    
    if (unanswered > 0) {
      if (!confirm(`Tienes ${unanswered} preguntas sin responder. ¿Deseas enviar el examen de todas formas?`)) {
        return;
      }
    }

    if (!confirm('¿Estás seguro de enviar el examen? No podrás modificar tus respuestas después.')) {
      return;
    }

    try {
      setSubmitting(true);
      await saveCurrentAnswer();
      
      const result = await examService.submitAttempt(attemptId);
      
      // Redirigir a resultados
      window.location.href = `/e/${exam.slug}/result/${attemptId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar examen');
      setSubmitting(false);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: No se pudo cargar la pregunta</p>
        </div>
      </div>
    );
  }

  const isFirstQuestion = currentSectionIndex === 0 && currentQuestionIndex === 0;
  const isLastQuestion = currentSectionIndex === sections.length - 1 && 
                         currentQuestionIndex === currentSection.questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Pregunta {getCurrentQuestionNumber()} de {getTotalQuestions()}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Progress */}
              <div className="text-sm text-gray-600">
                <span className="font-medium">{getAnsweredCount()}</span> / {getTotalQuestions()} respondidas
              </div>

              {/* Timer */}
              {timeRemaining !== null && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
                </div>
              )}

              {/* Auto-save indicator */}
              {saving && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Guardando...</span>
                </div>
              )}

              {lastSaved && !saving && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Guardado</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getCurrentQuestionNumber() / getTotalQuestions()) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Section Title */}
          {currentSection && (
            <div className="mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{currentSection.title}</h2>
              {currentSection.description && (
                <p className="text-sm text-gray-600 mt-1">{currentSection.description}</p>
              )}
            </div>
          )}

          {/* Question */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-semibold text-sm">
                {getCurrentQuestionNumber()}
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {currentQuestion.text}
                </h3>
                {currentQuestion.helpText && (
                  <p className="text-sm text-gray-600 mb-4">{currentQuestion.helpText}</p>
                )}
                <div className="text-sm text-gray-500">
                  {currentQuestion.points} {currentQuestion.points === 1 ? 'punto' : 'puntos'}
                </div>
              </div>
            </div>

            {/* Answer Input */}
            <div className="ml-11">
              {currentQuestion.id && (() => {
                const questionId: string = currentQuestion.id!;

                return (
                  <>
                    {/* TEXT */}
                    {currentQuestion.type === 'TEXT' && (
                      <input
                        type="text"
                        value={answers[questionId]?.textValue || ''}
                        onChange={(e) => handleTextAnswer(questionId, e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Tu respuesta..."
                      />
                    )}

                    {/* TEXTAREA */}
                    {currentQuestion.type === 'TEXTAREA' && (
                      <textarea
                        value={answers[questionId]?.textValue || ''}
                        onChange={(e) => handleTextAnswer(questionId, e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={6}
                        placeholder="Tu respuesta..."
                      />
                    )}

                    {/* RADIO */}
                    {currentQuestion.type === 'RADIO' && (
                      <div className="space-y-3">
                        {currentQuestion.options?.map((option) => option.id && (
                          <label
                            key={option.id}
                            className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                          >
                            <input
                              type="radio"
                              name={questionId}
                              checked={answers[questionId]?.selectedOptionIds?.[0] === option.id}
                              onChange={() => handleRadioAnswer(questionId, option.id!)}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-900">{option.text}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* CHECKBOX */}
                    {currentQuestion.type === 'CHECKBOX' && (
                      <div className="space-y-3">
                        {currentQuestion.options?.map((option) => option.id && (
                          <label
                            key={option.id}
                            className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                          >
                            <input
                              type="checkbox"
                              checked={answers[questionId]?.selectedOptionIds?.includes(option.id) || false}
                              onChange={(e) => handleCheckboxAnswer(questionId, option.id!, e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-gray-900">{option.text}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* TRUE_FALSE */}
                    {currentQuestion.type === 'TRUE_FALSE' && (
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                          <input
                            type="radio"
                            name={questionId}
                            checked={answers[questionId]?.selectedOptionIds?.[0] === 'true'}
                            onChange={() => handleRadioAnswer(questionId, 'true')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-900">Verdadero</span>
                        </label>
                        <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                          <input
                            type="radio"
                            name={questionId}
                            checked={answers[questionId]?.selectedOptionIds?.[0] === 'false'}
                            onChange={() => handleRadioAnswer(questionId, 'false')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-900">Falso</span>
                        </label>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={goToPreviousQuestion}
              disabled={isFirstQuestion}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-5 h-5" />
              Anterior
            </button>

            <button
              onClick={saveCurrentAnswer}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>

            {!isLastQuestion ? (
              <button
                onClick={goToNextQuestion}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Send className="w-5 h-5" />
                {submitting ? 'Enviando...' : 'Enviar Examen'}
              </button>
            )}
          </div>
        </div>

        {/* Support Files */}
        {exam.supportFiles && exam.supportFiles.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Archivos de Apoyo
            </h3>
            <div className="space-y-2">
              {exam.supportFiles.map((file) => (
                <a
                  key={file.id}
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-900">{file.fileName}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
