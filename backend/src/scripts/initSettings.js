import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Script para inicializar la configuración de la plataforma
 */
async function initSettings() {
  console.log('⚙️ Iniciando configuración de la plataforma...');

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
      
      console.log('✅ Configuración de plataforma creada exitosamente');
    } else {
      console.log('ℹ️ Configuración de plataforma ya existe, omitiendo...');
    }

    console.log('🎉 Inicialización de configuración completada');
    
  } catch (error) {
    console.error('❌ Error al inicializar la configuración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la función
initSettings();
