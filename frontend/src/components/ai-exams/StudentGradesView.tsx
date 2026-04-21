import { useState, useEffect } from 'react';
import { Award, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { API_URL } from '../../lib/config';

interface Attempt {
  id: string;
  attemptNumber: number;
  score: number | null;
  totalCorrect: number;
  totalQuestions: number;
  timeSpent: number;
  passed: boolean | null;
  requiresManualGrading: boolean;
  isGraded: boolean;
  completedAt: string;
  aiExam: {
    id: string;
    title: string;
    description: string;
    passingScore: number;
  };
}

interface StudentGradesViewProps {
  studentId: string;
}

export default function StudentGradesView({ studentId }: StudentGradesViewProps) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'graded' | 'pending'>('all');

  useEffect(() => {
    fetchGrades();
  }, [studentId]);

  const fetchGrades = async () => {
    try {
      const response = await fetch(`${API_URL}/grading/student/${studentId}/grades`);
      const data = await response.json();
      setAttempts(data);
    } catch (error) {
      console.error('Error al cargar calificaciones:', error);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const filteredAttempts = attempts.filter(attempt => {
    if (filter === 'graded') return attempt.isGraded;
    if (filter === 'pending') return !attempt.isGraded;
    return true;
  });

  const stats = {
    total: attempts.length,
    graded: attempts.filter(a => a.isGraded).length,
    pending: attempts.filter(a => !a.isGraded).length,
    passed: attempts.filter(a => a.passed === true).length,
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Calificaciones</h1>
          <p className="text-gray-600">Revisa tus resultados y calificaciones de exámenes</p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Exámenes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Award className="w-10 h-10 text-indigo-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Calificados</p>
                <p className="text-2xl font-bold text-green-600">{stats.graded}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">En Revisión</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Aprobados</p>
                <p className="text-2xl font-bold text-blue-600">{stats.passed}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setFilter('graded')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'graded'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Calificados ({stats.graded})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'pending'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              En Revisión ({stats.pending})
            </button>
          </div>
        </div>

        {/* Lista de exámenes */}
        <div className="space-y-4">
          {filteredAttempts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay exámenes para mostrar</p>
            </div>
          ) : (
            filteredAttempts.map((attempt) => (
              <div key={attempt.id} className="bg-white rounded-lg shadow hover:shadow-md transition">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {attempt.aiExam.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {attempt.aiExam.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(attempt.completedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(attempt.timeSpent)}
                        </span>
                      </div>
                    </div>

                    {/* Estado y calificación */}
                    <div className="text-right">
                      {attempt.isGraded ? (
                        <div>
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-2 ${
                            attempt.passed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {attempt.passed ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <XCircle className="w-5 h-5" />
                            )}
                            <span className="font-semibold">
                              {attempt.passed ? 'Aprobado' : 'No aprobado'}
                            </span>
                          </div>
                          <p className="text-3xl font-bold text-gray-900">
                            {attempt.score?.toFixed(1)}%
                          </p>
                          <p className="text-sm text-gray-600">
                            {attempt.totalCorrect}/{attempt.totalQuestions} correctas
                          </p>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
                          <AlertCircle className="w-5 h-5" />
                          <span className="font-semibold">En revisión</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  {attempt.isGraded && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progreso</span>
                        <span>{attempt.score?.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            attempt.passed ? 'bg-green-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${attempt.score}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
