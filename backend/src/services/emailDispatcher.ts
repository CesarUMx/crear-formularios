/**
 * Despachador de emails condicionales.
 *
 * dispatchOnFormSubmit: envía los templates ON_FORM_SUBMIT cuyas condiciones se cumplen.
 * scheduleReminders:    crea EmailSendLog con status PENDING para los recordatorios.
 */

import { PrismaClient } from '@prisma/client';
import { evaluateEmailConditions } from './emailRuleEngine.js';
import type { CurrentAnswers } from '../utils/conditionalEngine.js';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// ────────────────────────────────────────────────────────────────────────────
// Transporter (reutiliza la configuración existente de emailService.ts)
// ────────────────────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────────────────────
// Variables de plantilla
// ────────────────────────────────────────────────────────────────────────────
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

function renderTemplate(html: string, vars: TemplateVars): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      result = result.replaceAll(`{{${key}}}`, value);
    }
  }
  return result;
}

function renderSubject(subject: string, vars: TemplateVars): string {
  return renderTemplate(subject, vars);
}

/** Construye las variables disponibles para un response + registro (si existe) */
async function buildTemplateVars(responseId: string): Promise<TemplateVars> {
  const response = await prisma.response.findUnique({
    where: { id: responseId },
    select: {
      folio: true,
      email: true,
      formId: true,
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

  let nombre = reg?.studentName ?? '';
  let email = reg?.studentEmail ?? response.email ?? '';

  // Si no hay registration, buscar nombre/email en answers usando emailQuestionId/nameQuestionId
  if (!reg) {
    const form = await prisma.form.findUnique({
      where: { id: response.formId },
      select: { emailQuestionId: true, nameQuestionId: true },
    });
    if (form) {
      if (form.emailQuestionId && !email) {
        const ans = await prisma.answer.findFirst({
          where: { responseId, questionId: form.emailQuestionId },
          select: { textValue: true },
        });
        email = ans?.textValue ?? '';
      }
      if (form.nameQuestionId && !nombre) {
        const ans = await prisma.answer.findFirst({
          where: { responseId, questionId: form.nameQuestionId },
          select: { textValue: true },
        });
        nombre = ans?.textValue ?? '';
      }
    }
  }

  return {
    nombre,
    email,
    folio: response.folio ?? '',
    nombreExamen: schedule?.exam?.title ?? '',
    fechaExamen: schedule ? fmt.format(new Date(schedule.startTime)) : '',
    horarioExamen: schedule?.title ?? '',
    lugarExamen: schedule?.location ?? '',
  };
}

/** Convierte respuestas del formulario al mapa que usa el conditional engine */
async function buildAnswersMap(responseId: string): Promise<CurrentAnswers> {
  const answers = await prisma.answer.findMany({
    where: { responseId },
    include: { selectedOptions: { select: { text: true } } },
  });

  const map: CurrentAnswers = {};
  for (const ans of answers) {
    if (ans.selectedOptions.length > 0) {
      map[ans.questionId] = ans.selectedOptions.map(o => o.text);
    } else if (ans.textValue) {
      map[ans.questionId] = ans.textValue;
    }
  }
  return map;
}

// ────────────────────────────────────────────────────────────────────────────
// Envío individual
// ────────────────────────────────────────────────────────────────────────────
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  templateId: string,
  responseId: string | null
): Promise<void> {
  const from = process.env.EMAIL_FROM || `Formularios UMx <${process.env.EMAIL_USER}>`;

  try {
    await transporter.sendMail({ from, to, subject, html });
    await prisma.emailSendLog.create({
      data: {
        templateId,
        responseId,
        recipientEmail: to,
        status: 'SENT',
      },
    });
  } catch (err: any) {
    await prisma.emailSendLog.create({
      data: {
        templateId,
        responseId,
        recipientEmail: to,
        status: 'FAILED',
        errorMessage: String(err?.message ?? err),
      },
    });
    // No re-lanzamos — errores de email no rompen el flujo principal
    console.error(`[EmailDispatcher] Error enviando email template=${templateId}:`, err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// API pública
// ────────────────────────────────────────────────────────────────────────────

/**
 * Envía todos los templates ON_FORM_SUBMIT cuyas condiciones se cumplen.
 * Llamar DESPUÉS de que la respuesta ya está guardada en la BD.
 */
export async function dispatchOnFormSubmit(responseId: string): Promise<void> {
  try {
    const response = await prisma.response.findUnique({
      where: { id: responseId },
      select: {
        formId: true,
        email: true,
        examRegistration: { select: { studentEmail: true } },
      },
    });
    if (!response) return;

    const templates = await prisma.emailTemplate.findMany({
      where: {
        formId: response.formId,
        isActive: true,
        rules: { some: { trigger: 'ON_FORM_SUBMIT' } },
      },
      include: { rules: true },
    });

    if (templates.length === 0) return;

    const [answers, vars] = await Promise.all([
      buildAnswersMap(responseId),
      buildTemplateVars(responseId),
    ]);

    // Primero intentar obtener email desde registration o campo email de la response
    let recipientEmail =
      response.examRegistration?.studentEmail ?? response.email ?? '';

    // Si no hay email, buscarlo en los answers usando emailQuestionId del formulario
    if (!recipientEmail) {
      const form = await prisma.form.findUnique({
        where: { id: response.formId },
        select: { emailQuestionId: true },
      });
      if (form?.emailQuestionId) {
        const emailAnswer = await prisma.answer.findFirst({
          where: { responseId, questionId: form.emailQuestionId },
          select: { textValue: true },
        });
        recipientEmail = emailAnswer?.textValue ?? '';
      }
    }

    if (!recipientEmail) return;

    for (const template of templates) {
      const onSubmitRules = template.rules.filter(r => r.trigger === 'ON_FORM_SUBMIT');
      if (onSubmitRules.length === 0) continue;

      // Si alguna regla ON_FORM_SUBMIT matchea → enviar
      const shouldSend = onSubmitRules.some(rule =>
        evaluateEmailConditions(rule.conditions as any, answers)
      );

      if (!shouldSend) continue;

      const subject = renderSubject(template.subject, vars);
      const html = renderTemplate(template.bodyHtml, vars);
      await sendEmail(recipientEmail, subject, html, template.id, responseId);
    }
  } catch (err) {
    console.error('[EmailDispatcher] Error en dispatchOnFormSubmit:', err);
  }
}

/**
 * Crea EmailSendLog PENDING para los recordatorios programados.
 * Solo aplica si hay un ExamRegistration con horario.
 */
export async function scheduleReminders(responseId: string): Promise<void> {
  try {
    const response = await prisma.response.findUnique({
      where: { id: responseId },
      select: {
        formId: true,
        email: true,
        examRegistration: {
          select: {
            studentEmail: true,
            createdAt: true,
            schedule: { select: { startTime: true } },
          },
        },
      },
    });
    if (!response) return;

    const reg = response.examRegistration;
    const recipientEmail = reg?.studentEmail ?? response.email ?? '';
    if (!recipientEmail) return;

    const templates = await prisma.emailTemplate.findMany({
      where: {
        formId: response.formId,
        isActive: true,
        rules: { some: { trigger: 'SCHEDULED_REMINDER' } },
      },
      include: { rules: true },
    });

    if (templates.length === 0) return;

    const answers = await buildAnswersMap(responseId);

    for (const template of templates) {
      const reminderRules = template.rules.filter(r => r.trigger === 'SCHEDULED_REMINDER');

      for (const rule of reminderRules) {
        if (!evaluateEmailConditions(rule.conditions as any, answers)) continue;

        const offsetMinutes = rule.reminderOffsetMinutes ?? 0;
        const anchor = rule.reminderAnchor ?? 'EXAM_SCHEDULE_START';

        let anchorDate: Date | null = null;
        if (anchor === 'EXAM_SCHEDULE_START' && reg?.schedule?.startTime) {
          anchorDate = new Date(reg.schedule.startTime);
        } else if (anchor === 'REGISTRATION_CREATED' && reg?.createdAt) {
          anchorDate = new Date(reg.createdAt);
        }

        if (!anchorDate) continue;

        const scheduledFor = new Date(
          anchorDate.getTime() + offsetMinutes * 60 * 1000
        );

        // No programar si ya pasó la fecha
        if (scheduledFor <= new Date()) continue;

        await prisma.emailSendLog.create({
          data: {
            templateId: template.id,
            responseId,
            recipientEmail,
            status: 'PENDING',
            scheduledFor,
          },
        });
      }
    }
  } catch (err) {
    console.error('[EmailDispatcher] Error en scheduleReminders:', err);
  }
}
