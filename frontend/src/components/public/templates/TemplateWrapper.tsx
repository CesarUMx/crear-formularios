import type { FormTemplate } from '../../../lib/templates';
import type { PublicForm } from '../../../lib/publicFormService';
import AcademicTemplate from './AcademicTemplate';

interface TemplateWrapperProps {
  form: PublicForm;
  template: FormTemplate;
  children: React.ReactNode;
}

export default function TemplateWrapper({ form, template, children }: TemplateWrapperProps) {
  // Seleccionar plantilla según el ID
  switch (template.id) {
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
      // Plantilla por defecto (moderna/minimalista)
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
            {/* Header Simple */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
              <h1 className="text-3xl font-bold mb-2" style={{ color: template.primaryColor }}>
                {form.title}
              </h1>
              {form.description && (
                <p className="text-gray-600">{form.description}</p>
              )}
            </div>

            {/* Content */}
            {children}
          </div>
        </div>
      );
  }
}
