import { PrismaClient } from '@prisma/client';
import { openAIService } from './openaiService.js';
import { pdfService } from './pdfService.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

class AIExamService {
  /**
   * Crear un nuevo examen con IA
   */
  async createAIExam(params) {
    const slug = this.generateSlug(params.title);

    const aiExam = await prisma.aIExam.create({
      data: {
        title: params.title,
        description: params.description,
        instructions: params.instructions,
        slug,
        timeLimit: params.timeLimit,
        maxAttempts: params.maxAttempts || 1,
        passingScore: params.passingScore || 60,
        accessType: params.accessType,
        questionsPerAttempt: params.questionsPerAttempt,
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
  async generateQuestionsFromPDF(params) {
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

      const savedQuestion = await prisma.aIExamQuestion.create({
        data: {
          sectionId: section.id,
          text: question.text,
          feedback: question.feedback,
          points: 1,
          order: i + 1,
          aiGenerated: true,
          validated: false,
          options: {
            create: question.options.map((opt, optIndex) => ({
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
  async getAIExamsByCreator(createdById) {
    const exams = await prisma.aIExam.findMany({
      where: { createdById },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sections: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
        _count: {
          select: {
            attempts: true,
            students: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return exams;
  }

  /**
   * Obtener un examen específico
   */
  async getAIExamById(id, includeQuestions = true) {
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
  async updateAIExam(id, data) {
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
  async publishAIExam(id) {
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
  async deleteAIExam(id) {
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
  async addStudentsToPrivateExam(aiExamId, students) {
    const aiExam = await prisma.aIExam.findUnique({
      where: { id: aiExamId },
    });

    if (!aiExam) {
      throw new Error('Examen no encontrado');
    }

    if (aiExam.accessType !== 'PRIVATE') {
      throw new Error('Solo se pueden agregar estudiantes a exámenes privados');
    }

    const createdStudents = [];
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
  async startAttempt(params) {
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
        studentEmail,
        studentId,
        selectedQuestions: selectedQuestions.map((q) => q.id),
        ipAddress,
        userAgent,
      },
    });

    // Retornar preguntas sin mostrar las respuestas correctas
    const questionsForStudent = selectedQuestions.map((q) => ({
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
  async submitAttempt(attemptId, responses) {
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
  async getExamResults(aiExamId) {
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

  /**
   * Utilidades
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) + '-' + Date.now().toString(36);
  }

  selectRandomQuestions(questions, count) {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const aiExamService = new AIExamService();
