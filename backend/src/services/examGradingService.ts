import { PrismaClient, ExamQuestionType } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== TIPOS ====================

interface GradingResult {
  isCorrect: boolean | null;
  pointsEarned: number;
  feedback: string;
}

interface ExamQuestion {
  id: string;
  type: ExamQuestionType;
  text: string;
  points: number;
  correctAnswer?: any;
  feedback?: string | null;
  options: ExamOption[];
}

interface ExamOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface ExamAnswer {
  id: string;
  questionId: string;
  attemptId: string;
  textValue?: string | null;
  jsonValue?: any;
  selectedOptions: { id: string; text: string }[];
  question: ExamQuestion;
}

interface GradeExamResult {
  score: number;
  maxScore: number;
  passed: boolean;
  percentage: number;
}

interface QuestionStats {
  questionId: string;
  questionText: string;
  totalAnswers: number;
  correctAnswers: number;
  averagePoints: number;
  totalPoints: number;
  correctRate?: number;
}

interface ExamStats {
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  highestScore?: number;
  lowestScore?: number;
  questionStats: QuestionStats[];
}

// ==================== FUNCIONES ====================

/**
 * Calificar un intento de examen automáticamente
 */
export const gradeExamAttempt = async (attemptId: string): Promise<GradeExamResult> => {
  // Obtener el attempt completo con todas las relaciones
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          sections: {
            include: {
              questions: {
                include: { options: true }
              }
            }
          }
        }
      },
      answers: {
        include: {
          selectedOptions: true,
          question: {
            include: {
              options: true
            }
          }
        }
      }
    }
  });

  if (!attempt) {
    throw new Error('Intento no encontrado');
  }

  const exam = attempt.exam as typeof attempt.exam & { autoGrade: boolean; passingScore: number };

  let totalScore = 0;
  let hasPendingManual = false;
  const maxScore = attempt.maxScore;

  console.log('=== GRADING DEBUG ===');
  console.log('Attempt ID:', attemptId);
  console.log('Total answers:', attempt.answers.length);
  console.log('Max score:', maxScore);

  for (const answer of attempt.answers) {
    const question = answer.question;
    console.log('\n--- Question:', question.id, '---');
    console.log('Type:', question.type);
    console.log('Points:', question.points);
    console.log('Student answer:', {
      textValue: answer.textValue,
      selectedOptions: answer.selectedOptions.map(o => ({ id: o.id, text: o.text })),
      jsonValue: answer.jsonValue
    });
    
    const result = gradeQuestion(question, answer as ExamAnswer);
    
    console.log('Result:', result);
    
    // Si isCorrect es null, la pregunta queda pendiente de revisión manual
    if (result.isCorrect === null) {
      hasPendingManual = true;
    }
    
    await prisma.examAnswer.update({
      where: { id: answer.id },
      data: {
        isCorrect: result.isCorrect,
        pointsEarned: result.pointsEarned,
        feedback: result.feedback
      }
    });

    totalScore += result.pointsEarned;
  }

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const passed = percentage >= exam.passingScore;

  console.log('\n=== FINAL GRADING ===');
  console.log('Total score:', totalScore);
  console.log('Max score:', maxScore);
  console.log('Percentage:', percentage);
  console.log('Passing score (%):', exam.passingScore);
  console.log('Passed:', passed);
  console.log('Has pending manual:', hasPendingManual);

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      score: totalScore,
      autoScore: totalScore,
      passed: hasPendingManual ? null : passed, // Si hay pendientes, no se puede determinar aún
      autoGraded: true,
      requiresManualGrading: hasPendingManual,
      isGraded: !hasPendingManual
    }
  });

  return {
    score: totalScore,
    maxScore,
    passed,
    percentage
  };
};

/**
 * Calificar una pregunta individual
 */
function gradeQuestion(question: ExamQuestion, answer: ExamAnswer): GradingResult {
  switch (question.type) {
    case 'RADIO':
      return gradeRadioQuestion(question, answer);
    
    case 'CHECKBOX':
      return gradeCheckboxQuestion(question, answer);
    
    case 'TRUE_FALSE':
      return gradeTrueFalseQuestion(question, answer);
    
    case 'TEXT':
      return gradeTextQuestion(question, answer);
    
    case 'MATCHING':
      return gradeMatchingQuestion(question, answer);
    
    case 'ORDERING':
      return gradeOrderingQuestion(question, answer);
    
    case 'FILL_BLANK':
      return gradeFillBlankQuestion(question, answer);
    
    case 'TEXTAREA':
      // Respuesta larga: siempre requiere calificación manual
      return {
        isCorrect: null,
        pointsEarned: 0,
        feedback: 'Pendiente de calificación manual'
      };
    
    default:
      return {
        isCorrect: null,
        pointsEarned: 0,
        feedback: 'Tipo de pregunta no soportado para calificación automática'
      };
  }
}

/**
 * Calificar pregunta de completar espacios (FILL_BLANK)
 */
function gradeFillBlankQuestion(question: ExamQuestion, answer: ExamAnswer): GradingResult {
  const metadata = (question as any).metadata;
  const blanks: { position?: number; correctAnswer: string }[] = metadata?.blanks || [];

  console.log('📝 Grading FILL_BLANK');
  console.log('Blanks:', blanks);
  console.log('Student jsonValue:', answer.jsonValue);

  if (blanks.length === 0 || !answer.jsonValue) {
    return {
      isCorrect: false,
      pointsEarned: 0,
      feedback: 'Respuesta incompleta'
    };
  }

  // answer.jsonValue es un objeto { 0: "valor0", 1: "valor1", ... }
  const studentAnswers = answer.jsonValue as Record<string, string>;

  let correctCount = 0;
  const totalBlanks = blanks.length;

  for (let i = 0; i < totalBlanks; i++) {
    const correctText = (blanks[i].correctAnswer || '').trim().toLowerCase();
    const studentText = (studentAnswers[i] || studentAnswers[String(i)] || '').trim().toLowerCase();
    if (correctText && correctText === studentText) {
      correctCount++;
    }
  }

  const isCorrect = correctCount === totalBlanks;
  const pointsEarned = totalBlanks > 0 ? (correctCount / totalBlanks) * question.points : 0;

  return {
    isCorrect,
    pointsEarned,
    feedback: isCorrect
      ? (question.feedback || 'Todos los espacios correctos')
      : `${correctCount} de ${totalBlanks} espacios correctos`
  };
}

/**
 * Calificar pregunta de opción única (RADIO)
 */
function gradeRadioQuestion(question: ExamQuestion, answer: ExamAnswer): GradingResult {
  const selectedOption = answer.selectedOptions[0];
  
  if (!selectedOption) {
    return {
      isCorrect: false,
      pointsEarned: 0,
      feedback: 'No se seleccionó ninguna opción'
    };
  }

  const correctOption = question.options.find(opt => opt.isCorrect);
  const isCorrect = selectedOption.id === correctOption?.id;

  return {
    isCorrect,
    pointsEarned: isCorrect ? question.points : 0,
    feedback: isCorrect 
      ? (question.feedback || 'Respuesta correcta') 
      : (question.feedback || `La respuesta correcta es: ${correctOption?.text}`)
  };
}

/**
 * Calificar pregunta de opción múltiple (CHECKBOX)
 */
function gradeCheckboxQuestion(question: ExamQuestion, answer: ExamAnswer): GradingResult {
  const selectedOptionIds = answer.selectedOptions.map(opt => opt.id);
  const correctOptionIds = question.options
    .filter(opt => opt.isCorrect)
    .map(opt => opt.id);

  if (selectedOptionIds.length === 0) {
    return {
      isCorrect: false,
      pointsEarned: 0,
      feedback: 'No se seleccionó ninguna opción'
    };
  }

  const correctSelections = selectedOptionIds.filter(id => correctOptionIds.includes(id)).length;
  const incorrectSelections = selectedOptionIds.filter(id => !correctOptionIds.includes(id)).length;
  const missedCorrect = correctOptionIds.filter(id => !selectedOptionIds.includes(id)).length;

  const allCorrect = correctSelections === correctOptionIds.length && incorrectSelections === 0;

  let pointsEarned = 0;
  if (allCorrect) {
    pointsEarned = question.points;
  } else {
    const partialCredit = (correctSelections - incorrectSelections) / correctOptionIds.length;
    pointsEarned = Math.max(0, partialCredit * question.points);
  }

  return {
    isCorrect: allCorrect,
    pointsEarned,
    feedback: allCorrect
      ? (question.feedback || 'Respuesta correcta')
      : `Calificación parcial: ${correctSelections} correctas, ${incorrectSelections} incorrectas, ${missedCorrect} no seleccionadas`
  };
}

/**
 * Calificar pregunta de Verdadero/Falso
 */
function gradeTrueFalseQuestion(question: ExamQuestion, answer: ExamAnswer): GradingResult {
  return gradeRadioQuestion(question, answer);
}

/**
 * Calificar pregunta de texto corto
 */
function gradeTextQuestion(question: ExamQuestion, answer: ExamAnswer): GradingResult {
  if (!question.correctAnswer) {
    return {
      isCorrect: null,
      pointsEarned: 0,
      feedback: 'Esta pregunta requiere calificación manual'
    };
  }

  const studentAnswer = (answer.textValue || '').toLowerCase().trim();
  const correctAnswers = Array.isArray(question.correctAnswer.keywords) 
    ? question.correctAnswer.keywords.map((k: string) => k.toLowerCase().trim())
    : [];

  if (correctAnswers.length === 0) {
    return {
      isCorrect: null,
      pointsEarned: 0,
      feedback: 'Esta pregunta requiere calificación manual'
    };
  }

  const isCorrect = correctAnswers.some((keyword: string) => {
    if (question.correctAnswer.exactMatch) {
      return studentAnswer === keyword;
    } else {
      return studentAnswer.includes(keyword);
    }
  });

  return {
    isCorrect,
    pointsEarned: isCorrect ? question.points : 0,
    feedback: isCorrect
      ? (question.feedback || 'Respuesta correcta')
      : (question.feedback || 'Respuesta incorrecta')
  };
}

/**
 * Calificar pregunta de relacionar columnas (MATCHING)
 */
function gradeMatchingQuestion(question: ExamQuestion, answer: ExamAnswer): GradingResult {
  const metadata = (question as any).metadata;
  const pairs: { left: string; right: string }[] = metadata?.pairs || [];
  const studentAnswer = answer.jsonValue;

  console.log('🔗 Grading MATCHING');
  console.log('Pairs:', pairs);
  console.log('Student answer:', studentAnswer);

  if (pairs.length === 0 || !studentAnswer) {
    return {
      isCorrect: false,
      pointsEarned: 0,
      feedback: 'Respuesta incompleta'
    };
  }

  // studentAnswer es un array donde cada posición i tiene el texto de la "derecha" seleccionada
  // pairs[i].right es la respuesta correcta para pairs[i].left
  const studentArray: string[] = Array.isArray(studentAnswer) ? studentAnswer : [];

  let correctCount = 0;
  const totalPairs = pairs.length;

  for (let i = 0; i < totalPairs; i++) {
    const correctRight = (pairs[i].right || '').trim().toLowerCase();
    const studentRight = (studentArray[i] || '').trim().toLowerCase();
    if (correctRight && correctRight === studentRight) {
      correctCount++;
    }
  }

  const isCorrect = correctCount === totalPairs;
  const pointsEarned = totalPairs > 0 ? (correctCount / totalPairs) * question.points : 0;

  return {
    isCorrect,
    pointsEarned,
    feedback: isCorrect
      ? (question.feedback || 'Todas las relaciones son correctas')
      : `${correctCount} de ${totalPairs} relaciones correctas`
  };
}

/**
 * Calificar pregunta de ordenamiento (ORDERING)
 */
function gradeOrderingQuestion(question: ExamQuestion, answer: ExamAnswer): GradingResult {
  console.log('🔢 Grading ORDERING question');
  console.log('Student jsonValue:', answer.jsonValue);

  const metadata = (question as any).metadata;
  const items: { text: string; correctOrder: number }[] = metadata?.items || [];

  if (items.length === 0 || !answer.jsonValue) {
    return {
      isCorrect: false,
      pointsEarned: 0,
      feedback: 'Respuesta incompleta'
    };
  }

  // Orden correcto: items ordenados por correctOrder → array de textos
  const correctTexts = [...items]
    .sort((a, b) => a.correctOrder - b.correctOrder)
    .map(i => (i.text || '').trim().toLowerCase());

  // Respuesta del estudiante: array de textos en el orden que él los puso
  const studentArray: string[] = Array.isArray(answer.jsonValue) ? answer.jsonValue : [];
  const studentTexts = studentArray.map(t => (t || '').trim().toLowerCase());

  console.log('Correct texts:', correctTexts);
  console.log('Student texts:', studentTexts);

  if (correctTexts.length !== studentTexts.length) {
    return {
      isCorrect: false,
      pointsEarned: 0,
      feedback: 'Orden incompleto'
    };
  }

  let correctPositions = 0;
  for (let i = 0; i < correctTexts.length; i++) {
    if (correctTexts[i] === studentTexts[i]) {
      correctPositions++;
    }
  }

  const isCorrect = correctPositions === correctTexts.length;
  const pointsEarned = correctTexts.length > 0 ? (correctPositions / correctTexts.length) * question.points : 0;

  return {
    isCorrect,
    pointsEarned,
    feedback: isCorrect
      ? (question.feedback || 'Orden correcto')
      : `${correctPositions} de ${correctTexts.length} elementos en posición correcta`
  };
}

/**
 * Calificar manualmente una pregunta
 */
export const gradeQuestionManually = async (
  answerId: string, 
  pointsEarned: number, 
  feedback: string
) => {
  const answer = await prisma.examAnswer.findUnique({
    where: { id: answerId },
    include: {
      question: true
    }
  });

  if (!answer) {
    throw new Error('Respuesta no encontrada');
  }

  if (pointsEarned > answer.question.points) {
    throw new Error('Los puntos otorgados no pueden exceder los puntos de la pregunta');
  }

  const isCorrect = pointsEarned === answer.question.points;

  await prisma.examAnswer.update({
    where: { id: answerId },
    data: {
      isCorrect,
      pointsEarned,
      feedback
    }
  });

  await recalculateAttemptScore(answer.attemptId);

  return { isCorrect, pointsEarned, feedback };
};

/**
 * Recalcular la puntuación total de un intento
 */
async function recalculateAttemptScore(attemptId: string) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true,
      answers: true
    }
  });

  if (!attempt) {
    throw new Error('Intento no encontrado');
  }

  const totalScore = attempt.answers.reduce((sum, answer) => {
    return sum + (answer.pointsEarned || 0);
  }, 0);

  const passed = totalScore >= attempt.exam.passingScore;

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      score: totalScore,
      passed
    }
  });

  return { totalScore, passed };
}

/**
 * Obtener estadísticas de un examen
 */
export const getExamStats = async (examId: string): Promise<ExamStats> => {
  const attempts = await prisma.examAttempt.findMany({
    where: { 
      examId,
      completedAt: { not: null }
    },
    include: {
      answers: {
        include: {
          question: true
        }
      }
    }
  });

  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      passRate: 0,
      questionStats: []
    };
  }

  const scores = attempts.map(a => a.score || 0);
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const passedCount = attempts.filter(a => a.passed).length;
  const passRate = (passedCount / attempts.length) * 100;

  const questionStats: Record<string, QuestionStats> = {};
  
  attempts.forEach(attempt => {
    attempt.answers.forEach(answer => {
      if (!questionStats[answer.questionId]) {
        questionStats[answer.questionId] = {
          questionId: answer.questionId,
          questionText: answer.question.text,
          totalAnswers: 0,
          correctAnswers: 0,
          averagePoints: 0,
          totalPoints: 0
        };
      }

      questionStats[answer.questionId].totalAnswers++;
      if (answer.isCorrect) {
        questionStats[answer.questionId].correctAnswers++;
      }
      questionStats[answer.questionId].totalPoints += answer.pointsEarned || 0;
    });
  });

  Object.values(questionStats).forEach(stat => {
    stat.averagePoints = stat.totalPoints / stat.totalAnswers;
    stat.correctRate = (stat.correctAnswers / stat.totalAnswers) * 100;
  });

  return {
    totalAttempts: attempts.length,
    averageScore,
    passRate,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    questionStats: Object.values(questionStats)
  };
};
