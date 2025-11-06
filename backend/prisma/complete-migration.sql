-- Script completo para migración de plantillas
-- Ejecutar TODO este script en una sola transacción

BEGIN;

-- PASO 1: Limpiar migración fallida si existe
DELETE FROM "_prisma_migrations" 
WHERE migration_name LIKE '%add_form_templates%';

-- PASO 2: Eliminar objetos existentes si existen
DROP TABLE IF EXISTS form_templates CASCADE;
ALTER TABLE forms DROP COLUMN IF EXISTS "templateId";

-- PASO 3: Crear tabla de plantillas
CREATE TABLE form_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "primaryColor" TEXT NOT NULL DEFAULT '#3B82F6',
  "secondaryColor" TEXT NOT NULL DEFAULT '#10B981',
  "accentColor" TEXT NOT NULL DEFAULT '#F59E0B',
  "backgroundColor" TEXT NOT NULL DEFAULT '#F9FAFB',
  "textColor" TEXT NOT NULL DEFAULT '#111827',
  "headerStyle" TEXT NOT NULL DEFAULT 'simple',
  "sectionStyle" TEXT NOT NULL DEFAULT 'card',
  "buttonStyle" TEXT NOT NULL DEFAULT 'rounded',
  "inputStyle" TEXT NOT NULL DEFAULT 'outlined',
  "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
  "fontSize" TEXT NOT NULL DEFAULT 'base',
  "customStyles" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PASO 4: Insertar plantillas predefinidas
INSERT INTO form_templates (
  id, name, description, "isActive",
  "primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor",
  "headerStyle", "sectionStyle", "buttonStyle", "inputStyle",
  "fontFamily", "fontSize"
) VALUES 
-- Plantilla Moderna
('modern', 'Moderna', 'Diseño minimalista y limpio, ideal para formularios profesionales', true,
 '#3B82F6', '#10B981', '#F59E0B', '#F9FAFB', '#111827',
 'simple', 'card', 'rounded', 'outlined', 'Inter', 'base'),

-- Plantilla Académica
('academic', 'Académica', 'Diseño universitario con secciones destacadas y colores institucionales', true,
 '#1E5A96', '#FF6B35', '#2E86AB', '#FFFFFF', '#2C3E50',
 'gradient', 'bordered', 'rounded', 'outlined', 'Inter', 'base'),

-- Plantilla Corporativa
('corporate', 'Corporativa', 'Diseño profesional y elegante para empresas', true,
 '#1F2937', '#3B82F6', '#10B981', '#F3F4F6', '#1F2937',
 'simple', 'minimal', 'square', 'filled', 'Inter', 'base'),

-- Plantilla Creativa
('creative', 'Creativa', 'Diseño vibrante y moderno con colores llamativos', true,
 '#8B5CF6', '#EC4899', '#F59E0B', '#FEFCE8', '#1F2937',
 'gradient', 'card', 'pill', 'outlined', 'Inter', 'lg');

-- PASO 5: Agregar columna templateId a forms
ALTER TABLE forms ADD COLUMN "templateId" TEXT;

-- PASO 6: Actualizar formularios existentes con plantilla por defecto
UPDATE forms SET "templateId" = 'modern' WHERE "templateId" IS NULL;

-- PASO 7: Agregar constraint de clave foránea
ALTER TABLE forms 
ADD CONSTRAINT "forms_templateId_fkey" 
FOREIGN KEY ("templateId") 
REFERENCES form_templates(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- PASO 8: Registrar la migración como completada
INSERT INTO "_prisma_migrations" (
  id, 
  checksum, 
  finished_at, 
  migration_name, 
  logs, 
  rolled_back_at, 
  started_at, 
  applied_steps_count
) VALUES (
  gen_random_uuid()::text,
  'manual_migration_templates',
  NOW(),
  'manual_add_form_templates',
  'Manual migration for form templates',
  NULL,
  NOW(),
  1
);

COMMIT;

-- Verificar que todo se creó correctamente
SELECT 'Templates creados:' as status, COUNT(*) as count FROM form_templates;
SELECT 'Formularios actualizados:' as status, COUNT(*) as count FROM forms WHERE "templateId" IS NOT NULL;
