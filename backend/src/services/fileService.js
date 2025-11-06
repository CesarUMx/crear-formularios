import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import xlsx from 'xlsx';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'forms');

/**
 * Asegurar que existe el directorio de uploads
 */
export const ensureUploadDir = async (formId, responseId) => {
  const dir = path.join(UPLOAD_DIR, formId, responseId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

/**
 * Procesar imagen: convertir a WebP y optimizar
 */
export const processImage = async (buffer, filename) => {
  try {
    const processedBuffer = await sharp(buffer)
      .webp({ quality: 85, effort: 6 }) // Calidad 85%, máximo esfuerzo de compresión
      .toBuffer();
    
    const newFilename = filename.replace(/\.(jpg|jpeg|png|gif|bmp|tiff)$/i, '.webp');
    
    return {
      buffer: processedBuffer,
      filename: newFilename,
      originalSize: buffer.length,
      processedSize: processedBuffer.length,
      reduction: ((1 - processedBuffer.length / buffer.length) * 100).toFixed(2)
    };
  } catch (error) {
    console.error('Error procesando imagen:', error);
    throw new Error('Error al procesar la imagen');
  }
};

/**
 * Procesar PDF: comprimir
 */
export const processPDF = async (buffer, filename) => {
  try {
    // Cargar el PDF
    const pdfDoc = await PDFDocument.load(buffer);
    
    // Guardar con compresión
    const compressedBuffer = await pdfDoc.save({
      useObjectStreams: true, // Compresión de objetos
      addDefaultPage: false,
      objectsPerTick: 50
    });
    
    return {
      buffer: Buffer.from(compressedBuffer),
      filename: filename,
      originalSize: buffer.length,
      processedSize: compressedBuffer.length,
      reduction: ((1 - compressedBuffer.length / buffer.length) * 100).toFixed(2)
    };
  } catch (error) {
    console.error('Error procesando PDF:', error);
    throw new Error('Error al procesar el PDF');
  }
};

/**
 * Procesar Excel: optimizar
 */
export const processExcel = async (buffer, filename) => {
  try {
    // Leer el archivo Excel
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    // Escribir con compresión
    const compressedBuffer = xlsx.write(workbook, {
      type: 'buffer',
      compression: true,
      bookType: 'xlsx'
    });
    
    return {
      buffer: compressedBuffer,
      filename: filename,
      originalSize: buffer.length,
      processedSize: compressedBuffer.length,
      reduction: ((1 - compressedBuffer.length / buffer.length) * 100).toFixed(2)
    };
  } catch (error) {
    console.error('Error procesando Excel:', error);
    throw new Error('Error al procesar el archivo Excel');
  }
};

/**
 * Determinar el tipo de archivo
 */
export const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'IMAGE';
  if (mimetype === 'application/pdf') return 'PDF';
  if (mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      mimetype === 'application/vnd.ms-excel') return 'EXCEL';
  return 'UNKNOWN';
};

/**
 * Validar tipo de archivo contra los permitidos
 */
export const validateFileType = (mimetype, allowedTypes) => {
  if (!allowedTypes) return true; // Si no hay restricción, permitir todo
  
  const fileType = getFileType(mimetype);
  const allowed = allowedTypes.split(',').map(t => t.trim());
  
  return allowed.includes(fileType);
};

/**
 * Validar tamaño de archivo
 */
export const validateFileSize = (size, maxSize) => {
  if (!maxSize) maxSize = 10; // Default 10MB
  
  const maxBytes = maxSize * 1024 * 1024; // Convertir MB a bytes
  return size <= maxBytes;
};

/**
 * Procesar archivo según su tipo
 */
export const processFile = async (file) => {
  const fileType = getFileType(file.mimetype);
  
  switch (fileType) {
    case 'IMAGE':
      return await processImage(file.buffer, file.originalname);
    
    case 'PDF':
      return await processPDF(file.buffer, file.originalname);
    
    case 'EXCEL':
      return await processExcel(file.buffer, file.originalname);
    
    default:
      throw new Error('Tipo de archivo no soportado');
  }
};

/**
 * Guardar archivo procesado
 */
export const saveFile = async (processedFile, formId, responseId) => {
  try {
    const uploadDir = await ensureUploadDir(formId, responseId);
    const filePath = path.join(uploadDir, processedFile.filename);
    
    await fs.writeFile(filePath, processedFile.buffer);
    
    // Retornar la URL relativa
    const fileUrl = `/uploads/forms/${formId}/${responseId}/${processedFile.filename}`;
    
    return {
      fileUrl,
      fileName: processedFile.filename,
      fileSize: processedFile.processedSize,
      originalSize: processedFile.originalSize,
      reduction: processedFile.reduction
    };
  } catch (error) {
    console.error('Error guardando archivo:', error);
    throw new Error('Error al guardar el archivo');
  }
};

/**
 * Eliminar archivo
 */
export const deleteFile = async (fileUrl) => {
  try {
    const filePath = path.join(process.cwd(), fileUrl);
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    // No lanzar error si el archivo no existe
  }
};

/**
 * Obtener información del archivo
 */
export const getFileInfo = async (fileUrl) => {
  try {
    const filePath = path.join(process.cwd(), fileUrl);
    const stats = await fs.stat(filePath);
    
    return {
      exists: true,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    return {
      exists: false
    };
  }
};
