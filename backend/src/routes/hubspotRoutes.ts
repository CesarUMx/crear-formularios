import { Router, type IRouter, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
import { encryptToken, decryptToken } from '../services/hubspotClient.js';

const prisma = new PrismaClient();
const router: IRouter = Router();

// ─── GET /api/forms/:formId/hubspot ──────────────────────────────────────────
// Retorna la configuración HubSpot del formulario (sin el token)
router.get('/forms/:formId/hubspot', requireAuth, async (req: Request, res: Response) => {
  try {
    const formId = req.params.formId as string;
    const config = await prisma.hubSpotConfig.findUnique({
      where: { formId },
    });

    if (!config) {
      return res.json(null);
    }

    // Nunca devolver el token cifrado
    const { accessTokenEncrypted: _tok, ...safe } = config;
    return res.json({ ...safe, hasToken: true });
  } catch (err) {
    console.error('[hubspot] GET config error:', err);
    return res.status(500).json({ error: 'Error al obtener configuración HubSpot' });
  }
});

// ─── POST /api/forms/:formId/hubspot ─────────────────────────────────────────
// Crea o actualiza la configuración HubSpot del formulario
router.post('/forms/:formId/hubspot', requireAuth, async (req: Request, res: Response) => {
  try {
    const formId = req.params.formId as string;
    const {
      objectType,
      matchOperator,
      matchProperty,
      matchQuestionId,
      accessToken,
      isActive,
      requireMatch,
      requireMatchMessage,
      propertyMappings,
    } = req.body;

    if (!objectType || !matchOperator || !matchProperty || !matchQuestionId) {
      return res.status(400).json({ error: 'objectType, matchOperator, matchProperty y matchQuestionId son requeridos' });
    }

    const existing = await prisma.hubSpotConfig.findUnique({ where: { formId } });

    let accessTokenEncrypted: string;

    if (accessToken) {
      // Nuevo token proporcionado → cifrar
      accessTokenEncrypted = encryptToken(accessToken);
    } else if (existing) {
      // Sin nuevo token → conservar el existente
      accessTokenEncrypted = existing.accessTokenEncrypted;
    } else {
      return res.status(400).json({ error: 'Se requiere un token de acceso para crear la configuración' });
    }

    const data = {
      objectType,
      matchOperator,
      matchProperty,
      matchQuestionId,
      accessTokenEncrypted,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      requireMatch: requireMatch !== undefined ? Boolean(requireMatch) : false,
      requireMatchMessage: requireMatchMessage ?? null,
      propertyMappings: propertyMappings ?? [],
    };

    const config = existing
      ? await prisma.hubSpotConfig.update({ where: { formId }, data })
      : await prisma.hubSpotConfig.create({ data: { formId, ...data } });

    const { accessTokenEncrypted: _tok, ...safe } = config;
    return res.json({ ...safe, hasToken: true });
  } catch (err) {
    console.error('[hubspot] POST config error:', err);
    return res.status(500).json({ error: 'Error al guardar configuración HubSpot' });
  }
});

// ─── DELETE /api/forms/:formId/hubspot ───────────────────────────────────────
router.delete('/forms/:formId/hubspot', requireAuth, async (req: Request, res: Response) => {
  try {
    const formId = req.params.formId as string;
    await prisma.hubSpotConfig.deleteMany({ where: { formId } });
    return res.json({ message: 'Configuración HubSpot eliminada' });
  } catch (err) {
    console.error('[hubspot] DELETE config error:', err);
    return res.status(500).json({ error: 'Error al eliminar configuración HubSpot' });
  }
});

// ─── GET /api/forms/:formId/hubspot/logs ─────────────────────────────────────
router.get('/forms/:formId/hubspot/logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const formId = req.params.formId as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const config = await prisma.hubSpotConfig.findUnique({
      where: { formId },
      select: { id: true },
    });

    if (!config) {
      return res.json({ logs: [], total: 0, page, limit });
    }

    const [logs, total] = await Promise.all([
      prisma.hubSpotSyncLog.findMany({
        where: { configId: config.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.hubSpotSyncLog.count({ where: { configId: config.id } }),
    ]);

    return res.json({ logs, total, page, limit });
  } catch (err) {
    console.error('[hubspot] GET logs error:', err);
    return res.status(500).json({ error: 'Error al obtener logs de HubSpot' });
  }
});

// ─── POST /api/forms/:formId/hubspot/test ────────────────────────────────────
// Verificar conexión con el token guardado (no lo devuelve, solo confirma que funciona)
router.post('/forms/:formId/hubspot/test', requireAuth, async (req: Request, res: Response) => {
  try {
    const formId = req.params.formId as string;
    const config = await prisma.hubSpotConfig.findUnique({ where: { formId } });
    if (!config) {
      return res.status(404).json({ error: 'No hay configuración HubSpot para este formulario' });
    }

    const token = decryptToken(config.accessTokenEncrypted);
    const objectType = config.objectType.toLowerCase() as 'contacts' | 'deals';

    // Llamada mínima: listar 1 objeto para verificar autenticación
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/${objectType}?limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.ok) {
      return res.json({ ok: true, message: 'Conexión verificada correctamente' });
    }
    const err = await response.text();
    return res.status(400).json({ ok: false, message: `Error HubSpot ${response.status}: ${err}` });
  } catch (err) {
    console.error('[hubspot] test error:', err);
    return res.status(500).json({ ok: false, message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
