/// <reference path="../types/express.d.ts" />

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import { openAIService } from '../services/openaiService.js';
import { pdfService } from '../services/pdfService.js';
import { aiExamService } from '../services/aiExamService.js';
import { progressTracker } from '../utils/progressTracker.js';
import { generateChart, validateChartConfig } from '../services/chartGenerator.js';
import '../types/express.js';

const router = Router();
const prisma = new PrismaClient();

// Configurar multer para subida de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  },
});

// Utilidades
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50) + '-' + Date.now().toString(36);
}

function selectRandomQuestions<T>(questions: T[], count: number): T[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ==================== RUTAS PARA PROFESORES ====================

/**
 * GET /api/ai-exams
 * Obtener todos los exámenes del profesor
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const exams = await aiExamService.getAIExamsByCreator(userId);
    res.json(exams);
  } catch (error: any) {
    console.error('Error al obtener exámenes:', error);
    res.status(500).json({
      error: error.message || 'Error al obtener exámenes',
    });
  }
});

/**
 * POST /api/ai-exams
 * Crear un nuevo examen
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      title,
      description,
      instructions,
      timeLimit,
      maxAttempts,
      passingScore,
      accessType,
      questionsPerAttempt,
    } = req.body;

    const aiExam = await aiExamService.createAIExam({
      title,
      description,
      instructions,
      timeLimit: timeLimit ? parseInt(timeLimit) : null,
      maxAttempts: maxAttempts ? parseInt(maxAttempts) : 1,
      passingScore: passingScore ? parseFloat(passingScore) : 60,
      accessType: accessType || 'PUBLIC',
      questionsPerAttempt: parseInt(questionsPerAttempt) || 10,
      createdById: userId,
    });

    res.status(201).json(aiExam);
  } catch (error: any) {
    console.error('Error al crear examen:', error);
    res.status(500).json({
      error: error.message || 'Error al crear examen',
    });
  }
});

/**
 * GET /api/ai-exams/:id
 * Obtener un examen específico
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const exam = await aiExamService.getAIExamById(id);

    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    res.json(exam);
  } catch (error: any) {
    console.error('Error al obtener examen:', error);
    res.status(500).json({
      error: error.message || 'Error al obtener examen',
    });
  }
});

/**
 * PUT /api/ai-exams/:id
 * Actualizar un examen
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const {
      title,
      description,
      instructions,
      timeLimit,
      maxAttempts,
      passingScore,
      questionsPerAttempt,
      accessType,
      isActive,
    } = req.body;

    const exam = await aiExamService.updateAIExam(id, {
      title,
      description,
      instructions,
      timeLimit: timeLimit ? parseInt(timeLimit) : null,
      maxAttempts: maxAttempts ? parseInt(maxAttempts) : 1,
      passingScore: passingScore ? parseFloat(passingScore) : 60,
      questionsPerAttempt: parseInt(questionsPerAttempt) || 10,
      accessType: accessType || undefined,
      isActive: isActive !== undefined ? isActive : undefined,
    });

    res.json(exam);
  } catch (error: any) {
    console.error('Error al actualizar examen:', error);
    res.status(500).json({
      error: error.message || 'Error al actualizar examen',
    });
  }
});

/**
 * DELETE /api/ai-exams/:id
 * Eliminar un examen
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    await aiExamService.deleteAIExam(id);
    res.json({ message: 'Examen eliminado correctamente' });
  } catch (error: any) {
    console.error('Error al eliminar examen:', error);
    res.status(500).json({
      error: error.message || 'Error al eliminar examen',
    });
  }
});

/**
 * POST /api/ai-exams/:id/publish
 * Publicar un examen
 */
router.post('/:id/publish', requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const updated = await aiExamService.publishAIExam(id);

    res.json(updated);
  } catch (error: any) {
    console.error('Error al publicar examen:', error);
    res.status(500).json({
      error: error.message || 'Error al publicar examen',
    });
  }
});

/**
 * POST /api/ai-exams/:id/generate
 * Generar preguntas con IA desde un PDF
 */
router.post(
  '/:id/generate',
  requireAuth,
  upload.single('pdf'),
  async (req, res) => {
    try {
      const id = String(req.params.id);
      const { numberOfQuestions, difficulty, topic, questionTypes, jobId: clientJobId } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó un archivo PDF' });
      }

      // Usar el jobId del cliente si existe, sino generar uno nuevo
      const jobId = clientJobId || `${id}-${Date.now()}`;
      progressTracker.create(jobId);

      progressTracker.update(jobId, {
        percentage: 10,
        step: 'Extrayendo texto del PDF...',
      });

      // Extraer texto del PDF
      const pdfContent = await pdfService.extractTextFromBuffer(req.file.buffer);

      if (!pdfContent || pdfContent.trim().length === 0) {
        progressTracker.delete(jobId);
        return res.status(400).json({ error: 'El PDF no contiene texto extraíble' });
      }

      progressTracker.update(jobId, {
        percentage: 20,
        step: 'Analizando contenido...',
      });

      // Delay para que se vea la etapa
      await new Promise(resolve => setTimeout(resolve, 800));

      // Generar preguntas con OpenAI
      const numQuestions = parseInt(numberOfQuestions) || 10;
      const diff = difficulty || 'medium';
      const topicText = topic || 'general';
      const types = questionTypes ? JSON.parse(questionTypes) : ['multiple_choice'];

      // Validar que el pool tenga mínimo 50% más preguntas que las requeridas por intento
      const exam = await prisma.aIExam.findUnique({
        where: { id },
        select: { questionsPerAttempt: true },
      });

      const minRequiredQuestions = Math.ceil(exam!.questionsPerAttempt * 1.5);
      if (numQuestions < minRequiredQuestions) {
        return res.status(400).json({
          error: `Debes generar al menos ${minRequiredQuestions} preguntas (50% más que las ${exam!.questionsPerAttempt} por intento)`,
        });
      }

      // Validar si se solicitan preguntas de interpretación de datos
      const hasDataInterpretation = types.includes('data_interpretation');
      const onlyDataInterpretation = types.length === 1 && hasDataInterpretation;
      
      if (hasDataInterpretation) {
        // Detectar si el PDF contiene datos numéricos (tablas, estadísticas, etc.)
        const hasNumericData = /\d+[,.]?\d*\s*(%|USD|EUR|\$|€|unidades|kg|m|km|personas|años|meses)/i.test(pdfContent) ||
                              /tabla|cuadro|gráfico|estadística|datos|resultados|medición/i.test(pdfContent);
        
        if (!hasNumericData) {
          const errorMsg = onlyDataInterpretation
            ? 'No se pueden generar preguntas de interpretación de datos porque el PDF no contiene datos numéricos, tablas o estadísticas. Por favor, sube un documento con información cuantitativa o selecciona otros tipos de preguntas.'
            : 'El PDF no contiene datos numéricos suficientes para generar preguntas de interpretación de datos. Se omitirán las preguntas de este tipo y solo se generarán los otros tipos solicitados.';
          
          if (onlyDataInterpretation) {
            progressTracker.delete(jobId);
            return res.status(400).json({ error: errorMsg });
          } else {
            console.warn(`⚠️ ${errorMsg}`);
            // Remover data_interpretation de los tipos
            const filteredTypes = types.filter((t: string) => t !== 'data_interpretation');
            types.length = 0;
            types.push(...filteredTypes);
          }
        }
      }

      const { questions } = await openAIService.generateQuestions(
        {
          content: pdfContent,
          numberOfQuestions: numQuestions,
          difficulty,
          topic: topicText,
          questionTypes: types,
        },
        (progress) => progressTracker.update(jobId, progress)
      );

      // Delay después de generar preguntas
      await new Promise(resolve => setTimeout(resolve, 500));

      progressTracker.update(jobId, {
        percentage: 75,
        step: 'Verificando dificultad...',
      });

      await new Promise(resolve => setTimeout(resolve, 600));

      progressTracker.update(jobId, {
        percentage: 80,
        step: 'Preparando presentación...',
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Crear sección por defecto si no existe
      let section = await prisma.aIExamSection.findFirst({
        where: { aiExamId: id },
      });

      if (!section) {
        section = await prisma.aIExamSection.create({
          data: {
            aiExamId: id,
            title: 'Preguntas Generadas',
            description: 'Preguntas generadas automáticamente con IA',
            order: 1,
          },
        });
      }

      progressTracker.update(jobId, {
        percentage: 85,
        step: 'Guardando preguntas en la base de datos...',
      });

      // Guardar preguntas en la base de datos
      const savedQuestions = [];
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const questionType = question.type || 'multiple_choice';

        console.log(`🔍 Pregunta ${i + 1} - Tipo: ${questionType}, Metadata:`, JSON.stringify(question.metadata, null, 2));

        // Preparar datos base
        const questionData: any = {
          sectionId: section!.id,
          text: question.text,
          feedback: question.feedback || '',
          points: 1,
          order: i + 1,
          aiGenerated: true,
          validated: false,
        };

        // Guardar tipo y datos específicos en metadata
        let metadata: any = {
          questionType: questionType,
          pairs: question.pairs,
          blanks: question.blanks,
          items: question.items,
          expectedAnswer: question.expectedAnswer,
          keywords: question.keywords,
          rubric: question.rubric,
          questions: question.questions,
          solution: question.solution,
          imageDescription: question.imageDescription,
          dataDescription: question.dataDescription,
          chartConfig: question.metadata?.chartConfig,
        };

        // Generar gráfico si es data_interpretation
        if (questionType === 'data_interpretation') {
          console.log(`📊 Detectada pregunta de interpretación de datos ${i + 1}`);
          
          let chartConfig = question.metadata?.chartConfig;

          // Solo generar gráfico si OpenAI proporcionó chartConfig
          if (!chartConfig) {
            console.warn(`⚠️ OpenAI no generó chartConfig para pregunta ${i + 1}. Saltando generación de gráfico.`);
            console.warn(`💡 Sugerencia: Asegúrate de que el contenido del PDF tenga datos numéricos para visualizar.`);
          } else {
            console.log(`✅ chartConfig encontrado en pregunta ${i + 1}:`, JSON.stringify(chartConfig, null, 2));

            // Generar el gráfico
            try {
              if (validateChartConfig(chartConfig)) {
                console.log(`✅ Configuración de gráfico validada para pregunta ${i + 1}`);
                console.log(`📊 Generando gráfico para pregunta ${i + 1}...`);

                const chartImage = await generateChart(chartConfig);
                metadata.chartImage = chartImage;

                console.log(`✅ Gráfico generado exitosamente para pregunta ${i + 1} (${chartImage.length} caracteres)`);
              } else {
                console.warn(`⚠️ Configuración de gráfico inválida para pregunta ${i + 1}:`, chartConfig);
              }
            } catch (error: any) {
              console.error(`❌ Error al generar gráfico para pregunta ${i + 1}:`, error.message);
            }
          }
        }

        // Limpiar undefined del metadata
        const cleanMetadata = Object.fromEntries(
          Object.entries(metadata).filter(([_, v]) => v !== undefined)
        );

        // Agregar metadata si tiene contenido
        if (Object.keys(cleanMetadata).length > 0) {
          questionData.metadata = cleanMetadata;
        }

        // Solo crear opciones si el tipo las requiere
        if (question.options && Array.isArray(question.options)) {
          // Filtrar opciones válidas (que tengan text definido y no vacío)
          const validOptions = question.options.filter(opt => opt && opt.text && opt.text.trim() !== '');
          
          if (validOptions.length < 2) {
            console.warn(`⚠️ Pregunta ${i + 1} tiene menos de 2 opciones válidas, saltando...`);
            continue;
          }

          questionData.options = {
            create: validOptions.map((opt, optIndex) => ({
              text: opt.text,
              isCorrect: opt.isCorrect === true,
              order: optIndex + 1,
            })),
          };
        }

        const savedQuestion = await prisma.aIExamQuestion.create({
          data: questionData,
          include: {
            options: true,
          },
        });

        savedQuestions.push(savedQuestion);
      }

      // Actualizar contador de preguntas en el examen
      await prisma.aIExam.update({
        where: { id },
        data: {
          totalQuestionsInPool: savedQuestions.length,
          aiGenerated: true,
          sourceDocument: 'PDF uploaded',
        },
      });

      // Delay antes de completar para que se vea el guardado
      await new Promise(resolve => setTimeout(resolve, 800));

      progressTracker.update(jobId, {
        percentage: 100,
        step: 'Completado',
        done: true,
      });

      setTimeout(() => progressTracker.delete(jobId), 3000);

      res.json({
        jobId,
        questions: savedQuestions,
        totalGenerated: savedQuestions.length,
      });
    } catch (error: any) {
      console.error('Error al generar preguntas:', error);
      res.status(500).json({
        error: error.message || 'Error al generar preguntas',
      });
    }
  }
);

/**
 * GET /api/ai-exams/:id/results
 * Obtener resultados de un examen
 */
router.get('/:id/results', requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const results = await aiExamService.getExamResults(id);

    res.json(results);
  } catch (error: any) {
    console.error('Error al obtener resultados:', error);
    res.status(500).json({
      error: error.message || 'Error al obtener resultados',
    });
  }
});

// ==================== RUTAS PARA ESTUDIANTES ====================

/**
 * GET /api/ai-exams/public/:slug
 * Obtener información pública de un examen
 */
router.get('/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const exam = await prisma.aIExam.findFirst({
      where: {
        slug,
        isActive: true,
      },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    // Devolver solo información básica (sin preguntas)
    res.json({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      instructions: exam.instructions,
      timeLimit: exam.timeLimit,
      maxAttempts: exam.maxAttempts,
      passingScore: exam.passingScore,
      questionsPerAttempt: exam.questionsPerAttempt,
      accessType: exam.accessType,
    });
  } catch (error: any) {
    console.error('Error al obtener examen público:', error);
    res.status(500).json({
      error: error.message || 'Error al obtener examen',
    });
  }
});

/**
 * POST /api/ai-exams/login
 * Login para estudiantes en exámenes privados
 */
router.post('/login', async (req, res) => {
  try {
    const { examId, email, password } = req.body;

    if (!examId || !email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar estudiante
    const student = await prisma.aIExamStudent.findFirst({
      where: {
        aiExamId: examId,
        email: email.toLowerCase(),
      },
    });

    if (!student) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const isValid = await bcrypt.compare(password, student.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Retornar información del estudiante
    res.json({
      studentId: student.id,
      name: student.name,
      email: student.email,
    });
  } catch (error: any) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: error.message || 'Error al iniciar sesión',
    });
  }
});

/**
 * POST /api/ai-exams/:id/attempts
 * Iniciar un intento de examen
 */
router.post('/:id/attempts', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { studentName, studentEmail, studentId, sessionToken } = req.body;

    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const aiExam = await prisma.aIExam.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!aiExam) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    if (!aiExam.isActive) {
      return res.status(400).json({ error: 'El examen no está disponible' });
    }

    // Generar o usar sessionToken para identificar al estudiante de forma única
    const studentSessionToken = sessionToken || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Verificar intentos previos usando sessionToken (más confiable que email)
    const previousAttempts = await prisma.aIExamAttempt.count({
      where: {
        aiExamId: id,
        OR: [
          { sessionToken: studentSessionToken },
          ...(studentId ? [{ studentId }] : []),
          ...(studentEmail ? [{ studentEmail }] : []),
        ],
      },
    });

    if (previousAttempts >= aiExam.maxAttempts) {
      return res.status(400).json({ 
        error: `Has alcanzado el número máximo de intentos (${aiExam.maxAttempts})`,
        attemptsUsed: previousAttempts,
        maxAttempts: aiExam.maxAttempts,
      });
    }

    // Prevenir múltiples cuentas desde la misma IP (máximo 5 intentos completados por IP)
    const MAX_ATTEMPTS_PER_IP = 5;
    const attemptsFromIP = await prisma.aIExamAttempt.count({
      where: {
        aiExamId: id,
        ipAddress: ipAddress,
        completedAt: { not: null },
      },
    });

    if (attemptsFromIP >= MAX_ATTEMPTS_PER_IP) {
      return res.status(400).json({
        error: 'Se ha alcanzado el límite de intentos desde esta ubicación. Contacta al profesor si necesitas ayuda.',
      });
    }

    // Seleccionar preguntas aleatorias del pool
    const allQuestions = aiExam.sections.flatMap((section) => section.questions);
    const selectedQuestions = selectRandomQuestions(
      allQuestions,
      aiExam.questionsPerAttempt
    );

    // Preparar preguntas con metadata de aleatorización para guardar
    const questionsWithShuffling = selectedQuestions.map((q) => {
      const questionType = (q.metadata as any)?.questionType || 'multiple_choice';
      let metadata = q.metadata;

      // Aleatorizar columna derecha en matching
      if (questionType === 'matching' && (q.metadata as any)?.pairs) {
        const pairs = [...((q.metadata as any).pairs as any[])];
        const rightColumn = pairs.map((p: any) => p.right);
        const shuffledRight = shuffleArray(rightColumn);
        
        metadata = {
          ...(q.metadata as any),
          shuffledRightColumn: shuffledRight,
        } as any;
      }

      // Aleatorizar orden inicial en ordering
      if (questionType === 'ordering' && (q.metadata as any)?.items) {
        const items = [...((q.metadata as any).items as any[])];
        const shuffledItems = shuffleArray(items);
        
        metadata = {
          ...(q.metadata as any),
          shuffledItems: shuffledItems,
        } as any;
      }

return {
        id: q.id,
        metadata: metadata,
      };
    });

    // Crear intento
    const attempt = await prisma.aIExamAttempt.create({
      data: {
        aiExamId: id,
        attemptNumber: previousAttempts + 1,
        studentName,
        studentEmail,
        studentId,
        sessionToken: studentSessionToken,
        selectedQuestions: questionsWithShuffling as any,
        ipAddress,
        userAgent,
      },
    });

    // Retornar preguntas sin mostrar las respuestas correctas
    const questionsForStudent = selectedQuestions.map((q, idx) => {
      const savedMetadata = questionsWithShuffling[idx].metadata;

      return {
        id: q.id,
        text: q.text,
        helpText: q.helpText,
        points: q.points,
        metadata: savedMetadata,
        options: q.options && q.options.length > 0
          ? (aiExam.shuffleOptions
              ? shuffleArray(
                  q.options.map((opt) => ({
                    id: opt.id,
                    text: opt.text,
                  }))
                )
              : q.options.map((opt) => ({
                  id: opt.id,
                  text: opt.text,
                })))
          : undefined,
      };
    });

    res.json({
      attempt: {
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        sessionToken: studentSessionToken,
      },
      questions: aiExam.shuffleQuestions
        ? shuffleArray(questionsForStudent)
        : questionsForStudent,
      timeLimit: aiExam.timeLimit,
    });
  } catch (error: any) {
    console.error('Error al iniciar intento:', error);
    res.status(500).json({
      error: error.message || 'Error al iniciar intento',
    });
  }
});

/**
 * POST /api/ai-exams/attempts/:attemptId/submit
 * Enviar respuestas de un intento con calificación automática y manual
 */
router.post('/attempts/:attemptId/submit', async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { responses } = req.body;

    if (!Array.isArray(responses)) {
      return res.status(400).json({ error: 'Se requiere un array de respuestas' });
    }

    const attempt = await prisma.aIExamAttempt.findUnique({
      where: { id: attemptId },
      include: {
        aiExam: {
          include: {
            sections: {
              include: {
                questions: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Intento no encontrado' });
    }

    if (attempt.completedAt) {
      return res.status(400).json({ error: 'Este intento ya fue completado' });
    }

    const { gradeAutomatically, requiresManualGrading } = await import('../utils/gradingUtils.js');

    // Calificar respuestas
    let totalCorrect = 0;
    let autoScore = 0;
    let hasManualQuestions = false;
    const savedResponses = [];

    // Verificar que no haya respuestas duplicadas
    const questionIds = responses.map((r: any) => r.questionId);
    const uniqueQuestionIds = new Set(questionIds);
    if (questionIds.length !== uniqueQuestionIds.size) {
      console.log('❌ ERROR: Respuestas duplicadas detectadas');
      return res.status(400).json({ error: 'Se detectaron respuestas duplicadas para la misma pregunta' });
    }

    console.log('\n🎯 ========== INICIANDO CALIFICACIÓN ==========');
    console.log(`Total de respuestas a calificar: ${responses.length}\n`);

    for (const response of responses) {
      const question = attempt.aiExam.sections
        .flatMap((s) => s.questions)
        .find((q) => q.id === response.questionId);

      if (!question) {
        console.log(`⚠️ Pregunta no encontrada: ${response.questionId}`);
        continue;
      }
      
      // Validar que selectedOptionId sea un ID válido si está presente
      if (response.selectedOptionId) {
        const validOption = question.options?.find((opt: any) => opt.id === response.selectedOptionId);
        if (!validOption) {
          console.log(`❌ ERROR: selectedOptionId inválido: ${response.selectedOptionId}`);
          console.log(`   Opciones válidas:`, question.options?.map((o: any) => ({ id: o.id, text: o.text })));
          return res.status(400).json({ 
            error: `Opción inválida para la pregunta "${question.text.substring(0, 50)}..."`,
            invalidOptionId: response.selectedOptionId,
            validOptions: question.options?.map((o: any) => o.id)
          });
        }
      }

      // Obtener metadata de aleatorización guardada en selectedQuestions
      const savedQuestion = (attempt.selectedQuestions as any[]).find((sq: any) => sq.id === response.questionId);
      const questionWithShuffling = {
        ...question,
        metadata: savedQuestion?.metadata || question.metadata,
      };

      const questionType = (question.metadata as any)?.questionType || 'multiple_choice';
      const needsManualGrading = requiresManualGrading(questionType);

      console.log(`\n📝 Calificando pregunta ${responses.indexOf(response) + 1}/${responses.length}`);
      console.log(`   Tipo: ${questionType}`);
      console.log(`   ID: ${question.id}`);
      console.log(`   Texto: ${question.text.substring(0, 80)}...`);
      console.log(`   Respuesta del alumno:`, response);
      console.log(`   Metadata original:`, question.metadata);
      console.log(`   Metadata guardada:`, savedQuestion?.metadata);
      console.log(`   Metadata final:`, questionWithShuffling.metadata);

      if (needsManualGrading) {
        hasManualQuestions = true;
        console.log(`   ⏸️ Requiere calificación manual`);
      }

      // Calificar automáticamente si es posible
      const gradeResult = gradeAutomatically(questionWithShuffling as any, response);
      
      console.log(`   Resultado: ${gradeResult.isCorrect ? '✅ CORRECTA' : '❌ INCORRECTA'}`);
      console.log(`   Puntos: ${gradeResult.pointsEarned}/${question.points}`);

      const responseData: any = {
        attemptId,
        questionId: response.questionId,
        ...(response.selectedOptionId && response.selectedOptionId !== '' ? { selectedOptionId: response.selectedOptionId } : {}),
        textAnswer: response.userAnswer || response.textAnswer,
        isCorrect: gradeResult.isCorrect,
        pointsEarned: gradeResult.pointsEarned,
        requiresManualGrading: needsManualGrading,
        isGraded: !needsManualGrading,
      };

      const savedResponse = await prisma.aIExamResponse.create({
        data: responseData,
      });

      savedResponses.push(savedResponse);

      if (gradeResult.isCorrect === true) totalCorrect++;
      if (gradeResult.pointsEarned !== null) autoScore += gradeResult.pointsEarned;
    }

    // Calcular calificación
    const totalQuestions = responses.length;
    const completedAt = new Date();
    const startedAt = new Date(attempt.startedAt);
    const timeSpent = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);

    // Calcular score solo de preguntas automáticas si hay preguntas manuales
    const score = hasManualQuestions ? null : (totalCorrect / totalQuestions) * 100;
    const passed = hasManualQuestions ? null : (score! >= attempt.aiExam.passingScore);

    console.log(`\n📊 ========== RESUMEN DE CALIFICACIÓN ==========`);
    console.log(`   Total preguntas: ${totalQuestions}`);
    console.log(`   Respuestas correctas: ${totalCorrect}`);
    console.log(`   Puntos automáticos: ${autoScore}`);
    console.log(`   Requiere calificación manual: ${hasManualQuestions ? 'Sí' : 'No'}`);
    console.log(`   Calificación: ${score !== null ? score.toFixed(2) + '%' : 'Pendiente'}`);
    console.log(`   Aprobado: ${passed !== null ? (passed ? 'Sí' : 'No') : 'Pendiente'}`);
    console.log(`===============================================\n`);

    // Actualizar intento con sistema de calificación manual
    const completedAttempt = await prisma.aIExamAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt,
        timeSpent,
        score,
        maxScore: 100,
        passed,
        totalCorrect,
        totalQuestions,
        requiresManualGrading: hasManualQuestions,
        isGraded: !hasManualQuestions,
        autoScore,
        manualScore: 0,
      },
      include: {
        responses: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
            selectedOption: true,
          },
        },
      },
    });

    res.json({
      ...completedAttempt,
      requiresManualGrading: hasManualQuestions,
      message: hasManualQuestions 
        ? 'Examen enviado. Algunas preguntas requieren calificación manual por el docente.'
        : 'Examen calificado automáticamente.',
    });
  } catch (error: any) {
    console.error('Error al enviar respuestas:', error);
    res.status(500).json({
      error: error.message || 'Error al enviar respuestas',
    });
  }
});

/**
 * POST /api/ai-exams/questions/:questionId/regenerate
 * Regenerar una pregunta específica
 */
router.post('/questions/:questionId/regenerate', async (req, res) => {
  try {
    const { questionId } = req.params;

    // Obtener la pregunta actual y el examen
    const question = await prisma.aIExamQuestion.findUnique({
      where: { id: questionId },
      include: {
        section: {
          include: {
            aiExam: true,
          },
        },
        options: true,
      },
    });

    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    // Obtener el contenido del PDF del examen (si está disponible)
    const aiExam = question.section.aiExam;
    const pdfContent = aiExam.sourceDocument || '';

    // Obtener todas las preguntas existentes del examen para evitar repeticiones
    const allQuestions = await prisma.aIExamQuestion.findMany({
      where: {
        section: {
          aiExamId: aiExam.id,
        },
        id: { not: questionId },
      },
      select: {
        text: true,
      },
    });

    // Obtener el tipo de pregunta desde metadata o asumir multiple_choice
    const questionType = (question.metadata as any)?.questionType || 'multiple_choice';

    // Regenerar la pregunta usando OpenAI manteniendo el tipo
    const newQuestion = await openAIService.regenerateQuestion(
      question.text,
      pdfContent,
      (aiExam as any).difficulty || 'medium',
      questionType,
      allQuestions.map(q => q.text)
    ) as any;

    if (!newQuestion || !newQuestion.text) {
      throw new Error('La IA no generó una pregunta válida');
    }

    // Preparar datos de actualización
    const updateData: any = {
      text: newQuestion.text,
      feedback: newQuestion.feedback,
    };

    // Actualizar metadata si existe
    if (newQuestion.type) {
      const metadata: any = {
        questionType: newQuestion.type,
        pairs: newQuestion.pairs,
        blanks: newQuestion.blanks,
        items: newQuestion.items,
        expectedAnswer: newQuestion.expectedAnswer,
        keywords: newQuestion.keywords,
        rubric: newQuestion.rubric,
        questions: newQuestion.questions,
        solution: newQuestion.solution,
        imageDescription: newQuestion.imageDescription,
        dataDescription: newQuestion.dataDescription,
      };

      const cleanMetadata = Object.fromEntries(
        Object.entries(metadata).filter(([_, v]) => v !== undefined)
      );

      if (Object.keys(cleanMetadata).length > 0) {
        updateData.metadata = cleanMetadata;
      }
    }

    // Solo actualizar opciones si el tipo las requiere
    if (newQuestion.options && Array.isArray(newQuestion.options)) {
      updateData.options = {
        deleteMany: {},
        create: newQuestion.options.map((opt: any, index: number) => ({
          text: opt.text,
          isCorrect: opt.isCorrect,
          order: index + 1,
        })),
      };
    }

    // Actualizar la pregunta en la base de datos
    const updatedQuestion = await prisma.aIExamQuestion.update({
      where: { id: questionId },
      data: updateData,
      include: {
        options: true,
      },
    });

    res.json(updatedQuestion);
  } catch (error: any) {
    console.error('❌ Error al regenerar pregunta:', error);
    console.error('Stack trace:', error.stack);
    
    // Proporcionar mensaje de error más específico
    let errorMessage = 'Error al regenerar pregunta';
    if (error.message.includes('API key')) {
      errorMessage = 'Error de configuración de OpenAI. Verifica la API key.';
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'Límite de solicitudes de OpenAI alcanzado. Intenta más tarde.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/ai-exams/attempts/:attemptId/result
 * Obtener el resultado completo de un intento con todas las respuestas
 */
router.get('/attempts/:attemptId/result', async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await prisma.aIExamAttempt.findUnique({
      where: { id: attemptId },
      include: {
        aiExam: {
          select: {
            title: true,
            passingScore: true,
          },
        },
        responses: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
            selectedOption: true,
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Intento no encontrado' });
    }

    // Agregar metadata de aleatorización a cada respuesta
    const responsesWithShuffling = attempt.responses.map(response => {
      const savedQuestion = (attempt.selectedQuestions as any[]).find((sq: any) => sq.id === response.questionId);
      
      return {
        ...response,
        question: {
          ...response.question,
          metadata: savedQuestion?.metadata || response.question.metadata,
        },
      };
    });

    res.json({
      ...attempt,
      responses: responsesWithShuffling,
    });
  } catch (error: any) {
    console.error('Error al obtener resultado:', error);
    res.status(500).json({
      error: error.message || 'Error al obtener resultado',
    });
  }
});

/**
 * POST /api/ai-exams/:id/students
 * Agregar estudiantes a un examen privado
 */
router.post('/:id/students', requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de estudiantes' });
    }

    const createdStudents = await aiExamService.addStudentsToPrivateExam(id, students);
    res.json({ students: createdStudents, count: createdStudents.length });
  } catch (error: any) {
    console.error('Error al agregar estudiantes:', error);
    res.status(500).json({
      error: error.message || 'Error al agregar estudiantes',
    });
  }
});

/**
 * POST /api/ai-exams/:id/send-invitation
 * Enviar invitación por email a un estudiante
 */
router.post('/:id/send-invitation', requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'Se requiere studentId' });
    }

    // Obtener información del examen
    const exam = await prisma.aIExam.findUnique({
      where: { id: String(id) },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    // Obtener información del estudiante
    const student = await prisma.aIExamStudent.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    // Construir URL del examen
    const examUrl = `${process.env.FRONTEND_URL || 'http://localhost:4321'}/ai-exam/${exam.slug}`;

    // Importar función de email
    const { sendExamInvitation } = await import('../utils/email-invitation.js');

    await sendExamInvitation(
      student.email,
      student.name,
      exam.title,
      examUrl,
      '[La contraseña que se te proporcionó al registrarte]'
    );

    res.json({ 
      message: 'Invitación enviada exitosamente',
      sentTo: student.email 
    });
  } catch (error: any) {
    console.error('Error al enviar invitación:', error);
    res.status(500).json({
      error: error.message || 'Error al enviar invitación',
    });
  }
});

/**
 * GET /api/ai-exams/:id/students
 * Obtener lista de estudiantes autorizados
 */
router.get('/:id/students', requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);

    const students = await prisma.aIExamStudent.findMany({
      where: { aiExamId: id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            attempts: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(students);
  } catch (error: any) {
    console.error('Error al obtener estudiantes:', error);
    res.status(500).json({
      error: error.message || 'Error al obtener estudiantes',
    });
  }
});

/**
 * DELETE /api/ai-exams/:id/students/:studentId
 * Eliminar un estudiante autorizado
 */
router.delete('/:id/students/:studentId', requireAuth, async (req, res) => {
  try {
    const studentId = String(req.params.studentId);

    // Verificar si tiene intentos
    const student = await prisma.aIExamStudent.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    if ((student._count as any).attempts > 0) {
      return res.status(400).json({
        error: `No se puede eliminar porque ya tiene ${(student._count as any).attempts} intento(s) realizado(s)`,
      });
    }

    await prisma.aIExamStudent.delete({
      where: { id: studentId },
    });

    res.json({ message: 'Estudiante eliminado correctamente' });
  } catch (error: any) {
    console.error('Error al eliminar estudiante:', error);
    res.status(500).json({
      error: error.message || 'Error al eliminar estudiante',
    });
  }
});

export default router;
