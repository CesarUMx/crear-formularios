import { useState, useEffect } from 'react';
import { formService } from '../../lib/formService';
import type { Form } from '../../lib/types';
import ShareFormModal from './ShareFormModal';
import { 
  Plus, 
  FileText, 
  Users, 
  Calendar, 
  ToggleLeft, 
  ToggleRight,
  Trash2,
  Edit,
  Share2,
  BarChart3,
  AlertCircle,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

export default function FormList() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareModalForm, setShareModalForm] = useState<{ id: string; title: string } | null>(null);
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      const data = await formService.getForms();
      setForms(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar formularios');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await formService.toggleFormStatus(id, !currentStatus);
      await loadForms();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${title}"?`)) return;

    try {
      await formService.deleteForm(id);
      await loadForms();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar formulario');
    }
  };

  const getPublicUrl = (slug: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/p/${slug}`;
  };

  const handleCopyLink = async (form: Form) => {
    try {
      const url = getPublicUrl(form.slug);
      await navigator.clipboard.writeText(url);
      setCopiedFormId(form.id);
      setTimeout(() => setCopiedFormId(null), 2000);
    } catch (err) {
      alert('Error al copiar enlace');
    }
  };

  const handleOpenPublic = (slug: string) => {
    const url = getPublicUrl(slug);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando formularios...</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <p className="text-gray-600">Crea, edita y gestiona tus formularios</p>
        </div>
        <a
          href="/admin/forms/new"
          style={{ backgroundColor: 'var(--color-secondary)' }}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg hover:opacity-90 transition-all shadow-lg font-medium"
        >
          <Plus className="w-5 h-5" />
          Nuevo Formulario
        </a>
      </div>

      {/* Lista de formularios */}
      {forms.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay formularios</h3>
          <p className="text-gray-600 mb-6">Comienza creando tu primer formulario</p>
          <a
            href="/admin/forms/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Crear Formulario
          </a>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <div
              key={form.id}
              className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
            >
              {/* Card Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {form.title}
                  </h3>
                  <button
                    onClick={() => handleToggleStatus(form.id, form.isActive)}
                    className="flex-shrink-0 ml-2"
                    title={form.isActive ? 'Desactivar' : 'Activar'}
                  >
                    {form.isActive ? (
                      <ToggleRight className="w-6 h-6 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-400" />
                    )}
                  </button>
                </div>
                {form.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{form.description}</p>
                )}
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-3">
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{form._count?.responses || 0} respuestas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>v{form._count?.versions || 1}</span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(form.updatedAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                {/* Creator */}
                <div className="text-xs text-gray-500">
                  Por: <span className="font-medium">{form.createdBy.name}</span>
                </div>

                {/* Status Badge */}
                <div>
                  {form.isActive ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactivo
                    </span>
                  )}
                </div>

                {/* Public Link */}
                {form.isActive && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">Enlace Público:</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyLink(form)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                        title="Copiar enlace"
                      >
                        {copiedFormId === form.id ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copiar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenPublic(form.slug)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition"
                        title="Abrir en nueva pestaña"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Abrir
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-2">
                <a
                  href={`/admin/forms/${form.id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </a>
                <button
                  onClick={() => setShareModalForm({ id: form.id, title: form.title })}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition"
                  title="Compartir"
                >
                  <Share2 className="w-4 h-4" />
                  Compartir
                </button>
                <a
                  href={`/admin/forms/${form.id}/responses`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <BarChart3 className="w-4 h-4" />
                  Ver
                </a>
                <button
                  onClick={() => handleDelete(form.id, form.title)}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      {shareModalForm && (
        <ShareFormModal
          formId={shareModalForm.id}
          formTitle={shareModalForm.title}
          onClose={() => setShareModalForm(null)}
        />
      )}
    </div>
  );
}
