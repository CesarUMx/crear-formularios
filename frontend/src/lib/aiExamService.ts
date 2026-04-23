import { authService } from './auth';
import { API_URL } from './config';

export interface AIExam {
  id: string;
  title: string;
  description?: string;
  slug: string;
  isPublic: boolean;
  isActive: boolean;
  accessType: 'PUBLIC' | 'PRIVATE';
  publicUrl?: string;
  instructions?: string;
  timeLimit?: number;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: boolean;
  allowReview: boolean;
  totalQuestionsInPool: number;
  questionsPerAttempt: number;
  aiGenerated: boolean;
  aiModel?: string;
  sourceDocument?: string;
  generationPrompt?: string;
  validated: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  sections?: AIExamSection[];
  _count?: {
    attempts: number;
    students: number;
  };
}

export interface AIExamSection {
  id: string;
  aiExamId: string;
  title: string;
  description?: string;
  order: number;
  createdAt: string;
  questions: AIExamQuestion[];
}

export interface AIExamQuestion {
  id: string;
  sectionId: string;
  text: string;
  helpText?: string;
  points: number;
  order: number;
  type: string;
  feedback?: string;
  aiGenerated: boolean;
  validated: boolean;
  createdAt: string;
  options: AIExamOption[];
}

export interface AIExamOption {
  id: string;
  questionId: string;
  text: string;
  order: number;
  isCorrect: boolean;
}

export interface AIExamAttempt {
  id: string;
  aiExamId: string;
  attemptNumber: number;
  studentName?: string;
  studentEmail?: string;
  studentId?: string;
  selectedQuestions: any;
  startedAt: string;
  completedAt?: string;
  timeSpent?: number;
  score?: number;
  maxScore: number;
  passed?: boolean;
  totalCorrect?: number;
  totalQuestions?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateAIExamData {
  title: string;
  description?: string;
  instructions?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  accessType: 'PUBLIC' | 'PRIVATE';
  questionsPerAttempt: number;
  showResults?: boolean;
}

export interface GenerateQuestionsData {
  pdf: File;
  numberOfQuestions: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
  questionTypes?: string[];
  jobId?: string;
}

class AIExamService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private getMultipartHeaders() {
    const token = authService.getToken();
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Obtener todos los exámenes del profesor
   */
  async getAIExams(): Promise<AIExam[]> {
    const response = await fetch(`${API_URL}/ai-exams`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener exámenes');
    }

    return response.json();
  }

  /**
   * Obtener un examen específico
   */
  async getExamById(id: string): Promise<AIExam> {
    const response = await fetch(`${API_URL}/ai-exams/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener examen');
    }

    return response.json();
  }

  /**
   * Crear un nuevo examen
   */
  async createAIExam(data: CreateAIExamData): Promise<AIExam> {
    const response = await fetch(`${API_URL}/ai-exams`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear examen');
    }

    return response.json();
  }

  /**
   * Actualizar un examen
   */
  async updateAIExam(id: string, data: Partial<CreateAIExamData>): Promise<AIExam> {
    const response = await fetch(`${API_URL}/ai-exams/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar examen');
    }

    return response.json();
  }

  /**
   * Eliminar un examen
   */
  async deleteAIExam(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/ai-exams/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar examen');
    }
  }

  /**
   * Publicar un examen
   */
  async publishAIExam(examId: string): Promise<AIExam> {
    const response = await fetch(`${API_URL}/ai-exams/${examId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authService.getToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al publicar el examen');
    }

    return response.json();
  }

  /**
   * Actualizar configuración del examen
   */
  async updateExamConfig(examId: string, data: Partial<CreateAIExamData>): Promise<AIExam> {
    const response = await fetch(`${API_URL}/ai-exams/${examId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authService.getToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar la configuración del examen');
    }

    return response.json();
  }

  /**
   * Generar preguntas con IA desde un PDF
   */
  async generateQuestions(id: string, data: GenerateQuestionsData): Promise<any> {
    const formData = new FormData();
    formData.append('pdf', data.pdf);
    formData.append('numberOfQuestions', data.numberOfQuestions.toString());
    if (data.difficulty) {
      formData.append('difficulty', data.difficulty);
    }
    if (data.topic) {
      formData.append('topic', data.topic);
    }
    if (data.questionTypes && data.questionTypes.length > 0) {
      formData.append('questionTypes', JSON.stringify(data.questionTypes));
    }
    if (data.jobId) {
      formData.append('jobId', data.jobId);
    }
    const response = await fetch(`${API_URL}/ai-exams/${id}/generate`, {
      method: 'POST',
      headers: this.getMultipartHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al generar preguntas');
    }

    return response.json();
  }

  /**
   * Obtener resultados de un examen
   */
  async getResults(id: string): Promise<AIExamAttempt[]> {
    const response = await fetch(`${API_URL}/ai-exams/${id}/results`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener resultados');
    }

    return response.json();
  }

  /**
   * Obtener información pública de un examen (para estudiantes)
   */
  async getPublicExam(slug: string): Promise<any> {
    const response = await fetch(`${API_URL}/ai-exams/public/${slug}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener examen');
    }

    return response.json();
  }

  /**
   * Login para exámenes privados
   */
  async loginPrivateExam(examId: string, email: string, password: string): Promise<any> {
    const response = await fetch(`${API_URL}/ai-exams/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ examId, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Credenciales inválidas');
    }

    return response.json();
  }

  /**
   * Iniciar un intento de examen (para estudiantes)
   */
  async startAttempt(
    id: string,
    data: { studentName?: string; studentEmail?: string; studentId?: string; sessionToken?: string }
  ): Promise<any> {
    const response = await fetch(`${API_URL}/ai-exams/${id}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Crear un error con el mensaje del backend
      const error: any = new Error(errorData.error || 'Error al iniciar examen');
      // Agregar información adicional del error
      error.attemptsUsed = errorData.attemptsUsed;
      error.maxAttempts = errorData.maxAttempts;
      throw error;
    }

    return response.json();
  }

  /**
   * Enviar respuestas de un intento (para estudiantes)
   */
  async submitAttempt(
    attemptId: string,
    responses: { questionId: string; selectedOptionId?: string; userAnswer?: string }[]
  ): Promise<any> {
    const response = await fetch(`${API_URL}/ai-exams/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al enviar respuestas');
    }

    return response.json();
  }

  async getAttemptResult(attemptId: string) {
    const response = await fetch(`${API_URL}/ai-exams/attempts/${attemptId}/result`);
    if (!response.ok) {
      throw new Error('Error al obtener resultado del intento');
    }
    return response.json();
  }

  async sendAttemptResult(attemptId: string, email?: string): Promise<{ message: string; email: string }> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/ai-exams/attempts/${attemptId}/send-result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(email ? { email } : {}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al enviar resultados');
    }

    return response.json();
  }

  // Gestión de estudiantes para exámenes privados
  async addStudents(examId: string, students: { name: string; email: string; password: string }[]) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/ai-exams/${examId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ students }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al agregar estudiantes');
    }

    return response.json();
  }

  async getStudents(examId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/ai-exams/${examId}/students`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener estudiantes');
    }

    return response.json();
  }

  async deleteStudent(examId: string, studentId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/ai-exams/${examId}/students/${studentId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar estudiante');
    }

    return response.json();
  }

  async sendInvitation(examId: string, studentId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/ai-exams/${examId}/send-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ studentId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al enviar invitación');
    }

    return response.json();
  }

  // ==================== COMPARTIR ====================

  async getShares(examId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/ai-exams/${examId}/shares`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Error al obtener compartidos');
    return response.json();
  }

  async getAvailableUsers(examId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/ai-exams/${examId}/available-users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Error al obtener usuarios');
    return response.json();
  }

  async shareExam(examId: string, userId: string, permission: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/ai-exams/${examId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, permission }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al compartir');
    }
    return response.json();
  }

  async updateSharePermission(examId: string, userId: string, permission: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/ai-exams/${examId}/share/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ permission }),
    });
    if (!response.ok) throw new Error('Error al actualizar permiso');
    return response.json();
  }

  async unshareExam(examId: string, userId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/ai-exams/${examId}/share/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Error al eliminar acceso');
    return response.json();
  }
}

export const aiExamService = new AIExamService();
