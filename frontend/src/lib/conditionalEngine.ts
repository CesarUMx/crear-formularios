/**
 * Motor de lógica condicional compartido (duplicado del backend)
 * Evalúa reglas de visibilidad y requerimiento de preguntas basadas en respuestas previas
 */

// Tipos de operadores soportados
export type ConditionalOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'is_empty'
  | 'is_not_empty';

// Tipos de acciones
export type ConditionalAction = 'SHOW' | 'HIDE' | 'REQUIRE';

// Tipos de combinadores
export type ConditionalCombinator = 'AND' | 'OR';

// Una regla individual
export interface ConditionalRule {
  questionId: string;
  operator: ConditionalOperator;
  value?: string | string[];
}

// La lógica completa de una pregunta
export interface ConditionalLogic {
  combinator: ConditionalCombinator;
  rules: ConditionalRule[];
  action: ConditionalAction;
}

// Respuestas actuales (mapeo questionId -> valor o array de valores)
export type CurrentAnswers = Record<string, string | string[]>;

/**
 * Evalúa una sola regla contra las respuestas actuales
 */
export function evaluateRule(rule: ConditionalRule, answers: CurrentAnswers): boolean {
  const answerValue = answers[rule.questionId];
  const ruleValue = rule.value;

  // Normalizar a array para comparación
  const answerArray = Array.isArray(answerValue) ? answerValue : answerValue ? [answerValue] : [];
  const ruleArray = Array.isArray(ruleValue) ? ruleValue : ruleValue ? [ruleValue] : [];

  switch (rule.operator) {
    case 'equals':
      // Para single value: exact match. Para multiple: al menos uno coincide
      if (ruleArray.length === 0) return answerArray.length === 0;
      return ruleArray.some(rv => answerArray.includes(rv));

    case 'not_equals':
      // Ninguno de los valores de la regla está en la respuesta
      if (ruleArray.length === 0) return answerArray.length > 0;
      return !ruleArray.some(rv => answerArray.includes(rv));

    case 'contains':
      // La respuesta contiene al menos uno de los valores de la regla
      if (ruleArray.length === 0) return true;
      return ruleArray.some(rv => answerArray.includes(rv));

    case 'is_empty':
      // No hay respuesta o está vacía
      return answerArray.length === 0;

    case 'is_not_empty':
      // Hay alguna respuesta
      return answerArray.length > 0;

    default:
      return false;
  }
}

/**
 * Evalúa toda la lógica condicional de una pregunta
 */
export function evaluateConditionalLogic(
  logic: ConditionalLogic,
  answers: CurrentAnswers
): { visible: boolean; required: boolean } {
  if (!logic || !logic.rules || logic.rules.length === 0) {
    return { visible: true, required: false };
  }

  // Evaluar todas las reglas
  const results = logic.rules.map(rule => evaluateRule(rule, answers));

  // Combinar según el combinador
  let combinedResult: boolean;
  if (logic.combinator === 'AND') {
    combinedResult = results.every(r => r);
  } else {
    combinedResult = results.some(r => r);
  }

  // Aplicar la acción
  let visible = true;
  let required = false;

  switch (logic.action) {
    case 'SHOW':
      visible = combinedResult;
      break;
    case 'HIDE':
      visible = !combinedResult;
      break;
    case 'REQUIRE':
      required = combinedResult;
      break;
  }

  return { visible, required };
}

/**
 * Condicion simple (sin action) - usada para registrationCondition
 */
export interface SimpleCondition {
  combinator: ConditionalCombinator;
  rules: ConditionalRule[];
}

/**
 * Evalua una condicion simple contra las respuestas.
 * Retorna true si la condicion se cumple, false si no.
 * Si condition es null/undefined, retorna true (sin condicion = siempre aplica).
 */
export function evaluateCondition(
  condition: SimpleCondition | null | undefined,
  answers: CurrentAnswers
): boolean {
  if (!condition || !condition.rules || condition.rules.length === 0) {
    return true;
  }

  const results = condition.rules.map(rule => evaluateRule(rule, answers));

  if (condition.combinator === 'AND') {
    return results.every(r => r);
  } else {
    return results.some(r => r);
  }
}

/**
 * Filtra preguntas visibles basado en respuestas actuales
 */
export function filterVisibleQuestions<T extends { id: string; conditionalLogic?: ConditionalLogic | null }>(
  questions: T[],
  answers: CurrentAnswers
): T[] {
  return questions.filter(q => {
    if (!q.conditionalLogic) return true;
    const { visible } = evaluateConditionalLogic(q.conditionalLogic, answers);
    return visible;
  });
}

/**
 * Valida que no hay respuestas para preguntas ocultas (anti-tampering)
 */
export function validateNoAnswersForHiddenQuestions<T extends { id: string; conditionalLogic?: ConditionalLogic | null }>(
  questions: T[],
  answers: CurrentAnswers
): { valid: boolean; hiddenQuestionWithAnswer?: string } {
  for (const question of questions) {
    if (!question.conditionalLogic) continue;

    const { visible } = evaluateConditionalLogic(question.conditionalLogic, answers);

    if (!visible && answers[question.id] !== undefined) {
      return { valid: false, hiddenQuestionWithAnswer: question.id };
    }
  }

  return { valid: true };
}

/**
 * Determina si una pregunta es requerida basándose en su lógica condicional
 */
export function isQuestionRequired<T extends { id: string; isRequired?: boolean; conditionalLogic?: ConditionalLogic | null }>(
  question: T,
  answers: CurrentAnswers
): boolean {
  const baseRequired = question.isRequired ?? false;

  if (!question.conditionalLogic) return baseRequired;

  const { required } = evaluateConditionalLogic(question.conditionalLogic, answers);

  // Si la acción es REQUIRE, el required es el resultado de la evaluación
  // Si la acción es SHOW/HIDE, el required es el baseRequired
  if (question.conditionalLogic.action === 'REQUIRE') {
    return required;
  }

  return baseRequired;
}

/**
 * Detecta dependencias circulares en preguntas condicionales
 * Una pregunta no puede depender de sí misma ni de preguntas posteriores
 */
export function detectCircularDependencies<T extends { id: string; order: number; conditionalLogic?: ConditionalLogic | null }>(
  questions: T[]
): { hasCycle: boolean; cycles: string[][] } {
  const cycles: string[][] = [];
  const questionMap = new Map(questions.map(q => [q.id, q]));

  // Verificar que ninguna pregunta dependa de sí misma o de preguntas posteriores
  for (const question of questions) {
    if (!question.conditionalLogic?.rules) continue;

    for (const rule of question.conditionalLogic.rules) {
      const depQuestion = questionMap.get(rule.questionId);

      if (!depQuestion) {
        cycles.push([question.id, rule.questionId, 'NOT_FOUND']);
        continue;
      }

      // No puede depender de sí misma
      if (rule.questionId === question.id) {
        cycles.push([question.id, 'SELF_REFERENCE']);
        continue;
      }

      // No puede depender de preguntas con orden mayor (posteriores)
      if (depQuestion.order > question.order) {
        cycles.push([question.id, rule.questionId, 'FUTURE_REFERENCE']);
      }
    }
  }

  return { hasCycle: cycles.length > 0, cycles };
}
