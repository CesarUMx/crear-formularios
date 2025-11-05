import { api } from './api';
import type { SystemUser, UserStats, UserRole } from './types';

export const userService = {
  /**
   * Obtener estadísticas de usuarios
   */
  async getStats(): Promise<UserStats> {
    return api.get<UserStats>('/users/stats');
  },

  /**
   * Obtener todos los usuarios
   */
  async getUsers(): Promise<SystemUser[]> {
    return api.get<SystemUser[]>('/users');
  },

  /**
   * Obtener un usuario por ID
   */
  async getUserById(id: string): Promise<SystemUser> {
    return api.get<SystemUser>(`/users/${id}`);
  },

  /**
   * Crear un nuevo usuario
   */
  async createUser(data: {
    email: string;
    name: string;
    password: string;
    role?: UserRole;
  }): Promise<{ message: string; user: SystemUser }> {
    return api.post<{ message: string; user: SystemUser }>('/users', data);
  },

  /**
   * Actualizar un usuario
   */
  async updateUser(
    id: string,
    data: {
      name?: string;
      role?: UserRole;
      isActive?: boolean;
    }
  ): Promise<{ message: string; user: SystemUser }> {
    return api.put<{ message: string; user: SystemUser }>(`/users/${id}`, data);
  },

  /**
   * Eliminar un usuario
   */
  async deleteUser(id: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/users/${id}`);
  },

  /**
   * Activar/Desactivar usuario
   */
  async toggleUserStatus(id: string, isActive: boolean): Promise<{ message: string; user: SystemUser }> {
    return api.patch<{ message: string; user: SystemUser }>(`/users/${id}/status`, { isActive });
  },

  /**
   * Resetear contraseña de un usuario
   */
  async resetPassword(id: string, newPassword: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/users/${id}/reset-password`, { newPassword });
  },
};
