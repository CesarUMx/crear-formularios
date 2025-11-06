import express from 'express';
import * as shareService from '../services/shareService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/share/:formId
 * Compartir formulario con un usuario
 */
router.post('/:formId', requireAuth, async (req, res) => {
  try {
    const { formId } = req.params;
    const { userId, permission } = req.body;
    const sharedById = req.user.id;

    if (!userId) {
      return res.status(400).json({ error: 'El ID del usuario es requerido' });
    }

    if (!permission || !['VIEW', 'EDIT', 'FULL'].includes(permission)) {
      return res.status(400).json({ error: 'Permiso inválido. Debe ser VIEW, EDIT o FULL' });
    }

    // Verificar que el usuario actual tiene permisos para compartir
    const access = await shareService.checkFormAccess(formId, sharedById);
    if (!access.hasAccess || (access.permission !== 'FULL' && !access.isOwner)) {
      return res.status(403).json({ error: 'No tienes permisos para compartir este formulario' });
    }

    const share = await shareService.shareForm(formId, userId, permission, sharedById);
    res.json(share);

  } catch (error) {
    console.error('Error al compartir formulario:', error);
    res.status(500).json({ error: error.message || 'Error al compartir formulario' });
  }
});

/**
 * GET /api/share/:formId
 * Obtener usuarios con acceso a un formulario
 */
router.get('/:formId', requireAuth, async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user.id;

    // Verificar que el usuario tiene acceso al formulario
    const access = await shareService.checkFormAccess(formId, userId);
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'No tienes acceso a este formulario' });
    }

    const shares = await shareService.getFormShares(formId);
    res.json(shares);

  } catch (error) {
    console.error('Error al obtener compartidos:', error);
    res.status(500).json({ error: 'Error al obtener compartidos' });
  }
});

/**
 * DELETE /api/share/:formId/:userId
 * Eliminar acceso de un usuario
 */
router.delete('/:formId/:userId', requireAuth, async (req, res) => {
  try {
    const { formId, userId } = req.params;
    const requesterId = req.user.id;

    // Verificar que el usuario actual tiene permisos para eliminar
    const access = await shareService.checkFormAccess(formId, requesterId);
    if (!access.hasAccess || (access.permission !== 'FULL' && !access.isOwner)) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar accesos' });
    }

    const result = await shareService.removeFormShare(formId, userId);
    res.json(result);

  } catch (error) {
    console.error('Error al eliminar acceso:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar acceso' });
  }
});

/**
 * PUT /api/share/:formId/:userId
 * Actualizar permiso de un usuario
 */
router.put('/:formId/:userId', requireAuth, async (req, res) => {
  try {
    const { formId, userId } = req.params;
    const { permission } = req.body;
    const requesterId = req.user.id;

    if (!permission || !['VIEW', 'EDIT', 'FULL'].includes(permission)) {
      return res.status(400).json({ error: 'Permiso inválido' });
    }

    // Verificar que el usuario actual tiene permisos para actualizar
    const access = await shareService.checkFormAccess(formId, requesterId);
    if (!access.hasAccess || (access.permission !== 'FULL' && !access.isOwner)) {
      return res.status(403).json({ error: 'No tienes permisos para actualizar accesos' });
    }

    const share = await shareService.updateFormSharePermission(formId, userId, permission);
    res.json(share);

  } catch (error) {
    console.error('Error al actualizar permiso:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar permiso' });
  }
});

/**
 * GET /api/share/:formId/available-users
 * Obtener usuarios disponibles para compartir
 */
router.get('/:formId/available-users', requireAuth, async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user.id;

    // Verificar que el usuario tiene permisos para compartir
    const access = await shareService.checkFormAccess(formId, userId);
    if (!access.hasAccess || (access.permission !== 'FULL' && !access.isOwner)) {
      return res.status(403).json({ error: 'No tienes permisos para compartir este formulario' });
    }

    const users = await shareService.getAvailableUsers(formId);
    res.json(users);

  } catch (error) {
    console.error('Error al obtener usuarios disponibles:', error);
    res.status(500).json({ error: 'Error al obtener usuarios disponibles' });
  }
});

export default router;
