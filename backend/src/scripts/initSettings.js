import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Script para inicializar la configuración de la plataforma
 */
async function initSettings() {

  try {
    // Verificar si ya existe configuración
    const settingsExist = await prisma.platformSettings.findFirst();
    
    if (!settingsExist) {
      // Crear configuración por defecto
      await prisma.platformSettings.create({
        data: {
          primaryColor: '#2563eb',
          secondaryColor: '#1e40af',
          accentColor: '#3b82f6'
        }
      });
      
    } else {
      console.log('Configuración de plataforma ya existe, omitiendo...');
    }

    console.log('Inicialización de configuración completada');
    
  } catch (error) {
    console.error('Error al inicializar la configuración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la función
initSettings();
