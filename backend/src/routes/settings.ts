import express from 'express';
import * as settingsService from '../services/settingsService.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/settings
 * Obtener configuración de la plataforma (público)
 */
router.get('/', async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

/**
 * GET /api/settings/colors
 * Obtener solo los colores de la plataforma (público, optimizado para carga rápida)
 */
router.get('/colors', async (req, res) => {
  try {
    // Configurar caché para mejorar rendimiento
    res.setHeader('Cache-Control', 'public, max-age=60'); // Cache por 1 minuto
    
    const settings = await settingsService.getSettings();
    
    // Devolver solo los colores
    res.json({
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor
    });
  } catch (error) {
    console.error('Error al obtener colores:', error);
    res.status(500).json({ error: 'Error al obtener colores' });
  }
});

/**
 * PUT /api/settings
 * Actualizar configuración de la plataforma (solo SUPER_ADMIN)
 */
router.put('/', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { logo, primaryColor, secondaryColor, accentColor } = req.body;
    
    // Validar colores hexadecimales
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    if (primaryColor && !hexColorRegex.test(primaryColor)) {
      return res.status(400).json({ error: 'Color primario inválido' });
    }
    if (secondaryColor && !hexColorRegex.test(secondaryColor)) {
      return res.status(400).json({ error: 'Color secundario inválido' });
    }
    if (accentColor && !hexColorRegex.test(accentColor)) {
      return res.status(400).json({ error: 'Color de acento inválido' });
    }
    
    const settings = await settingsService.updateSettings({
      logo,
      primaryColor,
      secondaryColor,
      accentColor
    });
    
    // Establecer encabezados para invalidar caché
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(settings);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

/**
 * POST /api/settings/reset
 * Resetear configuración a valores por defecto (solo SUPER_ADMIN)
 */
router.post('/reset', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const settings = await settingsService.resetSettings();
    
    // Establecer encabezados para invalidar caché
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(settings);
  } catch (error) {
    console.error('Error al resetear configuración:', error);
    res.status(500).json({ error: 'Error al resetear configuración' });
  }
});

export default router;
