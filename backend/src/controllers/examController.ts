import { Request, Response, NextFunction } from 'express';
import * as examService from '../services/examService.js';
import * as examAttemptService from '../services/examAttemptService.js';
import * as examGradingService from '../services/examGradingService.js';
import { sendExamResults } from '../utils/email-results.js';

/**
 * Obtener todos los exámenes del usuario
 */
export const getExams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exams = await examService.getUserExams(String(req.user!.id), req.user!.role);
    return res.json(exams);
  } catch (error) {
    return next(error);
  }
};

/**
 * Obtener un examen por ID
 */
export const getExamById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (!permission) {
      return res.status(403).json({ 
        error: 'No tienes permisos para acceder a este examen' 
      });
    }

    const exam = await examService.getExamById(String(id));

    if (!exam) {
      return res.status(404).json({ 
        error: 'Examen no encontrado' 
      });
    }

    return res.json(exam);
  } catch (error) {
    return next(error);
  }
};

/**
 * Obtener examen por slug (público)
 */
export const getExamBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const exam = await examService.getExamBySlug(String(slug));

    if (!exam) {
      return res.status(404).json({ 
        error: 'Examen no encontrado o no disponible' 
      });
    }

    return res.json(exam);
  } catch (error) {
    return next(error);
  }
};

/**
 * Crear un nuevo examen
 */
export const createExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      title, 
      description, 
      sections, 
      timeLimit,
      maxAttempts,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      instructions,
      questionsPerAttempt,
      accessType,
      strictSecurity
    } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ 
        error: 'El título es requerido' 
      });
    }

    if (!sections || sections.length === 0) {
      return res.status(400).json({ 
        error: 'Debe incluir al menos una sección' 
      });
    }

    for (const section of sections) {
      if (!section.questions || section.questions.length === 0) {
        return res.status(400).json({ 
          error: `La sección "${section.title}" debe tener al menos una pregunta` 
        });
      }

      for (const question of section.questions) {
        if (['RADIO', 'CHECKBOX', 'TRUE_FALSE'].includes(question.type)) {
          if (!question.options || question.options.length === 0) {
            return res.status(400).json({ 
              error: `La pregunta "${question.text}" requiere opciones` 
            });
          }

          const hasCorrect = question.options.some((opt: any) => opt.isCorrect);
          if (!hasCorrect) {
            return res.status(400).json({ 
              error: `La pregunta "${question.text}" debe tener al menos una respuesta correcta` 
            });
          }
        }

        if (!question.points || question.points <= 0) {
          return res.status(400).json({ 
            error: `La pregunta "${question.text}" debe tener puntos asignados` 
          });
        }
      }
    }

    const exam = await examService.createExam(String(req.user!.id), {
      title,
      description,
      timeLimit,
      maxAttempts,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      instructions,
      questionsPerAttempt,
      accessType,
      strictSecurity,
      sections
    });

    return res.status(201).json({
      message: 'Examen creado exitosamente',
      exam
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Actualizar un examen (crea nueva versión)
 */
export const updateExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      sections,
      timeLimit,
      maxAttempts,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      instructions,
      questionsPerAttempt,
      accessType,
      strictSecurity
    } = req.body;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL' && permission !== 'EDIT') {
      return res.status(403).json({ 
        error: 'No tienes permisos para editar este examen' 
      });
    }

    if (!title || title.trim() === '') {
      return res.status(400).json({ 
        error: 'El título es requerido' 
      });
    }

    const exam = await examService.updateExam(String(id), {
      title,
      description,
      timeLimit,
      maxAttempts,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      instructions,
      questionsPerAttempt,
      accessType,
      strictSecurity,
      sections
    });

    return res.json({
      message: 'Examen actualizado exitosamente',
      exam
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Eliminar un examen
 */
export const deleteExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL') {
      return res.status(403).json({ 
        error: 'No tienes permisos para eliminar este examen' 
      });
    }

    await examService.deleteExam(String(id));

    return res.json({
      message: 'Examen eliminado exitosamente'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Publicar/despublicar examen (activa o desactiva)
 */
export const toggleExamPublish = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL') {
      return res.status(403).json({ 
        error: 'No tienes permisos para publicar este examen' 
      });
    }

    const exam = await examService.toggleExamPublish(String(id), isActive);

    return res.json({
      message: `Examen ${isActive ? 'publicado' : 'despublicado'} exitosamente`,
      exam
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Activar/desactivar examen
 */
export const toggleExamActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL' && permission !== 'EDIT') {
      return res.status(403).json({ 
        error: 'No tienes permisos para modificar este examen' 
      });
    }

    const exam = await examService.toggleExamActive(String(id), isActive);

    return res.json({
      message: `Examen ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      exam
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Compartir examen
 */
export const shareExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { userId, permission } = req.body;

    const userPermission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (userPermission !== 'FULL') {
      return res.status(403).json({ 
        error: 'No tienes permisos para compartir este examen' 
      });
    }

    if (!userId) {
      return res.status(400).json({ 
        error: 'El ID del usuario es requerido' 
      });
    }

    if (!['VIEW', 'EDIT', 'FULL'].includes(permission)) {
      return res.status(400).json({ 
        error: 'Permiso inválido. Debe ser VIEW, EDIT o FULL' 
      });
    }

    const share = await examService.shareExam(String(id), userId, permission);

    return res.status(201).json({
      message: 'Examen compartido exitosamente',
      share
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Remover acceso compartido
 */
export const unshareExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, userId } = req.params;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL') {
      return res.status(403).json({ 
        error: 'No tienes permisos para modificar el acceso a este examen' 
      });
    }

    await examService.unshareExam(String(id), String(userId));

    return res.json({
      message: 'Acceso removido exitosamente'
    });
  } catch (error) {
    return next(error);
  }
};

export const getExamShares = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (!permission) return res.status(403).json({ error: 'No tienes acceso a este examen' });

    const shares = await examService.getExamShares(String(id));
    return res.json(shares);
  } catch (error) {
    return next(error);
  }
};

export const getAvailableUsersForExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL') return res.status(403).json({ error: 'No tienes permisos para compartir' });

    const users = await examService.getAvailableUsersForExam(String(id));
    return res.json(users);
  } catch (error) {
    return next(error);
  }
};

export const updateExamSharePermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, userId } = req.params;
    const { permission } = req.body;

    const userPerm = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (userPerm !== 'FULL') return res.status(403).json({ error: 'No tienes permisos' });

    if (!['VIEW', 'EDIT', 'FULL'].includes(permission)) return res.status(400).json({ error: 'Permiso invalido' });

    const share = await examService.updateExamSharePermission(String(id), String(userId), permission);
    return res.json(share);
  } catch (error) {
    return next(error);
  }
};

/**
 * Verificar si puede tomar el examen
 */
export const checkCanTakeExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const { email } = req.query;

    const result = await examAttemptService.canTakeExam(
      String(slug), 
      email as string | null, 
      req.ip || ''
    );

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Iniciar intento de examen
 */
export const startAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const { name, email, studentId } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        error: 'El nombre es requerido' 
      });
    }

    // Verificar tipo de examen para exigir correo en exámenes públicos
    const examInfo = await examService.getExamBySlug(String(slug));
    if (examInfo && examInfo.accessType === 'PUBLIC') {
      if (!email || String(email).trim() === '') {
        return res.status(400).json({ error: 'El correo electrónico es requerido' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(email).trim())) {
        return res.status(400).json({ error: 'El correo electrónico no es válido' });
      }
    }

    const attempt = await examAttemptService.startExamAttempt(
      String(slug),
      { name, email, studentId },
      req.ip || '',
      req.get('user-agent') || ''
    );

    return res.status(201).json({
      message: 'Examen iniciado exitosamente',
      attempt
    });
  } catch (error: any) {
    if (error.message.includes('límite')) {
      return res.status(403).json({ error: error.message });
    }
    return next(error);
  }
};

/**
 * Guardar respuesta
 */
export const saveAnswer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attemptId: _attemptId } = req.params;
    const { questionId, textValue, selectedOptionIds, jsonValue } = req.body;

    console.log('=== SaveAnswer Debug ===');
    console.log('attemptId:', _attemptId);
    console.log('questionId:', questionId);
    console.log('questionId type:', typeof questionId);
    console.log('textValue:', textValue);
    console.log('selectedOptionIds:', selectedOptionIds);
    console.log('=======================');

    if (!questionId) {
      return res.status(400).json({ 
        error: 'El ID de la pregunta es requerido' 
      });
    }

    await examAttemptService.saveAnswer(String(_attemptId), String(questionId), {
      textValue,
      selectedOptionIds,
      jsonValue
    });

    return res.json({
      message: 'Respuesta guardada exitosamente'
    });
  } catch (error: any) {
    if (error.message.includes('tiempo')) {
      return res.status(403).json({ error: error.message });
    }
    return next(error);
  }
};

/**
 * Enviar/completar examen
 */
export const submitAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attemptId: _attemptId } = req.params;

    const result = await examAttemptService.submitExamAttempt(String(_attemptId));

    return res.json({
      message: 'Examen enviado exitosamente',
      ...result
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Obtener resultado de intento
 */
export const getAttemptResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attemptId: _attemptId } = req.params;
    console.log('=== getAttemptResult ===');
    console.log('attemptId:', _attemptId);

    const result = await examAttemptService.getAttemptResult(String(_attemptId));
    console.log('Result retrieved successfully');

    return res.json(result);
  } catch (error) {
    console.error('Error in getAttemptResult:', error);
    return next(error);
  }
};

/**
 * Enviar resultados de un intento por correo
 * Siempre envía al correo registrado en el intento.
 */
export const sendAttemptResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attemptId } = req.params;
    const { email: emailOverride } = req.body || {};

    const attempt = await examAttemptService.getAttemptForEmail(String(attemptId));

    // Resolver correo destino: prioridad al override (si es válido), sino el registrado.
    let targetEmail: string | null = attempt.studentEmail;
    if (typeof emailOverride === 'string' && emailOverride.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailOverride.trim())) {
        return res.status(400).json({ error: 'El correo proporcionado no es válido' });
      }
      targetEmail = emailOverride.trim();
    }

    if (!targetEmail) {
      return res.status(400).json({
        error: 'Este intento no tiene correo registrado'
      });
    }

    if (!attempt.exam.showResults) {
      return res.status(400).json({
        error: 'Los resultados no están disponibles para este examen'
      });
    }

    const maxScore = attempt.maxScore || 0;
    const score = attempt.score || 0;
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    const frontendBase = process.env.FRONTEND_URL || '';
    const resultUrl = frontendBase
      ? `${frontendBase}/e/${attempt.exam.slug}/result/${attempt.id}`
      : undefined;

    await sendExamResults({
      studentName: attempt.studentName || 'Estudiante',
      studentEmail: targetEmail,
      examTitle: attempt.exam.title,
      score,
      maxScore,
      percentage,
      passingScore: attempt.exam.passingScore,
      passed: attempt.passed,
      requiresManualGrading: !!attempt.requiresManualGrading,
      completedAt: attempt.completedAt,
      timeSpent: attempt.timeSpent,
      resultUrl,
    });

    return res.json({
      message: 'Resultados enviados correctamente',
      email: targetEmail,
    });
  } catch (error) {
    console.error('Error en sendAttemptResult:', error);
    return next(error);
  }
};

/**
 * Obtener todos los intentos de un examen (admin)
 */
export const getExamAttempts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (!permission) {
      return res.status(403).json({ 
        error: 'No tienes permisos para ver los intentos de este examen' 
      });
    }

    const attempts = await examAttemptService.getExamAttempts(String(id));

    return res.json(attempts);
  } catch (error) {
    return next(error);
  }
};

/**
 * Obtener un intento específico
 * Puede ser usado públicamente (durante el examen) o por admin
 */
export const getAttemptById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, attemptId } = req.params;
    const actualAttemptId = attemptId || id; // Soporta ambas rutas

    // Si hay usuario autenticado y examId, verificar permisos
    if (req.user && id && attemptId) {
      const permission = await examService.checkExamPermission(String(id), String(req.user.id), req.user.role);
      if (!permission) {
        return res.status(403).json({ 
          error: 'No tienes permisos para ver este intento' 
        });
      }
    }

    const attempt = await examAttemptService.getAttemptById(String(actualAttemptId));

    if (!attempt) {
      return res.status(404).json({ 
        error: 'Intento no encontrado' 
      });
    }

    // Si el intento ya está completado, no permitir acceso público
    if (!req.user && attempt.completedAt) {
      return res.status(403).json({
        error: 'Este intento ya ha sido completado'
      });
    }

    return res.json(attempt);
  } catch (error) {
    return next(error);
  }
};

/**
 * Calificar pregunta manualmente
 */
export const gradeQuestionManually = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, attemptId: _attemptId, answerId } = req.params;
    const { pointsEarned, feedback } = req.body;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL' && permission !== 'EDIT') {
      return res.status(403).json({ 
        error: 'No tienes permisos para calificar este examen' 
      });
    }

    if (pointsEarned === undefined || pointsEarned === null) {
      return res.status(400).json({ 
        error: 'Los puntos son requeridos' 
      });
    }

    const result = await examGradingService.gradeQuestionManually(
      String(answerId),
      pointsEarned,
      feedback
    );

    return res.json({
      message: 'Pregunta calificada exitosamente',
      ...result
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Obtener estadísticas del examen
 */
export const getExamStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (!permission) {
      return res.status(403).json({ 
        error: 'No tienes permisos para ver las estadísticas de este examen' 
      });
    }

    const stats = await examGradingService.getExamStats(String(id));

    return res.json(stats);
  } catch (error) {
    return next(error);
  }
};

// ==================== ARCHIVOS (Sección/Pregunta) ====================

/**
 * Subir archivo a una sección
 */
export const uploadSectionFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, sectionId } = req.params;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL' && permission !== 'EDIT') {
      return res.status(403).json({ error: 'No tienes permisos para editar este examen' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó un archivo' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const section = await examService.uploadSectionFile(String(id), String(sectionId), {
      url: fileUrl,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });

    return res.json({ message: 'Archivo subido exitosamente', section });
  } catch (error) {
    return next(error);
  }
};

/**
 * Eliminar archivo de una sección
 */
export const removeSectionFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, sectionId } = req.params;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL' && permission !== 'EDIT') {
      return res.status(403).json({ error: 'No tienes permisos para editar este examen' });
    }

    await examService.deleteSectionFile(String(id), String(sectionId));
    return res.json({ message: 'Archivo eliminado exitosamente' });
  } catch (error) {
    return next(error);
  }
};

/**
 * Subir archivo a una pregunta
 */
export const uploadQuestionFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, questionId } = req.params;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL' && permission !== 'EDIT') {
      return res.status(403).json({ error: 'No tienes permisos para editar este examen' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó un archivo' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const question = await examService.uploadQuestionFile(String(id), String(questionId), {
      url: fileUrl,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });

    return res.json({ message: 'Archivo subido exitosamente', question });
  } catch (error) {
    return next(error);
  }
};

/**
 * Eliminar archivo de una pregunta
 */
export const removeQuestionFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, questionId } = req.params;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL' && permission !== 'EDIT') {
      return res.status(403).json({ error: 'No tienes permisos para editar este examen' });
    }

    await examService.deleteQuestionFile(String(id), String(questionId));
    return res.json({ message: 'Archivo eliminado exitosamente' });
  } catch (error) {
    return next(error);
  }
};

// ==================== ESTUDIANTES (Examen Privado) ====================

/**
 * Agregar estudiantes a un examen privado
 */
export const addStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { students } = req.body;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL') {
      return res.status(403).json({ error: 'No tienes permisos para gestionar estudiantes' });
    }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un estudiante' });
    }

    for (const s of students) {
      if (!s.name || !s.email || !s.password) {
        return res.status(400).json({ error: 'Cada estudiante debe tener nombre, email y contraseña' });
      }
    }

    const created = await examService.addStudents(String(id), students);
    return res.status(201).json({ message: 'Estudiantes agregados exitosamente', students: created });
  } catch (error: any) {
    if (error.message.includes('privado')) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
};

/**
 * Obtener estudiantes de un examen
 */
export const getStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (!permission) {
      return res.status(403).json({ error: 'No tienes permisos para ver este examen' });
    }

    const students = await examService.getStudents(String(id));
    return res.json(students);
  } catch (error) {
    return next(error);
  }
};

/**
 * Actualizar estudiante
 */
export const updateStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, studentId } = req.params;
    const { isActive, name } = req.body;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL') {
      return res.status(403).json({ error: 'No tienes permisos para gestionar estudiantes' });
    }

    const student = await examService.updateStudent(String(id), String(studentId), { isActive, name });
    return res.json({ message: 'Estudiante actualizado', student });
  } catch (error) {
    return next(error);
  }
};

/**
 * Eliminar estudiante
 */
export const removeStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, studentId } = req.params;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (permission !== 'FULL') {
      return res.status(403).json({ error: 'No tienes permisos para gestionar estudiantes' });
    }

    await examService.deleteStudent(String(id), String(studentId));
    return res.json({ message: 'Estudiante eliminado exitosamente' });
  } catch (error) {
    return next(error);
  }
};

/**
 * Login de estudiante para examen privado
 */
export const loginStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug, email, password } = req.body;

    if (!slug || !email || !password) {
      return res.status(400).json({ error: 'Slug, email y contraseña son requeridos' });
    }

    const result = await examService.loginStudent(String(slug), String(email), String(password));
    return res.json(result);
  } catch (error: any) {
    if (error.message === 'Credenciales inválidas') {
      return res.status(401).json({ error: error.message });
    }
    return next(error);
  }
};

// ==================== SEGURIDAD ====================

/**
 * Registrar cambio de pestaña
 */
export const recordTabSwitch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attemptId } = req.params;
    const result = await examAttemptService.recordTabSwitch(String(attemptId));
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Guardar foto del estudiante
 */
export const saveStudentPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attemptId } = req.params;
    const { photo } = req.body;

    if (!photo) {
      return res.status(400).json({ error: 'La foto es requerida' });
    }

    const result = await examAttemptService.saveStudentPhoto(String(attemptId), String(photo));
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

// ==================== REPORTES DE PREGUNTAS ====================

/**
 * Crear reporte de pregunta
 */
export const createQuestionReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, questionId } = req.params;
    const { attemptId, questionText, userAnswer, correctAnswer, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'El motivo del reporte es requerido' });
    }

    const report = await examService.createQuestionReport({
      examId: String(id),
      attemptId: String(attemptId),
      questionId: String(questionId),
      questionText: questionText || '',
      userAnswer: userAnswer || '',
      correctAnswer: correctAnswer || '',
      reason: String(reason)
    });

    return res.status(201).json({ message: 'Reporte creado exitosamente', report });
  } catch (error) {
    return next(error);
  }
};

/**
 * Obtener reportes de un examen
 */
export const getQuestionReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    const permission = await examService.checkExamPermission(String(id), String(req.user!.id), req.user!.role);
    if (!permission) {
      return res.status(403).json({ error: 'No tienes permisos para ver los reportes' });
    }

    const reports = await examService.getQuestionReports(String(id), status as string | undefined);
    return res.json(reports);
  } catch (error) {
    return next(error);
  }
};

/**
 * Revisar reporte
 */
export const reviewQuestionReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId } = req.params;
    const { status, reviewNotes } = req.body;

    if (!status || !['REVIEWED', 'ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const report = await examService.reviewQuestionReport(String(reportId), {
      status,
      reviewNotes,
      reviewedBy: String(req.user!.id)
    });

    return res.json({ message: 'Reporte actualizado', report });
  } catch (error) {
    return next(error);
  }
};

/**
 * Iniciar una sección (registrar timestamp de inicio)
 */
export const startExamSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attemptId, sectionId } = req.params;

    const attempt = await examAttemptService.startSection(String(attemptId), String(sectionId));

    return res.json({
      message: 'Sección iniciada',
      sectionTimes: attempt.sectionTimes
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Completar una sección (registrar timestamp de finalización)
 */
export const completeExamSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attemptId, sectionId } = req.params;

    const attempt = await examAttemptService.completeSection(String(attemptId), String(sectionId));

    return res.json({
      message: 'Sección completada',
      sectionTimes: attempt.sectionTimes
    });
  } catch (error) {
    return next(error);
  }
};
