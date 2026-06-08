/// <reference path="../types/express.d.ts" />

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router: import("express").Router = express.Router();
const prisma = new PrismaClient();

/**
 * Verificar si el usuario puede acceder a las respuestas/estadísticas del formulario:
 * - Es el propietario
 * - Tiene rol SUPER_ADMIN
 * - Tiene permiso FULL o EDIT en FormShare
 */
async function canAccessFormData(formId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === 'SUPER_ADMIN') return true;

  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: {
      createdById: true,
      sharedWith: {
        where: { userId, permission: { in: ['FULL', 'EDIT'] } },
        select: { id: true }
      }
    }
  });

  if (!form) return false;
  if (form.createdById === userId) return true;
  if (form.sharedWith.length > 0) return true;
  return false;
}

/**
 * GET /api/analytics/forms/:formId/responses/:responseId
 * Obtener una respuesta específica por su ID
 */
router.get('/forms/:formId/responses/:responseId', requireAuth, async (req, res) => {
  try {
    const formId = String(req.params.formId);
    const responseId = String(req.params.responseId);
    
    // Verificar si el usuario tiene acceso al formulario
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { createdById: true }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }
    
    // Propietario, SUPER_ADMIN o usuario con permiso FULL/EDIT pueden ver las respuestas
    if (!await canAccessFormData(formId, req.user!.id, req.user!.role)) {
      return res.status(403).json({ error: 'No tienes permiso para ver las respuestas de este formulario' });
    }
    
    // Obtener la respuesta específica con sus respuestas y preguntas
    const response = await prisma.response.findUnique({
      where: { 
        id: responseId,
        formId: formId
      },
      include: {
        answers: {
          include: {
            question: {
              include: {
                section: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            },
            selectedOptions: true
          }
        }
      }
    });
    
    if (!response) {
      return res.status(404).json({ error: 'Respuesta no encontrada' });
    }
    
    return res.json(response);
    
  } catch (error) {
    console.error('Error al obtener respuesta:', error);
    return res.status(500).json({ error: 'Error al obtener respuesta' });
  }
});

router.get('/forms/:formId/responses', requireAuth, async (req, res) => {
  try {
    const formId = String(req.params.formId);
    const { page = '1', limit = '10' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Verificar si el usuario tiene acceso al formulario
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { createdById: true, emailQuestionId: true, nameQuestionId: true, formType: true }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }
    
    // Propietario, SUPER_ADMIN o usuario con permiso FULL/EDIT pueden ver las respuestas
    if (!await canAccessFormData(formId, req.user!.id, req.user!.role)) {
      return res.status(403).json({ error: 'No tienes permiso para ver las respuestas de este formulario' });
    }
    
    // Obtener el total de respuestas
    const totalResponses = await prisma.response.count({
      where: { formId }
    });
    
    // Obtener las respuestas paginadas
    const responses = await prisma.response.findMany({
      where: { formId },
      include: {
        answers: {
          include: {
            question: { select: { id: true, text: true, type: true, order: true } },
            selectedOptions: { select: { id: true, text: true } }
          },
          orderBy: { question: { order: 'asc' } }
        },
        examRegistration: {
          select: {
            id: true,
            studentName: true,
            studentEmail: true,
            schedule: { select: { title: true, startTime: true } }
          }
        }
      },
      orderBy: { submittedAt: 'desc' },
      skip,
      take: limitNum
    });
    
    return res.json({
      data: responses,
      formMeta: {
        formType: form.formType,
        emailQuestionId: form.emailQuestionId,
        nameQuestionId: form.nameQuestionId,
      },
      pagination: {
        total: totalResponses,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalResponses / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Error al obtener respuestas:', error);
    return res.status(500).json({ error: 'Error al obtener respuestas' });
  }
});

/**
 * GET /api/analytics/forms/:formId/statistics
 * Obtener estadísticas por pregunta de un formulario
 */
router.get('/forms/:formId/statistics', requireAuth, async (req, res) => {
  try {
    const formId = String(req.params.formId);

    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        createdById: true,
        title: true,
        versions: {
          orderBy: { version: 'desc' },
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                  include: { options: { orderBy: { order: 'asc' } } }
                }
              }
            }
          }
        }
      }
    });

    if (!form) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }

    if (!await canAccessFormData(formId, req.user!.id, req.user!.role)) {
      return res.status(403).json({ error: 'No tienes permiso para ver las estadísticas de este formulario' });
    }

    // Obtener la versión más reciente para definir el "esquema" de preguntas visibles
    const latestVersion = form.versions[0];
    if (!latestVersion) {
      return res.status(404).json({ error: 'No se encontró ninguna versión del formulario' });
    }

    const latestQuestions = latestVersion.sections.flatMap(s => s.questions);

    // Construir un mapa: questionText → todos los questionId en todas las versiones
    // Esto permite agregar respuestas de versiones antiguas con las nuevas
    const textToIds = new Map<string, { type: string; ids: string[]; options: { id: string; text: string }[] }>();

    for (const version of form.versions) {
      for (const section of version.sections) {
        for (const question of section.questions) {
          const key = question.text.trim();
          if (!textToIds.has(key)) {
            textToIds.set(key, { type: question.type, ids: [], options: [] });
          }
          const entry = textToIds.get(key)!;
          entry.ids.push(question.id);
          // Tomar las opciones de la versión más reciente que tenga esta pregunta
          if (question.options.length > entry.options.length) {
            entry.options = question.options.map(o => ({ id: o.id, text: o.text }));
          }
        }
      }
    }

    const statistics: any[] = [];

    for (const latestQ of latestQuestions) {
      const key = latestQ.text.trim();
      const entry = textToIds.get(key);
      if (!entry) continue;

      // Obtener TODAS las respuestas de todos los IDs de esta pregunta a través de versiones
      const answers = await prisma.answer.findMany({
        where: {
          questionId: { in: entry.ids },
          response: { formId }
        },
        include: { selectedOptions: { select: { id: true, text: true } } }
      });

      let questionStats: any = {
        questionId: latestQ.id,
        questionText: latestQ.text,
        questionType: latestQ.type,
        totalAnswers: answers.length,
        data: {}
      };

      switch (latestQ.type) {
        case 'TEXT':
        case 'TEXTAREA':
          questionStats.data = { responseCount: answers.length };
          break;

        case 'RADIO':
        case 'SELECT':
        case 'CHECKBOX': {
          // Inicializar contadores por texto de opción (no por ID, ya que los IDs cambian entre versiones)
          const optionCountsByText: Map<string, number> = new Map();
          for (const opt of entry.options) {
            if (!optionCountsByText.has(opt.text)) optionCountsByText.set(opt.text, 0);
          }

          for (const answer of answers) {
            if (answer.selectedOptions && answer.selectedOptions.length > 0) {
              for (const sel of answer.selectedOptions) {
                // sel.text is the option text from whatever version it was submitted with
                optionCountsByText.set(sel.text, (optionCountsByText.get(sel.text) ?? 0) + 1);
              }
            } else if (answer.textValue) {
              optionCountsByText.set(answer.textValue, (optionCountsByText.get(answer.textValue) ?? 0) + 1);
            }
          }

          // Convertir a array con IDs de las opciones actuales
          const optionsResult = entry.options.map(opt => ({
            optionId: opt.id,
            optionText: opt.text,
            count: optionCountsByText.get(opt.text) ?? 0
          }));
          // Incluir textos que no corresponden a opciones actuales (respuestas de opciones renombradas/eliminadas)
          for (const [text, count] of optionCountsByText.entries()) {
            if (!entry.options.some(o => o.text === text) && count > 0) {
              optionsResult.push({ optionId: `legacy-${text}`, optionText: `${text} (eliminada)`, count });
            }
          }

          questionStats.data = { options: optionsResult };
          break;
        }

        case 'FILE':
          questionStats.data = { fileCount: answers.filter(a => a.fileUrl).length };
          break;

        case 'BOOLEAN':
          questionStats.data = { accepted: answers.filter(a => a.textValue === 'true').length };
          break;

        default:
          questionStats.data = {};
      }

      statistics.push(questionStats);
    }

    return res.json({ formId, formTitle: form.title, statistics });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

/**
 * GET /api/analytics/forms/:formId/export
 * Exportar respuestas a formato CSV
 */
router.get('/forms/:formId/export', requireAuth, async (req, res) => {
  try {
    const formId = String(req.params.formId);
    const { format = 'csv' } = req.query;
    
    // Verificar si el usuario tiene acceso al formulario
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { 
        createdById: true,
        title: true,
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sections: {
              include: {
                questions: true
              }
            }
          }
        }
      }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }
    
    // Propietario, SUPER_ADMIN o usuario con permiso FULL/EDIT pueden exportar las respuestas
    if (!await canAccessFormData(formId, req.user!.id, req.user!.role)) {
      return res.status(403).json({ error: 'No tienes permiso para exportar las respuestas de este formulario' });
    }
    
    // Obtener la versión más reciente
    const latestVersion = form.versions[0];
    
    if (!latestVersion) {
      return res.status(404).json({ error: 'No se encontró ninguna versión del formulario' });
    }
    
    // Obtener todas las preguntas
    const questions = latestVersion.sections.flatMap(section => section.questions);
    
    // Obtener todas las respuestas
    const responses = await prisma.response.findMany({
      where: { formId },
      include: {
        answers: {
          include: {
            question: true,
            selectedOptions: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });
    
    // Preparar los datos para exportación
    const exportData = responses.map(response => {
      const row: any = {
        folio: response.folio,
        submittedAt: response.submittedAt,
        ipAddress: response.ipAddress || '',
        userAgent: response.userAgent || ''
      };
      
      // Añadir respuestas a cada pregunta
      questions.forEach(question => {
        const answer = response.answers.find(a => a.questionId === question.id);
        
        if (!answer) {
          row[`question_${question.id}`] = '';
          return;
        }
        
        switch (question.type) {
          case 'TEXT':
          case 'TEXTAREA':
            row[`question_${question.id}`] = answer.textValue || '';
            break;
            
          case 'RADIO':
          case 'CHECKBOX':
            row[`question_${question.id}`] = answer.selectedOptions
              .map(option => option.text)
              .join(', ');
            break;
            
          case 'FILE':
            row[`question_${question.id}`] = answer.fileUrl || '';
            break;
            
          default:
            row[`question_${question.id}`] = '';
        }
      });
      
      return row;
    });
    
    // Generar CSV
    if (format === 'csv') {
      // Crear encabezados
      const headers = [
        'folio',
        'submittedAt',
        'ipAddress',
        'userAgent',
        ...questions.map(q => `question_${q.id}`)
      ];
      
      // Crear contenido CSV
      let csv = headers.join(',') + '\n';
      
      exportData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || '';
          // Escapar comas y comillas
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csv += values.join(',') + '\n';
      });
      
      // Enviar como archivo CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_responses.csv`);
      return res.send(csv);
    } else {
      // Si no es CSV, enviar como JSON
      return res.json({
        formTitle: form.title,
        data: exportData
      });
    }
    
  } catch (error) {
    console.error('Error al exportar respuestas:', error);
    return res.status(500).json({ error: 'Error al exportar respuestas' });
  }
});

export default router;
