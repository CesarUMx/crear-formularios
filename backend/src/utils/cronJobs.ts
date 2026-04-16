import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Cron job para finalizar automáticamente intentos abandonados
 * Se ejecuta cada hora
 */
export function startAbandonedAttemptsCleanup(): void {
  // Ejecutar cada hora: */60 * * * *
  cron.schedule('*/60 * * * *', async () => {
    try {
      console.log('Verificando intentos abandonados...');
      
      // Buscar intentos no completados que hayan excedido el tiempo límite
      const now = new Date();
      
      const abandonedAttempts = await prisma.aIExamAttempt.findMany({
        where: {
          completedAt: null, // No completados
          startedAt: {
            lt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Más de 24 horas
          },
        },
        include: {
          aiExam: true,
        },
      });

      if (abandonedAttempts.length === 0) {
        console.log('No hay intentos abandonados');
        return;
      }

      console.log(`Encontrados ${abandonedAttempts.length} intentos abandonados`);

      // Finalizar cada intento abandonado
      for (const attempt of abandonedAttempts) {
        const timeLimit = attempt.aiExam.timeLimit || 60; // minutos
        const maxTime = new Date(attempt.startedAt.getTime() + timeLimit * 60 * 1000);
        
        // Si ya pasó el tiempo límite + 1 hora de gracia
        const graceTime = new Date(maxTime.getTime() + 60 * 60 * 1000);
        
        if (now > graceTime) {
          await prisma.aIExamAttempt.update({
            where: { id: attempt.id },
            data: {
              completedAt: maxTime, // Marcar como completado en el tiempo límite
              score: 0, // Puntuación 0 por abandono
              totalCorrect: 0,
              totalQuestions: (attempt.selectedQuestions as any)?.length || 0,
              passed: false,
            },
          });
          
          console.log(`Intento ${attempt.id} finalizado automáticamente (abandonado)`);
        }
      }
      
      console.log('Limpieza de intentos abandonados completada');
    } catch (error) {
      console.error('Error en cron job de intentos abandonados:', error);
    }
  });

  console.log('Cron job de intentos abandonados iniciado (cada hora)');
}

/**
 * Detener todos los cron jobs
 */
export function stopAllCronJobs(): void {
  cron.getTasks().forEach(task => task.stop());
  console.log('Todos los cron jobs detenidos');
}
