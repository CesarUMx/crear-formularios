# Backend - API de Formularios

API REST para la plataforma de formularios.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar migraciones
npm run migrate

# Iniciar servidor de desarrollo
npm run dev
```

## 📡 Endpoints

### Health Check
- `GET /health` - Estado del servidor

### Formularios (Próximamente)
- `GET /api/forms` - Listar formularios
- `POST /api/forms` - Crear formulario
- `GET /api/forms/:id` - Obtener formulario
- `PUT /api/forms/:id` - Actualizar formulario
- `DELETE /api/forms/:id` - Eliminar formulario

### Respuestas (Próximamente)
- `POST /api/responses` - Enviar respuesta
- `GET /api/forms/:id/responses` - Obtener respuestas
- `GET /api/forms/:id/analytics` - Analítica

## 🛠️ Scripts

```bash
npm run dev       # Desarrollo con hot-reload
npm start         # Producción
npm run migrate   # Ejecutar migraciones
npm run generate  # Generar Prisma Client
npm run studio    # Abrir Prisma Studio
```

## 📦 Tecnologías

- **Express** - Framework web
- **Prisma** - ORM
- **PostgreSQL** - Base de datos
- **Helmet** - Seguridad
- **CORS** - Cross-origin requests
- **Morgan** - Logging
