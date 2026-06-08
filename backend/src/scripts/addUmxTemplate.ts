/**
 * Script de migración puntual: agrega la plantilla UMx a la base de datos.
 * Usa upsert → es seguro ejecutarlo en producción aunque ya exista el registro.
 *
 * Uso:
 *   pnpm run add-umx-template
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const UMX_TEMPLATE = {
  id: 'umx',
  name: 'UMx',
  description: 'Plantilla institucional de Universidad Mondragón México',
  isActive: true,
  primaryColor: '#FF4D00',
  secondaryColor: '#0E5088',
  accentColor: '#F3530E',
  backgroundColor: '#F1F1F1',
  textColor: '#222222',
  headerStyle: 'gradient',
  sectionStyle: 'card',
  buttonStyle: 'rounded',
  inputStyle: 'outlined',
  fontFamily: 'Poppins, sans-serif',
  fontSize: 'base',
  customStyles: {
    headerGradient: 'linear-gradient(135deg, #0E5088 0%, #1a6fad 100%)',
  },
};

async function main() {
  console.log('🚀 Iniciando migración: plantilla UMx...\n');

  const result = await prisma.formTemplate.upsert({
    where: { id: UMX_TEMPLATE.id },
    update: {
      name: UMX_TEMPLATE.name,
      description: UMX_TEMPLATE.description,
      isActive: UMX_TEMPLATE.isActive,
      primaryColor: UMX_TEMPLATE.primaryColor,
      secondaryColor: UMX_TEMPLATE.secondaryColor,
      accentColor: UMX_TEMPLATE.accentColor,
      backgroundColor: UMX_TEMPLATE.backgroundColor,
      textColor: UMX_TEMPLATE.textColor,
      headerStyle: UMX_TEMPLATE.headerStyle,
      sectionStyle: UMX_TEMPLATE.sectionStyle,
      buttonStyle: UMX_TEMPLATE.buttonStyle,
      inputStyle: UMX_TEMPLATE.inputStyle,
      fontFamily: UMX_TEMPLATE.fontFamily,
      fontSize: UMX_TEMPLATE.fontSize,
      customStyles: UMX_TEMPLATE.customStyles,
    },
    create: UMX_TEMPLATE,
  });

  console.log(`✅ Plantilla "${result.name}" (id: ${result.id}) creada/actualizada correctamente`);
  console.log(`   Primary:    ${result.primaryColor}`);
  console.log(`   Secondary:  ${result.secondaryColor}`);
  console.log(`   Font:       ${result.fontFamily}`);
  console.log('\n✅ Migración completada.');
}

main()
  .catch((e) => {
    console.error('❌ Error al agregar plantilla UMx:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
