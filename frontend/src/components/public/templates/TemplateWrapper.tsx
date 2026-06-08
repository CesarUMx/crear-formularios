import type { FormTemplate } from '../../../lib/templates';
import type { PublicForm } from '../../../lib/publicFormService';
import AcademicTemplate from './AcademicTemplate';
import UmxTemplate from './UmxTemplate';
import { API_URL } from '../../../lib/config';

const BACKEND_URL = API_URL.replace('/api', '');

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
}

interface TemplateWrapperProps {
  form: PublicForm;
  template: FormTemplate;
  children: React.ReactNode;
}

export default function TemplateWrapper({ form, template, children }: TemplateWrapperProps) {
  // Seleccionar plantilla según el ID
  switch (template.id) {
    case 'umx':
      return (
        <UmxTemplate form={form} template={template}>
          {children}
        </UmxTemplate>
      );

    case 'academic':
      return (
        <AcademicTemplate form={form} template={template}>
          {children}
        </AcademicTemplate>
      );
    
    case 'modern':
    case 'corporate':
    case 'creative':
    default:
      return (
        <div 
          className="min-h-screen py-8 px-4"
          style={{ 
            backgroundColor: template.backgroundColor,
            color: template.textColor,
            fontFamily: template.fontFamily
          }}
        >
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              {/* Imagen de portada */}
              {form.coverImage && (
                <div className="w-full h-52 sm:h-72 overflow-hidden">
                  <img
                    src={resolveImageUrl(form.coverImage)}
                    alt="Portada"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-8">
                <h1 className="text-3xl font-bold mb-2" style={{ color: template.primaryColor }}>
                  {form.title}
                </h1>
                {form.description && (
                  <p className="text-gray-600">{form.description}</p>
                )}
              </div>
            </div>

            {/* Content */}
            {children}
          </div>
        </div>
      );
  }
}
