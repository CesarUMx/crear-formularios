import { useState, useEffect } from 'react';
import { API_URL } from '../lib/config';

interface PlatformColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

// Cache global para evitar múltiples requests
let colorsCache: PlatformColors | null = null;
let loadingPromise: Promise<void> | null = null;

async function loadColors(): Promise<PlatformColors> {
  // Si ya tenemos caché, devolverlo
  if (colorsCache) {
    return colorsCache;
  }

  // Si ya hay una petición en curso, esperar a que termine
  if (loadingPromise) {
    await loadingPromise;
    return colorsCache!;
  }

  // Crear nueva petición
  loadingPromise = (async () => {
    try {
      // Intentar localStorage primero
      const cachedColors = localStorage.getItem('platform_colors');
      if (cachedColors) {
        try {
          colorsCache = JSON.parse(cachedColors);
          console.log('🎨 Colors loaded from localStorage');
        } catch (e) {
          console.error('Error parsing cached colors:', e);
        }
      }

      // Cargar desde la API
      const fullUrl = `${API_URL}/settings/colors`;
      console.log('🎨 Fetching colors from:', fullUrl);
      
      const res = await fetch(fullUrl);
      
      if (!res.ok) {
        console.error('❌ Error loading colors, status:', res.status);
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      colorsCache = {
        primaryColor: data.primaryColor || '#006eff',
        secondaryColor: data.secondaryColor || '#1c1c1c',
        accentColor: data.accentColor || '#006eff'
      };
      
      localStorage.setItem('platform_colors', JSON.stringify(colorsCache));
      console.log('✅ Colors loaded from API:', colorsCache);
    } catch (err) {
      console.error('❌ Error loading colors:', err);
      // Usar valores por defecto si falla
      colorsCache = {
        primaryColor: '#006eff',
        secondaryColor: '#1c1c1c',
        accentColor: '#006eff'
      };
    } finally {
      loadingPromise = null;
    }
  })();

  await loadingPromise;
  return colorsCache!;
}

export function useColors() {
  const [colors, setColors] = useState<PlatformColors>({
    primaryColor: '#006eff',
    secondaryColor: '#1c1c1c',
    accentColor: '#006eff'
  });

  useEffect(() => {
    loadColors().then(setColors);
  }, []);

  return colors;
}
