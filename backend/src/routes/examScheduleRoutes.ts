import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as examScheduleService from '../services/examScheduleService.js';

const router: ReturnType<typeof Router> = Router();

/**
 * GET /api/exam-schedules/exam/:examId
 * Obtener todos los horarios de un examen (admin)
 */
router.get('/exam/:examId', requireAuth, async (req, res, next) => {
  try {
    const examId = req.params.examId as string;
    const schedules = await examScheduleService.getSchedulesByExamId(examId);
    res.json(schedules);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/exam-schedules/exam/:examId/available
 * Obtener horarios disponibles para inscripción (PÚBLICO - sin auth)
 */
router.get('/exam/:examId/available', async (req, res, next) => {
  try {
    const examId = req.params.examId as string;
    const schedules = await examScheduleService.getAvailableSchedules(examId);
    res.json(schedules);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/exam-schedules/:id
 * Obtener un horario específico con detalles
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const schedule = await examScheduleService.getScheduleById(id);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }
    
    return res.json(schedule);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/exam-schedules
 * Crear un nuevo horario
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const schedule = await examScheduleService.createSchedule(req.body);
    return res.status(201).json(schedule);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});

/**
 * PUT /api/exam-schedules/:id
 * Actualizar un horario
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const schedule = await examScheduleService.updateSchedule(id, req.body);
    return res.json(schedule);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});

/**
 * DELETE /api/exam-schedules/:id
 * Eliminar un horario (solo si no tiene inscritos)
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const result = await examScheduleService.deleteSchedule(id);
    return res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});

/**
 * POST /api/exam-schedules/duplicate
 * Duplicar horarios de un examen a otro
 */
router.post('/duplicate', requireAuth, async (req, res, next) => {
  try {
    const { sourceExamId, targetExamId } = req.body;
    
    if (!sourceExamId || !targetExamId) {
      return res.status(400).json({ 
        error: 'Se requieren sourceExamId y targetExamId' 
      });
    }
    
    const schedules = await examScheduleService.duplicateSchedules(
      sourceExamId, 
      targetExamId
    );
    
    return res.status(201).json({
      message: `Se duplicaron ${schedules.length} horarios`,
      schedules,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});

export default router;
