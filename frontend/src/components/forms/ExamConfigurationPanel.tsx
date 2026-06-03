import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { SectionInput, QuestionInput, SimpleCondition } from '../../lib/types';
import RegistrationConditionEditor from './RegistrationConditionEditor';

interface ExamOption {
  id: string;
  title: string;
}

interface ExamConfigurationPanelProps {
  linkedExamId: string;
  emailQuestionId: string;
  nameQuestionId: string;
  allowExemption: boolean;
  registrationCondition?: SimpleCondition;
  sections: SectionInput[];
  onLinkedExamChange: (id: string) => void;
  onEmailQuestionChange: (id: string) => void;
  onNameQuestionChange: (id: string) => void;
  onAllowExemptionChange: (allow: boolean) => void;
  onRegistrationConditionChange: (condition: SimpleCondition | undefined) => void;
}

export default function ExamConfigurationPanel({
  linkedExamId,
  emailQuestionId,
  nameQuestionId,
  allowExemption,
  registrationCondition,
  sections,
  onLinkedExamChange,
  onEmailQuestionChange,
  onNameQuestionChange,
  onAllowExemptionChange,
  onRegistrationConditionChange
}: ExamConfigurationPanelProps) {
  const [availableExams, setAvailableExams] = useState<ExamOption[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  useEffect(() => {
    setLoadingExams(true);
    api
      .get<any[]>('/exams?limit=100')
      .then((data) => {
        const exams = Array.isArray(data) ? data : ((data as any).exams || (data as any).data || []);
        const privateExams = exams.filter((e: any) => e.accessType === 'PRIVATE');
        setAvailableExams(privateExams.map((e: any) => ({ id: e.id, title: e.title })));
      })
      .catch(() => setAvailableExams([]))
      .finally(() => setLoadingExams(false));
  }, []);

  const allQuestions = sections.flatMap((s) => s.questions);

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Configuración de Registro de Examen</h2>

      {/* Examen vinculado */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Examen a vincular *
        </label>
        {loadingExams ? (
          <div className="text-sm text-gray-500 py-2">Cargando exámenes...</div>
        ) : availableExams.length === 0 ? (
          <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
            No hay exámenes disponibles. Crea un examen primero.
          </div>
        ) : (
          <select
            value={linkedExamId}
            onChange={(e) => onLinkedExamChange(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">-- Selecciona un examen --</option>
            {availableExams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Mapeo de campos */}
      {allQuestions.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Qué pregunta contiene el <strong>email</strong>? *
            </label>
            <select
              value={emailQuestionId}
              onChange={(e) => onEmailQuestionChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="">-- Selecciona --</option>
              {allQuestions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.text || '(sin texto)'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Qué pregunta contiene el <strong>nombre</strong>? *
            </label>
            <select
              value={nameQuestionId}
              onChange={(e) => onNameQuestionChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="">-- Selecciona --</option>
              {allQuestions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.text || '(sin texto)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Toggle exención */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onAllowExemptionChange(!allowExemption)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            allowExemption ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
              allowExemption ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-gray-700">Permitir solicitud de exención (sube archivo)</span>
      </div>

      {/* Condición de registro */}
      <RegistrationConditionEditor
        condition={registrationCondition}
        onChange={onRegistrationConditionChange}
        allQuestions={allQuestions}
      />
    </div>
  );
}
