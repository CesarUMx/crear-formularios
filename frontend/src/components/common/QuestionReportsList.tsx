import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import { useToast, ToastContainer, PageHeader, EmptyState, Table } from './';
import { useColors } from '../../hooks/useColors';
import { MessageSquare, CheckCircle, XCircle, Clock, Eye, ArrowLeft } from 'lucide-react';

interface QuestionReport {
  id: string;
  examId: string;
  attemptId: string;
  questionId: string;
  questionText: string;
  userAnswer?: string;
  correctAnswer?: string;
  reason: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  reviewNotes?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
  attempt?: {
    studentName: string;
    studentEmail?: string;
  };
}

interface QuestionReportsListProps {
  examId: string;
  examType: 'normal' | 'ai';
}

export default function QuestionReportsList({ examId, examType }: QuestionReportsListProps) {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<QuestionReport | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState<string>('REVIEWED');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const colors = useColors();

  useEffect(() => {
    loadReports();
  }, [examId, statusFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const filter = statusFilter === 'all' ? undefined : statusFilter;
      const data = await examService.getQuestionReports(examId, filter);
      setReports(data);
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (reportId: string) => {
    try {
      setSubmitting(true);
      await examService.reviewQuestionReport(reportId, {
        status: reviewStatus,
        reviewNotes: reviewNotes.trim() || undefined,
      });
      toast.success('Reporte revisado', 'El reporte fue actualizado correctamente');
      setSelectedReport(null);
      setReviewNotes('');
      await loadReports();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al revisar reporte');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendiente' },
      REVIEWED: { color: 'bg-blue-100 text-blue-800', icon: Eye, label: 'Revisado' },
      RESOLVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Resuelto' },
      DISMISSED: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Descartado' },
    };
    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const counts = {
    all: reports.length,
    PENDING: reports.filter(r => r.status === 'PENDING').length,
    REVIEWED: reports.filter(r => r.status === 'REVIEWED').length,
    RESOLVED: reports.filter(r => r.status === 'RESOLVED').length,
    DISMISSED: reports.filter(r => r.status === 'DISMISSED').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes de Preguntas"
        description="Revisa los reportes de problemas en las preguntas del examen"
        icon={MessageSquare}
        buttonText="Volver al examen"
        onButtonClick={() => window.location.href = examType === 'ai' ? `/admin/ai-exams/${examId}/edit` : `/admin/exams/${examId}`}
        buttonIcon={ArrowLeft}
        primaryColor={colors.primaryColor}
      />

      {/* Filtros por estado */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition ${
              statusFilter === 'all'
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Todos <span className="text-gray-400">({counts.all})</span>
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${
              statusFilter === 'PENDING'
                ? 'bg-white shadow text-yellow-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-3 h-3" /> Pendientes <span className="text-gray-400">({counts.PENDING})</span>
          </button>
          <button
            onClick={() => setStatusFilter('REVIEWED')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${
              statusFilter === 'REVIEWED'
                ? 'bg-white shadow text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Eye className="w-3 h-3" /> Revisados <span className="text-gray-400">({counts.REVIEWED})</span>
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${
              statusFilter === 'RESOLVED'
                ? 'bg-white shadow text-green-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CheckCircle className="w-3 h-3" /> Resueltos <span className="text-gray-400">({counts.RESOLVED})</span>
          </button>
          <button
            onClick={() => setStatusFilter('DISMISSED')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${
              statusFilter === 'DISMISSED'
                ? 'bg-white shadow text-gray-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <XCircle className="w-3 h-3" /> Descartados <span className="text-gray-400">({counts.DISMISSED})</span>
          </button>
        </div>
      </div>

      {/* Lista de reportes */}
      {reports.length === 0 && !loading ? (
        <EmptyState
          icon={MessageSquare}
          title="No hay reportes"
          description={
            statusFilter === 'all'
              ? 'No se han reportado problemas en este examen'
              : `No hay reportes con estado "${statusFilter}"`
          }
          primaryColor={colors.primaryColor}
        />
      ) : (
        <Table
          loading={loading}
          columns={[
            {
              header: 'Estado',
              render: (report) => getStatusBadge(report.status),
            },
            {
              header: 'Estudiante',
              render: (report) => (
                <div>
                  <p className="font-medium text-gray-900">{report.attempt?.studentName || 'N/A'}</p>
                  {report.attempt?.studentEmail && (
                    <p className="text-xs text-gray-500">{report.attempt.studentEmail}</p>
                  )}
                </div>
              ),
            },
            {
              header: 'Pregunta',
              render: (report) => (
                <div className="max-w-md">
                  <p className="text-sm text-gray-900 line-clamp-2">{report.questionText}</p>
                </div>
              ),
            },
            {
              header: 'Motivo',
              render: (report) => (
                <div className="max-w-xs">
                  <p className="text-sm text-gray-700 line-clamp-2">{report.reason}</p>
                </div>
              ),
            },
            {
              header: 'Fecha',
              render: (report) => (
                <span className="text-sm text-gray-600">
                  {new Date(report.createdAt).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              ),
            },
            {
              header: 'Acciones',
              align: 'center' as const,
              render: (report) => (
                report.status === 'PENDING' ? (
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setReviewNotes('');
                      setReviewStatus('REVIEWED');
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-white rounded-lg transition"
                    style={{ backgroundColor: colors.primaryColor }}
                  >
                    Revisar
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setReviewNotes(report.reviewNotes || '');
                      setReviewStatus(report.status);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  >
                    Ver detalles
                  </button>
                )
              ),
            },
          ]}
          data={reports}
          emptyMessage="No hay reportes disponibles"
        />
      )}

      {/* Modal de revisión */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Revisar Reporte</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Pregunta:</h4>
                <p className="text-gray-900">{selectedReport.questionText}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Motivo:</h4>
                <p className="text-gray-900 bg-yellow-50 border border-yellow-200 rounded p-3">
                  {selectedReport.reason}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Estado:</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="REVIEWED">Revisado</option>
                  <option value="RESOLVED">Resuelto</option>
                  <option value="DISMISSED">Descartado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notas (opcional):</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Agrega notas sobre la revisión..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setSelectedReport(null)}
                disabled={submitting}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleReview(selectedReport.id)}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Guardar Revisión'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
