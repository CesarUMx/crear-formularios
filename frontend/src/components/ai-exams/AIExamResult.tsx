import { useState, useEffect } from 'react';
import { API_URL } from '../../lib/config';
import { aiExamService } from '../../lib/aiExamService';
import { useColors } from '../../hooks/useColors';
import ReportQuestionModal from './ReportQuestionModal';
import {
  Brain,
  CheckCircle,
  XCircle,
  Award,
  Clock,
  Target,
  TrendingUp,
  AlertCircle,
  Loader,
  Home,
  Flag,
  ArrowDownUp,
} from 'lucide-react';

interface AttemptResult {
  id: string;
  attemptNumber: number;
  studentName?: string;
  studentEmail?: string;
  startedAt: string;
  completedAt?: string;
  timeSpent?: number;
  score?: number;
  maxScore: number;
  passed?: boolean;
  totalCorrect?: number;
  totalQuestions?: number;
  responses: {
    id: string;
    questionId: string;
    selectedOptionId?: string;
    textAnswer?: string;
    isCorrect?: boolean;
    pointsEarned?: number;
    question: {
      id: string;
      text: string;
      feedback?: string;
      metadata?: any;
      options: {
        id: string;
        text: string;
        isCorrect: boolean;
      }[];
    };
    selectedOption?: {
      id: string;
      text: string;
    };
  }[];
}

interface AIExamResultProps {
  attemptId: string;
}

export default function AIExamResult({ attemptId }: AIExamResultProps) {
  const colors = useColors();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState<any>(null);

  useEffect(() => {
    loadResult();
  }, [attemptId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/ai-exams/attempts/${attemptId}/result`);
      
      if (!response.ok) {
        throw new Error('No se pudo cargar el resultado');
      }
      
      const data = await response.json();
      setResult(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar resultado');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getGradeColor = (score?: number) => {
    if (!score) return 'text-gray-600';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeLabel = (score?: number) => {
    if (!score) return 'Sin calificar';
    if (score >= 90) return 'Excelente';
    if (score >= 70) return 'Bien';
    if (score >= 60) return 'Aprobado';
    return 'Reprobado';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: colors.primaryColor }} />
          <p className="text-gray-600">Cargando resultados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="rounded-lg bg-red-50 p-6 flex items-start">
          <AlertCircle className="h-6 w-6 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Error al cargar resultados</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  // Si showResults es false, mostrar solo mensaje de entrega
  if (result.showResults === false) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Examen Entregado</h1>
          <p className="text-gray-600">{result.message || 'Tu examen fue entregado exitosamente. El profesor revisara tus respuestas.'}</p>
          {result.aiExam?.title && (
            <p className="text-sm text-gray-500">{result.aiExam.title}</p>
          )}
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium hover:opacity-90 transition mt-4"
            style={{ backgroundColor: colors.primaryColor }}
          >
            <Home className="w-4 h-4" />
            Volver al Inicio
          </a>
        </div>
      </div>
    );
  }

  const score = result.score ?? 0;
  const passed = result.passed ?? false;
  const totalCorrect = result.totalCorrect ?? 0;
  const totalQuestions = result.totalQuestions ?? 0;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      {/* Header con resultado principal */}
      <div className={`rounded-lg border-2 p-8 ${
        passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="text-center">
          {passed ? (
            <Award className="w-16 h-16 text-green-600 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          )}
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {passed ? '¡Felicitaciones!' : 'No Aprobado'}
          </h1>
          
          <p className="text-lg text-gray-700 mb-6">
            {passed 
              ? 'Has aprobado el examen exitosamente'
              : 'No alcanzaste el puntaje mínimo requerido'
            }
          </p>

          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Calificación</p>
              <p className={`text-5xl font-bold ${getGradeColor(score)}`}>
                {score}%
              </p>
              <p className="text-sm text-gray-600 mt-1">{getGradeLabel(score)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Respuestas Correctas</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {totalCorrect}/{totalQuestions}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {Math.round((totalCorrect / totalQuestions) * 100)}% de aciertos
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-gray-600">Tiempo Utilizado</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatTime(result.timeSpent)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Intento #{result.attemptNumber}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Puntos Obtenidos</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {totalCorrect}/{totalQuestions}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {result.maxScore} puntos máximos
          </p>
        </div>
      </div>

      {/* Detalles de respuestas */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Revisar Respuestas
          </h2>
          <span className="text-sm font-medium" style={{ color: colors.primaryColor }}>
            {showDetails ? 'Ocultar' : 'Mostrar'} detalles
          </span>
        </button>

        {showDetails && (
          <div className="mt-6 space-y-6">
            {result.responses && result.responses.length > 0 ? (
              result.responses.map((response, index) => {
                const questionType = response.question.metadata?.questionType || 'multiple_choice';
                
                return (
              <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    response.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {response.isCorrect ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2">
                      {index + 1}. {response.question.text}
                    </p>
                    
                    {/* Opción Única / Verdadero-Falso */}
                    {(questionType === 'multiple_choice' || questionType === 'true_false') && (
                    <div className="space-y-2 ml-2">
                      {response.question.options.map((option) => (
                        <div
                          key={option.id}
                          className={`p-3 rounded-lg border ${
                            option.isCorrect
                              ? 'bg-green-50 border-green-200'
                              : response.selectedOption?.id === option.id
                              ? 'bg-red-50 border-red-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {option.isCorrect && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                            {response.selectedOption?.id === option.id && !option.isCorrect && (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm text-gray-900">{option.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}

                    {/* Opción Múltiple (varias correctas) */}
                    {questionType === 'multiple_select' && (() => {
                      const selectedIds: string[] = (() => {
                        try { return response.textAnswer ? JSON.parse(response.textAnswer) : []; } catch { return []; }
                      })();
                      return (
                        <div className="space-y-2 ml-2">
                          {response.question.options.map((option) => {
                            const wasSelected = selectedIds.includes(option.id);
                            return (
                              <div
                                key={option.id}
                                className={`p-3 rounded-lg border ${
                                  option.isCorrect && wasSelected
                                    ? 'bg-green-50 border-green-200'
                                    : option.isCorrect && !wasSelected
                                    ? 'bg-yellow-50 border-yellow-200'
                                    : !option.isCorrect && wasSelected
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" checked={wasSelected} disabled className="mt-0.5" />
                                  {option.isCorrect && wasSelected && <CheckCircle className="w-4 h-4 text-green-600" />}
                                  {option.isCorrect && !wasSelected && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                                  {!option.isCorrect && wasSelected && <XCircle className="w-4 h-4 text-red-600" />}
                                  <span className="text-sm text-gray-900">{option.text}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Relación de Columnas */}
                    {questionType === 'matching' && (() => {
                      const pairs = response.question.metadata?.pairs || [];
                      const shuffledRight = response.question.metadata?.shuffledRightColumn || pairs.map((p: any) => p.right);
                      const userMatchAnswers: string[] = (() => {
                        try { return response.textAnswer ? JSON.parse(response.textAnswer) : []; } catch { return []; }
                      })();
                      return (
                        <div className="space-y-2 ml-2">
                          {pairs.map((pair: any, idx: number) => {
                            const userLetter = userMatchAnswers[idx] || '';
                            const userIdx = userLetter ? userLetter.charCodeAt(0) - 65 : -1;
                            const userRight = userIdx >= 0 && userIdx < shuffledRight.length ? shuffledRight[userIdx] : '—';
                            const isCorrectPair = userRight === pair.right;
                            return (
                              <div key={idx} className={`p-3 rounded-lg border ${isCorrectPair ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-center gap-2">
                                  {isCorrectPair ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                                  <span className="text-sm font-medium">{pair.left}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-sm">{userRight}</span>
                                </div>
                                {!isCorrectPair && (
                                  <p className="text-xs text-green-700 mt-1 ml-6">Correcta: {pair.right}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Ordenar/Secuenciar */}
                    {questionType === 'ordering' && (() => {
                      const items = response.question.metadata?.items || [];
                      const shuffledItems = response.question.metadata?.shuffledItems || items;
                      const userOrder: number[] = (() => {
                        try { return response.textAnswer ? JSON.parse(response.textAnswer) : []; } catch { return []; }
                      })();
                      const userOrderedItems = userOrder.length > 0 
                        ? userOrder.map((idx: number) => shuffledItems[idx]).filter(Boolean)
                        : shuffledItems;
                      const correctItems = [...items].sort((a: any, b: any) => a.correctOrder - b.correctOrder);
                      return (
                        <div className="space-y-3 ml-2">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Tu orden:</p>
                            <div className="space-y-1">
                              {userOrderedItems.map((item: any, idx: number) => {
                                const isRightPosition = correctItems[idx]?.text === item?.text;
                                return (
                                  <div key={idx} className={`flex items-center gap-2 p-2 rounded border text-sm ${isRightPosition ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-xs font-bold">{idx + 1}</span>
                                    <span>{item?.text || '—'}</span>
                                    {isRightPosition ? <CheckCircle className="w-4 h-4 text-green-600 ml-auto" /> : <XCircle className="w-4 h-4 text-red-600 ml-auto" />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {!response.isCorrect && (
                            <div>
                              <p className="text-xs font-semibold text-green-700 mb-1">Orden correcto:</p>
                              <div className="space-y-1">
                                {correctItems.map((item: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 p-2 rounded border bg-green-50 border-green-200 text-sm">
                                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800">{idx + 1}</span>
                                    <span>{item.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Completar Espacios */}
                    {questionType === 'fill_blank' && (() => {
                      const blanks = response.question.metadata?.blanks || [];
                      const userFillAnswers: Record<string, string> = (() => {
                        try { return response.textAnswer ? JSON.parse(response.textAnswer) : {}; } catch { return {}; }
                      })();
                      return (
                        <div className="space-y-2 ml-2">
                          {blanks.map((blank: any, idx: number) => {
                            const userVal = userFillAnswers[idx] || '—';
                            const isCorrectBlank = userVal.trim().toLowerCase() === blank.correctAnswer.trim().toLowerCase();
                            return (
                              <div key={idx} className={`p-3 rounded-lg border ${isCorrectBlank ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-center gap-2">
                                  {isCorrectBlank ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                                  <span className="text-sm">Espacio {idx + 1}: <strong>{userVal}</strong></span>
                                </div>
                                {!isCorrectBlank && (
                                  <p className="text-xs text-green-700 mt-1 ml-6">Correcta: {blank.correctAnswer}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {response.question.feedback && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Explicación:</strong> {response.question.feedback}
                        </p>
                      </div>
                    )}

                    {/* Botón de reporte para preguntas incorrectas */}
                    {!response.isCorrect && (
                      <div className="mt-3">
                        <button
                          onClick={() => setReportingQuestion({
                            questionId: response.question.id,
                            questionText: response.question.text,
                            userAnswer: response.selectedOption?.text || 'Sin respuesta',
                            correctAnswer: response.question.options.find((opt: any) => opt.isCorrect)?.text || 'Desconocida',
                            isCorrect: response.isCorrect
                          })}
                          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >
                          <Flag className="w-4 h-4" />
                          Reportar pregunta
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No hay respuestas disponibles</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mensaje de agradecimiento */}
      <div className="text-center py-8 border-t border-gray-200">
        <div className="max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            ¡Gracias por realizar el examen!
          </h3>
          <p className="text-gray-600 mb-4">
            Tu examen ha sido enviado y calificado exitosamente. 
            Puedes cerrar esta pestaña cuando lo desees.
          </p>
          <p className="text-sm text-gray-500">
            Si necesitas revisar tus respuestas nuevamente, puedes consultar la sección 
            "Revisar Respuestas" arriba.
          </p>
        </div>
      </div>

      {/* Modal de reporte de pregunta */}
      {reportingQuestion && (
        <ReportQuestionModal
          isOpen={!!reportingQuestion}
          onClose={() => setReportingQuestion(null)}
          questionData={reportingQuestion}
          examId={result.aiExam?.id || ''}
          attemptId={attemptId}
        />
      )}
    </div>
  );
}
