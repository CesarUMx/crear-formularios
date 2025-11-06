import type { FormTemplate } from '../../lib/templates';
import { Check } from 'lucide-react';

interface TemplatePreviewProps {
  template: FormTemplate;
  isSelected: boolean;
  onSelect: () => void;
}

export default function TemplatePreview({ template, isSelected, onSelect }: TemplatePreviewProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        relative w-full text-left rounded-lg border-2 transition-all
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-lg' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }
      `}
    >
      {/* Preview Image/Mockup */}
      <div 
        className="h-40 rounded-t-lg p-4 flex items-center justify-center relative overflow-hidden"
        style={{ 
          background: template.headerStyle === 'gradient' && template.customStyles?.headerGradient
            ? template.customStyles.headerGradient
            : template.primaryColor
        }}
      >
        {/* Mini Form Preview */}
        <div className="w-full max-w-xs space-y-2">
          <div className="h-3 bg-white/30 rounded w-3/4 mx-auto"></div>
          <div className="h-2 bg-white/20 rounded w-1/2 mx-auto"></div>
        </div>

        {/* Selected Badge */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
            <Check className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Template Info */}
      <div className="p-4 bg-white rounded-b-lg">
        <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
        <p className="text-sm text-gray-600 mb-3">{template.description}</p>

        {/* Color Palette */}
        <div className="flex gap-2">
          <div 
            className="w-6 h-6 rounded-full border border-gray-200"
            style={{ backgroundColor: template.primaryColor }}
            title="Color primario"
          />
          <div 
            className="w-6 h-6 rounded-full border border-gray-200"
            style={{ backgroundColor: template.secondaryColor }}
            title="Color secundario"
          />
          <div 
            className="w-6 h-6 rounded-full border border-gray-200"
            style={{ backgroundColor: template.accentColor }}
            title="Color de acento"
          />
        </div>

        {/* Style Tags */}
        <div className="flex flex-wrap gap-1 mt-3">
          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
            {template.headerStyle}
          </span>
          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
            {template.sectionStyle}
          </span>
          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
            {template.buttonStyle}
          </span>
        </div>
      </div>
    </button>
  );
}
