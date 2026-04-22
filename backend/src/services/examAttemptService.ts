import { PrismaClient } from '@prisma/client';
import { gradeExamAttempt } from './examGradingService.js';

const prisma = new PrismaClient();

// ==================== TIPOS ====================

interface StudentData {
  name: string;
  email?: string;
  userId?: string;
  studentId?: string;
}

interface AnswerData {
  textValue?: string;
  selectedOptionIds?: string[];
  jsonValue?: any;
}

interface CanTakeExamResult {
  canTake: boolean;
  reason?: string;
  attemptsUsed?: number;
  maxAttempts?: number;
  pendingAttempt?: any;
}

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Mezclar array (algoritmo Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ==================== FUNCIONES ====================

/**
 * Iniciar un nuevo intento de examen
 */
export const startExamAttempt = async (
  examSlug: string, 
  studentData: StudentData, 
  ipAddress: string, 
  userAgent: string
) => {
  const exam = await prisma.exam.findUnique({
    where: { slug: examSlug },
    include: {
      sections: {
        include: {
          questions: {
            include: {
              options: { orderBy: { order: 'asc' } }
            },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { order: 'asc' }
      },
      attempts: {
        where: studentData.email ? { studentEmail: studentData.email } : {}
      }
    }
  });

  if (!exam) {
    throw new Error('Examen no encontrado');
  }

  if (!exam.isActive) {
    throw new Error('Este examen no está disponible');
  }

  const existingAttempts = exam.attempts.filter(a => {
    if (studentData.email) {
      return a.studentEmail === studentData.email;
    }
    return a.ipAddress === ipAddress;
  });

  if (existingAttempts.length >= exam.maxAttempts) {
    throw new Error(`Has alcanzado el límite de ${exam.maxAttempts} intento(s) para este examen`);
  }

  const attemptNumber = existingAttempts.length + 1;

  // Calcular puntos totales de las secciones
  const totalPoints = exam.sections.reduce((sum, section) => 
    sum + section.questions.reduce((qSum, q) => qSum + q.points, 0), 0
  );

  // Seleccionar preguntas (pool si está configurado) - POR SECCIÓN
  let selectedQuestionIds: string[] | null = null;
  if (exam.questionsPerAttempt) {
    const totalQuestions = exam.sections.reduce((sum, s) => sum + s.questions.length, 0);
    
    if (exam.questionsPerAttempt < totalQuestions) {
      // Selección proporcional por sección
      selectedQuestionIds = [];
      let remaining = exam.questionsPerAttempt;
      
      exam.sections.forEach((section, idx) => {
        const sectionTotal = section.questions.length;
        const proportion = sectionTotal / totalQuestions;
        
        // Calcular cuántas preguntas tomar de esta sección (proporcionalmente)
        let toSelect = Math.round(proportion * exam.questionsPerAttempt!);
        
        // Ajuste para la última sección (evitar redondeos)
        if (idx === exam.sections.length - 1) {
          toSelect = remaining;
        }
        
        // No puede seleccionar más de las que existen en la sección
        toSelect = Math.min(toSelect, sectionTotal);
        
        // Seleccionar aleatoriamente X preguntas de esta sección
        const shuffledSection = shuffleArray([...section.questions]);
        const selected = shuffledSection.slice(0, toSelect);
        selectedQuestionIds!.push(...selected.map((q: any) => q.id));
        
        remaining -= toSelect;
      });
    }
  }

  const attempt = await prisma.examAttempt.create({
    data: {
      examId: exam.id,
      attemptNumber,
      studentName: studentData.name,
      studentEmail: studentData.email || null,
      userId: studentData.userId || null,
      studentId: studentData.studentId || null,
      selectedQuestions: selectedQuestionIds || undefined,
      sessionToken: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      ipAddress,
      userAgent,
      maxScore: totalPoints
    },
    include: {
      exam: {
        include: {
          sections: {
            include: {
              questions: {
                include: {
                  options: { orderBy: { order: 'asc' } }
                },
                orderBy: { order: 'asc' }
              }
            },
            orderBy: { order: 'asc' }
          }
        }
      }
    }
  });

  // Filtrar preguntas del pool si aplica
  let sections = attempt.exam.sections;
  if (selectedQuestionIds) {
    sections = sections.map(section => ({
      ...section,
      questions: section.questions.filter(q => selectedQuestionIds!.includes(q.id))
    })).filter(s => s.questions.length > 0);
  }

  console.log('=== SHUFFLE DEBUG ===');
  console.log('shuffleQuestions:', exam.shuffleQuestions);
  console.log('shuffleOptions:', exam.shuffleOptions);
  console.log('Total sections:', sections.length);
  console.log('Questions per section:', sections.map((s: any) => s.questions.length));

  // Mezclar preguntas si está habilitado (usando attempt.id como seed para consistencia al recargar)
  if (exam.shuffleQuestions) {
    console.log('🔀 Mezclando preguntas con seed:', attempt.id);
    sections.forEach((section: any) => {
      section.questions = shuffleArrayWithSeed(section.questions, `${attempt.id}-s${section.id}`);
    });
  } else {
    console.log('⚠️ shuffleQuestions está DESACTIVADO');
  }

  // Mezclar opciones si está habilitado (RADIO/CHECKBOX/TRUE_FALSE, MATCHING y ORDERING)
  if (exam.shuffleOptions) {
    console.log('🔀 Mezclando opciones con seed:', attempt.id);
    sections.forEach((section: any) => {
      section.questions.forEach((question: any) => {
        // Opciones de RADIO, CHECKBOX, TRUE_FALSE
        if (question.options && question.options.length > 0) {
          question.options = shuffleArrayWithSeed(question.options, `${attempt.id}-q${question.id}`);
        }
        // MATCHING: mezclar la columna derecha
        if (question.type === 'MATCHING' && question.metadata?.pairs) {
          const rightColumn = question.metadata.pairs.map((p: any) => p.right);
          question.shuffledRightColumn = shuffleArrayWithSeed(rightColumn, `${attempt.id}-m${question.id}`);
        }
        // ORDERING: mezclar los items
        if (question.type === 'ORDERING' && question.metadata?.items) {
          question.shuffledItems = shuffleArrayWithSeed([...question.metadata.items], `${attempt.id}-o${question.id}`);
        }
      });
    });
  } else {
    console.log('⚠️ shuffleOptions está DESACTIVADO');
  }

  // Sanitizar el attempt - sections dentro de exam para coincidir con getAttemptById
  const sanitizedSections = sections.map((section: any) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    order: section.order,
    fileUrl: section.fileUrl,
    fileName: section.fileName,
    fileType: section.fileType,
    questions: section.questions.map((question: any) => ({
      id: question.id,
      type: question.type,
      text: question.text,
      helpText: question.helpText,
      points: question.points,
      order: question.order,
      metadata: question.metadata,
      shuffledRightColumn: (question as any).shuffledRightColumn,
      shuffledItems: (question as any).shuffledItems,
      fileUrl: question.fileUrl,
      fileName: question.fileName,
      fileType: question.fileType,
      options: question.options?.map((opt: any) => ({
        id: opt.id,
        text: opt.text,
        order: opt.order
      }))
    }))
  }));

  const sanitizedAttempt = {
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    studentName: attempt.studentName,
    studentEmail: attempt.studentEmail,
    startedAt: attempt.startedAt,
    sessionToken: attempt.sessionToken,
    timeLimit: exam.timeLimit,
    maxScore: attempt.maxScore,
    exam: {
      id: attempt.exam.id,
      title: attempt.exam.title,
      description: attempt.exam.description,
      slug: attempt.exam.slug,
      instructions: attempt.exam.instructions,
      timeLimit: attempt.exam.timeLimit,
      shuffleQuestions: attempt.exam.shuffleQuestions,
      shuffleOptions: attempt.exam.shuffleOptions,
      sections: sanitizedSections
    },
    // Mantener también a nivel raíz por retrocompatibilidad
    sections: sanitizedSections
  };

  return sanitizedAttempt;
};

/**
 * Guardar respuesta de una pregunta
 */
export const saveAnswer = async (
  attemptId: string, 
  questionId: string, 
  answerData: AnswerData
) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true
    }
  });

  if (!attempt) {
    throw new Error('Intento no encontrado');
  }

  if (attempt.completedAt) {
    throw new Error('Este examen ya ha sido completado');
  }

  // Verificar tiempo límite
  if (attempt.exam.timeLimit) {
    const elapsedMinutes = (Date.now() - attempt.startedAt.getTime()) / 1000 / 60;
    if (elapsedMinutes > attempt.exam.timeLimit) {
      await submitExamAttempt(attemptId);
      throw new Error('El tiempo límite ha expirado');
    }
  }

  // Verificar que la pregunta existe
  const questionExists = await prisma.examQuestion.findUnique({
    where: { id: questionId }
  });

  if (!questionExists) {
    console.error(`Question ID ${questionId} not found in database`);
    
    // Obtener todas las preguntas del intento para debug
    const attemptWithQuestions = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            sections: {
              include: {
                questions: {
                  select: { id: true, text: true, order: true }
                }
              }
            }
          }
        }
      }
    });
    
    console.error('Available questions in this attempt:');
    attemptWithQuestions?.exam?.sections.forEach((section: any, sIdx: number) => {
      console.error(`Section ${sIdx + 1}:`);
      section.questions.forEach((q: any, qIdx: number) => {
        console.error(`  Question ${qIdx + 1}: ID=${q.id}, text="${q.text.substring(0, 50)}..."`);
      });
    });
    
    throw new Error(`Pregunta no encontrada: ${questionId}`);
  }

  const { textValue, selectedOptionIds, jsonValue } = answerData;

  // Buscar respuesta existente
  const existingAnswer = await prisma.examAnswer.findUnique({
    where: {
      attemptId_questionId: {
        attemptId,
        questionId
      }
    }
  });

  if (existingAnswer) {
    // Actualizar respuesta existente
    await prisma.examAnswer.update({
      where: { id: existingAnswer.id },
      data: {
        textValue: textValue || null,
        jsonValue: jsonValue || null,
        selectedOptions: selectedOptionIds ? {
          set: selectedOptionIds.map(id => ({ id }))
        } : undefined
      }
    });
  } else {
    // Crear nueva respuesta
    await prisma.examAnswer.create({
      data: {
        attemptId,
        questionId,
        textValue: textValue || null,
        jsonValue: jsonValue || null,
        selectedOptions: selectedOptionIds ? {
          connect: selectedOptionIds.map(id => ({ id }))
        } : undefined
      }
    });
  }

  return { success: true };
};

/**
 * Enviar/completar intento de examen
 */
export const submitExamAttempt = async (attemptId: string) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true
    }
  });

  if (!attempt) {
    throw new Error('Intento no encontrado');
  }

  if (attempt.completedAt) {
    throw new Error('Este examen ya ha sido completado');
  }

  const timeSpent = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      completedAt: new Date(),
      timeSpent
    }
  });

  // Si el examen es auto-calificable, calificarlo automáticamente
  // Siempre ejecutar auto-calificación para las preguntas que sí son auto-calificables.
  // Las preguntas TEXT/TEXTAREA sin keywords quedarán pendientes (isCorrect = null)
  // y el profesor deberá calificarlas manualmente.
  const result = await gradeExamAttempt(attemptId);

  return {
    completed: true,
    autoGraded: true,
    ...result
  };
};

/**
 * Obtener información resumen de un intento para enviar por correo
 */
export const getAttemptForEmail = async (attemptId: string) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        select: {
          id: true,
          title: true,
          slug: true,
          passingScore: true,
          showResults: true,
        }
      }
    }
  });
  if (!attempt) throw new Error('Intento no encontrado');
  if (!attempt.completedAt) throw new Error('El examen aún no ha sido completado');
  return attempt;
};

/**
 * Obtener resultado de un intento
 */
export const getAttemptResult = async (attemptId: string) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          sections: {
            include: {
              questions: {
                include: { options: true },
                orderBy: { order: 'asc' }
              }
            },
            orderBy: { order: 'asc' }
          }
        }
      },
      answers: {
        include: {
          selectedOptions: true,
          question: {
            include: { options: true }
          }
        }
      }
    }
  });

  if (!attempt) {
    throw new Error('Intento no encontrado');
  }

  if (!attempt.completedAt) {
    throw new Error('Este examen aún no ha sido completado');
  }

  const showResults = attempt.exam.showResults;
  
  if (!showResults) {
    return {
      message: 'Los resultados no están disponibles para este examen'
    };
  }

  const result = {
    attemptId: attempt.id,
    examTitle: attempt.exam.title,
    studentName: attempt.studentName,
    studentEmail: attempt.studentEmail,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    timeSpent: attempt.timeSpent,
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentage: attempt.score ? (attempt.score / attempt.maxScore) * 100 : 0,
    passed: attempt.passed,
    passingScore: attempt.exam.passingScore,
    autoGraded: attempt.autoGraded,
    requiresManualGrading: attempt.requiresManualGrading,
    isGraded: attempt.isGraded,
    exam: {
      id: attempt.exam.id,
      title: attempt.exam.title,
      slug: (attempt.exam as any).slug,
      passingScore: attempt.exam.passingScore,
      showResults: attempt.exam.showResults
    },
    sections: [] as any[]
  };

  // Si showResults es true, incluir detalles de las respuestas
  if (attempt.exam.showResults) {
    result.sections = attempt.exam.sections.map((section: any) => ({
      title: section.title,
      description: section.description,
      fileUrl: section.fileUrl,
      fileName: section.fileName,
      fileType: section.fileType,
      questions: section.questions.map((question: any) => {
        const answer = attempt.answers.find((a: any) => a.questionId === question.id);
        
        return {
          id: question.id,
          text: question.text,
          type: question.type,
          points: question.points,
          metadata: question.metadata,
          fileUrl: question.fileUrl,
          fileName: question.fileName,
          fileType: question.fileType,
          feedback: question.feedback,
          options: question.options?.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            isCorrect: opt.isCorrect
          })),
          pointsEarned: answer?.pointsEarned || 0,
          isCorrect: answer?.isCorrect,
          answerFeedback: answer?.feedback,
          studentAnswer: {
            textValue: answer?.textValue,
            selectedOptions: answer?.selectedOptions?.map((opt: any) => ({
              id: opt.id,
              text: opt.text
            })),
            jsonValue: answer?.jsonValue
          }
        };
      })
    }));
  }

  return result;
};

/**
 * Obtener todos los intentos de un examen
 */
export const getExamAttempts = async (examId: string) => {
  return await prisma.examAttempt.findMany({
    where: { examId },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { startedAt: 'desc' }
  });
};

/**
 * Obtener un intento específico (para admin)
 */
export const getAttemptById = async (attemptId: string) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          sections: {
            include: {
              questions: {
                include: { options: true }
                // NO usar orderBy - el shuffle se aplica después
              }
            },
            orderBy: { order: 'asc' }
          }
        }
      },
      answers: {
        include: {
          selectedOptions: true,
          question: {
            include: { options: true }
          }
        }
      },
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!attempt) {
    return null;
  }

  // Aplicar shuffle consistente usando attemptId como seed (mismo que startExamAttempt)
  // Esto es importante para que al recargar la página, las preguntas aparezcan en el mismo orden
  if (attempt.exam.shuffleQuestions) {
    attempt.exam.sections.forEach((section: any) => {
      section.questions = shuffleArrayWithSeed(section.questions, `${attemptId}-s${section.id}`);
    });
  }

  if (attempt.exam.shuffleOptions) {
    attempt.exam.sections.forEach((section: any) => {
      section.questions.forEach((question: any) => {
        if (question.options && question.options.length > 0) {
          question.options = shuffleArrayWithSeed(question.options, `${attemptId}-q${question.id}`);
        }
        // MATCHING: mezclar columna derecha
        if (question.type === 'MATCHING' && question.metadata?.pairs) {
          const rightColumn = question.metadata.pairs.map((p: any) => p.right);
          question.shuffledRightColumn = shuffleArrayWithSeed(rightColumn, `${attemptId}-m${question.id}`);
        }
        // ORDERING: mezclar items
        if (question.type === 'ORDERING' && question.metadata?.items) {
          question.shuffledItems = shuffleArrayWithSeed([...question.metadata.items], `${attemptId}-o${question.id}`);
        }
      });
    });
  }

  return attempt;
};

/**
 * Shuffle con seed para mantener orden consistente entre recargas
 */
function shuffleArrayWithSeed<T>(array: T[], seed: string): T[] {
  const arr = [...array];
  // Generar hash positivo a partir del seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash >>> 0; // Convertir a unsigned 32-bit (siempre positivo)
  }
  // Fisher-Yates con generador pseudo-aleatorio determinístico
  for (let i = arr.length - 1; i > 0; i--) {
    hash = (hash * 9301 + 49297) % 233280;
    hash = Math.abs(hash); // Garantizar positivo
    const j = Math.floor((hash / 233280) * (i + 1));
    const safeJ = Math.max(0, Math.min(j, i)); // Garantizar índice válido
    [arr[i], arr[safeJ]] = [arr[safeJ], arr[i]];
  }
  return arr;
}

/**
 * Verificar si un estudiante puede tomar el examen
 */
export const canTakeExam = async (
  examSlug: string, 
  email: string | null, 
  ipAddress: string
): Promise<CanTakeExamResult> => {
  const exam = await prisma.exam.findUnique({
    where: { slug: examSlug },
    include: {
      attempts: {
        where: email ? { studentEmail: email } : { ipAddress },
        orderBy: { startedAt: 'desc' }
      }
    }
  });

  if (!exam) {
    return { canTake: false, reason: 'Examen no encontrado' };
  }

  if (!exam.isActive) {
    return { canTake: false, reason: 'Este examen no está disponible' };
  }

  const attemptCount = exam.attempts.length;
  
  // Buscar intentos pendientes (no completados)
  const pendingAttempt = exam.attempts.find(attempt => !attempt.completedAt);

  if (attemptCount >= exam.maxAttempts) {
    return { 
      canTake: false, 
      reason: `Has alcanzado el límite de ${exam.maxAttempts} intento(s)`,
      attemptsUsed: attemptCount,
      maxAttempts: exam.maxAttempts,
      pendingAttempt: pendingAttempt ? {
        id: pendingAttempt.id,
        attemptNumber: pendingAttempt.attemptNumber,
        startedAt: pendingAttempt.startedAt
      } : undefined
    };
  }

  if (pendingAttempt) {
    return {
      canTake: true,
      reason: 'Tienes un intento pendiente',
      attemptsUsed: attemptCount,
      maxAttempts: exam.maxAttempts,
      pendingAttempt: {
        id: pendingAttempt.id,
        attemptNumber: pendingAttempt.attemptNumber,
        startedAt: pendingAttempt.startedAt
      }
    };
  }

  return {
    canTake: true,
    attemptsUsed: attemptCount,
    maxAttempts: exam.maxAttempts
  };
};

// ==================== SEGURIDAD ====================

/**
 * Registrar cambio de pestaña
 */
export const recordTabSwitch = async (attemptId: string) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId }
  });
  if (!attempt) throw new Error('Intento no encontrado');
  if (attempt.completedAt) throw new Error('Este examen ya ha sido completado');

  return await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      tabSwitches: { increment: 1 }
    },
    select: { id: true, tabSwitches: true }
  });
};

/**
 * Guardar foto del estudiante
 */
export const saveStudentPhoto = async (attemptId: string, photoData: string) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId }
  });
  if (!attempt) throw new Error('Intento no encontrado');

  return await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { studentPhoto: photoData },
    select: { id: true }
  });
};

/**
 * Validar session token
 */
export const validateSessionToken = async (attemptId: string, sessionToken: string): Promise<boolean> => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { sessionToken: true }
  });
  if (!attempt) return false;
  return attempt.sessionToken === sessionToken;
};

/**
 * Registrar inicio de una sección
 */
export const startSection = async (attemptId: string, sectionId: string) => {
  const attempt = await prisma.examAttempt.findUnique({ 
    where: { id: attemptId },
    select: { sectionTimes: true }
  });

  if (!attempt) {
    throw new Error('Intento no encontrado');
  }

  const sectionTimes = (attempt.sectionTimes as any) || {};
  sectionTimes[sectionId] = {
    started: Date.now(),
    completed: false
  };

  return await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { sectionTimes }
  });
};

/**
 * Completar una sección
 */
export const completeSection = async (attemptId: string, sectionId: string) => {
  const attempt = await prisma.examAttempt.findUnique({ 
    where: { id: attemptId },
    select: { sectionTimes: true }
  });

  if (!attempt) {
    throw new Error('Intento no encontrado');
  }

  const sectionTimes = (attempt.sectionTimes as any) || {};
  if (sectionTimes[sectionId]) {
    sectionTimes[sectionId].completed = true;
    sectionTimes[sectionId].ended = Date.now();
  }

  return await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { sectionTimes }
  });
};

/**
 * Validar que los tiempos de las secciones no se hayan excedido
 */
export const validateSectionTimes = async (attemptId: string) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          sections: { 
            orderBy: { order: 'asc' }
          }
        }
      }
    }
  });

  if (!attempt) {
    throw new Error('Intento no encontrado');
  }

  const sectionTimes = (attempt.sectionTimes as any) || {};
  const violations: string[] = [];

  for (const section of attempt.exam.sections) {
    if (section.timeLimit && sectionTimes[section.id]) {
      const elapsed = (sectionTimes[section.id].ended || Date.now()) - sectionTimes[section.id].started;
      const allowedMs = section.timeLimit * 60 * 1000;

      if (elapsed > allowedMs + 5000) { // 5s de tolerancia
        const exceededBy = Math.round((elapsed - allowedMs) / 1000);
        violations.push(`Sección "${section.title}" excedió el tiempo límite por ${exceededBy} segundos`);
        console.warn(`⚠️ Sección ${section.id} excedió tiempo límite: ${exceededBy}s`);
      }
    }
  }

  return {
    isValid: violations.length === 0,
    violations
  };
};
