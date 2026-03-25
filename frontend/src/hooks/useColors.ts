import { useState, useEffect } from 'react';

interface PlatformColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export function useColors() {
  const [colors, setColors] = useState<PlatformColors>({
    primaryColor: '#006eff',
    secondaryColor: '#1c1c1c',
    accentColor: '#006eff'
  });

  useEffect(() => {
    // Intentar obtener colores del localStorage primero
    const cachedColors = localStorage.getItem('platform_colors');
    if (cachedColors) {
      try {
        setColors(JSON.parse(cachedColors));
      } catch (e) {
        console.error('Error parsing cached colors:', e);
      }
    }

    // Cargar colores desde la API
    fetch('http://localhost:3000/api/settings/colors')
      .then(res => res.json())
      .then(data => {
        const newColors = {
          primaryColor: data.primaryColor || '#006eff',
          secondaryColor: data.secondaryColor || '#1c1c1c',
          accentColor: data.accentColor || '#006eff'
        };
        setColors(newColors);
        localStorage.setItem('platform_colors', JSON.stringify(newColors));
      })
      .catch(err => {
        console.error('Error loading colors:', err);
      });
  }, []);

  return colors;
}
