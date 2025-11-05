## ✅ FASE 3: CRUD de Formularios - Backend Completado

## 📦 Archivos Creados

### **Servicios:**
1. ✅ `services/permissionService.js` - Lógica de permisos
2. ✅ `services/formService.js` - Lógica de negocio de formularios

### **Controladores:**
3. ✅ `controllers/formController.js` - Controladores de endpoints

### **Rutas:**
4. ✅ `routes/formRoutes.js` - Rutas de formularios
5. ✅ `src/index.js` - Integrado con el servidor

---

## 📡 Endpoints Disponibles

Todos los endpoints requieren autenticación (`Authorization: Bearer TOKEN`)

### **1. Listar Formularios**
```http
GET /api/forms
```

**Respuesta:**
```json
[
  {
    "id": "clx...",
    "title": "Encuesta de Satisfacción",
    "description": "Evalúa nuestro servicio",
    "slug": "encuesta-satisfaccion",
    "isActive": true,
    "isPublic": false,
    "createdAt": "2025-11-05T...",
    "updatedAt": "2025-11-05T...",
    "createdBy": {
      "id": "user_123",
      "name": "Juan Pérez",
      "email": "juan@umx.com"
    },
    "_count": {
      "responses": 45,
      "versions": 2
    }
  }
]
```

**Lógica:**
- SUPER_ADMIN ve todos los formularios
- ADMIN ve solo sus formularios + compartidos

---

### **2. Obtener Formulario por ID**
```http
GET /api/forms/:id
```

**Respuesta:**
```json
{
  "id": "clx...",
  "title": "Encuesta de Satisfacción",
  "description": "...",
  "slug": "encuesta-satisfaccion",
  "isActive": true,
  "versions": [
    {
      "id": "version_1",
      "version": 2,
      "title": "Encuesta de Satisfacción",
      "sections": [
        {
          "id": "section_1",
          "title": "Información Personal",
          "description": "Datos básicos",
          "order": 0,
          "questions": [
            {
              "id": "question_1",
              "type": "TEXT",
              "text": "¿Cuál es tu nombre?",
              "placeholder": "Escribe tu nombre",
              "helpText": null,
              "isRequired": true,
              "order": 0,
              "options": []
            },
            {
              "id": "question_2",
              "type": "RADIO",
              "text": "¿Cómo calificarías el servicio?",
              "isRequired": true,
              "order": 1,
              "options": [
                {
                  "id": "opt_1",
                  "text": "Excelente",
                  "order": 0
                },
                {
                  "id": "opt_2",
                  "text": "Bueno",
                  "order": 1
                },
                {
                  "id": "opt_3",
                  "text": "Regular",
                  "order": 2
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "sharedWith": [
    {
      "userId": "user_456",
      "permission": "EDIT",
      "user": {
        "name": "María García",
        "email": "maria@umx.com"
      }
    }
  ],
  "_count": {
    "responses": 45
  }
}
```

---

### **3. Crear Formulario**
```http
POST /api/forms
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Encuesta de Satisfacción",
  "description": "Evalúa nuestro servicio",
  "sections": [
    {
      "title": "Información Personal",
      "description": "Datos básicos",
      "questions": [
        {
          "type": "TEXT",
          "text": "¿Cuál es tu nombre?",
          "placeholder": "Escribe tu nombre",
          "isRequired": true
        },
        {
          "type": "RADIO",
          "text": "¿Cómo calificarías el servicio?",
          "isRequired": true,
          "options": [
            { "text": "Excelente" },
            { "text": "Bueno" },
            { "text": "Regular" },
            { "text": "Malo" }
          ]
        }
      ]
    }
  ]
}
```

**Tipos de Pregunta:**
- `TEXT` - Texto corto (input)
- `TEXTAREA` - Texto largo (textarea)
- `SELECT` - Selección única (dropdown) - **Requiere options**
- `RADIO` - Selección única (radio buttons) - **Requiere options**
- `CHECKBOX` - Selección múltiple - **Requiere options**

**Validaciones:**
- ✅ Título requerido
- ✅ Al menos una sección
- ✅ Cada sección debe tener al menos una pregunta
- ✅ Preguntas SELECT/RADIO/CHECKBOX requieren opciones

**Respuesta:**
```json
{
  "message": "Formulario creado exitosamente",
  "form": { ... }
}
```

**Funcionalidad:**
- Genera slug único automáticamente
- Crea versión 1 automáticamente
- Asigna orden a secciones, preguntas y opciones

---

### **4. Actualizar Formulario (Crea Nueva Versión)**
```http
PUT /api/forms/:id
Content-Type: application/json
```

**Body:** (mismo formato que crear)

**Respuesta:**
```json
{
  "message": "Formulario actualizado exitosamente (nueva versión creada)",
  "form": { ... }
}
```

**Funcionalidad:**
- NO modifica versiones anteriores
- Crea nueva versión incremental
- Mantiene historial completo
- Las respuestas antiguas siguen vinculadas a su versión

---

### **5. Eliminar Formulario**
```http
DELETE /api/forms/:id
```

**Respuesta:**
```json
{
  "message": "Formulario eliminado exitosamente"
}
```

**Permisos:**
- Solo el creador o usuarios con permiso FULL
- SUPER_ADMIN puede eliminar cualquiera

---

### **6. Activar/Desactivar Formulario**
```http
PATCH /api/forms/:id/status
Content-Type: application/json
```

**Body:**
```json
{
  "isActive": false
}
```

**Respuesta:**
```json
{
  "message": "Formulario desactivado exitosamente",
  "form": { ... }
}
```

---

### **7. Compartir Formulario**
```http
POST /api/forms/:id/share
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "user_456",
  "permission": "EDIT"
}
```

**Permisos disponibles:**
- `VIEW` - Solo ver formulario y respuestas
- `EDIT` - Ver y editar formulario
- `FULL` - Ver, editar, eliminar y compartir

**Respuesta:**
```json
{
  "message": "Formulario compartido exitosamente",
  "share": {
    "id": "share_123",
    "formId": "form_123",
    "userId": "user_456",
    "permission": "EDIT",
    "user": {
      "name": "María García",
      "email": "maria@umx.com"
    }
  }
}
```

---

### **8. Remover Acceso Compartido**
```http
DELETE /api/forms/:id/share/:userId
```

**Respuesta:**
```json
{
  "message": "Acceso removido exitosamente"
}
```

---

### **9. Actualizar Permisos de Compartido**
```http
PATCH /api/forms/:id/share/:userId
Content-Type: application/json
```

**Body:**
```json
{
  "permission": "FULL"
}
```

**Respuesta:**
```json
{
  "message": "Permisos actualizados exitosamente",
  "share": { ... }
}
```

---

## 🔐 Sistema de Permisos

### **Funciones de Verificación:**

#### **canAccessForm(userId, formId)**
Verifica si un usuario puede VER un formulario.

**Retorna true si:**
- Es SUPER_ADMIN
- Es el creador del formulario
- El formulario está compartido con él (cualquier permiso)

#### **canEditForm(userId, formId)**
Verifica si un usuario puede EDITAR un formulario.

**Retorna true si:**
- Es SUPER_ADMIN
- Es el creador del formulario
- Tiene permiso EDIT o FULL

#### **canDeleteForm(userId, formId)**
Verifica si un usuario puede ELIMINAR un formulario.

**Retorna true si:**
- Es SUPER_ADMIN
- Es el creador del formulario
- Tiene permiso FULL

---

## 🎯 Lógica de Negocio

### **Creación de Formulario:**
1. Valida datos de entrada
2. Genera slug único basado en el título
3. Crea el formulario
4. Crea automáticamente la versión 1
5. Crea secciones con sus preguntas
6. Crea opciones para preguntas que las requieren
7. Asigna orden automáticamente

### **Actualización de Formulario:**
1. Verifica permisos
2. Obtiene la última versión
3. Incrementa número de versión
4. Crea nueva versión con los cambios
5. NO modifica versiones anteriores
6. Actualiza título y descripción del formulario

### **Versionado:**
- Cada cambio crea una nueva versión
- Las respuestas se vinculan a la versión que existía al momento de responder
- Historial completo de cambios
- Permite análisis de respuestas por versión

---

## 🧪 Ejemplos de Uso con cURL

### **Crear Formulario:**
```bash
curl -X POST http://localhost:3000/api/forms \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Encuesta de Satisfacción",
    "description": "Evalúa nuestro servicio",
    "sections": [
      {
        "title": "Información Personal",
        "questions": [
          {
            "type": "TEXT",
            "text": "¿Cuál es tu nombre?",
            "isRequired": true
          },
          {
            "type": "RADIO",
            "text": "¿Cómo calificarías el servicio?",
            "isRequired": true,
            "options": [
              { "text": "Excelente" },
              { "text": "Bueno" },
              { "text": "Regular" }
            ]
          }
        ]
      }
    ]
  }'
```

### **Listar Formularios:**
```bash
curl -X GET http://localhost:3000/api/forms \
  -H "Authorization: Bearer TU_TOKEN"
```

### **Compartir Formulario:**
```bash
curl -X POST http://localhost:3000/api/forms/FORM_ID/share \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "permission": "EDIT"
  }'
```

---

## ✅ Checklist de Verificación

- [ ] Backend corriendo en puerto 3000
- [ ] Usuario autenticado con token
- [ ] Crear formulario con secciones y preguntas
- [ ] Listar formularios del usuario
- [ ] Obtener formulario por ID
- [ ] Actualizar formulario (crear nueva versión)
- [ ] Compartir formulario con otro usuario
- [ ] Verificar permisos funcionan correctamente
- [ ] Eliminar formulario
- [ ] Activar/Desactivar formulario

---

## 🚀 Próximos Pasos

**Frontend (FASE 3 - Parte 2):**
- Crear interfaz para listar formularios
- Crear formulario de creación/edición
- Implementar editor de preguntas
- Sistema de compartir formularios
- Vista previa del formulario

**FASE 4:**
- Páginas públicas para responder formularios
- Guardar respuestas en BD
- Validación de respuestas

**FASE 5:**
- Dashboard de analítica
- Exportar respuestas
- Gráficas y estadísticas
