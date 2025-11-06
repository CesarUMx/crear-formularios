import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Obtener todos los formularios del usuario
 */
export const getUserForms = async (userId, userRole) => {
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
export const getFormById = async (formId) => {
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
export const createForm = async (userId, data) => {
  const { title, description, templateId, sections } = data;

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

  // Crear formulario con primera versión
  const form = await prisma.form.create({
    data: {
      title,
      description,
      slug,
      templateId,
      createdById: userId,
      versions: {
        create: {
          version: 1,
          title,
          description,
          sections: {
            create: sections?.map((section, sectionIndex) => ({
              title: section.title,
              description: section.description,
              order: sectionIndex,
              questions: {
                create: section.questions?.map((question, questionIndex) => ({
                  type: question.type,
                  text: question.text,
                  placeholder: question.placeholder,
                  helpText: question.helpText,
                  isRequired: question.isRequired || false,
                  order: questionIndex,
                  options: {
                    create: question.options?.map((option, optionIndex) => ({
                      text: option.text,
                      order: optionIndex
                    })) || []
                  }
                })) || []
              }
            })) || []
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

  return form;
};

/**
 * Actualizar un formulario (crea nueva versión)
 */
export const updateForm = async (formId, data) => {
  const { title, description, templateId, sections } = data;

  // Obtener la última versión
  const lastVersion = await prisma.formVersion.findFirst({
    where: { formId },
    orderBy: { version: 'desc' }
  });

  const newVersionNumber = (lastVersion?.version || 0) + 1;

  // Actualizar formulario y crear nueva versión
  const form = await prisma.form.update({
    where: { id: formId },
    data: {
      title,
      description,
      ...(templateId && { templateId }), // Solo actualizar si se proporciona
      versions: {
        create: {
          version: newVersionNumber,
          title,
          description,
          sections: {
            create: sections?.map((section, sectionIndex) => ({
              title: section.title,
              description: section.description,
              order: sectionIndex,
              questions: {
                create: section.questions?.map((question, questionIndex) => ({
                  type: question.type,
                  text: question.text,
                  placeholder: question.placeholder,
                  helpText: question.helpText,
                  isRequired: question.isRequired || false,
                  order: questionIndex,
                  options: {
                    create: question.options?.map((option, optionIndex) => ({
                      text: option.text,
                      order: optionIndex
                    })) || []
                  }
                })) || []
              }
            })) || []
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

  return form;
};

/**
 * Eliminar un formulario
 */
export const deleteForm = async (formId) => {
  return await prisma.form.delete({
    where: { id: formId }
  });
};

/**
 * Activar/Desactivar formulario
 */
export const toggleFormStatus = async (formId, isActive) => {
  return await prisma.form.update({
    where: { id: formId },
    data: { isActive }
  });
};

/**
 * Compartir formulario con otro usuario
 */
export const shareForm = async (formId, userId, permission) => {
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
export const unshareForm = async (formId, userId) => {
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
export const updateSharePermission = async (formId, userId, permission) => {
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
