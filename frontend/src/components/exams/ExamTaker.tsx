import { useState, useEffect, useCallback } from 'react';
import { examService } from '../../lib/examService';
import type { ExamAttempt, ExamSection, ExamQuestion } from '../../lib/types';
import { useToast, ToastContainer, Dialog, useDialog, QuestionRenderer, FileAttachment } from '../common';
import { useColors } from '../../hooks/useColors';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  FileText,
  Shield,
} from 'lucide-react';

interface ExamTakerProps {
  attemptId: string;
  initialAttempt?: ExamAttempt;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Mapear respuesta de QuestionRenderer al formato de examService.saveAnswer
function mapAnswerForSave(questionType: string, answer: any): { textValue?: string; selectedOptionIds?: string[]; jsonValue?: any } {
  if (answer === null || answer === undefined) return {};

  switch (questionType) {
    case 'RADIO':
    case 'TRUE_FALSE':
      return { selectedOptionIds: [String(answer)] };
    case 'CHECKBOX':
      return { selectedOptionIds: Array.isArray(answer) ? answer.map(String) : [String(answer)] };
    case 'TEXT':
    case 'TEXTAREA':
      return { textValue: String(answer) };
    case 'MATCHING':
    case 'ORDERING':
    case 'FILL_BLANK':
      return { jsonValue: answer };
    default:
      return { textValue: String(answer) };
  }
}

// Mapear respuesta guardada del servidor al formato de QuestionRenderer
function mapSavedAnswer(question: ExamQuestion, savedAnswer: any): any {
  if (!savedAnswer) return undefined;

  switch (question.type) {
    case 'RADIO':
    case 'TRUE_FALSE':
      return savedAnswer.selectedOptionIds?.[0] || savedAnswer.selectedOptions?.[0]?.id;
    case 'CHECKBOX':
      return savedAnswer.selectedOptionIds || savedAnswer.selectedOptions?.map((o: any) => o.id) || [];
    case 'TEXT':
    case 'TEXTAREA':
      return savedAnswer.textValue || '';
    case 'MATCHING':
    case 'ORDERING':
    case 'FILL_BLANK':
      return savedAnswer.jsonValue;
    default:
      return savedAnswer.textValue;
  }
}

export default function ExamTaker({ attemptId, initialAttempt }: ExamTakerProps) {
  const colors = useColors();
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

  // Seguridad
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  const toast = useToast();
  const submitDialog = useDialog();
  const unansweredDialog = useDialog();
  const [unansweredCount, setUnansweredCount] = useState(0);

  const loadAttempt = useCallback(async () => {
    try {
      setLoading(true);
      const data = await examService.getAttempt(attemptId);
      setAttempt(data);

      // Restaurar respuestas guardadas
      if (data.answers && data.answers.length > 0) {
        const sections: ExamSection[] = data.exam?.sections || [];
        const questionMap: Record<string, ExamQuestion> = {};
        sections.forEach(s => s.questions.forEach(q => {
          if (q.id) questionMap[q.id] = q;
        }));

        const restoredAnswers: Record<string, any> = {};
        data.answers.forEach((a: any) => {
          const question = questionMap[a.questionId];
          if (question) {
            restoredAnswers[a.questionId] = mapSavedAnswer(question, a);
          }
        });
        setAnswers(restoredAnswers);
      }

      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el examen');
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    if (!initialAttempt && attemptId) {
      loadAttempt();
    }
  }, [attemptId, initialAttempt, loadAttempt]);

  // Deteccion de cambio de pestana
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && attempt) {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);

        // Registrar en servidor
        examService.recordTabSwitch(attemptId).catch(() => {});

        if (newCount === 1) {
          toast.warning('Advertencia', 'Se detecto que cambiaste de pestana. Esto quedara registrado.');
        } else if (newCount === 3) {
          toast.error('Ultima advertencia', 'Si cambias de pestana nuevamente, el examen se enviara automaticamente.');
        } else if (newCount >= 4) {
          toast.error('Examen enviado', 'Cambiaste de pestana demasiadas veces.');
          setTimeout(() => handleAutoSubmit(), 500);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [attempt, tabSwitchCount]);

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

      if (remainingSeconds <= 300 && remainingSeconds > 299 && !warningShown5Min) {
        toast.warning('Tiempo restante', 'Quedan 5 minutos para terminar el examen', 10000);
        setWarningShown5Min(true);
      }

      if (remainingSeconds <= 60 && remainingSeconds > 59 && !warningShown1Min) {
        toast.warning('Ultimo minuto', 'El examen se enviara automaticamente cuando termine el tiempo', 15000);
        setWarningShown1Min(true);
      }

      if (remaining === 0) {
        toast.error('Tiempo agotado', 'El examen se enviara automaticamente', 0);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, warningShown5Min, warningShown1Min]);

  // Loading / Error
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
  const sections: ExamSection[] = exam?.sections || [];
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
    let answer = answers[questionId];
    if (answer === null || answer === undefined) return;

    // Para ORDERING: convertir array de índices a array de textos en orden
    if (currentQuestion.type === 'ORDERING' && Array.isArray(answer)) {
      const shuffledItems = (currentQuestion as any).shuffledItems || currentQuestion.metadata?.items || [];
      answer = answer.map((idx: number) => shuffledItems[idx]?.text).filter(Boolean);
    }

    try {
      setSaving(true);
      const mapped = mapAnswerForSave(currentQuestion.type, answer);
      await examService.saveAnswer(attemptId, {
        questionId,
        ...mapped
      });
      setLastSaved(new Date());
    } catch (err) {
      // Silencio - el auto-save no debe interrumpir al usuario
    } finally {
      setSaving(false);
    }
  };

  const handleAnswerChange = (answer: any) => {
    if (!currentQuestion?.id) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id!]: answer
    }));
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

  const goToQuestion = async (sIdx: number, qIdx: number) => {
    await saveCurrentAnswer();
    setCurrentSectionIndex(sIdx);
    setCurrentQuestionIndex(qIdx);
  };

  const getTotalQuestions = () => {
    return sections.reduce((total: number, section: ExamSection) => total + section.questions.length, 0);
  };

  const getCurrentQuestionNumber = () => {
    let count = 0;
    for (let i = 0; i < currentSectionIndex; i++) {
      count += sections[i].questions.length;
    }
    return count + currentQuestionIndex + 1;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).filter(key => {
      const a = answers[key];
      if (a === null || a === undefined) return false;
      if (typeof a === 'string' && a === '') return false;
      if (Array.isArray(a) && a.length === 0) return false;
      return true;
    }).length;
  };

  const handleAutoSubmit = async () => {
    try {
      setSubmitting(true);
      await saveCurrentAnswer();
      await examService.submitAttempt(attemptId);
      window.location.href = `/e/${attempt?.exam?.slug}/result/${attemptId}`;
    } catch (err) {
      toast.error('Error al enviar examen', err instanceof Error ? err.message : 'Ocurrio un error');
      setSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    const unanswered = getTotalQuestions() - getAnsweredCount();
    if (unanswered > 0) {
      setUnansweredCount(unanswered);
      unansweredDialog.open();
    } else {
      submitDialog.open();
    }
  };

  const handleSubmitConfirm = async () => {
    try {
      setSubmitting(true);
      unansweredDialog.close();
      submitDialog.close();
      await saveCurrentAnswer();
      await examService.submitAttempt(attemptId);
      window.location.href = `/e/${attempt?.exam?.slug}/result/${attemptId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar examen');
      toast.error('Error al enviar examen', err instanceof Error ? err.message : 'Ocurrio un error');
      setSubmitting(false);
    }
  };

  const isFirstQuestion = currentSectionIndex === 0 && currentQuestionIndex === 0;
  const isLastQuestion = currentSectionIndex === sections.length - 1 &&
    currentQuestionIndex === currentSection.questions.length - 1;

  // Transformar la pregunta para QuestionRenderer
  const transformedQuestion = {
    type: currentQuestion.type,
    text: currentQuestion.text,
    helpText: currentQuestion.helpText,
    points: currentQuestion.points,
    options: currentQuestion.options,
    pairs: currentQuestion.metadata?.pairs,
    blanks: currentQuestion.metadata?.blanks,
    items: currentQuestion.metadata?.items,
    metadata: currentQuestion.metadata,
    shuffledRightColumn: (currentQuestion as any).shuffledRightColumn,
    shuffledItems: (currentQuestion as any).shuffledItems,
    fileUrl: currentQuestion.fileUrl,
    fileName: currentQuestion.fileName,
    fileType: currentQuestion.fileType,
  };

  return (
    <div
      className="min-h-screen bg-gray-50"
      onCopy={(e) => { e.preventDefault(); }}
      onCut={(e) => { e.preventDefault(); }}
      onPaste={(e) => { e.preventDefault(); }}
      onContextMenu={(e) => { e.preventDefault(); }}
      style={{ userSelect: 'none' }}
    >
      {/* Header sticky */}
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
              <div className="text-sm text-gray-600">
                <span className="font-medium">{getAnsweredCount()}</span> / {getTotalQuestions()} respondidas
              </div>

              {timeRemaining !== null && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
                </div>
              )}

              {tabSwitchCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                  <Shield className="w-3 h-3" />
                  {tabSwitchCount}/4
                </div>
              )}

              {saving && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Guardando...
                </div>
              )}
              {lastSaved && !saving && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Guardado
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: colors.primaryColor,
                  width: `${(getCurrentQuestionNumber() / getTotalQuestions()) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Question dots */}
          <div className="mt-3 flex flex-wrap gap-1">
            {sections.map((section, sIdx) =>
              section.questions.map((q, qIdx) => {
                const isActive = sIdx === currentSectionIndex && qIdx === currentQuestionIndex;
                const isAnswered = q.id ? !!answers[q.id] : false;
                return (
                  <button
                    key={`${sIdx}-${qIdx}`}
                    onClick={() => goToQuestion(sIdx, qIdx)}
                    className={`w-7 h-7 rounded-full text-xs font-medium transition ${
                      isActive
                        ? 'ring-2 ring-offset-1 ring-blue-500 bg-blue-600 text-white'
                        : isAnswered
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                    title={`Pregunta ${sections.slice(0, sIdx).reduce((c, s) => c + s.questions.length, 0) + qIdx + 1}`}
                  >
                    {sections.slice(0, sIdx).reduce((c, s) => c + s.questions.length, 0) + qIdx + 1}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Section info */}
          {currentSection && (
            <div className="mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{currentSection.title}</h2>
              {currentSection.description && (
                <p className="text-sm text-gray-600 mt-1">{currentSection.description}</p>
              )}
              {currentSection.fileUrl && currentSection.fileName && currentSection.fileType && (
                <div className="mt-3">
                  <FileAttachment
                    fileUrl={currentSection.fileUrl}
                    fileName={currentSection.fileName}
                    fileType={currentSection.fileType}
                  />
                </div>
              )}
            </div>
          )}

          {/* Question via QuestionRenderer */}
          <QuestionRenderer
            question={transformedQuestion as any}
            questionNumber={getCurrentQuestionNumber()}
            mode="exam"
            userAnswer={currentQuestion.id ? answers[currentQuestion.id] : undefined}
            onAnswerChange={handleAnswerChange}
          />

          {/* Error */}
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
                style={{ backgroundColor: colors.primaryColor }}
                className="flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:opacity-90 transition"
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmitClick}
                disabled={submitting}
                style={{ backgroundColor: colors.primaryColor }}
                className="flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Send className="w-5 h-5" />
                {submitting ? 'Enviando...' : 'Enviar Examen'}
              </button>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <Dialog
          isOpen={unansweredDialog.isOpen}
          onClose={unansweredDialog.close}
          onConfirm={() => { unansweredDialog.close(); submitDialog.open(); }}
          title="Preguntas sin responder"
          message={`Tienes ${unansweredCount} pregunta(s) sin responder. Deseas continuar y enviar el examen de todas formas?`}
          type="warning"
          confirmText="Continuar"
          cancelText="Revisar"
        />

        <Dialog
          isOpen={submitDialog.isOpen}
          onClose={submitDialog.close}
          onConfirm={handleSubmitConfirm}
          title="Enviar Examen"
          message="Estas seguro de enviar el examen? No podras modificar tus respuestas despues de enviarlo."
          type="warning"
          confirmText="Enviar Examen"
          cancelText="Cancelar"
          loading={submitting}
        />

        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      </div>
    </div>
  );
}
