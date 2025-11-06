/**
 * Utilidades para el manejo de fechas
 */

/**
 * Formatea una fecha en formato ISO a un formato legible
 * @param dateString Fecha en formato ISO
 * @returns Fecha formateada
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Formatea una fecha en formato ISO a solo la fecha (sin hora)
 * @param dateString Fecha en formato ISO
 * @returns Fecha formateada sin hora
 */
export function formatDateOnly(dateString: string): string {
  const date = new Date(dateString);
  
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

/**
 * Formatea una fecha en formato ISO a solo la hora
 * @param dateString Fecha en formato ISO
 * @returns Hora formateada
 */
export function formatTimeOnly(dateString: string): string {
  const date = new Date(dateString);
  
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Obtiene la fecha actual en formato ISO
 * @returns Fecha actual en formato ISO
 */
export function getCurrentDate(): string {
  return new Date().toISOString();
}

/**
 * Calcula la diferencia en días entre dos fechas
 * @param date1 Primera fecha
 * @param date2 Segunda fecha (por defecto es la fecha actual)
 * @returns Número de días de diferencia
 */
export function daysBetween(date1: string | Date, date2: string | Date = new Date()): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  // Convertir a días
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Formatea una fecha relativa (hace X días, hace X horas, etc.)
 * @param dateString Fecha en formato ISO
 * @returns Texto con la fecha relativa
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 30) {
    return formatDate(dateString);
  } else if (diffDay > 0) {
    return `hace ${diffDay} ${diffDay === 1 ? 'día' : 'días'}`;
  } else if (diffHour > 0) {
    return `hace ${diffHour} ${diffHour === 1 ? 'hora' : 'horas'}`;
  } else if (diffMin > 0) {
    return `hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
  } else {
    return 'hace unos segundos';
  }
}
