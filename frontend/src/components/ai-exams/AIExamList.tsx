import { useState, useEffect } from 'react';
import { aiExamService } from '../../lib/aiExamService';
import type { AIExam } from '../../lib/aiExamService';
import { useToast, ToastContainer, DeleteDialog, useDialog, PageHeader, EmptyState } from '../common';
import { useColors } from '../../hooks/useColors';
import ManageStudentsModal from './ManageStudentsModal';
import {
  Plus,
  FileText,
  Users,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit,
  BarChart3,
  AlertCircle,
  Brain,
  Clock,
  Target,
  ExternalLink,
  Copy,
  Check,
  UserCog,
  MessageSquare,
} from 'lucide-react';

export default function AIExamList() {
  const [exams, setExams] = useState<AIExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examToDelete, setExamToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [copiedExamId, setCopiedExamId] = useState<string | null>(null);
  const [managingStudents, setManagingStudents] = useState<{ id: string; title: string } | null>(null);

  const toast = useToast();
  const deleteDialog = useDialog();
  const colors = useColors();

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await aiExamService.getAIExams();
      setExams(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar exámenes');
      toast.error('Error', 'No se pudieron cargar los exámenes');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      if (!currentStatus) {
        // Intentar publicar
        await aiExamService.publishAIExam(id);
        toast.success(
          'Examen publicado',
          'El examen está ahora disponible para los estudiantes'
        );
      } else {
        // Despublicar (desactivar)
        await aiExamService.updateAIExam(id, { isActive: false } as any);
        toast.success(
          'Examen desactivado', 
          'No acepta nuevos intentos. Los estudiantes pueden consultar sus resultados.'
        );
      }
      await loadExams();
    } catch (err) {
      toast.error(
        'Error al cambiar estado',
        err instanceof Error ? err.message : 'Ocurrió un error inesperado'
      );
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
      toast.success('Examen eliminado', `"${examToDelete.title}" fue eliminado correctamente`);
      deleteDialog.close();
      setExamToDelete(null);
    } catch (err) {
      toast.error(
        'Error al eliminar examen',
        err instanceof Error ? err.message : 'Ocurrió un error inesperado'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const getPublicUrl = (slug: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/ai-exam/${slug}`;
  };

  const handleCopyLink = async (exam: AIExam) => {
    try {
      const url = getPublicUrl(exam.slug);
      await navigator.clipboard.writeText(url);
      setCopiedExamId(exam.id);
      setTimeout(() => setCopiedExamId(null), 2000);
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
          <p className="mt-4 text-gray-600">Cargando exámenes con IA...</p>
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
        icon={Brain}
        title="Exámenes con IA"
        description="Genera exámenes automáticamente con inteligencia artificial"
        buttonText={exams.length > 0 ? "Nuevo Examen IA" : undefined}
        onButtonClick={exams.length > 0 ? () => window.location.href = '/admin/ai-exams/new' : undefined}
        buttonIcon={Plus}
        primaryColor={colors.primaryColor}
      />

      {/* Lista de exámenes */}
      {exams.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No hay exámenes con IA"
          description="Comienza creando tu primer examen generado con inteligencia artificial"
          buttonText="Crear Examen IA"
          onButtonClick={() => window.location.href = '/admin/ai-exams/new'}
          buttonIcon={Plus}
          primaryColor={colors.primaryColor}
        />
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow w-full"
            >
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Toggle Status */}
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

                {/* Title & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {exam.title}
                    </h3>
                    {/* Badges */}
                    {exam.isActive ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 flex-shrink-0">
                        Publicado
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 flex-shrink-0">
                        Borrador
                      </span>
                    )}
                    {exam.accessType === 'PRIVATE' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 flex-shrink-0">
                        Privado
                      </span>
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
                    <div className="flex items-center gap-1.5" title="Tiempo límite">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{exam.timeLimit}m</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5" title="Última actualización">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(exam.updatedAt).toLocaleDateString('es-MX', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Link buttons (when published) */}
                {exam.isActive && (
                  <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleCopyLink(exam)}
                      className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                      title="Copiar enlace"
                    >
                      {copiedExamId === exam.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenPublic(exam.slug)}
                      className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 transition"
                      title="Abrir enlace público"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Divider */}
                <div className="hidden sm:block w-px h-6 bg-gray-200 flex-shrink-0"></div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {exam.accessType === 'PRIVATE' && (
                    <button
                      onClick={() => setManagingStudents({ id: exam.id, title: exam.title })}
                      className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition"
                      title="Gestionar estudiantes"
                    >
                      <UserCog className="w-4 h-4" />
                    </button>
                  )}
                  <a
                    href={`/admin/ai-exams/${exam.id}/edit`}
                    className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </a>
                  <a
                    href={`/admin/ai-exams/${exam.id}/results`}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                    title="Resultados"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </a>
                  <a
                    href={`/admin/ai-exams/${exam.id}/reports`}
                    className="p-2 rounded-lg text-orange-600 hover:bg-orange-50 transition"
                    title="Reportes"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteClick(exam.id, exam.title)}
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

      {/* Delete Dialog */}
      <DeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.close}
        onConfirm={handleDeleteConfirm}
        itemName={examToDelete?.title || ''}
        loading={deleteLoading}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />

      {/* Modal de gestión de estudiantes */}
      {managingStudents && (
        <ManageStudentsModal
          examId={managingStudents.id}
          examTitle={managingStudents.title}
          examSlug={exams.find(e => e.id === managingStudents.id)?.slug || ''}
          isOpen={true}
          onClose={() => setManagingStudents(null)}
        />
      )}
    </div>
  );
}
