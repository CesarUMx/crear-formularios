import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/password.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../utils/email.js';

const prisma = new PrismaClient();

/**
 * Obtener todos los usuarios
 */
export const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLogin: true,
      _count: {
        select: {
          createdForms: true,
          sharedForms: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

/**
 * Obtener un usuario por ID
 */
export const getUserById = async (userId) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLogin: true,
      _count: {
        select: {
          createdForms: true,
          sharedForms: true
        }
      }
    }
  });
};

/**
 * Crear un nuevo usuario
 */
export const createUser = async (data) => {
  const { email, name, password, role } = data;

  // Verificar si el email ya existe
  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    throw new Error('El email ya está registrado');
  }

  // Hashear contraseña
  const hashedPassword = await hashPassword(password);

  // Crear usuario
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: role || 'ADMIN',
      isActive: true
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  // Enviar email de bienvenida (no bloqueante)
  sendWelcomeEmail(email, name, password).catch(err => {
    console.error('Error al enviar email de bienvenida:', err);
  });

  return user;
};

/**
 * Actualizar un usuario
 */
export const updateUser = async (userId, data) => {
  const { name, role, isActive } = data;

  return await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(role && { role }),
      ...(isActive !== undefined && { isActive })
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLogin: true
    }
  });
};

/**
 * Cambiar contraseña de un usuario (por admin)
 */
export const resetUserPassword = async (userId, newPassword) => {
  const hashedPassword = await hashPassword(newPassword);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
    select: {
      id: true,
      email: true,
      name: true
    }
  });

  // Enviar email con la nueva contraseña (no bloqueante)
  sendPasswordResetEmail(user.email, user.name, newPassword).catch(err => {
    console.error('Error al enviar email de reseteo:', err);
  });

  return user;
};

/**
 * Eliminar un usuario
 */
export const deleteUser = async (userId) => {
  // Verificar que no sea el último SUPER_ADMIN
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (user.role === 'SUPER_ADMIN') {
    const superAdminCount = await prisma.user.count({
      where: { role: 'SUPER_ADMIN' }
    });

    if (superAdminCount <= 1) {
      throw new Error('No se puede eliminar el último Super Administrador');
    }
  }

  return await prisma.user.delete({
    where: { id: userId }
  });
};

/**
 * Activar/Desactivar usuario
 */
export const toggleUserStatus = async (userId, isActive) => {
  // Verificar que no sea el último SUPER_ADMIN activo
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (user.role === 'SUPER_ADMIN' && !isActive) {
    const activeSuperAdminCount = await prisma.user.count({
      where: { 
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });

    if (activeSuperAdminCount <= 1) {
      throw new Error('No se puede desactivar el último Super Administrador activo');
    }
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true
    }
  });
};

/**
 * Obtener estadísticas de usuarios
 */
export const getUserStats = async () => {
  const totalUsers = await prisma.user.count();
  const activeUsers = await prisma.user.count({
    where: { isActive: true }
  });
  const superAdmins = await prisma.user.count({
    where: { role: 'SUPER_ADMIN' }
  });
  const admins = await prisma.user.count({
    where: { role: 'ADMIN' }
  });

  return {
    total: totalUsers,
    active: activeUsers,
    inactive: totalUsers - activeUsers,
    superAdmins,
    admins
  };
};
