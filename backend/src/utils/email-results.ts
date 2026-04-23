import nodemailer, { Transporter, SendMailOptions, SentMessageInfo } from 'nodemailer';

/**
 * Configurar transporter de nodemailer (mismo criterio que email-invitation.ts)
 */
const createTransporter = (): Transporter => {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: process.env.ETHEREAL_USER || 'your-ethereal-user@ethereal.email',
      pass: process.env.ETHEREAL_PASS || 'your-ethereal-password',
    },
  });
};

export interface ExamResultEmailData {
  studentName: string;
  studentEmail: string;
  examTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  passingScore: number;
  passed: boolean | null;
  requiresManualGrading: boolean;
  completedAt: Date | string | null;
  timeSpent?: number | null;
  resultUrl?: string;
}

function formatTime(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Enviar correo con resultados de un intento de examen
 */
export const sendExamResults = async (
  data: ExamResultEmailData
): Promise<SentMessageInfo> => {
  const transporter = createTransporter();

  const {
    studentName,
    studentEmail,
    examTitle,
    score,
    maxScore,
    percentage,
    passingScore,
    passed,
    requiresManualGrading,
    completedAt,
    timeSpent,
    resultUrl,
  } = data;

  const pendingManual = requiresManualGrading || passed === null || passed === undefined;

  // Colores e icono según estado
  let statusColor = '#6b7280'; // gris
  let statusBg = '#f3f4f6';
  let statusLabel = 'Pendiente de calificación';
  let statusIcon = '⏳';
  if (!pendingManual) {
    if (passed) {
      statusColor = '#16a34a';
      statusBg = '#dcfce7';
      statusLabel = 'Aprobado';
      statusIcon = '✅';
    } else {
      statusColor = '#dc2626';
      statusBg = '#fee2e2';
      statusLabel = 'No aprobado';
      statusIcon = '❌';
    }
  }

  const pct = Number.isFinite(percentage) ? percentage.toFixed(1) : '0.0';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #111827; max-width: 640px; margin: 0 auto; padding: 20px; background: #f9fafb; }
        .card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #fff; padding: 28px; text-align: center; }
        .header h1 { margin: 0 0 4px; font-size: 22px; }
        .header p { margin: 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 28px; }
        .status { display: inline-block; padding: 8px 16px; border-radius: 999px; font-weight: bold; font-size: 14px; color: ${statusColor}; background: ${statusBg}; margin-bottom: 20px; }
        .metrics { display: table; width: 100%; border-collapse: separate; border-spacing: 8px; margin: 16px 0 24px; }
        .metric { display: table-cell; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; text-align: center; width: 33%; }
        .metric-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .metric-value { font-size: 20px; font-weight: bold; color: #111827; }
        .big-pct { font-size: 40px; font-weight: bold; color: ${statusColor}; text-align: center; margin: 8px 0; }
        .meta { font-size: 13px; color: #4b5563; line-height: 1.7; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 8px; }
        .meta strong { color: #111827; }
        .cta { text-align: center; margin-top: 24px; }
        .cta a { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; }
        .notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px; margin-top: 16px; font-size: 13px; color: #92400e; }
        .footer { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>${examTitle}</h1>
          <p>Resumen de resultados</p>
        </div>
        <div class="content">
          <p>Hola <strong>${studentName}</strong>,</p>
          <p>Estos son los resultados de tu examen:</p>

          <div class="status">${statusIcon} ${statusLabel}</div>
          <div class="big-pct">${pct}%</div>

          <div class="metrics">
            <div class="metric">
              <div class="metric-label">Puntaje</div>
              <div class="metric-value">${score} / ${maxScore}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Mínimo</div>
              <div class="metric-value">${passingScore}%</div>
            </div>
            <div class="metric">
              <div class="metric-label">Tiempo</div>
              <div class="metric-value">${formatTime(timeSpent)}</div>
            </div>
          </div>

          <div class="meta">
            <div><strong>Fecha:</strong> ${formatDate(completedAt)}</div>
            <div><strong>Correo:</strong> ${studentEmail}</div>
          </div>

          ${pendingManual ? `
            <div class="notice">
              <strong>Importante:</strong> Este examen contiene preguntas abiertas pendientes de revisión manual.
              La calificación mostrada es tentativa y puede cambiar cuando el profesor termine la revisión.
            </div>
          ` : ''}

          ${resultUrl ? `
            <div class="cta">
              <a href="${resultUrl}">Ver resultados detallados</a>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="footer">Este es un mensaje automático, por favor no respondas a este correo.</div>
    </body>
    </html>
  `;

  const text = `
Hola ${studentName},

Resultados del examen: ${examTitle}

Estado: ${statusLabel}
Puntaje: ${score} / ${maxScore} (${pct}%)
Mínimo requerido: ${passingScore}%
Tiempo: ${formatTime(timeSpent)}
Fecha: ${formatDate(completedAt)}
${pendingManual ? '\nEste examen contiene preguntas pendientes de revisión manual. La calificación puede cambiar.\n' : ''}
${resultUrl ? `\nVer resultados: ${resultUrl}\n` : ''}
  `.trim();

  const mailOptions: SendMailOptions = {
    from: process.env.EMAIL_FROM || '"Forms - Exámenes" <noreply@mail.com>',
    to: studentEmail,
    subject: `Resultados: ${examTitle}`,
    html,
    text,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Email de resultados enviado:', info.messageId);

  if (process.env.NODE_ENV !== 'production' && !process.env.EMAIL_HOST) {
    console.log('Ver email en:', nodemailer.getTestMessageUrl(info));
  }

  return info;
};
