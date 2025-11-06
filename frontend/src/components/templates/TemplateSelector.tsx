import { useState, useEffect } from 'react';
import { FORM_TEMPLATES, type FormTemplate } from '../../lib/templates';
import TemplatePreview from './TemplatePreview';
import { Palette, Loader } from 'lucide-react';

interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onSelect: (templateId: string) => void;
}

export default function TemplateSelector({ selectedTemplateId, onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<FormTemplate[]>(FORM_TEMPLATES);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const handleSelect = (templateId: string) => {
    onSelect(templateId);
    setIsOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Current Template Display */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Palette className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Plantilla de Diseño</h3>
              <p className="text-sm text-gray-600">
                Actual: <span className="font-semibold">{selectedTemplate.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            {isOpen ? 'Cerrar' : 'Cambiar Plantilla'}
          </button>
        </div>

        {/* Color Preview */}
        <div className="flex gap-2 mt-3">
          <div 
            className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm"
            style={{ backgroundColor: selectedTemplate.primaryColor }}
            title="Color primario"
          />
          <div 
            className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm"
            style={{ backgroundColor: selectedTemplate.secondaryColor }}
            title="Color secundario"
          />
          <div 
            className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm"
            style={{ backgroundColor: selectedTemplate.accentColor }}
            title="Color de acento"
          />
        </div>
      </div>

      {/* Template Selection Grid */}
      {isOpen && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Selecciona una Plantilla
            </h4>
            <p className="text-sm text-gray-600">
              Elige el diseño que mejor se adapte a tu formulario. Puedes cambiarlo en cualquier momento.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map((template) => (
                <TemplatePreview
                  key={template.id}
                  template={template}
                  isSelected={template.id === selectedTemplateId}
                  onSelect={() => handleSelect(template.id)}
                />
              ))}
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> La plantilla solo afecta el diseño visual del formulario público. 
              Los datos y preguntas permanecen igual.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
