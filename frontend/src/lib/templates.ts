// Configuración de plantillas de formularios

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  isActive: boolean;
  
  // Colores
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  
  // Estilos de diseño
  headerStyle: 'simple' | 'gradient' | 'image';
  sectionStyle: 'card' | 'bordered' | 'minimal';
  buttonStyle: 'rounded' | 'square' | 'pill';
  inputStyle: 'outlined' | 'filled' | 'underlined';
  
  // Tipografía
  fontFamily: string;
  fontSize: 'sm' | 'base' | 'lg';
  
  // Estilos personalizados
  customStyles?: {
    headerGradient?: string;
    sectionBorderWidth?: string;
    sectionBorderRadius?: string;
    iconSize?: string;
    [key: string]: any;
  };
}

// Plantillas predefinidas
export const FORM_TEMPLATES: FormTemplate[] = [
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
    fontSize: 'base'
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
      iconSize: '48px'
    }
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
    fontSize: 'base'
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
    fontSize: 'lg'
  }
];

// Obtener plantilla por ID
export const getTemplateById = (id: string): FormTemplate | undefined => {
  return FORM_TEMPLATES.find(template => template.id === id);
};

// Obtener plantilla por defecto
export const getDefaultTemplate = (): FormTemplate => {
  return FORM_TEMPLATES[0]; // Moderna
};

// Obtener estilos CSS para una plantilla
export const getTemplateStyles = (template: FormTemplate) => {
  return {
    '--template-primary': template.primaryColor,
    '--template-secondary': template.secondaryColor,
    '--template-accent': template.accentColor,
    '--template-background': template.backgroundColor,
    '--template-text': template.textColor,
    '--template-font-family': template.fontFamily,
    '--template-font-size': getFontSizeValue(template.fontSize),
    '--template-border-radius': getBorderRadiusValue(template.buttonStyle),
    ...(template.customStyles || {})
  } as React.CSSProperties;
};

// Helpers
const getFontSizeValue = (size: 'sm' | 'base' | 'lg'): string => {
  const sizes = {
    sm: '14px',
    base: '16px',
    lg: '18px'
  };
  return sizes[size];
};

const getBorderRadiusValue = (style: 'rounded' | 'square' | 'pill'): string => {
  const radius = {
    rounded: '8px',
    square: '0px',
    pill: '9999px'
  };
  return radius[style];
};

// Obtener clase de input según estilo
export const getInputClassName = (style: 'outlined' | 'filled' | 'underlined'): string => {
  const classes = {
    outlined: 'border-2 border-gray-300 bg-white focus:border-blue-500',
    filled: 'border-0 bg-gray-100 focus:bg-gray-200',
    underlined: 'border-0 border-b-2 border-gray-300 bg-transparent focus:border-blue-500 rounded-none'
  };
  return classes[style];
};

// Obtener clase de botón según estilo
export const getButtonClassName = (style: 'rounded' | 'square' | 'pill'): string => {
  const classes = {
    rounded: 'rounded-lg',
    square: 'rounded-none',
    pill: 'rounded-full'
  };
  return classes[style];
};

// Obtener clase de sección según estilo
export const getSectionClassName = (style: 'card' | 'bordered' | 'minimal'): string => {
  const classes = {
    card: 'bg-white rounded-lg shadow-sm p-8',
    bordered: 'bg-white rounded-xl border-l-4 p-8',
    minimal: 'bg-transparent p-6'
  };
  return classes[style];
};
