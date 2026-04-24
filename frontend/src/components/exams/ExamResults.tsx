import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import type { ExamAttemptResult } from '../../lib/types';
import { useColors } from '../../hooks/useColors';
import { QuestionRenderer, FileAttachment, useToast, ToastContainer } from '../common';
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

  /** Mapear la respuesta guardada al formato que QuestionRenderer entiende */
  const mapStudentAnswer = (question: any): any => {
    const sa = question.studentAnswer;
    if (!sa) return undefined;

    const type = question.type?.toUpperCase();

    if (type === 'RADIO' || type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE') {
      return sa.selectedOptions?.[0]?.id || undefined;
    }
    if (type === 'CHECKBOX' || type === 'MULTIPLE_SELECT') {
      return sa.selectedOptions?.map((o: any) => o.id) || [];
    }
    if (type === 'TEXT') return sa.textValue || '';
    if (type === 'TEXTAREA') return sa.textValue || '';
    if (type === 'MATCHING') return sa.jsonValue || [];
    if (type === 'ORDERING') return sa.jsonValue || [];
    if (type === 'FILL_BLANK') return sa.jsonValue || {};

    return sa.textValue || sa.jsonValue || undefined;
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

  /** Resumen de la respuesta correcta para el modal de reporte */
  const summarizeCorrect = (question: any): string => {
    if (question.options?.length) {
      const correct = question.options.filter((o: any) => o.isCorrect);
      if (correct.length) return correct.map((o: any) => o.text).join(', ');
    }
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4" style={{ color: '#334155' }}>Cargando resultados...</p>
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
      <div className="min-h-screen flex items-center justify-center py-8 px-4" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="max-w-lg w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-10">
            <Send className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h1 className="text-2xl font-bold mb-3" style={{ color: '#0F172A' }}>Examen Entregado</h1>
            <p className="mb-6" style={{ color: '#334155' }}>{result.message}</p>
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
    <div className="min-h-screen py-8" style={{ backgroundColor: '#F8FAFC' }}>
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
              <Calendar className="w-5 h-5" style={{ color: '#334155' }} />
              <div>
                <p className="text-sm" style={{ color: '#334155' }}>Fecha de realizacion</p>
                <p className="font-medium">{result.completedAt ? new Date(result.completedAt).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5" style={{ color: '#334155' }} />
              <div>
                <p className="text-sm" style={{ color: '#334155' }}>Estado</p>
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

        {/* Boton ver respuestas */}
        {result.sections && result.sections.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className="w-full py-3 px-6 rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 font-medium"
              style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', color: '#334155' }}
            >
              {showAnswers ? (
                <>
                  <ChevronUp className="w-5 h-5" />
                  Ocultar respuestas
                </>
              ) : (
                <>
                  <ChevronDown className="w-5 h-5" />
                  Ver respuestas y retroalimentacion
                </>
              )}
            </button>
          </div>
        )}

        {/* Detalle de respuestas con QuestionRenderer */}
        {showAnswers && result.sections && (
          <div className="space-y-4">
            {result.sections.map((section, sIdx) => (
              <div key={sIdx} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection(sIdx)}
                  className="w-full p-4 border-b flex items-center justify-between hover:opacity-90 transition"
                  style={{ backgroundColor: '#F8FAFC', borderBottomColor: '#E5E7EB' }}
                >
                  <div className="flex items-center gap-3">
                    {expandedSections.includes(sIdx) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                    <h3 className="font-semibold text-lg">{section.title}</h3>
                  </div>
                  <span className="text-sm" style={{ color: '#334155' }}>
                    {section.questions.length} {section.questions.length === 1 ? 'pregunta' : 'preguntas'}
                  </span>
                </button>

                {expandedSections.includes(sIdx) && (
                  <div className="p-6 space-y-6">
                    {/* Archivo de la seccion */}
                    {section.fileUrl && section.fileName && section.fileType && (
                      <FileAttachment
                        fileUrl={section.fileUrl}
                        fileName={section.fileName}
                        fileType={section.fileType}
                      />
                    )}

                    {section.questions.map((question, qIdx) => (
                      <div key={qIdx} className="relative">
                        {/* QuestionRenderer en modo review */}
                        <QuestionRenderer
                          question={{
                            type: question.type,
                            text: question.text,
                            points: question.points,
                            options: question.options,
                            metadata: question.metadata,
                            fileUrl: question.fileUrl,
                            fileName: question.fileName,
                            fileType: question.fileType,
                            feedback: question.answerFeedback || question.feedback,
                            pairs: question.metadata?.pairs,
                            blanks: question.metadata?.blanks,
                            items: question.metadata?.items,
                          }}
                          questionNumber={qIdx + 1}
                          mode="review"
                          userAnswer={mapStudentAnswer(question)}
                          showFeedback={!!(question.answerFeedback || question.feedback)}
                        />

                        {/* Badge de puntos + botón reportar */}
                        <div className="flex items-center justify-between mt-2 px-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              question.isCorrect === true
                                ? 'bg-green-100 text-green-800'
                                : question.isCorrect === false
                                ? 'bg-red-100 text-red-800'
                                : 'text-xs font-medium'}
                              style={question.isCorrect === undefined ? { backgroundColor: '#E5E7EB', color: '#334155' } : {}}
                            }`}>
                              {question.pointsEarned} / {question.points} pts
                              {question.isCorrect === true && ' — Correcta'}
                              {question.isCorrect === false && ' — Incorrecta'}
                              {question.isCorrect === undefined && ' — Pendiente'}
                            </span>
                          </div>

                          {question.isCorrect === false && result.exam && (
                            <button
                              onClick={() => setReportQuestion({
                                questionId: question.id,
                                questionText: question.text,
                                userAnswer: summarizeAnswer(question),
                                correctAnswer: summarizeCorrect(question),
                              })}
                              className="flex items-center gap-1 px-3 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            >
                              <Flag className="w-3.5 h-3.5" />
                              Reportar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
                <Flag className="w-5 h-5 text-orange-500" />
                Reportar Pregunta
              </h3>
              <button onClick={() => { setReportQuestion(null); setReportReason(''); }} style={{ color: '#334155' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-4 text-sm">
              <div className="rounded-lg p-3" style={{ backgroundColor: '#F8FAFC' }}>
                <p className="font-medium mb-1" style={{ color: '#334155' }}>Pregunta:</p>
                <p style={{ color: '#334155' }}>{reportQuestion.questionText}</p>
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
                  className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4"
                  style={{ border: '1px solid #E5E7EB', color: '#0F172A', backgroundColor: '#ffffff' }}
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
                  className="px-4 py-2 rounded-lg transition"
                  style={{ border: '1px solid #E5E7EB', color: '#334155', backgroundColor: '#ffffff' }}
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
