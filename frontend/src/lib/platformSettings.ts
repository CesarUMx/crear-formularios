import type { PlatformSettings } from './types';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

// Configuración por defecto
const DEFAULT_SETTINGS: PlatformSettings = {
  logo: '/images/logo.svg',
  primaryColor: '#2563eb', // blue-600
  secondaryColor: '#1e40af', // blue-800
  accentColor: '#3b82f6', // blue-500
};

class PlatformSettingsService {
  /**
   * Obtener configuración actual desde la API
   */
  async getSettings(): Promise<PlatformSettings> {
    try {
      const response = await fetch(`${API_URL}/settings`);
      if (!response.ok) throw new Error('Error al obtener configuración');
      
      const data = await response.json();
      return {
        logo: data.logo || DEFAULT_SETTINGS.logo,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor
      };
    } catch (error) {
      console.error('Error al obtener configuración:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Guardar configuración en la API
   */
  async saveSettings(settings: PlatformSettings): Promise<void> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No autenticado');
    
    const response = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al guardar configuración');
    }
    
    // Guardar en sessionStorage para evitar parpadeo
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('platform_colors', JSON.stringify({
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor
      }));
    }
    
    this.applySettings(settings);
  }

  /**
   * Aplicar configuración al DOM
   */
  applySettings(settings: PlatformSettings): void {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // Aplicar colores como variables CSS
    root.style.setProperty('--color-primary', settings.primaryColor);
    root.style.setProperty('--color-secondary', settings.secondaryColor);
    root.style.setProperty('--color-accent', settings.accentColor);
  }

  /**
   * Subir logo
   */
  async uploadLogo(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Resetear a configuración por defecto
   * @returns La configuración por defecto aplicada
   */
  async resetToDefaults(): Promise<PlatformSettings> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No autenticado');
    
    const response = await fetch(`${API_URL}/settings/reset`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al resetear configuración');
    }
    
    const settings = await response.json();
    
    // Convertir a objeto PlatformSettings
    const platformSettings: PlatformSettings = {
      logo: settings.logo || DEFAULT_SETTINGS.logo,
      primaryColor: settings.primaryColor || DEFAULT_SETTINGS.primaryColor,
      secondaryColor: settings.secondaryColor || DEFAULT_SETTINGS.secondaryColor,
      accentColor: settings.accentColor || DEFAULT_SETTINGS.accentColor
    };
    
    // Aplicar configuración
    this.applySettings(platformSettings);
    
    // Guardar en localStorage para persistencia
    if (typeof window !== 'undefined') {
      localStorage.setItem('platform_colors', JSON.stringify({
        primaryColor: platformSettings.primaryColor,
        secondaryColor: platformSettings.secondaryColor,
        accentColor: platformSettings.accentColor
      }));
    }
    
    return platformSettings;
  }

  /**
   * Inicializar configuración al cargar la página
   */
  async initialize(): Promise<void> {
    const settings = await this.getSettings();
    this.applySettings(settings);
  }
}

export const platformSettingsService = new PlatformSettingsService();
