import { api } from './api';
import { API_URL } from './config';
import type { Form, FormInput, Permission } from './types';

export const formService = {
  /**
   * Obtener todos los formularios del usuario
   */
  async getForms(): Promise<Form[]> {
    return api.get<Form[]>('/forms');
  },

  /**
   * Obtener un formulario por ID
   */
  async getFormById(id: string): Promise<Form> {
    return api.get<Form>(`/forms/${id}`);
  },

  /**
   * Crear un nuevo formulario
   */
  async createForm(data: FormInput): Promise<{ message: string; form: Form }> {
    return api.post<{ message: string; form: Form }>('/forms', data);
  },

  /**
   * Actualizar un formulario (crea nueva versión)
   */
  async updateForm(id: string, data: FormInput): Promise<{ message: string; form: Form }> {
    return api.put<{ message: string; form: Form }>(`/forms/${id}`, data);
  },

  /**
   * Actualizar SOLO secciones/preguntas sin tocar configuración del formulario
   */
  async updateFormSections(id: string, sections: FormInput['sections']): Promise<{ message: string; form: Form }> {
    return api.patch<{ message: string; form: Form }>(`/forms/${id}/sections`, { sections });
  },

  /**
   * Eliminar un formulario
   */
  async deleteForm(id: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/forms/${id}`);
  },

  /**
   * Activar/Desactivar formulario
   */
  async toggleFormStatus(id: string, isActive: boolean): Promise<{ message: string; form: Form }> {
    return api.patch<{ message: string; form: Form }>(`/forms/${id}/status`, { isActive });
  },

  /**
   * Compartir formulario
   */
  async shareForm(id: string, userId: string, permission: Permission): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/forms/${id}/share`, { userId, permission });
  },

  /**
   * Remover acceso compartido
   */
  async unshareForm(id: string, userId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/forms/${id}/share/${userId}`);
  },

  /**
   * Actualizar permisos de compartido
   */
  async updateSharePermission(id: string, userId: string, permission: Permission): Promise<{ message: string }> {
    return api.patch<{ message: string }>(`/forms/${id}/share/${userId}`, { permission });
  },

  /**
   * Actualizar configuración del formulario sin crear versión ni tocar secciones
   */
  async updateFormConfig(id: string, data: Partial<FormInput>): Promise<{ message: string; form: Form }> {
    return api.patch<{ message: string; form: Form }>(`/forms/${id}/config`, data);
  },

  /**
   * Duplicar un formulario (copia configuración sin respuestas)
   */
  async duplicateForm(id: string): Promise<{ message: string; form: Form }> {
    return api.post<{ message: string; form: Form }>(`/forms/${id}/duplicate`, {});
  },

  /**
   * Renombrar un formulario (solo título, sin crear versión)
   */
  async renameForm(id: string, title: string): Promise<{ message: string; form: Form }> {
    return api.patch<{ message: string; form: Form }>(`/forms/${id}/rename`, { title });
  },

  /**
   * Subir imagen de portada
   */
  async uploadCoverImage(id: string, file: File): Promise<{ message: string; coverImageUrl: string }> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('coverImage', file);
    const response = await fetch(`${API_URL}/forms/${id}/cover`, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al subir imagen');
    return data;
  },

  /**
   * Eliminar imagen de portada
   */
  async deleteCoverImage(id: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/forms/${id}/cover`);
  },
};
