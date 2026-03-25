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
  CheckCircle,
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
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow min-w-[280px] w-full flex flex-col"
            >
              {/* Card Header */}
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {exam.title}
                      </h3>
                    </div>
                    {exam.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{exam.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleStatus(exam.id, exam.isActive)}
                    className="flex-shrink-0 ml-2"
                    title={exam.isActive ? 'Desactivar' : 'Publicar'}
                  >
                    {exam.isActive ? (
                      <ToggleRight className="w-6 h-6 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{exam.totalQuestionsInPool || 0} preguntas</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{exam._count?.attempts || 0} intentos</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Target className="w-4 h-4" />
                    <span>{exam.questionsPerAttempt} por intento</span>
                  </div>
                  {exam.timeLimit && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{exam.timeLimit} min</span>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(exam.updatedAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  {exam.isActive ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Publicado
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Borrador
                    </span>
                  )}
                  {exam.aiGenerated && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      <Brain className="w-3 h-3 mr-1" />
                      IA
                    </span>
                  )}
                  {exam.accessType === 'PRIVATE' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Privado
                    </span>
                  )}
                </div>

                {/* Public Link */}
                {exam.isActive && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      {exam.accessType === 'PRIVATE' ? 'Enlace (Requiere credenciales):' : 'Enlace Público:'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyLink(exam)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 min-h-[36px] text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                        title="Copiar enlace"
                      >
                        {copiedExamId === exam.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenPublic(exam.slug)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 min-h-[36px] text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition"
                        title="Abrir en nueva pestaña"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Abrir</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-2 flex-shrink-0">
                {exam.accessType === 'PRIVATE' && (
                  <button
                    onClick={() => setManagingStudents({ id: exam.id, title: exam.title })}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] min-w-[70px] text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition"
                    title="Gestionar estudiantes autorizados"
                  >
                    <UserCog className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">Estudiantes</span>
                  </button>
                )}
                <a
                  href={`/admin/ai-exams/${exam.id}/edit`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] min-w-[70px] text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Editar</span>
                </a>
                <a
                  href={`/admin/ai-exams/${exam.id}/results`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] min-w-[70px] text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <BarChart3 className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Resultados</span>
                </a>
                <a
                  href={`/admin/ai-exams/${exam.id}/reports`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] min-w-[70px] text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition"
                  title="Ver reportes de preguntas"
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Reportes</span>
                </a>
                <button
                  onClick={() => handleDeleteClick(exam.id, exam.title)}
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
