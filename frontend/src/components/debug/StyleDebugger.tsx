import { useState, useEffect } from 'react';

export default function StyleDebugger() {
  const [styles, setStyles] = useState<{
    primary: string;
    secondary: string;
    accent: string;
    cached: any;
  }>({
    primary: '',
    secondary: '',
    accent: '',
    cached: null
  });

  useEffect(() => {
    const updateStyles = () => {
      const root = document.documentElement;
      const primary = getComputedStyle(root).getPropertyValue('--color-primary').trim();
      const secondary = getComputedStyle(root).getPropertyValue('--color-secondary').trim();
      const accent = getComputedStyle(root).getPropertyValue('--color-accent').trim();
      
      let cached = null;
      try {
        const cachedStr = localStorage.getItem('platform_colors');
        if (cachedStr) {
          cached = JSON.parse(cachedStr);
        }
      } catch (e) {
        console.error('Error parsing cached styles:', e);
      }
      
      setStyles({
        primary,
        secondary,
        accent,
        cached
      });
    };
    
    updateStyles();
    
    // Actualizar cada segundo para ver cambios en tiempo real
    const interval = setInterval(updateStyles, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const refreshStyles = async () => {
    try {
      // Limpiar caché
      localStorage.removeItem('platform_colors');
      
      // Recargar desde API
      const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${API_URL}/settings`, { 
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok) {
        const settings = await response.json();
        const root = document.documentElement;
        
        if (settings.primaryColor) root.style.setProperty('--color-primary', settings.primaryColor);
        if (settings.secondaryColor) root.style.setProperty('--color-secondary', settings.secondaryColor);
        if (settings.accentColor) root.style.setProperty('--color-accent', settings.accentColor);
        
        localStorage.setItem('platform_colors', JSON.stringify({
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor,
          accentColor: settings.accentColor
        }));
        
        alert('Estilos actualizados correctamente');
      } else {
        alert(`Error al cargar estilos: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      alert(`Error al actualizar estilos: ${e}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-50 text-sm">
      <h3 className="font-bold mb-2">Depurador de Estilos</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: styles.primary }}></div>
          <span>Primary: {styles.primary || 'No definido'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: styles.secondary }}></div>
          <span>Secondary: {styles.secondary || 'No definido'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: styles.accent }}></div>
          <span>Accent: {styles.accent || 'No definido'}</span>
        </div>
        <div className="mt-2">
          <p className="text-xs text-gray-500">Cache:</p>
          <pre className="text-xs bg-gray-100 p-1 rounded overflow-auto max-h-20">
            {JSON.stringify(styles.cached, null, 2)}
          </pre>
        </div>
        <button 
          onClick={refreshStyles}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
        >
          Recargar Estilos
        </button>
      </div>
    </div>
  );
}
