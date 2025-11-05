import { useState, useEffect } from 'react';
import { authService, type User } from '../lib/auth';
import { User as UserIcon, Mail, Save, AlertCircle, CheckCircle } from 'lucide-react';
import Modal from './Modal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
      setName(profile.name);
      setError('');
      setSuccess('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar perfil');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Solo enviar el nombre, el email no se puede modificar
      await authService.updateProfile({ name });
      setSuccess('Perfil actualizado correctamente');
      
      // Actualizar el usuario en el estado
      const updatedProfile = await authService.getProfile();
      setUser(updatedProfile);
      
      // Cerrar modal después de 1.5 segundos
      setTimeout(() => {
        onClose();
        window.location.reload(); // Recargar para actualizar el menú
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Mi Perfil">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mi Perfil" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mensajes */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 p-4 flex items-start">
            <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        {/* Avatar y Rol */}
        <div className="flex items-center space-x-4 pb-6 border-b border-gray-200">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">{user.name}</h4>
            <p className="text-sm text-gray-500">
              {user.role === 'SUPER_ADMIN' ? 'Super Administrador' : 'Administrador'}
            </p>
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Nombre Completo
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Tu nombre completo"
            />
          </div>
        </div>

        {/* Email (Solo lectura) */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              value={user.email}
              readOnly
              disabled
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              placeholder="tu@email.com"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            El email no se puede modificar por seguridad
          </p>
        </div>

        {/* Información adicional */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Cuenta creada:</span>
            <span className="font-medium text-gray-900">
              {new Date(user.createdAt).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          {user.lastLogin && (
            <div className="flex justify-between">
              <span className="text-gray-600">Último acceso:</span>
              <span className="font-medium text-gray-900">
                {new Date(user.lastLogin).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
