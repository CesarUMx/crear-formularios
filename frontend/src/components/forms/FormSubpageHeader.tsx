import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

interface FormSubpageHeaderProps {
  formId: string;
  formTitle?: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  currentSection?: 'questions' | 'exam' | 'emails' | 'responses' | 'statistics';
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
  showExamSection = false,
  actions
}: FormSubpageHeaderProps) {
  const navSections = [
    { key: 'questions', label: 'Preguntas', href: `/admin/forms/${formId}/questions` },
    ...(showExamSection ? [{ key: 'exam', label: 'Examen', href: `/admin/forms/${formId}/exam` }] : []),
    { key: 'emails', label: 'Correos', href: `/admin/forms/${formId}/emails` },
    { key: 'responses', label: 'Respuestas', href: `/admin/forms/${formId}/responses` },
    { key: 'statistics', label: 'Estadisticas', href: `/admin/forms/${formId}/statistics` },
  ] as const;

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

      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-2">
          {navSections.map((section) => {
            const isActive = currentSection === section.key;
            return (
              <a
                key={section.key}
                href={section.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {section.label}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
