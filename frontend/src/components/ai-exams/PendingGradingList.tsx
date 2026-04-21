import { useState, useEffect } from 'react';
import { ClipboardCheck, User, Calendar, FileText, ArrowRight, AlertCircle } from 'lucide-react';
import { API_URL } from '../../lib/config';

interface PendingAttempt {
  id: string;
  attemptNumber: number;
  completedAt: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  aiExam: {
    id: string;
    title: string;
  };
  responses: Array<{
    id: string;
    requiresManualGrading: boolean;
    isGraded: boolean;
  }>;
}

export default function PendingGradingList() {
  const [attempts, setAttempts] = useState<PendingAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingAttempts();
  }, []);

  const fetchPendingAttempts = async () => {
    try {
      const response = await fetch(`${API_URL}/grading/pending`);
      const data = await response.json();
      setAttempts(data);
    } catch (error) {
      console.error('Error al cargar intentos pendientes:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Exámenes Pendientes de Calificación
          </h1>
          <p className="text-gray-600">
            Revisa y califica las respuestas abiertas de los estudiantes
          </p>
        </div>

        {/* Estadísticas */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{attempts.length}</p>
              <p className="text-gray-600">Exámenes pendientes de calificar</p>
            </div>
          </div>
        </div>

        {/* Lista de intentos */}
        <div className="space-y-4">
          {attempts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <ClipboardCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-2">No hay exámenes pendientes</p>
              <p className="text-gray-500 text-sm">
                Todos los exámenes han sido calificados
              </p>
            </div>
          ) : (
            attempts.map((attempt) => {
              const pendingCount = attempt.responses.filter(
                r => r.requiresManualGrading && !r.isGraded
              ).length;

              return (
                <div
                  key={attempt.id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {attempt.aiExam.title}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span>{attempt.student.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(attempt.completedAt)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FileText className="w-4 h-4" />
                            <span>{pendingCount} preguntas pendientes</span>
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
                          <AlertCircle className="w-4 h-4" />
                          Requiere calificación manual
                        </div>
                      </div>

                      <a
                        href={`/admin/grading/${attempt.id}`}
                        className="ml-4 flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex-shrink-0"
                      >
                        Calificar
                        <ArrowRight className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
