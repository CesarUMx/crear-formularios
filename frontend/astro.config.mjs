// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Habilitar SSR para rutas dinámicas
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/uploads': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    }
  }
});