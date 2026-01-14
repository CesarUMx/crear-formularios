import * as examService from '../services/examService.js';
import * as examAttemptService from '../services/examAttemptService.js';
import * as examGradingService from '../services/examGradingService.js';

/**
 * Obtener todos los exámenes del usuario
 */
export const getExams = async (req, res, next) => {
  try {
    const exams = await examService.getUserExams(req.user.id, req.user.role);
    res.json(exams);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener un examen por ID
 */
export const getExamById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const permission = await examService.checkExamPermission(id, req.user.id, req.user.role);
    if (!permission) {
      return res.status(403).json({ 
        error: 'No tienes permisos para acceder a este examen' 
      });
    }

    const exam = await examService.getExamById(id);

    if (!exam) {
      return res.status(404).json({ 
        error: 'Examen no encontrado' 
      });
    }

    res.json(exam);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener examen por slug (público)
 */
export const getExamBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const exam = await examService.getExamBySlug(slug);

    if (!exam) {
      return res.status(404).json({ 
        error: 'Examen no encontrado o no disponible' 
      });
    }

    res.json(exam);
  } catch (error) {
    next(error);
  }
};

/**
 * Crear un nuevo examen
 */
export const createExam = async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      sections, 
      templateId,
      timeLimit,
      maxAttempts,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      allowReview
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

          const hasCorrect = question.options.some(opt => opt.isCorrect);
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

    if (!examService.validateTotalPoints(sections)) {
      return res.status(400).json({ 
        error: 'La suma total de puntos debe ser 100' 
      });
    }

    const exam = await examService.createExam(req.user.id, {
      title,
      description,
      templateId: templateId || 'modern',
      timeLimit,
      maxAttempts,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      allowReview,
      sections
    });

    res.status(201).json({
      message: 'Examen creado exitosamente',
      exam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar un examen (crea nueva versión)
 */
export const updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      templateId, 
      sections,
      timeLimit,
      maxAttempts,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      allowReview
    } = req.body;

    const permission = await examService.checkExamPermission(id, req.user.id, req.user.role);
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

    if (!examService.validateTotalPoints(sections)) {
      return res.status(400).json({ 
        error: 'La suma total de puntos debe ser 100' 
      });
    }

    const exam = await examService.updateExam(id, {
      title,
      description,
      templateId,
      timeLimit,
      maxAttempts,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      allowReview,
      sections
    });

    res.json({
      message: 'Examen actualizado exitosamente (nueva versión creada)',
      exam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar un examen
 */
export const deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;

    const permission = await examService.checkExamPermission(id, req.user.id, req.user.role);
    if (permission !== 'FULL') {
      return res.status(403).json({ 
        error: 'No tienes permisos para eliminar este examen' 
      });
    }

    await examService.deleteExam(id);

    res.json({
      message: 'Examen eliminado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Publicar/despublicar examen
 */
export const toggleExamPublish = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;

    const permission = await examService.checkExamPermission(id, req.user.id, req.user.role);
    if (permission !== 'FULL') {
      return res.status(403).json({ 
        error: 'No tienes permisos para publicar este examen' 
      });
    }

    const exam = await examService.toggleExamPublish(id, isPublic);

    res.json({
      message: `Examen ${isPublic ? 'publicado' : 'despublicado'} exitosamente`,
      exam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activar/desactivar examen
 */
export const toggleExamActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const permission = await examService.checkExamPermission(id, req.user.id, req.user.role);
    if (permission !== 'FULL' && permission !== 'EDIT') {
      return res.status(403).json({ 
        error: 'No tienes permisos para modificar este examen' 
      });
    }

    const exam = await examService.toggleExamActive(id, isActive);

    res.json({
      message: `Examen ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      exam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Compartir examen
 */
export const shareExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, permission } = req.body;

    const userPermission = await examService.checkExamPermission(id, req.user.id, req.user.role);
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

    const share = await examService.shareExam(id, userId, permission);

    res.status(201).json({
      message: 'Examen compartido exitosamente',
      share
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remover acceso compartido
 */
export const unshareExam = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    const permission = await examService.checkExamPermission(id, req.user.id, req.user.role);
    if (permission !== 'FULL') {
      return res.status(403).json({ 
        error: 'No tienes permisos para modificar el acceso a este examen' 
      });
    }

    await examService.unshareExam(id, userId);

    res.json({
      message: 'Acceso removido exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Subir archivo de apoyo
 */
export const uploadSupportFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fileName, fileUrl, fileType, fileSize } = req.body;

    console.log('=== uploadSupportFile ===');
    console.log('fileUrl recibida:', fileUrl);
    console.log('========================');

    const permission = await examService.checkExamPermission(id, req.user.id, req.user.role);
    if (permission !== 'FULL' && permission !== 'EDIT') {
      return res.status(403).json({ 
        error: 'No tienes permisos para modificar este examen' 
      });
    }

    const file = await examService.addSupportFile(id, {
      fileName,
      fileUrl,
      fileType,
      fileSize
    });

    res.status(201).json({
      message: 'Archivo subido exitosamente',
      file
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar archivo de apoyo
 */
export const deleteSupportFile = async (req, res, next) => {
  try {
    const { id, fileId } = req.params;

    const permission = await examService.checkExamPermission(id, req.user.id, req.user.role);
    if (permission !== 'FULL' && permission !== 'EDIT') {
      return res.status(403).json({ 
        error: 'No tienes permisos para modificar este examen' 
      });
    }

    await examService.deleteSupportFile(fileId);

    res.json({
      message: 'Archivo eliminado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verificar si puede tomar el examen
 */
export const checkCanTakeExam = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { email } = req.query;

    const result = await examAttemptService.canTakeExam(
      slug, 
      email, 
      req.ip
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Iniciar intento de examen
 */
export const startAttempt = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { name, email } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        error: 'El nombre es requerido' 
      });
    }

    const attempt = await examAttemptService.startExamAttempt(
      slug,
      { name, email },
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json({
      message: 'Examen iniciado exitosamente',
      attempt
    });
  } catch (error) {
    if (error.message.includes('límite')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Guardar respuesta
 */
export const saveAnswer = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { questionId, textValue, selectedOptionIds, jsonValue } = req.body;

    console.log('=== SaveAnswer Debug ===');
    console.log('attemptId:', attemptId);
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

    await examAttemptService.saveAnswer(attemptId, questionId, {
      textValue,
      selectedOptionIds,
      jsonValue
    });

    res.json({
      message: 'Respuesta guardada exitosamente'
    });
  } catch (error) {
    if (error.message.includes('tiempo')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Enviar/completar examen
 */
export const submitAttempt = async (req, res, next) => {
  try {
    const { attemptId } = req.params;

    const result = await examAttemptService.submitExamAttempt(attemptId);

    res.json({
      message: 'Examen enviado exitosamente',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener resultado de intento
 */
export const getAttemptResult = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    console.log('=== getAttemptResult ===');
    console.log('attemptId:', attemptId);

    const result = await examAttemptService.getAttemptResult(attemptId);
    console.log('Result retrieved successfully');

    res.json(result);
  } catch (error) {
    console.error('Error in getAttemptResult:', error);
    next(error);
  }
};

/**
 * Obtener todos los intentos de un examen (admin)
 */
export const getExamAttempts = async (req, res, next) => {
  try {
    const { id } = req.params;

    const permission = await examService.checkExamPermission(id, req.user.id, req.user.role);
    if (!permission) {
      return res.status(403).json({ 
        error: 'No tienes permisos para ver los intentos de este examen' 
      });
    }

    const attempts = await examAttemptService.getExamAttempts(id);

    res.json(attempts);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener un intento específico
 * Puede ser usado públicamente (durante el examen) o por admin
 */
export const getAttemptById = async (req, res, next) => {
  try {
    const { id, attemptId } = req.params;
    const actualAttemptId = attemptId || id; // Soporta ambas rutas

    // Si hay usuario autenticado y examId, verificar permisos
    if (req.user && id && attemptId) {
      const permission = await examService.checkExamPermission(id, req.user.id, req.user.role);
      if (!permission) {
        return res.status(403).json({ 
          error: 'No tienes permisos para ver este intento' 
        });
      }
    }

    const attempt = await examAttemptService.getAttemptById(actualAttemptId);

    if (!attempt) {
      return res.status(404).json({ 
        error: 'Intento no encontrado' 
      });
    }

    // Si el intento ya está completado, no permitir acceso público
    if (!req.user && attempt.completed) {
      return res.status(403).json({
        error: 'Este intento ya ha sido completado'
      });
    }

    res.json(attempt);
  } catch (error) {
    next(error);
  }
};

/**
 * Calificar pregunta manualmente
 */
export const gradeQuestionManually = async (req, res, next) => {
  try {
    const { id, attemptId, answerId } = req.params;
    const { pointsEarned, feedback } = req.body;

    const permission = await examService.checkExamPermission(id, req.user.id, req.user.role);
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
      answerId,
      pointsEarned,
      feedback
    );

    res.json({
      message: 'Pregunta calificada exitosamente',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener estadísticas del examen
 */
export const getExamStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const permission = await examService.checkExamPermission(id, req.user.id, req.user.role);
    if (!permission) {
      return res.status(403).json({ 
        error: 'No tienes permisos para ver las estadísticas de este examen' 
      });
    }

    const stats = await examGradingService.getExamStats(id);

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

/**
 * Ajustar puntos a 100
 */
export const adjustPoints = async (req, res, next) => {
  try {
    const { sections } = req.body;

    if (!sections || sections.length === 0) {
      return res.status(400).json({ 
        error: 'Las secciones son requeridas' 
      });
    }

    const adjustedSections = examService.adjustPointsTo100(sections);

    res.json({
      message: 'Puntos ajustados exitosamente',
      sections: adjustedSections
    });
  } catch (error) {
    next(error);
  }
};
