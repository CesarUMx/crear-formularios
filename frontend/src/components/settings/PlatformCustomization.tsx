import { useState, useEffect } from 'react';
import { platformSettingsService } from '../../lib/platformSettings';
import type { PlatformSettings } from '../../lib/types';
import { 
  Upload, 
  RefreshCw, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Palette,
  Image as ImageIcon
} from 'lucide-react';

export default function PlatformCustomization() {
  const [settings, setSettings] = useState<PlatformSettings>(platformSettingsService.getSettings());
  const [logoPreview, setLogoPreview] = useState<string>(settings.logo || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setLogoPreview(settings.logo || '');
  }, [settings.logo]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Por favor selecciona una imagen válida' });
      return;
    }

    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'La imagen no debe superar 2MB' });
      return;
    }

    try {
      setLoading(true);
      const logoData = await platformSettingsService.uploadLogo(file);
      setSettings({ ...settings, logo: logoData });
      setLogoPreview(logoData);
      setMessage({ type: 'success', text: 'Logo cargado correctamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cargar el logo' });
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (colorType: 'primaryColor' | 'secondaryColor' | 'accentColor', value: string) => {
    setSettings({ ...settings, [colorType]: value });
  };

  const handleSave = () => {
    try {
      setLoading(true);
      platformSettingsService.saveSettings(settings);
      setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
      
      // Recargar la página para aplicar cambios
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de que deseas restaurar la configuración por defecto?')) {
      platformSettingsService.resetToDefaults();
      setSettings(platformSettingsService.getSettings());
      setMessage({ type: 'success', text: 'Configuración restaurada' });
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Personalización de la Plataforma</h2>
        <p className="text-gray-600 mt-1">Personaliza el logo y los colores de tu plataforma</p>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div className={`rounded-lg p-4 flex items-start ${
          message.type === 'success' ? 'bg-green-50' : 'bg-red-50'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
          )}
          <div className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <ImageIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Logo de la Plataforma</h3>
        </div>

        <div className="space-y-4">
          {/* Vista previa del logo */}
          <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            {logoPreview ? (
              <img 
                src={logoPreview} 
                alt="Logo preview" 
                className="h-32 w-32 object-contain"
              />
            ) : (
              <div className="text-center text-gray-400">
                <ImageIcon className="w-16 h-16 mx-auto mb-2" />
                <p className="text-sm">No hay logo cargado</p>
              </div>
            )}
          </div>

          {/* Input de archivo */}
          <div>
            <label className="block">
              <span className="sr-only">Seleccionar logo</span>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    cursor-pointer"
                />
                <Upload className="w-5 h-5 text-gray-400" />
              </div>
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Formatos: PNG, JPG, SVG. Tamaño máximo: 2MB
            </p>
          </div>
        </div>
      </div>

      {/* Colores */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Colores de la Plataforma</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Color Primario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Primario
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                className="h-12 w-20 rounded-lg border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={settings.primaryColor}
                onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                placeholder="#2563eb"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Botones principales, enlaces</p>
          </div>

          {/* Color Secundario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Secundario
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                className="h-12 w-20 rounded-lg border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={settings.secondaryColor}
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                placeholder="#1e40af"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Fondos, elementos secundarios</p>
          </div>

          {/* Color de Acento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color de Acento
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.accentColor}
                onChange={(e) => handleColorChange('accentColor', e.target.value)}
                className="h-12 w-20 rounded-lg border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={settings.accentColor}
                onChange={(e) => handleColorChange('accentColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                placeholder="#3b82f6"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Resaltados, notificaciones</p>
          </div>
        </div>

        {/* Vista previa de colores */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-3">Vista Previa:</p>
          <div className="flex gap-3">
            <div 
              className="flex-1 h-16 rounded-lg shadow-sm flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: settings.primaryColor }}
            >
              Primario
            </div>
            <div 
              className="flex-1 h-16 rounded-lg shadow-sm flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: settings.secondaryColor }}
            >
              Secundario
            </div>
            <div 
              className="flex-1 h-16 rounded-lg shadow-sm flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: settings.accentColor }}
            >
              Acento
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={handleReset}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Restaurar por Defecto
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/30 font-medium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}
