# 🎨 Sistema de Personalización de Plataforma

Sistema completo para personalizar el logo y los colores de la plataforma.

---

## ✅ Funcionalidades Implementadas

### **1. Personalización de Logo**
- ✅ Subir logo personalizado (PNG, JPG, SVG)
- ✅ Vista previa en tiempo real
- ✅ Validación de tamaño (máx 2MB)
- ✅ Validación de tipo de archivo
- ✅ Almacenamiento en localStorage

### **2. Personalización de Colores**
- ✅ Color Primario (botones, enlaces)
- ✅ Color Secundario (fondos, elementos)
- ✅ Color de Acento (resaltados, notificaciones)
- ✅ Selector de color visual
- ✅ Input manual de código hexadecimal
- ✅ Vista previa en tiempo real

### **3. Persistencia**
- ✅ Guardado en localStorage
- ✅ Aplicación automática al cargar la página
- ✅ Restaurar configuración por defecto
- ✅ Recarga automática después de guardar

---

## 📁 Archivos Creados

```
frontend/
├── src/
│   ├── lib/
│   │   ├── types.ts (actualizado)
│   │   └── platformSettings.ts (nuevo)
│   │
│   ├── components/
│   │   └── settings/
│   │       ├── PlatformCustomization.tsx (nuevo)
│   │       └── index.ts (nuevo)
│   │
│   ├── pages/
│   │   └── admin/
│   │       └── settings.astro (nuevo)
│   │
│   ├── layouts/
│   │   └── AdminLayout.astro (actualizado)
│   │
│   └── styles/
│       └── global.css (actualizado)
```

---

## 🚀 Cómo Usar

### **Acceso:**
1. Login como **SUPER_ADMIN** (admin@umx.com / admin123)
2. En el sidebar, click en **⚙️ Configuración**
3. Verás la página de personalización

### **Cambiar Logo:**
1. Click en "Seleccionar archivo"
2. Elige una imagen (PNG, JPG, SVG)
3. Verás la vista previa
4. Click en "Guardar Cambios"

### **Cambiar Colores:**
1. Click en el selector de color
2. O escribe el código hexadecimal manualmente
3. Verás la vista previa de los colores
4. Click en "Guardar Cambios"

### **Restaurar por Defecto:**
1. Click en "Restaurar por Defecto"
2. Confirma la acción
3. Se restaurarán los valores originales

---

## 🎨 Colores por Defecto

```css
--color-primary: #2563eb    /* blue-600 */
--color-secondary: #1e40af  /* blue-800 */
--color-accent: #3b82f6     /* blue-500 */
```

---

## 💾 Almacenamiento

**LocalStorage Key:** `platform_settings`

**Estructura:**
```json
{
  "logo": "data:image/png;base64,...",
  "primaryColor": "#2563eb",
  "secondaryColor": "#1e40af",
  "accentColor": "#3b82f6"
}
```

---

## 🔧 Implementación Técnica

### **Variables CSS:**
```css
:root {
  --color-primary: #2563eb;
  --color-secondary: #1e40af;
  --color-accent: #3b82f6;
}
```

### **Clases Personalizadas:**
```css
.bg-primary { background-color: var(--color-primary); }
.text-primary { color: var(--color-primary); }
.border-primary { border-color: var(--color-primary); }
.bg-secondary { background-color: var(--color-secondary); }
.text-secondary { color: var(--color-secondary); }
.bg-accent { background-color: var(--color-accent); }
.text-accent { color: var(--color-accent); }
```

### **Aplicación al Cargar:**
```javascript
// En AdminLayout.astro
const settings = localStorage.getItem('platform_settings');
if (settings) {
  const { primaryColor, secondaryColor, accentColor } = JSON.parse(settings);
  document.documentElement.style.setProperty('--color-primary', primaryColor);
  document.documentElement.style.setProperty('--color-secondary', secondaryColor);
  document.documentElement.style.setProperty('--color-accent', accentColor);
}
```

---

## 📝 Servicio de Personalización

**Archivo:** `src/lib/platformSettings.ts`

**Métodos:**
- `getSettings()` - Obtener configuración actual
- `saveSettings(settings)` - Guardar configuración
- `applySettings(settings)` - Aplicar al DOM
- `uploadLogo(file)` - Subir logo
- `resetToDefaults()` - Restaurar por defecto
- `initialize()` - Inicializar al cargar

---

## 🎯 Uso de Colores Personalizados

### **En Componentes React/TSX:**
```tsx
// Usando clases personalizadas
<button className="bg-primary text-white">
  Botón Primario
</button>

// Usando inline styles
<div style={{ backgroundColor: 'var(--color-primary)' }}>
  Contenido
</div>
```

### **En CSS:**
```css
.mi-elemento {
  background-color: var(--color-primary);
  color: var(--color-secondary);
  border: 2px solid var(--color-accent);
}
```

---

## ✨ Características

### **Validaciones:**
- ✅ Solo imágenes (image/*)
- ✅ Tamaño máximo 2MB
- ✅ Formato hexadecimal para colores
- ✅ Solo SUPER_ADMIN puede acceder

### **UX:**
- ✅ Vista previa en tiempo real
- ✅ Mensajes de éxito/error
- ✅ Confirmación antes de restaurar
- ✅ Recarga automática después de guardar
- ✅ Diseño responsive

### **Seguridad:**
- ✅ Ruta protegida (requireSuperAdmin)
- ✅ Validación de archivos
- ✅ Almacenamiento local (no servidor)

---

## 🔄 Flujo de Trabajo

1. **Usuario accede** → `/admin/settings`
2. **Componente carga** → Lee localStorage
3. **Usuario modifica** → Logo y/o colores
4. **Usuario guarda** → Escribe en localStorage
5. **Servicio aplica** → Variables CSS al DOM
6. **Página recarga** → Muestra cambios

---

## 🎨 Próximas Mejoras

Posibles mejoras futuras:

- [ ] Guardar en base de datos (backend)
- [ ] Múltiples temas predefinidos
- [ ] Modo oscuro/claro
- [ ] Personalizar fuentes
- [ ] Personalizar favicon
- [ ] Exportar/importar configuración
- [ ] Historial de cambios
- [ ] Vista previa antes de aplicar

---

## 📊 Componentes Afectados

Los colores personalizados afectarán:
- ✅ Botones principales
- ✅ Enlaces
- ✅ Fondos de secciones
- ✅ Bordes y divisores
- ✅ Elementos de acento
- ✅ Notificaciones
- ✅ Estados hover/active

---

## 🐛 Solución de Problemas

### **Los colores no se aplican:**
- Verifica que uses las clases personalizadas o variables CSS
- Asegúrate de que global.css esté importado
- Revisa la consola del navegador

### **El logo no se muestra:**
- Verifica el tamaño del archivo (< 2MB)
- Asegúrate de que sea una imagen válida
- Revisa localStorage en DevTools

### **Los cambios no persisten:**
- Verifica que localStorage esté habilitado
- Revisa la consola por errores
- Intenta limpiar caché del navegador

---

**¡Sistema de personalización completo y funcional!** 🎉
