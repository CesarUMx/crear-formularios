import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import type { Exam } from '../../lib/types';
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
  Clock,
  Award,
  Eye,
  EyeOff
} from 'lucide-react';

export default function ExamList() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedExamId, setCopiedExamId] = useState<string | null>(null);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await examService.getExams();
      setExams(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar exámenes');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await examService.toggleExamActive(id, !currentStatus);
      await loadExams();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  };

  const handleTogglePublic = async (id: string, currentStatus: boolean) => {
    try {
      await examService.toggleExamPublish(id, !currentStatus);
      await loadExams();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar visibilidad');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${title}"?`)) return;

    try {
      await examService.deleteExam(id);
      await loadExams();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar examen');
    }
  };

  const getPublicUrl = (slug: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/e/${slug}`;
  };

  const handleCopyLink = async (exam: Exam) => {
    try {
      const url = getPublicUrl(exam.slug);
      await navigator.clipboard.writeText(url);
      setCopiedExamId(exam.id);
      setTimeout(() => setCopiedExamId(null), 2000);
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
          <p className="mt-4 text-gray-600">Cargando exámenes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 flex items-start">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
        <div>
          <h3 className="font-semibold text-red-800">Error</h3>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay exámenes creados
        </h3>
        <p className="text-gray-600 mb-6">
          Crea tu primer examen para comenzar
        </p>
        <a
          href="/admin/exams/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="w-5 h-5" />
          Crear Examen
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mis Exámenes</h2>
          <p className="text-gray-600 mt-1">
            {exams.length} {exams.length === 1 ? 'examen' : 'exámenes'}
          </p>
        </div>
        <a
          href="/admin/exams/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="w-5 h-5" />
          Nuevo Examen
        </a>
      </div>

      {/* Exam Cards */}
      <div className="grid gap-4">
        {exams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {exam.title}
                    </h3>
                    
                    {/* Status Badges */}
                    <div className="flex items-center gap-2">
                      {exam.isActive ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                          Inactivo
                        </span>
                      )}
                      
                      {exam.isPublic ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Público
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
                          <EyeOff className="w-3 h-3" />
                          Privado
                        </span>
                      )}

                      {exam.autoGrade && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                          Auto-calificable
                        </span>
                      )}
                    </div>
                  </div>

                  {exam.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {exam.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{exam._count?.attempts || 0} intentos</span>
                    </div>
                    
                    {exam.timeLimit && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{exam.timeLimit} min</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      <span>Mínimo {exam.passingScore}%</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>{exam.maxAttempts} {exam.maxAttempts === 1 ? 'intento' : 'intentos'}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(exam.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  {/* Edit */}
                  <a
                    href={`/admin/exams/${exam.id}`}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-5 h-5" />
                  </a>

                  {/* Stats */}
                  <a
                    href={`/admin/exams/${exam.id}/stats`}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Estadísticas"
                  >
                    <BarChart3 className="w-5 h-5" />
                  </a>

                  {/* Share */}
                  <button
                    onClick={() => handleCopyLink(exam)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copiar enlace"
                  >
                    {copiedExamId === exam.id ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>

                  {/* Open Public */}
                  {exam.isPublic && exam.isActive && (
                    <button
                      onClick={() => handleOpenPublic(exam.slug)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Ver público"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  )}

                  {/* Toggle Public */}
                  <button
                    onClick={() => handleTogglePublic(exam.id, exam.isPublic)}
                    className={`p-2 rounded-lg transition-colors ${
                      exam.isPublic
                        ? 'text-blue-600 hover:bg-blue-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={exam.isPublic ? 'Hacer privado' : 'Hacer público'}
                  >
                    {exam.isPublic ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>

                  {/* Toggle Active */}
                  <button
                    onClick={() => handleToggleActive(exam.id, exam.isActive)}
                    className={`p-2 rounded-lg transition-colors ${
                      exam.isActive
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={exam.isActive ? 'Desactivar' : 'Activar'}
                  >
                    {exam.isActive ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(exam.id, exam.title)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
