/**
 * AI Exam Generation Types
 */

import { QuestionType, Question } from './exam.js';

/**
 * Parameters for AI question generation
 */
export interface GenerateQuestionsParams {
  text: string;
  numQuestions: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionTypes?: QuestionType[];
  language?: string;
  topic?: string;
}

/**
 * AI Generated Question from OpenAI
 */
export interface AIGeneratedQuestion {
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer?: any;
  points?: number;
  difficulty?: string;
  explanation?: string;
}

/**
 * Progress callback for AI generation
 */
export type ProgressCallback = (stage: string, progress: number, message?: string) => void;

/**
 * AI Exam Configuration
 */
export interface AIExamConfig {
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
  questionTypes: QuestionType[];
  timeLimit?: number;
  passingScore?: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
}

/**
 * PDF Processing Result
 */
export interface PDFProcessingResult {
  text: string;
  metadata: {
    numPages: number;
    title?: string;
    author?: string;
    creationDate?: Date;
  };
  extractedAt: Date;
}

/**
 * AI Service Response
 */
export interface AIServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  tokensUsed?: number;
}
