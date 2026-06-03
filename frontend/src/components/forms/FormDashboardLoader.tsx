import { useEffect, useState } from 'react';
import { AlertCircle, BarChart3, FileQuestion, Mail, PanelsTopLeft, ClipboardCheck, Zap } from 'lucide-react';
import { formService } from '../../lib/formService';
import type { Form } from '../../lib/types';

interface FormDashboardLoaderProps {
  formId: string;
}

export default function FormDashboardLoader({ formId }: FormDashboardLoaderProps) {
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadForm();
  }, [formId]);

  const loadForm = async () => {
    try {
      setLoading(true);
      const data = await formService.getFormById(formId);
      setForm(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar formulario');
    } finally {
      setLoading(false);
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

  if (error || !form) {
    return (
      <div className="rounded-lg bg-red-50 p-4 flex items-start">
        <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-700">{error || 'Formulario no encontrado'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{form.title}</h1>
            {form.description && <p className="mt-2 text-gray-600">{form.description}</p>}
            <p className="mt-3 text-sm text-gray-500">
              Tipo: {form.formType === 'EXAM_REGISTRATION' ? 'Registro de Examen' : 'Estándar'}
            </p>
          </div>
          <a href="/admin" className="text-gray-500 hover:text-gray-700 font-medium">
            Volver
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <a href={`/admin/forms/${formId}/questions`} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition block">
          <FileQuestion className="w-8 h-8 text-blue-600 mb-3" />
          <h2 className="font-semibold text-gray-900 mb-1">Preguntas</h2>
          <p className="text-sm text-gray-600">Crea y edita preguntas</p>
        </a>

        {form.formType === 'EXAM_REGISTRATION' && (
          <a href={`/admin/forms/${formId}/exam`} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition block">
            <ClipboardCheck className="w-8 h-8 text-purple-600 mb-3" />
            <h2 className="font-semibold text-gray-900 mb-1">Examen</h2>
            <p className="text-sm text-gray-600">Vinculación y mapeos</p>
          </a>
        )}

        <a href={`/admin/forms/${formId}/emails`} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition block">
          <Mail className="w-8 h-8 text-indigo-600 mb-3" />
          <h2 className="font-semibold text-gray-900 mb-1">Emails</h2>
          <p className="text-sm text-gray-600">Plantillas automáticas</p>
        </a>

        <a href={`/admin/forms/${formId}/responses`} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition block">
          <PanelsTopLeft className="w-8 h-8 text-teal-600 mb-3" />
          <h2 className="font-semibold text-gray-900 mb-1">Respuestas</h2>
          <p className="text-sm text-gray-600">Ver y exportar</p>
        </a>

        <a href={`/admin/forms/${formId}/statistics`} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition block">
          <BarChart3 className="w-8 h-8 text-emerald-600 mb-3" />
          <h2 className="font-semibold text-gray-900 mb-1">Estadísticas</h2>
          <p className="text-sm text-gray-600">Análisis de resultados</p>
        </a>

        <a href={`/admin/forms/${formId}/hubspot`} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition block">
          <Zap className="w-8 h-8 text-orange-500 mb-3" />
          <h2 className="font-semibold text-gray-900 mb-1">HubSpot</h2>
          <p className="text-sm text-gray-600">Sincronización CRM</p>
        </a>
      </div>
    </div>
  );
}
