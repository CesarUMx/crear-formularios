/**
 * Question Types for Exams
 */
export type QuestionType = 
  | 'multiple-choice'
  | 'true-false'
  | 'short-answer'
  | 'essay'
  | 'fill-in-blank'
  | 'matching'
  | 'ordering'
  | 'rating-scale'
  | 'matrix'
  | 'file-upload'
  | 'date'
  | 'time';

/**
 * Base Question Structure
 */
export interface BaseQuestion {
  id?: number;
  type: QuestionType;
  text: string;
  points: number;
  required?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Multiple Choice Question
 */
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
  correctAnswer?: number | number[]; // index or indices
  allowMultiple?: boolean;
}

/**
 * True/False Question
 */
export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false';
  correctAnswer?: boolean;
}

/**
 * Short Answer Question
 */
export interface ShortAnswerQuestion extends BaseQuestion {
  type: 'short-answer';
  correctAnswer?: string;
  caseSensitive?: boolean;
  maxLength?: number;
}

/**
 * Essay Question
 */
export interface EssayQuestion extends BaseQuestion {
  type: 'essay';
  minWords?: number;
  maxWords?: number;
}

/**
 * Fill in the Blank Question
 */
export interface FillInBlankQuestion extends BaseQuestion {
  type: 'fill-in-blank';
  blanks: string[];
  correctAnswers?: string[];
}

/**
 * Union type for all question types
 */
export type Question = 
  | MultipleChoiceQuestion 
  | TrueFalseQuestion 
  | ShortAnswerQuestion
  | EssayQuestion
  | FillInBlankQuestion
  | BaseQuestion;

/**
 * Answer structure
 */
export interface Answer {
  questionId: number;
  value: any;
  files?: string[];
}

/**
 * Grading result for a single question
 */
export interface QuestionGradingResult {
  questionId: number;
  points: number;
  maxPoints: number;
  isCorrect: boolean;
  feedback?: string;
  partialCredit?: boolean;
}

/**
 * Complete exam grading result
 */
export interface ExamGradingResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  questions: QuestionGradingResult[];
  gradedAt: Date;
}
