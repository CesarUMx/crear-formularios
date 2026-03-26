import { Response, NextFunction } from 'express';
import * as authService from '../services/authService.js';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, role } = req.body;

    // Validaciones básicas
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, contraseña y nombre son requeridos' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // Solo SUPER_ADMIN puede crear otros SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && (!req.user || req.user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ 
        error: 'No tienes permisos para crear Super Administradores' 
      });
    }

    const result = await authService.register({ email, password, name, role });

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      ...result
    });
  } catch (error: any) {
    if (error.message === 'El email ya está registrado') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email y contraseña son requeridos' 
      });
    }

    const result = await authService.login(email, password);

    res.json({
      message: 'Login exitoso',
      ...result
    });
  } catch (error: any) {
    if (error.message === 'Credenciales inválidas' || 
        error.message.includes('desactivado')) {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await authService.getProfile(String(req.user!.id));
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ 
        error: 'Debe proporcionar al menos un campo para actualizar' 
      });
    }

    const user = await authService.updateProfile(String(req.user!.id), { name, email });

    res.json({
      message: 'Perfil actualizado exitosamente',
      user
    });
  } catch (error: any) {
    if (error.message === 'El email ya está en uso') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Contraseña actual y nueva son requeridas' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'La nueva contraseña debe tener al menos 6 caracteres' 
      });
    }

    const result = await authService.changePassword(
      String(req.user!.id), 
      currentPassword, 
      newPassword
    );

    res.json(result);
  } catch (error: any) {
    if (error.message === 'Contraseña actual incorrecta') {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
};

export const logout = async (req: Request, res: Response) => {
  // En JWT no hay logout del lado del servidor
  // El cliente debe eliminar el token
  res.json({ 
    message: 'Logout exitoso. Elimina el token del cliente.' 
  });
};
