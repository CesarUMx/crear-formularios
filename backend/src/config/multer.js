import multer from 'multer';
import path from 'path';

// Configuración de almacenamiento en memoria (para procesar antes de guardar)
const storage = multer.memoryStorage();

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  // Tipos MIME permitidos
  const allowedMimes = [
    // Imágenes
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    // PDF
    'application/pdf',
    // Excel
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes, PDF y Excel.'), false);
  }
};

// Configuración de multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // Límite temporal de 50MB (se validará después según configuración)
    files: 1 // Solo 1 archivo por request
  }
});

// Middleware para manejar errores de multer
export const handleMulterError = (err, req, res, next) => {
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
