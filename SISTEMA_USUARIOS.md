# 🔐 Sistema de Usuarios y Permisos

## 👥 Roles de Usuario

### **SUPER_ADMIN**
- ✅ Ve TODOS los formularios (propios y de otros)
- ✅ Puede editar/eliminar cualquier formulario
- ✅ Gestiona usuarios (crear, editar, eliminar)
- ✅ Acceso a toda la analítica
- ✅ Configuración del sistema

### **ADMIN**
- ✅ Ve solo SUS formularios creados
- ✅ Ve formularios que le compartieron
- ✅ Crea nuevos formularios
- ✅ Comparte sus formularios con otros admins
- ❌ NO ve formularios de otros
- ❌ NO gestiona usuarios

---

## 📋 Modelo de Datos

### **User** (Usuarios)
```prisma
- id: Identificador único
- email: Email único (para login)
- password: Contraseña hasheada (bcrypt)
- name: Nombre completo
- role: SUPER_ADMIN | ADMIN
- isActive: ¿Cuenta activa?
- lastLogin: Última vez que inició sesión
```

### **Form** (Formularios)
```prisma
- createdById: Quién creó el formulario
- createdBy: Relación con User
- sharedWith: Lista de usuarios con acceso
```

### **FormShare** (Formularios Compartidos)
```prisma
- formId: Qué formulario
- userId: Con quién se compartió
- permission: Nivel de permiso (VIEW, EDIT, FULL)
- sharedAt: Cuándo se compartió
```

---

## 🔑 Niveles de Permiso

### **VIEW** (Solo Ver)
- ✅ Ver formulario
- ✅ Ver respuestas
- ✅ Ver analítica
- ❌ NO puede editar
- ❌ NO puede eliminar
- ❌ NO puede compartir

### **EDIT** (Editar)
- ✅ Todo lo de VIEW
- ✅ Editar preguntas
- ✅ Editar configuración
- ❌ NO puede eliminar
- ❌ NO puede compartir con otros

### **FULL** (Control Total)
- ✅ Todo lo de EDIT
- ✅ Eliminar formulario
- ✅ Compartir con otros usuarios
- ✅ Cambiar permisos

---

## 🔄 Flujo de Trabajo

### **Escenario 1: Admin crea formulario**
```
1. Admin Juan crea "Encuesta Satisfacción"
2. Form.createdById = Juan.id
3. Solo Juan y SUPER_ADMIN lo ven
```

### **Escenario 2: Admin comparte formulario**
```
1. Juan comparte con María (permiso: EDIT)
2. Se crea FormShare:
   - formId: "encuesta-satisfaccion"
   - userId: María.id
   - permission: EDIT
3. María ahora ve el formulario en su panel
4. María puede editarlo pero NO eliminarlo
```

### **Escenario 3: SUPER_ADMIN ve todo**
```
1. SUPER_ADMIN inicia sesión
2. Query: SELECT * FROM forms (sin filtros)
3. Ve formularios de Juan, María y todos
```

### **Escenario 4: Admin normal ve sus formularios**
```
1. Juan inicia sesión
2. Query: 
   SELECT * FROM forms 
   WHERE createdById = Juan.id
   OR id IN (
     SELECT formId FROM form_shares 
     WHERE userId = Juan.id
   )
3. Ve solo sus formularios + compartidos
```

---

## 🛡️ Implementación de Seguridad

### **Backend - Middleware de Autenticación**
```javascript
// middleware/auth.js
export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  
  const user = verifyToken(token);
  req.user = user;
  next();
};

export const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};
```

### **Backend - Verificar Permisos**
```javascript
// services/permissionService.js
export const canAccessForm = async (userId, formId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  // SUPER_ADMIN puede todo
  if (user.role === 'SUPER_ADMIN') return true;
  
  // Verificar si es creador
  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (form.createdById === userId) return true;
  
  // Verificar si está compartido
  const share = await prisma.formShare.findUnique({
    where: { formId_userId: { formId, userId } }
  });
  
  return !!share;
};

export const canEditForm = async (userId, formId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user.role === 'SUPER_ADMIN') return true;
  
  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (form.createdById === userId) return true;
  
  const share = await prisma.formShare.findUnique({
    where: { formId_userId: { formId, userId } }
  });
  
  return share && ['EDIT', 'FULL'].includes(share.permission);
};
```

---

## 🔐 Autenticación con JWT

### **Login**
```javascript
POST /api/auth/login
{
  "email": "juan@example.com",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123",
    "name": "Juan",
    "email": "juan@example.com",
    "role": "ADMIN"
  }
}
```

### **Endpoints Protegidos**
```javascript
// Requiere autenticación
GET /api/forms
Headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..." }

// Requiere SUPER_ADMIN
GET /api/users
Headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..." }
```

---

## 📊 Queries Optimizadas

### **Obtener formularios del usuario**
```javascript
// Para ADMIN normal
const forms = await prisma.form.findMany({
  where: {
    OR: [
      { createdById: userId },
      { sharedWith: { some: { userId } } }
    ]
  },
  include: {
    createdBy: { select: { name: true, email: true } },
    sharedWith: {
      include: {
        user: { select: { name: true, email: true } }
      }
    },
    _count: { select: { responses: true } }
  }
});

// Para SUPER_ADMIN
const forms = await prisma.form.findMany({
  include: {
    createdBy: { select: { name: true, email: true } },
    _count: { select: { responses: true } }
  }
});
```

---

## 🚀 Dependencias Adicionales Necesarias

```bash
cd backend
npm install jsonwebtoken bcryptjs
```

- **jsonwebtoken**: Para crear y verificar tokens JWT
- **bcryptjs**: Para hashear contraseñas

---

## ✅ Resumen

### **Lo que agregamos:**
1. ✅ Modelo `User` con roles (SUPER_ADMIN, ADMIN)
2. ✅ Modelo `FormShare` para compartir formularios
3. ✅ Permisos granulares (VIEW, EDIT, FULL)
4. ✅ Relación `createdBy` en formularios
5. ✅ Sistema de autenticación JWT

### **Reglas de negocio:**
- ✅ SUPER_ADMIN ve todo
- ✅ ADMIN solo ve sus formularios + compartidos
- ✅ Formularios se pueden compartir con permisos específicos
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Tokens JWT para sesiones

### **Próximos pasos:**
1. Ejecutar migración con los nuevos modelos
2. Crear endpoints de autenticación
3. Implementar middleware de permisos
4. Crear pantalla de login en frontend
5. Crear gestión de usuarios (solo SUPER_ADMIN)
