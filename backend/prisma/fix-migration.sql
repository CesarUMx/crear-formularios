-- Script para arreglar la migración fallida
-- Ejecutar ANTES de volver a intentar la migración

-- 1. Eliminar la migración fallida de la tabla de migraciones
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251106021037_add_form_templates';

-- 2. Si la tabla form_templates ya existe, eliminarla
DROP TABLE IF EXISTS form_templates CASCADE;

-- 3. Si la columna templateId ya existe en forms, eliminarla
ALTER TABLE forms DROP COLUMN IF EXISTS "templateId";
