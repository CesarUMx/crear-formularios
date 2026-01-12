// Tipos de preguntas
export type QuestionType = 'TEXT' | 'TEXTAREA' | 'SELECT' | 'RADIO' | 'CHECKBOX' | 'FILE';

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
  allowedFileTypes?: string;
  maxFileSize?: number;
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
  templateId?: string; // ID de la plantilla de diseño
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
  responseCount?: number;
  viewCount?: number;
}

// Formulario para crear/editar
export interface FormInput {
  title: string;
  description?: string;
  templateId?: string; // ID de la plantilla a usar
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
  allowedFileTypes?: string; // Para FILE: "IMAGE", "PDF", "EXCEL"
  maxFileSize?: number; // Tamaño máximo en MB
  options?: { text: string }[];
}

// ==================== TIPOS DE EXÁMENES ====================

// Tipos de preguntas de examen
export type ExamQuestionType = 
  | 'TEXT' 
  | 'TEXTAREA' 
  | 'RADIO' 
  | 'CHECKBOX' 
  | 'TRUE_FALSE' 
  | 'MATCHING' 
  | 'ORDERING';

// Tipos de mostrar resultados
export type ShowResultsType = 'IMMEDIATE' | 'AFTER_DEADLINE' | 'MANUAL' | 'NEVER';

// Opción de pregunta de examen
export interface ExamQuestionOption {
  id?: string;
  text: string;
  order: number;
  isCorrect?: boolean;
}

// Respuesta correcta para preguntas TEXT
export interface CorrectAnswer {
  keywords?: string[];
  exactMatch?: boolean;
}

// Pregunta de examen
export interface ExamQuestion {
  id?: string;
  type: ExamQuestionType;
  text: string;
  helpText?: string;
  points: number;
  order: number;
  options?: ExamQuestionOption[];
  correctAnswer?: CorrectAnswer | null;
  feedback?: string | null;
}

// Sección de examen
export interface ExamSection {
  id?: string;
  title: string;
  description?: string;
  order: number;
  questions: ExamQuestion[];
}

// Versión del examen
export interface ExamVersion {
  id: string;
  version: number;
  title?: string;
  description?: string;
  totalPoints: number;
  sections: ExamSection[];
  createdAt: string;
}

// Archivo de apoyo
export interface ExamFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  order: number;
  uploadedAt: string;
}

// Usuario compartido (examen)
export interface ExamShare {
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

// Examen completo
export interface Exam {
  id: string;
  title: string;
  description?: string;
  slug: string;
  isActive: boolean;
  isPublic: boolean;
  publicUrl?: string;
  templateId?: string;
  
  // Configuración
  timeLimit?: number;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: ShowResultsType;
  allowReview: boolean;
  autoGrade: boolean;
  
  // Relaciones
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  versions?: ExamVersion[];
  supportFiles?: ExamFile[];
  sharedWith?: ExamShare[];
  _count?: {
    attempts: number;
    versions: number;
  };
}

// Examen para crear/editar
export interface ExamInput {
  title: string;
  description?: string;
  templateId?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResults?: ShowResultsType;
  allowReview?: boolean;
  sections: ExamSectionInput[];
}

export interface ExamSectionInput {
  title: string;
  description?: string;
  questions: ExamQuestionInput[];
}

export interface ExamQuestionInput {
  type: ExamQuestionType;
  text: string;
  helpText?: string;
  points: number;
  options?: { text: string; isCorrect?: boolean }[];
  correctAnswer?: CorrectAnswer;
  feedback?: string;
}

// Intento de examen
export interface ExamAttempt {
  id: string;
  examId: string;
  examVersionId: string;
  attemptNumber: number;
  studentName: string;
  studentEmail?: string;
  userId?: string;
  
  // Estado
  startedAt: string;
  completedAt?: string;
  timeSpent?: number;
  
  // Calificación
  score?: number;
  maxScore: number;
  percentage?: number;
  passed?: boolean;
  gradedAt?: string;
  gradedBy?: string;
  
  // Relaciones
  exam?: Exam;
  examVersion?: ExamVersion;
  answers?: ExamAnswer[];
}

// Respuesta de examen
export interface ExamAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  textValue?: string;
  jsonValue?: any;
  selectedOptions?: ExamQuestionOption[];
  
  // Calificación
  pointsEarned?: number;
  isCorrect?: boolean;
  feedback?: string;
  gradedAt?: string;
}

// Resultado de intento (para mostrar al estudiante)
export interface ExamAttemptResult {
  attemptId: string;
  examTitle: string;
  studentName: string;
  studentEmail?: string;
  
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  passingScore: number;
  autoGraded: boolean;
  feedback?: string;
  
  startedAt: string;
  completedAt: string;
  timeSpent: number;
  
  exam: {
    title: string;
    slug: string;
    passingScore: number;
    showResults: ShowResultsType;
    allowReview: boolean;
  };
  
  answers: {
    questionId: string;
    textValue?: string;
    selectedOptions?: ExamQuestionOption[];
    pointsEarned: number;
    isCorrect?: boolean;
    feedback?: string;
  }[];
  
  sections: {
    title: string;
    description?: string;
    questions: {
      id: string;
      type: ExamQuestionType;
      text: string;
      points: number;
      feedback?: string;
      correctAnswer?: string;
    }[];
  }[];
}

// Estadísticas de examen
export interface ExamStats {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  averageTimeSpent: number;
  
  questionStats: {
    questionId: string;
    questionText: string;
    totalAnswers: number;
    correctAnswers: number;
    correctRate: number;
    averagePoints: number;
  }[];
}
