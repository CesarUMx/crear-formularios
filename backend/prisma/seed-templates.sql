-- Plantillas predefinidas para formularios
-- Ejecutar después de la migración

-- 0. Plantilla UMx (Default institucional - Universidad Mondragón México)
INSERT INTO form_templates (
  id, name, description, "isActive",
  "primaryColor", "secondaryColor", "accentColor",
  "backgroundColor", "textColor",
  "headerStyle", "sectionStyle", "buttonStyle", "inputStyle",
  "fontFamily", "fontSize", "createdAt", "updatedAt"
) VALUES (
  'umx',
  'UMx',
  'Plantilla institucional de Universidad Mondragón México',
  true,
  '#FF4D00', '#0E5088', '#F3530E',
  '#F1F1F1', '#222222',
  'gradient', 'card', 'rounded', 'outlined',
  'Poppins, sans-serif', 'base',
  NOW(), NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "primaryColor" = EXCLUDED."primaryColor",
  "secondaryColor" = EXCLUDED."secondaryColor",
  "accentColor" = EXCLUDED."accentColor",
  "backgroundColor" = EXCLUDED."backgroundColor",
  "textColor" = EXCLUDED."textColor",
  "fontFamily" = EXCLUDED."fontFamily",
  "updatedAt" = NOW();

-- 1. Plantilla Moderna (Default)
INSERT INTO form_templates (
  id, 
  name, 
  description, 
  "isActive",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
  "headerStyle",
  "sectionStyle",
  "buttonStyle",
  "inputStyle",
  "fontFamily",
  "fontSize",
  "createdAt",
  "updatedAt"
) VALUES (
  'modern',
  'Moderna',
  'Diseño minimalista y limpio, ideal para formularios profesionales',
  true,
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#F9FAFB',
  '#111827',
  'simple',
  'card',
  'rounded',
  'outlined',
  'Inter',
  'base',
  NOW(),
  NOW()
);

-- 2. Plantilla Académica (Universidad)
INSERT INTO form_templates (
  id, 
  name, 
  description, 
  "isActive",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
  "headerStyle",
  "sectionStyle",
  "buttonStyle",
  "inputStyle",
  "fontFamily",
  "fontSize",
  "customStyles",
  "createdAt",
  "updatedAt"
) VALUES (
  'academic',
  'Académica',
  'Diseño universitario con secciones destacadas y colores institucionales',
  true,
  '#1E5A96',
  '#FF6B35',
  '#2E86AB',
  '#FFFFFF',
  '#2C3E50',
  'gradient',
  'bordered',
  'rounded',
  'outlined',
  'Inter',
  'base',
  '{"headerGradient": "linear-gradient(135deg, #1E5A96 0%, #2E86AB 100%)", "sectionBorderWidth": "3px", "sectionBorderRadius": "12px", "iconSize": "48px"}',
  NOW(),
  NOW()
);

-- 3. Plantilla Corporativa
INSERT INTO form_templates (
  id, 
  name, 
  description, 
  "isActive",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
  "headerStyle",
  "sectionStyle",
  "buttonStyle",
  "inputStyle",
  "fontFamily",
  "fontSize",
  "createdAt",
  "updatedAt"
) VALUES (
  'corporate',
  'Corporativa',
  'Diseño profesional y elegante para empresas',
  true,
  '#1F2937',
  '#3B82F6',
  '#10B981',
  '#F3F4F6',
  '#1F2937',
  'simple',
  'minimal',
  'square',
  'filled',
  'Inter',
  'base',
  NOW(),
  NOW()
);

-- 4. Plantilla Creativa
INSERT INTO form_templates (
  id, 
  name, 
  description, 
  "isActive",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
  "headerStyle",
  "sectionStyle",
  "buttonStyle",
  "inputStyle",
  "fontFamily",
  "fontSize",
  "createdAt",
  "updatedAt"
) VALUES (
  'creative',
  'Creativa',
  'Diseño vibrante y moderno con colores llamativos',
  true,
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#FEFCE8',
  '#1F2937',
  'gradient',
  'card',
  'pill',
  'outlined',
  'Inter',
  'lg',
  NOW(),
  NOW()
);
