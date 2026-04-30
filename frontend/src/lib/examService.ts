import { api } from './api';
import type { 
  Exam, 
  ExamInput, 
  Permission, 
  ExamAttempt, 
  ExamAttemptResult,
  ExamStats 
} from './types';
import { API_URL } from './config';

export const examService = {
  // ==================== CRUD ====================

  async getExams(): Promise<Exam[]> {
    return api.get<Exam[]>('/exams');
  },

  async getExamById(id: string): Promise<Exam> {
    return api.get<Exam>(`/exams/${id}`);
  },

  async getExamBySlug(slug: string): Promise<Exam> {
    return api.get<Exam>(`/exams/public/${slug}`);
  },

  async createExam(data: ExamInput): Promise<{ message: string; exam: Exam }> {
    return api.post<{ message: string; exam: Exam }>('/exams', data);
  },

  async updateExam(id: string, data: ExamInput): Promise<{ message: string; exam: Exam }> {
    return api.put<{ message: string; exam: Exam }>(`/exams/${id}`, data);
  },

  async deleteExam(id: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/exams/${id}`);
  },

  async duplicateExam(id: string): Promise<{ message: string; exam: Exam }> {
    return api.post<{ message: string; exam: Exam }>(`/exams/${id}/duplicate`, {});
  },

  async toggleExamPublish(id: string, isActive: boolean): Promise<{ message: string; exam: Exam }> {
    return api.patch<{ message: string; exam: Exam }>(`/exams/${id}/publish`, { isActive });
  },

  async toggleExamActive(id: string, isActive: boolean): Promise<{ message: string; exam: Exam }> {
    return api.patch<{ message: string; exam: Exam }>(`/exams/${id}/status`, { isActive });
  },

  // ==================== COMPARTIR ====================

  async shareExam(id: string, userId: string, permission: Permission): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/exams/${id}/share`, { userId, permission });
  },

  async unshareExam(id: string, userId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/exams/${id}/share/${userId}`);
  },

  async getExamShares(id: string): Promise<any[]> {
    return api.get<any[]>(`/exams/${id}/shares`);
  },

  async getAvailableUsers(id: string): Promise<any[]> {
    return api.get<any[]>(`/exams/${id}/available-users`);
  },

  async updateSharePermission(id: string, userId: string, permission: Permission): Promise<any> {
    return api.put<any>(`/exams/${id}/share/${userId}`, { permission });
  },

  // ==================== ARCHIVOS ====================

  async uploadSectionFile(examId: string, sectionId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/exams/${examId}/sections/${sectionId}/file`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Error al subir archivo');
    return res.json();
  },

  async deleteSectionFile(examId: string, sectionId: string): Promise<any> {
    return api.delete(`/exams/${examId}/sections/${sectionId}/file`);
  },

  async uploadQuestionFile(examId: string, questionId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/exams/${examId}/questions/${questionId}/file`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Error al subir archivo');
    return res.json();
  },

  async deleteQuestionFile(examId: string, questionId: string): Promise<any> {
    return api.delete(`/exams/${examId}/questions/${questionId}/file`);
  },

  // ==================== ESTUDIANTES (PRIVADO) ====================

  async addStudents(examId: string, students: { name: string; email: string; password: string }[]): Promise<any> {
    return api.post(`/exams/${examId}/students`, { students });
  },

  async getStudents(examId: string): Promise<any[]> {
    return api.get(`/exams/${examId}/students`);
  },

  async updateStudent(examId: string, studentId: string, data: { isActive?: boolean; name?: string }): Promise<any> {
    return api.put(`/exams/${examId}/students/${studentId}`, data);
  },

  async deleteStudent(examId: string, studentId: string): Promise<any> {
    return api.delete(`/exams/${examId}/students/${studentId}`);
  },

  async loginStudent(slug: string, email: string, password: string): Promise<any> {
    return api.post('/exams/login', { slug, email, password });
  },

  // ==================== INTENTOS ====================

  async checkCanTakeExam(slug: string, email?: string): Promise<{
    canTake: boolean;
    attemptsUsed: number;
    maxAttempts: number;
    message?: string;
    pendingAttempt?: { id: string; startedAt: string; attemptNumber: number } | null;
  }> {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    return api.get(`/exams/public/${slug}/can-take${params}`);
  },

  async startAttempt(slug: string, data: { name: string; email?: string; studentId?: string }): Promise<{
    message: string;
    attempt: any;
  }> {
    return api.post(`/exams/public/${slug}/start`, data);
  },

  async getAttempt(attemptId: string): Promise<ExamAttempt> {
    return api.get<ExamAttempt>(`/exams/attempts/${attemptId}`);
  },

  async saveAnswer(
    attemptId: string,
    data: { questionId: string; textValue?: string; selectedOptionIds?: string[]; jsonValue?: any }
  ): Promise<{ success: boolean }> {
    return api.put<{ success: boolean }>(`/exams/attempts/${attemptId}/answer`, data);
  },

  async submitAttempt(attemptId: string): Promise<any> {
    return api.post(`/exams/attempts/${attemptId}/submit`, {});
  },

  async getAttemptResult(attemptId: string): Promise<ExamAttemptResult> {
    return api.get<ExamAttemptResult>(`/exams/attempts/${attemptId}/result`);
  },

  async sendAttemptResult(attemptId: string, email?: string): Promise<{ message: string; email: string }> {
    return api.post<{ message: string; email: string }>(
      `/exams/attempts/${attemptId}/send-result`,
      email ? { email } : {}
    );
  },

  async getExamAttempts(id: string): Promise<ExamAttempt[]> {
    return api.get<ExamAttempt[]>(`/exams/${id}/attempts`);
  },

  async getAttemptById(id: string, attemptId: string): Promise<ExamAttempt> {
    return api.get<ExamAttempt>(`/exams/${id}/attempts/${attemptId}`);
  },

  // ==================== CALIFICACION ====================

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

  async getExamStats(id: string): Promise<ExamStats> {
    return api.get<ExamStats>(`/exams/${id}/stats`);
  },

  // ==================== SEGURIDAD ====================

  async recordTabSwitch(attemptId: string): Promise<any> {
    return api.post(`/exams/attempts/${attemptId}/tab-switch`, {});
  },

  async saveStudentPhoto(attemptId: string, photo: string): Promise<any> {
    return api.post(`/exams/attempts/${attemptId}/photo`, { photo });
  },

  // ==================== SEGURIDAD ESTRICTA ====================

  async createSecurityEvent(data: {
    attemptId: string;
    attemptType: 'EXAM' | 'AI_EXAM';
    eventType: 'TAB_SWITCH' | 'WINDOW_BLUR' | 'CONTEXT_MENU' | 'COPY_PASTE' | 'FULLSCREEN_EXIT';
    metadata?: any;
  }): Promise<{ success: boolean; event: { id: string; unlockCode: string; eventType: string; createdAt: string } }> {
    return api.post('/security/events', data);
  },

  async validateUnlockCode(attemptId: string, code: string): Promise<{ success: boolean; message: string }> {
    return api.post('/security/validate-code', { attemptId, code });
  },

  async getPendingSecurityEvents(examId: string): Promise<any[]> {
    return api.get(`/security/exams/${examId}/events`);
  },

  async getSecurityEventsByAttempt(attemptId: string): Promise<any[]> {
    return api.get(`/security/attempts/${attemptId}/events`);
  },

  async forceCompleteAttempt(attemptId: string): Promise<{ success: boolean; message: string; attempt: any }> {
    return api.post(`/security/attempts/${attemptId}/force-complete`, {});
  },

  async checkForceCompletion(attemptId: string): Promise<{ forceCompleted: boolean; forceCompletedBy?: string; forceCompletedAt?: string }> {
    return api.get(`/security/attempts/${attemptId}/check-completion`);
  },

  //  ==================== TIMERS POR SECCION ====================

  async startSection(attemptId: string, sectionId: string): Promise<any> {
    return api.post(`/exams/attempts/${attemptId}/sections/${sectionId}/start`, {});
  },

  async completeSection(attemptId: string, sectionId: string): Promise<any> {
    return api.post(`/exams/attempts/${attemptId}/sections/${sectionId}/complete`, {});
  },

  // ==================== REPORTES ====================

  async createQuestionReport(examId: string, questionId: string, data: any): Promise<any> {
    return api.post(`/exams/${examId}/questions/${questionId}/report`, data);
  },

  async getQuestionReports(examId: string, status?: string): Promise<any[]> {
    const params = status ? `?status=${status}` : '';
    return api.get(`/exams/${examId}/reports${params}`);
  },

  async reviewQuestionReport(reportId: string, data: { status: string; reviewNotes?: string }): Promise<any> {
    return api.put(`/exams/reports/${reportId}`, data);
  },
};
