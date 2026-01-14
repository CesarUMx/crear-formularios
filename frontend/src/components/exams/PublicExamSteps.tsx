import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import type { Exam, ExamAttempt } from '../../lib/types';
import { Clock, AlertCircle, CheckCircle, FileText, Award, ChevronRight, Play, Check } from 'lucide-react';
import ResumeAttemptModal from './ResumeAttemptModal';

interface PublicExamStepsProps {
  slug: string;
}

export default function PublicExamSteps({ slug }: PublicExamStepsProps) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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
      
      // Si no hay archivos de apoyo, saltar al paso 2
      if (!data.supportFiles || data.supportFiles.length === 0) {
        setCurrentStep(2);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar examen');
    } finally {
      setLoading(false);
    }
  };

  const checkPendingAttempts = async () => {
    if (!email.trim()) {
      startNewAttempt();
      return;
    }

    try {
      setCheckingAttempts(true);
      const canTakeResult = await examService.checkCanTakeExam(slug, email);
      
      if (canTakeResult.pendingAttempt) {
        setPendingAttempt(canTakeResult.pendingAttempt);
        setShowResumeModal(true);
        return;
      }
      
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
      <div className="max-w-4xl mx-auto p-6 mt-12">
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

  const totalSteps = exam.supportFiles && exam.supportFiles.length > 0 ? 3 : 2;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{exam.title}</h1>
          {exam.description && (
            <p className="text-gray-600 text-lg">{exam.description}</p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {exam.supportFiles && exam.supportFiles.length > 0 && (
              <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  {currentStep > 1 ? <Check className="w-5 h-5" /> : '1'}
                </div>
                <span className="text-sm font-medium hidden sm:inline">Material</span>
              </div>
            )}
            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                {currentStep > 2 ? <Check className="w-5 h-5" /> : totalSteps === 2 ? '1' : '2'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Términos</span>
            </div>
            <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                {totalSteps === 2 ? '2' : '3'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Iniciar</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* PASO 1: Material de Apoyo */}
          {currentStep === 1 && exam.supportFiles && exam.supportFiles.length > 0 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Play className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Material de Apoyo</h2>
                <p className="text-gray-600">
                  Por favor, revisa el siguiente material antes de continuar
                </p>
              </div>

              <div className="space-y-4">
                {exam.supportFiles.map((file) => {
                  const isVideo = file.fileType.startsWith('video/');
                  const isAudio = file.fileType.startsWith('audio/');
                  const isImage = file.fileType.startsWith('image/');
                  
                  return (
                    <div key={file.id} className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition">
                      {/* Video */}
                      {isVideo && (
                        <div className="bg-black">
                          <video 
                            controls 
                            className="w-full"
                            style={{ maxHeight: '500px' }}
                            preload="metadata"
                          >
                            <source src={file.fileUrl} type={file.fileType} />
                            Tu navegador no soporta la reproducción de video.
                          </video>
                        </div>
                      )}
                      
                      {/* Audio */}
                      {isAudio && (
                        <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-8">
                          <audio controls className="w-full">
                            <source src={file.fileUrl} type={file.fileType} />
                            Tu navegador no soporta la reproducción de audio.
                          </audio>
                        </div>
                      )}
                      
                      {/* Imagen */}
                      {isImage && (
                        <div className="bg-gray-50">
                          <img 
                            src={file.fileUrl} 
                            alt={file.fileName}
                            className="w-full object-contain"
                            style={{ maxHeight: '500px' }}
                          />
                        </div>
                      )}
                      
                      {/* Info del archivo */}
                      <div className="p-4 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-semibold text-gray-900">{file.fileName}</p>
                              <p className="text-sm text-gray-500">{file.fileType}</p>
                            </div>
                          </div>
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                          >
                            Abrir
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentStep(2)}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold text-lg transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                Continuar
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* PASO 2: Términos y Condiciones */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Información del Examen</h2>
                <p className="text-gray-600">
                  Lee las condiciones antes de iniciar
                </p>
              </div>

              {/* Exam Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exam.timeLimit && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <Clock className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Tiempo Límite</p>
                      <p className="font-bold text-gray-900 text-lg">{exam.timeLimit} minutos</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <FileText className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Intentos Permitidos</p>
                    <p className="font-bold text-gray-900 text-lg">
                      {exam.maxAttempts} {exam.maxAttempts === 1 ? 'intento' : 'intentos'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                  <Award className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Puntuación Mínima</p>
                    <p className="font-bold text-gray-900 text-lg">{exam.passingScore}%</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
                  <CheckCircle className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Resultados</p>
                    <p className="font-bold text-gray-900 text-lg">
                      {exam.showResults === 'IMMEDIATE' ? 'Inmediatos' :
                       exam.showResults === 'AFTER_DEADLINE' ? 'Después' :
                       exam.showResults === 'MANUAL' ? 'Manual' : 'No disponibles'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-gray-900 mb-3 text-lg">📋 Instrucciones Importantes</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Lee cuidadosamente cada pregunta antes de responder</span>
                  </li>
                  {exam.timeLimit && (
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>Tienes {exam.timeLimit} minutos para completar el examen</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Tus respuestas se guardan automáticamente</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Asegúrate de enviar el examen al finalizar</span>
                  </li>
                </ul>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded mt-0.5"
                />
                <span className="text-gray-700">
                  He leído y acepto las condiciones del examen. Entiendo que una vez iniciado, debo completarlo dentro del tiempo establecido.
                </span>
              </label>

              <div className="flex gap-3">
                {exam.supportFiles && exam.supportFiles.length > 0 && (
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition"
                  >
                    Volver
                  </button>
                )}
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!acceptedTerms}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold text-lg transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continuar
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: Datos del Estudiante */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <FileText className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Información del Estudiante</h2>
                <p className="text-gray-600">
                  Ingresa tus datos para iniciar el examen
                </p>
              </div>

              <form onSubmit={handleStartExam} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Correo Electrónico (opcional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="tu@email.com"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Para recibir notificaciones de resultados
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={starting || checkingAttempts}
                    className="flex-1 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 font-bold text-lg transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkingAttempts ? '⏳ Verificando...' : starting ? '🚀 Iniciando...' : '🎯 Iniciar Examen'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
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
