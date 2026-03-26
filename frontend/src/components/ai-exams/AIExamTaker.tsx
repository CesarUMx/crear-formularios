import { useState, useEffect, useCallback } from 'react';
import { aiExamService } from '../../lib/aiExamService';
import { useToast, ToastContainer, Dialog, useDialog } from '../common';
import QuestionRenderer from './QuestionRenderer';
import PhotoCapture from './PhotoCapture';
import {
  Brain,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader,
  Send,
  RefreshCw,
  Info,
} from 'lucide-react';

interface Question {
  id: string;
  text: string;
  helpText?: string;
  points: number;
  options?: {
    id: string;
    text: string;
  }[];
  metadata?: any; // Metadata con tipo de pregunta y datos específicos
}

interface ExamInfo {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  timeLimit?: number;
  maxAttempts: number;
  passingScore: number;
  questionsPerAttempt: number;
  accessType: 'PUBLIC' | 'PRIVATE';
}

export default function AIExamTaker({ slug }: { slug: string }) {
  const [step, setStep] = useState<'info' | 'form' | 'exam' | 'submitted'>('info');
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Formulario de identificación
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [hasActiveAttempt, setHasActiveAttempt] = useState(false); // Para controlar UI de reanudación

  // Examen
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // ✅ Seguridad: Detección de cambio de pestaña
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [currentQuestionStartTime, setCurrentQuestionStartTime] = useState<number>(Date.now());
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);

  const toast = useToast();
  const submitDialog = useDialog();
  const timeWarningDialog = useDialog();

  useEffect(() => {
    loadExamInfo();
  }, [slug]);

  // ✅ Detectar cambio de pestaña/ventana durante el examen
  useEffect(() => {
    if (step !== 'exam') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);
        
        if (newCount === 1) {
          toast.warning('⚠️ Advertencia', 'Se detectó que cambiaste de pestaña. Esto quedará registrado.');
        } else if (newCount === 3) {
          toast.error('⚠️ Última advertencia', 'Si cambias de pestaña nuevamente, el examen se enviará automáticamente.');
        } else if (newCount >= 4) {
          toast.error('🚫 Examen enviado', 'Cambiaste de pestaña demasiadas veces. El examen se envió automáticamente.');
          setTimeout(() => handleSubmitClick(), 1000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [step, tabSwitchCount]);

  // Timer
  useEffect(() => {
    if (step === 'exam' && timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 0) return 0;
          
          // Advertencia a los 5 minutos
          if (prev === 300) {
            toast.warning('⏰ Quedan 5 minutos', 'El examen se enviará automáticamente al terminar el tiempo');
          }
          
          // Advertencia a 1 minuto
          if (prev === 60) {
            toast.warning('⚠️ ¡Queda 1 minuto!', 'El examen se enviará automáticamente');
          }
          
          // Auto-submit cuando se acaba el tiempo
          if (prev === 1) {
            toast.error('⏱️ Tiempo agotado', 'El examen se está enviando automáticamente');
            setTimeout(() => handleSubmit(true), 1000);
          }
          
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step, timeRemaining]);

  const handlePhotoCapture = (photoDataUrl: string) => {
    setStudentPhoto(photoDataUrl);
    setShowPhotoCapture(false);
    // Continuar con el inicio del examen
    setTimeout(() => handleStartExam(), 100);
  };

  const loadExamInfo = async () => {
    try {
      setLoading(true);
      const exam = await aiExamService.getPublicExam(slug);
      setExamInfo(exam);
      
      // Verificar si hay un intento incompleto guardado en localStorage
      const incompleteAttemptId = localStorage.getItem(`incomplete_attempt_${exam.id}`);
      if (incompleteAttemptId) {
        try {
          const attemptData = localStorage.getItem(`attempt_data_${incompleteAttemptId}`);
          const savedResponses = localStorage.getItem(`attempt_responses_${incompleteAttemptId}`);
          
          if (attemptData && savedResponses) {
            const { questions: savedQuestions, startTime, timeLimit, studentName: savedName, studentEmail: savedEmail } = JSON.parse(attemptData);
            
            // Calcular tiempo restante real basado en la hora de inicio
            let calculatedTimeRemaining = null;
            if (startTime && timeLimit) {
              const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
              const totalSeconds = timeLimit * 60;
              calculatedTimeRemaining = Math.max(0, totalSeconds - elapsedSeconds);
              
              // Si el tiempo ya expiró, limpiar y mostrar formulario
              if (calculatedTimeRemaining === 0) {
                localStorage.removeItem(`incomplete_attempt_${exam.id}`);
                localStorage.removeItem(`attempt_responses_${incompleteAttemptId}`);
                localStorage.removeItem(`attempt_data_${incompleteAttemptId}`);
                toast.error('Tiempo expirado', 'El tiempo del examen ha expirado');
                setStep('form');
                setLoading(false);
                return;
              }
            }
            
            // Cargar datos del estudiante guardados
            if (savedName) setStudentName(savedName);
            if (savedEmail) setStudentEmail(savedEmail);
            
            // Auto-reanudar sin preguntar
            setAttemptId(incompleteAttemptId);
            setResponses(JSON.parse(savedResponses));
            setQuestions(savedQuestions);
            setTimeRemaining(calculatedTimeRemaining);
            setHasActiveAttempt(true);
            setStep('exam');
            toast.success('Examen reanudado', 'Continúa desde donde lo dejaste');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error al cargar intento incompleto:', err);
          // Limpiar datos corruptos
          localStorage.removeItem(`incomplete_attempt_${exam.id}`);
          localStorage.removeItem(`attempt_responses_${incompleteAttemptId}`);
          localStorage.removeItem(`attempt_data_${incompleteAttemptId}`);
        }
      }
      
      setStep('form');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar examen');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!examInfo) return;

    // Obtener o generar sessionToken para identificar al estudiante
    const storageKey = `exam_session_${examInfo.id}`;
    let sessionToken = localStorage.getItem(storageKey);
    
    if (!sessionToken) {
      // Generar nuevo sessionToken único
      sessionToken = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(storageKey, sessionToken);
    }

    // Validar campos según tipo de examen
    if (examInfo.accessType === 'PRIVATE') {
      if (!studentEmail.trim() || !studentPassword.trim()) {
        toast.error('Error', 'Email y contraseña son obligatorios');
        return;
      }

      // Login para exámenes privados
      setLoading(true);
      try {
        const loginResult = await aiExamService.loginPrivateExam(
          examInfo.id,
          studentEmail,
          studentPassword
        );
        
        setStudentId(loginResult.studentId);
        setStudentName(loginResult.name);
        
        // Iniciar intento con studentId y sessionToken
        const result = await aiExamService.startAttempt(examInfo.id, {
          studentId: loginResult.studentId,
          sessionToken, 
        });

        setAttemptId(result.attempt.id);
        setQuestions(result.questions);
        setTimeRemaining(examInfo.timeLimit ? examInfo.timeLimit * 60 : null);
        setStep('exam');
        toast.success('Examen iniciado', 'Responde todas las preguntas antes de enviar');
      } catch (err: any) {
        // Mostrar información adicional si está disponible
        let message = err instanceof Error ? err.message : 'Credenciales inválidas';
        
        // Si hay información de intentos, agregarla al mensaje
        if (err.attemptsUsed !== undefined && err.maxAttempts !== undefined) {
          message = `${message}\n\nIntentos utilizados: ${err.attemptsUsed}/${err.maxAttempts}`;
        }
        
        toast.error('Error', message);
      } finally {
        setLoading(false);
      }
    } else {
      // Examen público
      if (!studentName.trim() || !studentEmail.trim()) {
        toast.error('Error', 'Nombre y correo son obligatorios');
        return;
      }

      setLoading(true);
      try {
        const result = await aiExamService.startAttempt(examInfo.id, {
          studentName,
          studentEmail,
          sessionToken, 
        });

        setAttemptId(result.attempt.id);
        setQuestions(result.questions);
        setTimeRemaining(examInfo.timeLimit ? examInfo.timeLimit * 60 : null);
        
        // Guardar intento en localStorage para poder reanudarlo
        localStorage.setItem(`incomplete_attempt_${examInfo.id}`, result.attempt.id);
        localStorage.setItem(`attempt_data_${result.attempt.id}`, JSON.stringify({
          questions: result.questions,
          startTime: Date.now(), // Guardar hora de inicio
          timeLimit: examInfo.timeLimit, // Guardar límite de tiempo en minutos
          studentName, // Guardar nombre del estudiante
          studentEmail, // Guardar email del estudiante
        }));
        
        setStep('exam');
        toast.success('Examen iniciado', 'Responde todas las preguntas antes de enviar');
      } catch (err: any) {
        // Mostrar información adicional si está disponible
        let message = err instanceof Error ? err.message : 'Ocurrió un error inesperado';
        
        // Si hay información de intentos, agregarla al mensaje
        if (err.attemptsUsed !== undefined && err.maxAttempts !== undefined) {
          message = `${message}\n\nIntentos utilizados: ${err.attemptsUsed}/${err.maxAttempts}`;
        }
        
        toast.error('Error al iniciar examen', message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResponseChange = (questionId: string, answer: any) => {
    // Validar tiempo mínimo por pregunta (10 segundos)
    const MIN_TIME_PER_QUESTION = 10000; // 10 segundos en milisegundos
    const timeSpent = Date.now() - currentQuestionStartTime;
    
    // Solo validar si es la primera respuesta a esta pregunta
    if (!responses[questionId] && timeSpent < MIN_TIME_PER_QUESTION) {
      const secondsRemaining = Math.ceil((MIN_TIME_PER_QUESTION - timeSpent) / 1000);
      toast.warning('⏱️ Tómate tu tiempo', `Espera ${secondsRemaining} segundos más para leer la pregunta`);
      return;
    }

    setResponses((prev) => {
      const newResponses = {
        ...prev,
        [questionId]: answer,
      };
      
      // Guardar en localStorage
      if (attemptId) {
        localStorage.setItem(`attempt_responses_${attemptId}`, JSON.stringify(newResponses));
      }
      
      return newResponses;
    });
    
    // Actualizar tiempo de inicio para la siguiente pregunta
    setCurrentQuestionStartTime(Date.now());
  };

  const handleSubmitClick = () => {
    // Verificar que todas las preguntas tengan respuesta
    const unanswered = questions.filter((q) => {
      const answer = responses[q.id];
      const questionType = (q as any).metadata?.questionType || 'multiple_choice';
      
      // Verificar que existe (permitir 0 como válido)
      if (answer === null || answer === undefined) return true;
      
      // Para fill_blank (objeto con índices), verificar que todos los blancos tengan respuesta
      if (questionType === 'fill_blank' && typeof answer === 'object' && !Array.isArray(answer)) {
        const blanks = (q as any).metadata?.blanks || [];
        return blanks.some((_: any, idx: number) => {
          const blankAnswer = (answer as any)[idx];
          return !blankAnswer || typeof blankAnswer !== 'string' || blankAnswer.trim() === '';
        });
      }
      
      // Para arrays (matching, ordering), verificar que TODOS los elementos tengan valor
      if (Array.isArray(answer)) {
        // Si está vacío o algún elemento está vacío, no está completa
        return answer.length === 0 || answer.some(a => a === '' || a === null || a === undefined);
      }
      
      // Para strings vacíos, considerar como no respondida
      if (typeof answer === 'string' && answer === '') return true;
      
      return false;
    }).length;
    
    if (unanswered > 0) {
      toast.warning(
        'Preguntas sin responder',
        `Tienes ${unanswered} pregunta${unanswered > 1 ? 's' : ''} sin responder`
      );
    }
    
    submitDialog.open();
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!attemptId) return;

    if (!autoSubmit) {
      submitDialog.close();
    }

    setSubmitting(true);
    try {
      console.log('\n🚀 ========== ENVIANDO EXAMEN ==========');
      console.log(`Total de preguntas: ${questions.length}\n`);

      const responsesArray = questions.map((q, idx) => {
        const answer = responses[q.id];
        const questionType = (q as any).metadata?.questionType || 'multiple_choice';
        
        console.log(`📝 Pregunta ${idx + 1}/${questions.length}`);
        console.log(`   Tipo: ${questionType}`);
        console.log(`   ID: ${q.id}`);
        console.log(`   Texto: ${q.text.substring(0, 80)}...`);
        console.log(`   Respuesta:`, answer);
        console.log(`   Tipo de respuesta: ${typeof answer}`);
        console.log(`   Es array: ${Array.isArray(answer)}`);
        
        // ✅ Usar el tipo de pregunta para determinar el formato
        // Para preguntas de opción múltiple y verdadero/falso, enviar selectedOptionId
        if (questionType === 'multiple_choice' || questionType === 'true_false' || questionType === 'data_interpretation') {
          const response = {
            questionId: q.id,
            selectedOptionId: String(answer), // Convertir a string por si es número
          };
          console.log(`   Formato enviado (selectedOptionId):`, response);
          return response;
        }
        
        // Para otros tipos (matching, ordering, fill_blank), enviar como userAnswer
        const response = {
          questionId: q.id,
          userAnswer: JSON.stringify(answer || null),
        };
        console.log(`   Formato enviado (userAnswer):`, response);
        return response;
      });

      console.log('\n� Array completo de respuestas:', JSON.stringify(responsesArray, null, 2));
      console.log('=======================================\n');

      const result = await aiExamService.submitAttempt(attemptId, responsesArray);
      
      // Limpiar localStorage al enviar exitosamente
      if (examInfo) {
        localStorage.removeItem(`incomplete_attempt_${examInfo.id}`);
        localStorage.removeItem(`attempt_responses_${attemptId}`);
        localStorage.removeItem(`attempt_data_${attemptId}`);
      }
      
      setStep('submitted');
      toast.success('Examen enviado', 'Tu examen ha sido enviado correctamente');
      
      // Redirigir a resultados después de 2 segundos
      setTimeout(() => {
        window.location.href = `/ai-exam/${slug}/result/${attemptId}`;
      }, 2000);
    } catch (err) {
      toast.error(
        'Error al enviar examen',
        err instanceof Error ? err.message : 'Ocurrió un error inesperado'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return questions.filter((q) => {
      const answer = responses[q.id];
      const questionType = (q as any).metadata?.questionType || 'multiple_choice';
      
      // Verificar que la respuesta existe (permitir 0 como valor válido)
      if (answer === null || answer === undefined) return false;
      
      // Para fill_blank (objeto con índices), verificar que todos los blancos tengan respuesta
      if (questionType === 'fill_blank' && typeof answer === 'object' && !Array.isArray(answer)) {
        const blanks = (q as any).metadata?.blanks || [];
        return blanks.every((_: any, idx: number) => {
          const blankAnswer = (answer as any)[idx];
          return blankAnswer && typeof blankAnswer === 'string' && blankAnswer.trim() !== '';
        });
      }
      
      // Para arrays (matching, ordering), verificar que TODOS los elementos tengan valor
      if (Array.isArray(answer)) {
        // Debe tener elementos y TODOS deben tener valor (no vacíos)
        return answer.length > 0 && answer.every(a => a !== '' && a !== null && a !== undefined);
      }
      
      // Para strings vacíos, no contar como respondida
      if (typeof answer === 'string' && answer === '') return false;
      
      return true;
    }).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando examen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="rounded-lg bg-red-50 p-6 flex items-start">
          <AlertCircle className="h-6 w-6 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Error al cargar examen</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Step: Información del examen
  if (step === 'info' || step === 'form') {
    return (
      <div className="max-w-2xl mx-auto mt-12 space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{examInfo?.title}</h1>
              {examInfo?.description && (
                <p className="text-gray-600 mt-1">{examInfo.description}</p>
              )}
            </div>
          </div>

          {examInfo?.instructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Instrucciones:</p>
                  <p className="whitespace-pre-wrap">{examInfo.instructions}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Preguntas</p>
              <p className="text-2xl font-bold text-gray-900">{examInfo?.questionsPerAttempt}</p>
            </div>
            {examInfo?.timeLimit && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Tiempo Límite</p>
                <p className="text-2xl font-bold text-gray-900">{examInfo.timeLimit} min</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Intentos Permitidos</p>
              <p className="text-2xl font-bold text-gray-900">{examInfo?.maxAttempts}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Puntaje Mínimo</p>
              <p className="text-2xl font-bold text-gray-900">{examInfo?.passingScore}%</p>
            </div>
          </div>

          <div className="space-y-4">
            {examInfo?.accessType === 'PRIVATE' ? (
              <>
                {/* Formulario de Login para Exámenes Privados */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Examen Privado:</strong> Ingresa las credenciales que recibiste por correo
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="tu@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Tu contraseña"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                {/* Formulario para Exámenes Públicos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleStartExam}
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Cargando...
              </>
            ) : hasActiveAttempt ? (
              <>
                <RefreshCw className="w-5 h-5" />
                Reanudar Examen
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Iniciar Examen
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Step: Tomando el examen
  if (step === 'exam') {
    return (
      <div 
        className="max-w-4xl mx-auto py-8 space-y-6"
        onCopy={(e) => {
          e.preventDefault();
          toast.warning('⚠️ Acción bloqueada', 'No se permite copiar contenido del examen');
        }}
        onCut={(e) => {
          e.preventDefault();
          toast.warning('⚠️ Acción bloqueada', 'No se permite cortar contenido del examen');
        }}
        onPaste={(e) => {
          e.preventDefault();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          toast.warning('⚠️ Acción bloqueada', 'El menú contextual está deshabilitado durante el examen');
        }}
        style={{ userSelect: 'none' }}
      >
        {/* Header con timer */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{examInfo?.title}</h2>
              <p className="text-sm text-gray-600">
                {getAnsweredCount()} de {questions.length} preguntas respondidas
              </p>
            </div>
            {timeRemaining !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <Clock className="w-5 h-5" />
                <span className="font-mono font-bold text-lg">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Preguntas */}
        <div className="space-y-6">
          {questions.map((question, index) => {
            // Debug: Ver qué datos tiene la pregunta
            console.log('🔍 Pregunta original:', {
              id: question.id,
              text: question.text,
              metadata: question.metadata,
              options: question.options,
            });

            // Transformar pregunta para QuestionRenderer
            const transformedQuestion = {
              ...question,
              type: question.metadata?.questionType || 'multiple_choice',
              ...question.metadata,
            };

            console.log('🎯 Pregunta transformada:', {
              type: transformedQuestion.type,
              hasOptions: !!transformedQuestion.options,
              hasBlanks: !!transformedQuestion.blanks,
              hasPairs: !!transformedQuestion.pairs,
            });

            return (
              <div key={question.id}>
                <QuestionRenderer
                  question={transformedQuestion as any}
                  questionNumber={index + 1}
                  mode="exam"
                  userAnswer={responses[question.id]}
                  onAnswerChange={(answer) => handleResponseChange(question.id, answer)}
                />
              </div>
            );
          })}
        </div>

        {/* Botón de enviar */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 sticky bottom-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p className="font-medium">
                {getAnsweredCount()} de {questions.length} preguntas respondidas
              </p>
              {getAnsweredCount() < questions.length && (
                <p className="text-orange-600">
                  Faltan {questions.length - getAnsweredCount()} preguntas por responder
                </p>
              )}
            </div>
            <button
              onClick={handleSubmitClick}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Examen
                </>
              )}
            </button>
          </div>
        </div>

        {/* Diálogo de confirmación */}
        <Dialog
          isOpen={submitDialog.isOpen}
          onClose={submitDialog.close}
          onConfirm={() => handleSubmit(false)}
          title="Enviar Examen"
          message={
            getAnsweredCount() < questions.length
              ? `Tienes ${questions.length - getAnsweredCount()} pregunta${questions.length - getAnsweredCount() > 1 ? 's' : ''} sin responder. ¿Estás seguro de enviar el examen?`
              : '¿Estás seguro de enviar el examen? No podrás modificar tus respuestas después.'
          }
          type="warning"
          confirmText="Enviar Examen"
          cancelText="Cancelar"
        />

        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      </div>
    );
  }

  // Step: Enviado
  if (step === 'submitted') {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Examen Enviado</h2>
          <p className="text-gray-600 mb-6">
            Tu examen ha sido enviado correctamente. Serás redirigido a los resultados...
          </p>
          <Loader className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return null;
}
