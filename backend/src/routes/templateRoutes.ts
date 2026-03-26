import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/templates
 * Obtener todas las plantillas activas
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const templates = await prisma.formTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    return res.json(templates);
  } catch (error) {
    console.error('Error al obtener plantillas:', error);
    return res.status(500).json({ error: 'Error al cargar plantillas' });
  }
});

/**
 * GET /api/templates/:id
 * Obtener una plantilla por ID
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);

    const template = await prisma.formTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    return res.json(template);
  } catch (error) {
    console.error('Error al obtener plantilla:', error);
    return res.status(500).json({ error: 'Error al cargar plantilla' });
  }
});

/**
 * GET /api/templates/public/:id
 * Obtener una plantilla sin autenticación (para formularios públicos)
 */
router.get('/public/:id', async (req, res) => {
  try {
    const id = String(req.params.id);

    const template = await prisma.formTemplate.findUnique({
      where: { id, isActive: true }
    });

    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    return res.json(template);
  } catch (error) {
    console.error('Error al obtener plantilla pública:', error);
    return res.status(500).json({ error: 'Error al cargar plantilla' });
  }
});

export default router;
