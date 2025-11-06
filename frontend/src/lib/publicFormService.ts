const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

export interface PublicForm {
  id: string;
  title: string;
  description?: string;
  slug: string;
  templateId?: string;
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
        options: {
          id: string;
          text: string;
          order: number;
        }[];
      }[];
    }[];
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
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const publicFormService = new PublicFormService();
