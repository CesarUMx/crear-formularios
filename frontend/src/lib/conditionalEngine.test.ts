import { describe, it, expect } from 'vitest';
import {
  evaluateRule,
  evaluateConditionalLogic,
  filterVisibleQuestions,
  validateNoAnswersForHiddenQuestions,
  isQuestionRequired,
  detectCircularDependencies,
  type ConditionalLogic,
  type CurrentAnswers,
} from './conditionalEngine';

describe('Conditional Engine (Frontend)', () => {
  describe('evaluateRule', () => {
    const answers: CurrentAnswers = {
      q1: 'option1',
      q2: ['option1', 'option2'],
      q3: '',
      q4: [],
    };

    it('should return true for equals with matching single value', () => {
      expect(evaluateRule({ questionId: 'q1', operator: 'equals', value: 'option1' }, answers)).toBe(true);
    });

    it('should return false for equals with non-matching single value', () => {
      expect(evaluateRule({ questionId: 'q1', operator: 'equals', value: 'option2' }, answers)).toBe(false);
    });

    it('should return true for equals when any value matches in array', () => {
      expect(evaluateRule({ questionId: 'q2', operator: 'equals', value: 'option1' }, answers)).toBe(true);
    });

    it('should return true for not_equals when values differ', () => {
      expect(evaluateRule({ questionId: 'q1', operator: 'not_equals', value: 'option2' }, answers)).toBe(true);
    });

    it('should return true for contains when answer includes value', () => {
      expect(evaluateRule({ questionId: 'q2', operator: 'contains', value: 'option1' }, answers)).toBe(true);
    });

    it('should return true for is_empty when answer is empty', () => {
      expect(evaluateRule({ questionId: 'q3', operator: 'is_empty' }, answers)).toBe(true);
    });

    it('should return true for is_not_empty when answer has value', () => {
      expect(evaluateRule({ questionId: 'q1', operator: 'is_not_empty' }, answers)).toBe(true);
    });
  });

  describe('evaluateConditionalLogic', () => {
    it('should apply SHOW action correctly', () => {
      const logic: ConditionalLogic = {
        combinator: 'AND',
        rules: [{ questionId: 'q1', operator: 'equals', value: 'yes' }],
        action: 'SHOW',
      };
      expect(evaluateConditionalLogic(logic, { q1: 'yes' })).toEqual({ visible: true, required: false });
      expect(evaluateConditionalLogic(logic, { q1: 'no' })).toEqual({ visible: false, required: false });
    });

    it('should apply HIDE action correctly', () => {
      const logic: ConditionalLogic = {
        combinator: 'AND',
        rules: [{ questionId: 'q1', operator: 'equals', value: 'yes' }],
        action: 'HIDE',
      };
      expect(evaluateConditionalLogic(logic, { q1: 'yes' })).toEqual({ visible: false, required: false });
      expect(evaluateConditionalLogic(logic, { q1: 'no' })).toEqual({ visible: true, required: false });
    });

    it('should apply REQUIRE action correctly', () => {
      const logic: ConditionalLogic = {
        combinator: 'AND',
        rules: [{ questionId: 'q1', operator: 'equals', value: 'yes' }],
        action: 'REQUIRE',
      };
      expect(evaluateConditionalLogic(logic, { q1: 'yes' })).toEqual({ visible: true, required: true });
      expect(evaluateConditionalLogic(logic, { q1: 'no' })).toEqual({ visible: true, required: false });
    });

    it('should use AND combinator', () => {
      const logic: ConditionalLogic = {
        combinator: 'AND',
        rules: [
          { questionId: 'q1', operator: 'equals', value: 'yes' },
          { questionId: 'q2', operator: 'equals', value: 'option1' },
        ],
        action: 'SHOW',
      };
      expect(evaluateConditionalLogic(logic, { q1: 'yes', q2: 'option1' }).visible).toBe(true);
      expect(evaluateConditionalLogic(logic, { q1: 'yes', q2: 'option2' }).visible).toBe(false);
    });

    it('should use OR combinator', () => {
      const logic: ConditionalLogic = {
        combinator: 'OR',
        rules: [
          { questionId: 'q1', operator: 'equals', value: 'yes' },
          { questionId: 'q2', operator: 'equals', value: 'option1' },
        ],
        action: 'SHOW',
      };
      expect(evaluateConditionalLogic(logic, { q1: 'yes', q2: 'option2' }).visible).toBe(true);
      expect(evaluateConditionalLogic(logic, { q1: 'no', q2: 'option1' }).visible).toBe(true);
      expect(evaluateConditionalLogic(logic, { q1: 'no', q2: 'option2' }).visible).toBe(false);
    });
  });

  describe('filterVisibleQuestions', () => {
    const questions = [
      { id: 'q1', conditionalLogic: null as ConditionalLogic | null },
      { id: 'q2', conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q1', operator: 'equals', value: 'show' }], action: 'SHOW' } as ConditionalLogic },
      { id: 'q3', conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q1', operator: 'equals', value: 'hide' }], action: 'HIDE' } as ConditionalLogic },
    ];

    it('should filter based on SHOW action', () => {
      const result = filterVisibleQuestions(questions, { q1: 'show' });
      expect(result.some(q => q.id === 'q2')).toBe(true);
    });

    it('should filter based on HIDE action', () => {
      const resultShow = filterVisibleQuestions(questions, { q1: 'show' });
      expect(resultShow.some(q => q.id === 'q3')).toBe(true);

      const resultHide = filterVisibleQuestions(questions, { q1: 'hide' });
      expect(resultHide.some(q => q.id === 'q3')).toBe(false);
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect self-reference', () => {
      const questions = [
        { id: 'q1', order: 1, conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q1', operator: 'equals', value: 'yes' }], action: 'SHOW' } as ConditionalLogic },
      ];
      const result = detectCircularDependencies(questions);
      expect(result.hasCycle).toBe(true);
    });

    it('should detect future reference', () => {
      const questions = [
        { id: 'q1', order: 1, conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q2', operator: 'equals', value: 'yes' }], action: 'SHOW' } as ConditionalLogic },
        { id: 'q2', order: 2, conditionalLogic: null },
      ];
      const result = detectCircularDependencies(questions);
      expect(result.hasCycle).toBe(true);
    });

    it('should pass with valid dependencies', () => {
      const questions = [
        { id: 'q1', order: 1, conditionalLogic: null },
        { id: 'q2', order: 2, conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q1', operator: 'equals', value: 'yes' }], action: 'SHOW' } as ConditionalLogic },
      ];
      const result = detectCircularDependencies(questions);
      expect(result.hasCycle).toBe(false);
    });
  });
});
