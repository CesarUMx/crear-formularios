import type { PlatformSettings } from './types';

const STORAGE_KEY = 'platform_settings';

// Configuración por defecto
const DEFAULT_SETTINGS: PlatformSettings = {
  logo: '/images/logo.svg',
  primaryColor: '#2563eb', // blue-600
  secondaryColor: '#1e40af', // blue-800
  accentColor: '#3b82f6', // blue-500
};

class PlatformSettingsService {
  /**
   * Obtener configuración actual
   */
  getSettings(): PlatformSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Guardar configuración
   */
  saveSettings(settings: PlatformSettings): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
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
   */
  resetToDefaults(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(STORAGE_KEY);
    this.applySettings(DEFAULT_SETTINGS);
  }

  /**
   * Inicializar configuración al cargar la página
   */
  initialize(): void {
    const settings = this.getSettings();
    this.applySettings(settings);
  }
}

export const platformSettingsService = new PlatformSettingsService();
