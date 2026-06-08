import { useState, useEffect, useMemo } from 'react';
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
  Check,
  Files,
  Search,
  ClipboardList,
  Pencil,
} from 'lucide-react';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function FormList() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareModalForm, setShareModalForm] = useState<{ id: string; title: string } | null>(null);
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);
  const [formToDelete, setFormToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [duplicatingFormId, setDuplicatingFormId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [renamingFormId, setRenamingFormId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);

  const toast = useToast();
  const deleteDialog = useDialog();
  const colors = useColors();

  useEffect(() => { loadForms(); }, []);

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

  const filteredForms = useMemo(() => {
    return forms.filter(form => {
      if (searchQuery && !form.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter === 'active' && !form.isActive) return false;
      if (statusFilter === 'inactive' && form.isActive) return false;
      return true;
    });
  }, [forms, searchQuery, statusFilter]);

  const counts = useMemo(() => ({
    active: forms.filter(f => f.isActive).length,
    inactive: forms.filter(f => !f.isActive).length,
  }), [forms]);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await formService.toggleFormStatus(id, !currentStatus);
      await loadForms();
      toast.success(
        currentStatus ? 'Formulario desactivado' : 'Formulario activado',
        'El estado se actualizó correctamente'
      );
    } catch (err) {
      toast.error('Error al cambiar estado', err instanceof Error ? err.message : 'Error inesperado');
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
      toast.error('Error al eliminar', err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCopyLink = async (form: Form) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${form.slug}`);
      setCopiedFormId(form.id);
      setTimeout(() => setCopiedFormId(null), 2000);
      toast.success('Enlace copiado', 'El enlace público fue copiado al portapapeles');
    } catch {
      toast.error('Error al copiar enlace', 'No se pudo copiar el enlace');
    }
  };

  const handleDuplicate = async (id: string, title: string) => {
    setDuplicatingFormId(id);
    try {
      const result = await formService.duplicateForm(id);
      await loadForms();
      toast.success('Formulario duplicado', `"${title}" fue clonado como "${result.form.title}"`);
    } catch (err) {
      toast.error('Error al duplicar', err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setDuplicatingFormId(null);
    }
  };

  const handleStartRename = (form: Form) => {
    setRenamingFormId(form.id);
    setRenameValue(form.title);
  };

  const handleRenameSubmit = async (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    setRenameSaving(true);
    try {
      await formService.renameForm(id, trimmed);
      await loadForms();
      toast.success('Formulario renombrado', 'El nombre fue actualizado');
    } catch (err) {
      toast.error('Error al renombrar', err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setRenameSaving(false);
      setRenamingFormId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Mis Formularios"
        description="Crea, edita y gestiona tus formularios"
        buttonText={forms.length > 0 ? 'Nuevo Formulario' : undefined}
        onButtonClick={forms.length > 0 ? () => window.location.href = '/admin/forms/new' : undefined}
        buttonIcon={Plus}
        primaryColor={colors.primaryColor}
      />

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
        <>
          {/* Barra de búsqueda y filtros */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 w-fit">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${statusFilter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${statusFilter === 'active' ? 'bg-white shadow text-green-700' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Activos <span className="text-gray-400">({counts.active})</span>
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${statusFilter === 'inactive' ? 'bg-white shadow text-gray-700' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Inactivos <span className="text-gray-400">({counts.inactive})</span>
              </button>
            </div>
          </div>

          {/* Lista de filas */}
          {filteredForms.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No se encontraron formularios con esos filtros</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredForms.map((form) => (
                <div key={form.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4 px-5 py-4">

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleStatus(form.id, form.isActive)}
                      className="flex-shrink-0"
                      title={form.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {form.isActive
                        ? <ToggleRight className="w-7 h-7 text-green-600" />
                        : <ToggleLeft className="w-7 h-7 text-gray-400" />}
                    </button>

                    {/* Título + badges */}
                    <div className="flex-1 min-w-0">
                      {renamingFormId === form.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSubmit(form.id);
                              if (e.key === 'Escape') setRenamingFormId(null);
                            }}
                            onBlur={() => handleRenameSubmit(form.id)}
                            disabled={renameSaving}
                            className="flex-1 text-sm font-semibold border border-blue-400 rounded px-2 py-0.5 focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-0"
                          />
                          {renameSaving && <span className="text-xs text-gray-400">Guardando...</span>}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{form.title}</h3>
                          <button
                            onClick={() => handleStartRename(form)}
                            className="p-0.5 rounded text-gray-400 hover:text-blue-600 transition flex-shrink-0"
                            title="Renombrar"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          {form.isActive
                            ? <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 flex-shrink-0">Activo</span>
                            : <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 flex-shrink-0">Inactivo</span>
                          }
                          {form.formType === 'EXAM_REGISTRATION' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 flex-shrink-0">Registro</span>
                          )}
                        </div>
                      )}
                      {form.description && renamingFormId !== form.id && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{form.description}</p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-5 flex-shrink-0 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5" title="Respuestas">
                        <Users className="w-3.5 h-3.5" />
                        <span>{form._count?.responses ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Creado por">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[100px]">{form.createdBy.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Actualizado">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(form.updatedAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Botones de enlace público */}
                    {form.isActive && (
                      <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleCopyLink(form)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                          title="Copiar enlace público"
                        >
                          {copiedFormId === form.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => window.open(`${window.location.origin}/p/${form.slug}`, '_blank')}
                          className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 transition"
                          title="Abrir formulario público"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Separador */}
                    <div className="hidden sm:block w-px h-6 bg-gray-200 flex-shrink-0" />

                    {/* Acciones */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a
                        href={`/admin/forms/${form.id}/edit`}
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => setShareModalForm({ id: form.id, title: form.title })}
                        className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition"
                        title="Compartir"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <a
                        href={`/admin/forms/${form.id}/responses`}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                        title="Ver respuestas"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </a>
                      {form.formType === 'EXAM_REGISTRATION' && (
                        <a
                          href={`/admin/forms/${form.id}/exam`}
                          className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                          title="Configuración de examen"
                        >
                          <ClipboardList className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDuplicate(form.id, form.title)}
                        disabled={duplicatingFormId === form.id}
                        className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition disabled:opacity-40"
                        title="Duplicar formulario"
                      >
                        <Files className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(form.id, form.title)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {shareModalForm && (
        <ShareFormModal
          formId={shareModalForm.id}
          formTitle={shareModalForm.title}
          onClose={() => setShareModalForm(null)}
        />
      )}

      <DeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.close}
        onConfirm={handleDeleteConfirm}
        itemName={formToDelete?.title || ''}
        loading={deleteLoading}
      />

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
