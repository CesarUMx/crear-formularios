class ProgressTracker {
  constructor() {
    this.progresses = new Map();
  }

  create(jobId) {
    this.progresses.set(jobId, {
      percentage: 0,
      step: 'Iniciando...',
      currentQuestion: 0,
      totalQuestions: 0,
      startedAt: new Date(),
    });
  }

  update(jobId, data) {
    const current = this.progresses.get(jobId);
    if (current) {
      this.progresses.set(jobId, { ...current, ...data });
    }
  }

  get(jobId) {
    return this.progresses.get(jobId);
  }

  delete(jobId) {
    this.progresses.delete(jobId);
  }

  cleanup() {
    const now = Date.now();
    for (const [jobId, progress] of this.progresses.entries()) {
      const age = now - new Date(progress.startedAt).getTime();
      if (age > 10 * 60 * 1000) {
        this.progresses.delete(jobId);
      }
    }
  }
}

export const progressTracker = new ProgressTracker();

setInterval(() => {
  progressTracker.cleanup();
}, 60000);
