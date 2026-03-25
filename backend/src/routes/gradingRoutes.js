import express from 'express';
import { PrismaClient } from '@prisma/client';
import { calculateAttemptScore } from '../utils/gradingUtils.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/grading/pending
 * Obtener intentos pendientes de calificación manual
 */
router.get('/pending', async (req, res) => {
  try {
    const { examId } = req.query;

    const where = {
      requiresManualGrading: true,
      isGraded: false,
    };

    if (examId) {
      where.aiExamId = examId;
    }

    const pendingAttempts = await prisma.aIExamAttempt.findMany({
      where,
      include: {
        student: true,
        aiExam: {
          select: {
            id: true,
            title: true,
          },
        },
        responses: {
          where: {
            requiresManualGrading: true,
            isGraded: false,
          },
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    res.json(pendingAttempts);
  } catch (error) {
    console.error('Error al obtener intentos pendientes:', error);
    res.status(500).json({
      error: error.message || 'Error al obtener intentos pendientes',
    });
  }
});

/**
 * GET /api/grading/attempt/:attemptId
 * Obtener detalles de un intento para calificar
 */
router.get('/attempt/:attemptId', async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await prisma.aIExamAttempt.findUnique({
      where: { id: attemptId },
      include: {
        student: true,
        aiExam: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        responses: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
            selectedOption: true,
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Intento no encontrado' });
    }

    res.json(attempt);
  } catch (error) {
    console.error('Error al obtener intento:', error);
    res.status(500).json({
      error: error.message || 'Error al obtener intento',
    });
  }
});

/**
 * POST /api/grading/response/:responseId
 * Calificar una respuesta manualmente
 */
router.post('/response/:responseId', async (req, res) => {
  try {
    const { responseId } = req.params;
    const { manualScore, feedback, gradedBy } = req.body;

    if (manualScore === undefined || manualScore === null) {
      return res.status(400).json({ error: 'Se requiere la puntuación manual' });
    }

    const response = await prisma.aIExamResponse.findUnique({
      where: { id: responseId },
      include: {
        question: true,
        attempt: true,
      },
    });

    if (!response) {
      return res.status(404).json({ error: 'Respuesta no encontrada' });
    }

    // Validar que la puntuación no exceda los puntos de la pregunta
    if (manualScore > response.question.points) {
      return res.status(400).json({
        error: `La puntuación no puede exceder ${response.question.points} puntos`,
      });
    }

    // Actualizar la respuesta
    const updatedResponse = await prisma.aIExamResponse.update({
      where: { id: responseId },
      data: {
        manualScore,
        feedback,
        isGraded: true,
        pointsEarned: manualScore,
        isCorrect: manualScore === response.question.points,
      },
    });

    // Verificar si todas las respuestas del intento ya fueron calificadas
    const allResponses = await prisma.aIExamResponse.findMany({
      where: { attemptId: response.attemptId },
    });

    const allGraded = allResponses.every(r => 
      !r.requiresManualGrading || r.isGraded
    );

    if (allGraded) {
      // Calcular puntuación final
      const scoreData = calculateAttemptScore(allResponses);

      // Actualizar el intento
      await prisma.aIExamAttempt.update({
        where: { id: response.attemptId },
        data: {
          isGraded: true,
          manualScore: scoreData.manualScore,
          score: scoreData.totalScore,
          totalCorrect: scoreData.totalCorrect,
          passed: scoreData.totalScore >= response.attempt.aiExam.passingScore,
          gradedBy,
          gradedAt: new Date(),
        },
      });
    }

    res.json({
      ...updatedResponse,
      attemptFullyGraded: allGraded,
    });
  } catch (error) {
    console.error('Error al calificar respuesta:', error);
    res.status(500).json({
      error: error.message || 'Error al calificar respuesta',
    });
  }
});

/**
 * POST /api/grading/attempt/:attemptId/complete
 * Marcar un intento como completamente calificado
 */
router.post('/attempt/:attemptId/complete', async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { gradedBy } = req.body;

    const attempt = await prisma.aIExamAttempt.findUnique({
      where: { id: attemptId },
      include: {
        responses: true,
        aiExam: true,
      },
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Intento no encontrado' });
    }

    // Verificar que todas las respuestas estén calificadas
    const allGraded = attempt.responses.every(r => 
      !r.requiresManualGrading || r.isGraded
    );

    if (!allGraded) {
      return res.status(400).json({
        error: 'No todas las respuestas han sido calificadas',
      });
    }

    // Calcular puntuación final
    const scoreData = calculateAttemptScore(attempt.responses);

    // Actualizar el intento
    const updatedAttempt = await prisma.aIExamAttempt.update({
      where: { id: attemptId },
      data: {
        isGraded: true,
        manualScore: scoreData.manualScore,
        score: scoreData.totalScore,
        totalCorrect: scoreData.totalCorrect,
        passed: scoreData.totalScore >= attempt.aiExam.passingScore,
        gradedBy,
        gradedAt: new Date(),
      },
      include: {
        responses: {
          include: {
            question: true,
          },
        },
      },
    });

    res.json(updatedAttempt);
  } catch (error) {
    console.error('Error al completar calificación:', error);
    res.status(500).json({
      error: error.message || 'Error al completar calificación',
    });
  }
});

/**
 * GET /api/grading/student/:studentId/grades
 * Obtener calificaciones de un estudiante
 */
router.get('/student/:studentId/grades', async (req, res) => {
  try {
    const { studentId } = req.params;

    const attempts = await prisma.aIExamAttempt.findMany({
      where: {
        studentId,
        completedAt: { not: null },
      },
      include: {
        aiExam: {
          select: {
            id: true,
            title: true,
            description: true,
            passingScore: true,
          },
        },
        responses: {
          include: {
            question: {
              select: {
                text: true,
                points: true,
              },
            },
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    res.json(attempts);
  } catch (error) {
    console.error('Error al obtener calificaciones:', error);
    res.status(500).json({
      error: error.message || 'Error al obtener calificaciones',
    });
  }
});

export default router;
