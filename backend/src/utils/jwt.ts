import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambiar-en-produccion';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

interface User {
  id: number;
  email: string;
  role: string;
  name?: string;
}

interface TokenPayload extends JwtPayload {
  id: number;
  email: string;
  role: string;
  name?: string;
}

export const generateToken = (user: User): string => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };

  // Cast to string to satisfy TypeScript
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any }) as string;
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
};
