import { api } from './api';
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
};
