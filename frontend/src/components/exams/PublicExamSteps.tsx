import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import { useColors } from '../../hooks/useColors';
import type { Exam } from '../../lib/types';
import { useToast, ToastContainer } from '../common';
import { Clock, AlertCircle, CheckCircle, FileText, Award, Lock, Globe, Info, Loader } from 'lucide-react';
import ResumeAttemptModal from './ResumeAttemptModal';

interface PublicExamStepsProps {
  slug: string;
}

export default function PublicExamSteps({ slug }: PublicExamStepsProps) {
  const colors = useColors();
  const toast = useToast();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Formulario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [starting, setStarting] = useState(false);

  // Resume attempt
  const [pendingAttempt, setPendingAttempt] = useState<{
    id: string;
    startedAt: string;
    attemptNumber: number;
  } | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);

  useEffect(() => {
    loadExam();
  }, [slug]);

  const loadExam = async () => {
    try {
      setLoading(true);
      const data = await examService.getExamBySlug(slug);
      setExam(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar examen');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!exam) return;

    const isPrivate = exam.accessType === 'PRIVATE';

    if (isPrivate) {
      if (!email.trim() || !password.trim()) {
        toast.error('Error', 'Email y contrasena son obligatorios');
        return;
      }
    } else {
      if (!name.trim()) {
        toast.error('Error', 'El nombre es obligatorio');
        return;
      }
    }

    // Verificar intentos pendientes (solo examenes publicos con email)
    if (!isPrivate && email.trim()) {
      try {
        const canTakeResult = await examService.checkCanTakeExam(slug, email);
        if (canTakeResult.pendingAttempt) {
          setPendingAttempt(canTakeResult.pendingAttempt);
          setShowResumeModal(true);
          return;
        }
      } catch (err) {
        // Continuar si falla la verificacion
      }
    }

    await startNewAttempt();
  };

  const startNewAttempt = async () => {
    if (!exam) return;
    const isPrivate = exam.accessType === 'PRIVATE';

    try {
      setStarting(true);

      if (isPrivate) {
        // Login de estudiante y luego iniciar intento
        const loginResult = await examService.loginStudent(slug, email, password);
        const result = await examService.startAttempt(slug, {
          name: loginResult.name || email,
          email,
          studentId: loginResult.studentId,
        });
        window.location.href = `/e/${slug}/attempt/${result.attempt.id}`;
      } else {
        const result = await examService.startAttempt(slug, {
          name,
          email: email || undefined,
        });
        window.location.href = `/e/${slug}/attempt/${result.attempt.id}`;
      }
    } catch (err: any) {
      toast.error('Error', err.message || 'Error al iniciar examen');
      setStarting(false);
    }
  };

  const handleResumeAttempt = () => {
    if (pendingAttempt) {
      window.location.href = `/e/${slug}/attempt/${pendingAttempt.id}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando examen...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800 text-lg">Error</h3>
            <p className="text-red-700 mt-1">{error || 'Examen no encontrado'}</p>
          </div>
        </div>
      </div>
    );
  }

  const isPrivate = exam.accessType === 'PRIVATE';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Exam Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: colors.primaryColor + '20' }}
            >
              <FileText className="w-6 h-6" style={{ color: colors.primaryColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
              {exam.description && (
                <p className="text-gray-600 mt-1">{exam.description}</p>
              )}
            </div>
          </div>

          {/* Instructions */}
          {exam.instructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Instrucciones:</p>
                  <p className="whitespace-pre-wrap">{exam.instructions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {exam.timeLimit && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <p className="text-sm text-gray-600">Tiempo Limite</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{exam.timeLimit} min</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-gray-500" />
                <p className="text-sm text-gray-600">Intentos</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{exam.maxAttempts}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-gray-500" />
                <p className="text-sm text-gray-600">Puntaje Minimo</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{exam.passingScore}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-gray-500" />
                <p className="text-sm text-gray-600">Resultados</p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {exam.showResults ? 'Disponibles' : 'No disponibles'}
              </p>
            </div>
          </div>

          {/* Access type badge */}
          {isPrivate && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                <p className="text-sm text-amber-800 font-medium">
                  Examen Privado: Ingresa las credenciales que recibiste
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleStartExam} className="space-y-4">
            {isPrivate ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electronico *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contrasena *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tu contrasena"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electronico (opcional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="tu@email.com"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={starting}
              style={{ backgroundColor: colors.primaryColor }}
              className="w-full py-4 text-white rounded-lg hover:opacity-90 font-semibold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {starting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Iniciar Examen
                </>
              )}
            </button>
          </form>
        </div>

        {/* Resume Modal */}
        {pendingAttempt && (
          <ResumeAttemptModal
            isOpen={showResumeModal}
            onClose={() => setShowResumeModal(false)}
            onResume={handleResumeAttempt}
            onStartNew={() => { setShowResumeModal(false); startNewAttempt(); }}
            attemptInfo={pendingAttempt}
          />
        )}

        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      </div>
    </div>
  );
}
