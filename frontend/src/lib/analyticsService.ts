/**
 * Servicio para manejar las analíticas y respuestas de formularios
 */

import { authService } from './auth';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

// Interfaces para las respuestas
export interface FormResponse {
  id: string;
  formId: string;
  folio: string;
  submittedAt: string;
  ipAddress?: string;
  userAgent?: string;
  isComplete: boolean;
  answers: Answer[];
}

export interface Answer {
  id: string;
  questionId: string;
  textValue?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  question: {
    id: string;
    text: string;
    type: string;
    sectionId?: string;
    section?: {
      id: string;
      title: string;
    };
  };
  selectedOptions: {
    id: string;
    text: string;
  }[];
}

// Interfaces para las estadísticas
export interface QuestionStatistics {
  questionId: string;
  questionText: string;
  questionType: string;
  totalAnswers: number;
  data: any;
}

export interface FormStatistics {
  formId: string;
  formTitle: string;
  statistics: QuestionStatistics[];
}

// Interfaces para la paginación
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ResponsesResult {
  data: FormResponse[];
  pagination: Pagination;
}

class AnalyticsService {
  /**
   * Obtener todas las respuestas de un formulario
   */
  async getFormResponses(formId: string, page = 1, limit = 10): Promise<ResponsesResult> {
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('No estás autenticado');
    }
    
    const response = await fetch(`${API_URL}/analytics/forms/${formId}/responses?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener respuestas');
    }
    
    return await response.json();
  }
  
  /**
   * Obtener estadísticas por pregunta de un formulario
   */
  async getFormStatistics(formId: string): Promise<FormStatistics> {
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('No estás autenticado');
    }
    
    const response = await fetch(`${API_URL}/analytics/forms/${formId}/statistics`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener estadísticas');
    }
    
    return await response.json();
  }
  
  /**
   * Obtener URL para exportar respuestas a CSV
   */
  getExportUrl(formId: string, format = 'csv'): string {
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('No estás autenticado');
    }
    
    return `${API_URL}/analytics/forms/${formId}/export?format=${format}&token=${token}`;
  }
  
  /**
   * Obtener una respuesta específica por su ID
   */
  async getResponseById(formId: string, responseId: string): Promise<FormResponse> {
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('No estás autenticado');
    }
    
    const response = await fetch(`${API_URL}/analytics/forms/${formId}/responses/${responseId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener la respuesta');
    }
    
    return await response.json();
  }

  /**
   * Exportar respuestas a formato JSON
   */
  async exportResponses(formId: string): Promise<any> {
    const token = authService.getToken();
    
    if (!token) {
      throw new Error('No estás autenticado');
    }
    
    const response = await fetch(`${API_URL}/analytics/forms/${formId}/export?format=json`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al exportar respuestas');
    }
    
    return await response.json();
  }
}

export const analyticsService = new AnalyticsService();
