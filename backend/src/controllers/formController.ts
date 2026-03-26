import { Request, Response, NextFunction } from 'express';
import * as formService from '../services/formService.js';
import * as permissionService from '../services/permissionService.js';

/**
 * Obtener todos los formularios del usuario
 */
export const getForms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forms = await formService.getUserForms(String(req.user!.id), req.user!.role);
    return res.json(forms);
  } catch (error) {
    return next(error);
  }
};

/**
 * Obtener un formulario por ID
 */
export const getFormById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Verificar permisos
    const hasAccess = await permissionService.canAccessForm(String(req.user!.id), String(id));
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'No tienes permisos para acceder a este formulario' 
      });
    }

    const form = await formService.getFormById(String(id));

    if (!form) {
      return res.status(404).json({ 
        error: 'Formulario no encontrado' 
      });
    }

    return res.json(form);
  } catch (error) {
    return next(error);
  }
};

/**
 * Crear un nuevo formulario
 */
export const createForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, sections, templateId } = req.body;

    // Validaciones
    if (!title || title.trim() === '') {
      return res.status(400).json({ 
        error: 'El título es requerido' 
      });
    }

    if (!sections || sections.length === 0) {
      return res.status(400).json({ 
        error: 'Debe incluir al menos una sección' 
      });
    }

    // Validar que cada sección tenga preguntas
    for (const section of sections) {
      if (!section.questions || section.questions.length === 0) {
        return res.status(400).json({ 
          error: `La sección "${section.title}" debe tener al menos una pregunta` 
        });
      }

      // Validar preguntas con opciones
      for (const question of section.questions) {
        if (['SELECT', 'RADIO', 'CHECKBOX'].includes(question.type)) {
          if (!question.options || question.options.length === 0) {
            return res.status(400).json({ 
              error: `La pregunta "${question.text}" requiere opciones` 
            });
          }
        }
      }
    }

    const form = await formService.createForm(String(req.user!.id), {
      title,
      description,
      templateId: templateId || 'modern', // Default a plantilla moderna
      sections
    });

    return res.status(201).json({
      message: 'Formulario creado exitosamente',
      form
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Actualizar un formulario (crea nueva versión)
 */
export const updateForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, templateId, sections } = req.body;

    // Verificar permisos
    const canEdit = await permissionService.canEditForm(String(req.user!.id), String(id));
    if (!canEdit) {
      return res.status(403).json({ 
        error: 'No tienes permisos para editar este formulario' 
      });
    }

    // Validaciones
    if (!title || title.trim() === '') {
      return res.status(400).json({ 
        error: 'El título es requerido' 
      });
    }

    const form = await formService.updateForm(String(id), {
      title,
      description,
      templateId,
      sections
    });

    return res.json({
      message: 'Formulario actualizado exitosamente (nueva versión creada)',
      form
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Eliminar un formulario
 */
export const deleteForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Verificar permisos
    const canDelete = await permissionService.canDeleteForm(String(req.user!.id), String(id));
    if (!canDelete) {
      return res.status(403).json({ 
        error: 'No tienes permisos para eliminar este formulario' 
      });
    }

    await formService.deleteForm(String(id));

    return res.json({
      message: 'Formulario eliminado exitosamente'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Activar/Desactivar formulario
 */
export const toggleFormStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Verificar permisos
    const canEdit = await permissionService.canEditForm(String(req.user!.id), String(id));
    if (!canEdit) {
      return res.status(403).json({ 
        error: 'No tienes permisos para modificar este formulario' 
      });
    }

    const form = await formService.toggleFormStatus(String(id), isActive);

    return res.json({
      message: `Formulario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      form
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Compartir formulario
 */
export const shareForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { userId, permission } = req.body;

    // Verificar permisos (solo el creador o FULL puede compartir)
    const canDelete = await permissionService.canDeleteForm(String(req.user!.id), String(id));
    if (!canDelete) {
      return res.status(403).json({ 
        error: 'No tienes permisos para compartir este formulario' 
      });
    }

    // Validaciones
    if (!userId) {
      return res.status(400).json({ 
        error: 'El ID del usuario es requerido' 
      });
    }

    if (!['VIEW', 'EDIT', 'FULL'].includes(permission)) {
      return res.status(400).json({ 
        error: 'Permiso inválido. Debe ser VIEW, EDIT o FULL' 
      });
    }

    const share = await formService.shareForm(String(id), userId, permission);

    return res.status(201).json({
      message: 'Formulario compartido exitosamente',
      share
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        error: 'El formulario ya está compartido con este usuario' 
      });
    }
    return next(error);
  }
};

/**
 * Remover acceso compartido
 */
export const unshareForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, userId } = req.params;

    // Verificar permisos
    const canDelete = await permissionService.canDeleteForm(String(req.user!.id), String(id));
    if (!canDelete) {
      return res.status(403).json({ 
        error: 'No tienes permisos para modificar el acceso a este formulario' 
      });
    }

    await formService.unshareForm(String(id), String(userId));

    return res.json({
      message: 'Acceso removido exitosamente'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Actualizar permisos de compartido
 */
export const updateSharePermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, userId } = req.params;
    const { permission } = req.body;

    // Verificar permisos
    const canDelete = await permissionService.canDeleteForm(String(req.user!.id), String(id));
    if (!canDelete) {
      return res.status(403).json({ 
        error: 'No tienes permisos para modificar el acceso a este formulario' 
      });
    }

    if (!['VIEW', 'EDIT', 'FULL'].includes(permission)) {
      return res.status(400).json({ 
        error: 'Permiso inválido. Debe ser VIEW, EDIT o FULL' 
      });
    }

    const share = await formService.updateSharePermission(String(id), String(userId), permission);

    return res.json({
      message: 'Permisos actualizados exitosamente',
      share
    });
  } catch (error) {
    return next(error);
  }
};
