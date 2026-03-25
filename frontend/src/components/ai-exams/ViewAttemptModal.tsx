import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Clock, Target, Award, Loader, X } from 'lucide-react';
import Modal from '../common/Modal';
import { useColors } from '../../hooks/useColors';

interface ViewAttemptModalProps {
  isOpen: boolean;
  attemptId: string;
  onClose: () => void;
}

interface AttemptDetails {
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
  aiExam: {
    title: string;
    passingScore: number;
  };
  responses: {
    id: string;
    questionId: string;
    selectedOptionId?: string;
    textAnswer?: string; // ✅ Para matching, ordering, fill_blank
    isCorrect?: boolean;
    pointsEarned?: number;
    question: {
      id: string;
      text: string;
      feedback?: string;
      points: number;
      metadata?: any; // ✅ Para obtener tipo de pregunta y datos
      options?: {
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

export default function ViewAttemptModal({ isOpen, attemptId, onClose }: ViewAttemptModalProps) {
  const colors = useColors();
  const [attempt, setAttempt] = useState<AttemptDetails | null>(null);
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
      const response = await fetch(`http://localhost:3000/api/ai-exams/attempts/${attemptId}/result`);
      
      if (!response.ok) {
        throw new Error('No se pudo cargar el intento');
      }
      
      const data = await response.json();
      setAttempt(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar intento');
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

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-600';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalles del Intento" size="xl">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: colors.primaryColor }} />
            <p className="text-gray-600">Cargando detalles...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <div className="flex items-start">
            <XCircle className="h-6 w-6 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-red-800 mb-2">Error al cargar intento</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : attempt ? (
        <div className="space-y-6">
          {/* Resumen del intento */}
          <div className={`rounded-lg border-2 p-6 ${
            attempt.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{attempt.aiExam.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Intento #{attempt.attemptNumber} - {attempt.studentName || attempt.studentEmail}
                </p>
              </div>
              {attempt.passed ? (
                <Award className="w-12 h-12 text-green-600" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600" />
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Calificación</p>
                <p className={`text-2xl font-bold ${getScoreColor(attempt.score)}`}>
                  {attempt.score?.toFixed(1)}%
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Correctas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {attempt.totalCorrect}/{attempt.totalQuestions}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Tiempo</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(attempt.timeSpent)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Estado</p>
                <p className={`text-lg font-bold ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                  {attempt.passed ? 'Aprobado' : 'Reprobado'}
                </p>
              </div>
            </div>
          </div>

          {/* Respuestas detalladas */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Respuestas Detalladas</h4>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {attempt.responses && attempt.responses.length > 0 ? (
                attempt.responses.map((response, index) => (
                  <div key={response.id} className="border border-gray-200 rounded-lg p-4 bg-white">
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
                        <p className="font-medium text-gray-900 mb-3">
                          {index + 1}. {response.question.text}
                        </p>
                        
                        {/* Renderizado según tipo de pregunta */}
                        {(() => {
                          const questionType = response.question.metadata?.questionType || 'multiple_choice';
                          
                          // Opción múltiple / Verdadero-Falso
                          if (questionType === 'multiple_choice' || questionType === 'true_false') {
                            return (
                              <div className="space-y-2 ml-2">
                                {response.question.options?.map((option) => (
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
                                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                      )}
                                      {response.selectedOption?.id === option.id && !option.isCorrect && (
                                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                      )}
                                      <span className={`text-sm ${
                                        option.isCorrect ? 'text-green-900 font-medium' :
                                        response.selectedOption?.id === option.id ? 'text-red-900 font-medium' :
                                        'text-gray-700'
                                      }`}>
                                        {option.text}
                                      </span>
                                    </div>
                                    {option.isCorrect && (
                                      <span className="text-xs text-green-700 ml-6">✓ Respuesta correcta</span>
                                    )}
                                    {response.selectedOption?.id === option.id && !option.isCorrect && (
                                      <span className="text-xs text-red-700 ml-6">✗ Tu respuesta</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          
                          // Completar espacios
                          if (questionType === 'fill_blank') {
                            const blanks = response.question.metadata?.blanks || [];
                            const userAnswers = response.textAnswer ? JSON.parse(response.textAnswer) : {};
                            return (
                              <div className="space-y-3 ml-2">
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <p className="text-sm font-semibold text-blue-800 mb-2">Tu respuesta:</p>
                                  <p className="text-sm text-gray-700">
                                    {response.question.text.split('_____').map((part, idx) => (
                                      <span key={idx}>
                                        {part}
                                        {idx < blanks.length && (
                                          <span className="inline-block mx-1 px-3 py-1 bg-white border-2 border-blue-400 rounded font-semibold text-blue-900">
                                            {userAnswers[idx] || '(vacío)'}
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </p>
                                </div>
                                {!response.isCorrect && (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm font-semibold text-green-800 mb-2">Respuestas correctas:</p>
                                    <div className="space-y-2">
                                      {blanks.map((blank: any, idx: number) => {
                                        const userAnswer = userAnswers[idx] || '';
                                        const normalize = (str: string) => str.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                        const isBlankCorrect = normalize(userAnswer) === normalize(blank.correctAnswer);
                                        
                                        return (
                                          <div key={idx} className="flex items-start gap-2">
                                            {isBlankCorrect ? (
                                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                            ) : (
                                              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                              <div className="text-sm">
                                                <span className="text-gray-600">Espacio {idx + 1}:</span>
                                                <span className="ml-2 font-semibold text-green-700">{blank.correctAnswer}</span>
                                              </div>
                                              {!isBlankCorrect && userAnswer && (
                                                <div className="text-xs text-red-600 mt-1">
                                                  Tu respuesta: <span className="font-medium">{userAnswer}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          
                          // Relación de columnas
                          if (questionType === 'matching') {
                            const pairs = response.question.metadata?.pairs || [];
                            const shuffledRightColumn = response.question.metadata?.shuffledRightColumn || pairs.map((p: any) => p.right);
                            const userAnswers = response.textAnswer ? JSON.parse(response.textAnswer) : [];
                            
                            return (
                              <div className="space-y-3 ml-2">
                                {pairs.map((pair: any, idx: number) => {
                                  const userLetter = userAnswers[idx];
                                  
                                  // ✅ Usar shuffledRightColumn para encontrar la letra correcta
                                  const correctLetterIndex = shuffledRightColumn.findIndex((r: string) => r === pair.right);
                                  const correctLetter = String.fromCharCode(65 + correctLetterIndex);
                                  const isCorrect = userLetter === correctLetter;
                                  
                                  // Encontrar qué texto seleccionó el usuario usando shuffledRightColumn
                                  const userSelectedIndex = userLetter ? userLetter.charCodeAt(0) - 65 : -1;
                                  const userSelectedText = userSelectedIndex >= 0 && userSelectedIndex < shuffledRightColumn.length 
                                    ? shuffledRightColumn[userSelectedIndex]
                                    : 'No seleccionada';
                                  
                                  return (
                                    <div key={idx} className={`p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                      <div className="flex items-center gap-2 mb-1">
                                        {isCorrect ? (
                                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                        )}
                                        <span className="text-sm font-medium">{idx + 1}. {pair.left}</span>
                                      </div>
                                      <div className="ml-6 text-sm">
                                        <p className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                                          Tu respuesta: <strong>{userLetter || '(Sin respuesta)'}. {userSelectedText}</strong>
                                        </p>
                                        {!isCorrect && (
                                          <p className="text-green-700 mt-1">
                                            Correcta: <strong>{correctLetter}. {pair.right}</strong>
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }
                          
                          // Ordenar elementos
                          if (questionType === 'ordering') {
                            const items = response.question.metadata?.items || [];
                            const shuffledItems = response.question.metadata?.shuffledItems || items;
                            const userOrder = response.textAnswer ? JSON.parse(response.textAnswer) : [];
                            
                            return (
                              <div className="space-y-3 ml-2">
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <p className="text-sm font-semibold text-blue-800 mb-2">Tu orden:</p>
                                  <ol className="list-decimal list-inside space-y-1">
                                    {userOrder.map((itemIdx: number, position: number) => {
                                      const item = shuffledItems[itemIdx];
                                      const isCorrect = item && item.correctOrder === position + 1;
                                      return (
                                        <li key={position} className={`text-sm flex items-center gap-2 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                          {isCorrect ? (
                                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                          ) : (
                                            <XCircle className="w-4 h-4 flex-shrink-0" />
                                          )}
                                          <span>{item?.text || 'Desconocido'}</span>
                                        </li>
                                      );
                                    })}
                                  </ol>
                                </div>
                                {!response.isCorrect && (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm font-semibold text-green-800 mb-2">Orden correcto:</p>
                                    <ol className="list-decimal list-inside space-y-1">
                                      {items
                                        .sort((a: any, b: any) => a.correctOrder - b.correctOrder)
                                        .map((item: any) => (
                                          <li key={item.correctOrder} className="text-sm text-green-700">
                                            {item.text}
                                          </li>
                                        ))}
                                    </ol>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          
                          return null;
                        })()}

                        {response.question.feedback && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <strong>Explicación:</strong> {response.question.feedback}
                            </p>
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-500">
                          Puntos: {response.pointsEarned || 0} / {response.question.points}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No hay respuestas disponibles</p>
              )}
            </div>
          </div>

          {/* Botón cerrar */}
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
