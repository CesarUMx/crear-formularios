import express from 'express';
import {
  getForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  toggleFormStatus,
  shareForm,
  unshareForm,
  updateSharePermission
} from '../controllers/formController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// CRUD básico
router.get('/', getForms);
router.get('/:id', getFormById);
router.post('/', createForm);
router.put('/:id', updateForm);
router.delete('/:id', deleteForm);

// Activar/Desactivar
router.patch('/:id/status', toggleFormStatus);

// Compartir formularios
router.post('/:id/share', shareForm);
router.delete('/:id/share/:userId', unshareForm);
router.patch('/:id/share/:userId', updateSharePermission);

export default router;
