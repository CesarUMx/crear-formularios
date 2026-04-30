import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as securityService from '../services/securityService.js';
import { SecurityEventType, SecurityAttemptType } from '@prisma/client';

const router = express.Router();

/**
 * POST /api/security/events
 * Registra un evento de seguridad y devuelve código de desbloqueo
 */
router.post('/events', async (req, res) => {
  try {
    const { attemptId, attemptType, eventType, metadata } = req.body;
    
    if (!attemptId || !attemptType || !eventType) {
      return res.status(400).json({ 
        message: 'Faltan campos requeridos: attemptId, attemptType, eventType' 
      });
    }
    
    const event = await securityService.createSecurityEvent({
      attemptId,
      attemptType: attemptType as SecurityAttemptType,
      eventType: eventType as SecurityEventType,
      metadata,
    });
    
    return res.json({
      success: true,
      event: {
        id: event.id,
        unlockCode: event.unlockCode,
        eventType: event.eventType,
        createdAt: event.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating security event:', error);
    return res.status(500).json({ message: error.message || 'Error al registrar evento de seguridad' });
  }
});

/**
 * POST /api/security/validate-code
 * Valida un código de desbloqueo
 */
router.post('/validate-code', async (req, res) => {
  try {
    const { attemptId, code } = req.body;
    
    if (!attemptId || !code) {
      return res.status(400).json({ message: 'Se requiere attemptId y code' });
    }
    
    const result = await securityService.validateUnlockCode(attemptId, code);
    
    if (result.valid) {
      return res.json({ success: true, message: result.message });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    console.error('Error validating unlock code:', error);
    return res.status(500).json({ message: error.message || 'Error al validar código' });
  }
});

/**
 * GET /api/security/exams/:examId/events
 * Obtiene eventos de seguridad pendientes de un examen (profesor)
 */
router.get('/exams/:examId/events', requireAuth, async (req, res) => {
  try {
    const examId = req.params.examId as string;
    const events = await securityService.getPendingSecurityEvents(examId);
    return res.json(events);
  } catch (error: any) {
    console.error('Error fetching security events:', error);
    return res.status(500).json({ message: error.message || 'Error al obtener eventos de seguridad' });
  }
});

/**
 * GET /api/security/attempts/:attemptId/events
 * Obtiene historial de eventos de un intento
 */
router.get('/attempts/:attemptId/events', requireAuth, async (req, res) => {
  try {
    const attemptId = req.params.attemptId as string;
    const events = await securityService.getSecurityEventsByAttempt(attemptId);
    return res.json(events);
  } catch (error: any) {
    console.error('Error fetching attempt events:', error);
    return res.status(500).json({ message: error.message || 'Error al obtener eventos del intento' });
  }
});

/**
 * POST /api/security/attempts/:attemptId/force-complete
 * Concluye un examen remotamente (profesor)
 */
router.post('/attempts/:attemptId/force-complete', requireAuth, async (req, res) => {
  try {
    const attemptId = req.params.attemptId as string;
    const professorId = (req as any).user.userId;
    
    const updated = await securityService.forceCompleteAttempt(attemptId, professorId);
    
    return res.json({
      success: true,
      message: 'Examen concluido remotamente',
      attempt: updated,
    });
  } catch (error: any) {
    console.error('Error force completing attempt:', error);
    return res.status(400).json({ message: error.message || 'Error al concluir examen' });
  }
});

/**
 * GET /api/security/attempts/:attemptId/check-completion
 * Verifica si un intento fue concluido remotamente (polling del estudiante)
 */
router.get('/attempts/:attemptId/check-completion', async (req, res) => {
  try {
    const attemptId = req.params.attemptId as string;
    const result = await securityService.checkForceCompletion(attemptId);
    return res.json(result);
  } catch (error: any) {
    console.error('Error checking force completion:', error);
    return res.status(500).json({ message: error.message || 'Error al verificar conclusión' });
  }
});

export default router;
