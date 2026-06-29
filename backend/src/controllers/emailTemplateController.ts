import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ────────────────────────────────────────────────────────────────────────────
// GET /api/forms/:formId/email-templates
// ────────────────────────────────────────────────────────────────────────────
export const listTemplates = async (req: Request, res: Response): Promise<void> => {
  const formId = req.params.formId as string;

  const templates = await prisma.emailTemplate.findMany({
    where: { formId },
    include: { rules: true },
    orderBy: { createdAt: 'asc' },
  });

  res.json(templates);
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/forms/:formId/email-templates
// ────────────────────────────────────────────────────────────────────────────
export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  const formId = req.params.formId as string;
  const { name, subject, bodyHtml, isActive, rules } = req.body;

  if (!name || !subject || !bodyHtml) {
    res.status(400).json({ error: 'name, subject y bodyHtml son requeridos' });
    return;
  }

  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (!form) {
    res.status(404).json({ error: 'Formulario no encontrado' });
    return;
  }

  const template = await prisma.emailTemplate.create({
    data: {
      formId,
      name,
      subject,
      bodyHtml,
      isActive: isActive ?? true,
      rules: rules
        ? {
            create: rules.map((r: any) => ({
              trigger: r.trigger,
              conditions: r.conditions ?? null,
              reminderOffsetMinutes: r.reminderOffsetMinutes ?? null,
              reminderAnchor: r.reminderAnchor ?? null,
            })),
          }
        : undefined,
    },
    include: { rules: true },
  });

  res.status(201).json(template);
};

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/email-templates/:id
// ────────────────────────────────────────────────────────────────────────────
export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { name, subject, bodyHtml, isActive, rules } = req.body;

  const existing = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Template no encontrado' });
    return;
  }

  // Reemplazar reglas: eliminar las viejas y crear las nuevas
  const template = await prisma.$transaction(async (tx) => {
    if (rules !== undefined) {
      await tx.emailRule.deleteMany({ where: { templateId: id } });
    }

    return tx.emailTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        ...(bodyHtml !== undefined && { bodyHtml }),
        ...(isActive !== undefined && { isActive }),
        ...(rules !== undefined && {
          rules: {
            create: rules.map((r: any) => ({
              trigger: r.trigger,
              conditions: r.conditions ?? null,
              reminderOffsetMinutes: r.reminderOffsetMinutes ?? null,
              reminderAnchor: r.reminderAnchor ?? null,
            })),
          },
        }),
      },
      include: { rules: true },
    });
  });

  res.json(template);
};

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/email-templates/:id
// ────────────────────────────────────────────────────────────────────────────
export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const existing = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Template no encontrado' });
    return;
  }

  await prisma.emailTemplate.delete({ where: { id } });
  res.json({ message: 'Template eliminado' });
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/forms/:formId/email-templates/logs
// ────────────────────────────────────────────────────────────────────────────
export const listLogs = async (req: Request, res: Response): Promise<void> => {
  const formId = req.params.formId as string;
  const status = req.query.status as string | undefined;
  const templateId = req.query.templateId as string | undefined;
  const page = Number(req.query.page ?? '1');
  const limit = Number(req.query.limit ?? '50');

  const skip = (page - 1) * limit;

  const where: any = {
    template: { formId },
    ...(status && { status }),
    ...(templateId && { templateId }),
  };

  const [logs, total] = await Promise.all([
    prisma.emailSendLog.findMany({
      where,
      include: {
        template: { select: { name: true } },
      },
      orderBy: { sentAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.emailSendLog.count({ where }),
  ]);

  res.json({ logs, total, page, limit });
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/email-templates/:id/test
// Envía un email de prueba al email del usuario autenticado
// ────────────────────────────────────────────────────────────────────────────
export const testTemplate = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { testEmail } = req.body;

  const toEmail = testEmail || req.user?.email;
  if (!toEmail) {
    res.status(400).json({ error: 'Se requiere testEmail o usuario autenticado' });
    return;
  }

  const template = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!template) {
    res.status(404).json({ error: 'Template no encontrado' });
    return;
  }

  // Renderizar con variables de ejemplo
  const exampleVars: Record<string, string> = {
    nombre: 'Estudiante Ejemplo',
    email: toEmail,
    folio: 'RES-20260527-DEMO',
    nombreExamen: 'Examen de Ejemplo',
    fechaExamen: new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date()),
    horarioExamen: 'Sesión Matutina',
    lugarExamen: 'Sala 101',
  };

  let subject = template.subject;
  let html = template.bodyHtml;
  for (const [key, value] of Object.entries(exampleVars)) {
    subject = subject.replaceAll(`{{${key}}}`, value);
    html = html.replaceAll(`{{${key}}}`, value);
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });

  const from = process.env.EMAIL_FROM || `Formularios UMx <${process.env.EMAIL_USER}>`;
  await transporter.sendMail({ from, to: toEmail, subject, html });

  res.json({ message: `Email de prueba enviado a ${toEmail}` });
};
