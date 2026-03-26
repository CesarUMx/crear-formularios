import { User, UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        name: string;
      };
      file?: Express.Multer.File;
      body: any;
      params: any;
      query: any;
      headers: any;
    }
  }
}

export {};

export {};
