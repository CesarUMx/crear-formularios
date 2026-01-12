import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import type { ExamStats } from '../../lib/types';
import { Users, Award, TrendingUp, TrendingDown, BarChart3, Clock } from 'lucide-react';

interface ExamStatisticsProps {
  examId: string;
}

export default function ExamStatistics({ examId }: ExamStatisticsProps) {
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, [examId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await examService.getExamStats(examId);
      setStats(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!stats || stats.totalAttempts === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No hay datos suficientes para mostrar estadísticas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Intentos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Promedio</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageScore.toFixed(1)}%</p>
            </div>
            <Award className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tasa de Aprobación</p>
              <p className="text-2xl font-bold text-gray-900">{stats.passRate.toFixed(1)}%</p>
            </div>
            {stats.passRate >= 70 ? (
              <TrendingUp className="w-8 h-8 text-green-600" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-600" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tiempo Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.floor(stats.averageTimeSpent / 60)} min
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Score Range */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Rango de Puntuaciones</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Puntuación Más Baja</p>
            <p className="text-xl font-bold text-red-600">{stats.lowestScore.toFixed(1)}%</p>
          </div>
          <div className="flex-1 mx-8">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Puntuación Más Alta</p>
            <p className="text-xl font-bold text-green-600">{stats.highestScore.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Question Statistics */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Estadísticas por Pregunta</h3>
        <div className="space-y-4">
          {stats.questionStats.map((qStat, index) => (
            <div key={qStat.questionId} className="border-b border-gray-200 pb-4 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {index + 1}. {qStat.questionText}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm text-gray-600">Tasa de Acierto</p>
                  <p className={`text-lg font-bold ${
                    qStat.correctRate >= 70 ? 'text-green-600' :
                    qStat.correctRate >= 50 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {qStat.correctRate.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{qStat.correctAnswers}/{qStat.totalAnswers} correctas</span>
                <span>•</span>
                <span>Promedio: {qStat.averagePoints.toFixed(1)} pts</span>
              </div>
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      qStat.correctRate >= 70 ? 'bg-green-500' :
                      qStat.correctRate >= 50 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${qStat.correctRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
