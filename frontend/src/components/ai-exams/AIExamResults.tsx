import { useState, useEffect } from 'react';
import { aiExamService } from '../../lib/aiExamService';
import type { AIExamAttempt } from '../../lib/aiExamService';
import { useToast, ToastContainer, PageHeader } from '../common';
import { useColors } from '../../hooks/useColors';
import ViewAttemptModal from './ViewAttemptModal';
import {
  BarChart3,
  Users,
  TrendingUp,
  Award,
  Clock,
  Calendar,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  Mail,
  X,
  Send,
} from 'lucide-react';

export default function AIExamResults({ examId }: { examId: string }) {
  const colors = useColors();
  const [attempts, setAttempts] = useState<AIExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    passedCount: 0,
    failedCount: 0,
    averageTime: 0,
  });
  const [viewingAttemptId, setViewingAttemptId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailSentIds, setEmailSentIds] = useState<Set<string>>(new Set());
  const [emailModal, setEmailModal] = useState<{ attempt: AIExamAttempt; email: string } | null>(null);

  const toast = useToast();

  const openEmailModal = (attempt: AIExamAttempt) => {
    setEmailModal({ attempt, email: attempt.studentEmail || '' });
  };

  const confirmSendEmail = async () => {
    if (!emailModal) return;
    const { attempt, email } = emailModal;
    const trimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      toast.error('Error', 'El correo no es válido');
      return;
    }
    if (sendingEmailId) return;
    try {
      setSendingEmailId(attempt.id);
      const res = await aiExamService.sendAttemptResult(attempt.id, trimmed);
      setEmailSentIds((prev) => new Set(prev).add(attempt.id));
      toast.success('Enviado', `Resultados enviados a ${res.email}`);
      setEmailModal(null);
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudieron enviar los resultados');
    } finally {
      setSendingEmailId(null);
    }
  };

  useEffect(() => {
    loadResults();
  }, [examId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await aiExamService.getResults(examId);
      setAttempts(data);
      calculateStats(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar resultados');
      toast.error('Error', 'No se pudieron cargar los resultados');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: AIExamAttempt[]) => {
    const completed = data.filter((a) => a.completedAt);
    const totalAttempts = completed.length;
    
    if (totalAttempts === 0) {
      setStats({
        totalAttempts: 0,
        averageScore: 0,
        passedCount: 0,
        failedCount: 0,
        averageTime: 0,
      });
      return;
    }

    const totalScore = completed.reduce((sum, a) => sum + (a.score || 0), 0);
    const averageScore = totalScore / totalAttempts;
    
    const passedCount = completed.filter((a) => a.passed).length;
    const failedCount = totalAttempts - passedCount;
    
    const totalTime = completed.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
    const averageTime = totalTime / totalAttempts;

    setStats({
      totalAttempts,
      averageScore,
      passedCount,
      failedCount,
      averageTime,
    });
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

  const handleExport = () => {
    toast.info('Exportar', 'Función de exportación próximamente disponible');
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
      <div className="rounded-lg bg-red-50 p-4 flex items-start">
        <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={BarChart3}
        title="Resultados del Examen"
        description="Análisis de intentos y estadísticas"
        primaryColor={colors.primaryColor}
      />

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          <Download className="w-5 h-5" />
          Exportar
        </button>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Total Intentos</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalAttempts}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-gray-600">Promedio</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.averageScore.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Aprobados</p>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.passedCount}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.totalAttempts > 0
              ? Math.round((stats.passedCount / stats.totalAttempts) * 100)
              : 0}%
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-gray-600">Reprobados</p>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.failedCount}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.totalAttempts > 0
              ? Math.round((stats.failedCount / stats.totalAttempts) * 100)
              : 0}%
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <p className="text-sm text-gray-600">Tiempo Promedio</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatTime(stats.averageTime)}
          </p>
        </div>
      </div>

      {/* Tabla de Intentos */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Lista de Intentos</h2>
        </div>

        {attempts.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay intentos registrados
            </h3>
            <p className="text-gray-600">
              Los intentos de los estudiantes aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estudiante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Calificación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Correctas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tiempo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {attempt.studentName || 'Anónimo'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {attempt.studentEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        #{attempt.attemptNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-lg font-bold ${getScoreColor(attempt.score)}`}>
                        {attempt.score?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {attempt.totalCorrect}/{attempt.totalQuestions}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {formatTime(attempt.timeSpent)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(attempt.completedAt || attempt.startedAt).toLocaleDateString('es-MX')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {attempt.passed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Aprobado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          Reprobado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setViewingAttemptId(attempt.id)}
                          className="text-purple-600 hover:text-purple-900 flex items-center gap-1 transition"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </button>
                        {attempt.completedAt && attempt.studentEmail && (
                          <button
                            onClick={() => openEmailModal(attempt)}
                            disabled={sendingEmailId === attempt.id}
                            title={emailSentIds.has(attempt.id) ? 'Reenviar resultados' : `Enviar resultados a ${attempt.studentEmail}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed ${
                              emailSentIds.has(attempt.id)
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                          >
                            {sendingEmailId === attempt.id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : emailSentIds.has(attempt.id) ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                            {sendingEmailId === attempt.id ? 'Enviando' : emailSentIds.has(attempt.id) ? 'Enviado' : 'Enviar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      
      {/* Modal para ver detalles del intento */}
      {viewingAttemptId && (
        <ViewAttemptModal
          isOpen={!!viewingAttemptId}
          attemptId={viewingAttemptId}
          onClose={() => setViewingAttemptId(null)}
        />
      )}

      {/* Modal de confirmación de envío de resultados */}
      {emailModal && (
        <div
          className="fixed inset-0 z-50 bg-gray-800/60 flex items-center justify-center p-4"
          onClick={() => {
            if (!sendingEmailId) setEmailModal(null);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: colors.primaryColor + '20' }}
                >
                  <Mail className="w-5 h-5" style={{ color: colors.primaryColor }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Enviar resultados por correo</h3>
              </div>
              <button
                onClick={() => setEmailModal(null)}
                disabled={!!sendingEmailId}
                className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-50"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Estudiante:</span>
                  <span className="text-gray-900 font-medium text-right truncate">
                    {emailModal.attempt.studentName || 'Anónimo'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 mt-1">
                  <span className="text-gray-500">Intento:</span>
                  <span className="text-gray-900">#{emailModal.attempt.attemptNumber}</span>
                </div>
                {emailModal.attempt.score !== undefined && (
                  <div className="flex justify-between gap-2 mt-1">
                    <span className="text-gray-500">Calificación:</span>
                    <span className="text-gray-900 font-medium">
                      {(emailModal.attempt.score ?? 0).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo destino *
                </label>
                <input
                  type="email"
                  value={emailModal.email}
                  onChange={(e) =>
                    setEmailModal((prev) => (prev ? { ...prev, email: e.target.value } : prev))
                  }
                  disabled={!!sendingEmailId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-50"
                  placeholder="correo@ejemplo.com"
                  autoFocus
                />
                {emailModal.attempt.studentEmail &&
                  emailModal.email.trim().toLowerCase() !==
                    emailModal.attempt.studentEmail.trim().toLowerCase() && (
                    <p className="mt-1 text-xs text-amber-600">
                      Vas a enviar a un correo distinto al registrado (
                      {emailModal.attempt.studentEmail}).
                    </p>
                  )}
                <p className="mt-1 text-xs text-gray-500">
                  Puedes editar el correo antes de enviar. El correo modificado no se guarda en el intento.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setEmailModal(null)}
                disabled={!!sendingEmailId}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSendEmail}
                disabled={!!sendingEmailId || !emailModal.email.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.primaryColor }}
              >
                {sendingEmailId ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar resultados
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
