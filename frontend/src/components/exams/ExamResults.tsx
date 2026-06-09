import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import type { ExamAttemptResult } from '../../lib/types';
import { useColors } from '../../hooks/useColors';
import { useToast, ToastContainer } from '../common';
import { 
  CheckCircle, 
  XCircle, 
  Award,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Send,
  Mail,
  AlertTriangle,
  Flag,
  X,
  Loader
} from 'lucide-react';

interface ExamResultsProps {
  attemptId: string;
}

/** Limpia marcadores de TinyMCE y devuelve HTML seguro para renderizar el enunciado */
function cleanRichText(html: string): string {
  if (!html) return '';
  return html.replace(/<!--\s*x-tinymce\/html\s*-->/gi, '').trim();
}

export default function ExamResults({ attemptId }: ExamResultsProps) {
  const colors = useColors();
  const [result, setResult] = useState<ExamAttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAnswers, setShowAnswers] = useState(false);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const [reportQuestion, setReportQuestion] = useState<{
    questionId: string;
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadResult();
  }, [attemptId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const data = await examService.getAttemptResult(attemptId);
      setResult(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar resultados');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (index: number) => {
    setExpandedSections(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  /** Resumen textual de la respuesta del estudiante para el modal de reporte */
  const summarizeAnswer = (question: any): string => {
    const sa = question.studentAnswer;
    if (!sa) return 'Sin respuesta';
    if (sa.textValue) return sa.textValue;
    if (sa.selectedOptions?.length) return sa.selectedOptions.map((o: any) => o.text).join(', ');
    if (sa.jsonValue) return JSON.stringify(sa.jsonValue);
    return 'Sin respuesta';
  };

  const handleSendEmail = async () => {
    if (sendingEmail || emailSent) return;
    try {
      setSendingEmail(true);
      const res = await examService.sendAttemptResult(attemptId);
      setEmailSent(true);
      toast.success('Enviado', `Resultados enviados a ${res.email}`);
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudieron enviar los resultados');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando resultados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-800 text-lg">Error</h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // showResults=false: el backend devuelve solo { message }
  if (result?.message && !result.sections) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4">
        <div className="max-w-lg w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-10">
            <Send className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Examen Entregado</h1>
            <p className="text-gray-600 mb-6">{result.message}</p>
            <p className="text-sm text-gray-500">
              Tu profesor revisara las respuestas y publicara los resultados cuando esten disponibles.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!result || !result.exam) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-800 text-lg">Error</h3>
          <p className="text-red-700 mt-1">No se pudieron cargar los resultados</p>
        </div>
      </div>
    );
  }

  const passed = result.passed;
  const isPending = (result as any).requiresManualGrading || result.passed === null || result.passed === undefined;

  const headerClass = isPending
    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
    : passed
    ? 'bg-gradient-to-r from-green-500 to-green-600'
    : 'bg-gradient-to-r from-red-500 to-red-600';

  const headerTitle = isPending
    ? 'Calificación pendiente'
    : passed
    ? 'Felicidades, has aprobado'
    : 'Examen no aprobado';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header con resultado */}
        <div className={`rounded-lg shadow-lg p-8 mb-6 ${headerClass}`}>
          <div className="text-center text-white">
            {isPending ? (
              <AlertTriangle className="w-20 h-20 mx-auto mb-4" />
            ) : passed ? (
              <CheckCircle className="w-20 h-20 mx-auto mb-4" />
            ) : (
              <XCircle className="w-20 h-20 mx-auto mb-4" />
            )}
            
            <h1 className="text-3xl font-bold mb-2">{headerTitle}</h1>
            <p className="text-xl opacity-90">{result.exam.title}</p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <Award className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm opacity-90">Puntuacion</p>
              <p className="text-2xl font-bold">{result.score} / {result.maxScore}</p>
            </div>

            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <div className="text-4xl font-bold mb-2">{(result.percentage ?? 0).toFixed(1)}%</div>
              <p className="text-sm opacity-90">Porcentaje obtenido</p>
              <p className="text-xs mt-1">Minimo requerido: {result.exam.passingScore}%</p>
            </div>

            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm opacity-90">Tiempo empleado</p>
              <p className="text-2xl font-bold">
                {result.timeSpent
                  ? (() => {
                      const total = result.timeSpent;
                      const h = Math.floor(total / 3600);
                      const m = Math.floor((total % 3600) / 60);
                      const s = total % 60;
                      if (h > 0) return `${h}h ${m}m ${s}s`;
                      if (m > 0) return `${m}m ${s}s`;
                      return `${s}s`;
                    })()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Fecha de realizacion</p>
                <p className="font-medium">{result.completedAt ? new Date(result.completedAt).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Estado</p>
                <p className="font-medium">
                  {isPending
                    ? 'Parcialmente calificado - pendiente de revisión manual'
                    : 'Calificado automáticamente'}
                </p>
              </div>
            </div>
          </div>

          {/* Nota si hay preguntas abiertas sin calificar */}
          {isPending && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Calificación tentativa:</strong> Este examen contiene preguntas abiertas que serán calificadas por el profesor. La puntuación mostrada es solo de las preguntas auto-calificadas y puede cambiar una vez que se complete la revisión manual.
              </p>
            </div>
          )}
        </div>

        {/* Boton ver detalle de desempeño */}
        {result.sections && result.sections.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className="w-full py-3 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 font-medium"
            >
              {showAnswers ? (
                <>
                  <ChevronUp className="w-5 h-5" />
                  Ocultar detalle
                </>
              ) : (
                <>
                  <ChevronDown className="w-5 h-5" />
                  Ver detalle de mi desempeño
                </>
              )}
            </button>
          </div>
        )}

        {/* Resumen de desempeño por sección (sin revelar respuestas correctas) */}
        {showAnswers && result.sections && (
          <div className="space-y-4">
            {result.sections.map((section, sIdx) => {
              const total = section.questions.length;
              const correct = section.questions.filter((q: any) => q.isCorrect === true).length;
              const pending = section.questions.filter((q: any) => q.isCorrect === undefined || q.isCorrect === null).length;
              const ptsEarned = section.questions.reduce((acc: number, q: any) => acc + (q.pointsEarned || 0), 0);
              const ptsTotal = section.questions.reduce((acc: number, q: any) => acc + (q.points || 0), 0);
              const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
              const isExpanded = expandedSections.includes(sIdx);

              return (
                <div key={sIdx} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-5 border-b">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{section.title}</h3>
                      <span className="text-sm font-medium text-gray-700">
                        {correct} / {total} correctas
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                      <div
                        className="h-2.5 rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct >= 70 ? '#16a34a' : pct >= 40 ? '#f59e0b' : '#dc2626',
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{ptsEarned} / {ptsTotal} pts</span>
                      {pending > 0 && (
                        <span className="text-amber-600">{pending} pendiente{pending === 1 ? '' : 's'} de revisión</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleSection(sIdx)}
                    className="w-full px-5 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition text-sm font-medium text-gray-700"
                  >
                    <span>Ver detalle de preguntas</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && (
                    <div className="p-5 space-y-3">
                      {section.questions.map((question: any, qIdx: number) => {
                        const status = question.isCorrect === true
                          ? 'correct'
                          : question.isCorrect === false
                          ? 'incorrect'
                          : 'pending';
                        return (
                          <div key={qIdx} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-100">
                            <div className="flex items-start gap-2 min-w-0">
                              {status === 'correct' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                              {status === 'incorrect' && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                              {status === 'pending' && <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />}
                              <div className="min-w-0">
                                <p className="text-sm text-gray-800">
                                  <span className="font-medium">{qIdx + 1}.</span>{' '}
                                  <span dangerouslySetInnerHTML={{ __html: cleanRichText(question.text) }} />
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {question.pointsEarned} / {question.points} pts
                                  {status === 'correct' && ' — Correcta'}
                                  {status === 'incorrect' && ' — Incorrecta'}
                                  {status === 'pending' && ' — Pendiente de revisión'}
                                </p>
                              </div>
                            </div>

                            {status === 'incorrect' && result.exam && (
                              <button
                                onClick={() => setReportQuestion({
                                  questionId: question.id,
                                  questionText: question.text,
                                  userAnswer: summarizeAnswer(question),
                                  correctAnswer: '',
                                })}
                                className="flex items-center gap-1 px-3 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded-lg transition flex-shrink-0"
                              >
                                <Flag className="w-3.5 h-3.5" />
                                Reportar
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Acciones */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          {result.studentEmail && (
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={sendingEmail || emailSent}
              className="flex-1 py-3 px-6 rounded-lg border-2 transition flex items-center justify-center gap-2 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                borderColor: emailSent ? '#16a34a' : colors.primaryColor,
                color: emailSent ? '#16a34a' : colors.primaryColor,
                backgroundColor: '#fff',
              }}
            >
              {sendingEmail ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : emailSent ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Resultados enviados
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Enviar resultados por correo
                </>
              )}
            </button>
          )}
          <a
            href={result.exam ? `/e/${result.exam.slug}` : '/'}
            style={{ backgroundColor: colors.primaryColor }}
            className="flex-1 py-3 px-6 text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 font-medium"
          >
            Volver al inicio
          </a>
        </div>
      </div>

      {/* Modal de reporte inline */}
      {reportQuestion && result.exam && (
        <div className="fixed inset-0 bg-gray-800/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Flag className="w-5 h-5 text-orange-500" />
                Reportar Pregunta
              </h3>
              <button onClick={() => { setReportQuestion(null); setReportReason(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-700 mb-1">Pregunta:</p>
                <p className="text-gray-600">{reportQuestion.questionText}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="font-medium text-blue-700 mb-1">Tu respuesta:</p>
                <p className="text-blue-600">{reportQuestion.userAnswer}</p>
              </div>
              {reportQuestion.correctAnswer && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="font-medium text-green-700 mb-1">Respuesta correcta:</p>
                  <p className="text-green-600">{reportQuestion.correctAnswer}</p>
                </div>
              )}
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!reportReason.trim()) return;
              setSubmittingReport(true);
              try {
                await examService.createQuestionReport(result.exam!.id, reportQuestion.questionId, {
                  attemptId,
                  questionText: reportQuestion.questionText,
                  userAnswer: reportQuestion.userAnswer,
                  correctAnswer: reportQuestion.correctAnswer,
                  reason: reportReason.trim(),
                });
                toast.success('Reporte enviado', 'Tu reporte fue enviado al profesor');
                setReportQuestion(null);
                setReportReason('');
              } catch {
                toast.error('Error', 'No se pudo enviar el reporte');
              } finally {
                setSubmittingReport(false);
              }
            }}>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={3}
                placeholder="Describe por que consideras que la respuesta es incorrecta..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 font-medium"
                >
                  {submittingReport ? 'Enviando...' : 'Enviar Reporte'}
                </button>
                <button
                  type="button"
                  onClick={() => { setReportQuestion(null); setReportReason(''); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
