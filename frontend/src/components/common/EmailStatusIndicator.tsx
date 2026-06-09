import { useEmailValidation } from '../../hooks/useEmailValidation';
import { Loader, CheckCircle, AlertCircle } from 'lucide-react';

interface EmailStatusIndicatorProps {
  email: string;
  className?: string;
}

/**
 * Indicador visual del estado de validación de un correo (formato + dominio MX).
 * No renderiza nada cuando no hay correo o no aplica.
 */
export default function EmailStatusIndicator({ email, className = '' }: EmailStatusIndicatorProps) {
  const { status, message } = useEmailValidation(email);

  if (status === 'idle') return null;

  if (status === 'checking') {
    return (
      <p className={`mt-1 flex items-center gap-1 text-xs text-gray-500 ${className}`}>
        <Loader className="w-3.5 h-3.5 animate-spin" />
        Verificando correo...
      </p>
    );
  }

  if (status === 'valid') {
    return (
      <p className={`mt-1 flex items-center gap-1 text-xs text-green-600 ${className}`}>
        <CheckCircle className="w-3.5 h-3.5" />
        Correo válido
      </p>
    );
  }

  return (
    <p className={`mt-1 flex items-center gap-1 text-xs text-red-600 ${className}`}>
      <AlertCircle className="w-3.5 h-3.5" />
      {message || 'El correo no es válido'}
    </p>
  );
}
