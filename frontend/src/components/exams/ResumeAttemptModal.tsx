import Modal from '../common/Modal';
import { Clock, AlertCircle, PlayCircle, PlusCircle } from 'lucide-react';

interface ResumeAttemptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: () => void;
  onStartNew: () => void;
  attemptInfo: {
    startedAt: string;
    attemptNumber: number;
  };
}

export default function ResumeAttemptModal({ 
  isOpen, 
  onClose, 
  onResume, 
  onStartNew,
  attemptInfo 
}: ResumeAttemptModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Intento de Examen en Progreso" size="md">
      <div className="space-y-6">
        {/* Información del intento */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-2">
                Tienes un intento de examen sin completar
              </p>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Iniciado: {formatDate(attemptInfo.startedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Intento #{attemptInfo.attemptNumber}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mensaje explicativo */}
        <div className="text-gray-700">
          <p className="mb-3">
            Puedes continuar con tu intento anterior o iniciar uno nuevo. 
            Ten en cuenta que:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Si continúas, retornarás al punto donde lo dejaste</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Si inicias uno nuevo, perderás el progreso del intento anterior</span>
            </li>
          </ul>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onResume}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <PlayCircle className="w-5 h-5" />
            Continuar Intento
          </button>
          
          <button
            onClick={onStartNew}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <PlusCircle className="w-5 h-5" />
            Iniciar Nuevo
          </button>
        </div>

        {/* Botón cancelar */}
        <button
          onClick={onClose}
          className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
