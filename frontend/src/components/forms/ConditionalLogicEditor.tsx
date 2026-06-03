import { useState, useMemo } from 'react';
import { Plus, Trash2, GitBranch } from 'lucide-react';
import type { ConditionalLogic, ConditionalRule, QuestionInput } from '../../lib/types';

interface ConditionalLogicEditorProps {
  logic: ConditionalLogic | undefined;
  onChange: (logic: ConditionalLogic | undefined) => void;
  allQuestions: QuestionInput[];
  currentQuestionIndex: number;
  currentSectionIndex: number;
}

const OPERATORS = [
  { value: 'equals', label: 'Es igual a' },
  { value: 'not_equals', label: 'No es igual a' },
  { value: 'contains', label: 'Contiene' },
  { value: 'is_empty', label: 'Está vacío' },
  { value: 'is_not_empty', label: 'No está vacío' },
] as const;

const ACTIONS = [
  { value: 'SHOW', label: 'Mostrar si...', description: 'La pregunta aparece solo si se cumplen las condiciones' },
  { value: 'HIDE', label: 'Ocultar si...', description: 'La pregunta se oculta si se cumplen las condiciones' },
  { value: 'REQUIRE', label: 'Requerir si...', description: 'La pregunta es obligatoria solo si se cumplen las condiciones' },
] as const;

const COMBINATORS = [
  { value: 'AND', label: 'Todas las reglas (AND)' },
  { value: 'OR', label: 'Cualquier regla (OR)' },
] as const;

export default function ConditionalLogicEditor({
  logic,
  onChange,
  allQuestions,
  currentQuestionIndex,
  currentSectionIndex,
}: ConditionalLogicEditorProps) {
  const [isExpanded, setIsExpanded] = useState(!!logic);

  const MEASURABLE_TYPES = ['RADIO', 'SELECT', 'CHECKBOX', 'BOOLEAN'];

  // Get available questions (previous questions only, measurable types only)
  const availableQuestions = useMemo(() => {
    return allQuestions
      .slice(0, currentQuestionIndex)
      .filter(q => MEASURABLE_TYPES.includes(q.type))
      .map((q, idx) => ({ ...q, displayIndex: idx + 1 }));
  }, [allQuestions, currentQuestionIndex]);

  const hasAvailableQuestions = availableQuestions.length > 0;

  const handleEnable = () => {
    if (!hasAvailableQuestions) return;
    setIsExpanded(true);
    onChange({
      combinator: 'AND',
      rules: [{ questionId: '', operator: 'equals', value: '' }],
      action: 'SHOW',
    });
  };

  const handleDisable = () => {
    setIsExpanded(false);
    onChange(undefined);
  };

  const updateRule = (index: number, field: keyof ConditionalRule, value: any) => {
    if (!logic) return;
    const newRules = [...logic.rules];
    newRules[index] = { ...newRules[index], [field]: value };
    // Clear value if operator doesn't need it
    if (field === 'operator' && ['is_empty', 'is_not_empty'].includes(value)) {
      delete newRules[index].value;
    }
    onChange({ ...logic, rules: newRules });
  };

  const addRule = () => {
    if (!logic) return;
    onChange({
      ...logic,
      rules: [...logic.rules, { questionId: '', operator: 'equals', value: '' }],
    });
  };

  const removeRule = (index: number) => {
    if (!logic || logic.rules.length <= 1) return;
    const newRules = logic.rules.filter((_, i) => i !== index);
    onChange({ ...logic, rules: newRules });
  };

  const getQuestionOptions = (questionId: string) => {
    const question = availableQuestions.find(q => q.id === questionId);
    if (!question?.options) return [];
    // BOOLEAN: yes/no fixed options
    if (question.type === 'BOOLEAN') return ['true', 'false'];
    return question.options.map(o => o.text);
  };

  if (!hasAvailableQuestions) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-2 text-gray-500">
          <GitBranch className="w-4 h-4" />
          <span className="text-sm">Lógica condicional disponible después de la primera pregunta</span>
        </div>
      </div>
    );
  }

  if (!isExpanded || !logic) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Lógica Condicional</span>
          </div>
          <button
            type="button"
            onClick={handleEnable}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Agregar lógica
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Lógica Condicional</span>
        </div>
        <button
          type="button"
          onClick={handleDisable}
          className="text-sm text-red-600 hover:text-red-700"
        >
          Eliminar
        </button>
      </div>

      {/* Action selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Acción
        </label>
        <select
          value={logic.action}
          onChange={(e) => onChange({ ...logic, action: e.target.value as ConditionalLogic['action'] })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {ACTIONS.map((action) => (
            <option key={action.value} value={action.value}>
              {action.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {ACTIONS.find(a => a.value === logic.action)?.description}
        </p>
      </div>

      {/* Combinator */}
      {logic.rules.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Combinación de reglas
          </label>
          <select
            value={logic.combinator}
            onChange={(e) => onChange({ ...logic, combinator: e.target.value as 'AND' | 'OR' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {COMBINATORS.map((comb) => (
              <option key={comb.value} value={comb.value}>
                {comb.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Rules */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Reglas
        </label>
        {logic.rules.map((rule, index) => (
          <div key={index} className="bg-white rounded-lg p-3 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Regla {index + 1}</span>
              {logic.rules.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Question selector */}
              <select
                value={rule.questionId}
                onChange={(e) => updateRule(index, 'questionId', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              >
                <option value="">Selecciona pregunta...</option>
                {availableQuestions.map((q, idx) => (
                  <option key={q.id ?? idx} value={q.id}>
                    {idx + 1}. {(q.text?.length ?? 0) > 60 ? q.text.slice(0, 60) + '…' : (q.text || `Pregunta ${idx + 1}`)}
                  </option>
                ))}
              </select>

              {/* Operator selector */}
              <select
                value={rule.operator}
                onChange={(e) => updateRule(index, 'operator', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>

              {/* Value input (hidden for is_empty/is_not_empty) */}
              {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                <>
                  {getQuestionOptions(rule.questionId).length > 0 ? (
                    <select
                      value={typeof rule.value === 'string' ? rule.value : ''}
                      onChange={(e) => updateRule(index, 'value', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">Selecciona valor...</option>
                      {getQuestionOptions(rule.questionId).map((opt, i) => (
                        <option key={i} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={typeof rule.value === 'string' ? rule.value : ''}
                      onChange={(e) => updateRule(index, 'value', e.target.value)}
                      placeholder="Valor a comparar..."
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addRule}
          className="w-full py-2 border border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-100 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4 inline mr-1" />
          Agregar regla
        </button>
      </div>
    </div>
  );
}
