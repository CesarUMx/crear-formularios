import { api } from './api';
import type { 
  Exam, 
  ExamInput, 
  Permission, 
  ExamAttempt, 
  ExamAttemptResult,
  ExamStats,
  ExamQuestionOption 
} from './types';

export const examService = {
  /**
   * Obtener todos los exámenes del usuario
   */
  async getExams(): Promise<Exam[]> {
    return api.get<Exam[]>('/exams');
  },

  /**
   * Obtener un examen por ID
   */
  async getExamById(id: string): Promise<Exam> {
    return api.get<Exam>(`/exams/${id}`);
  },

  /**
   * Obtener examen público por slug
   */
  async getExamBySlug(slug: string): Promise<Exam> {
    return api.get<Exam>(`/exams/public/${slug}`);
  },

  /**
   * Crear un nuevo examen
   */
  async createExam(data: ExamInput): Promise<{ message: string; exam: Exam }> {
    return api.post<{ message: string; exam: Exam }>('/exams', data);
  },

  /**
   * Actualizar un examen (crea nueva versión)
   */
  async updateExam(id: string, data: ExamInput): Promise<{ message: string; exam: Exam }> {
    return api.put<{ message: string; exam: Exam }>(`/exams/${id}`, data);
  },

  /**
   * Eliminar un examen
   */
  async deleteExam(id: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/exams/${id}`);
  },

  /**
   * Publicar/despublicar examen
   */
  async toggleExamPublish(id: string, isPublic: boolean): Promise<{ message: string; exam: Exam }> {
    return api.patch<{ message: string; exam: Exam }>(`/exams/${id}/publish`, { isPublic });
  },

  /**
   * Activar/Desactivar examen
   */
  async toggleExamActive(id: string, isActive: boolean): Promise<{ message: string; exam: Exam }> {
    return api.patch<{ message: string; exam: Exam }>(`/exams/${id}/status`, { isActive });
  },

  /**
   * Compartir examen
   */
  async shareExam(id: string, userId: string, permission: Permission): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/exams/${id}/share`, { userId, permission });
  },

  /**
   * Remover acceso compartido
   */
  async unshareExam(id: string, userId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/exams/${id}/share/${userId}`);
  },

  /**
   * Subir archivo de apoyo
   */
  async uploadSupportFile(
    id: string, 
    data: { fileName: string; fileUrl: string; fileType: string; fileSize: number }
  ): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/exams/${id}/files`, data);
  },

  /**
   * Eliminar archivo de apoyo
   */
  async deleteSupportFile(id: string, fileId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/exams/${id}/files/${fileId}`);
  },

  /**
   * Verificar si puede tomar el examen
   */
  async checkCanTakeExam(slug: string, email?: string): Promise<{
    canTake: boolean;
    attemptsUsed: number;
    maxAttempts: number;
    attemptsRemaining: number;
    message?: string;
    pendingAttempt?: {
      id: string;
      startedAt: string;
      attemptNumber: number;
    } | null;
  }> {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    return api.get(`/exams/public/${slug}/can-take${params}`);
  },

  /**
   * Iniciar intento de examen
   */
  async startAttempt(slug: string, data: { name: string; email?: string }): Promise<{
    message: string;
    attempt: ExamAttempt;
  }> {
    return api.post<{ message: string; attempt: ExamAttempt }>(
      `/exams/public/${slug}/start`, 
      data
    );
  },

  /**
   * Obtener datos de un intento
   */
  async getAttempt(attemptId: string): Promise<ExamAttempt> {
    return api.get<ExamAttempt>(`/exams/attempts/${attemptId}`);
  },

  /**
   * Guardar respuesta
   */
  async saveAnswer(
    attemptId: string, 
    data: {
      questionId: string;
      textValue?: string;
      selectedOptionIds?: string[];
      jsonValue?: any;
    }
  ): Promise<{ success: boolean }> {
    return api.put<{ success: boolean }>(`/exams/attempts/${attemptId}/answer`, data);
  },

  /**
   * Enviar/completar examen
   */
  async submitAttempt(attemptId: string): Promise<{
    message: string;
    completed: boolean;
    autoGraded: boolean;
    score?: number;
    maxScore?: number;
    passed?: boolean;
    percentage?: number;
  }> {
    return api.post<{
      message: string;
      completed: boolean;
      autoGraded: boolean;
      score?: number;
      maxScore?: number;
      passed?: boolean;
      percentage?: number;
    }>(`/exams/attempts/${attemptId}/submit`, {});
  },

  /**
   * Obtener resultado de intento
   */
  async getAttemptResult(attemptId: string): Promise<ExamAttemptResult> {
    return api.get<ExamAttemptResult>(`/exams/attempts/${attemptId}/result`);
  },

  /**
   * Obtener todos los intentos de un examen (admin)
   */
  async getExamAttempts(id: string): Promise<ExamAttempt[]> {
    return api.get<ExamAttempt[]>(`/exams/${id}/attempts`);
  },

  /**
   * Obtener un intento específico (admin)
   */
  async getAttemptById(id: string, attemptId: string): Promise<ExamAttempt> {
    return api.get<ExamAttempt>(`/exams/${id}/attempts/${attemptId}`);
  },

  /**
   * Calificar pregunta manualmente
   */
  async gradeQuestionManually(
    id: string,
    attemptId: string,
    answerId: string,
    data: { pointsEarned: number; feedback?: string }
  ): Promise<{ message: string }> {
    return api.put<{ message: string }>(
      `/exams/${id}/attempts/${attemptId}/answers/${answerId}/grade`,
      data
    );
  },

  /**
   * Obtener estadísticas del examen
   */
  async getExamStats(id: string): Promise<ExamStats> {
    return api.get<ExamStats>(`/exams/${id}/stats`);
  },

  /**
   * Ajustar puntos a 100
   */
  async adjustPoints(sections: any[]): Promise<any> {
    return api.post('/exams/adjust-points', { sections });
  },
};
