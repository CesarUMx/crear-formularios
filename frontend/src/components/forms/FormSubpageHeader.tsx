import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import FormNavTabs from './FormNavTabs';

type Section = 'edit' | 'questions' | 'exam' | 'emails' | 'responses' | 'statistics' | 'hubspot';

interface FormSubpageHeaderProps {
  formId: string;
  formTitle?: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  currentSection?: Section;
  /** @deprecated — el tab Examen ahora se controla dinámicamente desde FormNavTabs */
  showExamSection?: boolean;
  /** Slot para botones extra a la derecha */
  actions?: React.ReactNode;
}

export default function FormSubpageHeader({
  formId,
  formTitle,
  title,
  description,
  icon: Icon,
  currentSection,
  actions
}: FormSubpageHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <a href="/admin" className="hover:text-gray-700 transition">Admin</a>
        <ChevronRight className="w-3.5 h-3.5" />
        <a href={`/admin/forms/${formId}`} className="hover:text-gray-700 transition">
          {formTitle || 'Formulario'}
        </a>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-800 font-medium">{title}</span>
      </nav>

      {/* Header principal */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-gray-100">
            <Icon className="w-7 h-7 text-gray-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {description && <p className="text-gray-600 mt-1">{description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
          <a
            href={`/admin/forms/${formId}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
          >
            ← Volver al formulario
          </a>
        </div>
      </div>

      {currentSection && (
        <FormNavTabs formId={formId} currentSection={currentSection} />
      )}
    </div>
  );
}
