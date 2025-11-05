import * as userService from '../services/userService.js';

/**
 * Obtener todos los usuarios
 */
export const getUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener un usuario por ID
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Crear un nuevo usuario
 */
export const createUser = async (req, res, next) => {
  try {
    const { email, name, password, role } = req.body;

    // Validaciones
    if (!email || !name || !password) {
      return res.status(400).json({ 
        error: 'Email, nombre y contraseña son requeridos' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    if (role && !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return res.status(400).json({ 
        error: 'Rol inválido. Debe ser ADMIN o SUPER_ADMIN' 
      });
    }

    const user = await userService.createUser({
      email,
      name,
      password,
      role
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user
    });
  } catch (error) {
    if (error.message === 'El email ya está registrado') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar un usuario
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, isActive } = req.body;

    // Validar que no se intente cambiar el rol del propio usuario
    if (req.user.id === id && role && role !== req.user.role) {
      return res.status(403).json({ 
        error: 'No puedes cambiar tu propio rol' 
      });
    }

    // Validar rol
    if (role && !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return res.status(400).json({ 
        error: 'Rol inválido. Debe ser ADMIN o SUPER_ADMIN' 
      });
    }

    const user = await userService.updateUser(id, {
      name,
      role,
      isActive
    });

    res.json({
      message: 'Usuario actualizado exitosamente',
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resetear contraseña de un usuario
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ 
        error: 'La nueva contraseña es requerida' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    await userService.resetUserPassword(id, newPassword);

    res.json({
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar un usuario
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validar que no se intente eliminar a sí mismo
    if (req.user.id === id) {
      return res.status(403).json({ 
        error: 'No puedes eliminar tu propia cuenta' 
      });
    }

    await userService.deleteUser(id);

    res.json({
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    if (error.message === 'No se puede eliminar el último Super Administrador') {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Activar/Desactivar usuario
 */
export const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Validar que no se intente desactivar a sí mismo
    if (req.user.id === id && !isActive) {
      return res.status(403).json({ 
        error: 'No puedes desactivar tu propia cuenta' 
      });
    }

    const user = await userService.toggleUserStatus(id, isActive);

    res.json({
      message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      user
    });
  } catch (error) {
    if (error.message === 'No se puede desactivar el último Super Administrador activo') {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener estadísticas de usuarios
 */
export const getUserStats = async (req, res, next) => {
  try {
    const stats = await userService.getUserStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};
