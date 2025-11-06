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

// Ruta pública (sin autenticación)
router.get('/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

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

    res.json({
      id: form.id,
      title: form.title,
      description: form.description,
      slug: form.slug,
      templateId: form.templateId,
      version: form.versions[0]
    });

  } catch (error) {
    console.error('Error al obtener formulario público:', error);
    res.status(500).json({ error: 'Error al cargar formulario' });
  }
});

// Todas las demás rutas requieren autenticación
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
