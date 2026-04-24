import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import authRoutes from './routes/authRoutes.js';
import formRoutes from './routes/formRoutes.js';
import examRoutes from './routes/examRoutes.js';
import userRoutes from './routes/userRoutes.js';
import settingsRoutes from './routes/settings.js';
import fileRoutes from './routes/fileRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import responseRoutes from './routes/responseRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import aiExamRoutes from './routes/aiExamRoutes.js';
import questionReportsRouter from './routes/questionReports.js';
import progressRoutes from './routes/progressRoutes.js';
import gradingRoutes from './routes/gradingRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import { startAbandonedAttemptsCleanup } from './utils/cronJobs.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Asegurar que existe la carpeta uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Carpeta uploads creada');
}

// Trust proxy (necesario detrás de Nginx)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4321',
  credentials: true,
  exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges']
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  return res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Evaluo API',
    version: '1.0.0'
  });
});

// API Info
app.get('/api', (_req: Request, res: Response) => {
  return res.json({ 
    message: 'API de Formularios y Exámenes',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      forms: '/api/forms',
      exams: '/api/exams',
      users: '/api/users',
      responses: '/api/responses'
    }
  });
});

// Servir archivos estáticos (uploads) con CORS
app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  // Permitir que estos recursos se embeban en iframes desde cualquier origen.
  // Se elimina cualquier CSP heredada (Helmet, Nginx, etc.) y se reemplaza por una permisiva.
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('X-Frame-Options');
  res.header('Content-Security-Policy', "frame-ancestors *;");
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  return next();
}, express.static('uploads', {
  setHeaders: (res) => {
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors *;");
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai-exams', aiExamRoutes);
app.use('/api/question-reports', questionReportsRouter);
app.use('/api/grading', gradingRoutes);
app.use('/api/security', securityRoutes);
app.use('/api', progressRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  return res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  return res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  
  // Iniciar cron jobs
  startAbandonedAttemptsCleanup();
  console.log('✅ Cron jobs iniciados');
});
