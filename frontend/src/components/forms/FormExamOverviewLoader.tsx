import { useEffect, useState } from 'react';
import { AlertCircle, Info, ClipboardCheck, Save, CheckCircle } from 'lucide-react';
import { formService } from '../../lib/formService';
import { api } from '../../lib/api';
import type { Form, SimpleCondition } from '../../lib/types';
import FormSubpageHeader from './FormSubpageHeader';
import RegistrationConditionEditor from './RegistrationConditionEditor';

interface FormExamOverviewLoaderProps {
  formId: string;
}

interface ExamOption {
  id: string;
  title: string;
}

const getBestVersion = (form: Form) => {
  // Devuelve la versión más reciente que tenga secciones con preguntas,
  // o la versión más reciente en general si ninguna tiene preguntas
  const versionWithQuestions = form.versions?.find((version: any) =>
    version.sections?.some((section: any) => section.questions && section.questions.length > 0)
  );
  return versionWithQuestions || form.versions?.[0];
};

export default function FormExamOverviewLoader({ formId }: FormExamOverviewLoaderProps) {
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableExams, setAvailableExams] = useState<ExamOption[]>([]);

  // Campos editables
  const [linkedExamId, setLinkedExamId] = useState('');
  const [emailQuestionId, setEmailQuestionId] = useState('');
  const [nameQuestionId, setNameQuestionId] = useState('');
  const [allowExemption, setAllowExemption] = useState(false);
  const [registrationCondition, setRegistrationCondition] = useState<SimpleCondition | undefined>(undefined);

  useEffect(() => {
    loadForm();
    loadExams();
  }, [formId]);

  const loadForm = async () => {
    try {
      setLoading(true);
      const data = await formService.getFormById(formId);
      setForm(data);
      setLinkedExamId(data.linkedExamId || '');
      setEmailQuestionId(data.emailQuestionId || '');
      setNameQuestionId(data.nameQuestionId || '');
      setAllowExemption(data.allowExemption || false);
      setRegistrationCondition((data as any).registrationCondition || undefined);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar formulario');
    } finally {
      setLoading(false);
    }
  };

  const loadExams = async () => {
    try {
      const data = await api.get<any[]>('/exams?limit=100');
      const exams = Array.isArray(data) ? data : ((data as any).exams || (data as any).data || []);
      const privateExams = exams.filter((e: any) => e.accessType === 'PRIVATE');
      setAvailableExams(privateExams.map((e: any) => ({ id: e.id, title: e.title })));
    } catch {
      setAvailableExams([]);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const baseVersion = getBestVersion(form);
      const latestSections = (baseVersion?.sections || []).map((s: any) => ({
        title: s.title,
        description: s.description,
        questions: (s.questions || []).map((q: any) => ({
          id: q.id,
          type: q.type,
          text: q.text,
          placeholder: q.placeholder,
          helpText: q.helpText,
          isRequired: q.isRequired,
          allowedFileTypes: q.allowedFileTypes,
          maxFileSize: q.maxFileSize,
          conditionalLogic: q.conditionalLogic,
          options: (q.options || []).map((opt: any) => ({ text: opt.text })),
        })),
      }));
      await formService.updateForm(formId, {
        title: form.title,
        description: form.description,
        templateId: form.templateId || 'modern',
        formType: form.formType,
        linkedExamId,
        emailQuestionId,
        nameQuestionId,
        allowExemption,
        registrationCondition,
        sections: latestSections,
      } as any);
      setSuccess('Configuración guardada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="rounded-lg bg-red-50 p-4 flex items-start">
        <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!form || form.formType !== 'EXAM_REGISTRATION') {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 flex items-start">
        <Info className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-700">Este formulario no es de tipo registro de examen.</div>
      </div>
    );
  }

  const bestVersion = getBestVersion(form);
  // Obtener preguntas, incluso si bestVersion no tiene secciones
  // Buscamos en la primera versión que tenga preguntas
  const allQuestions = bestVersion?.sections?.flatMap((s: any) => s.questions) || 
    form.versions?.flatMap((v: any) => v.sections?.flatMap((s: any) => s.questions) || []) || [];

  return (
    <div className="space-y-0">
      <FormSubpageHeader
        formId={formId}
        formTitle={form.title}
        title="Examen"
        description="Configuración del registro vinculado al examen"
        icon={ClipboardCheck}
        currentSection="exam"
        showExamSection
      />

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Configuración de examen</h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 p-3 flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Examen vinculado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Examen a vincular *</label>
          {availableExams.length === 0 ? (
            <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
              No hay exámenes privados disponibles. Crea un examen primero.
            </div>
          ) : (
            <select
              value={linkedExamId}
              onChange={(e) => setLinkedExamId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="">-- Selecciona un examen --</option>
              {availableExams.map(exam => (
                <option key={exam.id} value={exam.id}>{exam.title}</option>
              ))}
            </select>
          )}
        </div>

        {/* Mapeo email / nombre */}
        {allQuestions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ¿Qué pregunta contiene el <strong>email</strong>?
              </label>
              <select
                value={emailQuestionId}
                onChange={e => setEmailQuestionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">-- Selecciona --</option>
                {allQuestions.map((q: any) => (
                  <option key={q.id} value={q.id}>{q.text || '(sin texto)'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ¿Qué pregunta contiene el <strong>nombre</strong>?
              </label>
              <select
                value={nameQuestionId}
                onChange={e => setNameQuestionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">-- Selecciona --</option>
                {allQuestions.map((q: any) => (
                  <option key={q.id} value={q.id}>{q.text || '(sin texto)'}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Exención */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAllowExemption(!allowExemption)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${allowExemption ? 'bg-purple-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${allowExemption ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm text-gray-700">Permitir solicitud de exención (sube archivo)</span>
        </div>

        {/* Condición de registro */}
        {allQuestions.length > 0 && (
          <div className="border-t border-gray-100 pt-5">
            <RegistrationConditionEditor
              condition={registrationCondition}
              onChange={setRegistrationCondition}
              allQuestions={allQuestions}
            />
          </div>
        )}
      </div>
    </div>
  );
}

