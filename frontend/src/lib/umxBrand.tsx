// Identidad visual institucional de Universidad Mondragón México (UMx).
// Se usa en las pantallas públicas de examen (normal e IA) para mantener
// colores y tipografía de marca sin alterar el diseño existente.

export const UMX_BRAND = {
  primaryColor: '#FF4D00',   // Naranja institucional
  secondaryColor: '#0E5088', // Azul institucional
  accentColor: '#F3530E',
  fontFamily: 'Poppins, sans-serif',
};

/**
 * Inyecta la fuente Poppins de Google Fonts una sola vez.
 * Renderizar al inicio de la pantalla de examen.
 */
export function UmxBrandFont() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
    />
  );
}
