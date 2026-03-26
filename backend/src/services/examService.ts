import { PrismaClient, Prisma, ExamQuestionType, ShowResultsType } from '@prisma/client';

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
  templateId?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResults?: ShowResultsType;
  allowReview?: boolean;
  sections: ExamSection[];
}

interface UpdateExamData extends CreateExamData {}

interface FileData {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

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
          select: { attempts: true, versions: true, supportFiles: true }
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
        select: { attempts: true, versions: true, supportFiles: true }
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
      supportFiles: {
        orderBy: { order: 'asc' }
      },
      versions: {
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
        },
        orderBy: { version: 'desc' }
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
      supportFiles: {
        orderBy: { order: 'asc' }
      },
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        select: {
          id: true,
          version: true,
          createdAt: true,
          sections: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              questions: {
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  type: true,
                  text: true,
                  helpText: true,
                  points: true,
                  order: true,
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
      }
    }
  });

  if (!exam || !exam.isActive || !exam.isPublic) {
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
    templateId, 
    timeLimit,
    maxAttempts,
    passingScore,
    shuffleQuestions,
    shuffleOptions,
    showResults,
    allowReview,
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

  const totalPoints = calculateTotalPoints(sections);

  const exam = await prisma.exam.create({
    data: {
      title,
      description,
      slug,
      templateId: templateId || null,
      timeLimit: timeLimit || null,
      maxAttempts: maxAttempts || 1,
      passingScore: passingScore || 60,
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      showResults: (showResults as ShowResultsType) || 'IMMEDIATE',
      allowReview: allowReview !== undefined ? allowReview : true,
      autoGrade: checkIfAutoGradable(sections),
      createdById: userId,
      versions: {
        create: {
          version: 1,
          title,
          description: description || null,
          totalPoints,
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
        }
      }
    },
    include: {
      versions: {
        include: {
          sections: {
            include: {
              questions: {
                include: {
                  options: true
                }
              }
            }
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
    templateId,
    timeLimit,
    maxAttempts,
    passingScore,
    shuffleQuestions,
    shuffleOptions,
    showResults,
    allowReview,
    sections 
  } = data;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1
      }
    }
  });

  if (!exam) {
    throw new Error('Examen no encontrado');
  }

  const latestVersion = exam.versions[0];
  const newVersion = latestVersion ? latestVersion.version + 1 : 1;
  const totalPoints = calculateTotalPoints(sections);

  const updatedExam = await prisma.exam.update({
    where: { id: examId },
    data: {
      title,
      description,
      templateId: templateId || null,
      timeLimit: timeLimit || null,
      maxAttempts,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      allowReview,
      autoGrade: checkIfAutoGradable(sections),
      versions: {
        create: {
          version: newVersion,
          title,
          description: description || null,
          totalPoints,
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
        }
      }
    },
    include: {
      versions: {
        include: {
          sections: {
            include: {
              questions: {
                include: {
                  options: true
                }
              }
            }
          }
        },
        orderBy: { version: 'desc' }
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
export const toggleExamPublish = async (examId: string, isPublic: boolean) => {
  const examData = await prisma.exam.findUnique({ where: { id: examId } });
  
  const exam = await prisma.exam.update({
    where: { id: examId },
    data: { 
      isPublic,
      publicUrl: isPublic ? `/e/${examData?.slug}` : null
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

/**
 * Subir archivo de apoyo
 */
export const addSupportFile = async (examId: string, fileData: FileData) => {
  const { fileName, fileUrl, fileType, fileSize } = fileData;

  const maxOrder = await prisma.examFile.findFirst({
    where: { examId },
    orderBy: { order: 'desc' },
    select: { order: true }
  });

  return await prisma.examFile.create({
    data: {
      examId,
      fileName,
      fileUrl,
      fileType,
      fileSize,
      order: maxOrder ? maxOrder.order + 1 : 0
    }
  });
};

/**
 * Eliminar archivo de apoyo
 */
export const deleteSupportFile = async (fileId: string) => {
  return await prisma.examFile.delete({
    where: { id: fileId }
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
 * Calcular puntos totales del examen
 */
function calculateTotalPoints(sections: ExamSection[]): number {
  let total = 0;
  sections.forEach(section => {
    section.questions.forEach(question => {
      total += question.points || 1;
    });
  });
  return total;
}

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
        // TEXT puede ser auto-calificable si tiene respuesta correcta definida
        if (question.type === 'TEXT' && question.correctAnswer?.keywords) {
          continue;
        }
        return false;
      }
    }
  }

  return true;
}
