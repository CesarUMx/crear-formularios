import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import type { ExamAttemptResult } from '../../lib/types';
import { 
  CheckCircle, 
  XCircle, 
  Award,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';

interface ExamResultsProps {
  attemptId: string;
}

export default function ExamResults({ attemptId }: ExamResultsProps) {
  const [result, setResult] = useState<ExamAttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAnswers, setShowAnswers] = useState(false);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);

  useEffect(() => {
    loadResult();
  }, [attemptId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      console.log('Loading result for attemptId:', attemptId);
      const data = await examService.getAttemptResult(attemptId);
      console.log('Result data received:', data);
      setResult(data);
      setError('');
    } catch (err) {
      console.error('Error loading result:', err);
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

  if (error || !result) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-800 text-lg">Error</h3>
          <p className="text-red-700 mt-1">{error || 'No se pudieron cargar los resultados'}</p>
        </div>
      </div>
    );
  }

  const passed = result.passed;
  const showCorrectAnswers = result.exam.showResults !== 'NEVER' && result.exam.allowReview;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header Card */}
        <div className={`rounded-lg shadow-lg p-8 mb-6 ${
          passed ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'
        }`}>
          <div className="text-center text-white">
            {passed ? (
              <CheckCircle className="w-20 h-20 mx-auto mb-4" />
            ) : (
              <XCircle className="w-20 h-20 mx-auto mb-4" />
            )}
            
            <h1 className="text-3xl font-bold mb-2">
              {passed ? '¡Felicidades! Has aprobado' : 'Examen no aprobado'}
            </h1>
            <p className="text-xl opacity-90">{result.exam.title}</p>
          </div>

          {/* Score */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <Award className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm opacity-90">Puntuación</p>
              <p className="text-2xl font-bold">{result.score} / {result.maxScore}</p>
            </div>

            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <div className="text-4xl font-bold mb-2">{result.percentage.toFixed(1)}%</div>
              <p className="text-sm opacity-90">Porcentaje obtenido</p>
              <p className="text-xs mt-1">Mínimo requerido: {result.exam.passingScore}%</p>
            </div>

            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm opacity-90">Tiempo empleado</p>
              <p className="text-2xl font-bold">
                {result.timeSpent ? `${Math.floor(result.timeSpent / 60)} min` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Fecha de realización</p>
                <p className="font-medium">{new Date(result.completedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Estado</p>
                <p className="font-medium">{result.autoGraded ? 'Calificado automáticamente' : 'Calificado manualmente'}</p>
              </div>
            </div>
          </div>

          {result.feedback && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">Comentarios del instructor:</p>
              <p className="text-blue-800">{result.feedback}</p>
            </div>
          )}
        </div>

        {/* Toggle Answers Button */}
        {showCorrectAnswers && (
          <div className="mb-6">
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className="w-full py-3 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 font-medium"
            >
              {showAnswers ? (
                <>
                  <EyeOff className="w-5 h-5" />
                  Ocultar respuestas
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  Ver respuestas y retroalimentación
                </>
              )}
            </button>
          </div>
        )}

        {/* Answers Detail */}
        {showAnswers && showCorrectAnswers && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Detalle de Respuestas</h2>
            
            {result.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection(sectionIndex)}
                  className="w-full p-4 bg-gray-50 border-b flex items-center justify-between hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3">
                    {expandedSections.includes(sectionIndex) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                    <h3 className="font-semibold text-lg">{section.title}</h3>
                  </div>
                  <span className="text-sm text-gray-600">
                    {section.questions.length} {section.questions.length === 1 ? 'pregunta' : 'preguntas'}
                  </span>
                </button>

                {expandedSections.includes(sectionIndex) && (
                  <div className="p-6 space-y-6">
                    {section.questions.map((question, questionIndex) => {
                      const answer = result.answers.find(a => a.questionId === question.id);
                      const isCorrect = answer?.isCorrect;
                      
                      return (
                        <div key={questionIndex} className="border-b border-gray-200 pb-6 last:border-0">
                          <div className="flex items-start gap-3 mb-3">
                            <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-semibold text-sm">
                              {questionIndex + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{question.text}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm text-gray-600">
                                  {answer?.pointsEarned || 0} / {question.points} puntos
                                </span>
                                {isCorrect !== undefined && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {isCorrect ? 'Correcta' : 'Incorrecta'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Student Answer */}
                          <div className="ml-11 space-y-3">
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-sm font-medium text-gray-700 mb-2">Tu respuesta:</p>
                              {answer?.textValue && (
                                <p className="text-gray-900">{answer.textValue}</p>
                              )}
                              {answer?.selectedOptions && answer.selectedOptions.length > 0 && (
                                <ul className="space-y-1">
                                  {answer.selectedOptions.map((opt, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                      <span className="text-gray-900">{opt.text}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {!answer?.textValue && (!answer?.selectedOptions || answer.selectedOptions.length === 0) && (
                                <p className="text-gray-500 italic">Sin respuesta</p>
                              )}
                            </div>

                            {/* Correct Answer */}
                            {question.correctAnswer && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-green-800 mb-2">Respuesta correcta:</p>
                                <p className="text-green-900">{question.correctAnswer}</p>
                              </div>
                            )}

                            {/* Feedback */}
                            {(question.feedback || answer?.feedback) && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-blue-800 mb-2">Retroalimentación:</p>
                                <p className="text-blue-900">{answer?.feedback || question.feedback}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => window.print()}
            className="flex-1 py-3 px-6 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 font-medium"
          >
            <Download className="w-5 h-5" />
            Descargar PDF
          </button>
          
          <a
            href={`/e/${result.exam.slug}`}
            className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
