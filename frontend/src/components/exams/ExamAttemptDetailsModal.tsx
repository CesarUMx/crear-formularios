import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import { Modal } from '../common';
import {
  Award,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader,
} from 'lucide-react';

interface ExamAttemptDetailsModalProps {
  isOpen: boolean;
  examId: string;
  attemptId: string;
  onClose: () => void;
}

export default function ExamAttemptDetailsModal({
  isOpen,
  examId,
  attemptId,
  onClose,
}: ExamAttemptDetailsModalProps) {
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && attemptId) {
      loadAttempt();
    }
  }, [isOpen, attemptId]);

  const loadAttempt = async () => {
    try {
      setLoading(true);
      const data = await examService.getAttemptById(examId, attemptId);
      setAttempt(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar detalles');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const percentage = attempt?.score != null && attempt?.maxScore
    ? (attempt.score / attempt.maxScore) * 100
    : 0;

  const isPending = attempt?.requiresManualGrading || attempt?.passed === null || attempt?.passed === undefined;
  const totalCorrect = attempt?.answers?.filter((a: any) => a.isCorrect === true).length || 0;
  const totalQuestions = attempt?.answers?.length || 0;

  const renderStudentAnswer = (answer: any) => {
    const question = answer.question;
    if (!question) return null;

    // RADIO, CHECKBOX, TRUE_FALSE - mostrar opciones
    if (['RADIO', 'CHECKBOX', 'TRUE_FALSE'].includes(question.type)) {
      const selectedIds = new Set(answer.selectedOptions?.map((o: any) => o.id) || []);
      return (
        <div className="space-y-1 mt-2">
          {question.options?.map((opt: any) => {
            const isSelected = selectedIds.has(opt.id);
            const isCorrectOpt = opt.isCorrect;
            let colorClass = 'text-gray-600';
            let icon = null;
            if (isSelected && isCorrectOpt) {
              colorClass = 'text-green-700 font-medium';
              icon = <CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />;
            } else if (isSelected && !isCorrectOpt) {
              colorClass = 'text-red-700 font-medium';
              icon = <XCircle className="w-4 h-4 text-red-600 inline mr-1" />;
            } else if (!isSelected && isCorrectOpt) {
              colorClass = 'text-gray-600 italic';
            }
            return (
              <div key={opt.id} className={`text-sm ${colorClass}`}>
                {icon}
                {opt.text}
                {!isSelected && isCorrectOpt && <span className="ml-2 text-xs">(respuesta correcta)</span>}
              </div>
            );
          })}
        </div>
      );
    }

    // TEXT / TEXTAREA
    if (['TEXT', 'TEXTAREA'].includes(question.type)) {
      return (
        <div className="mt-2 text-sm">
          <span className="text-gray-500">Respuesta: </span>
          <span className="font-medium">{answer.textValue || '(sin respuesta)'}</span>
        </div>
      );
    }

    // FILL_BLANK
    if (question.type === 'FILL_BLANK') {
      const studentBlanks = (answer.jsonValue || {}) as Record<string, string>;
      const correctBlanks = question.metadata?.blanks || [];
      return (
        <div className="mt-2 space-y-1">
          {correctBlanks.map((b: any, i: number) => {
            const studentVal = studentBlanks[i] || studentBlanks[String(i)] || '';
            const isCorrect = studentVal.trim().toLowerCase() === (b.correctAnswer || '').trim().toLowerCase();
            return (
              <div key={i} className="text-sm">
                <span className="text-gray-500">Espacio {i + 1}: </span>
                <span className={isCorrect ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                  {studentVal || '(vacío)'}
                </span>
                {!isCorrect && (
                  <span className="ml-2 text-xs text-gray-500">
                    (correcto: <strong>{b.correctAnswer}</strong>)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // MATCHING
    if (question.type === 'MATCHING') {
      const pairs = question.metadata?.pairs || [];
      const studentMatches: string[] = Array.isArray(answer.jsonValue) ? answer.jsonValue : [];
      return (
        <div className="mt-2 space-y-1">
          {pairs.map((pair: any, i: number) => {
            const studentRight = studentMatches[i] || '';
            const isCorrect = studentRight.trim().toLowerCase() === (pair.right || '').trim().toLowerCase();
            return (
              <div key={i} className="text-sm">
                <span className="font-medium">{pair.left}</span>
                <span className="mx-2">→</span>
                <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                  {studentRight || '(sin selección)'}
                </span>
                {!isCorrect && (
                  <span className="ml-2 text-xs text-gray-500">
                    (correcto: <strong>{pair.right}</strong>)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // ORDERING
    if (question.type === 'ORDERING') {
      const studentOrder: string[] = Array.isArray(answer.jsonValue) ? answer.jsonValue : [];
      const correctItems = [...(question.metadata?.items || [])].sort(
        (a: any, b: any) => a.correctOrder - b.correctOrder
      );
      return (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Orden del estudiante:</div>
          <ol className="list-decimal list-inside space-y-0.5 text-sm">
            {studentOrder.map((t, i) => {
              const correctAtPos = correctItems[i]?.text || '';
              const isCorrect = t.trim().toLowerCase() === correctAtPos.trim().toLowerCase();
              return (
                <li key={i} className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                  {t}
                </li>
              );
            })}
          </ol>
          <div className="text-xs text-gray-500 mt-2 mb-1">Orden correcto:</div>
          <ol className="list-decimal list-inside space-y-0.5 text-sm text-gray-700">
            {correctItems.map((it: any, i: number) => (
              <li key={i}>{it.text}</li>
            ))}
          </ol>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalles del Intento" size="xl">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      ) : attempt ? (
        <div className="space-y-6">
          {/* Encabezado */}
          <div className={`rounded-lg p-4 border-2 ${
            isPending
              ? 'bg-amber-50 border-amber-300'
              : attempt.passed
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{attempt.exam?.title || 'Examen'}</h3>
                <p className="text-sm text-gray-600">
                  Intento #{attempt.attemptNumber} - {attempt.studentName}
                </p>
              </div>
              <Award className={`w-8 h-8 ${
                isPending ? 'text-amber-600' : attempt.passed ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="bg-white rounded p-2">
                <p className="text-xs text-gray-500">Calificación</p>
                <p className="text-lg font-bold text-blue-600">{percentage.toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded p-2">
                <p className="text-xs text-gray-500">Correctas</p>
                <p className="text-lg font-bold text-gray-900">
                  {totalCorrect}/{totalQuestions}
                </p>
              </div>
              <div className="bg-white rounded p-2">
                <p className="text-xs text-gray-500">Tiempo</p>
                <p className="text-lg font-bold text-gray-900">{formatTime(attempt.timeSpent)}</p>
              </div>
              <div className="bg-white rounded p-2">
                <p className="text-xs text-gray-500">Estado</p>
                <p className={`text-lg font-bold ${
                  isPending ? 'text-amber-700' : attempt.passed ? 'text-green-700' : 'text-red-700'
                }`}>
                  {isPending ? 'Pendiente' : attempt.passed ? 'Aprobado' : 'Reprobado'}
                </p>
              </div>
            </div>
          </div>

          {/* Respuestas */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Respuestas Detalladas</h4>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {attempt.answers?.map((answer: any, idx: number) => {
                const isCorrect = answer.isCorrect;
                const isPendingAnswer = isCorrect === null || isCorrect === undefined;
                const bgClass = isPendingAnswer
                  ? 'bg-amber-50 border-amber-200'
                  : isCorrect
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200';
                return (
                  <div key={answer.id || idx} className={`rounded-lg border p-3 ${bgClass}`}>
                    <div className="flex items-start gap-2">
                      {isPendingAnswer ? (
                        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      ) : isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {idx + 1}. {answer.question?.text}
                        </p>
                        {renderStudentAnswer(answer)}
                        {answer.feedback && (
                          <div className="mt-2 p-2 bg-white/50 rounded text-xs text-gray-700">
                            <strong>Retroalimentación:</strong> {answer.feedback}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {answer.pointsEarned ?? 0} / {answer.question?.points ?? 0} pts
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
