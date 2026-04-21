import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import type { ExamAttempt } from '../../lib/types';
import { useColors } from '../../hooks/useColors';
import { PageHeader, Table, StatsCard, EmptyState, useToast, ToastContainer } from '../common';
import ExamAttemptDetailsModal from './ExamAttemptDetailsModal';
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
        if (isPending && row.completedAt) {
          return (
            <a
              href={`/admin/exams/${examId}/attempts/${row.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm"
            >
              <Edit className="w-4 h-4" />
              Calificar
            </a>
          );
        }
        return (
          <button
            onClick={() => setViewingAttemptId(row.id)}
            className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-900 transition text-sm font-medium"
            style={{ color: colors.primaryColor }}
          >
            <Eye className="w-4 h-4" />
            Ver
          </button>
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
      <div className="flex justify-end">
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

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
