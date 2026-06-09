import { useState, useEffect } from 'react';
import { useColors } from '../../hooks/useColors';
import { PageHeader, Table, StatsCard, EmptyState, useToast, ToastContainer } from '../common';
import {
  Users,
  Calendar,
  Download,
  Search,
  XCircle,
  CheckCircle,
  FileText,
  ArrowLeft,
  Filter,
} from 'lucide-react';

interface ExamRegistrationsListProps {
  examId: string;
}

interface Registration {
  id: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string | null;
  notes: string | null;
  hasExemption: boolean;
  exemptionFileUrl: string | null;
  status: string;
  createdAt: string;
  schedule: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location: string | null;
  };
}

interface Stats {
  totalRegistered: number;
  totalCapacity: number;
  schedules: Array<{
    id: string;
    title: string;
    registered: number;
    capacity: number;
  }>;
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  });
}

const statusLabels: Record<string, string> = {
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  ATTENDED: 'Asistió',
  NO_SHOW: 'No asistió',
};

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  ATTENDED: 'bg-blue-100 text-blue-800',
  NO_SHOW: 'bg-yellow-100 text-yellow-800',
};

export default function ExamRegistrationsList({ examId }: ExamRegistrationsListProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [scheduleFilter, setScheduleFilter] = useState<string>('');
  const { toasts, success: showSuccess, error: showError, removeToast } = useToast();
  const colors = useColors();

  useEffect(() => {
    loadData();
  }, [examId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [regsRes, statsRes] = await Promise.all([
        fetch(`/api/exam-registrations/exam/${examId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch(`/api/exam-registrations/stats/${examId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      if (regsRes.ok) {
        setRegistrations(await regsRes.json());
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch {
      showError('Error al cargar registros');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿Cancelar este registro? Se liberará el cupo.')) return;
    try {
      const res = await fetch(`/api/exam-registrations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        showSuccess('Registro cancelado');
        loadData();
      } else {
        const data = await res.json();
        showError(data.error || 'Error al cancelar');
      }
    } catch {
      showError('Error de conexión');
    }
  };

  const handleExport = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/exam-registrations/exam/${examId}/export?token=${token}`, '_blank');
  };

  const filteredRegistrations = registrations.filter((r) => {
    const matchesSearch =
      !searchTerm ||
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesSchedule = !scheduleFilter || r.schedule.id === scheduleFilter;
    return matchesSearch && matchesStatus && matchesSchedule;
  });

  const columns = [
    {
      header: 'Estudiante',
      render: (row: Registration) => (
        <div>
          <div className="font-medium text-gray-900">{row.studentName}</div>
          <div className="text-sm text-gray-500">{row.studentEmail}</div>
        </div>
      ),
    },
    {
      header: 'Horario',
      render: (row: Registration) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.schedule.title}</div>
          <div className="text-xs text-gray-500">{formatDateTime(row.schedule.startTime)}</div>
          {row.schedule.location && (
            <div className="text-xs text-gray-400">{row.schedule.location}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Exención',
      align: 'center' as const,
      render: (row: Registration) =>
        row.hasExemption ? (
          <div className="flex items-center gap-1 justify-center">
            <FileText className="w-4 h-4 text-blue-500" />
            {row.exemptionFileUrl && (
              <a
                href={row.exemptionFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Ver archivo
              </a>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        ),
    },
    {
      header: 'Estado',
      render: (row: Registration) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[row.status] || 'bg-gray-100 text-gray-800'}`}>
          {statusLabels[row.status] || row.status}
        </span>
      ),
    },
    {
      header: 'Fecha registro',
      render: (row: Registration) => (
        <span className="text-sm text-gray-600">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      header: 'Acciones',
      align: 'center' as const,
      render: (row: Registration) =>
        row.status === 'CONFIRMED' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCancel(row.id);
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
            title="Cancelar registro"
          >
            <XCircle className="w-4 h-4" />
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <PageHeader
        title="Registros de Examen"
        subtitle={`${registrations.length} registro${registrations.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex gap-2">
            <a
              href={`/admin/exams/${examId}`}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al examen
            </a>
            <button
              onClick={handleExport}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Total registrados"
            value={stats.totalRegistered}
            icon={<Users className="w-5 h-5" />}
            color={colors.primary}
          />
          <StatsCard
            title="Capacidad total"
            value={stats.totalCapacity}
            icon={<Calendar className="w-5 h-5" />}
            color={colors.secondary}
          />
          <StatsCard
            title="Disponibilidad"
            value={`${stats.totalCapacity - stats.totalRegistered} lugares`}
            icon={<CheckCircle className="w-5 h-5" />}
            color={colors.accent}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="CANCELLED">Cancelado</option>
            <option value="ATTENDED">Asistió</option>
            <option value="NO_SHOW">No asistió</option>
          </select>
          {stats && stats.schedules.length > 1 && (
            <select
              value={scheduleFilter}
              onChange={(e) => setScheduleFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los horarios</option>
              {stats.schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.registered}/{s.capacity})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredRegistrations}
        loading={loading}
        emptyMessage="No hay registros para este examen"
      />
    </div>
  );
}
