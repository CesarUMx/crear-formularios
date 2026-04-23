import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import type { ExamAttempt } from '../../lib/types';
import { useColors } from '../../hooks/useColors';
import { PageHeader, Table, StatsCard, EmptyState, useToast, ToastContainer } from '../common';
import ExamAttemptDetailsModal from './ExamAttemptDetailsModal';
import SecurityMonitorPanel from './SecurityMonitorPanel';
import {
  BarChart3,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Download,
  Eye,
  Edit,
  AlertCircle,
  AlertTriangle,
  Mail,
  Loader,
  X,
  Send,
  Shield,
} from 'lucide-react';

interface ExamAttemptsListProps {
  examId: string;
}

function formatTime(seconds?: number) {
  if (!seconds) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getScoreColor(percentage?: number) {
  if (percentage === undefined || percentage === null) return 'text-gray-600';
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 70) return 'text-blue-600';
  if (percentage >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

export default function ExamAttemptsList({ examId }: ExamAttemptsListProps) {
  const colors = useColors();
  const toast = useToast();
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingAttemptId, setViewingAttemptId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailSentIds, setEmailSentIds] = useState<Set<string>>(new Set());
  const [emailModal, setEmailModal] = useState<{ attempt: ExamAttempt; email: string } | null>(null);
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);

  const openEmailModal = (attempt: ExamAttempt) => {
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
      const res = await examService.sendAttemptResult(attempt.id, trimmed);
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

  // Estadísticas
  const completed = attempts.filter((a) => a.completedAt);
  const total = completed.length;
  const avgScore = total > 0
    ? completed.reduce((sum, a) => sum + (a.percentage ?? (a.score && a.maxScore ? (a.score / a.maxScore) * 100 : 0)), 0) / total
    : 0;
  const passed = completed.filter((a) => a.passed === true).length;
  const failed = completed.filter((a) => a.passed === false).length;
  const pending = completed.filter((a) => a.requiresManualGrading || a.passed === null || a.passed === undefined).length;
  const avgTime = total > 0
    ? completed.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / total
    : 0;

  const handleExport = () => {
    // Generar CSV
    const headers = ['Estudiante', 'Email', 'Intento', 'Calificación %', 'Puntos', 'Tiempo', 'Fecha', 'Estado'];
    const rows = attempts.map((a) => {
      const pct = a.percentage ?? (a.score && a.maxScore ? (a.score / a.maxScore) * 100 : 0);
      const estado = a.requiresManualGrading || a.passed === null || a.passed === undefined
        ? 'Pendiente'
        : a.passed
        ? 'Aprobado'
        : 'Reprobado';
      return [
        a.studentName || 'Anónimo',
        a.studentEmail || '',
        `#${a.attemptNumber}`,
        pct.toFixed(1),
        `${a.score ?? 0}/${a.maxScore}`,
        formatTime(a.timeSpent),
        formatDateTime(a.startedAt),
        estado,
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `intentos-examen-${examId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exportado', 'Archivo CSV descargado correctamente');
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
      <div className="rounded-lg bg-red-50 p-4 flex items-start">
        <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const columns = [
    {
      header: 'Estudiante',
      render: (row: ExamAttempt) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.studentName || 'Anónimo'}</div>
          <div className="text-sm text-gray-500">{row.studentEmail || '-'}</div>
        </div>
      ),
    },
    {
      header: 'Intento',
      render: (row: ExamAttempt) => <span className="text-sm text-gray-900">#{row.attemptNumber}</span>,
    },
    {
      header: 'Calificación',
      render: (row: ExamAttempt) => {
        const pct = row.percentage ?? (row.score && row.maxScore ? (row.score / row.maxScore) * 100 : 0);
        return (
          <span className={`text-lg font-bold ${getScoreColor(pct)}`}>{pct.toFixed(1)}%</span>
        );
      },
    },
    {
      header: 'Puntos',
      render: (row: ExamAttempt) => (
        <span className="text-sm text-gray-900">
          {row.score ?? 0}/{row.maxScore}
        </span>
      ),
    },
    {
      header: 'Tiempo',
      render: (row: ExamAttempt) => <span className="text-sm text-gray-900">{formatTime(row.timeSpent)}</span>,
    },
    {
      header: 'Fecha',
      render: (row: ExamAttempt) => (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          {formatDateTime(row.startedAt)}
        </div>
      ),
    },
    {
      header: 'Estado',
      render: (row: ExamAttempt) => {
        const isPending = row.requiresManualGrading || row.passed === null || row.passed === undefined;
        if (!row.completedAt) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Clock className="w-3 h-3 mr-1" />
              En progreso
            </span>
          );
        }
        if (isPending) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Pendiente
            </span>
          );
        }
        if (row.passed) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Aprobado
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Reprobado
          </span>
        );
      },
    },
    {
      header: 'Acciones',
      align: 'right' as const,
      render: (row: ExamAttempt) => {
        const isPending = row.requiresManualGrading || row.passed === null || row.passed === undefined;
        const isCompleted = !!row.completedAt;
        const sending = sendingEmailId === row.id;
        const sent = emailSentIds.has(row.id);
        const canEmail = isCompleted && !!row.studentEmail;

        return (
          <div className="flex items-center justify-end gap-2">
            {isPending && isCompleted ? (
              <a
                href={`/admin/exams/${examId}/attempts/${row.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm"
              >
                <Edit className="w-4 h-4" />
                Calificar
              </a>
            ) : isCompleted ? (
              <button
                onClick={() => setViewingAttemptId(row.id)}
                className="inline-flex items-center gap-1 transition text-sm font-medium hover:opacity-80"
                style={{ color: colors.primaryColor }}
              >
                <Eye className="w-4 h-4" />
                Ver
              </button>
            ) : null}

            {canEmail && (
              <button
                onClick={() => openEmailModal(row)}
                disabled={sending}
                title={sent ? 'Reenviar resultados' : `Enviar resultados a ${row.studentEmail}`}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed ${
                  sent
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                {sending ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : sent ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {sending ? 'Enviando' : sent ? 'Enviado' : 'Enviar resultados'}
              </button>
            )}
          </div>
        );
      },
    },
  ];

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
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setShowSecurityPanel(!showSecurityPanel)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          <Shield className="w-5 h-5" />
          Monitor de Seguridad
        </button>
        <button
          onClick={handleExport}
          disabled={attempts.length === 0}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          Exportar
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard icon={Users} iconColor="text-blue-600" label="Total Intentos" value={total} />
        <StatsCard
          icon={TrendingUp}
          iconColor="text-purple-600"
          label="Promedio"
          value={`${avgScore.toFixed(1)}%`}
        />
        <StatsCard
          icon={CheckCircle}
          iconColor="text-green-600"
          label="Aprobados"
          value={passed}
          valueColor="text-green-600"
          subtitle={total > 0 ? `${Math.round((passed / total) * 100)}%` : '0%'}
        />
        <StatsCard
          icon={XCircle}
          iconColor="text-red-600"
          label="Reprobados"
          value={failed}
          valueColor="text-red-600"
          subtitle={total > 0 ? `${Math.round((failed / total) * 100)}%` : '0%'}
        />
        <StatsCard
          icon={AlertTriangle}
          iconColor="text-amber-600"
          label="Pendientes"
          value={pending}
          valueColor="text-amber-600"
          subtitle={total > 0 ? `${Math.round((pending / total) * 100)}%` : '0%'}
        />
        <StatsCard
          icon={Clock}
          iconColor="text-orange-600"
          label="Tiempo Promedio"
          value={formatTime(avgTime)}
          valueSize="md"
        />
      </div>

      {/* Tabla o EmptyState */}
      {attempts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay intentos registrados"
          description="Los intentos de los estudiantes aparecerán aquí"
        />
      ) : (
        <div>
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Intentos</h2>
          </div>
          <Table columns={columns} data={attempts} />
        </div>
      )}

      {/* Modal de detalles */}
      {viewingAttemptId && (
        <ExamAttemptDetailsModal
          isOpen={!!viewingAttemptId}
          examId={examId}
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
                {emailModal.attempt.percentage !== undefined && (
                  <div className="flex justify-between gap-2 mt-1">
                    <span className="text-gray-500">Calificación:</span>
                    <span className="text-gray-900 font-medium">
                      {(emailModal.attempt.percentage ?? 0).toFixed(1)}%
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

      {/* Security Monitor Panel */}
      {showSecurityPanel && (
        <div className="fixed top-4 right-4 w-full max-w-md z-50">
          <SecurityMonitorPanel 
            examId={examId} 
            onClose={() => setShowSecurityPanel(false)}
          />
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
