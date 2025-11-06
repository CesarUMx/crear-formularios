import express from 'express';
import { PrismaClient } from '@prisma/client';
import { generateResponseFolio } from '../utils/folioGenerator.js';

const router = express.Router();
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

    // Generar folio único para la respuesta
    const folio = generateResponseFolio(formId);
    
    // Obtener información del cliente
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
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
          create: answers.map(answer => ({
            questionId: answer.questionId,
            textValue: answer.textAnswer,
            fileUrl: answer.fileUrl,
            fileName: answer.fileName,
            fileSize: answer.fileSize,
            selectedOptions: answer.selectedOptions ? {
              connect: answer.selectedOptions.map((optionId) => ({ id: optionId }))
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

    res.json({
      id: response.id,
      folio: response.folio,
      submittedAt: response.submittedAt,
      formTitle: response.form.title,
      message: 'Respuesta guardada exitosamente'
    });

  } catch (error) {
    console.error('Error al guardar respuesta:', error);
    res.status(500).json({ error: 'Error al guardar respuesta' });
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
    res.json(result);
    
  } catch (error) {
    console.error('Error al verificar respuesta:', error);
    res.status(500).json({ error: 'Error al verificar respuesta' });
  }
});

export default router;
