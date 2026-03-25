import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/password.js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    const email = process.argv[2] || 'admin@mail.com';
    const password = process.argv[3] || 'Admin123456';
    const name = process.argv[4] || 'Super Admin';

    // Verificar si ya existe
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      process.exit(1);
    }

    // Hashear contraseña
    const hashedPassword = await hashPassword(password);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'SUPER_ADMIN'
      }
    });

    console.log('Super Administrador creado exitosamente!\n');
    console.log('Email:', user.email);
    console.log('Contraseña:', password);
    console.log('Nombre:', user.name);
    console.log('Rol:', user.role);
    console.log('IMPORTANTE: Cambia la contraseña después del primer login\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
