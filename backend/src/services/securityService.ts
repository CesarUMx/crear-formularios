import { PrismaClient, SecurityEventType, SecurityResolveMethod, SecurityAttemptType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Genera un código de 4 dígitos único
 */
function generateUnlockCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Registra un evento de seguridad y genera código único
 */
export async function createSecurityEvent(data: {
  attemptId: string;
  attemptType: SecurityAttemptType;
  eventType: SecurityEventType;
  metadata?: any;
}) {
  const unlockCode = generateUnlockCode();
  
  const event = await prisma.securityEvent.create({
    data: {
      attemptId: data.attemptId,
      attemptType: data.attemptType,
      eventType: data.eventType,
      unlockCode,
      metadata: data.metadata || {},
    },
  });
  
  return event;
}

/**
 * Valida un código de desbloqueo
 */
export async function validateUnlockCode(attemptId: string, code: string) {
  // Buscar evento no resuelto con este código
  const event = await prisma.securityEvent.findFirst({
    where: {
      attemptId,
      unlockCode: code,
      resolved: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  if (!event) {
    return { valid: false, message: 'Código inválido o ya utilizado' };
  }
  
  // Marcar como resuelto
  await prisma.securityEvent.update({
    where: { id: event.id },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: SecurityResolveMethod.CODE_ENTRY,
    },
  });
  
  return { valid: true, message: 'Código validado correctamente', event };
}

/**
 * Obtiene eventos de seguridad pendientes para un examen específico
 */
export async function getPendingSecurityEvents(examId: string) {
  const events = await prisma.securityEvent.findMany({
    where: {
      resolved: false,
      examAttempt: {
        examId,
        completedAt: null, // Solo intentos activos
      },
    },
    include: {
      examAttempt: {
        select: {
          id: true,
          studentName: true,
          studentEmail: true,
          startedAt: true,
          tabSwitches: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  return events;
}

/**
 * Obtiene todos los eventos de seguridad de un intento (para historial)
 */
export async function getSecurityEventsByAttempt(attemptId: string) {
  const events = await prisma.securityEvent.findMany({
    where: {
      attemptId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
  
  return events;
}

/**
 * Concluye un examen remotamente (profesor)
 */
export async function forceCompleteAttempt(attemptId: string, professorId: string) {
  // Verificar que el intento existe y no está completado
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: true },
  });
  
  if (!attempt) {
    throw new Error('Intento no encontrado');
  }
  
  if (attempt.completedAt) {
    throw new Error('El examen ya está completado');
  }
  
  // Marcar como completado forzosamente
  const updated = await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      forceCompleted: true,
      forceCompletedBy: professorId,
      forceCompletedAt: new Date(),
    },
  });
  
  // Resolver todos los eventos de seguridad pendientes
  await prisma.securityEvent.updateMany({
    where: {
      attemptId,
      resolved: false,
    },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: SecurityResolveMethod.REMOTE_COMPLETION,
    },
  });
  
  return updated;
}

/**
 * Verifica si un intento fue concluido remotamente
 */
export async function checkForceCompletion(attemptId: string) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      forceCompleted: true,
      forceCompletedBy: true,
      forceCompletedAt: true,
    },
  });
  
  return {
    forceCompleted: attempt?.forceCompleted || false,
    forceCompletedBy: attempt?.forceCompletedBy,
    forceCompletedAt: attempt?.forceCompletedAt,
  };
}
