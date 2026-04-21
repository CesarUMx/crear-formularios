import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLogo() {
  try {
    console.log('🔧 Restaurando logo en platform_settings...');
    
    const settings = await prisma.platformSettings.findFirst();
    
    if (!settings) {
      console.log('⚠️  No hay configuración de plataforma');
      return;
    }
    
    console.log('📊 Configuración actual:', {
      id: settings.id,
      logo: settings.logo,
      faviconUrl: settings.faviconUrl,
    });
    
    // Restaurar el logo si está vacío
    if (!settings.logo) {
      await prisma.platformSettings.update({
        where: { id: settings.id },
        data: {
          logo: '/images/logo.svg',
        },
      });
      console.log('✅ Logo restaurado a: /images/logo.svg');
    } else {
      console.log('✅ Logo ya existe:', settings.logo);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLogo();
