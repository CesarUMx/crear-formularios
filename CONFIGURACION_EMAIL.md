# 📧 Configuración de Envío de Emails

## ✅ Implementado

El sistema ahora envía emails automáticamente en dos situaciones:

1. **Al crear un usuario** → Email de bienvenida con credenciales
2. **Al resetear contraseña** → Email con la nueva contraseña

---

## 📦 Instalación

Primero, instala nodemailer:

```bash
cd backend
npm install nodemailer
```

---

## ⚙️ Configuración

### **Opción 1: Desarrollo con Ethereal Email (Recomendado para pruebas)**

Ethereal Email es un servicio GRATUITO para probar emails sin enviarlos realmente.

**Pasos:**

1. Ve a https://ethereal.email
2. Click en "Create Ethereal Account"
3. Copia las credenciales que te dan
4. Agrégalas a tu `.env`:

```env
ETHEREAL_USER="tu-usuario@ethereal.email"
ETHEREAL_PASS="tu-password-ethereal"
```

**Ventajas:**
- ✅ Gratis
- ✅ No necesitas configurar nada
- ✅ Puedes ver los emails en su web
- ✅ Perfecto para desarrollo

---

### **Opción 2: Gmail (Para producción)**

**Pasos:**

1. **Habilitar verificación en 2 pasos** en tu cuenta de Gmail
2. **Generar contraseña de aplicación:**
   - Ve a https://myaccount.google.com/apppasswords
   - Selecciona "Correo" y "Otro"
   - Copia la contraseña generada

3. **Configurar en `.env`:**

```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="tu-email@gmail.com"
EMAIL_PASS="tu-password-de-aplicacion"
EMAIL_FROM="Formularios UMx <noreply@umx.com>"
FRONTEND_URL="http://localhost:4321"
```

---

### **Opción 3: SendGrid (Recomendado para producción)**

SendGrid ofrece 100 emails gratis al día.

**Pasos:**

1. Crea cuenta en https://sendgrid.com
2. Genera una API Key
3. Configurar en `.env`:

```env
EMAIL_HOST="smtp.sendgrid.net"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="apikey"
EMAIL_PASS="tu-api-key-de-sendgrid"
EMAIL_FROM="Formularios UMx <noreply@umx.com>"
FRONTEND_URL="http://localhost:4321"
```

---

## 🧪 Probar el Sistema

### **1. Crear Usuario y Enviar Email:**

```bash
# Asegúrate de que el backend esté corriendo
cd backend
npm run dev
```

**Desde el frontend:**
1. Login como SUPER_ADMIN
2. Ve a "Gestión de Usuarios"
3. Click en "Nuevo Usuario"
4. Llena el formulario
5. Click en "Crear Usuario"

**Resultado:**
- Usuario creado ✅
- Email enviado ✅
- Verás en la consola del backend: "✅ Email de bienvenida enviado"

### **2. Ver el Email (Ethereal):**

Si usas Ethereal, verás en la consola:
```
📧 Ver email en: https://ethereal.email/message/xxxxx
```

Copia ese link y ábrelo en tu navegador para ver el email.

### **3. Resetear Contraseña:**

1. En gestión de usuarios, click en el icono de llave
2. Ingresa nueva contraseña
3. Click en "Resetear Contraseña"

**Resultado:**
- Contraseña actualizada ✅
- Email enviado al usuario ✅

---

## 📧 Contenido de los Emails

### **Email de Bienvenida:**

```
Asunto: ¡Bienvenido a Formularios UMx! 🎉

Contenido:
- Saludo personalizado
- Credenciales de acceso (email y contraseña)
- Advertencia de seguridad
- Botón para iniciar sesión
- Lista de funcionalidades
```

### **Email de Reseteo:**

```
Asunto: Tu contraseña ha sido actualizada 🔐

Contenido:
- Notificación del cambio
- Nueva contraseña temporal
- Advertencia de seguridad
- Botón para iniciar sesión
```

---

## 🎨 Diseño de los Emails

Los emails tienen:
- ✅ Diseño HTML responsive
- ✅ Colores corporativos (azul)
- ✅ Gradientes modernos
- ✅ Versión texto plano (fallback)
- ✅ Footer profesional

---

## 🔧 Personalización

### **Cambiar el diseño:**

Edita el archivo: `backend/src/utils/email.js`

### **Cambiar el remitente:**

```env
EMAIL_FROM="Tu Empresa <noreply@tuempresa.com>"
```

### **Cambiar la URL del frontend:**

```env
FRONTEND_URL="https://tudominio.com"
```

---

## ⚠️ Importante

### **Seguridad:**

1. ✅ **Nunca** subas tu `.env` a Git
2. ✅ Usa contraseñas de aplicación (no tu contraseña real)
3. ✅ En producción, usa un servicio profesional (SendGrid, AWS SES, etc.)

### **Límites:**

- **Gmail:** 500 emails/día (cuenta gratuita)
- **SendGrid:** 100 emails/día (plan gratuito)
- **Ethereal:** Ilimitado (pero no envía realmente)

### **Errores:**

Si el email falla:
- ✅ El usuario SE CREA de todas formas
- ✅ Se muestra un error en la consola
- ✅ No bloquea la operación

---

## 📝 Variables de Entorno

Copia estas variables a tu archivo `.env`:

```env
# Email Configuration
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
EMAIL_FROM="Formularios UMx <noreply@umx.com>"

# O para desarrollo con Ethereal
ETHEREAL_USER="your-ethereal-user@ethereal.email"
ETHEREAL_PASS="your-ethereal-password"

# Frontend URL
FRONTEND_URL="http://localhost:4321"
```

---

## 🚀 Próximos Pasos

**Funcionalidades adicionales que podrías agregar:**

1. Email de recuperación de contraseña (usuario olvidó su contraseña)
2. Email de notificación cuando alguien responde un formulario
3. Email de resumen semanal de respuestas
4. Email de invitación para compartir formularios
5. Templates personalizables desde el admin

---

## 🐛 Solución de Problemas

### **Error: "Invalid login"**
- Verifica que las credenciales en `.env` sean correctas
- Si usas Gmail, asegúrate de usar contraseña de aplicación

### **Error: "Connection timeout"**
- Verifica el puerto (587 para TLS, 465 para SSL)
- Verifica que tu firewall permita conexiones SMTP

### **No veo el email**
- Si usas Ethereal, busca el link en la consola
- Si usas Gmail, revisa spam
- Verifica que el email del usuario sea correcto

---

## ✅ Checklist

- [ ] Instalar nodemailer
- [ ] Configurar variables de entorno
- [ ] Probar crear usuario
- [ ] Verificar que llegue el email
- [ ] Probar resetear contraseña
- [ ] Verificar que llegue el email de reseteo
- [ ] Revisar diseño del email
- [ ] Configurar servicio de producción (opcional)

---

## 📚 Recursos

- **Nodemailer:** https://nodemailer.com
- **Ethereal Email:** https://ethereal.email
- **Gmail App Passwords:** https://myaccount.google.com/apppasswords
- **SendGrid:** https://sendgrid.com
- **AWS SES:** https://aws.amazon.com/ses/
