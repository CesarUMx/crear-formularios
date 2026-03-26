import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware para requerir autenticación
 * Verifica el token JWT en el header Authorization
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'No autorizado. Token no proporcionado.' 
      });
      return;
    }

    const token = authHeader.substring(7); // Remover "Bearer "
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({ 
        error: 'Token inválido o expirado.' 
      });
      return;
    }

    // Extender la request con los datos del usuario
    req.user = {
      id: String(decoded.id),
      email: String(decoded.email),
      role: decoded.role as UserRole,
      name: String(decoded.name),
    };
    
    next();
  } catch (_error) {
    res.status(401).json({ 
      error: 'Error de autenticación.' 
    });
  }
};

/**
 * Middleware para requerir rol de Super Admin
 * Debe usarse después de requireAuth
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const authReq = req as Request;
  
  if (!authReq.user) {
    res.status(401).json({ 
      error: 'No autorizado.' 
    });
    return;
  }

  if (authReq.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ 
      error: 'Acceso denegado. Se requiere rol de Super Administrador.' 
    });
    return;
  }

  next();
};

/**
 * Middleware de autenticación opcional
 * No bloquea si no hay token, pero lo añade si es válido
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (decoded) {
        req.user = {
          id: String(decoded.id),
          email: String(decoded.email),
          role: decoded.role as UserRole,
          name: String(decoded.name),
        };
      }
    }
    
    next();
  } catch (_error) {
    next();
  }
};
