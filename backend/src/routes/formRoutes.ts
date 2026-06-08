import express from 'express';
import {
  getForms,
  getFormById,
  createForm,
  updateForm,
  updateFormSections,
  updateFormConfig,
  deleteForm,
  toggleFormStatus,
  shareForm,
  unshareForm,
  updateSharePermission,
  duplicateForm,
  renameForm,
  uploadFormCoverImage,
  deleteFormCoverImage
} from '../controllers/formController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../config/multer.js';
import { PrismaClient } from '@prisma/client';
import { createResponse } from '../services/responseService.js';
import { validateNoAnswersForHiddenQuestions } from '../utils/conditionalEngine.js';

const router: ReturnType<typeof express.Router> = express.Router();
const prisma = new PrismaClient();

import { decryptToken, searchHubSpotObject } from '../services/hubspotClient.js';

// Ruta pública (sin autenticación)
router.get('/public/:slug', async (req, res) => {
  try {
    const slug = req.params.slug as string;

    const form = await prisma.form.findUnique({
      where: { slug, isActive: true },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                  include: {
                    options: {
                      orderBy: { order: 'asc' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!form || form.versions.length === 0) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }

    // Incluir horarios disponibles y enforceSchedule si es EXAM_REGISTRATION
    let availableSchedules: any[] = [];
    let linkedExamEnforceSchedule = false;
    if (form.formType === 'EXAM_REGISTRATION' && form.linkedExamId) {
      const linkedExam = await prisma.exam.findUnique({
        where: { id: form.linkedExamId },
        select: { enforceSchedule: true },
      });
      linkedExamEnforceSchedule = linkedExam?.enforceSchedule ?? false;

      if (linkedExamEnforceSchedule) {
        const schedules = await prisma.examSchedule.findMany({
          where: {
            examId: form.linkedExamId,
            isActive: true,
            startTime: { gte: new Date() },
          },
          include: {
            _count: {
              select: { registrations: { where: { status: 'CONFIRMED' } } },
            },
          },
          orderBy: { startTime: 'asc' },
        });
        availableSchedules = schedules
          .map(s => ({
            ...s,
            registeredCount: s._count.registrations,
            availableSpots: s.capacity - s._count.registrations,
          }))
          .filter(s => s.availableSpots > 0);
      }
    }

    // Verificar si el formulario tiene validación HubSpot activa (requireMatch)
    let hubspotValidation: { matchQuestionId: string; message: string } | null = null;
    const hubConfig = await prisma.hubSpotConfig.findUnique({
      where: { formId: form.id },
      select: { requireMatch: true, requireMatchMessage: true, matchQuestionId: true, isActive: true }
    });
    if (hubConfig?.isActive && hubConfig.requireMatch) {
      hubspotValidation = {
        matchQuestionId: hubConfig.matchQuestionId,
        message: hubConfig.requireMatchMessage || 'No se encontró ningún registro con ese valor en el sistema.'
      };
    }

    return res.json({
      id: form.id,
      title: form.title,
      description: form.description,
      slug: form.slug,
      templateId: form.templateId,
      coverImage: form.coverImage,
      formType: form.formType,
      linkedExamId: form.linkedExamId,
      linkedExamEnforceSchedule,
      emailQuestionId: form.emailQuestionId,
      nameQuestionId: form.nameQuestionId,
      allowExemption: form.allowExemption,
      registrationCondition: form.registrationCondition,
      availableSchedules,
      hubspotValidation,
      version: form.versions[0]
    });

  } catch (error) {
    console.error('Error al obtener formulario público:', error);
    return res.status(500).json({ error: 'Error al cargar formulario' });
  }
});

/**
 * POST /api/forms/public/:slug/hubspot-check
 * Valida si el valor de la propiedad de búsqueda existe en HubSpot.
 * Público — el token nunca se expone al frontend.
 */
router.post('/public/:slug/hubspot-check', async (req, res) => {
  try {
    const { slug } = req.params;
    const { value } = req.body as { value: string };

    if (!value || !value.trim()) {
      return res.status(400).json({ found: false, error: 'Valor requerido' });
    }

    const form = await prisma.form.findUnique({
      where: { slug, isActive: true },
      select: { id: true }
    });
    if (!form) return res.status(404).json({ found: false, error: 'Formulario no encontrado' });

    const config = await prisma.hubSpotConfig.findUnique({
      where: { formId: form.id },
      select: {
        requireMatch: true,
        requireMatchMessage: true,
        objectType: true,
        matchOperator: true,
        matchProperty: true,
        accessTokenEncrypted: true,
        isActive: true
      }
    });

    if (!config || !config.isActive || !config.requireMatch) {
      // Si no hay config o no requiere match, se permite el envío
      return res.json({ found: true });
    }

    const accessToken = decryptToken(config.accessTokenEncrypted);
    const result = await searchHubSpotObject(
      config.objectType as 'contacts' | 'deals',
      config.matchOperator,
      config.matchProperty,
      value.trim(),
      accessToken
    );

    const found = result.total > 0;
    return res.json({
      found,
      message: found
        ? null
        : config.requireMatchMessage || `No se encontró ningún registro con ese valor en el sistema.`
    });

  } catch (err) {
    console.error('[hubspot-check] error:', err);
    // Ante error de HubSpot, no bloquear el formulario
    return res.json({ found: true });
  }
});

/**
 * POST /api/forms/public/:slug/register
 * Registro de examen — reemplaza al submit normal para formularios EXAM_REGISTRATION
 */
router.post('/public/:slug/register', async (req, res) => {
  try {
    const { slug } = req.params;
    const { versionId, answers } = req.body;

    if (!versionId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const form = await prisma.form.findUnique({
      where: { slug, isActive: true },
      select: { id: true, formType: true, linkedExamId: true, emailQuestionId: true, nameQuestionId: true },
    });

    if (!form) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }

    if (form.formType !== 'EXAM_REGISTRATION') {
      return res.status(400).json({ error: 'Este formulario no es de tipo registro de examen' });
    }

    // Validar lógica condicional (anti-tampering)
    const version = await prisma.formVersion.findUnique({
      where: { id: versionId },
      include: { sections: { include: { questions: true } } },
    });

    if (!version) {
      return res.status(404).json({ error: 'Versión del formulario no encontrada' });
    }

    const currentAnswers: Record<string, string | string[]> = {};
    answers.forEach((a: any) => {
      if (a.questionId.startsWith('_')) return;
      if (a.textAnswer) currentAnswers[a.questionId] = a.textAnswer;
      else if (a.selectedOptions?.length) currentAnswers[a.questionId] = a.selectedOptions;
      else if (a.fileUrl) currentAnswers[a.questionId] = a.fileUrl;
    });

    const allQuestions = version.sections.flatMap(s => s.questions);
    const { valid, hiddenQuestionWithAnswer } = validateNoAnswersForHiddenQuestions(
      allQuestions.map(q => ({ id: q.id, conditionalLogic: q.conditionalLogic as any })),
      currentAnswers
    );
    if (!valid && hiddenQuestionWithAnswer) {
      const hq = allQuestions.find(q => q.id === hiddenQuestionWithAnswer);
      return res.status(400).json({ error: `Respuesta inválida en pregunta oculta: "${hq?.text || 'desconocida'}"` });
    }

    // Mapear respuestas al formato esperado por createResponse
    const mappedAnswers = answers.map((a: any) => ({
      questionId: a.questionId,
      value: a.textAnswer ?? a.fileUrl ?? a.selectedOptions ?? null,
      fileUrl: a.fileUrl ?? null,
      fileName: a.fileName ?? null,
      fileSize: a.fileSize ?? null,
    }));

    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
    const userAgent = req.headers['user-agent'] || '';

    const result = await createResponse({
      formId: form.id,
      versionId,
      answers: mappedAnswers,
      ipAddress,
      userAgent,
    });

    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al registrar';
    const status = message.includes('cupo') || message.includes('registrado') ? 409 : 400;
    return res.status(status).json({ error: message });
  }
});

// Todas las demás rutas requieren autenticación
router.use(requireAuth);

// CRUD básico
router.get('/', getForms);
router.get('/:id', getFormById);
router.post('/', createForm);
router.put('/:id', updateForm);
router.patch('/:id/sections', updateFormSections);
router.patch('/:id/config', updateFormConfig);
router.delete('/:id', deleteForm);

// Activar/Desactivar
router.patch('/:id/status', toggleFormStatus);

// Compartir formularios
router.post('/:id/share', shareForm);
router.delete('/:id/share/:userId', unshareForm);
router.patch('/:id/share/:userId', updateSharePermission);

// Duplicar formulario
router.post('/:id/duplicate', duplicateForm);

// Renombrar formulario (sin crear versión)
router.patch('/:id/rename', renameForm);

// Imagen de portada
router.patch('/:id/cover', upload.single('coverImage'), uploadFormCoverImage);
router.delete('/:id/cover', deleteFormCoverImage);

export default router;
