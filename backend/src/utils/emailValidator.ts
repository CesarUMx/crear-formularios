import { resolveMx } from 'dns/promises';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Caché en memoria: dominio -> { hasMx, expiresAt }
const mxCache = new Map<string, { hasMx: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora

/** Valida que el correo tenga estructura correcta (algo@dominio.tld) */
export const isValidFormat = (email: string): boolean => {
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Verifica que el dominio del correo tenga registros MX (servidor de correo).
 * Detecta typos como gmail.con, hotmial.com, etc.
 */
export const domainHasMx = async (email: string): Promise<boolean> => {
  const domain = email.trim().split('@')[1]?.toLowerCase();
  if (!domain) return false;

  const cached = mxCache.get(domain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.hasMx;
  }

  let hasMx = false;
  try {
    const records = await resolveMx(domain);
    hasMx = Array.isArray(records) && records.length > 0;
  } catch {
    hasMx = false;
  }

  mxCache.set(domain, { hasMx, expiresAt: Date.now() + CACHE_TTL_MS });
  return hasMx;
};

/**
 * Valida formato y existencia del dominio de correo.
 * Devuelve { valid, reason? }.
 */
export const validateEmail = async (
  email: string
): Promise<{ valid: boolean; reason?: string }> => {
  if (!email || !isValidFormat(email)) {
    return { valid: false, reason: 'El formato del correo no es válido' };
  }
  const hasMx = await domainHasMx(email);
  if (!hasMx) {
    return { valid: false, reason: 'El dominio del correo no existe o no puede recibir correos' };
  }
  return { valid: true };
};
