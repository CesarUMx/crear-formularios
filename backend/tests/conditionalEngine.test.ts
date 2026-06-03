import {
  evaluateRule,
  evaluateConditionalLogic,
  filterVisibleQuestions,
  validateNoAnswersForHiddenQuestions,
  isQuestionRequired,
  detectCircularDependencies,
  type ConditionalLogic,
  type CurrentAnswers,
} from '../src/utils/conditionalEngine';

describe('Conditional Engine', () => {
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
      expect(evaluateRule({ questionId: 'q2', operator: 'equals', value: 'option2' }, answers)).toBe(true);
    });

    it('should return true for equals with empty array when answer is empty', () => {
      expect(evaluateRule({ questionId: 'q4', operator: 'equals', value: '' }, answers)).toBe(true);
    });

    it('should return true for not_equals when values differ', () => {
      expect(evaluateRule({ questionId: 'q1', operator: 'not_equals', value: 'option2' }, answers)).toBe(true);
    });

    it('should return false for not_equals when value matches', () => {
      expect(evaluateRule({ questionId: 'q1', operator: 'not_equals', value: 'option1' }, answers)).toBe(false);
    });

    it('should return true for contains when answer includes value', () => {
      expect(evaluateRule({ questionId: 'q2', operator: 'contains', value: 'option1' }, answers)).toBe(true);
    });

    it('should return false for contains when answer does not include value', () => {
      expect(evaluateRule({ questionId: 'q1', operator: 'contains', value: 'option2' }, answers)).toBe(false);
    });

    it('should return true for is_empty when answer is empty', () => {
      expect(evaluateRule({ questionId: 'q3', operator: 'is_empty' }, answers)).toBe(true);
      expect(evaluateRule({ questionId: 'q4', operator: 'is_empty' }, answers)).toBe(true);
    });

    it('should return false for is_empty when answer has value', () => {
      expect(evaluateRule({ questionId: 'q1', operator: 'is_empty' }, answers)).toBe(false);
    });

    it('should return true for is_not_empty when answer has value', () => {
      expect(evaluateRule({ questionId: 'q1', operator: 'is_not_empty' }, answers)).toBe(true);
    });

    it('should return false for is_not_empty when answer is empty', () => {
      expect(evaluateRule({ questionId: 'q3', operator: 'is_not_empty' }, answers)).toBe(false);
    });

    it('should handle missing questionId gracefully', () => {
      expect(evaluateRule({ questionId: 'nonexistent', operator: 'is_empty' }, answers)).toBe(true);
      expect(evaluateRule({ questionId: 'nonexistent', operator: 'is_not_empty' }, answers)).toBe(false);
    });
  });

  describe('evaluateConditionalLogic', () => {
    it('should return visible=true when no logic provided', () => {
      expect(evaluateConditionalLogic(null as any, {})).toEqual({ visible: true, required: false });
      expect(evaluateConditionalLogic({ combinator: 'AND', rules: [], action: 'SHOW' }, {})).toEqual({ visible: true, required: false });
    });

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

    it('should use AND combinator (all rules must pass)', () => {
      const logic: ConditionalLogic = {
        combinator: 'AND',
        rules: [
          { questionId: 'q1', operator: 'equals', value: 'yes' },
          { questionId: 'q2', operator: 'equals', value: 'option1' },
        ],
        action: 'SHOW',
      };
      expect(evaluateConditionalLogic(logic, { q1: 'yes', q2: 'option1' })).toEqual({ visible: true, required: false });
      expect(evaluateConditionalLogic(logic, { q1: 'yes', q2: 'option2' })).toEqual({ visible: false, required: false });
    });

    it('should use OR combinator (any rule can pass)', () => {
      const logic: ConditionalLogic = {
        combinator: 'OR',
        rules: [
          { questionId: 'q1', operator: 'equals', value: 'yes' },
          { questionId: 'q2', operator: 'equals', value: 'option1' },
        ],
        action: 'SHOW',
      };
      expect(evaluateConditionalLogic(logic, { q1: 'yes', q2: 'option2' })).toEqual({ visible: true, required: false });
      expect(evaluateConditionalLogic(logic, { q1: 'no', q2: 'option1' })).toEqual({ visible: true, required: false });
      expect(evaluateConditionalLogic(logic, { q1: 'no', q2: 'option2' })).toEqual({ visible: false, required: false });
    });
  });

  describe('filterVisibleQuestions', () => {
    const questions = [
      { id: 'q1', conditionalLogic: null as ConditionalLogic | null },
      { id: 'q2', conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q1', operator: 'equals', value: 'show' }], action: 'SHOW' } as ConditionalLogic },
      { id: 'q3', conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q1', operator: 'equals', value: 'hide' }], action: 'HIDE' } as ConditionalLogic },
    ];

    it('should include questions without conditional logic', () => {
      const result = filterVisibleQuestions(questions, { q1: 'anything' });
      expect(result.some(q => q.id === 'q1')).toBe(true);
    });

    it('should filter based on SHOW action', () => {
      const result = filterVisibleQuestions(questions, { q1: 'show' });
      expect(result.some(q => q.id === 'q2')).toBe(true);
    });

    it('should filter based on HIDE action', () => {
      // q3 has HIDE action when q1='hide', so when q1='show' it should be visible
      const resultShow = filterVisibleQuestions(questions, { q1: 'show' });
      expect(resultShow.some(q => q.id === 'q3')).toBe(true);

      // When q1='hide', q3 should be hidden
      const resultHide = filterVisibleQuestions(questions, { q1: 'hide' });
      expect(resultHide.some(q => q.id === 'q3')).toBe(false);
    });
  });

  describe('validateNoAnswersForHiddenQuestions', () => {
    const questions = [
      { id: 'q1', conditionalLogic: null },
      { id: 'q2', conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q1', operator: 'equals', value: 'hide' }], action: 'HIDE' } as ConditionalLogic },
    ];

    it('should pass when no answers for hidden questions', () => {
      expect(validateNoAnswersForHiddenQuestions(questions, { q1: 'show' })).toEqual({ valid: true });
    });

    it('should fail when there is an answer for a hidden question', () => {
      const result = validateNoAnswersForHiddenQuestions(questions, { q1: 'hide', q2: 'some answer' });
      expect(result.valid).toBe(false);
      expect(result.hiddenQuestionWithAnswer).toBe('q2');
    });
  });

  describe('isQuestionRequired', () => {
    it('should return base required when no conditional logic', () => {
      expect(isQuestionRequired({ id: 'q1', isRequired: true }, {})).toBe(true);
      expect(isQuestionRequired({ id: 'q1', isRequired: false }, {})).toBe(false);
    });

    it('should use conditional REQUIRE action', () => {
      const question = {
        id: 'q1',
        isRequired: false,
        conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'trigger', operator: 'equals', value: 'yes' }], action: 'REQUIRE' } as ConditionalLogic,
      };
      expect(isQuestionRequired(question, { trigger: 'yes' })).toBe(true);
      expect(isQuestionRequired(question, { trigger: 'no' })).toBe(false);
    });

    it('should keep base required for SHOW/HIDE actions', () => {
      const question = {
        id: 'q1',
        isRequired: true,
        conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'trigger', operator: 'equals', value: 'yes' }], action: 'SHOW' } as ConditionalLogic,
      };
      expect(isQuestionRequired(question, { trigger: 'yes' })).toBe(true);
      expect(isQuestionRequired(question, { trigger: 'no' })).toBe(true); // still required even when hidden
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect self-reference', () => {
      const questions = [
        { id: 'q1', order: 1, conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q1', operator: 'equals', value: 'yes' }], action: 'SHOW' } as ConditionalLogic },
      ];
      const result = detectCircularDependencies(questions);
      expect(result.hasCycle).toBe(true);
      expect(result.cycles.some(c => c.includes('SELF_REFERENCE'))).toBe(true);
    });

    it('should detect future reference', () => {
      const questions = [
        { id: 'q1', order: 1, conditionalLogic: null },
        { id: 'q2', order: 2, conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q1', operator: 'equals', value: 'yes' }], action: 'SHOW' } as ConditionalLogic },
        { id: 'q3', order: 3, conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q2', operator: 'equals', value: 'yes' }], action: 'SHOW' } as ConditionalLogic },
      ];
      const result = detectCircularDependencies(questions);
      expect(result.hasCycle).toBe(false);
    });

    it('should detect when question references future question', () => {
      const questions = [
        { id: 'q1', order: 1, conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q2', operator: 'equals', value: 'yes' }], action: 'SHOW' } as ConditionalLogic },
        { id: 'q2', order: 2, conditionalLogic: null },
      ];
      const result = detectCircularDependencies(questions);
      expect(result.hasCycle).toBe(true);
      expect(result.cycles.some(c => c.includes('FUTURE_REFERENCE'))).toBe(true);
    });

    it('should pass with valid dependencies', () => {
      const questions = [
        { id: 'q1', order: 1, conditionalLogic: null },
        { id: 'q2', order: 2, conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q1', operator: 'equals', value: 'yes' }], action: 'SHOW' } as ConditionalLogic },
        { id: 'q3', order: 3, conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'q2', operator: 'equals', value: 'yes' }], action: 'SHOW' } as ConditionalLogic },
      ];
      const result = detectCircularDependencies(questions);
      expect(result.hasCycle).toBe(false);
    });

    it('should detect not found reference', () => {
      const questions = [
        { id: 'q1', order: 1, conditionalLogic: { combinator: 'AND', rules: [{ questionId: 'nonexistent', operator: 'equals', value: 'yes' }], action: 'SHOW' } as ConditionalLogic },
      ];
      const result = detectCircularDependencies(questions);
      expect(result.hasCycle).toBe(true);
      expect(result.cycles.some(c => c.includes('NOT_FOUND'))).toBe(true);
    });
  });
});
