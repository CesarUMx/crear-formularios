import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import xlsx from 'xlsx';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'forms');

type FileType = 'IMAGE' | 'PDF' | 'EXCEL' | 'UNKNOWN';

interface ProcessedFile {
  buffer: Buffer;
  filename: string;
  originalSize: number;
  processedSize: number;
  reduction: string;
}

interface SavedFile {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  originalSize: number;
  reduction: string;
}

interface FileInfo {
  exists: boolean;
  size?: number;
  created?: Date;
  modified?: Date;
}

interface FileWithBuffer {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/**
 * Asegurar que existe el directorio de uploads
 */
export const ensureUploadDir = async (formId: string, responseId: string): Promise<string> => {
  const dir = path.join(UPLOAD_DIR, formId, responseId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

/**
 * Procesar imagen: convertir a WebP y optimizar
 */
export const processImage = async (buffer: Buffer, filename: string): Promise<ProcessedFile> => {
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
export const processPDF = async (buffer: Buffer, filename: string): Promise<ProcessedFile> => {
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
export const processExcel = async (buffer: Buffer, filename: string): Promise<ProcessedFile> => {
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
      buffer: Buffer.isBuffer(compressedBuffer) ? compressedBuffer : Buffer.from(compressedBuffer),
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
export const getFileType = (mimetype: string): FileType => {
  if (mimetype.startsWith('image/')) return 'IMAGE';
  if (mimetype === 'application/pdf') return 'PDF';
  if (mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      mimetype === 'application/vnd.ms-excel') return 'EXCEL';
  return 'UNKNOWN';
};

/**
 * Validar tipo de archivo contra los permitidos
 */
export const validateFileType = (mimetype: string, allowedTypes?: string): boolean => {
  if (!allowedTypes) return true; // Si no hay restricción, permitir todo
  
  const fileType = getFileType(mimetype);
  const allowed = allowedTypes.split(',').map(t => t.trim());
  
  return allowed.includes(fileType);
};

/**
 * Validar tamaño de archivo
 */
export const validateFileSize = (size: number, maxSize?: number): boolean => {
  if (!maxSize) maxSize = 10; // Default 10MB
  
  const maxBytes = maxSize * 1024 * 1024; // Convertir MB a bytes
  return size <= maxBytes;
};

/**
 * Procesar archivo según su tipo
 */
export const processFile = async (file: FileWithBuffer): Promise<ProcessedFile> => {
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
export const saveFile = async (processedFile: ProcessedFile, formId: string, responseId: string): Promise<SavedFile> => {
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
export const deleteFile = async (fileUrl: string): Promise<void> => {
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
export const getFileInfo = async (fileUrl: string): Promise<FileInfo> => {
  try {
    const filePath = path.join(process.cwd(), fileUrl);
    const stats = await fs.stat(filePath);
    
    return {
      exists: true,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (_error) {
    return {
      exists: false
    };
  }
};

// Export types
export type { FileType, ProcessedFile, SavedFile, FileInfo, FileWithBuffer };
