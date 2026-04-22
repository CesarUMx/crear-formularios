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
  | 'ORDERING'
  | 'FILL_BLANK';

export type ExamAccessType = 'PUBLIC' | 'PRIVATE';

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
  metadata?: any;
  feedback?: string | null;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

// Seccion de examen
export interface ExamSection {
  id?: string;
  title: string;
  description?: string;
  order: number;
  timeLimit?: number; // Tiempo límite en minutos para esta sección
  questions: ExamQuestion[];
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
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
  publicUrl?: string;
  
  // Configuracion
  accessType: ExamAccessType;
  instructions?: string;
  timeLimit?: number;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: boolean;
  autoGrade: boolean;
  questionsPerAttempt?: number;
  
  // Relaciones
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  sections?: ExamSection[];
  sharedWith?: ExamShare[];
  _count?: {
    attempts: number;
  };
}

// Examen para crear/editar
export interface ExamInput {
  title: string;
  description?: string;
  instructions?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResults?: boolean;
  accessType?: ExamAccessType;
  questionsPerAttempt?: number;
  sections: ExamSectionInput[];
}

export interface ExamSectionInput {
  id?: string;
  title: string;
  description?: string;
  timeLimit?: number; // Tiempo límite en minutos para esta sección
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  pendingFile?: File; // Archivo seleccionado pero no subido aún
  questions: ExamQuestionInput[];
}

export interface ExamQuestionInput {
  id?: string;
  type: ExamQuestionType;
  text: string;
  helpText?: string;
  points: number;
  options?: { text: string; isCorrect?: boolean }[];
  correctAnswer?: CorrectAnswer;
  metadata?: any;
  feedback?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  pendingFile?: File; // Archivo seleccionado pero no subido aún
}

// Intento de examen
export interface ExamAttempt {
  id: string;
  examId: string;
  attemptNumber: number;
  studentName: string;
  studentEmail?: string;
  userId?: string;
  sessionToken?: string;
  
  // Estado
  startedAt: string;
  completedAt?: string;
  timeSpent?: number;
  
  // Calificacion
  score?: number;
  maxScore: number;
  percentage?: number;
  passed?: boolean | null;
  gradedAt?: string;
  gradedBy?: string;
  autoGraded?: boolean;
  requiresManualGrading?: boolean;
  isGraded?: boolean;
  
  // Seguridad
  tabSwitches?: number;
  
  // Tiempos de secciones (para timer por sección)
  sectionTimes?: Record<string, {
    started: number;
    completed: boolean;
    ended?: number;
  }>;
  
  // Relaciones
  exam?: Exam;
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
  // Si showResults=false, solo viene message
  message?: string;

  attemptId?: string;
  examTitle?: string;
  studentName?: string;
  studentEmail?: string;
  
  score?: number;
  maxScore?: number;
  percentage?: number;
  passed?: boolean;
  passingScore?: number;
  autoGraded?: boolean;
  feedback?: string;
  
  startedAt?: string;
  completedAt?: string;
  timeSpent?: number;
  
  exam?: {
    id: string;
    title: string;
    slug: string;
    passingScore: number;
    showResults: boolean;
  };
  
  sections?: {
    title: string;
    description?: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    questions: {
      id: string;
      type: ExamQuestionType;
      text: string;
      points: number;
      metadata?: any;
      feedback?: string;
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      options?: ExamQuestionOption[];
      pointsEarned: number;
      isCorrect?: boolean;
      answerFeedback?: string;
      studentAnswer: {
        textValue?: string;
        selectedOptions?: { id: string; text: string }[];
        jsonValue?: any;
      };
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
