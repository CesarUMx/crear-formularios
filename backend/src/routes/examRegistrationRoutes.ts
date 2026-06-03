import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as examRegistrationService from '../services/examRegistrationService.js';

const router: ReturnType<typeof Router> = Router();

/**
 * GET /api/exam-registrations/exam/:examId
 * Obtener todos los registros de un examen (admin)
 */
router.get('/exam/:examId', requireAuth, async (req, res, next) => {
  try {
    const examId = req.params.examId as string;
    const { status, search } = req.query;
    
    const registrations = await examRegistrationService.getRegistrationsByExamId(
      examId,
      {
        status: status as any,
        search: search as string,
      }
    );
    
    res.json(registrations);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/exam-registrations/schedule/:scheduleId
 * Obtener registros de un horario específico
 */
router.get('/schedule/:scheduleId', requireAuth, async (req, res, next) => {
  try {
    const scheduleId = req.params.scheduleId as string;
    const registrations = await examRegistrationService.getRegistrationsByScheduleId(
      scheduleId
    );
    res.json(registrations);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/exam-registrations/check-email
 * Verificar si un email ya está registrado (para validación en frontend)
 */
router.get('/check-email', async (req, res, next) => {
  try {
    const { examId, email } = req.query;
    
    if (!examId || !email) {
      return res.status(400).json({ 
        error: 'Se requieren examId y email' 
      });
    }
    
    const isRegistered = await examRegistrationService.isEmailRegistered(
      examId as string,
      email as string
    );
    
    return res.json({ isRegistered });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/exam-registrations/exam/:examId/export
 * Exportar registros de un examen a CSV
 */
router.get('/exam/:examId/export', requireAuth, async (req, res, next) => {
  try {
    const examId = req.params.examId as string;
    const registrations = await examRegistrationService.getRegistrationsByExamId(examId, {});

    const rows = [
      ['Nombre', 'Email', 'Horario', 'Fecha inicio', 'Lugar', 'Exención', 'Estado', 'Fecha registro'].join(','),
      ...registrations.map((r: any) => [
        `"${(r.studentName || '').replace(/"/g, '""')}"`,
        `"${(r.studentEmail || '').replace(/"/g, '""')}"`,
        `"${(r.schedule?.title || '').replace(/"/g, '""')}"`,
        r.schedule?.startTime ? new Date(r.schedule.startTime).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) : '',
        `"${(r.schedule?.location || '').replace(/"/g, '""')}"`,
        r.hasExemption ? 'Sí' : 'No',
        r.status || '',
        new Date(r.createdAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      ].join(','))
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="registros-examen-${examId}.csv"`);
    return res.send('\uFEFF' + rows.join('\n'));
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/exam-registrations/stats/:examId
 * Obtener estadísticas de inscripción
 */
router.get('/stats/:examId', requireAuth, async (req, res, next) => {
  try {
    const examId = req.params.examId as string;
    const stats = await examRegistrationService.getRegistrationStats(examId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/exam-registrations/:id
 * Obtener un registro específico
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const registration = await examRegistrationService.getRegistrationById(id);
    
    if (!registration) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    
    return res.json(registration);
  } catch (error) {
    return next(error);
  }
});

/**
 * PUT /api/exam-registrations/:id
 * Actualizar un registro (cambio de horario, datos, etc.)
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const registration = await examRegistrationService.updateRegistration(
      id,
      req.body
    );
    return res.json(registration);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});

/**
 * DELETE /api/exam-registrations/:id
 * Cancelar un registro (libera el cupo)
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const registration = await examRegistrationService.cancelRegistration(id);
    return res.json(registration);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});

/**
 * POST /api/exam-registrations/:id/attendance
 * Marcar asistencia al examen
 */
router.post('/:id/attendance', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { attended } = req.body;
    
    if (attended === undefined) {
      return res.status(400).json({ error: 'Se requiere el campo attended' });
    }
    
    await examRegistrationService.markAttendance(id, attended);
    return res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});

export default router;
