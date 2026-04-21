import { PrismaClient, AIExamAccessType, SharePermission } from '@prisma/client';
import { openAIService } from './openaiService.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ==================== TIPOS ====================

interface CreateAIExamParams {
  title: string;
  description?: string;
  instructions?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  accessType: AIExamAccessType;
  questionsPerAttempt: number;
  showResults?: boolean;
  createdById: string;
}

interface GenerateQuestionsParams {
  aiExamId: string;
  pdfContent: string;
  numberOfQuestions: number;
  difficulty?: string;
  topic?: string;
}

interface UpdateAIExamData {
  title?: string;
  description?: string;
  instructions?: string;
  timeLimit?: number | null;
  isActive?: boolean;
  maxAttempts?: number;
  passingScore?: number;
  questionsPerAttempt?: number;
  accessType?: AIExamAccessType;
  showResults?: boolean;
}

interface Student {
  name: string;
  email: string;
  password: string;
}

interface CreatedStudent {
  id: string;
  name: string;
  email: string;
  plainPassword: string;
}

interface StartAttemptParams {
  aiExamId: string;
  studentName: string;
  studentEmail?: string;
  studentId?: string;
  ipAddress: string;
  userAgent: string;
}

interface QuestionResponse {
  questionId: string;
  selectedOptionId: string;
}

interface QuestionForStudent {
  id: string;
  text: string;
  helpText?: string | null;
  points: number;
  options: {
    id: string;
    text: string;
  }[];
}

// ==================== CLASE ====================

class AIExamService {
  /**
   * Crear un nuevo examen con IA
   */
  async createAIExam(params: CreateAIExamParams) {
    const slug = this.generateSlug(params.title);

    const aiExam = await prisma.aIExam.create({
      data: {
        title: params.title,
        description: params.description || null,
        instructions: params.instructions || null,
        slug,
        timeLimit: params.timeLimit || null,
        maxAttempts: params.maxAttempts || 1,
        passingScore: params.passingScore || 60,
        accessType: params.accessType,
        questionsPerAttempt: params.questionsPerAttempt,
        showResults: params.showResults !== undefined ? params.showResults : true,
        createdById: params.createdById,
        publicUrl: `/ai-exam/${slug}`,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return aiExam;
  }

  /**
   * Generar preguntas con IA a partir de un PDF
   */
  async generateQuestionsFromPDF(params: GenerateQuestionsParams) {
    const { aiExamId, pdfContent, numberOfQuestions, difficulty, topic } = params;

    // Verificar que el examen existe
    const aiExam = await prisma.aIExam.findUnique({
      where: { id: aiExamId },
    });

    if (!aiExam) {
      throw new Error('Examen no encontrado');
    }

    // Generar preguntas con OpenAI
    const { questions } = await openAIService.generateQuestions({
      content: pdfContent,
      numberOfQuestions,
      difficulty,
      topic,
    });

    // Crear sección por defecto si no existe
    let section = await prisma.aIExamSection.findFirst({
      where: { aiExamId },
    });

    if (!section) {
      section = await prisma.aIExamSection.create({
        data: {
          aiExamId,
          title: 'Preguntas Generadas',
          description: 'Preguntas generadas automáticamente con IA',
          order: 1,
        },
      });
    }

    // Guardar preguntas en la base de datos
    const savedQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      // Preparar metadata
      let metadata: any = question.metadata || {};

      // Filtrar opciones válidas (que tengan text definido y no vacío)
      const validOptions = question.options?.filter(opt => opt && opt.text && opt.text.trim() !== '') || [];
      
      if (validOptions.length < 2) {
        console.warn(`Pregunta ${i + 1} tiene menos de 2 opciones válidas, saltando...`);
        continue;
      }

      const savedQuestion = await prisma.aIExamQuestion.create({
        data: {
          sectionId: section.id,
          text: question.text,
          feedback: question.feedback || null,
          points: 1,
          order: i + 1,
          aiGenerated: true,
          validated: false,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          options: {
            create: validOptions.map((opt, optIndex) => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
              order: optIndex + 1,
            })),
          },
        },
        include: {
          options: true,
        },
      });

      savedQuestions.push(savedQuestion);
    }

    // Actualizar contador de preguntas en el examen
    await prisma.aIExam.update({
      where: { id: aiExamId },
      data: {
        totalQuestionsInPool: savedQuestions.length,
        aiGenerated: true,
        sourceDocument: 'PDF uploaded',
      },
    });

    return {
      questions: savedQuestions,
      totalGenerated: savedQuestions.length,
    };
  }

  /**
   * Obtener todos los exámenes de un profesor
   */
  async getAIExamsByCreator(createdById: string, userRole?: string) {
    // SUPER_ADMIN ve todos
    if (userRole === 'SUPER_ADMIN') {
      return await prisma.aIExam.findMany({
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          sections: { include: { questions: { include: { options: true } } } },
          _count: { select: { attempts: true, students: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return await prisma.aIExam.findMany({
      where: {
        OR: [
          { createdById },
          { sharedWith: { some: { userId: createdById } } },
        ],
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        sharedWith: { where: { userId: createdById }, select: { permission: true } },
        sections: { include: { questions: { include: { options: true } } } },
        _count: { select: { attempts: true, students: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener un examen específico
   */
  async getAIExamById(id: string, includeQuestions = true) {
    const aiExam = await prisma.aIExam.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sections: includeQuestions
          ? {
              include: {
                questions: {
                  include: {
                    options: true,
                  },
                  orderBy: {
                    order: 'asc',
                  },
                },
              },
              orderBy: {
                order: 'asc',
              },
            }
          : false,
        _count: {
          select: {
            attempts: true,
            students: true,
          },
        },
      },
    });

    return aiExam;
  }

  /**
   * Actualizar un examen
   */
  async updateAIExam(id: string, data: UpdateAIExamData) {
    const aiExam = await prisma.aIExam.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        timeLimit: data.timeLimit,
        isActive: data.isActive,
        maxAttempts: data.maxAttempts,
        passingScore: data.passingScore,
        questionsPerAttempt: data.questionsPerAttempt,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return aiExam;
  }

  /**
   * Publicar un examen (cambiar de borrador a activo)
   */
  async publishAIExam(id: string) {
    // Verificar que tenga preguntas suficientes
    const aiExam = await prisma.aIExam.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!aiExam) {
      throw new Error('Examen no encontrado');
    }

    const totalQuestions = aiExam.sections.reduce(
      (sum, section) => sum + section.questions.length,
      0
    );

    if (totalQuestions < aiExam.questionsPerAttempt) {
      throw new Error(
        `El examen necesita al menos ${aiExam.questionsPerAttempt} preguntas para ser publicado. Actualmente tiene ${totalQuestions}.`
      );
    }

    const updated = await prisma.aIExam.update({
      where: { id },
      data: {
        isActive: true,
        validated: true,
      },
    });

    return updated;
  }

  /**
   * Eliminar un examen
   */
  async deleteAIExam(id: string) {
    // Verificar si hay intentos realizados antes de eliminar
    const exam = await prisma.aIExam.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    });

    if (!exam) {
      throw new Error('Examen no encontrado');
    }

    if (exam._count.attempts > 0) {
      throw new Error(
        `No se puede eliminar el examen porque ya tiene ${exam._count.attempts} intento(s) realizado(s). Los estudiantes perderían acceso a sus resultados. Considera desactivar el examen en su lugar.`
      );
    }

    await prisma.aIExam.delete({
      where: { id },
    });
  }

  /**
   * Agregar estudiantes a un examen privado (desde CSV/Excel)
   */
  async addStudentsToPrivateExam(aiExamId: string, students: Student[]): Promise<CreatedStudent[]> {
    const aiExam = await prisma.aIExam.findUnique({
      where: { id: aiExamId },
    });

    if (!aiExam) {
      throw new Error('Examen no encontrado');
    }

    if (aiExam.accessType !== 'PRIVATE') {
      throw new Error('Solo se pueden agregar estudiantes a exámenes privados');
    }

    const createdStudents: CreatedStudent[] = [];
    for (const student of students) {
      const hashedPassword = await bcrypt.hash(student.password, 10);

      const created = await prisma.aIExamStudent.create({
        data: {
          aiExamId,
          name: student.name,
          email: student.email,
          password: hashedPassword,
        },
      });

      createdStudents.push({
        id: created.id,
        name: created.name,
        email: created.email,
        plainPassword: student.password, // Guardar contraseña sin hashear para enviar por email
      });
    }

    return createdStudents;
  }

  /**
   * Iniciar un intento de examen
   */
  async startAttempt(params: StartAttemptParams) {
    const { aiExamId, studentName, studentEmail, studentId, ipAddress, userAgent } = params;

    const aiExam = await prisma.aIExam.findUnique({
      where: { id: aiExamId },
      include: {
        sections: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!aiExam) {
      throw new Error('Examen no encontrado');
    }

    if (!aiExam.isActive) {
      throw new Error('El examen no está disponible');
    }

    // Verificar intentos previos
    const previousAttempts = await prisma.aIExamAttempt.count({
      where: {
        aiExamId,
        ...(studentId ? { studentId } : { studentEmail }),
      },
    });

    if (previousAttempts >= aiExam.maxAttempts) {
      throw new Error('Has alcanzado el número máximo de intentos');
    }

    // Seleccionar preguntas aleatorias del pool
    const allQuestions = aiExam.sections.flatMap((section) => section.questions);
    const selectedQuestions = this.selectRandomQuestions(
      allQuestions,
      aiExam.questionsPerAttempt
    );

    // Crear intento
    const attempt = await prisma.aIExamAttempt.create({
      data: {
        aiExamId,
        attemptNumber: previousAttempts + 1,
        studentName,
        studentEmail: studentEmail || null,
        studentId: studentId || null,
        selectedQuestions: selectedQuestions.map((q) => q.id),
        ipAddress,
        userAgent,
      },
    });

    // Retornar preguntas sin mostrar las respuestas correctas
    const questionsForStudent: QuestionForStudent[] = selectedQuestions.map((q) => ({
      id: q.id,
      text: q.text,
      helpText: q.helpText,
      points: q.points,
      options: aiExam.shuffleOptions
        ? this.shuffleArray(
            q.options.map((opt) => ({
              id: opt.id,
              text: opt.text,
            }))
          )
        : q.options.map((opt) => ({
            id: opt.id,
            text: opt.text,
          })),
    }));

    return {
      attempt: {
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
      },
      questions: aiExam.shuffleQuestions
        ? this.shuffleArray(questionsForStudent)
        : questionsForStudent,
      timeLimit: aiExam.timeLimit,
    };
  }

  /**
   * Enviar respuestas y calificar
   */
  async submitAttempt(attemptId: string, responses: QuestionResponse[]) {
    const attempt = await prisma.aIExamAttempt.findUnique({
      where: { id: attemptId },
      include: {
        aiExam: {
          include: {
            sections: {
              include: {
                questions: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new Error('Intento no encontrado');
    }

    if (attempt.completedAt) {
      throw new Error('Este intento ya fue completado');
    }

    // Calificar respuestas
    let totalCorrect = 0;
    let totalPoints = 0;

    for (const response of responses) {
      const question = attempt.aiExam.sections
        .flatMap((s) => s.questions)
        .find((q) => q.id === response.questionId);

      if (!question) continue;

      const selectedOption = question.options.find(
        (opt) => opt.id === response.selectedOptionId
      );

      const isCorrect = selectedOption?.isCorrect || false;
      const pointsEarned = isCorrect ? question.points : 0;

      if (isCorrect) totalCorrect++;
      totalPoints += pointsEarned;

      await prisma.aIExamResponse.create({
        data: {
          attemptId,
          questionId: response.questionId,
          selectedOptionId: response.selectedOptionId,
          isCorrect,
          pointsEarned,
        },
      });
    }

    // Calcular calificación
    const totalQuestions = responses.length;
    const maxScore = totalQuestions;
    const score = (totalCorrect / totalQuestions) * 100;
    const passed = score >= attempt.aiExam.passingScore;

    // Calcular tiempo usado
    const startTime = new Date(attempt.startedAt).getTime();
    const endTime = Date.now();
    const timeSpent = Math.floor((endTime - startTime) / 1000); // en segundos

    // Actualizar intento
    const completedAttempt = await prisma.aIExamAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
        timeSpent,
        score,
        maxScore,
        passed,
        totalCorrect,
        totalQuestions,
      },
      include: {
        responses: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
            selectedOption: true,
          },
        },
      },
    });

    return completedAttempt;
  }

  /**
   * Obtener resultados de un examen
   */
  async getExamResults(aiExamId: string) {
    const attempts = await prisma.aIExamAttempt.findMany({
      where: {
        aiExamId,
        completedAt: { not: null },
      },
      include: {
        student: {
          select: {
            name: true,
            email: true,
          },
        },
        responses: {
          include: {
            question: true,
            selectedOption: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    return attempts;
  }

  // ==================== COMPARTIR ====================

  async checkAIExamPermission(aiExamId: string, userId: string, userRole: string): Promise<SharePermission | null> {
    if (userRole === 'SUPER_ADMIN') return 'FULL';

    const exam = await prisma.aIExam.findUnique({
      where: { id: aiExamId },
      include: { sharedWith: { where: { userId } } },
    });

    if (!exam) return null;
    if (exam.createdById === userId) return 'FULL';
    if (exam.sharedWith.length > 0) return exam.sharedWith[0].permission;
    return null;
  }

  async shareAIExam(aiExamId: string, userId: string, permission: SharePermission) {
    return await prisma.aIExamShare.upsert({
      where: { aiExamId_userId: { aiExamId, userId } },
      update: { permission },
      create: { aiExamId, userId, permission },
    });
  }

  async unshareAIExam(aiExamId: string, userId: string) {
    return await prisma.aIExamShare.delete({
      where: { aiExamId_userId: { aiExamId, userId } },
    });
  }

  async getAIExamShares(aiExamId: string) {
    return await prisma.aIExamShare.findMany({
      where: { aiExamId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { sharedAt: 'desc' },
    });
  }

  async getAvailableUsersForAIExam(aiExamId: string) {
    const exam = await prisma.aIExam.findUnique({
      where: { id: aiExamId },
      select: { createdById: true },
    });
    if (!exam) throw new Error('Examen no encontrado');

    return await prisma.user.findMany({
      where: { id: { not: exam.createdById }, isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateAIExamSharePermission(aiExamId: string, userId: string, permission: SharePermission) {
    return await prisma.aIExamShare.update({
      where: { aiExamId_userId: { aiExamId, userId } },
      data: { permission },
    });
  }

  /**
   * Utilidades
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) + '-' + Date.now().toString(36);
  }

  selectRandomQuestions<T>(questions: T[], count: number): T[] {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const aiExamService = new AIExamService();
