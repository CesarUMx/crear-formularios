import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CheckCircle, Clock, XCircle, Mail } from 'lucide-react';
import { emailTemplateService, type EmailSendLog, type EmailTemplate } from '../../lib/emailTemplateService';

interface Props {
  formId: string;
}

const STATUS_CONFIG = {
  SENT: { label: 'Enviado', color: 'text-green-700 bg-green-50 border-green-200', Icon: CheckCircle },
  PENDING: { label: 'Pendiente', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', Icon: Clock },
  FAILED: { label: 'Fallido', color: 'text-red-700 bg-red-50 border-red-200', Icon: XCircle },
};

export default function EmailLogsViewer({ formId }: Props) {
  const [logs, setLogs] = useState<EmailSendLog[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logsData, tplData] = await Promise.all([
        emailTemplateService.getLogs(formId, {
          status: status || undefined,
          templateId: templateId || undefined,
          page,
          limit: 50,
        }),
        emailTemplateService.listTemplates(formId),
      ]);
      setLogs(logsData.logs);
      setTotal(logsData.total);
      setTemplates(tplData);
    } finally {
      setLoading(false);
    }
  }, [formId, status, templateId, page]);

  useEffect(() => { load(); }, [load]);

  const fmt = (iso: string | null) => {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Logs de envío de emails
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} registro(s) encontrado(s)</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">Todos los estados</option>
          <option value="SENT">Enviados</option>
          <option value="PENDING">Pendientes</option>
          <option value="FAILED">Fallidos</option>
        </select>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={templateId}
          onChange={e => { setTemplateId(e.target.value); setPage(1); }}
        >
          <option value="">Todos los templates</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
          Cargando...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay logs que mostrar.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-3 pr-4">Template</th>
                <th className="py-3 pr-4">Destinatario</th>
                <th className="py-3 pr-4">Estado</th>
                <th className="py-3 pr-4">Programado para</th>
                <th className="py-3 pr-4">Enviado</th>
                <th className="py-3">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => {
                const cfg = STATUS_CONFIG[log.status];
                const { Icon } = cfg;
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-800">{log.template.name}</td>
                    <td className="py-3 pr-4 text-gray-600">{log.recipientEmail}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1 text-xs border rounded-full px-2 py-0.5 ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{fmt(log.scheduledFor)}</td>
                    <td className="py-3 pr-4 text-gray-500">{fmt(log.sentAt)}</td>
                    <td className="py-3 text-red-500 text-xs max-w-xs truncate">
                      {log.errorMessage ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
