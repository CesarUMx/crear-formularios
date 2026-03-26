import { PrismaClient } from '@prisma/client';
import { gradeExamAttempt } from './examGradingService.js';

const prisma = new PrismaClient();

// ==================== TIPOS ====================

interface StudentData {
  name: string;
  email?: string;
  userId?: string;
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
      versions: {
        orderBy: { version: 'desc' },
        take: 1
      },
      attempts: {
        where: studentData.email ? { studentEmail: studentData.email } : {}
      }
    }
  });

  if (!exam) {
    throw new Error('Examen no encontrado');
  }

  if (!exam.isActive || !exam.isPublic) {
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

  const latestVersion = exam.versions[0];
  const attemptNumber = existingAttempts.length + 1;

  const attempt = await prisma.examAttempt.create({
    data: {
      examId: exam.id,
      examVersionId: latestVersion.id,
      attemptNumber,
      studentName: studentData.name,
      studentEmail: studentData.email || null,
      userId: studentData.userId || null,
      ipAddress,
      userAgent,
      maxScore: latestVersion.totalPoints
    },
    include: {
      exam: {
        include: {
          supportFiles: {
            orderBy: { order: 'asc' }
          }
        }
      },
      examVersion: {
        include: {
          sections: {
            include: {
              questions: {
                include: {
                  options: {
                    orderBy: { order: 'asc' }
                  }
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

  // Mezclar preguntas si está habilitado
  if (exam.shuffleQuestions) {
    attempt.examVersion.sections.forEach(section => {
      section.questions = shuffleArray(section.questions);
    });
  }

  // Mezclar opciones si está habilitado
  if (exam.shuffleOptions) {
    attempt.examVersion.sections.forEach(section => {
      section.questions.forEach(question => {
        if (question.options && question.options.length > 0) {
          question.options = shuffleArray(question.options);
        }
      });
    });
  }

  // Sanitizar el attempt para enviar solo información necesaria
  const sanitizedAttempt = {
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    studentName: attempt.studentName,
    studentEmail: attempt.studentEmail,
    startedAt: attempt.startedAt,
    timeLimit: exam.timeLimit,
    maxScore: attempt.maxScore,
    exam: {
      id: attempt.exam.id,
      title: attempt.exam.title,
      description: attempt.exam.description,
      slug: attempt.exam.slug,
      timeLimit: attempt.exam.timeLimit,
      shuffleQuestions: attempt.exam.shuffleQuestions,
      shuffleOptions: attempt.exam.shuffleOptions,
      supportFiles: attempt.exam.supportFiles
    },
    examVersion: {
      id: attempt.examVersion.id,
      version: attempt.examVersion.version,
      sections: attempt.examVersion.sections.map(section => ({
        id: section.id,
        title: section.title,
        description: section.description,
        order: section.order,
        questions: section.questions.map(question => ({
          id: question.id,
          type: question.type,
          text: question.text,
          helpText: question.helpText,
          points: question.points,
          order: question.order,
          options: question.options?.map(opt => ({
            id: opt.id,
            text: opt.text,
            order: opt.order
          }))
        }))
      }))
    }
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
        examVersion: {
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
    attemptWithQuestions?.examVersion?.sections.forEach((section, sIdx) => {
      console.error(`Section ${sIdx + 1}:`);
      section.questions.forEach((q, qIdx) => {
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
  if (attempt.exam.autoGrade) {
    const result = await gradeExamAttempt(attemptId);
    return {
      completed: true,
      autoGraded: true,
      ...result
    };
  }

  return {
    completed: true,
    autoGraded: false,
    message: 'Tu examen ha sido enviado y será calificado manualmente'
  };
};

/**
 * Obtener resultado de un intento
 */
export const getAttemptResult = async (attemptId: string) => {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true,
      examVersion: {
        include: {
          sections: {
            include: {
              questions: {
                include: {
                  options: true
                },
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
            include: {
              options: true
            }
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
  
  if (showResults === 'NEVER') {
    return {
      message: 'Los resultados no están disponibles para este examen'
    };
  }

  if (showResults === 'MANUAL' && !attempt.autoGraded) {
    return {
      message: 'Los resultados estarán disponibles cuando el instructor los publique'
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
    exam: {
      id: attempt.exam.id,
      title: attempt.exam.title,
      showResults: attempt.exam.showResults,
      allowReview: attempt.exam.allowReview
    },
    sections: [] as any[]
  };

  // Si se permite revisión, incluir detalles de las respuestas
  if (attempt.exam.allowReview) {
    result.sections = attempt.examVersion.sections.map(section => ({
      title: section.title,
      description: section.description,
      questions: section.questions.map(question => {
        const answer = attempt.answers.find(a => a.questionId === question.id);
        
        return {
          text: question.text,
          type: question.type,
          points: question.points,
          pointsEarned: answer?.pointsEarned || 0,
          isCorrect: answer?.isCorrect,
          feedback: answer?.feedback,
          studentAnswer: {
            textValue: answer?.textValue,
            selectedOptions: answer?.selectedOptions?.map(opt => ({
              id: opt.id,
              text: opt.text
            })),
            jsonValue: answer?.jsonValue
          },
          correctAnswer: question.options
            ?.filter(opt => opt.isCorrect)
            .map(opt => ({
              id: opt.id,
              text: opt.text
            }))
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
  return await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true,
      examVersion: {
        include: {
          sections: {
            include: {
              questions: {
                include: {
                  options: true
                },
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
            include: {
              options: true
            }
          }
        }
      },
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });
};

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

  if (!exam.isActive || !exam.isPublic) {
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
