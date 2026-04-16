import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Crear un reporte de pregunta
router.post('/', async (req, res) => {
  try {
    const {
      examId,
      attemptId,
      questionId,
      questionText,
      userAnswer,
      correctAnswer,
      reason,
    } = req.body;

    // Validar campos requeridos
    if (!examId || !attemptId || !questionId || !questionText || !userAnswer || !correctAnswer || !reason) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos' 
      });
    }

    // Verificar que el examen y el intento existan
    const attempt = await prisma.aIExamAttempt.findUnique({
      where: { id: attemptId },
      include: { aiExam: true }
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Intento de examen no encontrado' });
    }

    if (attempt.aiExamId !== examId) {
      return res.status(400).json({ error: 'El intento no pertenece a este examen' });
    }

    // Crear el reporte
    const report = await prisma.questionReport.create({
      data: {
        examId,
        attemptId,
        questionId,
        questionText,
        userAnswer,
        correctAnswer,
        reason: reason.trim(),
        status: 'PENDING',
      },
    });

    return res.status(201).json(report);
  } catch (error) {
    console.error('Error al crear reporte:', error);
    return res.status(500).json({ 
      error: 'Error al crear el reporte',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Obtener reportes de un examen (para el instructor)
router.get('/exam/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    const { status } = req.query;

    const where: any = { examId };
    if (status) {
      where.status = status;
    }

    const reports = await prisma.questionReport.findMany({
      where,
      include: {
        attempt: {
          select: {
            studentName: true,
            studentEmail: true,
            attemptNumber: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json(reports);
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    return res.status(500).json({ error: 'Error al obtener reportes' });
  }
});

// Actualizar estado de un reporte (para el instructor)
router.patch('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, reviewNotes, reviewedBy } = req.body;

    const report = await prisma.questionReport.update({
      where: { id: reportId },
      data: {
        status,
        reviewNotes,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });

    return res.json(report);
  } catch (error) {
    console.error('Error al actualizar reporte:', error);
    return res.status(500).json({ error: 'Error al actualizar reporte' });
  }
});

// Eliminar un reporte
router.delete('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    await prisma.questionReport.delete({
      where: { id: reportId },
    });

    return res.json({ message: 'Reporte eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar reporte:', error);
    return res.status(500).json({ error: 'Error al eliminar reporte' });
  }
});

export default router;
