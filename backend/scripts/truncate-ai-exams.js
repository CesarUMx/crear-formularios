/**
 * Script para truncar todas las tablas de Exámenes con IA
 * 
 * ADVERTENCIA: Este script BORRARÁ TODOS los datos de exámenes IA
 * Úsalo solo en desarrollo o cuando estés seguro de eliminar todo
 * 
 * Uso:
 *   node scripts/truncate-ai-exams.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function truncateAIExams() {
  try {
    console.log('🗑️  Iniciando truncado de tablas de exámenes IA...\n');

    // Orden de eliminación respetando las relaciones de claves foráneas
    
    console.log('1️⃣  Eliminando respuestas de exámenes...');
    const deletedResponses = await prisma.aIExamResponse.deleteMany({});
    console.log(`   ✅ ${deletedResponses.count} respuestas eliminadas\n`);

    console.log('2️⃣  Eliminando intentos de exámenes...');
    const deletedAttempts = await prisma.aIExamAttempt.deleteMany({});
    console.log(`   ✅ ${deletedAttempts.count} intentos eliminados\n`);

    console.log('3️⃣  Eliminando estudiantes de exámenes privados...');
    const deletedStudents = await prisma.aIExamStudent.deleteMany({});
    console.log(`   ✅ ${deletedStudents.count} estudiantes eliminados\n`);

    console.log('4️⃣  Eliminando opciones de preguntas...');
    const deletedOptions = await prisma.aIExamOption.deleteMany({});
    console.log(`   ✅ ${deletedOptions.count} opciones eliminadas\n`);

    console.log('5️⃣  Eliminando preguntas...');
    const deletedQuestions = await prisma.aIExamQuestion.deleteMany({});
    console.log(`   ✅ ${deletedQuestions.count} preguntas eliminadas\n`);

    console.log('6️⃣  Eliminando secciones...');
    const deletedSections = await prisma.aIExamSection.deleteMany({});
    console.log(`   ✅ ${deletedSections.count} secciones eliminadas\n`);

    console.log('7️⃣  Eliminando exámenes IA...');
    const deletedExams = await prisma.aIExam.deleteMany({});
    console.log(`   ✅ ${deletedExams.count} exámenes eliminados\n`);

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TODAS LAS TABLAS DE EXÁMENES IA HAN SIDO TRUNCADAS');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('📊 Resumen:');
    console.log(`   - Respuestas:   ${deletedResponses.count}`);
    console.log(`   - Intentos:     ${deletedAttempts.count}`);
    console.log(`   - Estudiantes:  ${deletedStudents.count}`);
    console.log(`   - Opciones:     ${deletedOptions.count}`);
    console.log(`   - Preguntas:    ${deletedQuestions.count}`);
    console.log(`   - Secciones:    ${deletedSections.count}`);
    console.log(`   - Exámenes:     ${deletedExams.count}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error al truncar tablas:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
truncateAIExams();
