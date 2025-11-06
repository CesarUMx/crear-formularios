import express from 'express';
import { upload, handleMulterError } from '../config/multer.js';
import * as fileService from '../services/fileService.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/files/upload
 * Subir archivo para una pregunta específica
 * Body: { questionId, responseId, formId }
 * File: archivo
 */
router.post('/upload', upload.single('file'), handleMulterError, async (req, res) => {
  try {
    const { questionId, responseId, formId } = req.body;
    const file = req.file;

    // Validaciones básicas
    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    if (!questionId || !responseId || !formId) {
      return res.status(400).json({ 
        error: 'Faltan parámetros requeridos: questionId, responseId, formId' 
      });
    }

    // Obtener configuración de la pregunta
    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    if (question.type !== 'FILE') {
      return res.status(400).json({ error: 'Esta pregunta no acepta archivos' });
    }

    // Validar tipo de archivo
    if (!fileService.validateFileType(file.mimetype, question.allowedFileTypes)) {
      const allowedTypes = question.allowedFileTypes || 'IMAGE, PDF, EXCEL';
      return res.status(400).json({ 
        error: `Tipo de archivo no permitido. Solo se aceptan: ${allowedTypes}` 
      });
    }

    // Validar tamaño
    if (!fileService.validateFileSize(file.size, question.maxFileSize)) {
      const maxSize = question.maxFileSize || 10;
      return res.status(400).json({ 
        error: `El archivo excede el tamaño máximo permitido de ${maxSize}MB` 
      });
    }

    // Procesar archivo según su tipo
    const processedFile = await fileService.processFile(file);

    // Guardar archivo
    const savedFile = await fileService.saveFile(processedFile, formId, responseId);

    // Responder con información del archivo
    res.json({
      success: true,
      file: {
        url: savedFile.fileUrl,
        name: savedFile.fileName,
        size: savedFile.fileSize,
        originalSize: savedFile.originalSize,
        reduction: savedFile.reduction,
        type: fileService.getFileType(file.mimetype)
      }
    });

  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ 
      error: error.message || 'Error al procesar el archivo' 
    });
  }
});

/**
 * DELETE /api/files/:formId/:responseId/:filename
 * Eliminar archivo
 */
router.delete('/:formId/:responseId/:filename', async (req, res) => {
  try {
    const { formId, responseId, filename } = req.params;
    const fileUrl = `/uploads/forms/${formId}/${responseId}/${filename}`;

    await fileService.deleteFile(fileUrl);

    res.json({ 
      success: true, 
      message: 'Archivo eliminado correctamente' 
    });

  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    res.status(500).json({ 
      error: 'Error al eliminar el archivo' 
    });
  }
});

/**
 * GET /api/files/info/:formId/:responseId/:filename
 * Obtener información de un archivo
 */
router.get('/info/:formId/:responseId/:filename', async (req, res) => {
  try {
    const { formId, responseId, filename } = req.params;
    const fileUrl = `/uploads/forms/${formId}/${responseId}/${filename}`;

    const info = await fileService.getFileInfo(fileUrl);

    if (!info.exists) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.json(info);

  } catch (error) {
    console.error('Error al obtener información del archivo:', error);
    res.status(500).json({ 
      error: 'Error al obtener información del archivo' 
    });
  }
});

export default router;
