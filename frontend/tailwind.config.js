/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  safelist: [
    // Clases específicas para AcademicTemplate
    'bg-[#0E5088]',
    'text-balance',
    'text-pretty',
    'opacity-5',
    'text-white/90',
    // Patrones para clases dinámicas
    {
      pattern: /^bg-\[.*\]$/,
      variants: ['hover', 'focus', 'active']
    },
    {
      pattern: /^text-.*\/\d+$/,
      variants: ['hover', 'focus']
    }
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
