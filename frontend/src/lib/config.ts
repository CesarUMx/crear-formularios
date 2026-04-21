// Configuración centralizada
// En desarrollo usa variables de entorno (.env), en producción del servidor
const BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
export const API_URL = `${BASE_URL}/api`;
