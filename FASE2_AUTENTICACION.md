# ✅ FASE 2: Sistema de Autenticación - COMPLETADA

## 🎯 Lo que se implementó

### **Backend**
- ✅ Utilidades JWT (generación y verificación de tokens)
- ✅ Utilidades de contraseñas (hash con bcrypt)
- ✅ Middleware de autenticación
- ✅ Servicios de autenticación (login, register, profile)
- ✅ Controladores de autenticación
- ✅ Rutas de autenticación
- ✅ Script para crear Super Admin

### **Frontend**
- ✅ Cliente API con TypeScript
- ✅ Servicio de autenticación
- ✅ Componente de Login con formulario
- ✅ Componente de menú de usuario
- ✅ Componente para proteger rutas
- ✅ Página de login
- ✅ Página de admin protegida

---

## 🚀 Cómo Probar

### **1. Configurar Backend**

```bash
cd backend

# Agregar JWT_SECRET al .env (si no lo has hecho)
echo 'JWT_SECRET=mi-secreto-super-seguro-123' >> .env

# Crear Super Admin
npm run create-admin
# O con datos personalizados:
# npm run create-admin admin@umx.com miPassword123 "Mi Nombre"

# Iniciar servidor
npm run dev
```

### **2. Configurar Frontend**

```bash
cd frontend

# Verificar que .env tenga la URL correcta
cat .env
# Debe contener: PUBLIC_API_URL=http://localhost:3000/api

# Iniciar servidor
npm run dev
```

### **3. Probar en el Navegador**

1. **Abrir el frontend**: http://localhost:4321

2. **Ir a Login**: http://localhost:4321/login

3. **Credenciales por defecto**:
   - Email: `admin@umx.com`
   - Password: `admin123`

4. **Después del login**:
   - Serás redirigido a `/admin`
   - Verás tu nombre en la esquina superior derecha
   - Click en tu avatar para ver el menú

5. **Probar logout**:
   - Click en tu avatar → "Cerrar Sesión"
   - Serás redirigido a `/login`

---

## 📡 Endpoints Disponibles

### **Autenticación**

#### **POST /api/auth/register**
Registrar nuevo usuario (solo SUPER_ADMIN puede crear otros SUPER_ADMIN)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo@umx.com",
    "password": "password123",
    "name": "Nuevo Usuario",
    "role": "ADMIN"
  }'
```

#### **POST /api/auth/login**
Iniciar sesión

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@umx.com",
    "password": "admin123"
  }'
```

Respuesta:
```json
{
  "message": "Login exitoso",
  "user": {
    "id": "clx...",
    "email": "admin@umx.com",
    "name": "Super Admin",
    "role": "SUPER_ADMIN",
    "isActive": true,
    "createdAt": "2025-11-05T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### **GET /api/auth/profile**
Obtener perfil del usuario autenticado

```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

#### **PUT /api/auth/profile**
Actualizar perfil

```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nuevo Nombre",
    "email": "nuevo@email.com"
  }'
```

#### **POST /api/auth/change-password**
Cambiar contraseña

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "nuevaPassword456"
  }'
```

#### **POST /api/auth/logout**
Cerrar sesión (el cliente debe eliminar el token)

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

---

## 🔐 Seguridad Implementada

### **Backend**
- ✅ Contraseñas hasheadas con bcrypt (10 rounds)
- ✅ Tokens JWT con expiración (7 días por defecto)
- ✅ Middleware de autenticación en rutas protegidas
- ✅ Middleware para verificar rol SUPER_ADMIN
- ✅ Validación de datos de entrada
- ✅ Manejo de errores centralizado

### **Frontend**
- ✅ Token almacenado en localStorage
- ✅ Verificación de autenticación en rutas protegidas
- ✅ Redirección automática a login si no está autenticado
- ✅ Menú de usuario con información del rol
- ✅ Logout seguro (elimina token y redirige)

---

## 📂 Estructura de Archivos Creados

### **Backend**
```
backend/src/
├── utils/
│   ├── jwt.js              # Generación y verificación de tokens
│   └── password.js         # Hash y comparación de contraseñas
├── middleware/
│   └── auth.js             # Middleware de autenticación
├── services/
│   └── authService.js      # Lógica de negocio
├── controllers/
│   └── authController.js   # Controladores de endpoints
├── routes/
│   └── authRoutes.js       # Rutas de autenticación
└── scripts/
    └── createSuperAdmin.js # Script para crear admin
```

### **Frontend**
```
frontend/src/
├── lib/
│   ├── api.ts              # Cliente API con TypeScript
│   └── auth.ts             # Servicio de autenticación
├── components/
│   ├── LoginForm.tsx       # Formulario de login
│   ├── UserMenu.tsx        # Menú de usuario
│   └── ProtectedRoute.tsx  # HOC para proteger rutas
└── pages/
    ├── login.astro         # Página de login
    └── admin.astro         # Página de admin (protegida)
```

---

## 🎨 Características del Frontend

### **Página de Login**
- ✅ Formulario con validación
- ✅ Iconos de Lucide React
- ✅ Mensajes de error claros
- ✅ Loading state durante login
- ✅ Diseño responsive con Tailwind CSS

### **Menú de Usuario**
- ✅ Avatar con inicial del nombre
- ✅ Dropdown con opciones
- ✅ Muestra nombre, email y rol
- ✅ Links a perfil y configuración
- ✅ Botón de logout

### **Protección de Rutas**
- ✅ Verifica autenticación automáticamente
- ✅ Redirige a login si no está autenticado
- ✅ Puede requerir rol SUPER_ADMIN
- ✅ Loading state mientras verifica

---

## 🧪 Casos de Prueba

### **1. Login Exitoso**
- ✅ Ingresar credenciales correctas
- ✅ Recibir token
- ✅ Redirigir a /admin
- ✅ Ver menú de usuario

### **2. Login Fallido**
- ✅ Ingresar credenciales incorrectas
- ✅ Ver mensaje de error
- ✅ No redirigir

### **3. Acceso a Ruta Protegida sin Auth**
- ✅ Ir a /admin sin estar logueado
- ✅ Redirigir automáticamente a /login

### **4. Logout**
- ✅ Click en "Cerrar Sesión"
- ✅ Confirmar acción
- ✅ Eliminar token
- ✅ Redirigir a /login

### **5. Persistencia de Sesión**
- ✅ Recargar página estando logueado
- ✅ Mantener sesión activa
- ✅ Ver menú de usuario

---

## 🐛 Troubleshooting

### **Error: "No autorizado"**
- Verifica que el token esté en localStorage
- Verifica que el backend esté corriendo
- Verifica la URL del API en `.env`

### **Error: "CORS"**
- Verifica que `FRONTEND_URL` en backend/.env sea correcto
- Debe ser: `http://localhost:4321`

### **Error: "Token inválido"**
- El token puede haber expirado (7 días)
- Haz logout y vuelve a hacer login

### **No redirige después del login**
- Abre la consola del navegador
- Verifica errores de JavaScript
- Verifica que el token se guardó en localStorage

---

## ✅ Checklist de Verificación

- [ ] Backend corriendo en puerto 3000
- [ ] Frontend corriendo en puerto 4321
- [ ] Super Admin creado en la BD
- [ ] JWT_SECRET configurado en backend/.env
- [ ] PUBLIC_API_URL configurado en frontend/.env
- [ ] Login funciona correctamente
- [ ] Redirige a /admin después del login
- [ ] Menú de usuario visible
- [ ] Logout funciona
- [ ] Rutas protegidas redirigen a login

---

## 🚀 Próxima Fase

**FASE 3: CRUD de Formularios**
- Crear endpoints para formularios
- Listar formularios del usuario
- Crear nuevo formulario
- Editar formulario (crea nueva versión)
- Eliminar formulario
- Sistema de permisos (verificar quién puede ver/editar)
