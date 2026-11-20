import { describe, expect, it } from 'vitest';
import { MathProblem } from '../../types';
import {
  getActiveChoices,
  getActiveMultiSelectOptions,
  getCurrentStep,
  getExpectedAnswer,
  getRequireSimplified,
  hasProblemSteps,
  inferInputType,
} from '../inputUtils';

describe('inputUtils', () => {
  it('treats empty steps array as having no steps', () => {
    const problem: MathProblem = {
      question: 'CONCEPT: Test?',
      answer: 'A',
      type: 'MEDITATION',
      complexity: 'QUICK',
      choices: ['A', 'B'],
      steps: [],
    };

    expect(hasProblemSteps(problem)).toBe(false);
    expect(getCurrentStep(problem, 0)).toBeNull();
    expect(getExpectedAnswer(problem, 0)).toBe('A');
  });

  it('infers input types accurately for guided steps and honors explicit step inputType', () => {
    const baseProblem: MathProblem = {
      question: 'Test',
      answer: '1',
      type: 'ATTACK',
      complexity: 'QUICK',
    };

    expect(inferInputType(baseProblem, { prompt: 'p', answer: '3/4' })).toBe('FRACTION');
    expect(inferInputType(baseProblem, { prompt: 'p', answer: '2:5' })).toBe('RATIO');
    expect(inferInputType(baseProblem, { prompt: 'p', answer: '-2,4' })).toBe('COORDINATE');
    expect(inferInputType(baseProblem, { prompt: 'p', answer: '<' })).toBe('RELATIONSHIP');
    expect(inferInputType(baseProblem, { prompt: 'p', answer: '>5' })).toBe('INEQUALITY');
    expect(inferInputType(baseProblem, { prompt: 'p', answer: 42 })).toBe('NUMPAD');
    expect(inferInputType(baseProblem, { prompt: 'p', answer: 42, inputType: 'FRACTION' })).toBe('FRACTION');
  });

  it('resolves per-step choices without leaking top-level choices into numeric hint steps', () => {
    const problem: MathProblem = {
      question: 'CLASSIFY 15',
      answer: 'COMPOSITE',
      type: 'ATTACK',
      complexity: 'QUICK',
      choices: ['PRIME', 'COMPOSITE'],
      steps: [
        { prompt: 'HOW MANY FACTORS?', answer: 4 },
        { prompt: 'PRIME OR COMPOSITE?', answer: 'COMPOSITE', choices: ['PRIME', 'COMPOSITE'] },
      ],
    };

    expect(getActiveChoices(problem, null)).toEqual(['PRIME', 'COMPOSITE']);
    expect(getActiveChoices(problem, problem.steps![0])).toBeUndefined();
    expect(getActiveChoices(problem, problem.steps![1])).toEqual(['PRIME', 'COMPOSITE']);
  });

  it('resolves active multi-select options only when appropriate', () => {
    const problem: MathProblem = {
      question: 'FIND FACTORS OF 6',
      answer: '1,2,3,6',
      type: 'ATTACK',
      complexity: 'QUICK',
      multiSelectOptions: ['1', '2', '3', '4', '6'],
      steps: [
        { prompt: 'SMALLEST FACTOR?', answer: 1 },
        { prompt: 'SELECT ALL FACTORS', answer: '1,2,3,6' },
      ],
    };

    expect(getActiveMultiSelectOptions(problem, null)).toEqual(['1', '2', '3', '4', '6']);
    expect(getActiveMultiSelectOptions(problem, problem.steps![0])).toBeUndefined();
    expect(getActiveMultiSelectOptions(problem, problem.steps![1])).toEqual(['1', '2', '3', '4', '6']);
  });

  it('resolves requireSimplified per step or problem', () => {
    const problem: MathProblem = {
      question: 'SIMPLIFY: 4/8',
      answer: '1/2',
      type: 'ATTACK',
      complexity: 'COMBO',
      inputType: 'FRACTION',
      requireSimplified: true,
      steps: [
        { prompt: 'GCF OF 4 AND 8?', answer: 4 },
        { prompt: 'ENTER SIMPLIFIED FRACTION', answer: '1/2', requireSimplified: true },
      ],
    };

    expect(getRequireSimplified(problem, null)).toBe(true);
    expect(getRequireSimplified(problem, problem.steps![0])).toBe(false);
    expect(getRequireSimplified(problem, problem.steps![1])).toBe(true);
  });

  it('falls back to problem.inputType or NUMPAD when not in hint mode', () => {
    expect(inferInputType({ question: 'q', answer: '1/2', type: 'ATTACK', complexity: 'QUICK', inputType: 'FRACTION' }, null)).toBe('FRACTION');
    expect(inferInputType({ question: 'q', answer: 5, type: 'ATTACK', complexity: 'QUICK' }, null)).toBe('NUMPAD');
  });
});
