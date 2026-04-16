import { PrismaClient, FormShare } from '@prisma/client';

const prisma = new PrismaClient();

type Permission = 'VIEW' | 'EDIT' | 'FULL';

interface FormShareWithUser extends FormShare {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface FormAccessInfo {
  hasAccess: boolean;
  permission: Permission | null;
  isOwner: boolean;
}

/**
 * Compartir formulario con un usuario
 */
export const shareForm = async (
  formId: string,
  userId: string,
  permission: Permission,
  sharedById: string
): Promise<FormShareWithUser> => {
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
export const getFormShares = async (formId: string): Promise<FormShareWithUser[]> => {
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
export const removeFormShare = async (formId: string, userId: string): Promise<{ message: string }> => {
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
export const updateFormSharePermission = async (
  formId: string,
  userId: string,
  permission: Permission
): Promise<FormShareWithUser> => {
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
export const checkFormAccess = async (formId: string, userId: string): Promise<FormAccessInfo> => {
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
    return { hasAccess: true, permission: share.permission as Permission, isOwner: false };
  }

  return { hasAccess: false, permission: null, isOwner: false };
};

/**
 * Obtener todos los usuarios disponibles para compartir (excepto el creador)
 */
export const getAvailableUsers = async (formId: string) => {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { createdById: true }
  });

  if (!form) {
    throw new Error('Formulario no encontrado');
  }

  // Obtener usuarios que no son el creador y están activos
  return await prisma.user.findMany({
    where: {
      id: { not: form.createdById },
      isActive: true
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

// Export types
export type { Permission, FormShareWithUser, FormAccessInfo };
