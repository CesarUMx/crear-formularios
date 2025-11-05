# 📁 Estructura de Componentes

Los componentes están organizados por módulos para mejor mantenibilidad y escalabilidad.

## 📂 Estructura

```
components/
├── auth/           # 🔐 Autenticación y Login
├── forms/          # 📋 Gestión de Formularios
├── users/          # 👥 Gestión de Usuarios
├── layout/         # 🎨 Layout y Navegación
└── common/         # 🔧 Componentes Comunes/Reutilizables
```

---

## 🔐 auth/
**Componentes relacionados con autenticación y login**

- `LoginForm.tsx` - Formulario de inicio de sesión
- `AnimatedCharacters.tsx` - Personajes animados del login
- `ProtectedRoute.tsx` - HOC para proteger rutas
- `index.ts` - Exports del módulo

**Uso:**
```tsx
import { LoginForm, ProtectedRoute } from '../components/auth';
```

---

## 📋 forms/
**Componentes para la gestión de formularios**

- `FormList.tsx` - Lista de formularios
- `FormEditor.tsx` - Editor de formularios
- `FormEditorLoader.tsx` - Loader para editar formularios existentes
- `index.ts` - Exports del módulo

**Uso:**
```tsx
import { FormList, FormEditor } from '../components/forms';
```

---

## 👥 users/
**Componentes para la gestión de usuarios**

- `UserList.tsx` - Lista de usuarios (SUPER_ADMIN)
- `CreateUserModal.tsx` - Modal para crear usuarios
- `EditUserModal.tsx` - Modal para editar usuarios
- `ResetPasswordModal.tsx` - Modal para resetear contraseñas
- `ProfileModal.tsx` - Modal de perfil de usuario
- `ChangePasswordModal.tsx` - Modal para cambiar contraseña
- `UserMenu.tsx` - Menú de usuario (avatar dropdown)
- `index.ts` - Exports del módulo

**Uso:**
```tsx
import { UserList, UserMenu, ProfileModal } from '../components/users';
```

---

## 🎨 layout/
**Componentes de layout y navegación**

- `Sidebar.tsx` - Sidebar principal del admin
- `index.ts` - Exports del módulo

**Uso:**
```tsx
import { Sidebar } from '../components/layout';
```

---

## 🔧 common/
**Componentes reutilizables y genéricos**

- `Modal.tsx` - Componente modal base
- `LoginOrDashboard.tsx` - Redirección condicional
- `index.ts` - Exports del módulo

**Uso:**
```tsx
import { Modal, LoginOrDashboard } from '../components/common';
```

---

## 📝 Convenciones

### **Imports:**
Cada módulo tiene un archivo `index.ts` que exporta todos sus componentes:

```typescript
// ✅ Correcto - Usar exports del módulo
import { FormList, FormEditor } from '../components/forms';

// ❌ Evitar - Import directo
import FormList from '../components/forms/FormList';
```

### **Rutas Relativas:**
- Desde páginas: `../components/[modulo]/[Componente]`
- Desde componentes: `../../lib/[servicio]`
- Entre módulos: `../[modulo]/[Componente]`

### **Naming:**
- **PascalCase** para componentes: `UserList.tsx`
- **camelCase** para archivos de utilidad: `userService.ts`
- **kebab-case** para carpetas de módulos: `auth/`, `forms/`

---

## 🔄 Migración

Si necesitas mover un componente:

1. **Mover el archivo** a la carpeta correspondiente
2. **Actualizar el `index.ts`** del módulo
3. **Actualizar imports** en todos los archivos que lo usan
4. **Actualizar rutas relativas** dentro del componente

**Ejemplo:**
```bash
# Mover componente
mv src/components/MiComponente.tsx src/components/users/

# Actualizar index.ts
echo "export { default as MiComponente } from './MiComponente';" >> src/components/users/index.ts

# Actualizar imports en archivos que lo usan
# Cambiar: import MiComponente from '../components/MiComponente';
# Por: import { MiComponente } from '../components/users';
```

---

## 📊 Beneficios

✅ **Organización clara** - Fácil encontrar componentes
✅ **Escalabilidad** - Agregar nuevos módulos es simple
✅ **Mantenibilidad** - Cambios aislados por módulo
✅ **Imports limpios** - Exports centralizados
✅ **Separación de responsabilidades** - Cada módulo tiene un propósito claro

---

## 🎯 Próximos Módulos

Posibles módulos futuros:

- `analytics/` - Componentes de analíticas y reportes
- `settings/` - Configuración y ajustes
- `notifications/` - Sistema de notificaciones
- `responses/` - Gestión de respuestas de formularios
- `sharing/` - Compartir y colaboración

---

**Última actualización:** Noviembre 2025
