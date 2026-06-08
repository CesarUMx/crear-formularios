import React, { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Zap,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formService } from '../../lib/formService';
import {
  EmptyState,
  Table,
  ToastContainer,
  DeleteDialog,
} from '../common';
import { useToast } from '../common/useToast';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ObjectType = 'CONTACTS' | 'DEALS';
type MatchOperator =
  | 'EQ'
  | 'NEQ'
  | 'CONTAINS_TOKEN'
  | 'HAS_PROPERTY'
  | 'NOT_HAS_PROPERTY';
type SyncStatus =
  | 'SUCCESS'
  | 'NOT_FOUND'
  | 'MULTIPLE_MATCHES_USED_LATEST'
  | 'FAILED'
  | 'SKIPPED';

interface PropertyMapping {
  hubspotProperty: string;
  /** 'question' = respuesta del formulario, 'static' = valor fijo, 'exam_date' = fecha del horario de examen */
  sourceType: 'question' | 'static' | 'exam_date';
  questionId: string;         // solo cuando sourceType === 'question'
  staticValue: string;        // solo cuando sourceType === 'static'
  staticIsDate?: boolean;     // si true, staticValue es datetime-local y se formatea según staticDateFormat
  staticDateFormat?: 'timestamp_ms' | 'iso' | 'date'; // formato de salida cuando staticIsDate
  dateFormat?: 'timestamp_ms' | 'iso' | 'date'; // solo cuando sourceType === 'exam_date'
  valueMap?: { when: string; send: string }[];
}

interface HubSpotConfig {
  id: string;
  formId: string;
  objectType: ObjectType;
  matchOperator: MatchOperator;
  matchProperty: string;
  matchQuestionId: string;
  isActive: boolean;
  propertyMappings: PropertyMapping[];
  hasToken: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SyncLog {
  id: string;
  configId: string;
  responseId: string;
  status: SyncStatus;
  objectId: string | null;
  message: string | null;
  createdAt: string;
}

interface Question {
  id: string;
  text: string;
  type?: string;
}

interface Props {
  formId: string;
  questions?: Question[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  CONTACTS: 'Contactos',
  DEALS: 'Negocios (Deals)',
};

const MATCH_OPERATOR_LABELS: Record<MatchOperator, string> = {
  EQ: 'Igual a (EQ)',
  NEQ: 'Diferente a (NEQ)',
  CONTAINS_TOKEN: 'Contiene (CONTAINS_TOKEN)',
  HAS_PROPERTY: 'Tiene la propiedad',
  NOT_HAS_PROPERTY: 'No tiene la propiedad',
};

const STATUS_CONFIG: Record<
  SyncStatus,
  { label: string; color: string; Icon: React.ElementType }
> = {
  SUCCESS: { label: 'Exitoso', color: 'text-green-600', Icon: CheckCircle },
  NOT_FOUND: { label: 'No encontrado', color: 'text-yellow-600', Icon: AlertCircle },
  MULTIPLE_MATCHES_USED_LATEST: {
    label: 'Múltiples, se usó el más reciente',
    color: 'text-blue-600',
    Icon: AlertCircle,
  },
  FAILED: { label: 'Error', color: 'text-red-600', Icon: XCircle },
  SKIPPED: { label: 'Omitido', color: 'text-gray-500', Icon: AlertCircle },
};

const EMPTY_FORM = {
  objectType: 'CONTACTS' as ObjectType,
  matchOperator: 'EQ' as MatchOperator,
  matchProperty: 'email',
  matchQuestionId: '',
  accessToken: '',
  isActive: true,
  propertyMappings: [] as PropertyMapping[],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HubSpotConfigPanel({ formId, questions: questionsProp = [] }: Props) {
  const [config, setConfig] = useState<HubSpotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>(questionsProp);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Formulario de edición
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showToken, setShowToken] = useState(false);
  const [expandedMappings, setExpandedMappings] = useState<Set<number>>(new Set());

  // Logs
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const LOGS_LIMIT = 10;

  const toast = useToast();

  const loadQuestions = useCallback(async () => {
    try {
      const data = await formService.getFormById(formId);
      const extracted: Question[] = [];
      if ((data as any).versions && Array.isArray((data as any).versions)) {
        for (const version of (data as any).versions) {
          if (version.sections && Array.isArray(version.sections)) {
            for (const section of version.sections) {
              if (section.questions && Array.isArray(section.questions)) {
                extracted.push(...section.questions);
              }
            }
          }
        }
      }
      const unique = Array.from(new Map(extracted.map((q: any) => [q.id, q])).values()) as Question[];
      if (unique.length > 0) setQuestions(unique);
    } catch {
      // silencioso
    }
  }, [formId]);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<HubSpotConfig | null>(`/forms/${formId}/hubspot`);
      setConfig(data);
      if (data) {
        setForm({
          objectType: data.objectType,
          matchOperator: data.matchOperator,
          matchProperty: data.matchProperty,
          matchQuestionId: data.matchQuestionId,
          accessToken: '',
          isActive: data.isActive,
          propertyMappings: data.propertyMappings ?? [],
        });
      }
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  }, [formId]);

  const loadLogs = useCallback(
    async (page = 1) => {
      try {
        setLogsLoading(true);
        const data = await api.get<{ logs: SyncLog[]; total: number }>(
          `/forms/${formId}/hubspot/logs?page=${page}&limit=${LOGS_LIMIT}`
        );
        setLogs(data.logs);
        setLogsTotal(data.total);
        setLogsPage(page);
      } catch {
        // Silencioso — logs no son críticos
      } finally {
        setLogsLoading(false);
      }
    },
    [formId]
  );

  useEffect(() => {
    loadConfig();
    loadLogs(1);
    loadQuestions();
  }, [loadConfig, loadLogs, loadQuestions]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.matchQuestionId) {
      toast.error('Campo requerido', 'Selecciona la pregunta de búsqueda');
      return;
    }
    if (!config && !form.accessToken) {
      toast.error('Campo requerido', 'El token de acceso es requerido para crear la configuración');
      return;
    }
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        objectType: form.objectType,
        matchOperator: form.matchOperator,
        matchProperty: form.matchProperty,
        matchQuestionId: form.matchQuestionId,
        isActive: form.isActive,
        propertyMappings: form.propertyMappings,
      };
      if (form.accessToken) payload.accessToken = form.accessToken;

      const saved = await api.post<HubSpotConfig>(`/forms/${formId}/hubspot`, payload);
      setConfig(saved);
      toast.success('Configuración guardada', 'La integración con HubSpot se guardó correctamente');
      setEditMode(false);
      setForm((f) => ({ ...f, accessToken: '' }));
      loadLogs(1);
    } catch (err) {
      toast.error('Error al guardar', err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const result = await api.post<{ ok: boolean; message: string }>(
        `/forms/${formId}/hubspot/test`,
        {}
      );
      setTestResult(result);
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Error',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/forms/${formId}/hubspot`);
      setConfig(null);
      setForm({ ...EMPTY_FORM });
      setEditMode(false);
      setLogs([]);
      setLogsTotal(0);
      setShowDeleteDialog(false);
      toast.success('Configuración eliminada', 'La integración con HubSpot fue eliminada');
    } catch (err) {
      toast.error('Error al eliminar', err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setDeleting(false);
    }
  };

  const addMapping = () => {
    setForm((f) => ({
      ...f,
      propertyMappings: [
        ...f.propertyMappings,
        { hubspotProperty: '', sourceType: 'question' as const, questionId: '', staticValue: '', valueMap: [] },
      ],
    }));
  };

  const updateMapping = (index: number, field: keyof PropertyMapping, value: string) => {
    setForm((f) => {
      const mappings = [...f.propertyMappings];
      mappings[index] = { ...mappings[index], [field]: value };
      return { ...f, propertyMappings: mappings };
    });
  };

  const removeMapping = (index: number) => {
    setForm((f) => ({
      ...f,
      propertyMappings: f.propertyMappings.filter((_, i) => i !== index),
    }));
    setExpandedMappings((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const toggleMappingExpand = (i: number) => {
    setExpandedMappings((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const addValueRule = (mappingIndex: number) => {
    setForm((f) => {
      const mappings = [...f.propertyMappings];
      const m = { ...mappings[mappingIndex] };
      m.valueMap = [...(m.valueMap ?? []), { when: '', send: '' }];
      mappings[mappingIndex] = m;
      return { ...f, propertyMappings: mappings };
    });
  };

  const updateValueRule = (
    mappingIndex: number,
    ruleIndex: number,
    field: 'when' | 'send',
    value: string
  ) => {
    setForm((f) => {
      const mappings = [...f.propertyMappings];
      const m = { ...mappings[mappingIndex] };
      const rules = [...(m.valueMap ?? [])];
      rules[ruleIndex] = { ...rules[ruleIndex], [field]: value };
      m.valueMap = rules;
      mappings[mappingIndex] = m;
      return { ...f, propertyMappings: mappings };
    });
  };

  const removeValueRule = (mappingIndex: number, ruleIndex: number) => {
    setForm((f) => {
      const mappings = [...f.propertyMappings];
      const m = { ...mappings[mappingIndex] };
      m.valueMap = (m.valueMap ?? []).filter((_, i) => i !== ruleIndex);
      mappings[mappingIndex] = m;
      return { ...f, propertyMappings: mappings };
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  const needsOperatorValue =
    form.matchOperator !== 'HAS_PROPERTY' && form.matchOperator !== 'NOT_HAS_PROPERTY';

  const HS_COLOR = '#ea580c'; // orange-600

  // Columnas para la tabla de logs
  const logColumns = [
    {
      header: 'Estado',
      render: (log: SyncLog) => {
        const { label, color, Icon } = STATUS_CONFIG[log.status];
        return (
          <span className={`flex items-center gap-1.5 ${color}`}>
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </span>
        );
      },
    },
    {
      header: 'ID HubSpot',
      render: (log: SyncLog) =>
        log.objectId ? (
          <span className="font-mono text-gray-600 text-xs">{log.objectId}</span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      header: 'Mensaje',
      render: (log: SyncLog) => (
        <span className="text-gray-500 text-xs line-clamp-1">{log.message ?? '—'}</span>
      ),
    },
    {
      header: 'Fecha',
      render: (log: SyncLog) => (
        <span className="text-gray-400 text-xs whitespace-nowrap">{formatDate(log.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />

      <DeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        itemName="configuración HubSpot"
        loading={deleting}
      />

      {/* Botón configurar — solo cuando no hay config y no se está editando */}
      {!config && !editMode && (
        <div className="flex justify-end">
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90"
            style={{ backgroundColor: HS_COLOR }}
          >
            <Plus className="h-4 w-4" />
            Configurar HubSpot
          </button>
        </div>
      )}

      {/* Acciones cuando hay config activa */}
      {config && !editMode && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
            Probar conexión
          </button>
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </div>
      )}

      {/* Resultado de prueba de conexión */}
      {testResult && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
            testResult.ok
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {testResult.ok ? (
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          {testResult.message}
        </div>
      )}

      {/* Sin configuración — estado vacío */}
      {!config && !editMode && (
        <EmptyState
          icon={Zap}
          title="Sin integración HubSpot"
          description="Conecta este formulario con HubSpot para actualizar contactos o negocios automáticamente al recibir cada respuesta."
          primaryColor={HS_COLOR}
        />
      )}

      {/* Vista de configuración (solo lectura) */}
      {config && !editMode && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Estado</span>
            <span
              className={`inline-flex items-center gap-1 text-sm font-medium ${
                config.isActive ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${config.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              {config.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Tipo de objeto</p>
              <p className="font-medium">{OBJECT_TYPE_LABELS[config.objectType]}</p>
            </div>
            <div>
              <p className="text-gray-500">Propiedad de búsqueda</p>
              <p className="font-medium font-mono text-orange-700">{config.matchProperty}</p>
            </div>
            <div>
              <p className="text-gray-500">Operador</p>
              <p className="font-medium">{MATCH_OPERATOR_LABELS[config.matchOperator]}</p>
            </div>
            <div>
              <p className="text-gray-500">Pregunta de búsqueda</p>
              <p className="font-medium">
                {questions.find((q) => q.id === config.matchQuestionId)?.text ??
                  config.matchQuestionId}
              </p>
            </div>
          </div>
          {config.propertyMappings.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">
                Mapeos de propiedades ({config.propertyMappings.length})
              </p>
              <div className="space-y-1">
                {config.propertyMappings.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 bg-gray-100 rounded font-mono text-xs">
                      {questions.find((q) => q.id === m.questionId)?.text ?? m.questionId}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="px-2 py-0.5 bg-orange-50 border border-orange-200 rounded font-mono text-xs text-orange-700">
                      {m.hubspotProperty}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="pt-2 border-t border-gray-100 flex items-center gap-1 text-xs text-gray-400">
            <Settings className="h-3 w-3" />
            Actualizado {formatDate(config.updatedAt)}
          </div>
        </div>
      )}

      {/* Formulario de edición */}
      {editMode && (
        <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-lg p-5 space-y-5">

          {/* Estado */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Activo</p>
              <p className="text-xs text-gray-500">Habilita o deshabilita la sincronización</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                form.isActive ? 'bg-orange-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                  form.isActive ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Tipo de objeto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de objeto HubSpot
            </label>
            <select
              value={form.objectType}
              onChange={(e) => setForm((f) => ({ ...f, objectType: e.target.value as ObjectType }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {Object.entries(OBJECT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Búsqueda — propiedad y pregunta */}
          <div className="border border-orange-100 bg-orange-50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-orange-800">Criterio de búsqueda</p>
            <p className="text-xs text-orange-600">
              Define cómo buscar el objeto en HubSpot usando el valor de una pregunta del formulario
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Pregunta del formulario
                </label>
                <select
                  value={form.matchQuestionId}
                  onChange={(e) => setForm((f) => ({ ...f, matchQuestionId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  required
                >
                  <option value="">Seleccionar pregunta...</option>
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.text.length > 60 ? q.text.slice(0, 60) + '…' : q.text}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Propiedad en HubSpot
                </label>
                <input
                  type="text"
                  value={form.matchProperty}
                  onChange={(e) => setForm((f) => ({ ...f, matchProperty: e.target.value }))}
                  placeholder="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Operador</label>
                <select
                  value={form.matchOperator}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, matchOperator: e.target.value as MatchOperator }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {Object.entries(MATCH_OPERATOR_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {!needsOperatorValue && (
                  <p className="text-xs text-gray-400 mt-1">
                    Este operador no requiere valor de comparación
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Token de acceso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token de acceso HubSpot
            </label>
            {config?.hasToken && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700 font-medium">Token configurado</span>
                <span className="text-xs text-green-600 ml-1">— deja el campo vacío para conservarlo</span>
              </div>
            )}
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.accessToken}
                onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
                placeholder={
                  config ? 'Escribe solo si deseas cambiar el token actual' : 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm font-mono"
                required={!config}
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              El token se cifra con AES-256-GCM y nunca se devuelve por la API
            </p>
          </div>

          {/* Mapeos de propiedades */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Mapeos de propiedades</label>
              <button
                type="button"
                onClick={addMapping}
                className="flex items-center gap-1 text-xs font-medium hover:opacity-80"
                style={{ color: HS_COLOR }}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar mapeo
              </button>
            </div>
            {form.propertyMappings.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">
                Sin mapeos — agrega al menos uno para actualizar propiedades en HubSpot
              </p>
            ) : (
              <div className="space-y-2">
                {form.propertyMappings.map((mapping, i) => {
                  const isExpanded = expandedMappings.has(i);
                  const ruleCount = mapping.valueMap?.length ?? 0;
                  const srcType = mapping.sourceType ?? 'question';
                  const canTransform = srcType === 'question';
                  return (
                    <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Fila principal */}
                      <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_auto] items-center gap-2 px-3 py-2 bg-gray-50">
                        {/* Selector de tipo de fuente */}
                        <select
                          value={srcType}
                          onChange={(e) => {
                            const val = e.target.value as PropertyMapping['sourceType'];
                            setForm((f) => {
                              const ms = [...f.propertyMappings];
                              ms[i] = { ...ms[i], sourceType: val, questionId: '', staticValue: '', valueMap: [] };
                              return { ...f, propertyMappings: ms };
                            });
                            setExpandedMappings((prev) => { const n = new Set(prev); n.delete(i); return n; });
                          }}
                          className="border border-gray-300 rounded px-2 py-1 text-xs bg-white flex-shrink-0"
                        >
                          <option value="question">Pregunta</option>
                          <option value="static">Valor fijo</option>
                          <option value="exam_date">Fecha de examen</option>
                        </select>

                        {/* Campo de fuente según tipo */}
                        {srcType === 'question' && (
                          <select
                            value={mapping.questionId}
                            onChange={(e) => updateMapping(i, 'questionId', e.target.value)}
                            className="min-w-0 border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                          >
                            <option value="">Seleccionar pregunta...</option>
                            {questions.map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.text.length > 60 ? q.text.slice(0, 60) + '…' : q.text}
                              </option>
                            ))}
                          </select>
                        )}
                        {srcType === 'static' && (
                          <div className="flex items-center gap-1 min-w-0">
                            <select
                              value={mapping.staticIsDate ? 'date' : 'text'}
                              onChange={(e) => {
                                const isDate = e.target.value === 'date';
                                setForm((f) => {
                                  const ms = [...f.propertyMappings];
                                  ms[i] = { ...ms[i], staticIsDate: isDate, staticValue: '', staticDateFormat: isDate ? 'timestamp_ms' : undefined };
                                  return { ...f, propertyMappings: ms };
                                });
                              }}
                              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white flex-shrink-0"
                            >
                              <option value="text">Texto</option>
                              <option value="date">Fecha</option>
                            </select>
                            {mapping.staticIsDate ? (
                              <>
                                <label className="flex items-center gap-1 text-xs text-gray-600 flex-shrink-0 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={mapping.staticValue === '__now__'}
                                    onChange={(e) => updateMapping(i, 'staticValue', e.target.checked ? '__now__' : '')}
                                    className="accent-blue-600"
                                  />
                                  Ahora
                                </label>
                                {mapping.staticValue !== '__now__' && (
                                  <input
                                    type="datetime-local"
                                    value={mapping.staticValue ?? ''}
                                    onChange={(e) => updateMapping(i, 'staticValue', e.target.value)}
                                    className="min-w-0 border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                                  />
                                )}
                                <select
                                  value={mapping.staticDateFormat ?? 'timestamp_ms'}
                                  onChange={(e) => updateMapping(i, 'staticDateFormat', e.target.value)}
                                  className="border border-gray-300 rounded px-2 py-1 text-xs bg-white flex-shrink-0"
                                >
                                  <option value="timestamp_ms">Timestamp ms</option>
                                  <option value="iso">ISO 8601</option>
                                  <option value="date">Solo fecha</option>
                                </select>
                              </>
                            ) : (
                              <input
                                type="text"
                                value={mapping.staticValue ?? ''}
                                onChange={(e) => updateMapping(i, 'staticValue', e.target.value)}
                                placeholder="valor fijo a enviar"
                                className="min-w-0 border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                              />
                            )}
                          </div>
                        )}
                        {srcType === 'exam_date' && (
                          <select
                            value={mapping.dateFormat ?? 'timestamp_ms'}
                            onChange={(e) => updateMapping(i, 'dateFormat', e.target.value)}
                            className="min-w-0 border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                          >
                            <option value="timestamp_ms">Timestamp ms (HubSpot datepicker)</option>
                            <option value="iso">ISO 8601 (datetime)</option>
                            <option value="date">Solo fecha (YYYY-MM-DD)</option>
                          </select>
                        )}

                        <span className="text-gray-400 text-xs flex-shrink-0">→</span>

                        <input
                          type="text"
                          value={mapping.hubspotProperty}
                          onChange={(e) => updateMapping(i, 'hubspotProperty', e.target.value)}
                          placeholder="propiedad_hs"
                          className="min-w-0 border border-gray-300 rounded px-2 py-1 text-xs font-mono bg-white"
                        />

                        {/* Botón transformaciones (solo si es pregunta) */}
                        {canTransform ? (
                          <button
                            type="button"
                            onClick={() => toggleMappingExpand(i)}
                            title="Transformaciones de valor"
                            className={`flex items-center gap-1 flex-shrink-0 border rounded px-1.5 py-1 text-xs transition ${
                              ruleCount > 0
                                ? 'border-orange-300 text-orange-600 bg-orange-50'
                                : 'border-gray-200 text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {ruleCount > 0 && <span className="font-medium">{ruleCount}</span>}
                          </button>
                        ) : (
                          <span className="w-8 flex-shrink-0" />
                        )}

                        <button
                          type="button"
                          onClick={() => removeMapping(i)}
                          className="text-gray-400 hover:text-red-500 flex-shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Panel de transformaciones (solo para preguntas) */}
                      {canTransform && isExpanded && (
                        <div className="px-3 py-3 border-t border-gray-100 space-y-2 bg-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-600">Transformaciones de valor</p>
                              <p className="text-xs text-gray-400">
                                Si la respuesta coincide, se envía el valor transformado. Sin reglas → se envía el valor exacto.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addValueRule(i)}
                              className="flex items-center gap-1 text-xs font-medium flex-shrink-0 hover:opacity-80"
                              style={{ color: HS_COLOR }}
                            >
                              <Plus className="h-3 w-3" />
                              Agregar regla
                            </button>
                          </div>
                          {ruleCount === 0 ? (
                            <p className="text-xs text-gray-300 italic">
                              Sin reglas — se envía el valor exacto de la respuesta
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center text-xs text-gray-400 px-1">
                                <span>Respuesta del formulario</span>
                                <span />
                                <span>Valor para HubSpot</span>
                                <span />
                              </div>
                              {(mapping.valueMap ?? []).map((rule, ri) => (
                                <div key={ri} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                                  <input
                                    type="text"
                                    value={rule.when}
                                    onChange={(e) => updateValueRule(i, ri, 'when', e.target.value)}
                                    placeholder="ej. Sí / Opción A"
                                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                                  />
                                  <span className="text-gray-400 text-xs text-center">→</span>
                                  <input
                                    type="text"
                                    value={rule.send}
                                    onChange={(e) => updateValueRule(i, ri, 'send', e.target.value)}
                                    placeholder="ej. true / 1 / internal_name"
                                    className="border border-gray-300 rounded px-2 py-1 text-xs font-mono w-full"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeValueRule(i, ri)}
                                    className="text-gray-300 hover:text-red-500"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Acciones del formulario */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: HS_COLOR }}
            >
              {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
              Guardar configuración
            </button>
          </div>
        </form>
      )}

      {/* Logs de sincronización */}
      {config && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <h3 className="font-medium text-gray-900 text-sm">
                Historial de sincronización
                {logsTotal > 0 && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    {logsTotal} registros
                  </span>
                )}
              </h3>
            </div>
            <button
              onClick={() => loadLogs(logsPage)}
              disabled={logsLoading}
              className="text-gray-400 hover:text-gray-600"
            >
              <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <Table
            columns={logColumns}
            data={logs}
            loading={logsLoading}
            emptyMessage="Sin sincronizaciones registradas todavía"
          />

          {/* Paginación */}
          {logsTotal > LOGS_LIMIT && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Mostrando {(logsPage - 1) * LOGS_LIMIT + 1}–
                {Math.min(logsPage * LOGS_LIMIT, logsTotal)} de {logsTotal}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadLogs(logsPage - 1)}
                  disabled={logsPage === 1 || logsLoading}
                  className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => loadLogs(logsPage + 1)}
                  disabled={logsPage * LOGS_LIMIT >= logsTotal || logsLoading}
                  className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
