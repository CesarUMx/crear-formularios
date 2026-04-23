import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import { Shield, Lock, AlertTriangle, Check, Clock, X } from 'lucide-react';
import { useToast } from '../common';

interface SecurityEvent {
  id: string;
  unlockCode: string;
  eventType: string;
  createdAt: string;
  examAttempt: {
    id: string;
    studentName: string;
    studentEmail: string;
    startedAt: string;
    tabSwitches: number;
  };
}

interface SecurityMonitorPanelProps {
  examId: string;
  onClose?: () => void;
}

export default function SecurityMonitorPanel({ examId, onClose }: SecurityMonitorPanelProps) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [concludingAttemptId, setConcludingAttemptId] = useState<string | null>(null);
  const [confirmingAttemptId, setConfirmingAttemptId] = useState<string | null>(null);
  const toast = useToast();

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await examService.getPendingSecurityEvents(examId);
      setEvents(data);
    } catch (error: any) {
      console.error('Error loading security events:', error);
      toast.error('Error', error.message || 'No se pudieron cargar los eventos de seguridad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // Recargar cada 5 segundos
    const interval = setInterval(loadEvents, 5000);
    return () => clearInterval(interval);
  }, [examId]);

  const handleConcludeExam = async (attemptId: string) => {
    try {
      setConcludingAttemptId(attemptId);
      await examService.forceCompleteAttempt(attemptId);
      toast.success('Examen concluido', 'El examen del estudiante ha sido concluido remotamente');
      setConfirmingAttemptId(null);
      // Recargar eventos
      await loadEvents();
    } catch (error: any) {
      console.error('Error concluding exam:', error);
      toast.error('Error', error.message || 'No se pudo concluir el examen');
    } finally {
      setConcludingAttemptId(null);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Hace menos de 1 min';
    if (diffMins === 1) return 'Hace 1 min';
    if (diffMins < 60) return `Hace ${diffMins} mins`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Hace 1 hora';
    return `Hace ${diffHours} horas`;
  };

  // Agrupar eventos por intento
  const groupedEvents = events.reduce((acc, event) => {
    const attemptId = event.examAttempt.id;
    if (!acc[attemptId]) {
      acc[attemptId] = {
        attempt: event.examAttempt,
        events: [],
      };
    }
    acc[attemptId].events.push(event);
    return acc;
  }, {} as Record<string, { attempt: any; events: SecurityEvent[] }>);

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-red-500">
      {/* Header */}
      <div className="bg-red-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" />
          <div>
            <h2 className="text-lg font-bold">Monitor de Seguridad</h2>
            <p className="text-sm opacity-90">
              {events.length} estudiante{events.length !== 1 ? 's' : ''} bloqueado{events.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-600 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-gray-600">No hay estudiantes bloqueados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedEvents).map(([attemptId, { attempt, events: attemptEvents }]) => {
              const latestEvent = attemptEvents[0];
              const isConfirming = confirmingAttemptId === attemptId;
              const isConcluding = concludingAttemptId === attemptId;

              return (
                <div
                  key={attemptId}
                  className="border-2 border-red-200 rounded-lg p-4 bg-red-50"
                >
                  {/* Student Info */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                        <Lock className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{attempt.studentName}</h3>
                        <p className="text-sm text-gray-600">{attempt.studentEmail}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-500">
                            Inicio: {formatTime(attempt.startedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
                        <AlertTriangle className="w-3 h-3" />
                        Bloqueado
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatRelativeTime(latestEvent.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Latest Event Info */}
                  <div className="bg-white border border-red-200 rounded p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Último evento:</span>
                      <span className="text-xs text-gray-500">
                        {attemptEvents.length} evento{attemptEvents.length !== 1 ? 's' : ''} total{attemptEvents.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {latestEvent.eventType === 'TAB_SWITCH' ? 'Cambio de pestaña' : latestEvent.eventType}
                      </span>
                      <div className="bg-blue-100 border border-blue-300 px-3 py-1 rounded">
                        <span className="text-lg font-mono font-bold text-blue-900">
                          {latestEvent.unlockCode}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Proporciona este código al estudiante para desbloquearlo
                    </p>
                  </div>

                  {/* Actions */}
                  {!isConfirming ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(latestEvent.unlockCode);
                          toast.success('Copiado', 'Código copiado al portapapeles');
                        }}
                        className="flex-1 py-2 px-4 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 transition"
                      >
                        Copiar Código
                      </button>
                      <button
                        onClick={() => setConfirmingAttemptId(attemptId)}
                        className="flex-1 py-2 px-4 bg-orange-500 text-white text-sm font-medium rounded hover:bg-orange-600 transition"
                      >
                        Concluir Examen
                      </button>
                    </div>
                  ) : (
                    <div className="bg-orange-50 border-2 border-orange-300 rounded p-3">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-orange-900 text-sm">¿Concluir examen?</p>
                          <p className="text-xs text-orange-700 mt-1">
                            El examen de <strong>{attempt.studentName}</strong> se enviará automáticamente.
                            Esta acción no se puede deshacer.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConcludeExam(attemptId)}
                          disabled={isConcluding}
                          className="flex-1 py-2 px-4 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700 disabled:bg-gray-400 transition"
                        >
                          {isConcluding ? 'Concluyendo...' : 'Sí, Concluir'}
                        </button>
                        <button
                          onClick={() => setConfirmingAttemptId(null)}
                          disabled={isConcluding}
                          className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-400 disabled:bg-gray-200 transition"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
