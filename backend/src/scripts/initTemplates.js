import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Script para inicializar las plantillas de formularios
 */
async function initTemplates() {
  try {
    // Crear plantillas de formularios
    
    // Plantilla Modern (default)
    const modernExists = await prisma.formTemplate.findUnique({
      where: { id: 'modern' }
    });
    
    if (!modernExists) {
      await prisma.formTemplate.create({
        data: {
          id: 'modern',
          name: 'Moderno',
          description: 'Diseño limpio y moderno con colores vibrantes',
          thumbnail: '/templates/modern-thumbnail.png',
          primaryColor: '#2563eb',
          secondaryColor: '#1e40af',
          accentColor: '#3b82f6',
          backgroundColor: '#f9fafb',
          textColor: '#111827',
          headerStyle: 'gradient',
          sectionStyle: 'card',
          buttonStyle: 'rounded',
          inputStyle: 'outlined',
          fontFamily: 'Inter',
          fontSize: 'base'
        }
      });
    } 
    
    // Plantilla Academic
    const academicExists = await prisma.formTemplate.findUnique({
      where: { id: 'academic' }
    });
    
    if (!academicExists) {
      await prisma.formTemplate.create({
        data: {
          id: 'academic',
          name: 'Académico',
          description: 'Diseño formal para entornos educativos',
          thumbnail: '/templates/academic-thumbnail.png',
          primaryColor: '#0E5088',
          secondaryColor: '#0A3D66',
          accentColor: '#F59E0B',
          backgroundColor: '#ffffff',
          textColor: '#1F2937',
          headerStyle: 'image',
          sectionStyle: 'card',
          buttonStyle: 'rounded',
          inputStyle: 'outlined',
          fontFamily: 'Georgia',
          fontSize: 'base'
        }
      });
    } 
    
    // Plantilla Corporate
    const corporateExists = await prisma.formTemplate.findUnique({
      where: { id: 'corporate' }
    });
    
    if (!corporateExists) {
      await prisma.formTemplate.create({
        data: {
          id: 'corporate',
          name: 'Corporativo',
          description: 'Diseño profesional para entornos empresariales',
          thumbnail: '/templates/corporate-thumbnail.png',
          primaryColor: '#1F2937',
          secondaryColor: '#374151',
          accentColor: '#10B981',
          backgroundColor: '#F3F4F6',
          textColor: '#111827',
          headerStyle: 'simple',
          sectionStyle: 'bordered',
          buttonStyle: 'square',
          inputStyle: 'filled',
          fontFamily: 'Arial',
          fontSize: 'sm'
        }
      });
    }

    console.log('Inicialización de plantillas completada exitosamente');
    
  } catch (error) {
    console.error('Error al inicializar las plantillas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la función
initTemplates();
