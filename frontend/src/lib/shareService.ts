const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

export type SharePermission = 'VIEW' | 'EDIT' | 'FULL';

export interface FormShare {
  id: string;
  formId: string;
  userId: string;
  permission: SharePermission;
  sharedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface AvailableUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

class ShareService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Compartir formulario con un usuario
   */
  async shareForm(formId: string, userId: string, permission: SharePermission): Promise<FormShare> {
    const response = await fetch(`${API_URL}/share/${formId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ userId, permission })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al compartir formulario');
    }

    return await response.json();
  }

  /**
   * Obtener usuarios con acceso a un formulario
   */
  async getFormShares(formId: string): Promise<FormShare[]> {
    const response = await fetch(`${API_URL}/share/${formId}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener compartidos');
    }

    return await response.json();
  }

  /**
   * Eliminar acceso de un usuario
   */
  async removeShare(formId: string, userId: string): Promise<void> {
    const response = await fetch(`${API_URL}/share/${formId}/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar acceso');
    }
  }

  /**
   * Actualizar permiso de un usuario
   */
  async updatePermission(formId: string, userId: string, permission: SharePermission): Promise<FormShare> {
    const response = await fetch(`${API_URL}/share/${formId}/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ permission })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar permiso');
    }

    return await response.json();
  }

  /**
   * Obtener usuarios disponibles para compartir
   */
  async getAvailableUsers(formId: string): Promise<AvailableUser[]> {
    const response = await fetch(`${API_URL}/share/${formId}/available-users`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener usuarios disponibles');
    }

    return await response.json();
  }

  /**
   * Obtener etiqueta de permiso
   */
  getPermissionLabel(permission: SharePermission): string {
    const labels = {
      VIEW: 'Solo Ver',
      EDIT: 'Editar',
      FULL: 'Control Total'
    };
    return labels[permission];
  }

  /**
   * Obtener descripción de permiso
   */
  getPermissionDescription(permission: SharePermission): string {
    const descriptions = {
      VIEW: 'Puede ver el formulario y las respuestas',
      EDIT: 'Puede editar el formulario y ver respuestas',
      FULL: 'Puede editar, compartir y eliminar el formulario'
    };
    return descriptions[permission];
  }
}

export const shareService = new ShareService();
