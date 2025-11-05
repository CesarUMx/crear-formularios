import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  FileSpreadsheet,
  Users, 
  BarChart3, 
  Settings,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  User,
  Lock
} from 'lucide-react';
import { authService } from '../../lib/auth';
import { ProfileModal, ChangePasswordModal } from '../users';

interface SidebarProps {
  currentPath?: string;
}

export default function Sidebar({ currentPath = '' }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const user = authService.getUser();
  const isSuperAdmin = authService.isSuperAdmin();

  // Cerrar menú de configuración al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => {
      if (showConfigMenu) {
        setShowConfigMenu(false);
      }
    };

    if (showConfigMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showConfigMenu]);

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin',
      show: true
    },
    {
      name: 'Formularios',
      icon: FileText,
      path: '/admin',
      show: true
    },
    {
      name: 'Gestión de Usuarios',
      icon: Users,
      path: '/admin/users',
      show: isSuperAdmin
    },
    {
      name: 'Analíticas',
      icon: BarChart3,
      path: '/admin/analytics',
      show: false // Próximamente
    },
    {
      name: 'Configuración',
      icon: Settings,
      path: '/admin/settings',
      show: isSuperAdmin // Solo SUPER_ADMIN
    }
  ];

  const handleLogout = () => {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      authService.logout();
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay para mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out
          bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white
          flex flex-col
          ${isOpen ? 'w-64' : 'w-20'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {isOpen ? (
            <div className="flex items-center gap-3">
              <img 
                src="/images/logo.svg" 
                alt="Forms Logo" 
                className="w-12 h-12 object-contain"
              />
              <span className="text-xl font-bold text-white">Forms UMx</span>
            </div>
          ) : (
            <div className="flex justify-center w-full">
              <img 
                src="/images/logo.svg" 
                alt="Forms Logo" 
                className="w-12 h-12 object-contain"
              />
            </div>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`hidden lg:block p-2 hover:bg-gray-700 rounded-lg transition ${!isOpen && 'absolute right-2'}`}
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${!isOpen && 'rotate-180'}`} />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className={`p-4 border-b border-gray-700 ${!isOpen && 'flex justify-center'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {isOpen && (
                <div className="overflow-hidden">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                    user.role === 'SUPER_ADMIN' 
                      ? 'bg-purple-500/20 text-purple-300' 
                      : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto min-h-0">
          {menuItems.filter(item => item.show).map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            
            return (
              <a
                key={item.path}
                href={item.path}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                  ${!isOpen && 'justify-center'}
                `}
                title={!isOpen ? item.name : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span className="font-medium">{item.name}</span>}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex-shrink-0 space-y-2">
          {/* Botón de Configuración con menú desplegable */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowConfigMenu(!showConfigMenu);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-lg
                text-gray-300 hover:bg-gray-700 hover:text-white transition-all
                ${!isOpen && 'justify-center'}
              `}
              title={!isOpen ? 'Configuración' : ''}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span className="font-medium">Configuración</span>}
            </button>

            {/* Menú desplegable de configuración */}
            {showConfigMenu && isOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
                <button
                  onClick={() => {
                    setShowProfileModal(true);
                    setShowConfigMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-all text-left"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">Mi Perfil</span>
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(true);
                    setShowConfigMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-all text-left"
                >
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Cambiar Contraseña</span>
                </button>
              </div>
            )}
          </div>

          {/* Botón de Cerrar Sesión */}
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-lg
              text-gray-300 hover:bg-red-600 hover:text-white transition-all
              ${!isOpen && 'justify-center'}
            `}
            title={!isOpen ? 'Cerrar Sesión' : ''}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Modales */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />
      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </>
  );
}
