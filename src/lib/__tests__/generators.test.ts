import { describe, expect, it } from 'vitest';
import { ConceptualArchetype, InputType, MathProblem } from '../../types';
import { gcd, validateAnswer } from '../answerValidator';
import { ENEMY_TIERS } from '../enemyData';
import { CONCEPTUAL_GENERATORS, generateConceptualProblem } from '../generators/conceptual';
import {
  getActiveChoices,
  getActiveMultiSelectOptions,
  getRequireSimplified,
  inferInputType,
} from '../inputUtils';
import { generateProblem } from '../mathEngine';
import { ATTACK_GENERATORS, MEDITATION_GENERATOR } from '../mathGenerators';

const FUZZ_SAMPLES = 100;
const FRIENDLY_DENOMS = new Set([2, 3, 4, 5, 6, 8, 10, 12]);
const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

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

        for (let sample = 0; sample < FUZZ_SAMPLES; sample++) {
          const problem: MathProblem = { ...generator(), type: 'ATTACK' };
          const answerStr = problem.answer.toString().trim();
          const label = `T${tier}V${variant} (${problem.question})`;

          expect(problem.question.trim().length, label).toBeGreaterThan(0);
          expect(answerStr.length, label).toBeGreaterThan(0);
          expect(['QUICK', 'COMBO'], `Invalid complexity in ${label}`).toContain(problem.complexity);
          if (problem.complexity === 'COMBO') {
            expect(problem.steps?.length ?? 0, `COMBO problem must have >= 2 steps in ${label}`).toBeGreaterThanOrEqual(2);
          }

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

  it('generates valid conceptual meditation problems via MEDITATION_GENERATOR', () => {
    for (let i = 0; i < 30; i++) {
      const problem = MEDITATION_GENERATOR();
      expect(problem.question.trim().length).toBeGreaterThan(0);
      expect(problem.complexity).toBe('QUICK');
      expect(problem.category).toBe('CONCEPTUAL');
      expect(problem.archetype).toBeDefined();
      expect(
        validateAnswer(problem.answer.toString(), problem.answer, {
          inputType: problem.inputType,
          isChoice: Boolean(problem.choices),
        })
      ).toBe(true);
    }
  });
});

describe('Phase 1 mental-math bounds & complexity contracts', () => {
  it('enforces roadmap QUICK variants and T12 V2 COMBO step counts', () => {
    const roadmapQuickVariants: ReadonlyArray<readonly [number, number]> = [
      [2, 2],
      [2, 3],
      [6, 1],
      [6, 2],
      [6, 3],
      [7, 2],
      [8, 3],
      [9, 4],
      [11, 4],
      [12, 1],
      [12, 4],
    ];

    for (const [tier, variant] of roadmapQuickVariants) {
      for (let i = 0; i < FUZZ_SAMPLES; i++) {
        const problem = ATTACK_GENERATORS[tier][variant]();
        expect(problem.complexity, `T${tier}V${variant} (${problem.question})`).toBe('QUICK');
      }
    }

    for (let i = 0; i < FUZZ_SAMPLES; i++) {
      const problem = ATTACK_GENERATORS[12][2]();
      expect(problem.complexity, `T12V2 (${problem.question})`).toBe('COMBO');
      expect(problem.steps?.length ?? 0, `T12V2 (${problem.question})`).toBeGreaterThanOrEqual(2);
      expect(problem.steps?.length ?? 0, `T12V2 (${problem.question})`).toBeLessThanOrEqual(3);
    }
  });

  it('guarantees non-negative Grade 4 intermediates on Tier 1 V3 and V4', () => {
    for (const variant of [3, 4]) {
      for (let i = 0; i < FUZZ_SAMPLES; i++) {
        const problem = ATTACK_GENERATORS[1][variant]();
        const label = `T1V${variant} (${problem.question})`;
        expect(problem.complexity, label).toBe('COMBO');
        expect(Number(problem.answer), label).toBeGreaterThanOrEqual(0);
        expect(problem.steps!.length, label).toBeLessThanOrEqual(3);

        for (const step of problem.steps!) {
          expect(Number(step.answer), `${label} step "${step.prompt}"`).toBeGreaterThanOrEqual(0);
        }

        if (variant === 4) {
          expect(Number(problem.steps![1].answer), `${label} partialDiff`).toBeGreaterThan(0);
          const overshootMatch = problem.steps![2].prompt.match(/\+\s*(\d+)$/);
          expect(overshootMatch, `${label} overshoot prompt`).not.toBeNull();
          expect(Number(overshootMatch![1]), `${label} overshoot`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('enforces friendly fraction denominators and LCM <= 24 across Tiers 4-5, plus positive T5 V2 difference', () => {
    const fractionVariants: ReadonlyArray<readonly [number, number]> = [
      [4, 2],
      [4, 3],
      [4, 4],
      [5, 1],
      [5, 2],
      [5, 3],
    ];

    for (const [tier, variant] of fractionVariants) {
      for (let i = 0; i < FUZZ_SAMPLES; i++) {
        const problem = ATTACK_GENERATORS[tier][variant]();
        const label = `T${tier}V${variant} (${problem.question})`;
        const matches = [...problem.question.matchAll(/(\d+)\/(\d+)/g)];
        expect(matches.length, label).toBeGreaterThanOrEqual(1);

        const denoms = matches.map((m) => Number(m[2]));
        for (const d of denoms) {
          expect(FRIENDLY_DENOMS.has(d), `Unfriendly denominator ${d} in ${label}`).toBe(true);
        }

        if (tier === 4 && variant === 2 || tier === 5 && (variant === 1 || variant === 2)) {
          expect(denoms.length, label).toBe(2);
          expect(denoms[0], label).not.toBe(denoms[1]);
          expect(lcm(denoms[0], denoms[1]), `LCM > 24 in ${label}`).toBeLessThanOrEqual(24);
        }

        if (tier === 5 && variant === 2) {
          const [ansNum] = problem.answer.toString().split('/').map(Number);
          expect(ansNum, `Non-positive T5 V2 numerator in ${label} -> ${problem.answer}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('enforces mental-friendly arithmetic bounds on T3 V1, T3 V2, and T5 V5', () => {
    for (let i = 0; i < FUZZ_SAMPLES; i++) {
      // T3 V1: 2-digit x 2-digit mental-friendly products, no * 0 step
      const p31 = ATTACK_GENERATORS[3][1]();
      const label31 = `T3V1 (${p31.question})`;
      const match31 = p31.question.match(/COMPILE:\s*(\d+)\s*\*\s*(\d+)/);
      expect(match31, label31).not.toBeNull();
      const a3 = Number(match31![1]);
      const b3 = Number(match31![2]);
      if (b3 % 10 === 0) {
        expect(a3, label31).toBeLessThanOrEqual(35);
        expect([20, 30, 40, 50], label31).toContain(b3);
        expect(p31.steps!.length, label31).toBe(2);
      } else {
        expect(a3, label31).toBeLessThanOrEqual(25);
        expect(b3, label31).toBeGreaterThanOrEqual(11);
        expect(b3, label31).toBeLessThanOrEqual(15);
        expect(p31.steps!.length, label31).toBe(3);
      }
      for (const step of p31.steps!) {
        expect(step.prompt, `${label31} has * 0 step`).not.toMatch(/\*\s*0\b/);
      }

      // T3 V2: 2-digit mental quotient (< 100) and <= 3 steps
      const p32 = ATTACK_GENERATORS[3][2]();
      const label32 = `T3V2 (${p32.question})`;
      expect(Number(p32.answer), label32).toBeGreaterThanOrEqual(11);
      expect(Number(p32.answer), label32).toBeLessThan(100);
      expect(p32.steps!.length, label32).toBeLessThanOrEqual(3);

      // T5 V5: lb -> oz quantity in {2, 3, 4, 5, 10}
      const p55 = ATTACK_GENERATORS[5][5]();
      const lbMatch = p55.question.match(/CONVERT:\s*(\d+)\s*lb to oz/);
      if (lbMatch) {
        expect([2, 3, 4, 5, 10], `T5V5 (${p55.question})`).toContain(Number(lbMatch[1]));
      }
    }
  });

  it('enforces clean decimal bounds on T6 V1 and T6 V2', () => {
    for (const variant of [1, 2]) {
      for (let i = 0; i < FUZZ_SAMPLES; i++) {
        const problem = ATTACK_GENERATORS[6][variant]();
        const label = `T6V${variant} (${problem.question})`;
        expect(problem.steps!.length, label).toBe(1);

        const numberTokens = [
          ...problem.question.matchAll(/-?\d+(?:\.\d+)?/g),
          ...problem.answer.toString().matchAll(/-?\d+(?:\.\d+)?/g),
        ].map((m) => Number(m[0]));

        expect(numberTokens.length, label).toBeGreaterThan(0);
        for (const val of numberTokens) {
          expect(Math.round(val * 100) % 5, `Unclean decimal ${val} in ${label}`).toBe(0);
        }
      }
    }
  });

  it('enforces equation coefficient bounds (T9 V3, T9 V4, T10 V1) and statistics bounds (T10 V4)', () => {
    for (const [tier, variant] of [
      [9, 3],
      [9, 4],
      [10, 1],
    ] as const) {
      for (let i = 0; i < FUZZ_SAMPLES; i++) {
        const problem = ATTACK_GENERATORS[tier][variant]();
        const label = `T${tier}V${variant} (${problem.question})`;
        expect(Number.isInteger(Number(problem.answer)), label).toBe(true);

        const coeffMatch = problem.question.match(/(\d+)x|x\s*\/\s*(\d+)/);
        if (coeffMatch) {
          const coeff = Number(coeffMatch[1] ?? coeffMatch[2]);
          expect(coeff, label).toBeGreaterThanOrEqual(2);
          expect(coeff, label).toBeLessThanOrEqual(9);
        }
      }
    }

    for (let i = 0; i < FUZZ_SAMPLES; i++) {
      const problem = ATTACK_GENERATORS[10][4]();
      const label = `T10V4 (${problem.question})`;
      const listMatch = problem.question.match(/\[([^\]]+)\]/);
      expect(listMatch, label).not.toBeNull();
      const nums = listMatch![1].split(',').map((s) => Number(s.trim()));
      expect(nums.length, label).toBeGreaterThanOrEqual(3);
      expect(nums.length, label).toBeLessThanOrEqual(5);
      for (const n of nums) {
        expect(Number.isInteger(n), label).toBe(true);
        expect(n, label).toBeGreaterThanOrEqual(1);
        expect(n, label).toBeLessThanOrEqual(40);
      }

      if (problem.question.startsWith('FIND MEAN:')) {
        const ans = Number(problem.answer);
        expect(Number.isInteger(ans), label).toBe(true);
        const sum = nums.reduce((acc, v) => acc + v, 0);
        expect(sum / nums.length, label).toBe(ans);
      }
    }
  });

  it('guarantees integer triangle area and dynamic complexity on T10 V3', () => {
    for (let i = 0; i < FUZZ_SAMPLES; i++) {
      const problem = ATTACK_GENERATORS[10][3]();
      const label = `T10V3 (${problem.question})`;
      const match = problem.question.match(/b=(\d+),\s*h=(\d+)/);
      expect(match, label).not.toBeNull();
      const b = Number(match![1]);
      const h = Number(match![2]);

      if (problem.question.includes('TRIANGLE')) {
        expect(b % 2 === 0 || h % 2 === 0, `Odd b=${b}, h=${h} in ${label}`).toBe(true);
        expect(Number.isInteger(Number(problem.answer)), label).toBe(true);
        expect(problem.complexity, label).toBe('COMBO');
      } else {
        expect(problem.complexity, label).toBe('QUICK');
      }
    }
  });

  it('enforces mental-friendly Simple Interest bounds on T11 V3', () => {
    for (let i = 0; i < FUZZ_SAMPLES; i++) {
      const problem = ATTACK_GENERATORS[11][3]();
      const label = `T11V3 (${problem.question})`;
      const match = problem.question.match(/P=\$(\d+),\s*r=(\d+)%,\s*t=(\d+)yrs/);
      expect(match, label).not.toBeNull();
      const p = Number(match![1]);
      const r = Number(match![2]);
      const t = Number(match![3]);

      expect(p, label).toBeLessThanOrEqual(500);
      expect(p % 100, label).toBe(0);
      expect([2, 4, 5, 10], label).toContain(r);
      expect(t, label).toBeLessThanOrEqual(4);
      expect(Number.isInteger((p * r) / 100), label).toBe(true);
      expect(problem.complexity, label).toBe('COMBO');
      expect(problem.steps!.length, label).toBe(2);
    }
  });
});

describe('Phase 2 self-contained prompts, clues, and breadcrumbs', () => {
  const CONTEXT_FREE_PROMPT_DENYLIST =
    /^(IDENTIFY SHARED DENOMINATOR|IDENTIFY CONVERSION FACTOR|IDENTIFY FIRST QUANTITY|IDENTIFY SECOND QUANTITY|FORMAT AS RATIO \(A:B\)|SIGN OF RESULT\?|CALCULATE SUM|DISTANCE FROM ZERO|IDENTIFY X-COORDINATE|IDENTIFY Y-COORDINATE|PLOT POINT ON GRID|MULTIPLY BASE AND HEIGHT|DIVIDE BY 2|SUM ALL 5 VALUES|DIVIDE SUM BY 5|FIND SMALLEST VALUE|FIND MIDDLE VALUE AFTER SORTING|FIND MAXIMUM VALUE|FIND MINIMUM VALUE|SUBTRACT: MAX - MIN|ALIGN DECIMALS AND ADD|WRITE (SUM|DIFFERENCE|PRODUCT|RESULT|SIMPLIFIED FRACTION|INEQUALITY)|KEEP DENOMINATOR|DO SIGNS MATCH\?|RESULTING SIGN\?|DOES IT PASS THROUGH \(0,0\)\?)$/i;

  const CONTEXT_TOKEN_REGEX = /\d|\b(NEG|POS|x|ft|in|yd|lb|oz|kg|g)\b/;

  it('enforces self-contained step prompts, clues, and resultLabels across all 47 attack variants', () => {
    let variantCount = 0;

    for (const [tierKey, tierData] of Object.entries(ENEMY_TIERS)) {
      const tier = Number(tierKey);

      for (const variantKey of Object.keys(tierData.variants)) {
        const variant = Number(variantKey);
        const generator = ATTACK_GENERATORS[tier][variant];
        variantCount += 1;

        for (let sample = 0; sample < FUZZ_SAMPLES; sample++) {
          const problem: MathProblem = { ...generator(), type: 'ATTACK' };
          const label = `T${tier}V${variant} (${problem.question})`;

          if (!problem.steps) continue;

          for (let idx = 0; idx < problem.steps.length; idx++) {
            const step = problem.steps[idx];
            const stepLabel = `${label} step[${idx}] ("${step.prompt}")`;

            // Anti-regression denylist against context-free boilerplate prompts
            expect(
              step.prompt.trim(),
              `Context-free boilerplate prompt in ${stepLabel}`
            ).not.toMatch(CONTEXT_FREE_PROMPT_DENYLIST);

            // No programmer modulo jargon in Tier 3
            if (tier === 3) {
              expect(step.prompt, `Programmer modulo '%' in ${stepLabel}`).not.toMatch(/\s%\s/);
            }

            // Every step prompt carries concrete numeric or math context
            expect(
              step.prompt,
              `Missing numeric/math context token in ${stepLabel}`
            ).toMatch(CONTEXT_TOKEN_REGEX);

            // Clue and resultLabel contracts
            if (problem.complexity === 'COMBO') {
              expect(
                step.clue?.trim().length ?? 0,
                `Missing clue on COMBO step in ${stepLabel}`
              ).toBeGreaterThan(0);
              expect(
                step.clue!.trim().length,
                `Clue exceeds 120 chars in ${stepLabel}`
              ).toBeLessThanOrEqual(120);

              expect(
                step.resultLabel?.trim().length ?? 0,
                `Missing resultLabel on COMBO step in ${stepLabel}`
              ).toBeGreaterThan(0);
              expect(
                step.resultLabel!.trim().length,
                `resultLabel exceeds 28 chars ("${step.resultLabel}") in ${stepLabel}`
              ).toBeLessThanOrEqual(28);
            } else {
              if (step.clue !== undefined) {
                expect(step.clue.trim().length, `Empty clue in ${stepLabel}`).toBeGreaterThan(0);
                expect(
                  step.clue.trim().length,
                  `Clue exceeds 120 chars in ${stepLabel}`
                ).toBeLessThanOrEqual(120);
              }
              if (step.resultLabel !== undefined) {
                expect(
                  step.resultLabel.trim().length,
                  `Empty resultLabel in ${stepLabel}`
                ).toBeGreaterThan(0);
                expect(
                  step.resultLabel.trim().length,
                  `resultLabel exceeds 28 chars ("${step.resultLabel}") in ${stepLabel}`
                ).toBeLessThanOrEqual(28);
              }
            }
          }
        }
      }
    }

    expect(variantCount).toBe(47);
  });
});

describe('Phase 3 conceptual generators (Tiers 1-12, 36 generators across 7 archetypes)', () => {
  const ARCHETYPE_KEY_REGEX = /^[A-Z0-9_-]{1,32}$/;
  const ALL_ARCHETYPES: ReadonlySet<ConceptualArchetype> = new Set([
    'MAGNITUDE_ESTIMATION',
    'BENCHMARK_COMPARE',
    'SPOT_THE_GLITCH',
    'FIRST_STEP_STRATEGY',
    'SIGN_PREDICTION',
    'EQUIVALENCE_STRUCTURE',
    'VISUAL_QUADRANT',
  ]);

  it('fuzz-tests all 36 conceptual generators across Tiers 1-12 for invariants, unique choices, promptLines, and validator accuracy', () => {
    const seenArchetypes = new Set<ConceptualArchetype>();
    let totalGenerators = 0;

    for (let tier = 1; tier <= 12; tier++) {
      const tierGens = CONCEPTUAL_GENERATORS[tier];
      expect(tierGens, `Missing CONCEPTUAL_GENERATORS for tier ${tier}`).toBeDefined();
      expect(tierGens.length, `Tier ${tier} must have exactly 3 conceptual generators`).toBe(3);

      for (let genIdx = 0; genIdx < tierGens.length; genIdx++) {
        totalGenerators += 1;
        const generator = tierGens[genIdx];

        for (let sample = 0; sample < FUZZ_SAMPLES; sample++) {
          const problem = generator();
          const answerStr = problem.answer.toString().trim();
          const label = `Conceptual T${tier}#${genIdx + 1} (${problem.question})`;

          expect(problem.question.trim().length, label).toBeGreaterThan(0);
          expect(answerStr.length, label).toBeGreaterThan(0);
          expect(problem.complexity, label).toBe('QUICK');
          expect(problem.category, label).toBe('CONCEPTUAL');
          expect(problem.steps, label).toEqual([]);
          expect(problem.archetype, label).toBeDefined();
          expect(ALL_ARCHETYPES.has(problem.archetype!), `Unknown archetype ${problem.archetype} in ${label}`).toBe(true);
          expect(problem.archetype!, `Archetype fails storage regex in ${label}`).toMatch(ARCHETYPE_KEY_REGEX);
          seenArchetypes.add(problem.archetype!);

          if (problem.archetype === 'SPOT_THE_GLITCH') {
            expect(problem.promptLines, `SPOT_THE_GLITCH missing promptLines in ${label}`).toBeDefined();
            expect(problem.promptLines!.length, `SPOT_THE_GLITCH needs >= 2 promptLines in ${label}`).toBeGreaterThanOrEqual(2);
            for (const line of problem.promptLines!) {
              expect(line.trim().length, `Empty promptLine in ${label}`).toBeGreaterThan(0);
            }
          }

          const isChoice = Boolean(problem.choices);
          if (problem.archetype === 'BENCHMARK_COMPARE') {
            expect(problem.inputType, label).toBe('RELATIONSHIP');
            expect(problem.choices, label).toBeUndefined();
            expect(['<', '=', '>'], label).toContain(answerStr);

            expect(
              validateAnswer(answerStr, problem.answer, {
                inputType: problem.inputType,
                isChoice: false,
              }),
              `Benchmark answer failed validateAnswer in ${label}`
            ).toBe(true);

            for (const wrongOp of ['<', '=', '>'].filter((op) => op !== answerStr)) {
              expect(
                validateAnswer(wrongOp, problem.answer, {
                  inputType: problem.inputType,
                  isChoice: false,
                }),
                `Benchmark distractor "${wrongOp}" unexpectedly accepted in ${label}`
              ).toBe(false);
            }
          } else {
            expect(problem.choices, `Missing choices in ${label}`).toBeDefined();
            expect(problem.choices!.length, `Need 3-4 choices in ${label}`).toBeGreaterThanOrEqual(3);
            expect(problem.choices!.length, `Need 3-4 choices in ${label}`).toBeLessThanOrEqual(4);
            expect(new Set(problem.choices!).size, `Duplicate choices in ${label}`).toBe(problem.choices!.length);
            expect(problem.choices, `Answer "${answerStr}" missing from choices in ${label}`).toContain(answerStr);

            expect(
              validateAnswer(answerStr, problem.answer, {
                inputType: problem.inputType,
                isChoice,
              }),
              `Answer "${answerStr}" failed validateAnswer in ${label}`
            ).toBe(true);

            for (const distractor of problem.choices!.filter((c) => c !== answerStr)) {
              expect(
                validateAnswer(distractor, problem.answer, {
                  inputType: problem.inputType,
                  isChoice,
                }),
                `Distractor "${distractor}" unexpectedly accepted for answer "${answerStr}" in ${label}`
              ).toBe(false);
            }
          }
        }
      }
    }

    expect(totalGenerators).toBe(36);
    expect(seenArchetypes.size).toBe(7);
  });

  it('routes generateProblem across ATTACK, MEDITATION, LOCK, and SHIELD_BREAK and honors archetype/rng options', () => {
    for (let tier = 1; tier <= 12; tier++) {
      const attack = generateProblem(tier, 'ATTACK', 1);
      expect(attack.type).toBe('ATTACK');
      expect(attack.category).toBe('PROCEDURAL');

      for (const conceptualType of ['MEDITATION', 'LOCK', 'SHIELD_BREAK'] as const) {
        const problem = generateProblem(tier, conceptualType);
        expect(problem.type).toBe(conceptualType);
        expect(problem.category).toBe('CONCEPTUAL');
        expect(problem.complexity).toBe('QUICK');
        expect(problem.archetype).toMatch(ARCHETYPE_KEY_REGEX);
        expect(
          validateAnswer(problem.answer.toString(), problem.answer, {
            inputType: problem.inputType,
            isChoice: Boolean(problem.choices),
          })
        ).toBe(true);
      }
    }

    // Deterministic rng & archetype filtering
    const makeDetRng = () => {
      let state = 42;
      return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
      };
    };

    const glitchA = generateConceptualProblem(1, 'LOCK', {
      archetype: 'SPOT_THE_GLITCH',
      rng: makeDetRng(),
    });
    const glitchB = generateConceptualProblem(1, 'LOCK', {
      archetype: 'SPOT_THE_GLITCH',
      rng: makeDetRng(),
    });
    expect(glitchA).toEqual(glitchB);
    expect(glitchA.archetype).toBe('SPOT_THE_GLITCH');
    expect(glitchA.promptLines?.length).toBeGreaterThanOrEqual(2);
  });

  it('guarantees Tier 6 SPOT_THE_GLITCH decimal parts never carry into the ones digit across 250 samples', () => {
    const t6GlitchGen = CONCEPTUAL_GENERATORS[6][2];
    let state = 1337;
    const rng = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };

    const seenAnswers = new Set<string>();
    for (let i = 0; i < 250; i++) {
      const problem = t6GlitchGen(rng);
      expect(problem.archetype).toBe('SPOT_THE_GLITCH');

      const match = problem.question.match(/^SPOT THE GLITCH IN (\d+)\.(\d) \+ 0\.(\d{2}):$/);
      expect(match, `Unexpected T6 SPOT_THE_GLITCH question format: ${problem.question}`).not.toBeNull();

      const tenths = Number(match![2]);
      const hundredths = Number(match![3]);
      expect(
        tenths * 10 + hundredths,
        `Decimal carry into ones digit in "${problem.question}" (${tenths * 10} + ${hundredths} >= 100)`
      ).toBeLessThan(100);

      seenAnswers.add(problem.answer.toString());
    }

    expect(seenAnswers.has('Step 1')).toBe(true);
    expect(seenAnswers.has('Step 2')).toBe(true);
  });
});


