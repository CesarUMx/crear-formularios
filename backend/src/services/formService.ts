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
  textValidation?: Prisma.InputJsonValue;
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

interface UpdateFormConfigData {
  title?: string;
  description?: string;
  templateId?: string;
  formType?: 'STANDARD' | 'EXAM_REGISTRATION';
  linkedExamId?: string;
  emailQuestionId?: string;
  nameQuestionId?: string;
  allowExemption?: boolean;
  registrationCondition?: any;
}

/**
 * Remapar questionIds en HubSpotConfig y EmailRule.conditions cuando se crea una nueva versión.
 * Los questionIds de la versión anterior quedan obsoletos; esta función los actualiza.
 */
async function remapDependentQuestionIds(
  formId: string,
  questionIdMap: Map<string, string>
): Promise<void> {
  // 1. HubSpotConfig
  const hubspot = await prisma.hubSpotConfig.findUnique({ where: { formId } });
  if (hubspot) {
    const newMatchQuestionId = questionIdMap.get(hubspot.matchQuestionId) ?? hubspot.matchQuestionId;

    const mappings = Array.isArray(hubspot.propertyMappings)
      ? (hubspot.propertyMappings as any[]).map((m: any) => ({
          ...m,
          questionId: questionIdMap.get(m.questionId) ?? m.questionId,
        }))
      : hubspot.propertyMappings;

    await prisma.hubSpotConfig.update({
      where: { formId },
      data: {
        matchQuestionId: newMatchQuestionId,
        propertyMappings: mappings as any,
      },
    });
  }

  // 2. EmailRule conditions (dentro de EmailTemplates del formulario)
  const templates = await prisma.emailTemplate.findMany({
    where: { formId },
    include: { rules: true },
  });

  for (const template of templates) {
    for (const rule of template.rules) {
      if (!rule.conditions) continue;
      const conditions = rule.conditions as any;
      if (!conditions?.rules) continue;

      const updatedConditions = {
        ...conditions,
        rules: conditions.rules.map((r: any) => ({
          ...r,
          questionId: questionIdMap.get(r.questionId) ?? r.questionId,
        })),
      };

      await prisma.emailRule.update({
        where: { id: rule.id },
        data: { conditions: updatedConditions },
      });
    }
  }
}

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
        // Solo devolver la versión más reciente para evitar cargar historial completo
        // y garantizar que el editor siempre trabaje con datos frescos
        orderBy: { version: 'desc' },
        take: 1,
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
          textValidation: question.textValidation ?? undefined,
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

  // Obtener el número de versión más alto actual
  const latestVersion = await prisma.formVersion.findFirst({
    where: { formId },
    orderBy: { version: 'desc' }
  });

  // Crear SIEMPRE una nueva versión para preservar respuestas existentes.
  // Las versiones anteriores se conservan intactas para que sus answers no se pierdan.
  const nextVersionNumber = latestVersion ? latestVersion.version + 1 : 1;
  const currentVersion = await prisma.formVersion.create({
    data: { formId, version: nextVersionNumber, title: title ?? '', description }
  });

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
          textValidation: question.textValidation ?? undefined,
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

  // Remapar HubSpot config y EmailRule conditions con los nuevos IDs de preguntas
  await remapDependentQuestionIds(formId, questionIdMap);

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
  // Obtener el número de versión más alto actual
  const latestVersion = await prisma.formVersion.findFirst({
    where: { formId },
    orderBy: { version: 'desc' }
  });

  if (!latestVersion) {
    throw new Error('No se encontró la versión del formulario');
  }

  // Obtener título/descripción de la versión anterior para la nueva versión
  const prevTitle = latestVersion.title;
  const prevDescription = latestVersion.description;

  // Crear SIEMPRE una nueva versión para preservar respuestas existentes.
  const newVersion = await prisma.formVersion.create({
    data: { formId, version: latestVersion.version + 1, title: prevTitle, description: prevDescription }
  });

  // Crear secciones y preguntas nuevas
  const sectionIdMap = new Map<string, string>();
  const questionIdMap = new Map<string, string>();
  const questionsWithLogic: Array<{ questionId: string; logic: any }> = [];

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const section = sections[sIdx];
    const newSection = await prisma.section.create({
      data: {
        formVersionId: newVersion.id,
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
          textValidation: question.textValidation ?? undefined,
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
    // Mapear o limpiar si la pregunta fue eliminada del formulario
    const mappedEmailQId = form.emailQuestionId
      ? (questionIdMap.get(form.emailQuestionId) ?? null) // null si fue eliminada
      : null;
    const mappedNameQId = form.nameQuestionId
      ? (questionIdMap.get(form.nameQuestionId) ?? null) // null si fue eliminada
      : null;

    // Mapear registrationCondition (solo questionIds — los values son textos de opciones)
    let mappedCondition = form.registrationCondition as any;
    if (mappedCondition?.rules) {
      mappedCondition = {
        ...mappedCondition,
        rules: mappedCondition.rules.map((rule: any) => ({
          ...rule,
          questionId: questionIdMap.get(rule.questionId) ?? rule.questionId
        }))
      };
    }

    await prisma.form.update({
      where: { id: formId },
      data: {
        // Siempre actualizar (null limpia referencias obsoletas a preguntas eliminadas)
        emailQuestionId: mappedEmailQId,
        nameQuestionId: mappedNameQId,
        ...(mappedCondition && { registrationCondition: mappedCondition })
      }
    });
  }

  // Remapar HubSpot config y EmailRule conditions con los nuevos IDs de preguntas
  await remapDependentQuestionIds(formId, questionIdMap);

  return prisma.form.findUnique({
    where: { id: formId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      versions: {
        where: { id: newVersion.id },
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

/**
 * Duplicar un formulario: copia toda la configuración y estructura (secciones/preguntas/opciones)
 * pero NO copia las respuestas. El formulario clonado queda inactivo y sin slug público.
 */
export const duplicateForm = async (formId: string, newOwnerId: string) => {
  // Obtener el formulario original con su versión más reciente
  const original = await prisma.form.findUnique({
    where: { id: formId },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              questions: {
                orderBy: { order: 'asc' },
                include: { options: { orderBy: { order: 'asc' } } }
              }
            }
          }
        }
      }
    }
  });

  if (!original) throw new Error('Formulario no encontrado');

  const sourceVersion = original.versions[0];

  // Generar slug único para el clon
  const baseSlug = `${original.slug}-copia`;
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.form.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  // Crear el formulario duplicado (sin respuestas, inactivo por defecto)
  const cloned = await prisma.form.create({
    data: {
      title: `${original.title} (copia)`,
      description: original.description,
      slug,
      templateId: original.templateId,
      formType: original.formType,
      isActive: false,
      createdById: newOwnerId,
      // Campos de EXAM_REGISTRATION se copian pero linkedExamId no (apuntaría al examen original)
      allowExemption: original.allowExemption,
    }
  });

  if (!sourceVersion) {
    return prisma.form.findUnique({
      where: { id: cloned.id },
      include: { createdBy: { select: { id: true, name: true, email: true } }, _count: { select: { responses: true } } }
    });
  }

  // Mapa de IDs de preguntas originales → nuevas (para remapear conditionalLogic)
  const questionIdMap = new Map<string, string>();

  // Crear la versión 1 del formulario clonado
  const clonedVersion = await prisma.formVersion.create({
    data: { formId: cloned.id, version: 1, title: sourceVersion.title, description: sourceVersion.description }
  });

  for (const section of sourceVersion.sections) {
    const clonedSection = await prisma.section.create({
      data: {
        formVersionId: clonedVersion.id,
        title: section.title,
        description: section.description,
        order: section.order
      }
    });

    for (const question of section.questions) {
      const clonedQuestion = await prisma.question.create({
        data: {
          sectionId: clonedSection.id,
          type: question.type,
          text: question.text,
          placeholder: question.placeholder,
          helpText: question.helpText,
          isRequired: question.isRequired,
          allowedFileTypes: question.allowedFileTypes,
          maxFileSize: question.maxFileSize,
          textValidation: (question as any).textValidation ?? undefined,
          order: question.order,
          options: {
            create: question.options.map(opt => ({ text: opt.text, order: opt.order }))
          }
        }
      });
      questionIdMap.set(question.id, clonedQuestion.id);
    }
  }

  // Remap conditionalLogic en las preguntas clonadas con los nuevos IDs
  for (const [originalId, clonedId] of questionIdMap.entries()) {
    const original = sourceVersion.sections
      .flatMap(s => s.questions)
      .find(q => q.id === originalId);
    if (!original?.conditionalLogic) continue;

    const logic = original.conditionalLogic as any;
    const updatedLogic = {
      combinator: logic.combinator || 'AND',
      action: logic.action || 'SHOW',
      rules: (logic.rules || []).map((rule: any) => ({
        questionId: questionIdMap.get(rule.questionId) || rule.questionId,
        operator: rule.operator,
        value: rule.value
      }))
    };
    await prisma.question.update({ where: { id: clonedId }, data: { conditionalLogic: updatedLogic } });
  }

  // Remapear emailQuestionId y nameQuestionId si existen
  const mappedEmailQId = original.emailQuestionId ? (questionIdMap.get(original.emailQuestionId) ?? null) : null;
  const mappedNameQId = original.nameQuestionId ? (questionIdMap.get(original.nameQuestionId) ?? null) : null;

  let mappedCondition = original.registrationCondition as any;
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
    where: { id: cloned.id },
    data: {
      emailQuestionId: mappedEmailQId,
      nameQuestionId: mappedNameQId,
      registrationCondition: mappedCondition ?? undefined
    }
  });

  return prisma.form.findUnique({
    where: { id: cloned.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      versions: {
        where: { id: clonedVersion.id },
        include: { sections: { include: { questions: { include: { options: true } } } } }
      },
      _count: { select: { responses: true } }
    }
  });
};

/**
 * Actualizar SOLO la configuración del formulario (sin crear versión, sin tocar secciones/preguntas)
 * Para: título, descripción, plantilla, tipo, linkedExamId, email/nameQuestionId, etc.
 */
export const updateFormConfig = async (formId: string, data: UpdateFormConfigData) => {
  const { title, description, templateId, formType, linkedExamId, emailQuestionId, nameQuestionId, allowExemption, registrationCondition } = data;

  // Si formType cambia a STANDARD, limpiar campos de examen.
  // Si no se envía formType (undefined), no tocar ningún campo de examen.
  // Si se envía formType === 'EXAM_REGISTRATION' Y los campos de examen también se envían, actualizarlos.
  const examFields = formType === undefined
    ? {}  // No tocar nada de examen
    : formType === 'STANDARD'
      ? {   // Limpiar campos de examen al cambiar a Estándar
          linkedExamId: null,
          emailQuestionId: null,
          nameQuestionId: null,
          allowExemption: false,
          registrationCondition: null,
        }
      : {   // EXAM_REGISTRATION: solo actualizar los campos que lleguen explícitamente
          ...(linkedExamId !== undefined && { linkedExamId: linkedExamId || null }),
          ...(emailQuestionId !== undefined && { emailQuestionId: emailQuestionId || null }),
          ...(nameQuestionId !== undefined && { nameQuestionId: nameQuestionId || null }),
          ...(allowExemption !== undefined && { allowExemption }),
          ...(registrationCondition !== undefined && { registrationCondition: registrationCondition || null }),
        };

  return await prisma.form.update({
    where: { id: formId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(templateId !== undefined && { templateId }),
      ...(formType !== undefined && { formType }),
      ...examFields,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { responses: true } }
    }
  });
};

/**
 * Renombrar un formulario (solo actualiza title en el root Form, sin crear versión)
 */
export const renameForm = async (formId: string, title: string) => {
  return await prisma.form.update({
    where: { id: formId },
    data: { title }
  });
};

/**
 * Actualizar imagen de portada del formulario
 */
export const updateFormCoverImage = async (formId: string, coverImage: string | null) => {
  return await prisma.form.update({
    where: { id: formId },
    data: { coverImage }
  });
};

// Export types
export type { FormWithRelations, FormSection, FormQuestion, CreateFormData, UpdateFormData };
