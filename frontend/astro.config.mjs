// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Habilitar SSR para rutas dinámicas
  integrations: [react()],
  server: {
    host: '0.0.0.0', // Permitir acceso desde cualquier IP
    port: 4321
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/uploads': {
          target: 'http://172.18.0.45:3000',
          changeOrigin: true
        }
      }
    }
  }
});