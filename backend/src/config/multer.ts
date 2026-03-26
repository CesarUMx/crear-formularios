import multer, { FileFilterCallback, StorageEngine } from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Type alias for Multer File
type MulterFile = Express.Multer.File;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Tipos MIME permitidos
 */
const ALLOWED_MIMES = [
  // Imágenes
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  // PDF
  'application/pdf',
  // Excel
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  // Video MP4
  'video/mp4',
  // Audio MP3
  'audio/mpeg',
  'audio/mp3'
] as const;

type AllowedMimeType = typeof ALLOWED_MIMES[number];

/**
 * Configuración de almacenamiento en disco
 */
const storage: StorageEngine = multer.diskStorage({
  destination: (_req: Request, _file: MulterFile, cb: (error: Error | null, destination: string) => void) => {
    // Guardar en la carpeta uploads
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (_req: Request, file: MulterFile, cb: (error: Error | null, filename: string) => void) => {
    // Generar nombre único: timestamp-nombreoriginal
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, nameWithoutExt + '-' + uniqueSuffix + ext);
  }
});

/**
 * Filtro de archivos
 * Valida que el tipo MIME esté permitido
 */
const fileFilter = (_req: Request, file: MulterFile, cb: FileFilterCallback): void => {
  if (ALLOWED_MIMES.includes(file.mimetype as AllowedMimeType)) {
    cb(null, true);
  } else {
    cb(new Error(
      `Tipo de archivo no permitido: ${file.mimetype}. ` +
      `Solo se aceptan: Imágenes (JPG, PNG, GIF, WebP), PDF, Excel (XLS, XLSX), Video MP4 y Audio MP3.`
    ));
  }
};

/**
 * Configuración de multer
 */
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB para videos y audios
    files: 1 // Solo 1 archivo por request
  }
});

/**
 * Middleware para manejar errores de multer
 */
export const handleMulterError = (err: Error | undefined, _req: Request, res: Response, next: NextFunction): void | Response => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Demasiados archivos' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Campo de archivo inesperado' });
    }
    return res.status(400).json({ error: `Error de subida: ${err.message}` });
  }
  
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  
  next();
};

// Export types for external use
export type { AllowedMimeType };
export { ALLOWED_MIMES };
