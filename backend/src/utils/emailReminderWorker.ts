/**
 * Worker cron para enviar recordatorios de email programados.
 * Se ejecuta cada minuto y procesa los EmailSendLog con status=PENDING y scheduledFor <= NOW().
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

interface TemplateVars {
  nombre?: string;
  email?: string;
  folio?: string;
  fechaExamen?: string;
  horarioExamen?: string;
  lugarExamen?: string;
  nombreExamen?: string;
  [key: string]: string | undefined;
}

function renderTemplate(text: string, vars: TemplateVars): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      result = result.replaceAll(`{{${key}}}`, value);
    }
  }
  return result;
}

async function buildTemplateVars(responseId: string | null): Promise<TemplateVars> {
  if (!responseId) return {};

  const response = await prisma.response.findUnique({
    where: { id: responseId },
    select: {
      folio: true,
      email: true,
      examRegistration: {
        select: {
          studentName: true,
          studentEmail: true,
          schedule: {
            select: {
              title: true,
              startTime: true,
              location: true,
              exam: { select: { title: true } },
            },
          },
        },
      },
    },
  });

  if (!response) return {};

  const reg = response.examRegistration;
  const schedule = reg?.schedule;
  const tz = 'America/Mexico_City';
  const fmt = new Intl.DateTimeFormat('es-MX', {
    timeZone: tz,
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return {
    nombre: reg?.studentName ?? '',
    email: reg?.studentEmail ?? response.email ?? '',
    folio: response.folio ?? '',
    nombreExamen: schedule?.exam?.title ?? '',
    fechaExamen: schedule ? fmt.format(new Date(schedule.startTime)) : '',
    horarioExamen: schedule?.title ?? '',
    lugarExamen: schedule?.location ?? '',
  };
}

async function processPendingReminders(): Promise<void> {
  const now = new Date();

  const pending = await prisma.emailSendLog.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: now },
    },
    include: {
      template: { select: { subject: true, bodyHtml: true } },
    },
    take: 100,
    orderBy: { scheduledFor: 'asc' },
  });

  if (pending.length === 0) return;

  console.log(`[EmailWorker] Procesando ${pending.length} recordatorio(s)...`);

  for (const log of pending) {
    try {
      const vars = await buildTemplateVars(log.responseId);
      const subject = renderTemplate(log.template.subject, vars);
      const html = renderTemplate(log.template.bodyHtml, vars);
      const from = process.env.EMAIL_FROM || `Formularios UMx <${process.env.EMAIL_USER}>`;

      await transporter.sendMail({
        from,
        to: log.recipientEmail,
        subject,
        html,
      });

      await prisma.emailSendLog.update({
        where: { id: log.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (err: any) {
      await prisma.emailSendLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          errorMessage: String(err?.message ?? err),
        },
      });
      console.error(`[EmailWorker] Error enviando log ${log.id}:`, err);
    }
  }
}

export function startEmailReminderWorker(): void {
  // Ejecutar cada minuto
  cron.schedule('* * * * *', () => {
    processPendingReminders().catch(err => {
      console.error('[EmailWorker] Error en worker:', err);
    });
  });

  console.log('[EmailWorker] Worker de recordatorios iniciado (cada minuto)');
}
