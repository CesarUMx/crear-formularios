interface Progress {
  percentage: number;
  step: string;
  currentQuestion: number;
  totalQuestions: number;
  startedAt: Date;
}

interface ProgressUpdate {
  percentage?: number;
  step?: string;
  currentQuestion?: number;
  totalQuestions?: number;
  done?: boolean;
}

class ProgressTracker {
  private progresses: Map<string, Progress>;

  constructor() {
    this.progresses = new Map();
  }

  create(jobId: string): void {
    this.progresses.set(jobId, {
      percentage: 0,
      step: 'Iniciando...',
      currentQuestion: 0,
      totalQuestions: 0,
      startedAt: new Date(),
    });
  }

  update(jobId: string, data: ProgressUpdate): void {
    const current = this.progresses.get(jobId);
    if (current) {
      this.progresses.set(jobId, { ...current, ...data });
    }
  }

  get(jobId: string): Progress | undefined {
    return this.progresses.get(jobId);
  }

  delete(jobId: string): void {
    this.progresses.delete(jobId);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [jobId, progress] of this.progresses.entries()) {
      const age = now - new Date(progress.startedAt).getTime();
      // Delete progress older than 10 minutes
      if (age > 10 * 60 * 1000) {
        this.progresses.delete(jobId);
      }
    }
  }
}

export const progressTracker = new ProgressTracker();

// Cleanup every minute
setInterval(() => {
  progressTracker.cleanup();
}, 60000);

// Export types for external use
export type { Progress, ProgressUpdate };
