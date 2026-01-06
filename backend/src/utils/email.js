import nodemailer from 'nodemailer';

/**
 * Configurar transporter de nodemailer
 */
const createTransporter = () => {
  // Para desarrollo, usar ethereal.email (emails de prueba)
  // Para producción, configurar con tu servicio de email real
  
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Configuración de producción
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
    // Configuración de desarrollo (ethereal.email)
    // Los emails se pueden ver en https://ethereal.email
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
 * Enviar email de bienvenida con credenciales
 */
export const sendWelcomeEmail = async (userEmail, userName, password) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Forms" <noreply@mail.com>',
      to: userEmail,
      subject: '¡Bienvenido a Forms! 🎉',
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
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
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
            .credentials-box {
              background: white;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .credential-item {
              margin: 10px 0;
              padding: 10px;
              background: #f3f4f6;
              border-radius: 5px;
            }
            .credential-label {
              font-weight: bold;
              color: #6b7280;
              font-size: 12px;
              text-transform: uppercase;
            }
            .credential-value {
              font-size: 16px;
              color: #1f2937;
              font-family: monospace;
              margin-top: 5px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 8px;
              margin: 20px 0;
              font-weight: bold;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>¡Bienvenido a Forms!</h1>
            <p>Tu cuenta ha sido creada exitosamente</p>
          </div>
          
          <div class="content">
            <p>Hola <strong>${userName}</strong>,</p>
            
            <p>Tu cuenta de administrador ha sido creada en la plataforma de Forms. A continuación encontrarás tus credenciales de acceso:</p>
            
            <div class="credentials-box">
              <div class="credential-item">
                <div class="credential-label">Email / Usuario</div>
                <div class="credential-value">${userEmail}</div>
              </div>
              
              <div class="credential-item">
                <div class="credential-label">Contraseña Temporal</div>
                <div class="credential-value">${password}</div>
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña después de tu primer inicio de sesión.
            </div>
            
            <center>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:4321'}" class="button">
                Iniciar Sesión
              </a>
            </center>
            
            <h3>¿Qué puedes hacer en la plataforma?</h3>
            <ul>
              <li>📋 Crear y gestionar formularios</li>
              <li>📊 Ver respuestas y estadísticas</li>
              <li>🔗 Compartir formularios con otros usuarios</li>
              <li>⚙️ Personalizar tus formularios</li>
            </ul>
            
            <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.</p>
            
            <p>¡Bienvenido al equipo!</p>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 - Plataforma de Formularios</p>
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        ¡Bienvenido a Forms!
        
        Hola ${userName},
        
        Tu cuenta de administrador ha sido creada en la plataforma de Formularios.
        
        Tus credenciales de acceso:
        Email: ${userEmail}
        Contraseña: ${password}
        
        Por seguridad, te recomendamos cambiar tu contraseña después de tu primer inicio de sesión.
        
        Accede a la plataforma en: ${process.env.FRONTEND_URL || 'http://localhost:4321'}
        
        ¡Bienvenido al equipo!
        
        © 2025 - Plataforma de Formularios
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email de bienvenida enviado:', info.messageId);
    
    // Si estás usando ethereal.email, muestra el link para ver el email
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Ver email en:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Enviar email de reseteo de contraseña
 */
export const sendPasswordResetEmail = async (userEmail, userName, newPassword) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Forms" <noreply@mail.com>',
      to: userEmail,
      subject: 'Tu contraseña ha sido actualizada 🔐',
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
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
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
            .credentials-box {
              background: white;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .credential-value {
              font-size: 18px;
              color: #1f2937;
              font-family: monospace;
              background: #f3f4f6;
              padding: 15px;
              border-radius: 5px;
              text-align: center;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 8px;
              margin: 20px 0;
              font-weight: bold;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Contraseña Actualizada</h1>
          </div>
          
          <div class="content">
            <p>Hola <strong>${userName}</strong>,</p>
            
            <p>Un administrador ha actualizado tu contraseña. Tu nueva contraseña temporal es:</p>
            
            <div class="credentials-box">
              <div class="credential-value">${newPassword}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Por seguridad, te recomendamos cambiar esta contraseña después de iniciar sesión.
            </div>
            
            <center>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:4321'}" class="button">
                Iniciar Sesión
              </a>
            </center>
            
            <p>Si no solicitaste este cambio, contacta inmediatamente al administrador del sistema.</p>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 - Plataforma de Formularios</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Contraseña Actualizada
        
        Hola ${userName},
        
        Un administrador ha actualizado tu contraseña.
        
        Tu nueva contraseña temporal es: ${newPassword}
        
        Por seguridad, te recomendamos cambiar esta contraseña después de iniciar sesión.
        
        Accede a la plataforma en: ${process.env.FRONTEND_URL || 'http://localhost:4321'}
        
        © 2025 - Plataforma de Formularios
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email de reseteo enviado:', info.messageId);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Ver email en:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    return { success: false, error: error.message };
  }
};
