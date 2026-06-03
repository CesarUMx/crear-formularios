import { api } from './api';

export interface EmailRule {
  id?: string;
  trigger: 'ON_FORM_SUBMIT' | 'SCHEDULED_REMINDER';
  conditions?: {
    combinator: 'AND' | 'OR';
    rules: Array<{ questionId: string; operator: string; value?: string | string[] }>;
  } | null;
  reminderOffsetMinutes?: number | null;
  reminderAnchor?: 'EXAM_SCHEDULE_START' | 'REGISTRATION_CREATED' | null;
}

export interface EmailTemplate {
  id: string;
  formId: string;
  name: string;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
  rules: EmailRule[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailSendLog {
  id: string;
  templateId: string;
  responseId: string | null;
  recipientEmail: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  errorMessage: string | null;
  scheduledFor: string | null;
  sentAt: string;
  template: { name: string };
}

export interface EmailLogsResponse {
  logs: EmailSendLog[];
  total: number;
  page: number;
  limit: number;
}

export const emailTemplateService = {
  /** Lista todos los templates de un formulario */
  async listTemplates(formId: string): Promise<EmailTemplate[]> {
    return api.get<EmailTemplate[]>(`/forms/${formId}/email-templates`);
  },

  /** Crea un nuevo template */
  async createTemplate(
    formId: string,
    data: Omit<EmailTemplate, 'id' | 'formId' | 'createdAt' | 'updatedAt'>
  ): Promise<EmailTemplate> {
    return api.post<EmailTemplate>(`/forms/${formId}/email-templates`, data);
  },

  /** Actualiza un template existente */
  async updateTemplate(
    id: string,
    data: Partial<Omit<EmailTemplate, 'id' | 'formId' | 'createdAt' | 'updatedAt'>>
  ): Promise<EmailTemplate> {
    return api.put<EmailTemplate>(`/email-templates/${id}`, data);
  },

  /** Elimina un template */
  async deleteTemplate(id: string): Promise<void> {
    return api.delete(`/email-templates/${id}`);
  },

  /** Envía un email de prueba */
  async testTemplate(id: string, testEmail?: string): Promise<{ message: string }> {
    return api.post(`/email-templates/${id}/test`, { testEmail });
  },

  /** Obtiene los logs de envío de un formulario */
  async getLogs(
    formId: string,
    params?: { status?: string; templateId?: string; page?: number; limit?: number }
  ): Promise<EmailLogsResponse> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.templateId) qs.set('templateId', params.templateId);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<EmailLogsResponse>(`/forms/${formId}/email-templates/logs${query}`);
  },
};
