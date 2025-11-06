const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

export interface FileUploadResponse {
  success: boolean;
  file: {
    url: string;
    name: string;
    size: number;
    originalSize: number;
    reduction: string;
    type: string;
  };
}

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class FileService {
  /**
   * Subir archivo
   */
  async uploadFile(
    file: File,
    questionId: string,
    responseId: string,
    formId: string,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('questionId', questionId);
    formData.append('responseId', responseId);
    formData.append('formId', formId);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Progreso de subida
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress({
              loaded: e.loaded,
              total: e.total,
              percentage: Math.round((e.loaded / e.total) * 100)
            });
          }
        });
      }

      // Respuesta
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Error al procesar la respuesta'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || 'Error al subir el archivo'));
          } catch {
            reject(new Error('Error al subir el archivo'));
          }
        }
      });

      // Error
      xhr.addEventListener('error', () => {
        reject(new Error('Error de red al subir el archivo'));
      });

      // Timeout
      xhr.addEventListener('timeout', () => {
        reject(new Error('Tiempo de espera agotado'));
      });

      xhr.open('POST', `${API_URL}/files/upload`);
      xhr.timeout = 120000; // 2 minutos
      xhr.send(formData);
    });
  }

  /**
   * Eliminar archivo
   */
  async deleteFile(formId: string, responseId: string, filename: string): Promise<void> {
    const response = await fetch(
      `${API_URL}/files/${formId}/${responseId}/${filename}`,
      {
        method: 'DELETE'
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar el archivo');
    }
  }

  /**
   * Obtener información del archivo
   */
  async getFileInfo(formId: string, responseId: string, filename: string): Promise<any> {
    const response = await fetch(
      `${API_URL}/files/info/${formId}/${responseId}/${filename}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener información del archivo');
    }

    return await response.json();
  }

  /**
   * Validar archivo antes de subir
   */
  validateFile(
    file: File,
    allowedTypes?: string,
    maxSize?: number
  ): { valid: boolean; error?: string } {
    // Validar tamaño
    const maxBytes = (maxSize || 10) * 1024 * 1024;
    if (file.size > maxBytes) {
      return {
        valid: false,
        error: `El archivo excede el tamaño máximo de ${maxSize || 10}MB`
      };
    }

    // Validar tipo si hay restricciones
    if (allowedTypes) {
      const types = allowedTypes.split(',').map(t => t.trim());
      const fileType = this.getFileType(file.type);

      if (!types.includes(fileType)) {
        return {
          valid: false,
          error: `Tipo de archivo no permitido. Solo se aceptan: ${allowedTypes}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Determinar tipo de archivo
   */
  private getFileType(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'IMAGE';
    if (mimetype === 'application/pdf') return 'PDF';
    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimetype === 'application/vnd.ms-excel'
    ) {
      return 'EXCEL';
    }
    return 'UNKNOWN';
  }

  /**
   * Formatear tamaño de archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Obtener icono según tipo de archivo
   */
  getFileIcon(mimetype: string): string {
    const type = this.getFileType(mimetype);
    
    switch (type) {
      case 'IMAGE':
        return '🖼️';
      case 'PDF':
        return '📄';
      case 'EXCEL':
        return '📊';
      default:
        return '📎';
    }
  }
}

export const fileService = new FileService();
