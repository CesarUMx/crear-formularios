/**
 * Utilidades para el sistema de calificación
 */

/**
 * Tipos de preguntas que requieren calificación manual
 */
const MANUAL_GRADING_TYPES = [
  'essay',
  'short_answer',
  'case_analysis',
  'problem_solving',
];

/**
 * Tipos de preguntas que se califican automáticamente
 */
const AUTO_GRADING_TYPES = [
  'multiple_choice',
  'true_false',
  'fill_blank', // ✅ Calificación automática con validación flexible
  'matching',
  'ordering',
  'image_question',
  'data_interpretation',
];

interface QuestionOption {
  id: number;
  isCorrect?: boolean;
}

interface Blank {
  correctAnswer: string;
}

interface Pair {
  left: string;
  right: string;
}

interface OrderingItem {
  text: string;
  correctOrder: number;
}

interface QuestionMetadata {
  questionType?: string;
  blanks?: Blank[];
  pairs?: Pair[];
  shuffledRightColumn?: string[] | null;
  items?: OrderingItem[];
  shuffledItems?: OrderingItem[] | null;
}

interface Question {
  points: number;
  options?: QuestionOption[];
  metadata?: QuestionMetadata;
}

interface UserAnswer {
  selectedOptionId?: number;
  userAnswer?: string;
  textAnswer?: string;
}

interface GradingResult {
  isCorrect: boolean | null;
  pointsEarned: number | null;
  requiresManualGrading?: boolean;
}

interface Response {
  requiresManualGrading?: boolean;
  pointsEarned?: number;
  isCorrect?: boolean;
  isGraded?: boolean;
  manualScore?: number;
}

interface AttemptScore {
  autoScore: number;
  manualScore: number;
  totalScore: number;
  totalCorrect: number;
  requiresManualGrading: boolean;
  isFullyGraded: boolean;
}

/**
 * Determina si una pregunta requiere calificación manual
 */
function requiresManualGrading(questionType: string): boolean {
  return MANUAL_GRADING_TYPES.includes(questionType);
}

/**
 * Determina si un examen requiere calificación manual
 * basándose en los tipos de preguntas que contiene
 */
function examRequiresManualGrading(questions: Question[]): boolean {
  return questions.some(q => {
    const questionType = q.metadata?.questionType || 'multiple_choice';
    return requiresManualGrading(questionType);
  });
}

/**
 * Valida respuesta de pregunta fill_blank
 * Comparación flexible que ignora mayúsculas/minúsculas y espacios extras
 */
function validateFillBlankAnswer(userAnswer: any, correctAnswer: any): boolean {
  if (!userAnswer || !correctAnswer) return false;
  
  // Convertir a string si es número
  const userStr = String(userAnswer);
  const correctStr = String(correctAnswer);
  
  const normalize = (str: string): string => str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .replace(/[.,;:!?]/g, '') // Remover puntuación
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remover acentos
  
  const normalizedUser = normalize(userStr);
  const normalizedCorrect = normalize(correctStr);
  
  console.log('🔍 Fill blank validation:', {
    userAnswer,
    correctAnswer,
    normalizedUser,
    normalizedCorrect,
    match: normalizedUser === normalizedCorrect
  });
  
  return normalizedUser === normalizedCorrect;
}

/**
 * Valida respuesta de pregunta matching
 * Verifica que todos los pares estén correctamente emparejados
 * userAnswers es un array de letras seleccionadas ['B', 'A', 'D', 'C']
 * correctPairs es un array de objetos [{ left: 'Item 1', right: 'Match A' }, ...]
 * shuffledRightColumn es un array con la columna derecha mezclada ['Match B', 'Match A', ...]
 * 
 * ✅ ACTUALIZADO: Ahora valida correctamente considerando que la columna derecha
 * está mezclada. El estudiante ve las letras basadas en shuffledRightColumn.
 */
function validateMatchingAnswer(
  userAnswers: string[],
  correctPairs: Pair[],
  shuffledRightColumn: string[] | null = null
): boolean {
  if (!userAnswers || !correctPairs) {
    console.log('❌ Matching validation failed: missing data', { userAnswers, correctPairs });
    return false;
  }
  if (!Array.isArray(userAnswers)) {
    console.log('❌ Matching validation failed: userAnswers not array', { userAnswers });
    return false;
  }
  if (userAnswers.length !== correctPairs.length) {
    console.log('❌ Matching validation failed: length mismatch', { 
      userLength: userAnswers.length, 
      correctLength: correctPairs.length 
    });
    return false;
  }
  
  // Si no hay columna mezclada, usar la columna original (orden de correctPairs)
  const rightColumn = shuffledRightColumn || correctPairs.map(p => p.right);
  
  console.log('🔍 Matching validation:', {
    userAnswers,
    correctPairs,
    shuffledRightColumn,
    rightColumn
  });
  
  // Para cada elemento de la columna izquierda (índice leftIndex)
  // verificar que el usuario seleccionó la letra que corresponde a su par correcto
  const results = userAnswers.map((selectedLetter, leftIndex) => {
    const correctPair = correctPairs[leftIndex];
    const correctLetterIndex = rightColumn.findIndex(r => r === correctPair.right);
    const expectedLetter = String.fromCharCode(65 + correctLetterIndex);
    const isCorrect = selectedLetter === expectedLetter;
    
    console.log(`  Item ${leftIndex}: selected=${selectedLetter}, expected=${expectedLetter}, correct=${isCorrect}`);
    
    return isCorrect;
  });
  
  return results.every(r => r);
}

/**
 * Valida respuesta de pregunta ordering
 * Verifica que el orden sea correcto
 * userOrder es un array de índices [2, 0, 1, 3] que representa el orden final
 * items es un array de objetos [{ text: '...', correctOrder: 1 }]
 * shuffledItems es un array con los items mezclados que vio el estudiante
 * 
 * ✅ ACTUALIZADO: Debe usar shuffledItems para validar correctamente.
 * userOrder[position] es el índice del item en shuffledItems que el usuario puso en esa posición.
 * shuffledItems[userOrder[position]] debe tener correctOrder === position
 */
function validateOrderingAnswer(
  userOrder: number[],
  items: OrderingItem[],
  shuffledItems: OrderingItem[] | null = null
): boolean {
  if (!userOrder || !items) return false;
  if (!Array.isArray(userOrder)) return false;
  if (userOrder.length !== items.length) return false;
  
  // Usar shuffledItems si está disponible, sino usar items
  const itemsToValidate = shuffledItems || items;
  
  console.log('🔍 Ordering validation:', {
    userOrder,
    itemsToValidate,
    shuffledItems
  });
  
  // Verificar que cada posición tenga el elemento con el correctOrder correspondiente
  // userOrder[position] es el índice del item en itemsToValidate que el usuario puso en esa posición
  // itemsToValidate[userOrder[position]] es el item en esa posición
  // Ese item debe tener correctOrder === position + 1 (correctOrder empieza en 1, no en 0)
  const results = userOrder.map((itemIndex, position) => {
    const item = itemsToValidate[itemIndex];
    const expectedOrder = position + 1; // correctOrder empieza en 1
    const isCorrect = item && item.correctOrder === expectedOrder;
    
    console.log(`  Posición ${position}: itemIndex=${itemIndex}, correctOrder=${item?.correctOrder}, esperado=${expectedOrder}, correcto=${isCorrect}`);
    
    return isCorrect;
  });
  
  return results.every(r => r);
}

/**
 * Califica automáticamente una respuesta según el tipo de pregunta
 */
function gradeAutomatically(question: Question, userAnswer: UserAnswer): GradingResult {
  const questionType = question.metadata?.questionType || 'multiple_choice';
  
  switch (questionType) {
    case 'multiple_choice':
    case 'true_false':
    case 'image_question':
    case 'data_interpretation':
      // Verificar si la opción seleccionada es correcta
      const selectedOption = question.options?.find(opt => opt.id === userAnswer.selectedOptionId);
      return {
        isCorrect: selectedOption?.isCorrect || false,
        pointsEarned: selectedOption?.isCorrect ? question.points : 0,
      };
    
    case 'fill_blank':
      // Validación flexible para completar espacios
      const blanks = question.metadata?.blanks || [];
      
      console.log('🔍 Fill_blank - userAnswer completo:', userAnswer);
      console.log('🔍 Fill_blank - userAnswer.userAnswer:', userAnswer.userAnswer);
      console.log('🔍 Fill_blank - userAnswer.textAnswer:', userAnswer.textAnswer);
      
      // Usar userAnswer.userAnswer (antes de guardar) o userAnswer.textAnswer (después de guardar)
      const blankString = userAnswer.userAnswer || userAnswer.textAnswer;
      console.log('🔍 Fill_blank - blankString:', blankString);
      
      const userAnswers = blankString ? JSON.parse(blankString) : {};
      console.log('🔍 Fill_blank - userAnswers parseado:', userAnswers);
      console.log('🔍 Fill_blank - blanks metadata:', blanks);
      
      const allCorrect = blanks.every((blank, index) => {
        const isCorrect = validateFillBlankAnswer(userAnswers[index], blank.correctAnswer);
        console.log(`  Blank ${index}: user="${userAnswers[index]}", correct="${blank.correctAnswer}", match=${isCorrect}`);
        return isCorrect;
      });
      
      console.log('🔍 Fill_blank - resultado final:', allCorrect);
      
      return {
        isCorrect: allCorrect,
        pointsEarned: allCorrect ? question.points : 0,
      };
    
    case 'matching':
      const correctPairs = question.metadata?.pairs || [];
      const shuffledRightColumn = question.metadata?.shuffledRightColumn || null;
      
      console.log('🔍 Matching - userAnswer completo:', userAnswer);
      console.log('🔍 Matching - userAnswer.userAnswer:', userAnswer.userAnswer);
      console.log('🔍 Matching - userAnswer.textAnswer:', userAnswer.textAnswer);
      
      // Usar userAnswer.userAnswer (antes de guardar) o userAnswer.textAnswer (después de guardar)
      const answerString = userAnswer.userAnswer || userAnswer.textAnswer;
      console.log('🔍 Matching - answerString:', answerString);
      
      const userPairs = answerString ? JSON.parse(answerString) : [];
      
      console.log('🔍 Matching - userPairs parseado:', userPairs);
      console.log('🔍 Matching - userPairs length:', userPairs.length);
      console.log('🔍 Matching - userPairs es array:', Array.isArray(userPairs));
      
      const matchingCorrect = validateMatchingAnswer(userPairs, correctPairs, shuffledRightColumn);
      return {
        isCorrect: matchingCorrect,
        pointsEarned: matchingCorrect ? question.points : 0,
      };
    
    case 'ordering':
      const items = question.metadata?.items || [];
      const shuffledItems = question.metadata?.shuffledItems || null;
      
      // Usar userAnswer.userAnswer (antes de guardar) o userAnswer.textAnswer (después de guardar)
      const orderString = userAnswer.userAnswer || userAnswer.textAnswer;
      const userOrder = orderString ? JSON.parse(orderString) : [];
      
      console.log('🔍 Ordering - userAnswer completo:', userAnswer);
      console.log('🔍 Ordering - orderString:', orderString);
      console.log('🔍 Ordering - userOrder parseado:', userOrder);
      const orderingCorrect = validateOrderingAnswer(userOrder, items, shuffledItems);
      return {
        isCorrect: orderingCorrect,
        pointsEarned: orderingCorrect ? question.points : 0,
      };
    
    default:
      // Preguntas que requieren calificación manual
      return {
        isCorrect: null,
        pointsEarned: null,
        requiresManualGrading: true,
      };
  }
}

/**
 * Calcula la puntuación total de un intento
 */
function calculateAttemptScore(responses: Response[]): AttemptScore {
  const autoResponses = responses.filter(r => !r.requiresManualGrading);
  const manualResponses = responses.filter(r => r.requiresManualGrading);
  
  const autoScore = autoResponses.reduce((sum, r) => sum + (r.pointsEarned || 0), 0);
  const manualScore = manualResponses
    .filter(r => r.isGraded)
    .reduce((sum, r) => sum + (r.manualScore || 0), 0);
  
  const totalCorrect = autoResponses.filter(r => r.isCorrect).length;
  
  return {
    autoScore,
    manualScore,
    totalScore: autoScore + manualScore,
    totalCorrect,
    requiresManualGrading: manualResponses.length > 0,
    isFullyGraded: manualResponses.every(r => r.isGraded),
  };
}

export {
  MANUAL_GRADING_TYPES,
  AUTO_GRADING_TYPES,
  requiresManualGrading,
  examRequiresManualGrading,
  validateFillBlankAnswer,
  validateMatchingAnswer,
  validateOrderingAnswer,
  gradeAutomatically,
  calculateAttemptScore,
};

// Export types
export type { Question, UserAnswer, GradingResult, Response, AttemptScore, QuestionMetadata };
