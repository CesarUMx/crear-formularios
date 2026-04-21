-- ==========================================
-- Script para TRUNCAR todas las tablas de Exámenes con IA
-- ==========================================
-- ADVERTENCIA: Este script BORRARÁ TODOS los datos de exámenes IA
-- Úsalo solo en desarrollo o cuando estés seguro de eliminar todo
-- ==========================================

-- Deshabilitar verificación de claves foráneas temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Borrar todas las respuestas de exámenes IA
TRUNCATE TABLE ai_exam_responses;
PRINT 'Tabla ai_exam_responses truncada';

-- 2. Borrar todos los intentos de exámenes IA
TRUNCATE TABLE ai_exam_attempts;
PRINT 'Tabla ai_exam_attempts truncada';

-- 3. Borrar todos los estudiantes de exámenes privados
TRUNCATE TABLE ai_exam_students;
PRINT 'Tabla ai_exam_students truncada';

-- 4. Borrar todas las opciones de preguntas
TRUNCATE TABLE ai_exam_options;
PRINT 'Tabla ai_exam_options truncada';

-- 5. Borrar todas las preguntas
TRUNCATE TABLE ai_exam_questions;
PRINT 'Tabla ai_exam_questions truncada';

-- 6. Borrar todas las secciones
TRUNCATE TABLE ai_exam_sections;
PRINT 'Tabla ai_exam_sections truncada';

-- 7. Borrar todos los exámenes IA
TRUNCATE TABLE ai_exams;
PRINT 'Tabla ai_exams truncada';

-- Rehabilitar verificación de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;

PRINT '✅ Todas las tablas de exámenes IA han sido truncadas exitosamente';
