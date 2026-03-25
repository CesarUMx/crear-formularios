import { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  User, 
  Calendar, 
  FileText, 
  Save, 
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Award
} from 'lucide-react';

interface Question {
  id: string;
  text: string;
  points: number;
  metadata?: {
    questionType?: string;
    expectedAnswer?: string;
    keywords?: string[];
    rubric?: string;
  };
}

interface Response {
  id: string;
  textAnswer: string;
  requiresManualGrading: boolean;
  isGraded: boolean;
  manualScore: number | null;
  feedback: string | null;
  question: Question;
}

interface Attempt {
  id: string;
  attemptNumber: number;
  completedAt: string;
  timeSpent: number;
  student: {
    id: string;
    name: string;
    email: string;
  };
  aiExam: {
    id: string;
    title: string;
    description: string;
  };
  responses: Response[];
}

interface ManualGradingViewProps {
  attemptId: string;
  onComplete?: () => void;
}

export default function ManualGradingView({ attemptId, onComplete }: ManualGradingViewProps) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentResponseIndex, setCurrentResponseIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAttempt();
  }, [attemptId]);

  const fetchAttempt = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/grading/attempt/${attemptId}`);
      const data = await response.json();
      setAttempt(data);
      
      // Inicializar scores y feedbacks con valores existentes
      const initialScores: Record<string, number> = {};
      const initialFeedbacks: Record<string, string> = {};
      
      data.responses.forEach((r: Response) => {
        if (r.requiresManualGrading) {
          initialScores[r.id] = r.manualScore || 0;
          initialFeedbacks[r.id] = r.feedback || '';
        }
      });
      
      setScores(initialScores);
      setFeedbacks(initialFeedbacks);
    } catch (error) {
      console.error('Error al cargar intento:', error);
    } finally {
      setLoading(false);
    }
  };

  const manualResponses = attempt?.responses.filter(r => r.requiresManualGrading) || [];
  const currentResponse = manualResponses[currentResponseIndex];

  const handleScoreChange = (responseId: string, value: number) => {
    setScores(prev => ({ ...prev, [responseId]: value }));
  };

  const handleFeedbackChange = (responseId: string, value: string) => {
    setFeedbacks(prev => ({ ...prev, [responseId]: value }));
  };

  const handleSaveResponse = async (responseId: string) => {
    setSaving(true);
    try {
      await fetch(`http://localhost:3000/api/grading/response/${responseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manualScore: scores[responseId],
          feedback: feedbacks[responseId],
          gradedBy: 'docente-id', // Placeholder
        }),
      });
      
      // Actualizar estado local
      if (attempt) {
        const updatedResponses = attempt.responses.map(r =>
          r.id === responseId
            ? { ...r, isGraded: true, manualScore: scores[responseId], feedback: feedbacks[responseId] }
            : r
        );
        setAttempt({ ...attempt, responses: updatedResponses });
      }
      
      // Avanzar a la siguiente pregunta si hay más
      if (currentResponseIndex < manualResponses.length - 1) {
        setCurrentResponseIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error al guardar calificación:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteGrading = async () => {
    setSaving(true);
    try {
      await fetch(`http://localhost:3000/api/grading/attempt/${attemptId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradedBy: 'docente-id', // Placeholder
        }),
      });
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error al completar calificación:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const allGraded = manualResponses.every(r => r.isGraded || scores[r.id] !== undefined);
  const gradedCount = manualResponses.filter(r => r.isGraded).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Intento no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Calificación Manual
              </h1>
              <p className="text-gray-600">{attempt.aiExam.title}</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg">
                <ClipboardCheck className="w-5 h-5" />
                <span className="font-semibold">
                  {gradedCount}/{manualResponses.length} calificadas
                </span>
              </div>
            </div>
          </div>

          {/* Información del estudiante */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Estudiante</p>
                <p className="font-medium text-gray-900">{attempt.student.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Fecha de entrega</p>
                <p className="font-medium text-gray-900">{formatDate(attempt.completedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Tiempo empleado</p>
                <p className="font-medium text-gray-900">{formatTime(attempt.timeSpent)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación de preguntas */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              Pregunta {currentResponseIndex + 1} de {manualResponses.length}
            </h3>
            <div className="flex gap-2">
              {manualResponses.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentResponseIndex(index)}
                  className={`w-8 h-8 rounded-full font-medium transition ${
                    index === currentResponseIndex
                      ? 'bg-indigo-600 text-white'
                      : manualResponses[index].isGraded
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pregunta actual */}
        {currentResponse && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            {/* Pregunta */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex-1">
                  {currentResponse.question.text}
                </h3>
                <div className="ml-4 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-sm font-medium">
                  {currentResponse.question.points} pts
                </div>
              </div>

              {/* Información adicional de la pregunta */}
              {currentResponse.question.metadata?.expectedAnswer && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Respuesta esperada:</p>
                  <p className="text-sm text-blue-800">{currentResponse.question.metadata.expectedAnswer}</p>
                </div>
              )}

              {currentResponse.question.metadata?.keywords && (
                <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-semibold text-purple-900 mb-2">Palabras clave:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentResponse.question.metadata.keywords.map((keyword, idx) => (
                      <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {currentResponse.question.metadata?.rubric && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-900 mb-1">Rúbrica:</p>
                  <p className="text-sm text-green-800 whitespace-pre-line">
                    {currentResponse.question.metadata.rubric}
                  </p>
                </div>
              )}
            </div>

            {/* Respuesta del estudiante */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Respuesta del estudiante:
              </label>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-800 whitespace-pre-line">
                  {currentResponse.textAnswer || 'Sin respuesta'}
                </p>
              </div>
            </div>

            {/* Calificación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Puntuación (máx: {currentResponse.question.points})
                </label>
                <input
                  type="number"
                  min="0"
                  max={currentResponse.question.points}
                  step="0.5"
                  value={scores[currentResponse.id] || 0}
                  onChange={(e) => handleScoreChange(currentResponse.id, parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={currentResponse.isGraded}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Estado
                </label>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  currentResponse.isGraded
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {currentResponse.isGraded ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Calificada</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Pendiente</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Retroalimentación */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Retroalimentación para el estudiante
              </label>
              <textarea
                value={feedbacks[currentResponse.id] || ''}
                onChange={(e) => handleFeedbackChange(currentResponse.id, e.target.value)}
                rows={4}
                placeholder="Escribe comentarios o sugerencias para el estudiante..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                disabled={currentResponse.isGraded}
              />
            </div>

            {/* Botones de acción */}
            <div className="flex gap-4">
              {!currentResponse.isGraded && (
                <button
                  onClick={() => handleSaveResponse(currentResponse.id)}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Guardando...' : 'Guardar calificación'}
                </button>
              )}
              
              {currentResponseIndex < manualResponses.length - 1 && (
                <button
                  onClick={() => setCurrentResponseIndex(prev => prev + 1)}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Siguiente pregunta →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Completar calificación */}
        {allGraded && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Award className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">
                    Todas las preguntas han sido calificadas
                  </h3>
                  <p className="text-sm text-green-800">
                    Puedes completar la calificación para que el estudiante vea sus resultados.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCompleteGrading}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex-shrink-0"
              >
                <CheckCircle className="w-5 h-5" />
                {saving ? 'Completando...' : 'Completar calificación'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
