import type { FormTemplate } from './templates';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

class TemplateService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Obtener todas las plantillas activas
   */
  async getTemplates(): Promise<FormTemplate[]> {
    const response = await fetch(`${API_URL}/templates`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Error al cargar plantillas');
    }

    return await response.json();
  }

  /**
   * Obtener una plantilla por ID
   */
  async getTemplateById(id: string): Promise<FormTemplate> {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Plantilla no encontrada');
    }

    return await response.json();
  }

  /**
   * Aplicar estilos de plantilla al documento
   */
  applyTemplateStyles(template: FormTemplate) {
    const root = document.documentElement;
    
    // Aplicar colores
    root.style.setProperty('--template-primary', template.primaryColor);
    root.style.setProperty('--template-secondary', template.secondaryColor);
    root.style.setProperty('--template-accent', template.accentColor);
    root.style.setProperty('--template-background', template.backgroundColor);
    root.style.setProperty('--template-text', template.textColor);
    
    // Aplicar tipografía
    root.style.setProperty('--template-font-family', template.fontFamily);
    root.style.setProperty('--template-font-size', this.getFontSizeValue(template.fontSize));
    
    // Aplicar estilos de componentes
    root.style.setProperty('--template-border-radius', this.getBorderRadiusValue(template.buttonStyle));
    
    // Aplicar estilos personalizados
    if (template.customStyles) {
      Object.entries(template.customStyles).forEach(([key, value]) => {
        root.style.setProperty(`--template-${this.kebabCase(key)}`, String(value));
      });
    }
  }

  /**
   * Remover estilos de plantilla
   */
  removeTemplateStyles() {
    const root = document.documentElement;
    const templateVars = [
      '--template-primary',
      '--template-secondary',
      '--template-accent',
      '--template-background',
      '--template-text',
      '--template-font-family',
      '--template-font-size',
      '--template-border-radius'
    ];
    
    templateVars.forEach(varName => {
      root.style.removeProperty(varName);
    });
  }

  // Helpers privados
  private getFontSizeValue(size: 'sm' | 'base' | 'lg'): string {
    const sizes = {
      sm: '14px',
      base: '16px',
      lg: '18px'
    };
    return sizes[size];
  }

  private getBorderRadiusValue(style: 'rounded' | 'square' | 'pill'): string {
    const radius = {
      rounded: '8px',
      square: '0px',
      pill: '9999px'
    };
    return radius[style];
  }

  private kebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

export const templateService = new TemplateService();
