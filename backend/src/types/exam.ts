/**
 * Question Types for Exams
 */
export type QuestionType = 
  | 'multiple-choice'
  | 'true-false'
  | 'fill-in-blank'
  | 'matching'
  | 'ordering';

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
