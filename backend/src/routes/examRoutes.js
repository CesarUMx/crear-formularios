import express from 'express';
import { upload, handleMulterError } from '../config/multer.js';
import {
  getExams,
  getExamById,
  getExamBySlug,
  createExam,
  updateExam,
  deleteExam,
  toggleExamPublish,
  toggleExamActive,
  shareExam,
  unshareExam,
  uploadSupportFile,
  deleteSupportFile,
  checkCanTakeExam,
  startAttempt,
  saveAnswer,
  submitAttempt,
  getAttemptResult,
  getExamAttempts,
  getAttemptById,
  gradeQuestionManually,
  getExamStats,
  adjustPoints
} from '../controllers/examController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ==================== RUTAS PÚBLICAS (sin autenticación) ====================

// Obtener examen público por slug
router.get('/public/:slug', getExamBySlug);

// Verificar si puede tomar el examen
router.get('/public/:slug/can-take', checkCanTakeExam);

// Iniciar intento de examen
router.post('/public/:slug/start', startAttempt);

// Obtener datos del intento (para continuar examen)
router.get('/attempts/:attemptId', getAttemptById);

// Guardar respuesta (durante el examen)
router.put('/attempts/:attemptId/answer', saveAnswer);

// Enviar/completar examen
router.post('/attempts/:attemptId/submit', submitAttempt);

// Obtener resultado del intento
router.get('/attempts/:attemptId/result', getAttemptResult);

// ==================== RUTAS PROTEGIDAS (requieren autenticación) ====================

router.use(requireAuth);

// CRUD básico de exámenes
router.get('/', getExams);
router.get('/:id', getExamById);
router.post('/', createExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);

// Publicar/despublicar examen
router.patch('/:id/publish', toggleExamPublish);

// Activar/desactivar examen
router.patch('/:id/status', toggleExamActive);

// Compartir exámenes
router.post('/:id/share', shareExam);
router.delete('/:id/share/:userId', unshareExam);

// Archivos de apoyo
router.post('/:id/files/upload', upload.single('file'), handleMulterError, async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    // Construir URL completa del backend
    const protocol = req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${file.filename}`;
    
    res.json({
      url: fileUrl,
      fileUrl: fileUrl,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/files', uploadSupportFile);
router.delete('/:id/files/:fileId', deleteSupportFile);

// Gestión de intentos (admin)
router.get('/:id/attempts', getExamAttempts);
router.get('/:id/attempts/:attemptId', getAttemptById);

// Calificación manual
router.put('/:id/attempts/:attemptId/answers/:answerId/grade', gradeQuestionManually);

// Estadísticas
router.get('/:id/stats', getExamStats);

// Utilidades
router.post('/adjust-points', adjustPoints);

export default router;
