import { useState, useEffect, useRef, useCallback } from 'react';
import { publicFormService } from '../lib/publicFormService';

export type EmailValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid';

export interface EmailValidationState {
  status: EmailValidationStatus;
  message?: string;
}

const DEBOUNCE_MS = 600;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Hook que valida un correo (formato + existencia del dominio) con debounce.
 * Devuelve el estado de la validación. No bloquea por sí solo: usa `status === 'valid'`
 * en el submit para impedir el envío con correos inexistentes.
 */
export function useEmailValidation(email: string): EmailValidationState {
  const [state, setState] = useState<EmailValidationState>({ status: 'idle' });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const value = (email || '').trim();

    if (timerRef.current) clearTimeout(timerRef.current);

    if (!value) {
      setState({ status: 'idle' });
      return;
    }

    if (!EMAIL_REGEX.test(value)) {
      setState({ status: 'invalid', message: 'El formato del correo no es válido' });
      return;
    }

    setState({ status: 'checking' });
    const currentRequest = ++requestIdRef.current;

    timerRef.current = setTimeout(async () => {
      const result = await publicFormService.checkEmail(value);
      // Ignorar respuestas obsoletas
      if (currentRequest !== requestIdRef.current) return;
      if (result.valid) {
        setState({ status: 'valid' });
      } else {
        setState({ status: 'invalid', message: result.reason || 'El correo no es válido' });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [email]);

  return state;
}

/**
 * Valida un correo de forma imperativa (para usar en el submit).
 * Devuelve true si es válido o si la red falla (fail-open).
 */
export function useValidateEmailOnDemand() {
  return useCallback(async (email: string): Promise<{ valid: boolean; reason?: string }> => {
    const value = (email || '').trim();
    if (!EMAIL_REGEX.test(value)) {
      return { valid: false, reason: 'El formato del correo no es válido' };
    }
    return publicFormService.checkEmail(value);
  }, []);
}
