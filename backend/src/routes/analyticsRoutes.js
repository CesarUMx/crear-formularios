import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/analytics/forms/:formId/responses
 * Obtener todas las respuestas de un formulario
 */
/**
 * GET /api/analytics/forms/:formId/responses/:responseId
 * Obtener una respuesta específica por su ID
 */
router.get('/forms/:formId/responses/:responseId', requireAuth, async (req, res) => {
  try {
    const { formId, responseId } = req.params;
    
    // Verificar si el usuario tiene acceso al formulario
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { createdById: true }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }
    
    // Solo el propietario o un super admin puede ver las respuestas
    if (form.createdById !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
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
    
    res.json(response);
    
  } catch (error) {
    console.error('Error al obtener respuesta:', error);
    res.status(500).json({ error: 'Error al obtener respuesta' });
  }
});

router.get('/forms/:formId/responses', requireAuth, async (req, res) => {
  try {
    const { formId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Verificar si el usuario tiene acceso al formulario
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { createdById: true }
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }
    
    // Solo el propietario o un super admin puede ver las respuestas
    if (form.createdById !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
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
            question: true,
            selectedOptions: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' },
      skip,
      take: limitNum
    });
    
    res.json({
      data: responses,
      pagination: {
        total: totalResponses,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalResponses / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Error al obtener respuestas:', error);
    res.status(500).json({ error: 'Error al obtener respuestas' });
  }
});

/**
 * GET /api/analytics/forms/:formId/statistics
 * Obtener estadísticas por pregunta de un formulario
 */
router.get('/forms/:formId/statistics', requireAuth, async (req, res) => {
  try {
    const { formId } = req.params;
    
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
                questions: {
                  include: {
                    options: true
                  }
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
    
    // Solo el propietario o un super admin puede ver las estadísticas
    if (form.createdById !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'No tienes permiso para ver las estadísticas de este formulario' });
    }
    
    // Obtener la versión más reciente
    const latestVersion = form.versions[0];
    
    if (!latestVersion) {
      return res.status(404).json({ error: 'No se encontró ninguna versión del formulario' });
    }
    
    // Obtener todas las preguntas
    const questions = latestVersion.sections.flatMap(section => section.questions);
    
    // Obtener estadísticas para cada pregunta
    const statistics = [];
    
    for (const question of questions) {
      // Obtener respuestas para esta pregunta
      const answers = await prisma.answer.findMany({
        where: {
          questionId: question.id,
          response: {
            formId
          }
        },
        include: {
          selectedOptions: true
        }
      });
      
      let questionStats = {
        questionId: question.id,
        questionText: question.text,
        questionType: question.type,
        totalAnswers: answers.length,
        data: {}
      };
      
      // Procesar estadísticas según el tipo de pregunta
      switch (question.type) {
        case 'TEXT':
        case 'TEXTAREA':
          // Para preguntas de texto, solo contamos el número de respuestas
          questionStats.data = {
            responseCount: answers.length
          };
          break;
          
        case 'RADIO':
        case 'SELECT':
        case 'CHECKBOX':
          // Para preguntas de selección, contamos las opciones seleccionadas
          const optionCounts = {};
          
          // Inicializar contadores para todas las opciones
          question.options.forEach(option => {
            optionCounts[option.id] = {
              optionId: option.id,
              optionText: option.text,
              count: 0
            };
          });
          
          // Contar selecciones por selectedOptions (para CHECKBOX y algunos RADIO)
          answers.forEach(answer => {
            if (answer.selectedOptions && answer.selectedOptions.length > 0) {
              answer.selectedOptions.forEach(option => {
                if (optionCounts[option.id]) {
                  optionCounts[option.id].count++;
                }
              });
            } 
            // Contar selecciones por textAnswer (para RADIO y SELECT)
            else if (answer.textValue) {
              // Buscar la opción que coincide con el texto
              const matchingOption = question.options.find(opt => opt.text === answer.textValue);
              if (matchingOption && optionCounts[matchingOption.id]) {
                optionCounts[matchingOption.id].count++;
              }
            }
          });
          
          questionStats.data = {
            options: Object.values(optionCounts)
          };
          break;
          
        case 'FILE':
          // Para preguntas de archivo, contamos cuántos archivos se subieron
          questionStats.data = {
            fileCount: answers.filter(a => a.fileUrl).length
          };
          break;
          
        default:
          questionStats.data = {};
      }
      
      statistics.push(questionStats);
    }
    
    res.json({
      formId,
      formTitle: form.title,
      statistics
    });
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

/**
 * GET /api/analytics/forms/:formId/export
 * Exportar respuestas a formato CSV
 */
router.get('/forms/:formId/export', requireAuth, async (req, res) => {
  try {
    const { formId } = req.params;
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
    
    // Solo el propietario o un super admin puede exportar las respuestas
    if (form.createdById !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
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
      const row = {
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
      res.send(csv);
    } else {
      // Si no es CSV, enviar como JSON
      res.json({
        formTitle: form.title,
        data: exportData
      });
    }
    
  } catch (error) {
    console.error('Error al exportar respuestas:', error);
    res.status(500).json({ error: 'Error al exportar respuestas' });
  }
});

export default router;
