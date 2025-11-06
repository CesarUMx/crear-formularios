# Reiniciar e Inicializar la Base de Datos

Este documento explica cómo reiniciar e inicializar la base de datos con los datos necesarios para el funcionamiento del sistema.

## Pasos para inicializar la base de datos

### 1. Resetear la base de datos

```bash
npx prisma migrate reset --force
```

Este comando:
- Elimina la base de datos
- La crea nuevamente
- Aplica todas las migraciones

### 2. Inicializar datos básicos

```bash
# Crear usuario administrador
npm run create-admin

# Inicializar plantillas de formularios
npm run init-templates

# Inicializar configuración de la plataforma
npm run init-settings

# O ejecutar todo de una vez
npm run init-all
```

Estos comandos crean:
- Usuario administrador
- Configuración de la plataforma
- Plantillas de formularios

## Datos Iniciales

### Usuario Administrador
- **Email**: admin@umx.com
- **Contraseña**: admin123
- **Rol**: SUPER_ADMIN

### Plantillas de Formularios
- **Modern**: Diseño limpio y moderno (default)
- **Academic**: Diseño formal para entornos educativos
- **Corporate**: Diseño profesional para entornos empresariales

## Verificación

Para verificar que todo se ha inicializado correctamente:

1. Inicia el servidor:
   ```bash
   npm run dev
   ```

2. Accede al panel de administración en el frontend e inicia sesión con las credenciales del administrador.

3. Verifica que puedes crear un nuevo formulario y que las plantillas están disponibles.

## Notas Importantes

- El reset de la base de datos **elimina todos los datos existentes**. Úsalo con precaución.
- Si solo necesitas inicializar datos sin eliminar los existentes, ejecuta únicamente `npm run init-db`.
- El script verifica si los datos ya existen antes de crearlos, por lo que es seguro ejecutarlo múltiples veces.
