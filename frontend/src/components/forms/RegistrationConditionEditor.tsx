import { useState } from 'react';
import { Plus, Trash2, Filter } from 'lucide-react';
import type { SimpleCondition, ConditionalRule, QuestionInput } from '../../lib/types';

interface RegistrationConditionEditorProps {
  condition: SimpleCondition | undefined;
  onChange: (condition: SimpleCondition | undefined) => void;
  allQuestions: QuestionInput[];
}

const OPERATORS = [
  { value: 'equals', label: 'Es igual a' },
  { value: 'not_equals', label: 'No es igual a' },
  { value: 'contains', label: 'Contiene' },
  { value: 'is_empty', label: 'Esta vacio' },
  { value: 'is_not_empty', label: 'No esta vacio' },
] as const;

const COMBINATORS = [
  { value: 'AND', label: 'Todas las reglas (AND)' },
  { value: 'OR', label: 'Cualquier regla (OR)' },
] as const;

export default function RegistrationConditionEditor({
  condition,
  onChange,
  allQuestions,
}: RegistrationConditionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(!!condition);

  const handleEnable = () => {
    setIsExpanded(true);
    onChange({
      combinator: 'AND',
      rules: [{ questionId: '', operator: 'equals', value: '' }],
    });
  };

  const handleDisable = () => {
    setIsExpanded(false);
    onChange(undefined);
  };

  const updateRule = (index: number, field: keyof ConditionalRule, value: any) => {
    if (!condition) return;
    const newRules = [...condition.rules];
    newRules[index] = { ...newRules[index], [field]: value };
    if (field === 'operator' && ['is_empty', 'is_not_empty'].includes(value)) {
      delete newRules[index].value;
    }
    onChange({ ...condition, rules: newRules });
  };

  const addRule = () => {
    if (!condition) return;
    onChange({
      ...condition,
      rules: [...condition.rules, { questionId: '', operator: 'equals', value: '' }],
    });
  };

  const removeRule = (index: number) => {
    if (!condition || condition.rules.length <= 1) return;
    const newRules = condition.rules.filter((_, i) => i !== index);
    onChange({ ...condition, rules: newRules });
  };

  const getQuestionOptions = (questionId: string) => {
    const question = allQuestions.find(q => q.id === questionId);
    if (!question?.options) return [];
    return question.options.map(o => o.text);
  };

  if (!isExpanded || !condition) {
    return (
      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-600" />
            <div>
              <span className="text-sm font-medium text-amber-900">Condicion de registro</span>
              <p className="text-xs text-amber-700">Sin condicion: todos los que respondan se registran</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEnable}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            + Agregar condicion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-600" />
          <div>
            <span className="text-sm font-medium text-amber-900">Condicion de registro</span>
            <p className="text-xs text-amber-700">Solo se registra si se cumplen estas condiciones</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDisable}
          className="text-sm text-red-600 hover:text-red-700"
        >
          Eliminar
        </button>
      </div>

      {/* Combinator */}
      {condition.rules.length > 1 && (
        <div>
          <select
            value={condition.combinator}
            onChange={(e) => onChange({ ...condition, combinator: e.target.value as 'AND' | 'OR' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
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
        {condition.rules.map((rule, index) => {
          const selectedQuestion = allQuestions.find(q => q.id === rule.questionId);
          const options = getQuestionOptions(rule.questionId);
          const needsValue = !['is_empty', 'is_not_empty'].includes(rule.operator);

          return (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-3 gap-2">
                {/* Question selector */}
                <select
                  value={rule.questionId}
                  onChange={(e) => updateRule(index, 'questionId', e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Seleccionar pregunta...</option>
                  {allQuestions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.text || '(sin texto)'}
                    </option>
                  ))}
                </select>

                {/* Operator */}
                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(index, 'operator', e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>

                {/* Value */}
                {needsValue && (
                  options.length > 0 ? (
                    <select
                      value={typeof rule.value === 'string' ? rule.value : ''}
                      onChange={(e) => updateRule(index, 'value', e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Seleccionar valor...</option>
                      {options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={typeof rule.value === 'string' ? rule.value : ''}
                      onChange={(e) => updateRule(index, 'value', e.target.value)}
                      placeholder="Valor..."
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    />
                  )
                )}
              </div>

              {/* Remove rule */}
              {condition.rules.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  className="p-1.5 text-red-500 hover:bg-red-100 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add rule */}
      <button
        type="button"
        onClick={addRule}
        className="flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800 font-medium"
      >
        <Plus className="w-3.5 h-3.5" />
        Agregar regla
      </button>
    </div>
  );
}
