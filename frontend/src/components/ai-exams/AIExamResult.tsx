import { useState, useEffect } from 'react';
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
    isCorrect?: boolean;
    pointsEarned?: number;
    question: {
      id: string;
      text: string;
      feedback?: string;
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
      const response = await fetch(`http://localhost:3000/api/ai-exams/attempts/${attemptId}/result`);
      
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
              result.responses.map((response, index) => (
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
              ))
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
