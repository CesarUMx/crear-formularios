import { PrismaClient, PlatformSettings } from '@prisma/client';

const prisma = new PrismaClient();

interface UpdateSettingsData {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

/**
 * Obtener configuración de la plataforma
 */
export const getSettings = async (): Promise<PlatformSettings> => {
  // Buscar la configuración existente
  let settings = await prisma.platformSettings.findFirst();
  
  // Si no existe, crear una con valores por defecto
  if (!settings) {
    settings = await prisma.platformSettings.create({
      data: {
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
        accentColor: '#3b82f6'
      }
    });
  }
  
  return settings;
};

/**
 * Actualizar configuración de la plataforma
 */
export const updateSettings = async (data: UpdateSettingsData): Promise<PlatformSettings> => {
  // Buscar la configuración existente
  let settings = await prisma.platformSettings.findFirst();
  
  if (settings) {
    // Actualizar existente
    settings = await prisma.platformSettings.update({
      where: { id: settings.id },
      data: {
        logoUrl: data.logo,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor
      }
    });
  } else {
    // Crear nueva
    settings = await prisma.platformSettings.create({
      data: {
        logoUrl: data.logo,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor
      }
    });
  }
  
  return settings;
};

/**
 * Resetear configuración a valores por defecto
 */
export const resetSettings = async (): Promise<PlatformSettings> => {
  const settings = await prisma.platformSettings.findFirst();
  
  if (settings) {
    return await prisma.platformSettings.update({
      where: { id: settings.id },
      data: {
        logoUrl: null,
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
        accentColor: '#3b82f6'
      }
    });
  }
  
  return await prisma.platformSettings.create({
    data: {
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      accentColor: '#3b82f6'
    }
  });
};

// Export types
export type { UpdateSettingsData };
