import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      file?: Express.Multer.File;
      body: any;
      params: any;
      query: any;
      headers: any;
    }
  }
}

export {};
