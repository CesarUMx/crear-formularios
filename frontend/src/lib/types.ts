// Tipos de preguntas
export type QuestionType = 'TEXT' | 'TEXTAREA' | 'SELECT' | 'RADIO' | 'CHECKBOX';

// Permisos de compartido
export type Permission = 'VIEW' | 'EDIT' | 'FULL';

// Roles de usuario
export type UserRole = 'ADMIN' | 'SUPER_ADMIN';

// Usuario del sistema
export interface SystemUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  _count?: {
    createdForms: number;
    sharedForms: number;
  };
}

// Estadísticas de usuarios
export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  superAdmins: number;
  admins: number;
}

// Configuración de personalización de la plataforma
export interface PlatformSettings {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

// Opción de pregunta
export interface QuestionOption {
  id?: string;
  text: string;
  order: number;
}

// Pregunta
export interface Question {
  id?: string;
  type: QuestionType;
  text: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  order: number;
  options: QuestionOption[];
}

// Sección
export interface Section {
  id?: string;
  title: string;
  description?: string;
  order: number;
  questions: Question[];
}

// Versión del formulario
export interface FormVersion {
  id: string;
  version: number;
  title: string;
  description?: string;
  sections: Section[];
  createdAt: string;
}

// Usuario compartido
export interface FormShare {
  id: string;
  userId: string;
  permission: Permission;
  user: {
    id: string;
    name: string;
    email: string;
  };
  sharedAt: string;
}

// Formulario completo
export interface Form {
  id: string;
  title: string;
  description?: string;
  slug: string;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  versions?: FormVersion[];
  sharedWith?: FormShare[];
  _count?: {
    responses: number;
    versions: number;
  };
}

// Formulario para crear/editar
export interface FormInput {
  title: string;
  description?: string;
  sections: SectionInput[];
}

export interface SectionInput {
  title: string;
  description?: string;
  questions: QuestionInput[];
}

export interface QuestionInput {
  type: QuestionType;
  text: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  options?: { text: string }[];
}
