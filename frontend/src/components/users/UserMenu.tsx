import { useState, useEffect } from 'react';
import { authService, type User } from '../../lib/auth';
import { LogOut, User as UserIcon, Lock, Users } from 'lucide-react';
import { ProfileModal, ChangePasswordModal } from './';

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      authService.logout();
    }
  };

  const openProfileModal = () => {
    setIsOpen(false);
    setShowProfileModal(true);
  };

  const openPasswordModal = () => {
    setIsOpen(false);
    setShowPasswordModal(true);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-left hidden md:block">
          <div className="text-sm font-medium text-gray-900">{user.name}</div>
          <div className="text-xs text-gray-500">{user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}</div>
        </div>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            
            <button
              onClick={openProfileModal}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition text-left"
            >
              <UserIcon className="w-4 h-4" />
              Mi Perfil
            </button>
            
            <button
              onClick={openPasswordModal}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition text-left"
            >
              <Lock className="w-4 h-4" />
              Cambiar Contraseña
            </button>

            {/* Gestión de Usuarios (solo SUPER_ADMIN) */}
            {user.role === 'SUPER_ADMIN' && (
              <>
                <div className="border-t border-gray-200 my-1" />
                <a
                  href="/admin/users"
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition text-left"
                >
                  <Users className="w-4 h-4" />
                  Gestión de Usuarios
                </a>
              </>
            )}
            
            <div className="border-t border-gray-200 my-1" />
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </>
      )}

      {/* Modales */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />
      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </div>
  );
}
