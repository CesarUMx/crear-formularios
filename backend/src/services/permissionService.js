import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Verifica si un usuario puede acceder a un formulario
 */
export const canAccessForm = async (userId, formId) => {
  const user = await prisma.user.findUnique({ 
    where: { id: userId } 
  });

  // SUPER_ADMIN puede acceder a todo
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  // Verificar si es el creador
  const form = await prisma.form.findUnique({ 
    where: { id: formId } 
  });

  if (!form) {
    return false;
  }

  if (form.createdById === userId) {
    return true;
  }

  // Verificar si está compartido con el usuario
  const share = await prisma.formShare.findUnique({
    where: {
      formId_userId: {
        formId,
        userId
      }
    }
  });

  return !!share;
};

/**
 * Verifica si un usuario puede editar un formulario
 */
export const canEditForm = async (userId, formId) => {
  const user = await prisma.user.findUnique({ 
    where: { id: userId } 
  });

  // SUPER_ADMIN puede editar todo
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  // Verificar si es el creador
  const form = await prisma.form.findUnique({ 
    where: { id: formId } 
  });

  if (!form) {
    return false;
  }

  if (form.createdById === userId) {
    return true;
  }

  // Verificar permisos de compartido
  const share = await prisma.formShare.findUnique({
    where: {
      formId_userId: {
        formId,
        userId
      }
    }
  });

  return share && ['EDIT', 'FULL'].includes(share.permission);
};

/**
 * Verifica si un usuario puede eliminar un formulario
 */
export const canDeleteForm = async (userId, formId) => {
  const user = await prisma.user.findUnique({ 
    where: { id: userId } 
  });

  // SUPER_ADMIN puede eliminar todo
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  // Verificar si es el creador
  const form = await prisma.form.findUnique({ 
    where: { id: formId } 
  });

  if (!form) {
    return false;
  }

  if (form.createdById === userId) {
    return true;
  }

  // Verificar permisos FULL
  const share = await prisma.formShare.findUnique({
    where: {
      formId_userId: {
        formId,
        userId
      }
    }
  });

  return share && share.permission === 'FULL';
};

/**
 * Obtiene los formularios a los que un usuario tiene acceso
 */
export const getUserAccessibleForms = async (userId) => {
  const user = await prisma.user.findUnique({ 
    where: { id: userId } 
  });

  // SUPER_ADMIN ve todos los formularios
  if (user.role === 'SUPER_ADMIN') {
    return await prisma.form.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            responses: true,
            versions: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }

  // ADMIN ve sus formularios + compartidos
  return await prisma.form.findMany({
    where: {
      OR: [
        { createdById: userId },
        { sharedWith: { some: { userId } } }
      ]
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      sharedWith: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      _count: {
        select: {
          responses: true,
          versions: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });
};
