import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import type { Exam, ExamAttempt } from '../../lib/types';
import { Clock, AlertCircle, CheckCircle, FileText, Award } from 'lucide-react';
import ResumeAttemptModal from './ResumeAttemptModal';

interface PublicExamProps {
  slug: string;
}

export default function PublicExam({ slug }: PublicExamProps) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStartForm, setShowStartForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [starting, setStarting] = useState(false);
  const [pendingAttempt, setPendingAttempt] = useState<{
    id: string;
    startedAt: string;
    attemptNumber: number;
  } | null>(null);
  const [checkingAttempts, setCheckingAttempts] = useState(false);
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

  const checkPendingAttempts = async () => {
    if (!email.trim()) {
      // Si no hay email, no podemos verificar intentos previos
      startNewAttempt();
      return;
    }

    try {
      setCheckingAttempts(true);
      // Verificar si puede tomar el examen y si tiene intentos previos
      const canTakeResult = await examService.checkCanTakeExam(slug, email);
      
      // Si hay un intento pendiente, mostrar modal
      if (canTakeResult.pendingAttempt) {
        setPendingAttempt(canTakeResult.pendingAttempt);
        setShowResumeModal(true);
        return;
      }
      
      // Iniciar nuevo intento
      startNewAttempt();
    } catch (err) {
      console.error('Error al verificar intentos:', err);
      startNewAttempt();
    } finally {
      setCheckingAttempts(false);
    }
  };

  const startNewAttempt = async () => {
    try {
      setStarting(true);
      const result = await examService.startAttempt(slug, { name, email: email || undefined });
      
      // Redirigir a la página del intento
      window.location.href = `/e/${slug}/attempt/${result.attempt.id}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al iniciar examen');
      setStarting(false);
    }
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Por favor ingresa tu nombre');
      return;
    }

    // Verificar intentos previos si hay email
    await checkPendingAttempts();
  };

  const handleResumeAttempt = () => {
    if (pendingAttempt) {
      window.location.href = `/e/${slug}/attempt/${pendingAttempt.id}`;
    }
  };

  const handleStartNewFromModal = () => {
    setShowResumeModal(false);
    setPendingAttempt(null);
    startNewAttempt();
  };

  const handleCloseModal = () => {
    setShowResumeModal(false);
    setCheckingAttempts(false);
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
      <div className="max-w-2xl mx-auto mt-12 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start">
          <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-800 text-lg">Error</h3>
            <p className="text-red-700 mt-1">{error || 'Examen no encontrado'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!showStartForm) {
    return (
      <div className="max-w-3xl mx-auto mt-12 p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{exam.title}</h1>
            {exam.description && (
              <p className="text-gray-600 text-lg">{exam.description}</p>
            )}
          </div>

          {/* Exam Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {exam.timeLimit && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Tiempo Límite</p>
                  <p className="font-semibold text-gray-900">{exam.timeLimit} minutos</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Intentos Permitidos</p>
                <p className="font-semibold text-gray-900">
                  {exam.maxAttempts} {exam.maxAttempts === 1 ? 'intento' : 'intentos'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <Award className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Puntuación Mínima</p>
                <p className="font-semibold text-gray-900">{exam.passingScore}%</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Resultados</p>
                <p className="font-semibold text-gray-900">
                  {exam.showResults === 'IMMEDIATE' ? 'Inmediatos' :
                   exam.showResults === 'AFTER_DEADLINE' ? 'Después de fecha' :
                   exam.showResults === 'MANUAL' ? 'Manual' : 'No disponibles'}
                </p>
              </div>
            </div>
          </div>

          {/* Support Files */}
          {exam.supportFiles && exam.supportFiles.length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">Archivos de Apoyo</h3>
              <div className="space-y-2">
                {exam.supportFiles.map((file) => (
                  <a
                    key={file.id}
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <FileText className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-900">{file.fileName}</span>
                    <span className="text-sm text-gray-500 ml-auto">{file.fileType}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-blue-900 mb-2">Instrucciones</h3>
            <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
              <li>Lee cuidadosamente cada pregunta antes de responder</li>
              {exam.timeLimit && (
                <li>Tienes {exam.timeLimit} minutos para completar el examen</li>
              )}
              <li>Puedes guardar tus respuestas y continuar después</li>
              {exam.allowReview && (
                <li>Podrás revisar tus respuestas antes de enviar</li>
              )}
              <li>Una vez enviado el examen, no podrás modificar tus respuestas</li>
            </ul>
          </div>

          {/* Start Button */}
          <button
            onClick={() => setShowStartForm(true)}
            className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg transition"
          >
            Comenzar Examen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Información del Estudiante
        </h2>

        <form onSubmit={handleStartExam} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tu nombre completo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico (opcional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="tu@email.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Para recibir notificaciones de resultados
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowStartForm(false)}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={starting || checkingAttempts}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition disabled:opacity-50"
            >
              {checkingAttempts ? 'Verificando...' : starting ? 'Iniciando...' : 'Iniciar Examen'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal para retomar intento */}
      {pendingAttempt && (
        <ResumeAttemptModal
          isOpen={showResumeModal}
          onClose={handleCloseModal}
          onResume={handleResumeAttempt}
          onStartNew={handleStartNewFromModal}
          attemptInfo={pendingAttempt}
        />
      )}
    </div>
  );
}
