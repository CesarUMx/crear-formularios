/**
 * Motor de reglas para templates de email.
 * Reutiliza el conditionalEngine para evaluar si un EmailTemplate debe enviarse
 * según las respuestas del formulario.
 */

import { evaluateRule, type CurrentAnswers } from '../utils/conditionalEngine.js';

export interface EmailConditions {
  combinator: 'AND' | 'OR';
  rules: Array<{
    questionId: string;
    operator: string;
    value?: string | string[];
  }>;
}

/**
 * Evalúa si un conjunto de condiciones se cumple para las respuestas dadas.
 * Si conditions es null/undefined → siempre enviar (retorna true).
 */
export function evaluateEmailConditions(
  conditions: EmailConditions | null | undefined,
  answers: CurrentAnswers
): boolean {
  if (!conditions || !conditions.rules || conditions.rules.length === 0) {
    return true;
  }

  const results = conditions.rules.map(rule =>
    evaluateRule(rule as any, answers)
  );

  if (conditions.combinator === 'AND') {
    return results.every(r => r);
  }
  return results.some(r => r);
}
