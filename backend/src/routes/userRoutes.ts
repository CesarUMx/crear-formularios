import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  toggleUserStatus,
  getUserStats
} from '../controllers/userController.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación Y rol de SUPER_ADMIN
router.use(requireAuth);
router.use(requireSuperAdmin);

// Estadísticas
router.get('/stats', getUserStats);

// CRUD de usuarios
router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

// Acciones especiales
router.patch('/:id/status', toggleUserStatus);
router.post('/:id/reset-password', resetPassword);

export default router;
