import { Router, type IRouter, type Request, type Response } from 'express';
import { validateEmail } from '../utils/emailValidator.js';

const router: IRouter = Router();

/**
 * POST /api/email-check
 * Endpoint público: valida formato y existencia del dominio de un correo.
 * Body: { email: string }
 * Respuesta: { valid: boolean, reason?: string }
 */
router.post('/email-check', async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ valid: false, reason: 'Correo requerido' });
    }
    const result = await validateEmail(email);
    return res.json(result);
  } catch {
    // Fail-open en caso de error inesperado: no bloquear por fallo del servidor
    return res.json({ valid: true });
  }
});

export default router;
