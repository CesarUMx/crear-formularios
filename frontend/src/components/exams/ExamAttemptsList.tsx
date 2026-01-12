import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import type { ExamAttempt } from '../../lib/types';
import { Calendar, User, Award, Clock, CheckCircle, XCircle } from 'lucide-react';

interface ExamAttemptsListProps {
  examId: string;
}

export default function ExamAttemptsList({ examId }: ExamAttemptsListProps) {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAttempts();
  }, [examId]);

  const loadAttempts = async () => {
    try {
      setLoading(true);
      const data = await examService.getExamAttempts(examId);
      setAttempts(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar intentos');
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

  if (attempts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No hay intentos registrados aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {attempts.map((attempt) => (
        <div
          key={attempt.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold">{attempt.studentName}</h3>
                {attempt.studentEmail && (
                  <span className="text-sm text-gray-600">({attempt.studentEmail})</span>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(attempt.startedAt).toLocaleString()}</span>
                </div>
                
                {attempt.timeSpent && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{Math.floor(attempt.timeSpent / 60)} min</span>
                  </div>
                )}

                {attempt.score !== undefined && (
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    <span className="font-semibold">
                      {attempt.score}/{attempt.maxScore} ({attempt.percentage?.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>

              {attempt.passed !== undefined && (
                <div className="flex items-center gap-2">
                  {attempt.passed ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Aprobado
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      No Aprobado
                    </span>
                  )}
                </div>
              )}
            </div>

            <a
              href={`/admin/exams/${examId}/attempts/${attempt.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Ver Detalles
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
