# 🔐 Gestión de Usuarios - Backend (Solo SUPER_ADMIN)

## 📦 Archivos Creados

1. ✅ `services/userService.js` - Lógica de negocio de usuarios
2. ✅ `controllers/userController.js` - Controladores de endpoints
3. ✅ `routes/userRoutes.js` - Rutas protegidas con SUPER_ADMIN
4. ✅ `src/index.js` - Integrado con el servidor

---

## 🔒 Seguridad

**TODAS las rutas requieren:**
- ✅ Autenticación (`requireAuth`)
- ✅ Rol de SUPER_ADMIN (`requireSuperAdmin`)

**Solo los SUPER_ADMIN pueden:**
- Ver lista de usuarios
- Crear nuevos usuarios
- Editar usuarios
- Eliminar usuarios
- Activar/Desactivar usuarios
- Resetear contraseñas
- Ver estadísticas

---

## 📡 Endpoints Disponibles

Base URL: `/api/users`

### **1. Obtener Estadísticas**
```http
GET /api/users/stats
Authorization: Bearer TOKEN (SUPER_ADMIN)
```

**Respuesta:**
```json
{
  "total": 5,
  "active": 4,
  "inactive": 1,
  "superAdmins": 1,
  "admins": 4
}
```

---

### **2. Listar Todos los Usuarios**
```http
GET /api/users
Authorization: Bearer TOKEN (SUPER_ADMIN)
```

**Respuesta:**
```json
[
  {
    "id": "user_123",
    "email": "admin@umx.com",
    "name": "Super Admin",
    "role": "SUPER_ADMIN",
    "isActive": true,
    "createdAt": "2025-11-05T...",
    "lastLogin": "2025-11-05T...",
    "_count": {
      "formsCreated": 10,
      "formShares": 5
    }
  },
  {
    "id": "user_456",
    "email": "juan@umx.com",
    "name": "Juan Pérez",
    "role": "ADMIN",
    "isActive": true,
    "createdAt": "2025-11-05T...",
    "lastLogin": "2025-11-04T...",
    "_count": {
      "formsCreated": 3,
      "formShares": 2
    }
  }
]
```

**Información incluida:**
- Datos básicos del usuario
- Rol (SUPER_ADMIN o ADMIN)
- Estado (activo/inactivo)
- Fecha de creación
- Último login
- Contadores:
  - Formularios creados
  - Formularios compartidos con él

---

### **3. Obtener Usuario por ID**
```http
GET /api/users/:id
Authorization: Bearer TOKEN (SUPER_ADMIN)
```

**Respuesta:**
```json
{
  "id": "user_456",
  "email": "juan@umx.com",
  "name": "Juan Pérez",
  "role": "ADMIN",
  "isActive": true,
  "createdAt": "2025-11-05T...",
  "lastLogin": "2025-11-04T...",
  "_count": {
    "formsCreated": 3,
    "formShares": 2
  }
}
```

---

### **4. Crear Nuevo Usuario**
```http
POST /api/users
Authorization: Bearer TOKEN (SUPER_ADMIN)
Content-Type: application/json
```

**Body:**
```json
{
  "email": "maria@umx.com",
  "name": "María García",
  "password": "password123",
  "role": "ADMIN"
}
```

**Campos:**
- `email` * - Email único del usuario
- `name` * - Nombre completo
- `password` * - Contraseña (mínimo 6 caracteres)
- `role` - Rol (ADMIN o SUPER_ADMIN, default: ADMIN)

**Validaciones:**
- ✅ Email requerido y único
- ✅ Nombre requerido
- ✅ Contraseña requerida (mínimo 6 caracteres)
- ✅ Rol válido (ADMIN o SUPER_ADMIN)
- ✅ Email no duplicado

**Respuesta:**
```json
{
  "message": "Usuario creado exitosamente",
  "user": {
    "id": "user_789",
    "email": "maria@umx.com",
    "name": "María García",
    "role": "ADMIN",
    "isActive": true,
    "createdAt": "2025-11-05T..."
  }
}
```

**Errores:**
- `409` - Email ya registrado
- `400` - Validación fallida

---

### **5. Actualizar Usuario**
```http
PUT /api/users/:id
Authorization: Bearer TOKEN (SUPER_ADMIN)
Content-Type: application/json
```

**Body:**
```json
{
  "name": "María García López",
  "role": "SUPER_ADMIN",
  "isActive": true
}
```

**Campos opcionales:**
- `name` - Nuevo nombre
- `role` - Nuevo rol (ADMIN o SUPER_ADMIN)
- `isActive` - Estado activo/inactivo

**Validaciones:**
- ✅ No puedes cambiar tu propio rol
- ✅ Rol válido si se proporciona

**Respuesta:**
```json
{
  "message": "Usuario actualizado exitosamente",
  "user": {
    "id": "user_789",
    "email": "maria@umx.com",
    "name": "María García López",
    "role": "SUPER_ADMIN",
    "isActive": true,
    "createdAt": "2025-11-05T...",
    "lastLogin": null
  }
}
```

---

### **6. Resetear Contraseña**
```http
POST /api/users/:id/reset-password
Authorization: Bearer TOKEN (SUPER_ADMIN)
Content-Type: application/json
```

**Body:**
```json
{
  "newPassword": "nuevaPassword123"
}
```

**Validaciones:**
- ✅ Nueva contraseña requerida
- ✅ Mínimo 6 caracteres

**Respuesta:**
```json
{
  "message": "Contraseña actualizada exitosamente"
}
```

**Nota:** El usuario deberá usar la nueva contraseña en su próximo login.

---

### **7. Activar/Desactivar Usuario**
```http
PATCH /api/users/:id/status
Authorization: Bearer TOKEN (SUPER_ADMIN)
Content-Type: application/json
```

**Body:**
```json
{
  "isActive": false
}
```

**Validaciones:**
- ✅ No puedes desactivar tu propia cuenta
- ✅ No puedes desactivar el último SUPER_ADMIN activo

**Respuesta:**
```json
{
  "message": "Usuario desactivado exitosamente",
  "user": {
    "id": "user_789",
    "email": "maria@umx.com",
    "name": "María García",
    "role": "ADMIN",
    "isActive": false
  }
}
```

**Efecto:**
- Usuario desactivado NO puede hacer login
- Sesiones activas siguen funcionando hasta que expiren
- Formularios creados siguen existiendo

---

### **8. Eliminar Usuario**
```http
DELETE /api/users/:id
Authorization: Bearer TOKEN (SUPER_ADMIN)
```

**Validaciones:**
- ✅ No puedes eliminar tu propia cuenta
- ✅ No puedes eliminar el último SUPER_ADMIN

**Respuesta:**
```json
{
  "message": "Usuario eliminado exitosamente"
}
```

**Efecto:**
- Usuario eliminado permanentemente
- Formularios creados se mantienen (con referencia al creador)
- Compartidos con ese usuario se eliminan en cascada

---

## 🛡️ Protecciones de Seguridad

### **1. Último SUPER_ADMIN**
- ❌ No se puede eliminar el último SUPER_ADMIN
- ❌ No se puede desactivar el último SUPER_ADMIN activo
- ✅ Debe haber al menos 1 SUPER_ADMIN activo siempre

### **2. Auto-modificación**
- ❌ No puedes eliminar tu propia cuenta
- ❌ No puedes desactivar tu propia cuenta
- ❌ No puedes cambiar tu propio rol

### **3. Validaciones**
- ✅ Email único
- ✅ Contraseña mínimo 6 caracteres
- ✅ Roles válidos (ADMIN o SUPER_ADMIN)
- ✅ Campos requeridos

---

## 🧪 Ejemplos con cURL

### **Listar Usuarios:**
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer TU_TOKEN_SUPER_ADMIN"
```

### **Crear Usuario:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer TU_TOKEN_SUPER_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo@umx.com",
    "name": "Nuevo Usuario",
    "password": "password123",
    "role": "ADMIN"
  }'
```

### **Actualizar Usuario:**
```bash
curl -X PUT http://localhost:3000/api/users/USER_ID \
  -H "Authorization: Bearer TU_TOKEN_SUPER_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nombre Actualizado",
    "role": "SUPER_ADMIN"
  }'
```

### **Resetear Contraseña:**
```bash
curl -X POST http://localhost:3000/api/users/USER_ID/reset-password \
  -H "Authorization: Bearer TU_TOKEN_SUPER_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "nuevaPassword123"
  }'
```

### **Desactivar Usuario:**
```bash
curl -X PATCH http://localhost:3000/api/users/USER_ID/status \
  -H "Authorization: Bearer TU_TOKEN_SUPER_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

### **Eliminar Usuario:**
```bash
curl -X DELETE http://localhost:3000/api/users/USER_ID \
  -H "Authorization: Bearer TU_TOKEN_SUPER_ADMIN"
```

---

## 📊 Casos de Uso

### **1. Onboarding de Nuevo Admin:**
1. SUPER_ADMIN crea usuario con rol ADMIN
2. Asigna contraseña temporal
3. Envía credenciales al nuevo admin
4. Nuevo admin hace login y cambia su contraseña

### **2. Usuario Olvidó Contraseña:**
1. Usuario contacta a SUPER_ADMIN
2. SUPER_ADMIN resetea contraseña
3. Envía nueva contraseña temporal
4. Usuario hace login y cambia contraseña

### **3. Usuario Inactivo:**
1. SUPER_ADMIN desactiva usuario
2. Usuario no puede hacer login
3. Cuando sea necesario, SUPER_ADMIN reactiva

### **4. Promover a SUPER_ADMIN:**
1. SUPER_ADMIN actualiza rol de ADMIN a SUPER_ADMIN
2. Usuario obtiene permisos completos

### **5. Eliminar Usuario:**
1. SUPER_ADMIN elimina usuario
2. Formularios del usuario se mantienen
3. Accesos compartidos se eliminan

---

## ✅ Checklist de Verificación

- [ ] Backend corriendo
- [ ] Login como SUPER_ADMIN
- [ ] Ver estadísticas de usuarios
- [ ] Listar todos los usuarios
- [ ] Crear nuevo usuario ADMIN
- [ ] Crear nuevo usuario SUPER_ADMIN
- [ ] Actualizar nombre de usuario
- [ ] Cambiar rol de usuario
- [ ] Resetear contraseña de usuario
- [ ] Desactivar usuario
- [ ] Reactivar usuario
- [ ] Intentar eliminar último SUPER_ADMIN (debe fallar)
- [ ] Eliminar usuario ADMIN
- [ ] Verificar que no puedes eliminar tu propia cuenta
- [ ] Verificar que no puedes cambiar tu propio rol

---

## 🚀 Próximos Pasos

**Frontend:**
- [ ] Crear página de gestión de usuarios
- [ ] Lista de usuarios con tabla
- [ ] Modal para crear usuario
- [ ] Modal para editar usuario
- [ ] Modal para resetear contraseña
- [ ] Confirmaciones para acciones destructivas
- [ ] Filtros y búsqueda
- [ ] Paginación (opcional)

---

## 📝 Notas Importantes

1. **Solo SUPER_ADMIN:** Estas rutas solo están disponibles para usuarios con rol SUPER_ADMIN
2. **Contraseñas:** Se hashean con bcrypt antes de guardar
3. **Último SUPER_ADMIN:** Siempre debe haber al menos uno activo
4. **Cascada:** Al eliminar usuario, se eliminan sus compartidos pero no sus formularios
5. **Email único:** No se puede cambiar el email de un usuario (por seguridad)
