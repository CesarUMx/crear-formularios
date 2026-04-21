import { PrismaClient, ExamQuestionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// ==================== TIPOS ====================

type Permission = 'VIEW' | 'EDIT' | 'FULL';

interface ExamSection {
  title: string;
  description?: string;
  questions: ExamQuestion[];
}

interface ExamQuestion {
  type: ExamQuestionType;
  text: string;
  helpText?: string;
  points?: number;
  correctAnswer?: any;
  metadata?: any;
  feedback?: string;
  options?: ExamOption[];
}

interface ExamOption {
  text: string;
  isCorrect?: boolean;
}

interface CreateExamData {
  title: string;
  description?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResults?: boolean;
  instructions?: string;
  questionsPerAttempt?: number;
  accessType?: string;
  sections: ExamSection[];
}

interface UpdateExamData extends CreateExamData {}

// ==================== FUNCIONES ====================

/**
 * Obtener todos los exámenes del usuario
 */
export const getUserExams = async (userId: string, userRole: string) => {
  if (userRole === 'SUPER_ADMIN') {
    return await prisma.exam.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { attempts: true, sections: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  return await prisma.exam.findMany({
    where: {
      OR: [
        { createdById: userId },
        { sharedWith: { some: { userId } } }
      ]
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      },
      sharedWith: {
        where: { userId },
        select: { permission: true }
      },
      _count: {
        select: { attempts: true, sections: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
};

/**
 * Obtener un examen por ID
 */
export const getExamById = async (examId: string) => {
  return await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      },
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
      },
      sharedWith: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      _count: {
        select: { attempts: true }
      }
    }
  });
};

/**
 * Obtener un examen por slug (para vista pública)
 */
export const getExamBySlug = async (slug: string) => {
  const exam = await prisma.exam.findUnique({
    where: { slug },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          fileUrl: true,
          fileName: true,
          fileType: true,
          questions: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              type: true,
              text: true,
              helpText: true,
              points: true,
              order: true,
              metadata: true,
              fileUrl: true,
              fileName: true,
              fileType: true,
              options: {
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  text: true,
                  order: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!exam || !exam.isActive) {
    return null;
  }

  return exam;
};

/**
 * Crear un nuevo examen
 */
export const createExam = async (userId: string, data: CreateExamData) => {
  const { 
    title, 
    description, 
    timeLimit,
    maxAttempts,
    passingScore,
    shuffleQuestions,
    shuffleOptions,
    showResults,
    instructions,
    questionsPerAttempt,
    accessType,
    sections 
  } = data;

  const baseSlug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let slug = baseSlug;
  let counter = 1;
  while (await prisma.exam.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const exam = await prisma.exam.create({
    data: {
      title,
      description,
      slug,
      timeLimit: timeLimit || null,
      maxAttempts: maxAttempts || 1,
      passingScore: passingScore || 60,
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      showResults: showResults !== undefined ? showResults : true,
      instructions: instructions || null,
      questionsPerAttempt: questionsPerAttempt || null,
      accessType: (accessType as any) || 'PUBLIC',
      autoGrade: checkIfAutoGradable(sections),
      createdById: userId,
      sections: {
        create: sections.map((section, sectionIndex) => ({
          title: section.title,
          description: section.description || null,
          order: sectionIndex,
          questions: {
            create: section.questions.map((question, questionIndex) => ({
              type: question.type,
              text: question.text,
              helpText: question.helpText || null,
              points: question.points || 1,
              order: questionIndex,
              correctAnswer: question.correctAnswer || null,
              metadata: question.metadata || null,
              feedback: question.feedback || null,
              options: question.options?.length ? {
                create: question.options.map((option, optionIndex) => ({
                  text: option.text,
                  order: optionIndex,
                  isCorrect: option.isCorrect || false
                }))
              } : undefined
            }))
          }
        }))
      }
    },
    include: {
      sections: {
        include: {
          questions: {
            include: { options: true }
          }
        }
      }
    }
  });

  return exam;
};

/**
 * Actualizar un examen existente
 */
export const updateExam = async (examId: string, data: UpdateExamData) => {
  const { 
    title, 
    description, 
    timeLimit,
    maxAttempts,
    passingScore,
    shuffleQuestions,
    shuffleOptions,
    showResults,
    instructions,
    questionsPerAttempt,
    accessType,
    sections 
  } = data;

  const exam = await prisma.exam.findUnique({
    where: { id: examId }
  });

  if (!exam) {
    throw new Error('Examen no encontrado');
  }

  // Eliminar secciones anteriores (cascade elimina preguntas y opciones)
  await prisma.examSection.deleteMany({
    where: { examId }
  });

  const updatedExam = await prisma.exam.update({
    where: { id: examId },
    data: {
      title,
      description,
      timeLimit: timeLimit || null,
      maxAttempts,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      instructions: instructions || null,
      questionsPerAttempt: questionsPerAttempt || null,
      accessType: accessType ? (accessType as any) : undefined,
      autoGrade: checkIfAutoGradable(sections),
      sections: {
        create: sections.map((section, sectionIndex) => ({
          title: section.title,
          description: section.description || null,
          order: sectionIndex,
          questions: {
            create: section.questions.map((question, questionIndex) => ({
              type: question.type,
              text: question.text,
              helpText: question.helpText || null,
              points: question.points || 1,
              order: questionIndex,
              correctAnswer: question.correctAnswer || null,
              metadata: question.metadata || null,
              feedback: question.feedback || null,
              options: question.options?.length ? {
                create: question.options.map((option, optionIndex) => ({
                  text: option.text,
                  order: optionIndex,
                  isCorrect: option.isCorrect || false
                }))
              } : undefined
            }))
          }
        }))
      }
    },
    include: {
      sections: {
        include: {
          questions: {
            include: { options: true }
          }
        }
      }
    }
  });

  return updatedExam;
};

/**
 * Eliminar un examen
 */
export const deleteExam = async (examId: string) => {
  return await prisma.exam.delete({
    where: { id: examId }
  });
};

/**
 * Publicar/despublicar un examen
 */
export const toggleExamPublish = async (examId: string, isActive: boolean) => {
  const examData = await prisma.exam.findUnique({ where: { id: examId } });
  
  const exam = await prisma.exam.update({
    where: { id: examId },
    data: { 
      isActive,
      publicUrl: isActive ? `/e/${examData?.slug}` : null
    }
  });

  return exam;
};

/**
 * Activar/desactivar un examen
 */
export const toggleExamActive = async (examId: string, isActive: boolean) => {
  return await prisma.exam.update({
    where: { id: examId },
    data: { isActive }
  });
};

/**
 * Compartir examen con usuario
 */
export const shareExam = async (examId: string, userId: string, permission: Permission) => {
  return await prisma.examShare.upsert({
    where: {
      examId_userId: {
        examId,
        userId
      }
    },
    update: { permission },
    create: {
      examId,
      userId,
      permission
    }
  });
};

/**
 * Remover acceso compartido
 */
export const unshareExam = async (examId: string, userId: string) => {
  return await prisma.examShare.delete({
    where: {
      examId_userId: {
        examId,
        userId
      }
    }
  });
};

export const getExamShares = async (examId: string) => {
  return await prisma.examShare.findMany({
    where: { examId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { sharedAt: 'desc' },
  });
};

export const getAvailableUsersForExam = async (examId: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { createdById: true },
  });
  if (!exam) throw new Error('Examen no encontrado');

  return await prisma.user.findMany({
    where: { id: { not: exam.createdById }, isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });
};

export const updateExamSharePermission = async (examId: string, userId: string, permission: Permission) => {
  return await prisma.examShare.update({
    where: { examId_userId: { examId, userId } },
    data: { permission },
  });
};

/**
 * Verificar permisos de usuario sobre examen
 */
export const checkExamPermission = async (
  examId: string, 
  userId: string, 
  userRole: string
): Promise<Permission | null> => {
  if (userRole === 'SUPER_ADMIN') {
    return 'FULL';
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      sharedWith: {
        where: { userId }
      }
    }
  });

  if (!exam) {
    return null;
  }

  if (exam.createdById === userId) {
    return 'FULL';
  }

  if (exam.sharedWith.length > 0) {
    return exam.sharedWith[0].permission as Permission;
  }

  return null;
};

/**
 * Verificar si un examen puede ser calificado automáticamente
 */
function checkIfAutoGradable(sections: ExamSection[]): boolean {
  const autoGradableTypes: ExamQuestionType[] = [
    'RADIO',
    'CHECKBOX',
    'TRUE_FALSE',
    'MATCHING',
    'ORDERING'
  ];

  for (const section of sections) {
    for (const question of section.questions) {
      if (!autoGradableTypes.includes(question.type)) {
        if (question.type === 'TEXT' && question.correctAnswer?.keywords) {
          continue;
        }
        return false;
      }
    }
  }

  return true;
}

// ==================== ARCHIVOS (Sección/Pregunta) ====================

/**
 * Subir archivo a una sección
 */
export const uploadSectionFile = async (
  examId: string,
  sectionId: string,
  file: { url: string; name: string; type: string; size: number }
) => {
  const section = await prisma.examSection.findFirst({
    where: { id: sectionId, examId }
  });

  if (!section) {
    throw new Error('Sección no encontrada');
  }

  // Eliminar archivo anterior si existe
  if (section.fileUrl) {
    deleteFileFromDisk(section.fileUrl);
  }

  return await prisma.examSection.update({
    where: { id: sectionId },
    data: {
      fileUrl: file.url,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    }
  });
};

/**
 * Eliminar archivo de una sección
 */
export const deleteSectionFile = async (examId: string, sectionId: string) => {
  const section = await prisma.examSection.findFirst({
    where: { id: sectionId, examId }
  });

  if (!section) {
    throw new Error('Sección no encontrada');
  }

  if (section.fileUrl) {
    deleteFileFromDisk(section.fileUrl);
  }

  return await prisma.examSection.update({
    where: { id: sectionId },
    data: {
      fileUrl: null,
      fileName: null,
      fileType: null,
      fileSize: null
    }
  });
};

/**
 * Subir archivo a una pregunta
 */
export const uploadQuestionFile = async (
  examId: string,
  questionId: string,
  file: { url: string; name: string; type: string; size: number }
) => {
  const question = await prisma.examQuestion.findFirst({
    where: {
      id: questionId,
      section: { examId }
    }
  });

  if (!question) {
    throw new Error('Pregunta no encontrada');
  }

  // Eliminar archivo anterior si existe
  if (question.fileUrl) {
    deleteFileFromDisk(question.fileUrl);
  }

  return await prisma.examQuestion.update({
    where: { id: questionId },
    data: {
      fileUrl: file.url,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    }
  });
};

/**
 * Eliminar archivo de una pregunta
 */
export const deleteQuestionFile = async (examId: string, questionId: string) => {
  const question = await prisma.examQuestion.findFirst({
    where: {
      id: questionId,
      section: { examId }
    }
  });

  if (!question) {
    throw new Error('Pregunta no encontrada');
  }

  if (question.fileUrl) {
    deleteFileFromDisk(question.fileUrl);
  }

  return await prisma.examQuestion.update({
    where: { id: questionId },
    data: {
      fileUrl: null,
      fileName: null,
      fileType: null,
      fileSize: null
    }
  });
};

function deleteFileFromDisk(fileUrl: string) {
  try {
    const fileName = fileUrl.split('/uploads/').pop();
    if (fileName) {
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch {
    // Silenciar errores de eliminación de archivo
  }
}

// ==================== ESTUDIANTES (Examen Privado) ====================

interface StudentInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Agregar estudiantes a un examen privado
 */
export const addStudents = async (examId: string, students: StudentInput[]) => {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw new Error('Examen no encontrado');
  if (exam.accessType !== 'PRIVATE') throw new Error('El examen debe ser privado para agregar estudiantes');

  const created = [];
  for (const student of students) {
    const hashedPassword = await bcrypt.hash(student.password, 10);
    const result = await prisma.examStudent.upsert({
      where: {
        examId_email: { examId, email: student.email }
      },
      update: {
        name: student.name,
        password: hashedPassword,
        isActive: true
      },
      create: {
        examId,
        name: student.name,
        email: student.email,
        password: hashedPassword
      }
    });
    created.push(result);
  }
  return created;
};

/**
 * Obtener estudiantes de un examen
 */
export const getStudents = async (examId: string) => {
  return await prisma.examStudent.findMany({
    where: { examId },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      _count: { select: { attempts: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Actualizar estudiante (toggle activo)
 */
export const updateStudent = async (examId: string, studentId: string, data: { isActive?: boolean; name?: string }) => {
  const student = await prisma.examStudent.findFirst({
    where: { id: studentId, examId }
  });
  if (!student) throw new Error('Estudiante no encontrado');

  return await prisma.examStudent.update({
    where: { id: studentId },
    data
  });
};

/**
 * Eliminar estudiante
 */
export const deleteStudent = async (examId: string, studentId: string) => {
  const student = await prisma.examStudent.findFirst({
    where: { id: studentId, examId }
  });
  if (!student) throw new Error('Estudiante no encontrado');

  return await prisma.examStudent.delete({
    where: { id: studentId }
  });
};

/**
 * Login de estudiante para examen privado
 */
export const loginStudent = async (examSlug: string, email: string, password: string) => {
  const exam = await prisma.exam.findUnique({
    where: { slug: examSlug },
    include: {
      students: {
        where: { email, isActive: true }
      }
    }
  });

  if (!exam) throw new Error('Examen no encontrado');
  if (!exam.isActive) throw new Error('Este examen no está disponible');
  if (exam.accessType !== 'PRIVATE') throw new Error('Este examen no requiere autenticación');

  const student = exam.students[0];
  if (!student) throw new Error('Credenciales inválidas');

  const validPassword = await bcrypt.compare(password, student.password);
  if (!validPassword) throw new Error('Credenciales inválidas');

  return {
    student: {
      id: student.id,
      name: student.name,
      email: student.email
    },
    exam: {
      id: exam.id,
      title: exam.title,
      slug: exam.slug
    }
  };
};

// ==================== REPORTES DE PREGUNTAS ====================

interface ReportInput {
  examId: string;
  attemptId: string;
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  reason: string;
}

/**
 * Crear reporte de pregunta
 */
export const createQuestionReport = async (data: ReportInput) => {
  // Verificar que el intento pertenece al examen
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: data.attemptId, examId: data.examId }
  });
  if (!attempt) throw new Error('Intento no encontrado para este examen');

  return await prisma.examQuestionReport.create({
    data: {
      examId: data.examId,
      attemptId: data.attemptId,
      questionId: data.questionId,
      questionText: data.questionText,
      userAnswer: data.userAnswer,
      correctAnswer: data.correctAnswer,
      reason: data.reason
    }
  });
};

/**
 * Obtener reportes de un examen
 */
export const getQuestionReports = async (examId: string, status?: string) => {
  return await prisma.examQuestionReport.findMany({
    where: {
      examId,
      ...(status ? { status: status as any } : {})
    },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Revisar reporte
 */
export const reviewQuestionReport = async (
  reportId: string,
  data: { status: string; reviewNotes?: string; reviewedBy: string }
) => {
  return await prisma.examQuestionReport.update({
    where: { id: reportId },
    data: {
      status: data.status as any,
      reviewNotes: data.reviewNotes,
      reviewedBy: data.reviewedBy,
      reviewedAt: new Date()
    }
  });
};
