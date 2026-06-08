import { useEffect, useState } from 'react';
import { AlertCircle, FileQuestion } from 'lucide-react';
import { formService } from '../../lib/formService';
import type { Form, SectionInput } from '../../lib/types';
import FormQuestionsEditor from './FormQuestionsEditor';
import FormSubpageHeader from './FormSubpageHeader';

interface FormQuestionsEditorLoaderProps {
  formId: string;
}

export default function FormQuestionsEditorLoader({ formId }: FormQuestionsEditorLoaderProps) {
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

  const sortedVersions = [...(form.versions ?? [])].sort((a: any, b: any) => b.version - a.version);
  const latestVersion =
    sortedVersions.find((version) =>
      version.sections?.some((section) => section.questions && section.questions.length > 0)
    ) || sortedVersions[0];
  const sections: SectionInput[] = latestVersion
    ? latestVersion.sections.map((section) => ({
        title: section.title,
        description: section.description,
        questions: section.questions.map((question) => ({
          id: question.id,
          type: question.type,
          text: question.text,
          placeholder: question.placeholder,
          helpText: question.helpText,
          isRequired: question.isRequired,
          allowedFileTypes: question.allowedFileTypes,
          maxFileSize: question.maxFileSize,
          textValidation: (question as any).textValidation,
          conditionalLogic: question.conditionalLogic,
          options: question.options.map((opt) => ({ text: opt.text }))
        }))
      }))
    : [];

  return (
    <div className="space-y-0">
      <FormSubpageHeader
        formId={formId}
        formTitle={form.title}
        title="Preguntas"
        description="Crea y edita las secciones y preguntas del formulario"
        icon={FileQuestion}
        currentSection="questions"
        showExamSection={form.formType === 'EXAM_REGISTRATION'}
      />
      <FormQuestionsEditor
        formId={formId}
        title={form.title}
        description={form.description}
        templateId={form.templateId}
        sections={sections}
      />
    </div>
  );
}
