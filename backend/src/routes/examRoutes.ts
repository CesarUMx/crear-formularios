import express from 'express';
import {
  getExams,
  getExamById,
  getExamBySlug,
  createExam,
  updateExam,
  deleteExam,
  duplicateExam,
  toggleExamPublish,
  toggleExamActive,
  shareExam,
  unshareExam,
  getExamShares,
  getAvailableUsersForExam,
  updateExamSharePermission,
  checkCanTakeExam,
  startAttempt,
  saveAnswer,
  submitAttempt,
  getAttemptResult,
  sendAttemptResult,
  getExamAttempts,
  getAttemptById,
  gradeQuestionManually,
  getExamStats,
  uploadSectionFile,
  removeSectionFile,
  uploadQuestionFile,
  removeQuestionFile,
  addStudents,
  getStudents,
  updateStudent,
  removeStudent,
  loginStudent,
  recordTabSwitch,
  saveStudentPhoto,
  createQuestionReport,
  getQuestionReports,
  reviewQuestionReport,
  startExamSection,
  completeExamSection
} from '../controllers/examController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload, handleMulterError } from '../config/multer.js';

const router = express.Router();

// ==================== RUTAS PÚBLICAS (sin autenticación) ====================

// Obtener examen público por slug
router.get('/public/:slug', getExamBySlug);

// Verificar si puede tomar el examen
router.get('/public/:slug/can-take', checkCanTakeExam);

// Iniciar intento de examen
router.post('/public/:slug/start', startAttempt);

// Login de estudiante para examen privado
router.post('/login', loginStudent);

// Obtener datos del intento (para continuar examen)
router.get('/attempts/:attemptId', getAttemptById);

// Guardar respuesta (durante el examen - auto-guardado)
router.put('/attempts/:attemptId/answer', saveAnswer);

// Enviar/completar examen
router.post('/attempts/:attemptId/submit', submitAttempt);

// Obtener resultado del intento
router.get('/attempts/:attemptId/result', getAttemptResult);

// Enviar resultados por correo (público: el alumno se lo puede mandar a si mismo)
router.post('/attempts/:attemptId/send-result', sendAttemptResult);

// Seguridad: registrar cambio de pestaña
router.post('/attempts/:attemptId/tab-switch', recordTabSwitch);

// Seguridad: guardar foto del estudiante
router.post('/attempts/:attemptId/photo', saveStudentPhoto);

// Reporte de pregunta (público - el alumno reporta)
router.post('/:id/questions/:questionId/report', createQuestionReport);

// ==================== RUTAS PROTEGIDAS (requieren autenticación) ====================

router.use(requireAuth);

// CRUD básico de exámenes
router.get('/', getExams);
router.get('/:id', getExamById);
router.post('/', createExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);
router.post('/:id/duplicate', duplicateExam);

// Publicar/despublicar examen
router.patch('/:id/publish', toggleExamPublish);

// Activar/desactivar examen
router.patch('/:id/status', toggleExamActive);

// Compartir exámenes
router.get('/:id/shares', getExamShares);
router.get('/:id/available-users', getAvailableUsersForExam);
router.post('/:id/share', shareExam);
router.put('/:id/share/:userId', updateExamSharePermission);
router.delete('/:id/share/:userId', unshareExam);

// Archivos de sección
router.post('/:id/sections/:sectionId/file', upload.single('file'), handleMulterError, uploadSectionFile);
router.delete('/:id/sections/:sectionId/file', removeSectionFile);

// Archivos de pregunta
router.post('/:id/questions/:questionId/file', upload.single('file'), handleMulterError, uploadQuestionFile);
router.delete('/:id/questions/:questionId/file', removeQuestionFile);

// Gestión de estudiantes (examen privado)
router.post('/:id/students', addStudents);
router.get('/:id/students', getStudents);
router.put('/:id/students/:studentId', updateStudent);
router.delete('/:id/students/:studentId', removeStudent);

// Gestión de intentos (admin)
router.get('/:id/attempts', getExamAttempts);
router.get('/:id/attempts/:attemptId', getAttemptById);

// Control de sección (para timers por sección)
router.post('/attempts/:attemptId/sections/:sectionId/start', startExamSection);
router.post('/attempts/:attemptId/sections/:sectionId/complete', completeExamSection);

// Calificación manual
router.put('/:id/attempts/:attemptId/answers/:answerId/grade', gradeQuestionManually);

// Reportes de preguntas (admin)
router.get('/:id/reports', getQuestionReports);
router.put('/reports/:reportId', reviewQuestionReport);

// Estadísticas
router.get('/:id/stats', getExamStats);

export default router;
