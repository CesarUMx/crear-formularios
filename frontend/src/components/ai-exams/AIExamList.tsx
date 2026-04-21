import { useState, useEffect, useMemo } from 'react';
import { aiExamService } from '../../lib/aiExamService';
import type { AIExam } from '../../lib/aiExamService';
import { useToast, ToastContainer, DeleteDialog, useDialog, PageHeader, EmptyState, ShareExamModal } from '../common';
import { useColors } from '../../hooks/useColors';
import ManageStudentsModal from './ManageStudentsModal';
import {
  Plus, FileText, Users, Calendar, ToggleLeft, ToggleRight, Trash2, Edit,
  BarChart3, AlertCircle, Brain, Clock, Target, ExternalLink, Copy, Check,
  UserCog, MessageSquare, Search, Globe, Lock, Share2,
} from 'lucide-react';

type AccessFilter = 'all' | 'PUBLIC' | 'PRIVATE';
type StatusFilter = 'all' | 'active' | 'inactive';

export default function AIExamList() {
  const [exams, setExams] = useState<AIExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examToDelete, setExamToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [copiedExamId, setCopiedExamId] = useState<string | null>(null);
  const [managingStudents, setManagingStudents] = useState<{ id: string; title: string } | null>(null);
  const [sharingExam, setSharingExam] = useState<{ id: string; title: string } | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const toast = useToast();
  const deleteDialog = useDialog();
  const colors = useColors();

  useEffect(() => { loadExams(); }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await aiExamService.getAIExams();
      setExams(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar examenes');
      toast.error('Error', 'No se pudieron cargar los examenes');
    } finally { setLoading(false); }
  };

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      if (searchQuery && !exam.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (accessFilter !== 'all' && exam.accessType !== accessFilter) return false;
      if (statusFilter === 'active' && !exam.isActive) return false;
      if (statusFilter === 'inactive' && exam.isActive) return false;
      return true;
    });
  }, [exams, searchQuery, accessFilter, statusFilter]);

  const counts = useMemo(() => ({
    public: exams.filter(e => e.accessType === 'PUBLIC').length,
    private: exams.filter(e => e.accessType === 'PRIVATE').length,
    active: exams.filter(e => e.isActive).length,
    inactive: exams.filter(e => !e.isActive).length,
  }), [exams]);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      if (!currentStatus) {
        await aiExamService.publishAIExam(id);
        toast.success('Examen publicado', 'El examen esta disponible para los estudiantes');
      } else {
        await aiExamService.updateAIExam(id, { isActive: false } as any);
        toast.success('Examen desactivado', 'No acepta nuevos intentos');
      }
      await loadExams();
    } catch (err) {
      toast.error('Error al cambiar estado', err instanceof Error ? err.message : 'Error inesperado');
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    setExamToDelete({ id, title });
    deleteDialog.open();
  };

  const handleDeleteConfirm = async () => {
    if (!examToDelete) return;
    setDeleteLoading(true);
    try {
      await aiExamService.deleteAIExam(examToDelete.id);
      await loadExams();
      toast.success('Examen eliminado', `"${examToDelete.title}" fue eliminado`);
      deleteDialog.close();
      setExamToDelete(null);
    } catch (err) {
      toast.error('Error al eliminar', err instanceof Error ? err.message : 'Error inesperado');
    } finally { setDeleteLoading(false); }
  };

  const handleCopyLink = async (exam: AIExam) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/ai-exam/${exam.slug}`);
      setCopiedExamId(exam.id);
      setTimeout(() => setCopiedExamId(null), 2000);
      toast.success('Enlace copiado', 'El enlace fue copiado al portapapeles');
    } catch {
      toast.error('Error', 'No se pudo copiar el enlace');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando examenes con IA...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Brain}
        title="Examenes con IA"
        description="Genera examenes automaticamente con inteligencia artificial"
        buttonText={exams.length > 0 ? "Nuevo Examen IA" : undefined}
        onButtonClick={exams.length > 0 ? () => window.location.href = '/admin/ai-exams/new' : undefined}
        buttonIcon={Plus}
        primaryColor={colors.primaryColor}
      />

      {exams.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No hay examenes con IA"
          description="Comienza creando tu primer examen generado con inteligencia artificial"
          buttonText="Crear Examen IA"
          onButtonClick={() => window.location.href = '/admin/ai-exams/new'}
          buttonIcon={Plus}
          primaryColor={colors.primaryColor}
        />
      ) : (
        <>
          {/* Barra de busqueda y filtros */}
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

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                <button onClick={() => setAccessFilter('all')} className={`px-3 py-1 rounded-md text-xs font-medium transition ${accessFilter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
                  Todos
                </button>
                <button onClick={() => setAccessFilter('PUBLIC')} className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${accessFilter === 'PUBLIC' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
                  <Globe className="w-3 h-3" /> Publicos <span className="text-gray-400">({counts.public})</span>
                </button>
                <button onClick={() => setAccessFilter('PRIVATE')} className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${accessFilter === 'PRIVATE' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
                  <Lock className="w-3 h-3" /> Privados <span className="text-gray-400">({counts.private})</span>
                </button>
              </div>

              <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 rounded-md text-xs font-medium transition ${statusFilter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
                  Todos
                </button>
                <button onClick={() => setStatusFilter('active')} className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${statusFilter === 'active' ? 'bg-white shadow text-green-700' : 'text-gray-600 hover:text-gray-900'}`}>
                  Publicados <span className="text-gray-400">({counts.active})</span>
                </button>
                <button onClick={() => setStatusFilter('inactive')} className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1 ${statusFilter === 'inactive' ? 'bg-white shadow text-gray-700' : 'text-gray-600 hover:text-gray-900'}`}>
                  Borradores <span className="text-gray-400">({counts.inactive})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Lista */}
          {filteredExams.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No se encontraron examenes con esos filtros</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExams.map((exam) => (
                <div key={exam.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow w-full">
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleStatus(exam.id, exam.isActive)}
                      className="flex-shrink-0"
                      title={exam.isActive ? 'Desactivar' : 'Publicar'}
                    >
                      {exam.isActive ? (
                        <ToggleRight className="w-7 h-7 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-gray-400" />
                      )}
                    </button>

                    {/* Titulo y badges */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{exam.title}</h3>
                        {exam.isActive ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 flex-shrink-0">Publicado</span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 flex-shrink-0">Borrador</span>
                        )}
                        {exam.accessType === 'PRIVATE' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 flex-shrink-0">Privado</span>
                        )}
                      </div>
                      {exam.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{exam.description}</p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-5 flex-shrink-0 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5" title="Preguntas en pool">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{exam.totalQuestionsInPool || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Intentos realizados">
                        <Users className="w-3.5 h-3.5" />
                        <span>{exam._count?.attempts || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Preguntas por intento">
                        <Target className="w-3.5 h-3.5" />
                        <span>{exam.questionsPerAttempt}</span>
                      </div>
                      {exam.timeLimit && (
                        <div className="flex items-center gap-1.5" title="Tiempo limite">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{exam.timeLimit}m</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5" title="Ultima actualizacion">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(exam.updatedAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Link buttons */}
                    {exam.isActive && (
                      <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleCopyLink(exam)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition" title="Copiar enlace">
                          {copiedExamId === exam.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button onClick={() => window.open(`${window.location.origin}/ai-exam/${exam.slug}`, '_blank')} className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 transition" title="Abrir enlace publico">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Separador */}
                    <div className="hidden sm:block w-px h-6 bg-gray-200 flex-shrink-0"></div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {exam.accessType === 'PRIVATE' && (
                        <button onClick={() => setManagingStudents({ id: exam.id, title: exam.title })} className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition" title="Gestionar estudiantes">
                          <UserCog className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => setSharingExam({ id: exam.id, title: exam.title })} className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition" title="Compartir">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <a href={`/admin/ai-exams/${exam.id}/edit`} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition" title="Editar">
                        <Edit className="w-4 h-4" />
                      </a>
                      <a href={`/admin/ai-exams/${exam.id}/results`} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition" title="Resultados">
                        <BarChart3 className="w-4 h-4" />
                      </a>
                      <a href={`/admin/ai-exams/${exam.id}/reports`} className="p-2 rounded-lg text-orange-600 hover:bg-orange-50 transition" title="Reportes">
                        <MessageSquare className="w-4 h-4" />
                      </a>
                      <button onClick={() => handleDeleteClick(exam.id, exam.title)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition" title="Eliminar">
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

      <DeleteDialog isOpen={deleteDialog.isOpen} onClose={deleteDialog.close} onConfirm={handleDeleteConfirm} itemName={examToDelete?.title || ''} loading={deleteLoading} />
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />

      {managingStudents && (
        <ManageStudentsModal
          examId={managingStudents.id}
          examTitle={managingStudents.title}
          examSlug={exams.find(e => e.id === managingStudents.id)?.slug || ''}
          isOpen={true}
          onClose={() => setManagingStudents(null)}
        />
      )}

      {sharingExam && (
        <ShareExamModal
          examId={sharingExam.id}
          examTitle={sharingExam.title}
          onClose={() => setSharingExam(null)}
          getShares={(id) => aiExamService.getShares(id)}
          getAvailableUsers={(id) => aiExamService.getAvailableUsers(id)}
          shareExam={(id, userId, perm) => aiExamService.shareExam(id, userId, perm)}
          updatePermission={(id, userId, perm) => aiExamService.updateSharePermission(id, userId, perm)}
          unshareExam={(id, userId) => aiExamService.unshareExam(id, userId)}
        />
      )}
    </div>
  );
}
