import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  {
    id: 'modern',
    name: 'Moderna',
    description: 'Diseño minimalista y limpio, ideal para formularios profesionales',
    isActive: true,
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    accentColor: '#F59E0B',
    backgroundColor: '#F9FAFB',
    textColor: '#111827',
    headerStyle: 'simple',
    sectionStyle: 'card',
    buttonStyle: 'rounded',
    inputStyle: 'outlined',
    fontFamily: 'Inter',
    fontSize: 'base',
  },
  {
    id: 'academic',
    name: 'Académica',
    description: 'Diseño universitario con secciones destacadas y colores institucionales',
    isActive: true,
    primaryColor: '#1E5A96',
    secondaryColor: '#FF6B35',
    accentColor: '#2E86AB',
    backgroundColor: '#FFFFFF',
    textColor: '#2C3E50',
    headerStyle: 'gradient',
    sectionStyle: 'bordered',
    buttonStyle: 'rounded',
    inputStyle: 'outlined',
    fontFamily: 'Inter',
    fontSize: 'base',
    customStyles: {
      headerGradient: 'linear-gradient(135deg, #1E5A96 0%, #2E86AB 100%)',
      sectionBorderWidth: '3px',
      sectionBorderRadius: '12px',
      iconSize: '48px',
    },
  },
  {
    id: 'corporate',
    name: 'Corporativa',
    description: 'Diseño profesional y elegante para empresas',
    isActive: true,
    primaryColor: '#1F2937',
    secondaryColor: '#3B82F6',
    accentColor: '#10B981',
    backgroundColor: '#F3F4F6',
    textColor: '#1F2937',
    headerStyle: 'simple',
    sectionStyle: 'minimal',
    buttonStyle: 'square',
    inputStyle: 'filled',
    fontFamily: 'Inter',
    fontSize: 'base',
  },
  {
    id: 'creative',
    name: 'Creativa',
    description: 'Diseño vibrante y moderno con colores llamativos',
    isActive: true,
    primaryColor: '#8B5CF6',
    secondaryColor: '#EC4899',
    accentColor: '#F59E0B',
    backgroundColor: '#FEFCE8',
    textColor: '#1F2937',
    headerStyle: 'gradient',
    sectionStyle: 'card',
    buttonStyle: 'pill',
    inputStyle: 'outlined',
    fontFamily: 'Inter',
    fontSize: 'lg',
  },
];

async function main() {
  for (const template of templates) {
    await prisma.formTemplate.upsert({
      where: { id: template.id },
      update: template,
      create: template,
    });
    console.log(`✅ Template "${template.name}" creado/actualizado`);
  }

  console.log(`\n✅ ${templates.length} plantillas inicializadas`);
}

main()
  .catch((e) => {
    console.error('❌ Error inicializando templates:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
