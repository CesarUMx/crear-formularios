import { useState, useEffect } from 'react';
import { shareService, type SharePermission, type FormShare, type AvailableUser } from '../../lib/shareService';
import { X, Share2, UserPlus, Trash2, Check } from 'lucide-react';

interface ShareFormModalProps {
  formId: string;
  formTitle: string;
  onClose: () => void;
}

export default function ShareFormModal({ formId, formTitle, onClose }: ShareFormModalProps) {
  const [shares, setShares] = useState<FormShare[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<SharePermission>('VIEW');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [formId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sharesData, usersData] = await Promise.all([
        shareService.getFormShares(formId),
        shareService.getAvailableUsers(formId)
      ]);
      setShares(sharesData);
      setAvailableUsers(usersData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedUserId) {
      setError('Selecciona un usuario');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await shareService.shareForm(formId, selectedUserId, selectedPermission);
      setSuccess('Formulario compartido exitosamente');
      setSelectedUserId('');
      setSelectedPermission('VIEW');
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al compartir');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar el acceso de este usuario?')) return;

    try {
      setLoading(true);
      await shareService.removeShare(formId, userId);
      setSuccess('Acceso eliminado');
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar acceso');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (userId: string, permission: SharePermission) => {
    try {
      setLoading(true);
      await shareService.updatePermission(formId, userId, permission);
      setSuccess('Permiso actualizado');
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar permiso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Compartir Formulario</h2>
              <p className="text-sm text-gray-600">{formTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Add User */}
          {availableUsers.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Agregar Usuario
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuario
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar usuario...</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permiso
                  </label>
                  <select
                    value={selectedPermission}
                    onChange={(e) => setSelectedPermission(e.target.value as SharePermission)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="VIEW">Solo Ver</option>
                    <option value="EDIT">Editar</option>
                    <option value="FULL">Control Total</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleShare}
                disabled={loading || !selectedUserId}
                style={{ backgroundColor: 'var(--color-primary)' }}
                className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 font-medium"
              >
                {loading ? 'Compartiendo...' : 'Compartir'}
              </button>
            </div>
          )}

          {/* Shared Users List */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              Usuarios con Acceso ({shares.length})
            </h3>

            {shares.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Share2 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Este formulario no está compartido con nadie</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{share.user.name}</div>
                      <div className="text-sm text-gray-600">{share.user.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Compartido el {new Date(share.sharedAt).toLocaleDateString('es-MX')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={share.permission}
                        onChange={(e) => handleUpdatePermission(share.userId, e.target.value as SharePermission)}
                        disabled={loading}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="VIEW">Solo Ver</option>
                        <option value="EDIT">Editar</option>
                        <option value="FULL">Control Total</option>
                      </select>

                      <button
                        onClick={() => handleRemoveShare(share.userId)}
                        disabled={loading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="Eliminar acceso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Permission Info */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
            <h4 className="font-medium text-blue-900">Niveles de Permiso:</h4>
            <ul className="space-y-1 text-blue-800">
              <li><strong>Solo Ver:</strong> Puede ver el formulario y las respuestas</li>
              <li><strong>Editar:</strong> Puede editar el formulario y ver respuestas</li>
              <li><strong>Control Total:</strong> Puede editar, compartir y eliminar el formulario</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
