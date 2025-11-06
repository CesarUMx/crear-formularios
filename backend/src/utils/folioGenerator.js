/**
 * Utilidad para generar folios únicos para respuestas
 */

/**
 * Genera un folio único para una respuesta
 * Formato: UMX-YYYYMMDD-XXXX-Z
 * Donde:
 * - UMX: Prefijo constante
 * - YYYYMMDD: Fecha actual
 * - XXXX: 4 caracteres aleatorios (alfanuméricos)
 * - Z: Último carácter del ID del formulario
 * 
 * @param {string} formId - ID del formulario
 * @returns {string} Folio único
 */
export function generateResponseFolio(formId) {
  // Obtener fecha actual en formato YYYYMMDD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Generar 4 caracteres aleatorios (alfanuméricos)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluimos caracteres confusos como I, O, 0, 1
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Obtener último carácter del ID del formulario
  const formSuffix = formId.slice(-1).toUpperCase();
  
  // Construir y retornar el folio
  return `UMX-${dateStr}-${random}-${formSuffix}`;
}

/**
 * Valida si un folio tiene el formato correcto
 * 
 * @param {string} folio - Folio a validar
 * @returns {boolean} true si el formato es válido
 */
export function validateFolio(folio) {
  // Formato esperado: UMX-YYYYMMDD-XXXX-Z
  const regex = /^UMX-\d{8}-[A-Z0-9]{4}-[A-Z0-9]$/;
  return regex.test(folio);
}