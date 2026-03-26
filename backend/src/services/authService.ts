import { PrismaClient, User, Prisma } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';

const prisma = new PrismaClient();

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: 'SUPER_ADMIN' | 'ADMIN';
}

interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin: Date | null;
  _count: {
    createdForms: number;
    sharedForms: number;
  };
}

interface UpdateProfileData {
  name?: string;
  email?: string;
}

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const { email, password, name, role = 'ADMIN' } = data;

  // Verificar si el email ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('El email ya está registrado');
  }

  // Hashear contraseña
  const hashedPassword = await hashPassword(password);

  // Crear usuario
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      lastLogin: true
    }
  });

  // Generar token
  const token = generateToken(user);

  return { user, token };
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  // Buscar usuario
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Credenciales inválidas');
  }

  // Verificar si está activo
  if (!user.isActive) {
    throw new Error('Usuario desactivado. Contacta al administrador.');
  }

  // Verificar contraseña
  const isValidPassword = await comparePassword(password, user.password);

  if (!isValidPassword) {
    throw new Error('Credenciales inválidas');
  }

  // Actualizar último login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });

  // Generar token
  const token = generateToken(user);

  // Remover password de la respuesta
  const { password: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
};

export const getProfile = async (userId: string): Promise<UserProfile> => {
  const user = await prisma.user.findUnique({
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

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  return user;
};

export const updateProfile = async (userId: string, data: UpdateProfileData): Promise<Omit<User, 'password'>> => {
  const { name, email } = data;

  // Si cambia el email, verificar que no exista
  if (email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId }
      }
    });

    if (existingUser) {
      throw new Error('El email ya está en uso');
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name, email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      updatedAt: true,
      createdAt: true,
      lastLogin: true
    }
  });

  return user;
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Verificar contraseña actual
  const isValidPassword = await comparePassword(currentPassword, user.password);

  if (!isValidPassword) {
    throw new Error('Contraseña actual incorrecta');
  }

  // Hashear nueva contraseña
  const hashedPassword = await hashPassword(newPassword);

  // Actualizar
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  return { message: 'Contraseña actualizada correctamente' };
};

// Export types
export type { RegisterData, AuthResponse, UserProfile, UpdateProfileData };
