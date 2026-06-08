import { useState, useRef } from 'react';
import { formService } from '../../lib/formService';
import type { FormType, SectionInput } from '../../lib/types';
import { TemplateSelector } from '../templates';
import { useColors } from '../../hooks/useColors';
import {
  Save,
  AlertCircle,
  CheckCircle,
  ClipboardList,
  BookOpen,
  ImagePlus,
  X,
} from 'lucide-react';

interface FormConfigEditorProps {
  formId: string;
  initialData: {
    title: string;
    description?: string;
    templateId?: string;
    formType?: FormType;
    coverImage?: string;
    sections: SectionInput[];
  };
}

export default function FormConfigEditor({ formId, initialData }: FormConfigEditorProps) {
  const colors = useColors();
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [templateId, setTemplateId] = useState(initialData.templateId || 'modern');
  const [formType, setFormType] = useState<FormType>(initialData.formType || 'STANDARD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Imagen de portada
  const [coverImage, setCoverImage] = useState(initialData.coverImage || '');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverError('');
    setCoverUploading(true);
    try {
      const result = await formService.uploadCoverImage(formId, file);
      setCoverImage(result.coverImageUrl);
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleRemoveCoverImage = async () => {
    setCoverError('');
    try {
      await formService.deleteCoverImage(formId);
      setCoverImage('');
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : 'Error al eliminar imagen');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await formService.updateFormConfig(formId, {
        title,
        description,
        templateId,
        formType,
      });
      setSuccess('Configuración guardada correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}

      {/* Tipo de Formulario */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Tipo de Formulario</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormType('STANDARD')}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${
              formType === 'STANDARD'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <ClipboardList className="w-6 h-6 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium text-sm">Formulario Estándar</div>
              <div className="text-xs text-gray-500">Encuestas y captación de datos</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFormType('EXAM_REGISTRATION')}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${
              formType === 'EXAM_REGISTRATION'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <BookOpen className="w-6 h-6 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium text-sm">Registro de Examen</div>
              <div className="text-xs text-gray-500">Inscripción con selección de horario</div>
            </div>
          </button>
        </div>

        {formType === 'EXAM_REGISTRATION' && (
          <p className="text-sm text-purple-700 bg-purple-50 rounded-lg px-4 py-3">
            La vinculación al examen y mapeo de campos se configuran en la pestaña <strong>Examen</strong>.
          </p>
        )}
      </div>

      {/* Información General */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Información del Formulario</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Encuesta de Satisfacción"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Descripción (Opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Describe el propósito de este formulario..."
          />
        </div>

        {/* Imagen de portada */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Imagen de Portada (Opcional)</label>
          {coverError && <p className="text-red-600 text-xs mb-2">{coverError}</p>}
          {coverImage ? (
            <div className="relative w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={coverImage.startsWith('http') ? coverImage : `http://localhost:3000${coverImage}`}
                alt="Portada del formulario"
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                  className="p-1.5 rounded-lg bg-white shadow text-blue-600 hover:bg-blue-50 transition"
                  title="Cambiar imagen"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRemoveCoverImage}
                  disabled={coverUploading}
                  className="p-1.5 rounded-lg bg-white shadow text-red-600 hover:bg-red-50 transition"
                  title="Eliminar imagen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <ImagePlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">La imagen se mostrará en la parte superior del formulario público</p>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50"
              >
                {coverUploading ? 'Subiendo...' : 'Seleccionar imagen'}
              </button>
              <p className="text-xs text-gray-400 mt-2">JPG, PNG, WebP — máx. 500 KB</p>
              <p className="text-xs text-blue-600 mt-1 font-medium">Medida recomendada: 1200 × 300 px (proporción 4:1)</p>
            </div>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleCoverImageChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Selector de Plantilla */}
      <TemplateSelector selectedTemplateId={templateId} onSelect={setTemplateId} />

      {/* Botón guardar */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium transition disabled:opacity-50"
          style={{ backgroundColor: colors.primaryColor }}
        >
          <Save className="w-4 h-4" />
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </form>
  );
}
