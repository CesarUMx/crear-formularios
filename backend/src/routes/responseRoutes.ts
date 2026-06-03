
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { generateResponseFolio } from '../utils/folioGenerator.js';
import { validateNoAnswersForHiddenQuestions, isQuestionRequired } from '../utils/conditionalEngine.js';

const router: import("express").Router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/responses
 * Guardar respuesta de formulario público
 */
router.post('/', async (req, res) => {
  try {
    const { formId, versionId, answers } = req.body;

    // Validaciones básicas
    if (!formId || !versionId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Verificar que el formulario existe y está activo
    const form = await prisma.form.findUnique({
      where: { id: formId, isActive: true }
    });

    if (!form) {
      return res.status(404).json({ error: 'Formulario no encontrado o inactivo' });
    }

    // Verificar que la versión existe
    const version = await prisma.formVersion.findUnique({
      where: { id: versionId },
      include: {
        sections: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!version) {
      return res.status(404).json({ error: 'Versión del formulario no encontrada' });
    }

    // Preparar respuestas actuales para validación condicional
    const currentAnswers: Record<string, string | string[]> = {};
    answers.forEach((answer: any) => {
      if (answer.textAnswer) {
        currentAnswers[answer.questionId] = answer.textAnswer;
      } else if (answer.selectedOptions && answer.selectedOptions.length > 0) {
        currentAnswers[answer.questionId] = answer.selectedOptions;
      } else if (answer.fileUrl) {
        currentAnswers[answer.questionId] = answer.fileUrl;
      }
    });

    // Validar lógica condicional
    const allQuestions = version.sections.flatMap(s => s.questions);

    // 1. Verificar que no hay respuestas para preguntas ocultas (anti-tampering)
    const { valid, hiddenQuestionWithAnswer } = validateNoAnswersForHiddenQuestions(
      allQuestions.map(q => ({
        id: q.id,
        conditionalLogic: q.conditionalLogic as any
      })),
      currentAnswers
    );

    if (!valid && hiddenQuestionWithAnswer) {
      const hiddenQuestion = allQuestions.find(q => q.id === hiddenQuestionWithAnswer);
      return res.status(400).json({
        error: `Respuesta inválida: la pregunta "${hiddenQuestion?.text || 'desconocida'}" está oculta y no debe tener respuesta`
      });
    }

    // 2. Verificar preguntas requeridas condicionalmente
    for (const question of allQuestions) {
      const isRequired = isQuestionRequired(
        {
          id: question.id,
          isRequired: question.isRequired,
          conditionalLogic: question.conditionalLogic as any
        },
        currentAnswers
      );

      if (isRequired) {
        const hasAnswer = answers.some((a: any) => a.questionId === question.id &&
          (a.textAnswer || (a.selectedOptions && a.selectedOptions.length > 0) || a.fileUrl)
        );
        if (!hasAnswer) {
          return res.status(400).json({
            error: `La pregunta "${question.text}" es requerida`
          });
        }
      }
    }

    // Generar folio único para la respuesta
    const folio = generateResponseFolio(formId);
    
    // Obtener información del cliente
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
    
    // Crear respuesta
    const response = await prisma.response.create({
      data: {
        formId,
        formVersionId: versionId,
        submittedAt: new Date(),
        folio: folio,
        isComplete: true,
        completedAt: new Date(),
        ipAddress: ipAddress,
        userAgent: userAgent,
        answers: {
          create: answers
            .filter((answer: any) => !answer.questionId.startsWith('_'))
            .map((answer: any) => ({
              questionId: answer.questionId,
              textValue: answer.textAnswer,
              fileUrl: answer.fileUrl,
              fileName: answer.fileName,
              fileSize: answer.fileSize,
              selectedOptions: answer.selectedOptions ? {
                connect: answer.selectedOptions.map((optionId: string) => ({ id: optionId }))
              } : undefined
            }))
        }
      },
      include: {
        answers: true,
        form: {
          select: {
            title: true,
            slug: true
          }
        }
      }
    });

    return res.json({
      id: response.id,
      folio: response.folio,
      submittedAt: response.submittedAt,
      formTitle: response.form.title,
      message: 'Respuesta guardada exitosamente'
    });

  } catch (error) {
    console.error('Error al guardar respuesta:', error);
    return res.status(500).json({ error: 'Error al guardar respuesta' });
  }
});

/**
 * GET /api/responses/verify/:folio
 * Verificar estado de una respuesta por folio
 */
router.get('/verify/:folio', async (req, res) => {
  try {
    console.log('Endpoint de verificación accedido');
    const { folio } = req.params;
    console.log('Folio recibido:', folio);
    
    if (!folio) {
      console.log('Error: Folio no proporcionado');
      return res.status(400).json({ error: 'Folio no proporcionado' });
    }
    
    // Buscar respuesta por folio
    console.log('Buscando respuesta con folio:', folio);
    const response = await prisma.response.findFirst({
      where: { folio },
      include: {
        form: {
          select: {
            title: true,
            slug: true
          }
        }
      }
    });
    
    console.log('Resultado de búsqueda:', response ? 'Encontrado' : 'No encontrado');
    
    if (!response) {
      return res.status(404).json({ error: 'Respuesta no encontrada' });
    }
    
    const result = {
      verified: true,
      folio: response.folio,
      submittedAt: response.submittedAt,
      formTitle: response.form.title
    };
    
    console.log('Enviando respuesta:', result);
    return res.json(result);
    
  } catch (error) {
    console.error('Error al verificar respuesta:', error);
    return res.status(500).json({ error: 'Error al verificar respuesta' });
  }
});

export default router;
