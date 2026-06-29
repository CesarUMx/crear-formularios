import nodemailer from 'nodemailer';

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

export interface ExamCredentialsEmailData {
  to: string;
  studentName: string;
  examTitle: string;
  examUrl: string;
  password: string;
  scheduleTitle: string;
  scheduleDate: string;
  scheduleLocation: string | null;
}

/**
 * Enviar email con credenciales de acceso al examen
 */
export const sendExamCredentialsEmail = async (data: ExamCredentialsEmailData): Promise<void> => {
  const from = process.env.EMAIL_FROM || `Formularios UMx <${process.env.EMAIL_USER}>`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acceso al Examen</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <div style="background: #4f46e5; padding: 32px 40px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Registro Confirmado</h1>
      <p style="color: #c7d2fe; margin: 8px 0 0 0; font-size: 14px;">${data.examTitle}</p>
    </div>

    <div style="padding: 32px 40px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">Hola <strong>${data.studentName}</strong>,</p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 24px 0;">
        Tu registro ha sido confirmado. Aqui estan tus credenciales de acceso:
      </p>

      <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 120px;">Correo:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: bold;">${data.to}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Contrasena:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: bold; font-family: monospace; letter-spacing: 2px;">${data.password}</td>
          </tr>
        </table>
      </div>

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="color: #1e40af; font-size: 13px; font-weight: bold; margin: 0 0 8px 0;">Detalles del horario</p>
        <p style="color: #1d4ed8; font-size: 14px; margin: 0 0 4px 0;">${data.scheduleTitle}</p>
        <p style="color: #3b82f6; font-size: 13px; margin: 0 0 4px 0;">${data.scheduleDate}</p>
        ${data.scheduleLocation ? `<p style="color: #3b82f6; font-size: 13px; margin: 0;">${data.scheduleLocation}</p>` : ''}
      </div>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${data.examUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: bold;">
          Ir al Examen
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
        Guarda este correo con tus credenciales. Las necesitaras el dia del examen.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from,
    to: data.to,
    subject: `Acceso confirmado: ${data.examTitle}`,
    html,
  });
};
