import { describe, expect, it } from 'vitest';
import { InputType, MathProblem } from '../../types';
import { validateAnswer } from '../answerValidator';
import { ENEMY_TIERS } from '../enemyData';
import {
  getActiveChoices,
  getActiveMultiSelectOptions,
  getRequireSimplified,
  inferInputType,
} from '../inputUtils';
import { ATTACK_GENERATORS, MEDITATION_GENERATOR } from '../mathGenerators';

function isAnswerEnterableByInputType(answer: string, inputType: InputType): boolean {
  switch (inputType) {
    case 'NUMPAD':
      return /^-?\d+(\.\d+)?$/.test(answer);
    case 'FRACTION':
      return /^-?\d+\/-?\d+$/.test(answer) || /^-?\d+$/.test(answer);
    case 'RATIO':
      return /^-?\d+:-?\d+$/.test(answer);
    case 'COORDINATE':
      return /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(answer);
    case 'RELATIONSHIP':
      return ['<', '>', '=', '≤', '≥'].includes(answer);
    case 'INEQUALITY':
      return /^(<=|>=|≤|≥|<|>)-?\d+(\.\d+)?$/.test(answer);
    default:
      return false;
  }
}

describe('mathGenerators structural integrity and hint solvability', () => {
  it('provides a valid, fully solvable generator (including all hint steps) for every tier and variant', () => {
    for (const [tierKey, tierData] of Object.entries(ENEMY_TIERS)) {
      const tier = Number(tierKey);
      expect(ATTACK_GENERATORS[tier], `Missing ATTACK_GENERATORS for tier ${tier}`).toBeDefined();

      for (const variantKey of Object.keys(tierData.variants)) {
        const variant = Number(variantKey);
        const generator = ATTACK_GENERATORS[tier][variant];
        expect(generator, `Missing generator for tier ${tier} variant ${variant}`).toBeTypeOf('function');

        for (let sample = 0; sample < 20; sample++) {
          const problem: MathProblem = { ...generator(), type: 'ATTACK' };
          const answerStr = problem.answer.toString().trim();
          const label = `T${tier}V${variant} (${problem.question})`;

          expect(problem.question.trim().length, label).toBeGreaterThan(0);
          expect(answerStr.length, label).toBeGreaterThan(0);

          const topChoices = getActiveChoices(problem, null);
          const topMulti = getActiveMultiSelectOptions(problem, null);
          const topInputType = inferInputType(problem, null);

          if (topChoices) {
            expect(topChoices, label).toContain(answerStr);
          } else if (topMulti) {
            for (const part of answerStr.split(',')) {
              expect(topMulti, label).toContain(part);
            }
          } else {
            expect(isAnswerEnterableByInputType(answerStr, topInputType), `Top-level answer "${answerStr}" not enterable via ${topInputType} in ${label}`).toBe(true);
          }

          expect(
            validateAnswer(answerStr, problem.answer, {
              inputType: topInputType,
              requireSimplified: getRequireSimplified(problem, null),
              isMultiSelect: Boolean(topMulti),
            }),
            `Top-level answer failed validateAnswer in ${label}`
          ).toBe(true);

          if (problem.steps) {
            expect(problem.steps.length, `Empty steps array in ${label}`).toBeGreaterThan(0);

            for (let idx = 0; idx < problem.steps.length; idx++) {
              const step = problem.steps[idx];
              const stepAns = step.answer.toString().trim();
              const stepLabel = `${label} step[${idx}] ("${step.prompt}")`;

              expect(step.prompt.trim().length, stepLabel).toBeGreaterThan(0);
              expect(stepAns.length, stepLabel).toBeGreaterThan(0);
              expect(step.prompt, `Leaked fraction prompt in ${stepLabel}`).not.toMatch(/COMPILE FRACTION:\s*\d+\/\d+/i);

              const stepChoices = getActiveChoices(problem, step);
              const stepMulti = getActiveMultiSelectOptions(problem, step);
              const stepInputType = inferInputType(problem, step);

              if (stepChoices) {
                expect(stepChoices, stepLabel).toContain(stepAns);
              } else if (stepMulti) {
                for (const part of stepAns.split(',')) {
                  expect(stepMulti, stepLabel).toContain(part);
                }
              } else {
                expect(
                  isAnswerEnterableByInputType(stepAns, stepInputType),
                  `Step answer "${stepAns}" not enterable via ${stepInputType} in ${stepLabel}`
                ).toBe(true);
              }

              expect(
                validateAnswer(stepAns, step.answer, {
                  inputType: stepInputType,
                  requireSimplified: getRequireSimplified(problem, step),
                  isMultiSelect: Boolean(stepMulti),
                }),
                `Step answer failed validateAnswer in ${stepLabel}`
              ).toBe(true);
            }
          }
        }
      }
    }
  });

  it('generates valid conceptual meditation problems', () => {
    for (let i = 0; i < 15; i++) {
      const problem = MEDITATION_GENERATOR();
      expect(problem.question).toContain('CONCEPT:');
      expect(problem.choices).toBeDefined();
      expect(problem.choices).toContain(problem.answer.toString());
      expect(validateAnswer(problem.answer.toString(), problem.answer)).toBe(true);
    }
  });
});
