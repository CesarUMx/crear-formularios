/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/types.ts',
        'src/**/*.astro',
      ],
      thresholds: {
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50,
      },
    },
  },
});
