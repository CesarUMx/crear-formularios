import { Router, type IRouter } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listLogs,
  testTemplate,
} from '../controllers/emailTemplateController.js';

const router: IRouter = Router();

// Templates por formulario
router.get('/forms/:formId/email-templates', requireAuth, listTemplates);
router.post('/forms/:formId/email-templates', requireAuth, createTemplate);
router.get('/forms/:formId/email-templates/logs', requireAuth, listLogs);

// Operaciones sobre un template individual
router.put('/email-templates/:id', requireAuth, updateTemplate);
router.delete('/email-templates/:id', requireAuth, deleteTemplate);
router.post('/email-templates/:id/test', requireAuth, testTemplate);

export default router;
