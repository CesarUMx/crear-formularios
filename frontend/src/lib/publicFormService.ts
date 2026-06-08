import { API_URL } from './config';

export interface PublicForm {
  id: string;
  title: string;
  description?: string;
  slug: string;
  templateId?: string;
  coverImage?: string;
  version: {
    id: string;
    version: number;
    sections: {
      id: string;
      title: string;
      description?: string;
      order: number;
      questions: {
        id: string;
        type: string;
        text: string;
        placeholder?: string;
        helpText?: string;
        isRequired: boolean;
        allowedFileTypes?: string;
        maxFileSize?: number;
        order: number;
        conditionalLogic?: {
          combinator: 'AND' | 'OR';
          rules: {
            questionId: string;
            operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
            value?: string | string[];
          }[];
          action: 'SHOW' | 'HIDE' | 'REQUIRE';
        };
        options: {
          id: string;
          text: string;
          order: number;
        }[];
      }[];
    }[];
  };
  hubspotValidation?: {
    matchQuestionId: string;
    message: string;
  };
}

export interface AnswerInput {
  questionId: string;
  textAnswer?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  selectedOptions?: string[];
}

export interface ResponseInput {
  formId: string;
  versionId: string;
  answers: AnswerInput[];
}

export interface ResponseOutput {
  id: string;
  folio: string;
  submittedAt: string;
  formTitle: string;
  message: string;
  registered?: boolean;
  registration?: {
    id: string;
    scheduleId: string;
    scheduleTitle: string;
    studentName: string;
    studentEmail: string;
    startTime: string;
    endTime: string;
    location: string | null;
  };
}

class PublicFormService {
  /**
   * Obtener formulario público por slug
   */
  async getFormBySlug(slug: string): Promise<PublicForm> {
    const response = await fetch(`${API_URL}/forms/public/${slug}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Formulario no encontrado');
      }
      throw new Error('Error al cargar el formulario');
    }

    return await response.json();
  }

  /**
   * Enviar respuesta de formulario
   */
  async submitResponse(data: ResponseInput): Promise<ResponseOutput> {
    const response = await fetch(`${API_URL}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al enviar respuesta');
    }

    return await response.json();
  }

  /**
   * Enviar respuesta de formulario de registro de examen
   */
  async submitExamRegistration(slug: string, data: { versionId: string; answers: any[] }): Promise<ResponseOutput> {
    const response = await fetch(`${API_URL}/forms/public/${slug}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al registrar');
    }

    return await response.json();
  }

  /**
   * Validar respuesta antes de enviar
   */
  validateAnswers(form: PublicForm, answers: Map<string, AnswerInput>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Obtener todas las preguntas
    const allQuestions = form.version.sections.flatMap(s => s.questions);

    // Validar preguntas requeridas
    for (const question of allQuestions) {
      if (question.isRequired) {
        const answer = answers.get(question.id);

        if (!answer) {
          errors.push(`La pregunta "${question.text}" es requerida`);
          continue;
        }

        // Validar según tipo
        switch (question.type) {
          case 'TEXT':
          case 'TEXTAREA':
            if (!answer.textAnswer || answer.textAnswer.trim() === '') {
              errors.push(`La pregunta "${question.text}" es requerida`);
            }
            break;

          case 'SELECT':
          case 'RADIO':
            if (!answer.textAnswer) {
              errors.push(`La pregunta "${question.text}" es requerida`);
            }
            break;

          case 'CHECKBOX':
            if (!answer.selectedOptions || answer.selectedOptions.length === 0) {
              errors.push(`La pregunta "${question.text}" es requerida`);
            }
            break;

          case 'FILE':
            if (!answer.fileUrl) {
              errors.push(`Debes subir un archivo para "${question.text}"`);
            }
            break;

          case 'BOOLEAN':
            if (answer.textAnswer !== 'true') {
              errors.push(`Debes aceptar "${question.text}" para continuar`);
            }
            break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtener horarios disponibles de un examen (publico)
   */
  async getAvailableSchedules(examId: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/exam-schedules/exam/${examId}/available`);
    if (!response.ok) return [];
    return await response.json();
  }

  /**
   * Verificar si un email ya esta registrado en un examen (publico)
   */
  async checkEmailRegistered(examId: string, email: string): Promise<{ isRegistered: boolean }> {
    const response = await fetch(`${API_URL}/exam-registrations/check-email?examId=${examId}&email=${encodeURIComponent(email)}`);
    if (!response.ok) return { isRegistered: false };
    return await response.json();
  }
}

export const publicFormService = new PublicFormService();
