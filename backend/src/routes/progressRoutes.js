import { Router } from 'express';
import { progressTracker } from '../utils/progressTracker.js';

const router = Router();

router.get('/progress/:jobId', (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const interval = setInterval(() => {
    const progress = progressTracker.get(jobId);
    
    if (!progress) {
      res.write(`data: ${JSON.stringify({ percentage: 0, step: 'Esperando...', done: false })}\n\n`);
      return;
    }

    const isDone = progress.percentage >= 100;
    
    res.write(`data: ${JSON.stringify({ ...progress, done: isDone })}\n\n`);

    if (isDone) {
      clearInterval(interval);
      res.end();
    }
  }, 500);

  req.on('close', () => {
    clearInterval(interval);
  });
});

export default router;
