import { useState, useEffect } from 'react';
import { formService } from '../../lib/formService';
import { FormEditor } from './';
import { AlertCircle } from 'lucide-react';
import type { Form, SectionInput } from '../../lib/types';

interface FormEditorLoaderProps {
  formId: string;
}

export default function FormEditorLoader({ formId }: FormEditorLoaderProps) {
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

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 flex items-start">
        <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 flex items-start">
        <AlertCircle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-700">Formulario no encontrado</div>
      </div>
    );
  }

  // Obtener la última versión
  const latestVersion = form.versions?.[0];
  
  if (!latestVersion) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 flex items-start">
        <AlertCircle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-700">No se encontró ninguna versión del formulario</div>
      </div>
    );
  }

  // Convertir la versión a formato de entrada
  const initialData = {
    title: form.title,
    description: form.description,
    sections: latestVersion.sections.map(section => ({
      title: section.title,
      description: section.description,
      questions: section.questions.map(question => ({
        type: question.type,
        text: question.text,
        placeholder: question.placeholder,
        helpText: question.helpText,
        isRequired: question.isRequired,
        options: question.options.map(opt => ({ text: opt.text }))
      }))
    })) as SectionInput[]
  };

  return <FormEditor formId={formId} initialData={initialData} />;
}
