import { useState, useEffect } from 'react';
import { formService } from '../../lib/formService';
import type { Form } from '../../lib/types';
import ShareFormModal from './ShareFormModal';
import { useToast, ToastContainer, DeleteDialog, useDialog, PageHeader, EmptyState } from '../common';
import { useColors } from '../../hooks/useColors';
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
  const [formToDelete, setFormToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const toast = useToast();
  const deleteDialog = useDialog();
  const colors = useColors();

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
      toast.success(
        currentStatus ? 'Formulario desactivado' : 'Formulario activado',
        'El estado se actualizó correctamente'
      );
    } catch (err) {
      toast.error(
        'Error al cambiar estado',
        err instanceof Error ? err.message : 'Ocurrió un error inesperado'
      );
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    setFormToDelete({ id, title });
    deleteDialog.open();
  };

  const handleDeleteConfirm = async () => {
    if (!formToDelete) return;
    
    setDeleteLoading(true);
    try {
      await formService.deleteForm(formToDelete.id);
      await loadForms();
      toast.success('Formulario eliminado', `"${formToDelete.title}" fue eliminado correctamente`);
      deleteDialog.close();
      setFormToDelete(null);
    } catch (err) {
      toast.error(
        'Error al eliminar formulario',
        err instanceof Error ? err.message : 'Ocurrió un error inesperado'
      );
    } finally {
      setDeleteLoading(false);
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
      toast.success('Enlace copiado', 'El enlace público fue copiado al portapapeles');
    } catch (err) {
      toast.error('Error al copiar enlace', 'No se pudo copiar el enlace al portapapeles');
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
      <PageHeader
        icon={FileText}
        title="Mis Formularios"
        description="Crea, edita y gestiona tus formularios"
        buttonText={forms.length > 0 ? "Nuevo Formulario" : undefined}
        onButtonClick={forms.length > 0 ? () => window.location.href = '/admin/forms/new' : undefined}
        buttonIcon={Plus}
        primaryColor={colors.primaryColor}
      />

      {/* Lista de formularios */}
      {forms.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay formularios"
          description="Comienza creando tu primer formulario"
          buttonText="Crear Formulario"
          onButtonClick={() => window.location.href = '/admin/forms/new'}
          buttonIcon={Plus}
          primaryColor={colors.primaryColor}
        />
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {forms.map((form) => (
            <div
              key={form.id}
              className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow min-w-[280px] w-full"
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
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 min-h-[40px] min-w-[80px] text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                        title="Copiar enlace"
                      >
                        {copiedFormId === form.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="whitespace-nowrap">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span className="whitespace-nowrap">Copiar</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenPublic(form.slug)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 min-h-[40px] min-w-[80px] text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition"
                        title="Abrir en nueva pestaña"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="whitespace-nowrap">Abrir</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-2">
                <a
                  href={`/admin/forms/${form.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] min-w-[70px] text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Editar</span>
                </a>
                <button
                  onClick={() => setShareModalForm({ id: form.id, title: form.title })}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] min-w-[70px] text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition"
                  title="Compartir"
                >
                  <Share2 className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Compartir</span>
                </button>
                <a
                  href={`/admin/forms/${form.id}/responses`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] min-w-[70px] text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <BarChart3 className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Ver</span>
                </a>
                <button
                  onClick={() => handleDeleteClick(form.id, form.title)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] min-w-[45px] text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4 flex-shrink-0" />
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

      {/* Delete Dialog */}
      <DeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.close}
        onConfirm={handleDeleteConfirm}
        itemName={formToDelete?.title || ''}
        loading={deleteLoading}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
