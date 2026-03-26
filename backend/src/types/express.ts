import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

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
 * User data structure
 */
export interface User {
  id: string | number;
  email: string;
  role: string;
  name?: string;
}

/**
 * JWT Token Payload
 */
export interface TokenPayload extends JwtPayload {
  id: number;
  email: string;
  role: string;
}

/**
 * Session Token Data
 */
export interface SessionToken {
  token: string;
  userId: number;
  examId: number;
  responseId?: number;
  expiresAt: Date;
  createdAt: Date;
}
