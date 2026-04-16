import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.platformSettings.findFirst();

  if (existing) {
    console.log('✅ Platform settings ya existen');
    return;
  }

  const settings = await prisma.platformSettings.create({
    data: {
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      accentColor: '#3b82f6',
      allowPublicForms: false,
      platformName: 'UMx Formularios',
    },
  });

  console.log('✅ Platform settings creados');
  console.log(`   ID: ${settings.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error inicializando settings:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
