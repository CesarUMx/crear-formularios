import { useState, useEffect } from 'react';
import { formService } from '../../lib/formService';

type Section = 'edit' | 'questions' | 'exam' | 'emails' | 'responses' | 'statistics' | 'hubspot';

interface FormNavTabsProps {
  formId: string;
  currentSection: Section;
}

export default function FormNavTabs({ formId, currentSection }: FormNavTabsProps) {
  const [isExamRegistration, setIsExamRegistration] = useState(false);

  useEffect(() => {
    formService.getFormById(formId)
      .then(form => setIsExamRegistration(form.formType === 'EXAM_REGISTRATION'))
      .catch(() => {});
  }, [formId]);

  const tabs = [
    { key: 'edit', label: 'Configuración', href: `/admin/forms/${formId}/edit` },
    { key: 'questions', label: 'Preguntas', href: `/admin/forms/${formId}/questions` },
    ...(isExamRegistration ? [{ key: 'exam', label: 'Examen', href: `/admin/forms/${formId}/exam` }] : []),
    { key: 'emails', label: 'Correos', href: `/admin/forms/${formId}/emails` },
    { key: 'responses', label: 'Respuestas', href: `/admin/forms/${formId}/responses` },
    { key: 'statistics', label: 'Estadísticas', href: `/admin/forms/${formId}/statistics` },
    { key: 'hubspot', label: 'HubSpot', href: `/admin/forms/${formId}/hubspot` },
  ] as const;

  return (
    <div className="mt-5 pt-4 border-t border-gray-100">
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <a
            key={tab.key}
            href={tab.href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              currentSection === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>
    </div>
  );
}
