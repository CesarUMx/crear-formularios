import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

/**
 * Extended Express Request with authenticated user
 */
export interface AuthRequest extends Request {
  user?: {
    id: string | number;
    email: string;
    role: string;
    name?: string;
    permissions?: string[];
  };
}

/**
 * Middleware para requerir autenticación
 * Verifica el token JWT en el header Authorization
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void | Response => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No autorizado. Token no proporcionado.' 
      });
    }

    const token = authHeader.substring(7); // Remover "Bearer "
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ 
        error: 'Token inválido o expirado.' 
      });
    }

    // Extender la request con los datos del usuario
    (req as AuthRequest).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
    
    next();
  } catch (_error) {
    return res.status(401).json({ 
      error: 'Error de autenticación.' 
    });
  }
};

/**
 * Middleware para requerir rol de Super Admin
 * Debe usarse después de requireAuth
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void | Response => {
  const authReq = req as AuthRequest;
  
  if (!authReq.user) {
    return res.status(401).json({ 
      error: 'No autorizado.' 
    });
  }

  if (authReq.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ 
      error: 'Acceso denegado. Se requiere rol de Super Administrador.' 
    });
  }

  next();
};

/**
 * Middleware de autenticación opcional
 * No bloquea si no hay token, pero lo añade si es válido
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (decoded) {
        (req as AuthRequest).user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          name: decoded.name,
        };
      }
    }
    
    next();
  } catch (_error) {
    next();
  }
};
