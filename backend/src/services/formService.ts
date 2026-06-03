import { PrismaClient, Form, Prisma, QuestionType, SharePermission } from '@prisma/client';

const prisma = new PrismaClient();

type FormWithRelations = Prisma.FormGetPayload<{
  include: {
    createdBy: {
      select: { id: true; name: true; email: true };
    };
    versions: {
      include: {
        sections: {
          include: {
            questions: {
              include: {
                options: true;
              };
            };
          };
        };
      };
    };
    sharedWith: {
      include: {
        user: {
          select: { id: true; name: true; email: true };
        };
      };
    };
    _count: {
      select: { responses: true };
    };
  };
}>;

interface FormSection {
  title: string;
  description?: string;
  questions: FormQuestion[];
}

interface FormQuestion {
  id?: string; // ID temporal del frontend (ej: "temp-0-0-1234567890")
  type: QuestionType;
  text: string;
  placeholder?: string;
  helpText?: string;
  isRequired?: boolean;
  allowedFileTypes?: string;
  maxFileSize?: number;
  conditionalLogic?: Prisma.InputJsonValue;
  options?: Array<{ text: string }>;
}

interface CreateFormData {
  title: string;
  description?: string;
  templateId?: string;
  formType?: 'STANDARD' | 'EXAM_REGISTRATION';
  linkedExamId?: string;
  emailQuestionId?: string;
  nameQuestionId?: string;
  allowExemption?: boolean;
  registrationCondition?: any;
  sections?: FormSection[];
}

interface UpdateFormData extends CreateFormData {}

/**
 * Obtener todos los formularios del usuario
 */
export const getUserForms = async (userId: string, userRole: string): Promise<Form[]> => {
  if (userRole === 'SUPER_ADMIN') {
    return await prisma.form.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { responses: true, versions: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  return await prisma.form.findMany({
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
        select: { responses: true, versions: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
};

/**
 * Obtener un formulario por ID
 */
export const getFormById = async (formId: string): Promise<FormWithRelations | null> => {
  return await prisma.form.findUnique({
    where: { id: formId },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
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
        select: { responses: true }
      }
    }
  });
};

/**
 * Crear un nuevo formulario
 */
export const createForm = async (userId: string, data: CreateFormData) => {
  const { title, description, templateId, formType, linkedExamId, emailQuestionId, nameQuestionId, allowExemption, registrationCondition, sections } = data;

  // Generar slug único
  const baseSlug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let slug = baseSlug;
  let counter = 1;

  // Verificar si el slug existe
  while (await prisma.form.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Crear formulario y primera versión paso a paso para manejar conditionalLogic
  const form = await prisma.form.create({
    data: {
      title,
      description,
      slug,
      templateId,
      formType: formType || 'STANDARD',
      linkedExamId: formType === 'EXAM_REGISTRATION' ? (linkedExamId || null) : null,
      emailQuestionId: formType === 'EXAM_REGISTRATION' ? (emailQuestionId || null) : null,
      nameQuestionId: formType === 'EXAM_REGISTRATION' ? (nameQuestionId || null) : null,
      allowExemption: formType === 'EXAM_REGISTRATION' ? (allowExemption ?? false) : false,
      registrationCondition: formType === 'EXAM_REGISTRATION' ? (registrationCondition || null) : null,
      createdById: userId
    }
  });

  const version = await prisma.formVersion.create({
    data: {
      formId: form.id,
      version: 1,
      title,
      description
    }
  });

  // Crear secciones y preguntas, mapeando índices a IDs
  const questionIdMap = new Map<string, string>(); // "question-{sIdx}-{qIdx}" -> questionId
  const questionsWithLogic: Array<{ questionId: string; logic: any }> = [];

  for (let sIdx = 0; sIdx < (sections?.length || 0); sIdx++) {
    const section = sections![sIdx];

    const newSection = await prisma.section.create({
      data: {
        formVersionId: version.id,
        title: section.title,
        description: section.description,
        order: sIdx
      }
    });

    for (let qIdx = 0; qIdx < section.questions.length; qIdx++) {
      const question = section.questions[qIdx];
      // Usar el ID temporal del frontend como clave (ej: "temp-0-0-1234567890")
      const tempKey = question.id || `question-${sIdx}-${qIdx}`;

      if (question.conditionalLogic) {
        questionsWithLogic.push({
          questionId: tempKey,
          logic: question.conditionalLogic
        });
      }

      const newQuestion = await prisma.question.create({
        data: {
          sectionId: newSection.id,
          type: question.type,
          text: question.text,
          placeholder: question.placeholder,
          helpText: question.helpText,
          isRequired: question.isRequired || false,
          allowedFileTypes: question.allowedFileTypes,
          maxFileSize: question.maxFileSize,
          order: qIdx,
          options: {
            create: question.options?.map((opt, optIdx) => ({
              text: opt.text,
              order: optIdx
            })) || []
          }
        }
      });

      questionIdMap.set(tempKey, newQuestion.id);
    }
  }

  // Actualizar conditionalLogic con nuevos IDs
  for (const item of questionsWithLogic) {
    const newQuestionId = questionIdMap.get(item.questionId);
    if (!newQuestionId) continue;

    const updatedLogic = {
      combinator: item.logic.combinator || 'AND',
      action: item.logic.action || 'SHOW',
      rules: (item.logic.rules || []).map((rule: any) => {
        const mappedQuestionId = questionIdMap.get(rule.questionId);

        return {
          questionId: mappedQuestionId || rule.questionId,
          operator: rule.operator || 'equals',
          value: rule.value
        };
      })
    };

    await prisma.question.update({
      where: { id: newQuestionId },
      data: { conditionalLogic: updatedLogic as any }
    });
  }

  // Retornar formulario completo
  return await prisma.form.findUnique({
    where: { id: form.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      versions: {
        where: { id: version.id },
        include: {
          sections: {
            include: {
              questions: { include: { options: true } }
            }
          }
        }
      },
      sharedWith: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      },
      _count: { select: { responses: true } }
    }
  }) as any;
};

/**
 * Actualizar un formulario (actualiza la versión existente en lugar de crear una nueva)
 * Estrategia: Reutilizar la misma FormVersion, borrar secciones/preguntas viejas y recrear
 */
export const updateForm = async (formId: string, data: UpdateFormData) => {
  const { title, description, templateId, formType, linkedExamId, emailQuestionId, nameQuestionId, allowExemption, registrationCondition, sections } = data;

  // Obtener la versión existente (siempre la más reciente)
  let existingVersion = await prisma.formVersion.findFirst({
    where: { formId },
    orderBy: { version: 'desc' }
  });

  if (!existingVersion) {
    // Si no existe ninguna versión (caso raro), crear una
    existingVersion = await prisma.formVersion.create({
      data: { formId, version: 1, title, description }
    });
  } else {
    // Actualizar el título/descripción de la versión existente
    await prisma.formVersion.update({
      where: { id: existingVersion.id },
      data: { title, description }
    });

    // Eliminar versiones antiguas (si hubiera más de una, limpiar)
    await prisma.formVersion.deleteMany({
      where: { formId, id: { not: existingVersion.id } }
    });

    // Borrar secciones existentes (las preguntas se borran en cascada)
    await prisma.section.deleteMany({
      where: { formVersionId: existingVersion.id }
    });
  }

  const currentVersion = existingVersion;

  // Crear secciones y preguntas, mapeando índices a IDs
  const sectionIdMap = new Map<string, string>(); // "section-{index}" -> sectionId
  const questionIdMap = new Map<string, string>(); // "question-{sIdx}-{qIdx}" -> questionId
  const questionsWithLogic: Array<{ questionId: string; logic: any; sectionIndex: number; questionIndex: number }> = [];

  for (let sIdx = 0; sIdx < (sections?.length || 0); sIdx++) {
    const section = sections![sIdx];

    // Crear sección
    const newSection = await prisma.section.create({
      data: {
        formVersionId: currentVersion.id,
        title: section.title,
        description: section.description,
        order: sIdx
      }
    });
    sectionIdMap.set(`section-${sIdx}`, newSection.id);

    // Crear preguntas de esta sección
    for (let qIdx = 0; qIdx < section.questions.length; qIdx++) {
      const question = section.questions[qIdx];
      // Usar el ID temporal del frontend como clave (ej: "temp-0-0-1234567890")
      const tempKey = question.id || `question-${sIdx}-${qIdx}`;

      // Guardar la conditionalLogic para procesar después
      if (question.conditionalLogic) {
        questionsWithLogic.push({
          questionId: tempKey,
          logic: question.conditionalLogic,
          sectionIndex: sIdx,
          questionIndex: qIdx
        });
      }

      // Crear pregunta SIN conditionalLogic primero
      const newQuestion = await prisma.question.create({
        data: {
          sectionId: newSection.id,
          type: question.type,
          text: question.text,
          placeholder: question.placeholder,
          helpText: question.helpText,
          isRequired: question.isRequired || false,
          allowedFileTypes: question.allowedFileTypes,
          maxFileSize: question.maxFileSize,
          order: qIdx,
          options: {
            create: question.options?.map((opt, optIdx) => ({
              text: opt.text,
              order: optIdx
            })) || []
          }
        }
      });

      questionIdMap.set(tempKey, newQuestion.id);
    }
  }

  // Ahora actualizar las conditionalLogic con los NUEVOS IDs
  for (const item of questionsWithLogic) {
    const newQuestionId = questionIdMap.get(item.questionId);
    if (!newQuestionId) continue;

    // Mapear los questionId en las reglas a los nuevos IDs
    const updatedLogic = {
      combinator: item.logic.combinator || 'AND',
      action: item.logic.action || 'SHOW',
      rules: (item.logic.rules || []).map((rule: any) => {
        // Buscar el ID real en el mapa usando el ID temporal del frontend
        const mappedQuestionId = questionIdMap.get(rule.questionId);

        return {
          questionId: mappedQuestionId || rule.questionId,
          operator: rule.operator || 'equals',
          value: rule.value
        };
      })
    };

    await prisma.question.update({
      where: { id: newQuestionId },
      data: { conditionalLogic: updatedLogic as any }
    });
  }

  // Mapear emailQuestionId y nameQuestionId a los nuevos IDs de la versión
  const mappedEmailQuestionId = emailQuestionId ? (questionIdMap.get(emailQuestionId) || emailQuestionId) : null;
  const mappedNameQuestionId = nameQuestionId ? (questionIdMap.get(nameQuestionId) || nameQuestionId) : null;

  // Mapear registrationCondition questionIds a los nuevos IDs
  let mappedRegistrationCondition = registrationCondition || null;
  if (registrationCondition && registrationCondition.rules) {
    mappedRegistrationCondition = {
      ...registrationCondition,
      rules: registrationCondition.rules.map((rule: any) => ({
        ...rule,
        questionId: questionIdMap.get(rule.questionId) || rule.questionId,
      })),
    };
  }

  // Retornar formulario actualizado
  const form = await prisma.form.update({
    where: { id: formId },
    data: {
      title,
      description,
      ...(templateId && { templateId }),
      ...(formType && { formType }),
      linkedExamId: formType === 'EXAM_REGISTRATION' ? (linkedExamId || null) : null,
      emailQuestionId: formType === 'EXAM_REGISTRATION' ? (mappedEmailQuestionId || null) : null,
      nameQuestionId: formType === 'EXAM_REGISTRATION' ? (mappedNameQuestionId || null) : null,
      allowExemption: formType === 'EXAM_REGISTRATION' ? (allowExemption ?? false) : false,
      registrationCondition: formType === 'EXAM_REGISTRATION' ? (mappedRegistrationCondition || null) : null
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      versions: {
        where: { id: currentVersion.id },
        include: {
          sections: {
            include: {
              questions: { include: { options: true } }
            }
          }
        }
      },
      sharedWith: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      },
      _count: { select: { responses: true } }
    }
  });

  return form;
};

/**
 * Actualizar SOLO las secciones/preguntas de un formulario sin tocar configuración
 * Úsese desde el editor de preguntas para no pisar linkedExamId, etc.
 */
export const updateFormSections = async (formId: string, sections: FormSection[]) => {
  // Obtener la versión existente
  const existingVersion = await prisma.formVersion.findFirst({
    where: { formId },
    orderBy: { version: 'desc' }
  });

  if (!existingVersion) {
    throw new Error('No se encontró la versión del formulario');
  }

  // Borrar secciones existentes (preguntas en cascada)
  await prisma.section.deleteMany({ where: { formVersionId: existingVersion.id } });

  // Crear secciones y preguntas nuevas
  const sectionIdMap = new Map<string, string>();
  const questionIdMap = new Map<string, string>();
  const questionsWithLogic: Array<{ questionId: string; logic: any }> = [];

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const section = sections[sIdx];
    const newSection = await prisma.section.create({
      data: {
        formVersionId: existingVersion.id,
        title: section.title,
        description: section.description,
        order: sIdx
      }
    });
    sectionIdMap.set(`section-${sIdx}`, newSection.id);

    for (let qIdx = 0; qIdx < section.questions.length; qIdx++) {
      const question = section.questions[qIdx];
      const tempKey = question.id || `question-${sIdx}-${qIdx}`;

      if (question.conditionalLogic) {
        questionsWithLogic.push({ questionId: tempKey, logic: question.conditionalLogic });
      }

      const newQuestion = await prisma.question.create({
        data: {
          sectionId: newSection.id,
          type: question.type,
          text: question.text,
          placeholder: question.placeholder,
          helpText: question.helpText,
          isRequired: question.isRequired || false,
          allowedFileTypes: question.allowedFileTypes,
          maxFileSize: question.maxFileSize,
          order: qIdx,
          options: {
            create: question.options?.map((opt, optIdx) => ({ text: opt.text, order: optIdx })) || []
          }
        }
      });

      questionIdMap.set(tempKey, newQuestion.id);
    }
  }

  // Actualizar conditionalLogic con nuevos IDs
  for (const item of questionsWithLogic) {
    const newQuestionId = questionIdMap.get(item.questionId);
    if (!newQuestionId) continue;
    const updatedLogic = {
      combinator: item.logic.combinator || 'AND',
      action: item.logic.action || 'SHOW',
      rules: (item.logic.rules || []).map((rule: any) => ({
        questionId: questionIdMap.get(rule.questionId) || rule.questionId,
        operator: rule.operator || 'equals',
        value: rule.value
      }))
    };
    await prisma.question.update({ where: { id: newQuestionId }, data: { conditionalLogic: updatedLogic as any } });
  }

  // Mapear emailQuestionId y nameQuestionId de la forma si apuntan a preguntas viejas
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { emailQuestionId: true, nameQuestionId: true, registrationCondition: true }
  });

  if (form) {
    const mappedEmailQId = form.emailQuestionId ? (questionIdMap.get(form.emailQuestionId) || null) : null;
    const mappedNameQId = form.nameQuestionId ? (questionIdMap.get(form.nameQuestionId) || null) : null;

    // Mapear registrationCondition
    let mappedCondition = form.registrationCondition as any;
    if (mappedCondition?.rules) {
      mappedCondition = {
        ...mappedCondition,
        rules: mappedCondition.rules.map((rule: any) => ({
          ...rule,
          questionId: questionIdMap.get(rule.questionId) || rule.questionId
        }))
      };
    }

    await prisma.form.update({
      where: { id: formId },
      data: {
        ...(mappedEmailQId !== null && { emailQuestionId: mappedEmailQId }),
        ...(mappedNameQId !== null && { nameQuestionId: mappedNameQId }),
        ...(mappedCondition && { registrationCondition: mappedCondition })
      }
    });
  }

  return prisma.form.findUnique({
    where: { id: formId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      versions: {
        where: { id: existingVersion.id },
        include: { sections: { include: { questions: { include: { options: true } } } } }
      },
      _count: { select: { responses: true } }
    }
  });
};

/**
 * Eliminar un formulario
 */
export const deleteForm = async (formId: string): Promise<Form> => {
  return await prisma.form.delete({
    where: { id: formId }
  });
};

/**
 * Activar/Desactivar formulario
 */
export const toggleFormStatus = async (formId: string, isActive: boolean) => {
  return await prisma.form.update({
    where: { id: formId },
    data: { isActive }
  });
};

/**
 * Compartir formulario con otro usuario
 */
export const shareForm = async (formId: string, userId: string, permission: SharePermission) => {
  return await prisma.formShare.create({
    data: {
      formId,
      userId,
      permission
    },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });
};

/**
 * Remover acceso compartido
 */
export const unshareForm = async (formId: string, userId: string) => {
  return await prisma.formShare.delete({
    where: {
      formId_userId: {
        formId,
        userId
      }
    }
  });
};

/**
 * Actualizar permisos de compartido
 */
export const updateSharePermission = async (formId: string, userId: string, permission: SharePermission) => {
  return await prisma.formShare.update({
    where: {
      formId_userId: {
        formId,
        userId
      }
    },
    data: { permission }
  });
};

// Export types
export type { FormWithRelations, FormSection, FormQuestion, CreateFormData, UpdateFormData };
