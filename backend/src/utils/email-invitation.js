import nodemailer from 'nodemailer';

/**
 * Configurar transporter de nodemailer
 */
const createTransporter = () => {
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
  } else {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_USER || 'your-ethereal-user@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'your-ethereal-password',
      },
    });
  }
};

/**
 * Enviar invitación a examen privado
 */
export const sendExamInvitation = async (studentEmail, studentName, examTitle, examUrl, password) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Forms - Exámenes IA" <noreply@mail.com>',
      to: studentEmail,
      subject: `Invitación al Examen: ${examTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .credentials {
              background: white;
              border: 2px solid #9333ea;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .credential-item {
              margin: 10px 0;
              padding: 10px;
              background: #faf5ff;
              border-radius: 5px;
            }
            .credential-label {
              font-weight: bold;
              color: #7e22ce;
              display: block;
              margin-bottom: 5px;
            }
            .credential-value {
              font-family: monospace;
              font-size: 16px;
              color: #333;
            }
            .button {
              display: inline-block;
              background: #9333ea;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">Invitación a Examen</h1>
          </div>
          
          <div class="content">
            <p>Hola <strong>${studentName}</strong>,</p>
            
            <p>Has sido invitado a realizar el siguiente examen:</p>
            
            <h2 style="color: #7e22ce; margin: 20px 0;">${examTitle}</h2>
            
            <div class="credentials">
              <h3 style="margin-top: 0; color: #7e22ce;">Tus Credenciales de Acceso</h3>
              
              <div class="credential-item">
                <span class="credential-label">Correo Electrónico:</span>
                <span class="credential-value">${studentEmail}</span>
              </div>
              
              <div class="credential-item">
                <span class="credential-label">Contraseña:</span>
                <span class="credential-value">${password}</span>
              </div>
            </div>
            
            <div class="warning">
              <strong>Importante:</strong> Guarda estas credenciales en un lugar seguro. Las necesitarás para acceder al examen.
            </div>
            
            <div style="text-align: center;">
              <a href="${examUrl}" class="button">
                Acceder al Examen
              </a>
            </div>
            
            <p style="margin-top: 30px;">
              <strong>Instrucciones:</strong>
            </p>
            <ol>
              <li>Haz clic en el botón "Acceder al Examen" o copia este link: <br><code>${examUrl}</code></li>
              <li>Ingresa tu correo electrónico y contraseña</li>
              <li>Lee las instrucciones del examen cuidadosamente</li>
              <li>Responde todas las preguntas antes de enviar</li>
            </ol>
            
            <p style="margin-top: 30px;">¡Buena suerte!</p>
          </div>
          
          <div class="footer">
            <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
            <p>© ${new Date().getFullYear()} Forms - Sistema de Exámenes con IA</p>
          </div>
        </body>
        </html>
      `,
      text: `
Hola ${studentName},

Has sido invitado a realizar el examen: ${examTitle}

Tus credenciales de acceso:
- Email: ${studentEmail}
- Contraseña: ${password}

Link del examen: ${examUrl}

Instrucciones:
1. Accede al link del examen
2. Ingresa tu correo y contraseña
3. Lee las instrucciones cuidadosamente
4. Responde todas las preguntas antes de enviar

Buena suerte!
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email de invitación enviado:', info.messageId);
    
    if (process.env.NODE_ENV !== 'production' && !process.env.EMAIL_HOST) {
      console.log('Ver email en:', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('Error al enviar invitación:', error);
    throw new Error('No se pudo enviar la invitación por email');
  }
};
