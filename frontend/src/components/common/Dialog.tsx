import { useEffect, useRef, useState, useCallback } from 'react';
import { X, AlertTriangle, Trash2, CheckCircle, Info } from 'lucide-react';

export type DialogType = 'danger' | 'warning' | 'info' | 'success';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  confirmDisabled?: boolean;
  loading?: boolean;
}

export function Dialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmDisabled = false,
  loading = false
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      dialogRef.current?.focus();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const icons = {
    danger: <AlertTriangle className="w-12 h-12 text-red-600" />,
    warning: <AlertTriangle className="w-12 h-12 text-yellow-600" />,
    info: <Info className="w-12 h-12 text-blue-600" />,
    success: <CheckCircle className="w-12 h-12 text-green-600" />
  };

  const confirmButtonStyles = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800/80 animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-scale-in"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">{icons[type]}</div>
            <div>
              <h3 id="dialog-title" className="text-xl font-bold text-gray-900">
                {title}
              </h3>
            </div>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cerrar diálogo"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled || loading}
            className={`px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmButtonStyles[type]} flex items-center gap-2`}
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  loading?: boolean;
}

export function DeleteDialog({ isOpen, onClose, onConfirm, itemName, loading }: DeleteDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Confirmar Eliminación"
      message={`¿Estás seguro de que deseas eliminar "${itemName}"? Esta acción no se puede deshacer.`}
      type="danger"
      confirmText="Eliminar"
      cancelText="Cancelar"
      loading={loading}
    />
  );
}

export function useDialog() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}
