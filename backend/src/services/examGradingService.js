import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calificar un intento de examen automáticamente
 */
export const gradeExamAttempt = async (attemptId) => {
  // Primero obtener el attempt básico
  const attemptBasic = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { examVersionId: true }
  });

  if (!attemptBasic) {
    throw new Error('Intento no encontrado');
  }

  // Ahora obtener el attempt completo con todas las relaciones
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          versions: {
            where: { id: attemptBasic.examVersionId },
            include: {
              sections: {
                include: {
                  questions: {
                    include: {
                      options: true
                    }
                  }
                }
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

  if (!attempt.exam.autoGrade) {
    throw new Error('Este examen requiere calificación manual');
  }

  let totalScore = 0;
  const maxScore = attempt.maxScore;

  for (const answer of attempt.answers) {
    const question = answer.question;
    const result = gradeQuestion(question, answer);
    
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

  const passed = totalScore >= attempt.exam.passingScore;

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      score: totalScore,
      passed,
      autoGraded: true
    }
  });

  return {
    score: totalScore,
    maxScore,
    passed,
    percentage: (totalScore / maxScore) * 100
  };
};

/**
 * Calificar una pregunta individual
 */
function gradeQuestion(question, answer) {
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
    
    default:
      return {
        isCorrect: null,
        pointsEarned: 0,
        feedback: 'Tipo de pregunta no soportado para calificación automática'
      };
  }
}

/**
 * Calificar pregunta de opción única (RADIO)
 */
function gradeRadioQuestion(question, answer) {
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
function gradeCheckboxQuestion(question, answer) {
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
function gradeTrueFalseQuestion(question, answer) {
  return gradeRadioQuestion(question, answer);
}

/**
 * Calificar pregunta de texto corto
 */
function gradeTextQuestion(question, answer) {
  if (!question.correctAnswer) {
    return {
      isCorrect: null,
      pointsEarned: 0,
      feedback: 'Esta pregunta requiere calificación manual'
    };
  }

  const studentAnswer = (answer.textValue || '').toLowerCase().trim();
  const correctAnswers = Array.isArray(question.correctAnswer.keywords) 
    ? question.correctAnswer.keywords.map(k => k.toLowerCase().trim())
    : [];

  if (correctAnswers.length === 0) {
    return {
      isCorrect: null,
      pointsEarned: 0,
      feedback: 'Esta pregunta requiere calificación manual'
    };
  }

  const isCorrect = correctAnswers.some(keyword => {
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
function gradeMatchingQuestion(question, answer) {
  if (!question.correctAnswer || !answer.jsonValue) {
    return {
      isCorrect: false,
      pointsEarned: 0,
      feedback: 'Respuesta incompleta'
    };
  }

  const correctMatches = question.correctAnswer.matches || {};
  const studentMatches = answer.jsonValue.matches || {};

  let correctCount = 0;
  let totalPairs = Object.keys(correctMatches).length;

  for (const [key, value] of Object.entries(correctMatches)) {
    if (studentMatches[key] === value) {
      correctCount++;
    }
  }

  const isCorrect = correctCount === totalPairs;
  const pointsEarned = (correctCount / totalPairs) * question.points;

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
function gradeOrderingQuestion(question, answer) {
  if (!question.correctAnswer || !answer.jsonValue) {
    return {
      isCorrect: false,
      pointsEarned: 0,
      feedback: 'Respuesta incompleta'
    };
  }

  const correctOrder = question.correctAnswer.order || [];
  const studentOrder = answer.jsonValue.order || [];

  if (correctOrder.length !== studentOrder.length) {
    return {
      isCorrect: false,
      pointsEarned: 0,
      feedback: 'Orden incompleto'
    };
  }

  let correctPositions = 0;
  for (let i = 0; i < correctOrder.length; i++) {
    if (correctOrder[i] === studentOrder[i]) {
      correctPositions++;
    }
  }

  const isCorrect = correctPositions === correctOrder.length;
  const pointsEarned = (correctPositions / correctOrder.length) * question.points;

  return {
    isCorrect,
    pointsEarned,
    feedback: isCorrect
      ? (question.feedback || 'Orden correcto')
      : `${correctPositions} de ${correctOrder.length} elementos en posición correcta`
  };
}

/**
 * Calificar manualmente una pregunta
 */
export const gradeQuestionManually = async (answerId, pointsEarned, feedback) => {
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
async function recalculateAttemptScore(attemptId) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true,
      answers: true
    }
  });

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
export const getExamStats = async (examId) => {
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

  const questionStats = {};
  
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
