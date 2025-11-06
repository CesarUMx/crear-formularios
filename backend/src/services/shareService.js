import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Compartir formulario con un usuario
 */
export const shareForm = async (formId, userId, permission, sharedById) => {
  // Verificar que el formulario existe
  const form = await prisma.form.findUnique({
    where: { id: formId }
  });

  if (!form) {
    throw new Error('Formulario no encontrado');
  }

  // Verificar que el usuario existe
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Verificar que no sea el creador del formulario
  if (form.createdById === userId) {
    throw new Error('No puedes compartir el formulario contigo mismo');
  }

  // Verificar si ya está compartido
  const existingShare = await prisma.formShare.findUnique({
    where: {
      formId_userId: {
        formId,
        userId
      }
    }
  });

  if (existingShare) {
    // Actualizar permiso si ya existe
    return await prisma.formShare.update({
      where: { id: existingShare.id },
      data: { permission },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  // Crear nuevo compartido
  return await prisma.formShare.create({
    data: {
      formId,
      userId,
      permission,
      sharedById
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });
};

/**
 * Obtener usuarios con acceso a un formulario
 */
export const getFormShares = async (formId) => {
  return await prisma.formShare.findMany({
    where: { formId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: {
      sharedAt: 'desc'
    }
  });
};

/**
 * Eliminar acceso de un usuario a un formulario
 */
export const removeFormShare = async (formId, userId) => {
  const share = await prisma.formShare.findUnique({
    where: {
      formId_userId: {
        formId,
        userId
      }
    }
  });

  if (!share) {
    throw new Error('Acceso no encontrado');
  }

  await prisma.formShare.delete({
    where: { id: share.id }
  });

  return { message: 'Acceso eliminado correctamente' };
};

/**
 * Actualizar permiso de un usuario
 */
export const updateFormSharePermission = async (formId, userId, permission) => {
  const share = await prisma.formShare.findUnique({
    where: {
      formId_userId: {
        formId,
        userId
      }
    }
  });

  if (!share) {
    throw new Error('Acceso no encontrado');
  }

  return await prisma.formShare.update({
    where: { id: share.id },
    data: { permission },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });
};

/**
 * Verificar si un usuario tiene acceso a un formulario
 */
export const checkFormAccess = async (formId, userId) => {
  // Verificar si es el creador
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { createdById: true }
  });

  if (form && form.createdById === userId) {
    return { hasAccess: true, permission: 'FULL', isOwner: true };
  }

  // Verificar si tiene acceso compartido
  const share = await prisma.formShare.findUnique({
    where: {
      formId_userId: {
        formId,
        userId
      }
    }
  });

  if (share) {
    return { hasAccess: true, permission: share.permission, isOwner: false };
  }

  return { hasAccess: false, permission: null, isOwner: false };
};

/**
 * Obtener todos los usuarios disponibles para compartir (excepto el creador)
 */
export const getAvailableUsers = async (formId) => {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { createdById: true }
  });

  if (!form) {
    throw new Error('Formulario no encontrado');
  }

  // Obtener usuarios ya compartidos
  const sharedUsers = await prisma.formShare.findMany({
    where: { formId },
    select: { userId: true }
  });

  const sharedUserIds = sharedUsers.map(s => s.userId);

  // Obtener todos los usuarios excepto el creador y los ya compartidos
  return await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: form.createdById } },
        { id: { notIn: sharedUserIds } }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    },
    orderBy: {
      name: 'asc'
    }
  });
};
