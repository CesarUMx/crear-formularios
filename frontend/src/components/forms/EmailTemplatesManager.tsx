import React, { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Send, ToggleLeft, ToggleRight, Mail, Clock } from 'lucide-react';
import { emailTemplateService, type EmailTemplate, type EmailRule } from '../../lib/emailTemplateService';
import { formService } from '../../lib/formService';
import EmailRichTextEditor from './EmailRichTextEditor';
import EmptyState from '../common/EmptyState';
import { useColors } from '../../hooks/useColors';


interface Question {
  id: string;
  text: string;
  type?: string;
  options?: { text: string }[];
}

interface Props {
  formId: string;
  questions?: Question[];
}

// ── Variables disponibles en templates ───────────────────────────────────────
const TEMPLATE_VARS = [
  { key: 'nombre', label: 'Nombre del estudiante' },
  { key: 'email', label: 'Correo electrónico' },
  { key: 'folio', label: 'Folio de respuesta' },
  { key: 'nombreExamen', label: 'Nombre del examen' },
  { key: 'fechaExamen', label: 'Fecha del examen' },
  { key: 'horarioExamen', label: 'Horario (título del slot)' },
  { key: 'lugarExamen', label: 'Lugar del examen' },
];

// ── Valores iniciales para nuevo template ────────────────────────────────────
const EMPTY_TEMPLATE: Omit<EmailTemplate, 'id' | 'formId' | 'createdAt' | 'updatedAt'> = {
  name: '',
  subject: '',
  bodyHtml: '',
  isActive: true,
  rules: [{ trigger: 'ON_FORM_SUBMIT', conditions: null }],
};

// ── Modal de edición ─────────────────────────────────────────────────────────
interface ModalProps {
  template: Omit<EmailTemplate, 'id' | 'formId' | 'createdAt' | 'updatedAt'> & { id?: string };
  questions: Question[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}

function TemplateModal({ template: initial, questions, onClose, onSave, saving }: ModalProps) {
  const [form, setForm] = useState({ ...initial });
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const subjectRef = useRef<HTMLInputElement>(null);
  const insertBodyVarRef = useRef<((text: string) => void) | null>(null);

  const setField = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  const setRule = (idx: number, key: string, val: any) => {
    const rules = [...form.rules];
    rules[idx] = { ...rules[idx], [key]: val };
    setForm(f => ({ ...f, rules }));
  };

  const addRule = () =>
    setForm(f => ({
      ...f,
      rules: [...f.rules, { trigger: 'ON_FORM_SUBMIT' as const, conditions: null }],
    }));

  const removeRule = (idx: number) =>
    setForm(f => ({ ...f, rules: f.rules.filter((_, i) => i !== idx) }));

  const insertVarToSubject = (varKey: string) => {
    const input = subjectRef.current;
    if (!input) {
      setField('subject', form.subject + `{{${varKey}}}`);
      return;
    }
    const start = input.selectionStart ?? form.subject.length;
    const end = input.selectionEnd ?? start;
    const inserted = `{{${varKey}}}`;
    const newVal = form.subject.slice(0, start) + inserted + form.subject.slice(end);
    setField('subject', newVal);
    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + inserted.length, start + inserted.length);
    });
  };

  const insertVarToBody = (varKey: string) => {
    if (insertBodyVarRef.current) {
      insertBodyVarRef.current(`{{${varKey}}}`);
    } else {
      setField('bodyHtml', form.bodyHtml + `{{${varKey}}}`);
    }
  };

  const handleTest = async () => {
    if (!initial.id) return;
    setTesting(true);
    setTestMsg('');
    try {
      const res = await emailTemplateService.testTemplate(initial.id!, testEmail || undefined);
      setTestMsg(res.message);
    } catch (e: any) {
      setTestMsg('Error: ' + (e?.message ?? String(e)));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-10 pb-10 overflow-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial.id ? 'Editar template' : 'Nuevo template de email'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre interno</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Confirmación de registro"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
            />
          </div>

          {/* Asunto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asunto del correo</label>
            <input
              ref={subjectRef}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Confirmación de registro — {{nombreExamen}}"
              value={form.subject}
              onChange={e => setField('subject', e.target.value)}
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {TEMPLATE_VARS.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVarToSubject(v.key)}
                  className="text-xs bg-gray-100 text-gray-600 border border-gray-300 rounded px-2 py-0.5 hover:bg-gray-200 transition"
                  title={`Insertar en asunto: ${v.label}`}
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Cuerpo del email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cuerpo del email</label>
            <div className="mb-2">
              <p className="text-xs text-gray-500 font-medium mb-1">Variables disponibles (click para insertar en el cuerpo):</p>
              <div className="flex flex-wrap gap-1">
                {TEMPLATE_VARS.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVarToBody(v.key)}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-100 transition"
                    title={v.label}
                  >
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            </div>
            <EmailRichTextEditor
              value={form.bodyHtml}
              onChange={(html) => setField('bodyHtml', html)}
              placeholder="Diseña tu email aquí..."
              onInsertVar={(fn) => { insertBodyVarRef.current = fn; }}
            />
          </div>

          {/* Reglas de envío */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Reglas de envío</label>
              <button
                type="button"
                onClick={addRule}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Agregar regla
              </button>
            </div>

            {form.rules.map((rule, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 mb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Regla {idx + 1}</span>
                  {form.rules.length > 1 && (
                    <button type="button" onClick={() => removeRule(idx)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Trigger */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cuándo enviar</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={rule.trigger}
                    onChange={e => setRule(idx, 'trigger', e.target.value)}
                  >
                    <option value="ON_FORM_SUBMIT">Al enviar el formulario</option>
                    <option value="SCHEDULED_REMINDER">Recordatorio programado</option>
                  </select>
                </div>

                {/* Recordatorio: offset y anchor */}
                {rule.trigger === 'SCHEDULED_REMINDER' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Minutos (negativo = antes)</label>
                      <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="-1440 = 24h antes"
                        value={rule.reminderOffsetMinutes ?? ''}
                        onChange={e => setRule(idx, 'reminderOffsetMinutes', e.target.value ? Number(e.target.value) : null)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Referencia</label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={rule.reminderAnchor ?? 'EXAM_SCHEDULE_START'}
                        onChange={e => setRule(idx, 'reminderAnchor', e.target.value)}
                      >
                        <option value="EXAM_SCHEDULE_START">Inicio del horario de examen</option>
                        <option value="REGISTRATION_CREATED">Creación del registro</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Condiciones */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Condiciones (opcional — si no se definen, siempre se envía)
                  </label>
                  {rule.conditions ? (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <select
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                          value={rule.conditions.combinator}
                          onChange={e => {
                            const updated = { ...rule.conditions!, combinator: e.target.value as 'AND' | 'OR' };
                            setRule(idx, 'conditions', updated);
                          }}
                        >
                          <option value="AND">Todas (AND)</option>
                          <option value="OR">Alguna (OR)</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setRule(idx, 'conditions', null)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Quitar condiciones
                        </button>
                      </div>
                      {rule.conditions.rules.map((cr, ci) => (
                        <div key={ci} className="flex items-center gap-1 min-w-0">
                          <select
                            className="border border-gray-300 rounded px-2 py-1 text-xs min-w-0 flex-1"
                            value={cr.questionId}
                            onChange={e => {
                              const condRules = [...rule.conditions!.rules];
                              condRules[ci] = { ...condRules[ci], questionId: e.target.value };
                              setRule(idx, 'conditions', { ...rule.conditions!, rules: condRules });
                            }}
                          >
                            <option value="">Seleccionar pregunta...</option>
                            {questions.filter((q: any) => ['RADIO','SELECT','CHECKBOX','BOOLEAN'].includes(q.type)).map((q: any) => (
                              <option key={q.id} value={q.id}>{q.text.length > 60 ? q.text.slice(0, 60) + '…' : q.text}</option>
                            ))}
                          </select>
                          <select
                            className="border border-gray-300 rounded px-1 py-1 text-xs shrink-0 max-w-[110px]"
                            value={cr.operator}
                            onChange={e => {
                              const condRules = [...rule.conditions!.rules];
                              condRules[ci] = { ...condRules[ci], operator: e.target.value };
                              setRule(idx, 'conditions', { ...rule.conditions!, rules: condRules });
                            }}
                          >
                            <option value="equals">es igual a</option>
                            <option value="not_equals">no es igual a</option>
                            <option value="contains">contiene</option>
                            <option value="is_empty">está vacío</option>
                            <option value="is_not_empty">no está vacío</option>
                          </select>
                          {!['is_empty', 'is_not_empty'].includes(cr.operator) && (() => {
                            const selectedQ = questions.find((q: any) => q.id === cr.questionId);
                            const qOptions: string[] = selectedQ?.type === 'BOOLEAN'
                              ? ['true', 'false']
                              : (selectedQ?.options?.map((o: any) => o.text) ?? []);
                            return qOptions.length > 0 ? (
                              <select
                                className="border border-gray-300 rounded px-1 py-1 text-xs shrink-0 max-w-[100px]"
                                value={Array.isArray(cr.value) ? cr.value[0] : (cr.value ?? '')}
                                onChange={e => {
                                  const condRules = [...rule.conditions!.rules];
                                  condRules[ci] = { ...condRules[ci], value: e.target.value };
                                  setRule(idx, 'conditions', { ...rule.conditions!, rules: condRules });
                                }}
                              >
                                <option value="">Valor...</option>
                                {qOptions.map((opt: string) => (
                                  <option key={opt} value={opt}>{selectedQ?.type === 'BOOLEAN' ? (opt === 'true' ? 'Sí' : 'No') : opt}</option>
                                ))}
                              </select>
                            ) : null;
                          })()}
                          <button
                            type="button"
                            onClick={() => {
                              const condRules = rule.conditions!.rules.filter((_, i) => i !== ci);
                              setRule(idx, 'conditions', condRules.length ? { ...rule.conditions!, rules: condRules } : null);
                            }}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const condRules = [...rule.conditions!.rules, { questionId: '', operator: 'equals', value: '' }];
                          setRule(idx, 'conditions', { ...rule.conditions!, rules: condRules });
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        + Agregar condición
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRule(idx, 'conditions', { combinator: 'AND', rules: [{ questionId: '', operator: 'equals', value: '' }] })}
                      className="text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded px-3 py-1"
                    >
                      + Agregar condiciones
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Prueba de email (solo en edición) */}
          {initial.id && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Enviar email de prueba</p>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="correo@ejemplo.com (o dejar vacío para usar el tuyo)"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-1 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {testing ? 'Enviando...' : 'Probar'}
                </button>
              </div>
              {testMsg && <p className={`text-xs mt-1 ${testMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{testMsg}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setField('isActive', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Activo</span>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onSave(form)}
              disabled={saving || !form.name || !form.subject || !form.bodyHtml}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function EmailTemplatesManager({ formId, questions = [] }: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{
    open: boolean;
    template: (Omit<EmailTemplate, 'formId' | 'createdAt' | 'updatedAt' | 'id'> & { id?: string }) | null;
  }>({ open: false, template: null });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>(questions);
  const colors = useColors();

  // Cargar preguntas del formulario usando formService (apunta al backend correcto)
  const loadFormQuestions = async () => {
    try {
      const data = await formService.getFormById(formId);
      // Extraer todas las preguntas de todas las versiones
      const extractedQuestions: Question[] = [];
      if ((data as any).versions && Array.isArray((data as any).versions)) {
        for (const version of (data as any).versions) {
          if (version.sections && Array.isArray(version.sections)) {
            for (const section of version.sections) {
              if (section.questions && Array.isArray(section.questions)) {
                extractedQuestions.push(...section.questions);
              }
            }
          }
        }
      }
      // Deduplicar por ID
      const uniqueQuestions = Array.from(new Map(extractedQuestions.map((q: any) => [q.id, q])).values()) as Question[];
      setAllQuestions(uniqueQuestions);
    } catch {
      setAllQuestions([]);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await emailTemplateService.listTemplates(formId);
      setTemplates(data);
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Cargar preguntas si no se pasaron como prop
    if (questions.length === 0) {
      loadFormQuestions();
    } else {
      setAllQuestions(questions);
    }
  }, [formId]);

  const openNew = () =>
    setModal({ open: true, template: { ...EMPTY_TEMPLATE } });

  const openEdit = (t: EmailTemplate) =>
    setModal({ open: true, template: { ...t } });

  const handleSave = async (data: any) => {
    setSaving(true);
    try {
      if (modal.template?.id) {
        const updated = await emailTemplateService.updateTemplate(modal.template.id, data);
        setTemplates(ts => ts.map(t => (t.id === updated.id ? updated : t)));
      } else {
        const created = await emailTemplateService.createTemplate(formId, data);
        setTemplates(ts => [...ts, created]);
      }
      setModal({ open: false, template: null });
    } catch (e: any) {
      alert('Error: ' + (e?.message ?? String(e)));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (t: EmailTemplate) => {
    const updated = await emailTemplateService.updateTemplate(t.id, { isActive: !t.isActive });
    setTemplates(ts => ts.map(x => (x.id === updated.id ? updated : x)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este template? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    try {
      await emailTemplateService.deleteTemplate(id);
      setTemplates(ts => ts.filter(t => t.id !== id));
    } catch (e: any) {
      alert('Error al eliminar: ' + (e?.message ?? String(e)));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
        Cargando templates...
      </div>
    );
  }

  return (
    <div>


      {error && (
        <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      {templates.length === 0 && !loading ? (
        <EmptyState
          icon={Mail}
          title="No hay templates configurados"
          description="Crea tu primer template de email para enviar correos automáticos al recibir respuestas."
          buttonText="Crear primer template"
          onButtonClick={openNew}
          buttonIcon={Plus}
          primaryColor={colors.primaryColor}
        />
      ) : !loading && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: colors.primaryColor }}
            >
              <Plus className="w-4 h-4" />
              Nuevo template
            </button>
          </div>
          {templates.map(t => {
            const triggerLabels = t.rules.map(r =>
              r.trigger === 'ON_FORM_SUBMIT' ? 'Al enviar' : `Recordatorio (${r.reminderOffsetMinutes ?? 0} min)`
            );

            return (
              <div
                key={t.id}
                className={`border rounded-xl p-4 flex items-center justify-between gap-4 ${
                  t.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-70'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{t.name}</span>
                    {t.isActive ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Activo</span>
                    ) : (
                      <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>
                    )}
                    {triggerLabels.map((label, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{t.subject}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(t)}
                    className="text-gray-400 hover:text-gray-700"
                    title={t.isActive ? 'Desactivar' : 'Activar'}
                  >
                    {t.isActive
                      ? <ToggleRight className="w-5 h-5 text-green-500" />
                      : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="text-gray-400 hover:text-blue-600"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal.open && modal.template && (
        <TemplateModal
          template={modal.template as any}
          questions={allQuestions}
          onClose={() => setModal({ open: false, template: null })}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
