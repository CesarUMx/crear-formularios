import { useState } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';

interface SecurityLockModalProps {
  isOpen: boolean;
  unlockCode: string; // Código generado que el profesor verá
  attemptId: string;
  eventType: string;
  onUnlock: () => void;
  onValidate: (code: string) => Promise<boolean>;
}

export default function SecurityLockModal({
  isOpen,
  unlockCode,
  attemptId,
  eventType,
  onUnlock,
  onValidate,
}: SecurityLockModalProps) {
  const [inputCode, setInputCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  if (!isOpen) return null;

  const handleValidate = async () => {
    if (inputCode.length !== 4) {
      setError('El código debe tener 4 dígitos');
      return;
    }

    setValidating(true);
    setError('');

    try {
      const isValid = await onValidate(inputCode);
      
      if (isValid) {
        onUnlock();
      } else {
        setAttempts(prev => prev + 1);
        setError('Código incorrecto. Solicita el código al profesor.');
        setInputCode('');
      }
    } catch (err: any) {
      setError(err.message || 'Error al validar código');
      setAttempts(prev => prev + 1);
      setInputCode('');
    } finally {
      setValidating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidate();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 border-4 border-red-500">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
            <Lock className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-red-900 mb-2">
            Examen Bloqueado
          </h2>
          <p className="text-gray-600">
            Se detectó: <strong>{eventType === 'TAB_SWITCH' ? 'Cambio de pestaña' : 'Actividad sospechosa'}</strong>
          </p>
        </div>

        {/* Instrucciones */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-2">Para continuar:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Solicita ayuda al profesor</li>
                <li>El profesor te proporcionará el código de 4 dígitos</li>
                <li>Ingresa el código para continuar</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Código para el profesor (visible en la consola del navegador del estudiante) */}
        <div className="hidden">Código de desbloqueo: {unlockCode}</div>

        {/* Input de código */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Código de desbloqueo
          </label>
          <input
            type="text"
            maxLength={4}
            value={inputCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ''); // Solo números
              setInputCode(value);
              setError('');
            }}
            onKeyPress={handleKeyPress}
            placeholder="••••"
            className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            disabled={validating}
            autoFocus
          />
          
          {error && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </p>
          )}
          
          {attempts > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Intentos fallidos: {attempts}
            </p>
          )}
        </div>

        {/* Botón de validar */}
        <button
          onClick={handleValidate}
          disabled={validating || inputCode.length !== 4}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          {validating ? 'Validando...' : 'Desbloquear'}
        </button>

        {/* Nota importante */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            <strong>Nota:</strong> Este modal no se puede cerrar hasta ingresar el código correcto.
            Si el profesor concluye tu examen remotamente, se cerrará automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
