import { useState, useEffect, useCallback, useRef } from 'react';
import { examService } from '../../lib/examService';
import type { ExamAttempt, ExamSection, ExamQuestion } from '../../lib/types';
import { useToast, ToastContainer, Dialog, useDialog, QuestionRenderer, FileAttachment } from '../common';
import { useColors } from '../../hooks/useColors';
import SecurityLockModal from './SecurityLockModal';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  FileText,
  Shield,
} from 'lucide-react';

interface ExamTakerProps {
  attemptId: string;
  initialAttempt?: ExamAttempt;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Tiempo máximo permitido en pantalla intermedia (en segundos)
const MAX_PAUSE_TIME = 300; // 5 minutos

// Mapear respuesta de QuestionRenderer al formato de examService.saveAnswer
function mapAnswerForSave(questionType: string, answer: any): { textValue?: string; selectedOptionIds?: string[]; jsonValue?: any } {
  if (answer === null || answer === undefined) return {};

  switch (questionType) {
    case 'RADIO':
    case 'TRUE_FALSE':
      return { selectedOptionIds: [String(answer)] };
    case 'CHECKBOX':
      return { selectedOptionIds: Array.isArray(answer) ? answer.map(String) : [String(answer)] };
    case 'TEXT':
    case 'TEXTAREA':
      return { textValue: String(answer) };
    case 'MATCHING':
    case 'ORDERING':
    case 'FILL_BLANK':
      return { jsonValue: answer };
    default:
      return { textValue: String(answer) };
  }
}

// Mapear respuesta guardada del servidor al formato de QuestionRenderer
function mapSavedAnswer(question: ExamQuestion, savedAnswer: any): any {
  if (!savedAnswer) return undefined;

  switch (question.type) {
    case 'RADIO':
    case 'TRUE_FALSE':
      return savedAnswer.selectedOptionIds?.[0] || savedAnswer.selectedOptions?.[0]?.id;
    case 'CHECKBOX':
      return savedAnswer.selectedOptionIds || savedAnswer.selectedOptions?.map((o: any) => o.id) || [];
    case 'TEXT':
    case 'TEXTAREA':
      return savedAnswer.textValue || '';
    case 'MATCHING':
    case 'ORDERING':
    case 'FILL_BLANK':
      return savedAnswer.jsonValue;
    default:
      return savedAnswer.textValue;
  }
}

export default function ExamTaker({ attemptId, initialAttempt }: ExamTakerProps) {
  const colors = useColors();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(initialAttempt || null);
  const [loading, setLoading] = useState(!initialAttempt);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Advertencias globales usando useRef para no causar re-renders
  const warningShown5MinRef = useRef(false);
  const warningShown1MinRef = useRef(false);
  
  // Advertencias por sección usando useRef para no causar re-renders
  const sectionWarning30sRef = useRef<Record<string, boolean>>({});
  const sectionWarning10sRef = useRef<Record<string, boolean>>({});

  // Navegación por secciones con timers
  const [showingSectionIntro, setShowingSectionIntro] = useState(false);
  const [sectionTimeRemaining, setSectionTimeRemaining] = useState<number | null>(null);
  const [globalTimerPaused, setGlobalTimerPaused] = useState(false);
  const [sectionStartTimes, setSectionStartTimes] = useState<Record<string, number>>({});
  
  // Control de tiempo pausado
  const [totalPausedTime, setTotalPausedTime] = useState(0); // Total acumulado en ms
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null); // Cuando inició la pausa actual
  const [pauseTimeRemaining, setPauseTimeRemaining] = useState<number | null>(null); // Tiempo restante en pantalla intermedia

  // Seguridad
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Seguridad Estricta
  const [securityLocked, setSecurityLocked] = useState(false);
  const [currentUnlockCode, setCurrentUnlockCode] = useState('');
  const [currentEventType, setCurrentEventType] = useState('');

  const toast = useToast();
  const submitDialog = useDialog();
  const unansweredDialog = useDialog();
  const [unansweredCount, setUnansweredCount] = useState(0);

  // ==================== CALCULOS DE TIEMPO DINAMICO ====================

  const calculateDynamicLimit = (): { available: number; required: number; recommended: number } => {
    const sections: ExamSection[] = attempt?.exam?.sections || [];
    const globalRemaining = timeRemaining || 0; // En segundos
    
    // Calcular tiempo requerido por secciones futuras
    const futureSections = sections.slice(currentSectionIndex + 1);
    const futureRequiredTime = futureSections.reduce((sum, s) => sum + (s.timeLimit || 0), 0) * 60; // En segundos
    
    // Tiempo disponible para esta sección
    const availableTime = Math.max(0, globalRemaining - futureRequiredTime);
    
    return {
      available: Math.floor(availableTime / 60), // En minutos
      required: Math.floor(futureRequiredTime / 60), // En minutos
      recommended: Math.floor(availableTime / 60) // En minutos
    };
  };

  const checkNeedPreventiveAdvance = (): boolean => {
    if (!timeRemaining || !attempt?.exam?.timeLimit) return false;
    
    const sections: ExamSection[] = attempt?.exam?.sections || [];
    const currentSection = sections[currentSectionIndex];
    
    // Si la sección actual tiene límite, no forzar avance (su propio timer lo manejará)
    if (currentSection?.timeLimit) return false;
    
    // Calcular tiempo necesario para secciones futuras
    const futureSections = sections.slice(currentSectionIndex + 1);
    const futureRequiredTime = futureSections.reduce((sum, s) => sum + (s.timeLimit || 0), 0) * 60; // En segundos
    
    // Si el tiempo restante es menor o igual al tiempo necesario futuro, forzar avance
    return timeRemaining <= futureRequiredTime && currentSectionIndex < sections.length - 1;
  };

  const loadAttempt = useCallback(async () => {
    try {
      setLoading(true);
      const data = await examService.getAttempt(attemptId);
      setAttempt(data);

      // Restaurar respuestas guardadas
      if (data.answers && data.answers.length > 0) {
        const sections: ExamSection[] = data.exam?.sections || [];
        const questionMap: Record<string, ExamQuestion> = {};
        sections.forEach(s => s.questions.forEach(q => {
          if (q.id) questionMap[q.id] = q;
        }));

        const restoredAnswers: Record<string, any> = {};
        data.answers.forEach((a: any) => {
          const question = questionMap[a.questionId];
          if (question) {
            restoredAnswers[a.questionId] = mapSavedAnswer(question, a);
          }
        });
        setAnswers(restoredAnswers);
      }

      // Restaurar tiempos de secciones desde el backend
      if (data.sectionTimes) {
        const restoredSectionTimes: Record<string, number> = {};
        Object.entries(data.sectionTimes).forEach(([sectionId, timeData]: [string, any]) => {
          if (timeData.started) {
            restoredSectionTimes[sectionId] = timeData.started;
          }
        });
        setSectionStartTimes(restoredSectionTimes);
      }

      // Verificar si la primera sección tiene timeLimit para mostrar pantalla intermedia
      const firstSection = data.exam?.sections?.[0];
      if (firstSection?.timeLimit) {
        setShowingSectionIntro(true);
        setGlobalTimerPaused(true);
        setPauseStartTime(Date.now()); // Registrar inicio de pausa
        setTimeRemaining(null); // NO mostrar timer hasta que inicie
      } else {
        // Si la primera sección NO tiene timeLimit, inicializar el timer global
        if (data.exam?.timeLimit) {
          const startTime = new Date(data.startedAt).getTime();
          const endTime = startTime + data.exam.timeLimit * 60 * 1000;
          const remaining = Math.max(0, endTime - Date.now());
          setTimeRemaining(Math.floor(remaining / 1000));
        }
      }

      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el examen');
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    if (!initialAttempt && attemptId) {
      loadAttempt();
    } else if (initialAttempt) {
      // Restaurar tiempos de secciones si existen
      if (initialAttempt.sectionTimes) {
        const restoredSectionTimes: Record<string, number> = {};
        Object.entries(initialAttempt.sectionTimes).forEach(([sectionId, timeData]: [string, any]) => {
          if (timeData.started) {
            restoredSectionTimes[sectionId] = timeData.started;
          }
        });
        setSectionStartTimes(restoredSectionTimes);
      }
      
      // Si se proporciona initialAttempt, verificar primera sección
      const firstSection = initialAttempt.exam?.sections?.[0];
      if (firstSection?.timeLimit) {
        setShowingSectionIntro(true);
        setGlobalTimerPaused(true);
        setPauseStartTime(Date.now()); // Registrar inicio de pausa
        setTimeRemaining(null); // NO mostrar timer hasta que inicie
      } else {
        // Si la primera sección NO tiene timeLimit, inicializar el timer global
        if (initialAttempt.exam?.timeLimit) {
          const startTime = new Date(initialAttempt.startedAt).getTime();
          const endTime = startTime + initialAttempt.exam.timeLimit * 60 * 1000;
          const remaining = Math.max(0, endTime - Date.now());
          setTimeRemaining(Math.floor(remaining / 1000));
        }
      }
    }
  }, [attemptId, initialAttempt, loadAttempt]);

  // Deteccion de cambio de pestana
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && attempt) {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);

        // Si strictSecurity está activado, mostrar modal bloqueante
        if (attempt.exam?.strictSecurity) {
          try {
            // Crear evento de seguridad y obtener código único
            const result = await examService.createSecurityEvent({
              attemptId,
              attemptType: 'EXAM',
              eventType: 'TAB_SWITCH',
              metadata: { count: newCount },
            });
            
            // Mostrar modal bloqueante
            setCurrentUnlockCode(result.event.unlockCode);
            setCurrentEventType(result.event.eventType);
            setSecurityLocked(true);
            
            console.log('Código de desbloqueo generado:', result.event.unlockCode);
            
          } catch (error) {
            console.error('Error creating security event:', error);
          }
        } else {
          // Comportamiento anterior (sin seguridad estricta)
          examService.recordTabSwitch(attemptId).catch(() => {});

          if (newCount === 1) {
            toast.warning('Advertencia', 'Se detecto que cambiaste de pestana. Esto quedara registrado.');
          } else if (newCount === 3) {
            toast.error('Ultima advertencia', 'Si cambias de pestana nuevamente, el examen se enviara automaticamente.');
          } else if (newCount >= 4) {
            toast.error('Examen enviado', 'Cambiaste de pestana demasiadas veces.');
            setTimeout(() => handleAutoSubmit(), 500);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [attempt, tabSwitchCount, attemptId]);

  // Polling para verificar conclusión remota (solo si strictSecurity está activo)
  useEffect(() => {
    if (!attempt?.exam?.strictSecurity || !attemptId) return;

    const checkCompletion = async () => {
      try {
        const result = await examService.checkForceCompletion(attemptId);
        
        if (result.forceCompleted) {
          // Cerrar modal de seguridad si está abierto
          setSecurityLocked(false);
          
          // Notificar al estudiante
          toast.info('Examen concluido', 'El profesor ha concluido tu examen. Enviando automáticamente...');
          
          // Auto-enviar después de 2 segundos
          setTimeout(() => handleAutoSubmit(), 2000);
        }
      } catch (error) {
        console.error('Error checking force completion:', error);
      }
    };

    // Verificar cada 3 segundos
    const interval = setInterval(checkCompletion, 3000);

    return () => clearInterval(interval);
  }, [attempt?.exam?.strictSecurity, attemptId]);

  // Timer global (con compensación por tiempo pausado)
  useEffect(() => {
    if (!attempt?.exam?.timeLimit || !attempt || globalTimerPaused) {
      // Si está pausado, NO actualizar timeRemaining
      return;
    }

    const startTime = new Date(attempt.startedAt).getTime();
    const examDuration = attempt.exam.timeLimit * 60 * 1000; // En ms
    // Ajustar endTime sumando el tiempo pausado acumulado
    const endTime = startTime + examDuration + totalPausedTime;

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const remainingSeconds = Math.floor(remaining / 1000);
      setTimeRemaining(remainingSeconds);

      if (remainingSeconds <= 300 && remainingSeconds > 299 && !warningShown5MinRef.current) {
        toast.warning('Tiempo restante', 'Quedan 5 minutos para terminar el examen', 10000);
        warningShown5MinRef.current = true;
      }

      if (remainingSeconds <= 60 && remainingSeconds > 59 && !warningShown1MinRef.current) {
        toast.warning('Ultimo minuto', 'El examen se enviara automaticamente cuando termine el tiempo', 15000);
        warningShown1MinRef.current = true;
      }

      // ==================== AUTO-AVANCE PREVENTIVO ====================
      // Si se está acabando el tiempo y quedan secciones con límite, forzar avance
      if (checkNeedPreventiveAdvance()) {
        const sections: ExamSection[] = attempt?.exam?.sections || [];
        const currentSection = sections[currentSectionIndex];
        
        if (!currentSection?.timeLimit && !showingSectionIntro) {
          toast.warning('Avance automático',
            'Se está acabando el tiempo. Avanzando para que puedas completar las secciones con límite definido.',
            0
          );
          goToNextQuestion(); // Forzar avance
        }
      }

      if (remaining === 0) {
        toast.error('Tiempo agotado', 'El examen se enviara automaticamente', 0);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, globalTimerPaused, totalPausedTime, currentSectionIndex, showingSectionIntro]);

  // Timer por sección
  useEffect(() => {
    const sections: ExamSection[] = attempt?.exam?.sections || [];
    const currentSection = sections[currentSectionIndex];
    
    if (!currentSection?.timeLimit || !currentSection.id || showingSectionIntro) return;
    if (!sectionStartTimes[currentSection.id]) return;

    const startTime = sectionStartTimes[currentSection.id];
    const endTime = startTime + currentSection.timeLimit * 60 * 1000;
    let hasAdvanced = false; // Flag para evitar múltiples avances

    const timer = setInterval(async () => {
      const remaining = Math.max(0, endTime - Date.now());
      const remainingSeconds = Math.floor(remaining / 1000);
      setSectionTimeRemaining(remainingSeconds);

      // Advertencias de tiempo (usando refs para no causar re-renders)
      if (currentSection.id && remainingSeconds === 30 && !sectionWarning30sRef.current[currentSection.id]) {
        sectionWarning30sRef.current[currentSection.id] = true;
        toast.warning('Tiempo de sección', 'Quedan 30 segundos para completar esta sección', 5000);
      }

      if (currentSection.id && remainingSeconds === 10 && !sectionWarning10sRef.current[currentSection.id]) {
        sectionWarning10sRef.current[currentSection.id] = true;
        toast.warning('Últimos segundos', 'Quedan 10 segundos. La sección avanzará automáticamente', 8000);
      }

      if (remainingSeconds === 0 && !hasAdvanced) {
        hasAdvanced = true; // Marcar que ya se está avanzando
        clearInterval(timer); // Limpiar el timer inmediatamente
        
        toast.warning('Tiempo de sección agotado', 'Pasando a siguiente sección automáticamente...', 3000);
        
        try {
          // Guardar respuesta actual antes de avanzar
          await saveCurrentAnswer();
        } catch (err) {
          console.error('Error guardando respuesta:', err);
        }
        
        // Forzar avance a siguiente sección (no siguiente pregunta)
        await forceNextSection();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, currentSectionIndex, sectionStartTimes, showingSectionIntro]);

  // Timer de pantalla intermedia (límite de tiempo en pausa)
  useEffect(() => {
    if (!showingSectionIntro) {
      setPauseTimeRemaining(null);
      return;
    }

    // Inicializar countdown de MAX_PAUSE_TIME
    setPauseTimeRemaining(MAX_PAUSE_TIME);

    const timer = setInterval(() => {
      setPauseTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          // Tiempo de pausa agotado - auto-avanzar
          toast.warning('Tiempo de pausa agotado', 
            'Se ha excedido el tiempo máximo en la pantalla intermedia. Continuando automáticamente...', 
            5000
          );
          setTimeout(() => handleStartSection(), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showingSectionIntro]);

  // Loading / Error
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4" style={{ color: '#334155' }}>Cargando examen...</p>
        </div>
      </div>
    );
  }

  if (!attempt || !attempt.exam) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-800 text-lg">Error</h3>
          <p className="text-red-700 mt-1">{error || 'No se pudo cargar el examen'}</p>
        </div>
      </div>
    );
  }

  const exam = attempt.exam;
  const sections: ExamSection[] = exam?.sections || [];
  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: No se pudo cargar la pregunta</p>
        </div>
      </div>
    );
  }

  const saveCurrentAnswer = async (): Promise<void> => {
    if (!currentQuestion?.id) return Promise.resolve();
    const questionId = currentQuestion.id;
    let answer = answers[questionId];
    if (answer === null || answer === undefined) return Promise.resolve();

    // Para ORDERING: convertir array de índices a array de textos en orden
    if (currentQuestion.type === 'ORDERING' && Array.isArray(answer)) {
      const shuffledItems = (currentQuestion as any).shuffledItems || currentQuestion.metadata?.items || [];
      answer = answer.map((idx: number) => shuffledItems[idx]?.text).filter(Boolean);
    }

    try {
      setSaving(true);
      const mapped = mapAnswerForSave(currentQuestion.type, answer);
      await examService.saveAnswer(attemptId, {
        questionId,
        ...mapped
      });
      setLastSaved(new Date());
    } catch (err) {
      // Silencio - el auto-save no debe interrumpir al usuario
    } finally {
      setSaving(false);
    }
  };

  const handleAnswerChange = (answer: any) => {
    if (!currentQuestion?.id) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id!]: answer
    }));
  };

  const goToNextQuestion = async () => {
    await saveCurrentAnswer();
    const sections: ExamSection[] = attempt?.exam?.sections || [];
    const currentSection = sections[currentSectionIndex];
    
    if (currentQuestionIndex < currentSection.questions.length - 1) {
      // Siguiente pregunta en la misma sección
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      // Completar sección actual y mostrar intro de siguiente
      await handleSectionComplete();
      
      const nextSectionIndex = currentSectionIndex + 1;
      const nextSection = sections[nextSectionIndex];
      
      setCurrentSectionIndex(nextSectionIndex);
      setCurrentQuestionIndex(0);
      
      // Mostrar pantalla intermedia y pausar timer global
      if (nextSection) {
        setShowingSectionIntro(true);
        setGlobalTimerPaused(true);
        setPauseStartTime(Date.now()); // Registrar inicio de pausa
        setSectionTimeRemaining(null);
      }
    }
  };

  const forceNextSection = async () => {
    // Función específica para forzar avance a siguiente sección cuando se acaba el tiempo
    const sections: ExamSection[] = attempt?.exam?.sections || [];
    
    if (currentSectionIndex >= sections.length - 1) {
      // Ya estamos en la última sección - auto-enviar el examen
      console.log('Última sección completada por tiempo - enviando examen automáticamente');
      toast.warning('Tiempo de sección agotado', 'Enviando examen automáticamente...', 3000);
      await handleSectionComplete();
      setTimeout(() => handleAutoSubmit(), 1000);
      return;
    }
    
    // Completar sección actual
    await handleSectionComplete();
    
    const nextSectionIndex = currentSectionIndex + 1;
    const nextSection = sections[nextSectionIndex];
    
    console.log('Avanzando de sección', currentSectionIndex, 'a sección', nextSectionIndex);
    
    // Avanzar a siguiente sección
    setCurrentSectionIndex(nextSectionIndex);
    setCurrentQuestionIndex(0);
    
    // Mostrar pantalla intermedia y pausar timer global
    if (nextSection) {
      setShowingSectionIntro(true);
      setGlobalTimerPaused(true);
      setPauseStartTime(Date.now()); // Registrar inicio de pausa
      setSectionTimeRemaining(null);
    }
  };

  const goToPreviousQuestion = async () => {
    await saveCurrentAnswer();
    const sections: ExamSection[] = attempt?.exam?.sections || [];
    const currentSection = sections[currentSectionIndex];
    
    if (currentQuestionIndex > 0) {
      // Pregunta anterior en la misma sección
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentSectionIndex > 0) {
      // Validar si la sección anterior tenía timeLimit
      const prevSection = sections[currentSectionIndex - 1];
      if (prevSection.timeLimit) {
        toast.warning('No puedes regresar', 'La sección anterior tenía límite de tiempo');
        return;
      }
      // Ir a última pregunta de sección anterior
      setCurrentSectionIndex(currentSectionIndex - 1);
      const prevSectionQuestions = prevSection.questions.length;
      setCurrentQuestionIndex(prevSectionQuestions - 1);
    }
  };

  const handleSectionComplete = async () => {
    const sections: ExamSection[] = attempt?.exam?.sections || [];
    const currentSection = sections[currentSectionIndex];
    
    if (!currentSection?.id) return;

    try {
      // Guardar respuestas pendientes
      await saveCurrentAnswer();
      
      // Notificar al servidor que la sección se completó
      await examService.completeSection(attemptId, currentSection.id);
    } catch (err) {
      console.error('Error al completar sección:', err);
    }
  };

  const handleStartSection = async () => {
    const sections: ExamSection[] = attempt?.exam?.sections || [];
    const currentSection = sections[currentSectionIndex];
    
    if (!currentSection?.id) return;

    try {
      // Calcular tiempo pausado y acumularlo
      if (pauseStartTime !== null) {
        const pauseDuration = Date.now() - pauseStartTime;
        setTotalPausedTime(prev => prev + pauseDuration);
        setPauseStartTime(null); // Limpiar timestamp de inicio de pausa
      }
      
      // Notificar al servidor que la sección inicia (solo si no ha iniciado antes)
      if (!sectionStartTimes[currentSection.id]) {
        await examService.startSection(attemptId, currentSection.id);
        
        // Registrar tiempo de inicio si tiene timeLimit
        if (currentSection.timeLimit) {
          setSectionStartTimes(prev => ({
            ...prev,
            [currentSection.id!]: Date.now()
          }));
        }
      }
      
      // Ocultar intro y reanudar timers
      setShowingSectionIntro(false);
      setGlobalTimerPaused(false);
      
      // Inicializar timer global si es la primera vez
      if (timeRemaining === null && attempt?.exam?.timeLimit) {
        const startTime = new Date(attempt.startedAt).getTime();
        const endTime = startTime + attempt.exam.timeLimit * 60 * 1000;
        const remaining = Math.max(0, endTime - Date.now());
        setTimeRemaining(Math.floor(remaining / 1000));
      }
    } catch (err) {
      console.error('Error al iniciar sección:', err);
      toast.error('Error', 'No se pudo iniciar la sección');
    }
  };

  const goToQuestion = async (sIdx: number, qIdx: number) => {
    // Si estamos en intro de sección, no permitir saltar
    if (showingSectionIntro) {
      toast.warning('Debes iniciar la sección primero', 'Presiona "Comenzar Sección" para continuar');
      return;
    }

    // No permitir saltar a secciones anteriores con timeLimit
    if (sIdx < currentSectionIndex) {
      const targetSection = sections[sIdx];
      if (targetSection?.timeLimit) {
        toast.warning('No puedes regresar', 'Esa sección tenía límite de tiempo');
        return;
      }
    }

    await saveCurrentAnswer();
    setCurrentSectionIndex(sIdx);
    setCurrentQuestionIndex(qIdx);
  };

  const getTotalQuestions = () => {
    return sections.reduce((total: number, section: ExamSection) => total + section.questions.length, 0);
  };

  const getCurrentQuestionNumber = () => {
    let count = 0;
    for (let i = 0; i < currentSectionIndex; i++) {
      count += sections[i].questions.length;
    }
    return count + currentQuestionIndex + 1;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).filter(key => {
      const a = answers[key];
      if (a === null || a === undefined) return false;
      if (typeof a === 'string' && a === '') return false;
      if (Array.isArray(a) && a.length === 0) return false;
      return true;
    }).length;
  };

  // Funciones de seguridad estricta
  const handleValidateUnlockCode = async (code: string): Promise<boolean> => {
    try {
      const result = await examService.validateUnlockCode(attemptId, code);
      return result.success;
    } catch (error: any) {
      throw new Error(error.message || 'Error al validar código');
    }
  };

  const handleUnlock = () => {
    setSecurityLocked(false);
    setCurrentUnlockCode('');
    setCurrentEventType('');
    toast.success('Desbloqueado', 'Puedes continuar con el examen');
  };

  const handleAutoSubmit = async () => {
    try {
      setSubmitting(true);
      await saveCurrentAnswer();
      await examService.submitAttempt(attemptId);
      window.location.href = `/e/${attempt?.exam?.slug}/result/${attemptId}`;
    } catch (err) {
      toast.error('Error al enviar examen', err instanceof Error ? err.message : 'Ocurrio un error');
      setSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    const unanswered = getTotalQuestions() - getAnsweredCount();
    if (unanswered > 0) {
      setUnansweredCount(unanswered);
      unansweredDialog.open();
    } else {
      submitDialog.open();
    }
  };

  const handleSubmitConfirm = async () => {
    try {
      setSubmitting(true);
      unansweredDialog.close();
      submitDialog.close();
      await saveCurrentAnswer();
      await examService.submitAttempt(attemptId);
      window.location.href = `/e/${attempt?.exam?.slug}/result/${attemptId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar examen');
      toast.error('Error al enviar examen', err instanceof Error ? err.message : 'Ocurrio un error');
      setSubmitting(false);
    }
  };

  const isFirstQuestion = currentSectionIndex === 0 && currentQuestionIndex === 0;
  const isLastQuestion = currentSectionIndex === sections.length - 1 &&
    currentQuestionIndex === currentSection.questions.length - 1;

  // Transformar la pregunta para QuestionRenderer
  const transformedQuestion = {
    type: currentQuestion.type,
    text: currentQuestion.text,
    helpText: currentQuestion.helpText,
    points: currentQuestion.points,
    options: currentQuestion.options,
    pairs: currentQuestion.metadata?.pairs,
    blanks: currentQuestion.metadata?.blanks,
    items: currentQuestion.metadata?.items,
    metadata: currentQuestion.metadata,
    shuffledRightColumn: (currentQuestion as any).shuffledRightColumn,
    shuffledItems: (currentQuestion as any).shuffledItems,
    fileUrl: currentQuestion.fileUrl,
    fileName: currentQuestion.fileName,
    fileType: currentQuestion.fileType,
  };

  return (
    <div
      className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}
      onCopy={(e) => { e.preventDefault(); }}
      onCut={(e) => { e.preventDefault(); }}
      onPaste={(e) => { e.preventDefault(); }}
      onContextMenu={(e) => { e.preventDefault(); }}
    >
      {/* Header sticky */}
      <div className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #E5E7EB' }}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#0F172A' }}>{exam.title}</h1>
              <p className="text-sm mt-1" style={{ color: '#334155' }}>
                Pregunta {getCurrentQuestionNumber()} de {getTotalQuestions()}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm" style={{ color: '#334155' }}>
                <span className="font-medium">{getAnsweredCount()}</span> / {getTotalQuestions()} respondidas
              </div>

              {/* Timer de sección (prioridad visual) */}
              {sectionTimeRemaining !== null && !showingSectionIntro && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold ${
                  sectionTimeRemaining < 60 ? 'bg-red-100 text-red-800 ring-2 ring-red-300' : 'bg-amber-100 text-amber-800'
                }`}>
                  <Clock className="w-4 h-4" />
                  <div className="flex flex-col items-start">
                    <span className="text-xs opacity-75">Sección</span>
                    <span className="font-mono">{formatTime(sectionTimeRemaining)}</span>
                  </div>
                </div>
              )}

              {/* Timer global */}
              {timeRemaining !== null && !globalTimerPaused && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  <Clock className="w-4 h-4" />
                  <div className="flex flex-col items-start">
                    <span className="text-xs opacity-75">Total</span>
                    <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
                  </div>
                </div>
              )}

              {/* Timer pausado */}
              {globalTimerPaused && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#F8FAFC', color: '#334155', border: '1px solid #E5E7EB' }}>
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Pausado</span>
                </div>
              )}

              {tabSwitchCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                  <Shield className="w-3 h-3" />
                  {tabSwitchCount}/4
                </div>
              )}

              {saving && (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#334155' }}>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Guardando...
                </div>
              )}
              {lastSaved && !saving && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Guardado
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full rounded-full h-2" style={{ backgroundColor: '#E5E7EB' }}>
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: colors.primaryColor,
                  width: `${(getCurrentQuestionNumber() / getTotalQuestions()) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Question dots */}
          <div className="mt-3 flex flex-wrap gap-1">
            {sections.map((section, sIdx) =>
              section.questions.map((q, qIdx) => {
                const isActive = sIdx === currentSectionIndex && qIdx === currentQuestionIndex;
                const isAnswered = q.id ? !!answers[q.id] : false;
                return (
                  <button
                    key={`${sIdx}-${qIdx}`}
                    onClick={() => goToQuestion(sIdx, qIdx)}
                    className={`w-7 h-7 rounded-full text-xs font-medium transition ${
                      isActive
                        ? 'ring-2 ring-offset-1 ring-blue-500 bg-blue-600 text-white'
                        : isAnswered
                        ? 'bg-green-500 text-white'
                        : ''
                    }`}
                    style={!isActive && !isAnswered ? { backgroundColor: '#E5E7EB', color: '#334155' } : {}}
                    title={`Pregunta ${sections.slice(0, sIdx).reduce((c, s) => c + s.questions.length, 0) + qIdx + 1}`}
                  >
                    {sections.slice(0, sIdx).reduce((c, s) => c + s.questions.length, 0) + qIdx + 1}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Pantalla intermedia de sección */}
        {showingSectionIntro ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>
                {currentSection?.title}
              </h2>
              {currentSection?.description && (
                <p className="text-lg" style={{ color: '#334155' }}>
                  {currentSection.description}
                </p>
              )}
            </div>

            {/* Info de la sección */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">{currentSection?.questions.length}</div>
                <div className="text-sm text-blue-700">Preguntas</div>
              </div>
              
              {currentSection?.timeLimit && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-amber-900">{currentSection.timeLimit}</div>
                  <div className="text-sm text-amber-700">Minutos</div>
                </div>
              )}
              
              {!currentSection?.timeLimit && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-green-900">Sin límite</div>
                  <div className="text-sm text-green-700">de tiempo</div>
                </div>
              )}

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                <AlertCircle className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-900">{currentSectionIndex + 1} / {sections.length}</div>
                <div className="text-sm text-purple-700">Sección</div>
              </div>
            </div>

            {/* Archivo adjunto de sección */}
            {currentSection?.fileUrl && currentSection.fileName && currentSection.fileType && (
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                <p className="text-sm font-medium mb-2" style={{ color: '#334155' }}>Archivo adjunto de la sección:</p>
                <FileAttachment
                  fileUrl={currentSection.fileUrl}
                  fileName={currentSection.fileName}
                  fileType={currentSection.fileType}
                />
              </div>
            )}

            {/* Mensajes importantes */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Descanso:</strong> Puedes tomar un descanso aquí. Los temporizadores están pausados y se reanudarán cuando presiones "Comenzar Sección".
                </div>
              </div>

              {currentSection?.timeLimit && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <strong>Tiempo limitado:</strong> Esta sección tiene un límite de {currentSection.timeLimit} minutos. El contador iniciará cuando presiones "Comenzar Sección".
                  </div>
                </div>
              )}

              {/* Advertencia de límite dinámico para secciones sin timeLimit */}
              {!currentSection?.timeLimit && attempt?.exam?.timeLimit && timeRemaining && (() => {
                const { available, required, recommended } = calculateDynamicLimit();
                const isInsufficient = available < 5;
                const isLow = available < 10 && available >= 5;
                
                return (
                  <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                    isInsufficient ? 'bg-red-50 border-red-300' :
                    isLow ? 'bg-amber-50 border-amber-300' :
                    'bg-blue-50 border-blue-300'
                  }`}>
                    <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      isInsufficient ? 'text-red-600' :
                      isLow ? 'text-amber-600' :
                      'text-blue-600'
                    }`} />
                    <div className={`text-sm ${
                      isInsufficient ? 'text-red-800' :
                      isLow ? 'text-amber-800' :
                      'text-blue-800'
                    }`}>
                      <strong>{isInsufficient ? 'Tiempo critico:' : isLow ? 'Tiempo limitado:' : 'Administra tu tiempo:'}</strong>
                      <ul className="mt-2 space-y-1 text-xs">
                        <li>• Tiempo global restante: <strong>{formatTime(timeRemaining)}</strong></li>
                        {required > 0 && (
                          <li>• Secciones futuras requieren: <strong>{required} min</strong></li>
                        )}
                        <li>• Tiempo recomendado para esta sección: <strong className="text-base">máx. {recommended} min</strong></li>
                      </ul>
                      {isInsufficient && (
                        <p className="mt-2 font-semibold text-red-900">
                          El examen avanzará automáticamente si el tiempo se agota.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {currentSectionIndex > 0 && sections[currentSectionIndex - 1]?.timeLimit && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <strong>No podrás regresar:</strong> La sección anterior tenía límite de tiempo, por lo que no podrás volver a ella.
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <strong>Progreso guardado:</strong> Tus respuestas de la sección anterior se guardaron correctamente.
                </div>
              </div>
            </div>

            {/* Contador de tiempo en pantalla intermedia */}
            {pauseTimeRemaining !== null && (
              <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                <div className="flex items-center justify-center gap-3">
                  <Clock className={`w-6 h-6 ${pauseTimeRemaining <= 30 ? 'text-red-600 animate-pulse' : 'text-orange-600'}`} />
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${pauseTimeRemaining <= 30 ? 'text-red-700' : 'text-orange-700'}`}>
                      {formatTime(pauseTimeRemaining)}
                    </div>
                    <div className={`text-sm ${pauseTimeRemaining <= 30 ? 'text-red-600 font-semibold' : 'text-orange-600'}`}>
                      {pauseTimeRemaining <= 30 
                        ? '¡Presiona "Comenzar Sección" o se iniciará automáticamente!' 
                        : 'Tiempo máximo en esta pantalla (se iniciará automáticamente al terminar)'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botón para iniciar sección */}
            <div className="text-center">
              <button
                onClick={handleStartSection}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-white font-semibold text-lg transition hover:opacity-90 shadow-md"
                style={{ backgroundColor: colors.primaryColor }}
              >
                Comenzar Sección
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        ) : (
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Section info */}
          {currentSection && (
            <div className="mb-6 pb-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
              <h2 className="text-lg font-semibold" style={{ color: '#0F172A' }}>{currentSection.title}</h2>
              {currentSection.description && (
                <p className="text-sm mt-1" style={{ color: '#334155' }}>{currentSection.description}</p>
              )}
              {currentSection.fileUrl && currentSection.fileName && currentSection.fileType && (
                <div className="mt-3">
                  <FileAttachment
                    fileUrl={currentSection.fileUrl}
                    fileName={currentSection.fileName}
                    fileType={currentSection.fileType}
                  />
                </div>
              )}
            </div>
          )}

          {/* Question via QuestionRenderer */}
          <QuestionRenderer
            question={transformedQuestion as any}
            questionNumber={getCurrentQuestionNumber()}
            mode="exam"
            userAnswer={currentQuestion.id ? answers[currentQuestion.id] : undefined}
            onAnswerChange={handleAnswerChange}
          />

          {/* Error */}
          {error && (
            <div className="mt-6 flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 flex items-center justify-between" style={{ borderTop: '1px solid #E5E7EB' }}>
            <button
              onClick={goToPreviousQuestion}
              disabled={isFirstQuestion}
              className="flex items-center gap-2 px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              style={{ border: '1px solid #E5E7EB', color: '#334155', backgroundColor: '#ffffff' }}
            >
              <ChevronLeft className="w-5 h-5" />
              Anterior
            </button>

            <button
              onClick={saveCurrentAnswer}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-lg disabled:opacity-50 transition"
              style={{ backgroundColor: '#F8FAFC', color: '#334155', border: '1px solid #E5E7EB' }}
            >
              <Save className="w-5 h-5" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>

            {!isLastQuestion ? (
              <button
                onClick={goToNextQuestion}
                style={{ backgroundColor: colors.primaryColor }}
                className="flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:opacity-90 transition"
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmitClick}
                disabled={submitting}
                style={{ backgroundColor: colors.primaryColor }}
                className="flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Send className="w-5 h-5" />
                {submitting ? 'Enviando...' : 'Enviar Examen'}
              </button>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Modal de seguridad estricta */}
      {attempt?.exam?.strictSecurity && (
        <SecurityLockModal
          isOpen={securityLocked}
          unlockCode={currentUnlockCode}
          attemptId={attemptId}
          eventType={currentEventType}
          onUnlock={handleUnlock}
          onValidate={handleValidateUnlockCode}
        />
      )}

      {/* Dialogs */}
      <Dialog
        isOpen={unansweredDialog.isOpen}
        onClose={unansweredDialog.close}
        onConfirm={() => { unansweredDialog.close(); submitDialog.open(); }}
        title="Preguntas sin responder"
          message={`Tienes ${unansweredCount} pregunta(s) sin responder. Deseas continuar y enviar el examen de todas formas?`}
          type="warning"
          confirmText="Continuar"
          cancelText="Revisar"
        />

        <Dialog
          isOpen={submitDialog.isOpen}
          onClose={submitDialog.close}
          onConfirm={handleSubmitConfirm}
          title="Enviar Examen"
          message="Estas seguro de enviar el examen? No podras modificar tus respuestas despues de enviarlo."
          type="warning"
          confirmText="Enviar Examen"
          cancelText="Cancelar"
          loading={submitting}
        />

        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      </div>
  );
}
