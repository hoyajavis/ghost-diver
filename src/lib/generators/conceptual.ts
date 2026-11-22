import {
  ConceptScheduleMap,
  ConceptualArchetype,
  MathProblem,
  ProblemType,
} from '../../types';
import { ConceptSlot, selectWeightedConceptSlot } from '../conceptSpacedRep';
import { clampTier } from '../dungeonLogic';

export type ConceptualGenerator = (rng?: () => number) => Omit<MathProblem, 'type'>;

export interface TaggedConceptualGenerator {
  id: string;
  archetype: ConceptualArchetype;
  generate: ConceptualGenerator;
}

function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[], rng: () => number): T {
  const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[index];
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function buildChoiceProblem(params: {
  question: string;
  answer: string;
  distractors: string[];
  archetype: ConceptualArchetype;
  promptLines?: string[];
  rng: () => number;
}): Omit<MathProblem, 'type'> {
  const { question, answer, distractors, archetype, promptLines, rng } = params;
  const unique = Array.from(new Set([answer, ...distractors]));
  const choices = shuffle(unique, rng);
  return {
    question,
    answer,
    complexity: 'QUICK',
    category: 'CONCEPTUAL',
    archetype,
    ...(promptLines ? { promptLines } : {}),
    choices,
    steps: [],
  };
}

function buildBenchmarkProblem(params: {
  question: string;
  answer: '<' | '=' | '>';
}): Omit<MathProblem, 'type'> {
  return {
    question: params.question,
    answer: params.answer,
    complexity: 'QUICK',
    category: 'CONCEPTUAL',
    archetype: 'BENCHMARK_COMPARE',
    inputType: 'RELATIONSHIP',
    steps: [],
  };
}

function compareNumbers(left: number, right: number): '<' | '=' | '>' {
  if (left < right) return '<';
  if (left > right) return '>';
  return '=';
}

// ============================================================================
// TIER 1: Place Value, Rounding, 3-Digit Mental Add/Sub
// ============================================================================

const t1MagnitudeEstimation: ConceptualGenerator = (rng = Math.random) => {
  const h1 = randInt(2, 5, rng);
  const h2 = randInt(2, 5, rng);
  const d1 = pick([-4, -3, -2, -1, 1, 2, 3, 4], rng);
  const d2 = pick([-4, -3, -2, -1, 1, 2, 3, 4], rng);
  const a = h1 * 100 + d1;
  const b = h2 * 100 + d2;
  const est = (h1 + h2) * 100;

  return buildChoiceProblem({
    question: `ESTIMATE: ${a} + ${b} IS CLOSEST TO...`,
    answer: formatNumber(est),
    distractors: [
      formatNumber(est / 10),
      formatNumber(est * 10),
      formatNumber((h1 + h2 - 2) * 100),
    ],
    archetype: 'MAGNITUDE_ESTIMATION',
    rng,
  });
};

const t1BenchmarkCompare: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const base = randInt(12, 89, rng);
    const shift = pick([10, 100], rng);
    const actual = base * shift;
    const mode = pick(['LT', 'EQ', 'GT'] as const, rng);
    const rhs =
      mode === 'EQ'
        ? actual
        : mode === 'LT'
          ? actual + shift
          : Math.max(10, actual - shift);
    return buildBenchmarkProblem({
      question: `COMPARE: ${base} × ${shift}  _  ${formatNumber(rhs)}`,
      answer: compareNumbers(actual, rhs),
    });
  }

  const h1 = randInt(2, 5, rng);
  const h2 = randInt(2, 4, rng);
  const mode = pick(['LT', 'EQ', 'GT'] as const, rng);
  const benchmark = (h1 + h2) * 100;
  let a: number;
  let b: number;
  if (mode === 'LT') {
    a = h1 * 100 - randInt(4, 15, rng);
    b = h2 * 100 - randInt(3, 12, rng);
  } else if (mode === 'GT') {
    a = h1 * 100 + randInt(4, 15, rng);
    b = h2 * 100 + randInt(3, 12, rng);
  } else {
    const offset = randInt(3, 15, rng);
    a = h1 * 100 + offset;
    b = h2 * 100 - offset;
  }

  return buildBenchmarkProblem({
    question: `COMPARE: ${a} + ${b}  _  ${benchmark}`,
    answer: compareNumbers(a + b, benchmark),
  });
};

const t1SpotTheGlitch: ConceptualGenerator = (rng = Math.random) => {
  const baseHundreds = randInt(4, 8, rng);
  const subHundreds = randInt(1, baseHundreds - 2, rng);
  const base = baseHundreds * 100 + randInt(1, 7, rng) * 10;
  const overshoot = randInt(1, 4, rng);
  const sub = subHundreds * 100 - overshoot;
  const roundSub = subHundreds * 100;
  const mid = base - roundSub;

  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `SPOT THE GLITCH IN ${base} - ${sub}:`,
      promptLines: [
        `Step 1: Round ${sub} up to ${roundSub} (+${overshoot})`,
        `Step 2: Subtract ${base} - ${roundSub} = ${mid}`,
        `Step 3: Adjust ${mid} - ${overshoot} = ${mid - overshoot}`,
      ],
      answer: 'Step 3',
      distractors: ['Step 1', 'Step 2'],
      archetype: 'SPOT_THE_GLITCH',
      rng,
    });
  }

  const wrongMid = mid + 100;
  return buildChoiceProblem({
    question: `SPOT THE GLITCH IN ${base} - ${sub}:`,
    promptLines: [
      `Step 1: Round ${sub} up to ${roundSub} (+${overshoot})`,
      `Step 2: Subtract ${base} - ${roundSub} = ${wrongMid}`,
      `Step 3: Add back ${overshoot} to adjust`,
    ],
    answer: 'Step 2',
    distractors: ['Step 1', 'Step 3'],
    archetype: 'SPOT_THE_GLITCH',
    rng,
  });
};

// ============================================================================
// TIER 2: 2×1 Multiplication, Factors, Multiples, Primes
// ============================================================================

const t2EquivalenceStructure: ConceptualGenerator = (rng = Math.random) => {
  const tens = randInt(2, 8, rng);
  const ones = randInt(2, 9, rng);
  const mult = randInt(3, 9, rng);
  const n = tens * 10 + ones;

  return buildChoiceProblem({
    question: `WHICH EXPRESSION EQUALS ${n} × ${mult}?`,
    answer: `(${tens * 10} × ${mult}) + (${ones} × ${mult})`,
    distractors: [
      `(${tens} × ${mult}) + (${ones} × ${mult})`,
      `(${tens * 10} + ${mult}) × (${ones} + ${mult})`,
      `(${tens * 10} × ${ones}) + ${mult}`,
    ],
    archetype: 'EQUIVALENCE_STRUCTURE',
    rng,
  });
};

const t2MagnitudeEstimation: ConceptualGenerator = (rng = Math.random) => {
  const tens = randInt(2, 8, rng);
  const delta = pick([-1, 1], rng);
  const n = tens * 10 + delta;
  const mult = randInt(3, 9, rng);
  const est = tens * 10 * mult;

  return buildChoiceProblem({
    question: `ESTIMATE: ${n} × ${mult} IS CLOSEST TO...`,
    answer: formatNumber(est),
    distractors: [
      formatNumber(tens * mult),
      formatNumber(est * 10),
      formatNumber(est + 100),
    ],
    archetype: 'MAGNITUDE_ESTIMATION',
    rng,
  });
};

const t2SpotTheGlitch: ConceptualGenerator = (rng = Math.random) => {
  const oddComposites: ReadonlyArray<readonly [number, number, number]> = [
    [21, 3, 7],
    [27, 3, 9],
    [33, 3, 11],
    [39, 3, 13],
    [49, 7, 7],
    [51, 3, 17],
    [57, 3, 19],
    [63, 7, 9],
    [77, 7, 11],
    [91, 7, 13],
  ];
  const [n, p, q] = pick(oddComposites, rng);

  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `SPOT THE GLITCH IN THIS PRIME CHECK FOR ${n}:`,
      promptLines: [
        `Step 1: ${n} is odd, so 2 does not divide it`,
        `Step 2: All odd numbers are prime`,
        `Step 3: Conclude ${n} has no other factors`,
      ],
      answer: 'Step 2',
      distractors: ['Step 1', 'Step 3'],
      archetype: 'SPOT_THE_GLITCH',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `SPOT THE GLITCH IN THIS FACTOR CHECK FOR ${n}:`,
    promptLines: [
      `Step 1: Factors divide ${n} with no remainder`,
      `Step 2: Notice ${p} × ${q} = ${n}`,
      `Step 3: Conclude ${n * 2} is a factor of ${n}`,
    ],
    answer: 'Step 3',
    distractors: ['Step 1', 'Step 2'],
    archetype: 'SPOT_THE_GLITCH',
    rng,
  });
};

// ============================================================================
// TIER 3: 2×2 Multiplication, Division, Remainders
// ============================================================================

const t3MagnitudeEstimation: ConceptualGenerator = (rng = Math.random) => {
  const t1 = randInt(2, 6, rng);
  const t2 = randInt(2, 5, rng);
  const a = t1 * 10 + pick([-2, -1, 1, 2], rng);
  const b = t2 * 10 + pick([-2, -1, 1, 2], rng);
  const est = t1 * t2 * 100;

  return buildChoiceProblem({
    question: `ESTIMATE: ${a} × ${b} IS CLOSEST TO...`,
    answer: formatNumber(est),
    distractors: [
      formatNumber(est / 10),
      formatNumber(est * 10),
      formatNumber(est + 500),
    ],
    archetype: 'MAGNITUDE_ESTIMATION',
    rng,
  });
};

const t3FirstStepStrategy: ConceptualGenerator = (rng = Math.random) => {
  const divisor = randInt(4, 8, rng);
  const quot = randInt(3, 7, rng);
  const rem = randInt(1, divisor - 1, rng);
  const total = divisor * quot + rem;
  const roundUp = rng() < 0.5;

  if (roundUp) {
    return buildChoiceProblem({
      question: `${total} DIVERS NEED PODS THAT HOLD ${divisor} EACH. AFTER ${total} ÷ ${divisor} = ${quot} R ${rem}, WHAT NEXT?`,
      answer: 'Round up (+1 pod)',
      distractors: ['Drop the remainder', 'Use only the remainder', 'Multiply by divisor'],
      archetype: 'FIRST_STEP_STRATEGY',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `${total} SHARDS MAKE KITS OF ${divisor} EACH. AFTER ${total} ÷ ${divisor} = ${quot} R ${rem}, HOW TO FIND FULL KITS?`,
    answer: 'Drop the remainder',
    distractors: ['Round up (+1 kit)', 'Use only the remainder', 'Multiply by divisor'],
    archetype: 'FIRST_STEP_STRATEGY',
    rng,
  });
};

const t3SpotTheGlitch: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(12, 24, rng);
  const tens = randInt(1, 3, rng);
  const ones = randInt(2, 5, rng);
  const b = tens * 10 + ones;
  const partOnes = a * ones;
  const partTensCorrect = a * tens * 10;
  const partTensWrong = a * tens;

  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `SPOT THE GLITCH IN ${a} × ${b}:`,
      promptLines: [
        `Step 1: Multiply ones: ${a} × ${ones} = ${partOnes}`,
        `Step 2: Multiply tens: ${a} × ${tens} = ${partTensWrong}`,
        `Step 3: Add parts: ${partOnes} + ${partTensWrong} = ${partOnes + partTensWrong}`,
      ],
      answer: 'Step 2',
      distractors: ['Step 1', 'Step 3'],
      archetype: 'SPOT_THE_GLITCH',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `SPOT THE GLITCH IN ${a} × ${b}:`,
    promptLines: [
      `Step 1: Multiply ones: ${a} × ${ones} = ${partOnes}`,
      `Step 2: Multiply tens: ${a} × ${tens * 10} = ${partTensCorrect}`,
      `Step 3: Combine: ${partTensCorrect} - ${partOnes} = ${partTensCorrect - partOnes}`,
    ],
    answer: 'Step 3',
    distractors: ['Step 1', 'Step 2'],
    archetype: 'SPOT_THE_GLITCH',
    rng,
  });
};

// ============================================================================
// TIER 4: Equivalent, Comparing & Like Fractions
// ============================================================================

const t4BenchmarkCompare: ConceptualGenerator = (rng = Math.random) => {
  const den = pick([4, 6, 8, 10, 12], rng);
  const half = den / 2;
  const mode = pick(['LT', 'EQ', 'GT'] as const, rng);
  const num =
    mode === 'EQ'
      ? half
      : mode === 'LT'
        ? randInt(1, half - 1, rng)
        : randInt(half + 1, den - 1, rng);

  return buildBenchmarkProblem({
    question: `COMPARE TO ONE-HALF: ${num}/${den}  _  1/2`,
    answer: compareNumbers(num * 2, den),
  });
};

const t4EquivalenceStructure: ConceptualGenerator = (rng = Math.random) => {
  const baseFractions: ReadonlyArray<readonly [number, number]> = [
    [1, 2],
    [1, 3],
    [2, 3],
    [1, 4],
    [3, 4],
    [1, 5],
    [2, 5],
    [3, 5],
    [4, 5],
    [1, 6],
    [5, 6],
  ];
  const [n, d] = pick(baseFractions, rng);
  const k = randInt(2, 4, rng);

  return buildChoiceProblem({
    question: `WHICH FRACTION IS EQUIVALENT TO ${n}/${d}?`,
    answer: `${n * k}/${d * k}`,
    distractors: [`${n + k}/${d + k}`, `${n * k}/${d}`, `${n}/${d * k}`],
    archetype: 'EQUIVALENCE_STRUCTURE',
    rng,
  });
};

const t4SpotTheGlitch: ConceptualGenerator = (rng = Math.random) => {
  const den = pick([5, 6, 7, 8, 9, 10], rng);
  const a = randInt(1, Math.floor(den / 2), rng);
  const b = randInt(1, den - a - 1, rng);

  if (rng() < 0.5 || a * b === a + b) {
    return buildChoiceProblem({
      question: `SPOT THE GLITCH IN ${a}/${den} + ${b}/${den}:`,
      promptLines: [
        `Step 1: Add numerators: ${a} + ${b} = ${a + b}`,
        `Step 2: Add denominators: ${den} + ${den} = ${den * 2}`,
        `Step 3: Write sum: ${a + b}/${den * 2}`,
      ],
      answer: 'Step 2',
      distractors: ['Step 1', 'Step 3'],
      archetype: 'SPOT_THE_GLITCH',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `SPOT THE GLITCH IN ${a}/${den} + ${b}/${den}:`,
    promptLines: [
      `Step 1: Multiply numerators: ${a} × ${b} = ${a * b}`,
      `Step 2: Keep denominator: ${den}`,
      `Step 3: Write sum: ${a * b}/${den}`,
    ],
    answer: 'Step 1',
    distractors: ['Step 2', 'Step 3'],
    archetype: 'SPOT_THE_GLITCH',
    rng,
  });
};

// ============================================================================
// TIER 5: Unlike Fractions, Prism Volume, Unit Conversions
// ============================================================================

const t5BenchmarkCompare: ConceptualGenerator = (rng = Math.random) => {
  const mode = pick(['LT', 'EQ', 'GT'] as const, rng);
  let n1: number;
  let d1: number;
  let n2: number;
  let d2: number;

  if (mode === 'LT') {
    const smallPairs: ReadonlyArray<readonly [number, number, number, number]> = [
      [1, 3, 1, 4],
      [1, 4, 2, 5],
      [2, 5, 1, 3],
      [1, 6, 3, 8],
      [3, 8, 1, 3],
    ];
    [n1, d1, n2, d2] = pick(smallPairs, rng);
  } else if (mode === 'GT') {
    const bigPairs: ReadonlyArray<readonly [number, number, number, number]> = [
      [5, 8, 4, 7],
      [2, 3, 3, 5],
      [3, 4, 3, 5],
      [5, 6, 3, 8],
      [4, 5, 2, 3],
    ];
    [n1, d1, n2, d2] = pick(bigPairs, rng);
  } else {
    const eqPairs: ReadonlyArray<readonly [number, number, number, number]> = [
      [1, 4, 6, 8],
      [1, 3, 4, 6],
      [2, 5, 6, 10],
      [1, 2, 3, 6],
      [3, 4, 2, 8],
    ];
    [n1, d1, n2, d2] = pick(eqPairs, rng);
  }

  return buildBenchmarkProblem({
    question: `COMPARE SUM TO 1: ${n1}/${d1} + ${n2}/${d2}  _  1`,
    answer: compareNumbers(n1 * d2 + n2 * d1, d1 * d2),
  });
};

const t5FirstStepStrategy: ConceptualGenerator = (rng = Math.random) => {
  const conversions: ReadonlyArray<{
    from: string;
    to: string;
    factor: number;
    op: 'Multiply' | 'Divide';
  }> = [
    { from: 'ft', to: 'in', factor: 12, op: 'Multiply' },
    { from: 'in', to: 'ft', factor: 12, op: 'Divide' },
    { from: 'yd', to: 'ft', factor: 3, op: 'Multiply' },
    { from: 'ft', to: 'yd', factor: 3, op: 'Divide' },
    { from: 'lb', to: 'oz', factor: 16, op: 'Multiply' },
    { from: 'kg', to: 'g', factor: 1000, op: 'Multiply' },
  ];
  const conv = pick(conversions, rng);
  const qty = conv.op === 'Divide' ? conv.factor * randInt(2, 5, rng) : randInt(2, 9, rng);
  const opposite = conv.op === 'Multiply' ? 'Divide' : 'Multiply';

  return buildChoiceProblem({
    question: `TO CONVERT ${qty} ${conv.from} TO ${conv.to}, WHAT DO YOU DO?`,
    answer: `${conv.op} by ${conv.factor}`,
    distractors: [
      `${opposite} by ${conv.factor}`,
      `Add ${conv.factor}`,
      `Subtract ${conv.factor}`,
    ],
    archetype: 'FIRST_STEP_STRATEGY',
    rng,
  });
};

const t5MagnitudeEstimation: ConceptualGenerator = (rng = Math.random) => {
  const volume = pick([12, 16, 18, 20, 24, 30, 36, 40], rng);
  const scale = pick([2, 3] as const, rng);
  const verb = scale === 2 ? 'DOUBLES' : 'TRIPLES';
  const answerLabel = scale === 2 ? `Doubles to ${volume * 2}` : `Triples to ${volume * 3}`;

  return buildChoiceProblem({
    question: `A PRISM HAS VOLUME ${volume}. IF ITS HEIGHT ${verb}, THE NEW VOLUME...`,
    answer: answerLabel,
    distractors: [
      `Adds ${scale} (${volume + scale})`,
      `Halves to ${volume / 2}`,
      `Stays ${volume}`,
    ],
    archetype: 'MAGNITUDE_ESTIMATION',
    rng,
  });
};

// ============================================================================
// TIER 6: Clean Decimals & Fraction ↔ Decimal
// ============================================================================

const t6MagnitudeEstimation: ConceptualGenerator = (rng = Math.random) => {
  let m = randInt(2, 8, rng);
  let n = randInt(2, 7, rng);
  if (m * n < 10) {
    m = randInt(4, 8, rng);
    n = randInt(3, 7, rng);
  }
  const d1 = pick([-2, -1, 1, 2], rng);
  const d2 = pick([-2, -1, 1, 2], rng);
  const x = (m + d1 / 10).toFixed(1);
  const y = (n + d2 / 10).toFixed(1);
  const est = m * n;

  return buildChoiceProblem({
    question: `ESTIMATE: ${x} × ${y} IS CLOSEST TO...`,
    answer: `${est}`,
    distractors: [`${(est / 10).toFixed(1)}`, `${est * 10}`, `${est * 100}`],
    archetype: 'MAGNITUDE_ESTIMATION',
    rng,
  });
};

const t6BenchmarkCompare: ConceptualGenerator = (rng = Math.random) => {
  const decimals: ReadonlyArray<readonly [string, number, number]> = [
    ['0.25', 1, 4],
    ['0.4', 2, 5],
    ['0.5', 1, 2],
    ['0.6', 3, 5],
    ['0.75', 3, 4],
    ['0.8', 4, 5],
  ];
  const fractions: ReadonlyArray<readonly [string, number, number]> = [
    ['1/4', 1, 4],
    ['1/3', 1, 3],
    ['2/5', 2, 5],
    ['1/2', 1, 2],
    ['3/5', 3, 5],
    ['2/3', 2, 3],
    ['3/4', 3, 4],
    ['4/5', 4, 5],
  ];
  const [decStr, dn, dd] = pick(decimals, rng);
  const [fracStr, fn, fd] = pick(fractions, rng);

  return buildBenchmarkProblem({
    question: `COMPARE: ${decStr}  _  ${fracStr}`,
    answer: compareNumbers(dn * fd, fn * dd),
  });
};

const t6SpotTheGlitch: ConceptualGenerator = (rng = Math.random) => {
  const whole = randInt(2, 8, rng);
  const tenths = randInt(2, 5, rng);
  const hundredths = pick([15, 25, 35, 45], rng);
  const wrongDec = tenths + hundredths;

  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `SPOT THE GLITCH IN ${whole}.${tenths} + 0.${hundredths}:`,
      promptLines: [
        `Step 1: Keep the ones digit ${whole}`,
        `Step 2: Add decimal digits ${tenths} + ${hundredths} = ${wrongDec}`,
        `Step 3: Write result ${whole}.${wrongDec}`,
      ],
      answer: 'Step 2',
      distractors: ['Step 1', 'Step 3'],
      archetype: 'SPOT_THE_GLITCH',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `SPOT THE GLITCH IN ${whole}.${tenths} + 0.${hundredths}:`,
    promptLines: [
      `Step 1: Rewrite ${whole}.${tenths} as ${whole}.0${tenths}`,
      `Step 2: Add hundredths 0${tenths} + ${hundredths}`,
      `Step 3: Keep ones digit ${whole}`,
    ],
    answer: 'Step 1',
    distractors: ['Step 2', 'Step 3'],
    archetype: 'SPOT_THE_GLITCH',
    rng,
  });
};

// ============================================================================
// TIER 7: Ratios, Unit Rates, Benchmark Percentages
// ============================================================================

const t7BenchmarkCompare: ConceptualGenerator = (rng = Math.random) => {
  const q1 = randInt(2, 5, rng);
  const q2 = randInt(2, 6, rng);
  const unit1 = randInt(3, 9, rng);
  const mode = pick(['LT', 'EQ', 'GT'] as const, rng);
  const unit2 =
    mode === 'EQ'
      ? unit1
      : mode === 'LT'
        ? unit1 + randInt(1, 3, rng)
        : Math.max(2, unit1 - randInt(1, 3, rng));

  return buildBenchmarkProblem({
    question: `COMPARE UNIT COST: $${unit1 * q1} FOR ${q1}  _  $${unit2 * q2} FOR ${q2}`,
    answer: compareNumbers(unit1, unit2),
  });
};

const t7MagnitudeEstimation: ConceptualGenerator = (rng = Math.random) => {
  const cases: ReadonlyArray<{ pct: number; total: number; est: number }> = [
    { pct: 24, total: 200, est: 50 },
    { pct: 26, total: 400, est: 100 },
    { pct: 49, total: 120, est: 60 },
    { pct: 51, total: 80, est: 40 },
    { pct: 11, total: 300, est: 30 },
    { pct: 9, total: 500, est: 50 },
    { pct: 74, total: 200, est: 150 },
    { pct: 76, total: 400, est: 300 },
  ];
  const { pct, total, est } = pick(cases, rng);

  return buildChoiceProblem({
    question: `ESTIMATE: ${pct}% OF ${total} IS CLOSEST TO...`,
    answer: formatNumber(est),
    distractors: [
      formatNumber(est / 10),
      formatNumber(est * 10),
      formatNumber(total + est),
    ],
    archetype: 'MAGNITUDE_ESTIMATION',
    rng,
  });
};

const t7EquivalenceStructure: ConceptualGenerator = (rng = Math.random) => {
  const baseRatios: ReadonlyArray<readonly [number, number]> = [
    [1, 2],
    [1, 3],
    [2, 3],
    [1, 4],
    [3, 4],
    [2, 5],
    [3, 5],
    [4, 5],
    [2, 7],
    [3, 7],
  ];
  const [a, b] = pick(baseRatios, rng);
  const k = randInt(2, 5, rng);

  return buildChoiceProblem({
    question: `WHICH RATIO IS EQUIVALENT TO ${a}:${b}?`,
    answer: `${a * k}:${b * k}`,
    distractors: [`${a + k}:${b + k}`, `${b * k}:${a * k}`, `${a * k}:${b}`],
    archetype: 'EQUIVALENCE_STRUCTURE',
    rng,
  });
};

// ============================================================================
// TIER 8: Signed Integers, Absolute Value, 4-Quadrant Grid
// ============================================================================

const t8SignPrediction: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(-18, 18, rng) || 5;
  const b = randInt(-18, 18, rng) || -7;
  const useSub = rng() < 0.5;
  const value = useSub ? a - b : a + b;
  const expr = useSub ? `${a} - (${b})` : `${a} + (${b})`;
  const answer = value > 0 ? 'POSITIVE' : value < 0 ? 'NEGATIVE' : 'ZERO';
  const distractors = ['POSITIVE', 'NEGATIVE', 'ZERO'].filter((c) => c !== answer);

  return buildChoiceProblem({
    question: `PREDICT THE SIGN OF: ${expr}`,
    answer,
    distractors,
    archetype: 'SIGN_PREDICTION',
    rng,
  });
};

const t8VisualQuadrant: ConceptualGenerator = (rng = Math.random) => {
  const xSign = rng() < 0.5 ? 1 : -1;
  const ySign = rng() < 0.5 ? 1 : -1;
  const x = xSign * randInt(1, 9, rng);
  const y = ySign * randInt(1, 9, rng);
  const answer =
    x > 0 && y > 0
      ? 'Quadrant I'
      : x < 0 && y > 0
        ? 'Quadrant II'
        : x < 0 && y < 0
          ? 'Quadrant III'
          : 'Quadrant IV';
  const distractors = ['Quadrant I', 'Quadrant II', 'Quadrant III', 'Quadrant IV'].filter(
    (q) => q !== answer
  );

  return buildChoiceProblem({
    question: `WHICH QUADRANT CONTAINS THE POINT (${x}, ${y})?`,
    answer,
    distractors,
    archetype: 'VISUAL_QUADRANT',
    rng,
  });
};

const t8BenchmarkCompare: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const a = -randInt(2, 15, rng);
    const b = -randInt(2, 15, rng);
    return buildBenchmarkProblem({
      question: `COMPARE: ${a}  _  ${b}`,
      answer: compareNumbers(a, b),
    });
  }

  const a = -randInt(2, 15, rng);
  const b = randInt(2, 15, rng);
  if (rng() < 0.5) {
    return buildBenchmarkProblem({
      question: `COMPARE: |${a}|  _  |${b}|`,
      answer: compareNumbers(Math.abs(a), Math.abs(b)),
    });
  }
  return buildBenchmarkProblem({
    question: `COMPARE: |${a}|  _  ${a}`,
    answer: compareNumbers(Math.abs(a), a),
  });
};

// ============================================================================
// TIER 9: Exponents, PEMDAS, Linear Expressions, 1-Step Equations
// ============================================================================

const t9FirstStepStrategy: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(2, 9, rng);
  const x = randInt(2, 10, rng);
  const form = pick(['ADD', 'SUB', 'MUL', 'DIV'] as const, rng);

  let eq: string;
  let answer: string;
  if (form === 'ADD') {
    eq = `x + ${a} = ${x + a}`;
    answer = `Subtract ${a}`;
  } else if (form === 'SUB') {
    eq = `x - ${a} = ${x}`;
    answer = `Add ${a}`;
  } else if (form === 'MUL') {
    eq = `${a}x = ${a * x}`;
    answer = `Divide by ${a}`;
  } else {
    eq = `x / ${a} = ${x}`;
    answer = `Multiply by ${a}`;
  }

  const allChoices = [`Add ${a}`, `Subtract ${a}`, `Multiply by ${a}`, `Divide by ${a}`];
  return buildChoiceProblem({
    question: `BEST FIRST MOVE TO SOLVE ${eq}?`,
    answer,
    distractors: allChoices.filter((c) => c !== answer),
    archetype: 'FIRST_STEP_STRATEGY',
    rng,
  });
};

const t9SpotTheGlitch: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const a = randInt(2, 9, rng);
    const b = randInt(2, 7, rng);
    const c = randInt(2, 6, rng);
    const wrongSum = a + b;

    return buildChoiceProblem({
      question: `SPOT THE GLITCH IN ${a} + ${b} × ${c}:`,
      promptLines: [
        `Step 1: Add first: ${a} + ${b} = ${wrongSum}`,
        `Step 2: Multiply: ${wrongSum} × ${c} = ${wrongSum * c}`,
        `Step 3: Output ${wrongSum * c}`,
      ],
      answer: 'Step 1',
      distractors: ['Step 2', 'Step 3'],
      archetype: 'SPOT_THE_GLITCH',
      rng,
    });
  }

  const base = randInt(3, 9, rng);
  const addend = randInt(2, 8, rng);
  const wrongPow = base * 2;
  return buildChoiceProblem({
    question: `SPOT THE GLITCH IN ${base}² + ${addend}:`,
    promptLines: [
      `Step 1: Identify exponent on ${base}²`,
      `Step 2: Compute ${base}² = ${base} × 2 = ${wrongPow}`,
      `Step 3: Add ${wrongPow} + ${addend} = ${wrongPow + addend}`,
    ],
    answer: 'Step 2',
    distractors: ['Step 1', 'Step 3'],
    archetype: 'SPOT_THE_GLITCH',
    rng,
  });
};

const t9EquivalenceStructure: ConceptualGenerator = (rng = Math.random) => {
  const k = randInt(2, 7, rng);
  const a = randInt(2, 9, rng);
  const sign = rng() < 0.5 ? '+' : '-';

  return buildChoiceProblem({
    question: `WHICH EXPRESSION EQUALS ${k}(x ${sign} ${a})?`,
    answer: `${k}x ${sign} ${k * a}`,
    distractors: [`${k}x ${sign} ${a}`, `x ${sign} ${k * a}`, `${k + a}x`],
    archetype: 'EQUIVALENCE_STRUCTURE',
    rng,
  });
};

// ============================================================================
// TIER 10: 2-Step Equations, Inequalities, Area, Statistics
// ============================================================================

const t10FirstStepStrategy: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(2, 8, rng);
  const b = randInt(2, 12, rng);
  const x = randInt(2, 9, rng);
  const isAdd = rng() < 0.5;
  const eq = isAdd ? `${a}x + ${b} = ${a * x + b}` : `${a}x - ${b} = ${a * x - b}`;
  const answer = isAdd ? `Subtract ${b}` : `Add ${b}`;

  const allChoices = [`Subtract ${b}`, `Add ${b}`, `Divide by ${a}`, `Multiply by ${a}`];
  return buildChoiceProblem({
    question: `BEST FIRST MOVE TO SOLVE ${eq}?`,
    answer,
    distractors: allChoices.filter((c) => c !== answer),
    archetype: 'FIRST_STEP_STRATEGY',
    rng,
  });
};

const t10SpotTheGlitch: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(2, 6, rng);
  const b = randInt(2, 9, rng);
  const x = randInt(2, 8, rng);
  const c = a * x + b;

  if (rng() < 0.5) {
    const wrongRhs = c + b;
    return buildChoiceProblem({
      question: `SPOT THE GLITCH IN SOLVING ${a}x + ${b} = ${c}:`,
      promptLines: [
        `Step 1: Add ${b} to both sides -> ${a}x = ${wrongRhs}`,
        `Step 2: Divide both sides by ${a}`,
        `Step 3: Report value of x`,
      ],
      answer: 'Step 1',
      distractors: ['Step 2', 'Step 3'],
      archetype: 'SPOT_THE_GLITCH',
      rng,
    });
  }

  const rhs = a * x;
  return buildChoiceProblem({
    question: `SPOT THE GLITCH IN SOLVING ${a}x + ${b} = ${c}:`,
    promptLines: [
      `Step 1: Subtract ${b} from both sides -> ${a}x = ${rhs}`,
      `Step 2: Multiply both sides by ${a} -> x = ${rhs * a}`,
      `Step 3: Report x = ${rhs * a}`,
    ],
    answer: 'Step 2',
    distractors: ['Step 1', 'Step 3'],
    archetype: 'SPOT_THE_GLITCH',
    rng,
  });
};

const t10VisualQuadrant: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const b = randInt(4, 12, rng);
    const h = randInt(4, 10, rng);
    return buildChoiceProblem({
      question: `A TRIANGLE AND PARALLELOGRAM SHARE BASE ${b} AND HEIGHT ${h}. THE TRIANGLE'S AREA IS...`,
      answer: 'Half as large',
      distractors: ['Equal', 'Twice as large', 'One-fourth as large'],
      archetype: 'VISUAL_QUADRANT',
      rng,
    });
  }

  const base = randInt(4, 10, rng);
  const outlier = base + randInt(25, 50, rng);
  return buildChoiceProblem({
    question: `DATA [${base}, ${base + 1}, ${base + 2}] ADDS OUTLIER ${outlier}. THE MEAN...`,
    answer: 'Increases',
    distractors: ['Decreases', 'Stays the same', 'Becomes zero'],
    archetype: 'VISUAL_QUADRANT',
    rng,
  });
};

// ============================================================================
// TIER 11: Proportionality, Tax/Tip, Simple Interest
// ============================================================================

const t11VisualQuadrant: ConceptualGenerator = (rng = Math.random) => {
  const k = randInt(2, 9, rng);
  const b = randInt(1, 8, rng);

  return buildChoiceProblem({
    question: `WHICH EQUATION GRAPHS A PROPORTIONAL LINE THROUGH (0, 0)?`,
    answer: `y = ${k}x`,
    distractors: [`y = ${k}x + ${b}`, `y = ${k}x - ${b}`, `y = x + ${k}`],
    archetype: 'VISUAL_QUADRANT',
    rng,
  });
};

const t11MagnitudeEstimation: ConceptualGenerator = (rng = Math.random) => {
  const bill = pick([40, 60, 80, 100], rng);
  const tipPct = pick([15, 20], rng);
  const tip = (bill * tipPct) / 100;
  const total = bill + tip;

  return buildChoiceProblem({
    question: `A $${bill} BILL GETS A ${tipPct}% TIP. WHAT IS THE TOTAL?`,
    answer: `$${total}`,
    distractors: [`$${tip}`, `$${bill - tip}`, `$${bill * 2}`],
    archetype: 'MAGNITUDE_ESTIMATION',
    rng,
  });
};

const t11EquivalenceStructure: ConceptualGenerator = (rng = Math.random) => {
  const p = pick([10, 15, 20, 25, 30], rng);
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `INCREASING A PRICE BY ${p}% IS EQUIVALENT TO...`,
      answer: `Multiply by 1.${p}`,
      distractors: [`Multiply by 0.${p}`, `Add ${p}`, `Divide by 1.${p}`],
      archetype: 'EQUIVALENCE_STRUCTURE',
      rng,
    });
  }

  const rem = 100 - p;
  return buildChoiceProblem({
    question: `A ${p}% DISCOUNT OFF A PRICE IS EQUIVALENT TO...`,
    answer: `Multiply by 0.${rem}`,
    distractors: [`Multiply by 0.${p}`, `Multiply by 1.${p}`, `Subtract ${p}`],
    archetype: 'EQUIVALENCE_STRUCTURE',
    rng,
  });
};

// ============================================================================
// TIER 12: Signed Rationals & Sign Rules
// ============================================================================

const t12SignPrediction: ConceptualGenerator = (rng = Math.random) => {
  const fracs = ['1/2', '2/3', '3/4', '2/5', '3/5', '4/5'];
  const f1 = pick(fracs, rng);
  const f2 = pick(fracs, rng);
  const s1 = rng() < 0.5 ? -1 : 1;
  const s2 = rng() < 0.5 ? -1 : 1;

  if (rng() < 0.5) {
    const prodSign = s1 * s2;
    const answer = prodSign > 0 ? 'POSITIVE' : 'NEGATIVE';
    const op = rng() < 0.5 ? '×' : '÷';
    const term1 = s1 < 0 ? `(-${f1})` : `(${f1})`;
    const term2 = s2 < 0 ? `(-${f2})` : `(${f2})`;
    return buildChoiceProblem({
      question: `PREDICT THE SIGN OF: ${term1} ${op} ${term2}`,
      answer,
      distractors: ['POSITIVE', 'NEGATIVE', 'ZERO'].filter((c) => c !== answer),
      archetype: 'SIGN_PREDICTION',
      rng,
    });
  }

  const f3 = pick(fracs, rng);
  const s3 = rng() < 0.5 ? -1 : 1;
  const prodSign = s1 * s2 * s3;
  const answer = prodSign > 0 ? 'POSITIVE' : 'NEGATIVE';
  const term1 = s1 < 0 ? `(-${f1})` : `(${f1})`;
  const term2 = s2 < 0 ? `(-${f2})` : `(${f2})`;
  const term3 = s3 < 0 ? `(-${f3})` : `(${f3})`;
  return buildChoiceProblem({
    question: `PREDICT THE SIGN OF: ${term1} × ${term2} × ${term3}`,
    answer,
    distractors: ['POSITIVE', 'NEGATIVE', 'ZERO'].filter((c) => c !== answer),
    archetype: 'SIGN_PREDICTION',
    rng,
  });
};

const t12SpotTheGlitch: ConceptualGenerator = (rng = Math.random) => {
  const pair1: ReadonlyArray<readonly [number, number]> = [
    [2, 3],
    [3, 4],
    [2, 5],
    [3, 5],
  ];
  const pair2: ReadonlyArray<readonly [number, number]> = [
    [1, 2],
    [1, 4],
    [2, 7],
    [3, 7],
  ];
  const [n1, d1] = pick(pair1, rng);
  const [n2, d2] = pick(pair2, rng);

  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `SPOT THE GLITCH IN (-${n1}/${d1}) ÷ (${n2}/${d2}):`,
      promptLines: [
        `Step 1: Flip the first fraction to (-${d1}/${n1})`,
        `Step 2: Change ÷ to ×`,
        `Step 3: Multiply (-${d1}/${n1}) × (${n2}/${d2})`,
      ],
      answer: 'Step 1',
      distractors: ['Step 2', 'Step 3'],
      archetype: 'SPOT_THE_GLITCH',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `SPOT THE GLITCH IN (-${n1}/${d1}) ÷ (-${n2}/${d2}):`,
    promptLines: [
      `Step 1: Rewrite as (-${n1}/${d1}) × (-${d2}/${n2})`,
      `Step 2: Multiply numerators and denominators`,
      `Step 3: Keep answer NEGATIVE because both were negative`,
    ],
    answer: 'Step 3',
    distractors: ['Step 1', 'Step 2'],
    archetype: 'SPOT_THE_GLITCH',
    rng,
  });
};

const t12BenchmarkCompare: ConceptualGenerator = (rng = Math.random) => {
  const cases: ReadonlyArray<{ question: string; answer: '<' | '=' | '>' }> = [
    { question: 'COMPARE: (1/2) × (3/4)  _  3/4', answer: '<' },
    { question: 'COMPARE: (2/3) × (4/5)  _  4/5', answer: '<' },
    { question: 'COMPARE: (-3/4) × 2  _  -3/4', answer: '<' },
    { question: 'COMPARE: (-2/5) × 3  _  -2/5', answer: '<' },
    { question: 'COMPARE: (-3/4) × (-1)  _  -3/4', answer: '>' },
    { question: 'COMPARE: (-1/2) × (-1/2)  _  -1/2', answer: '>' },
    { question: 'COMPARE: (3/5) × 1  _  3/5', answer: '=' },
    { question: 'COMPARE: (-2/3) × 1  _  -2/3', answer: '=' },
  ];
  const chosen = pick(cases, rng);
  return buildBenchmarkProblem(chosen);
};

// ============================================================================
// PHASE 4.5 POOL EXPANSION: 3 NEW TEMPLATES PER TIER (36 -> 72 TIER TEMPLATES)
// ============================================================================

// --- TIER 1 NEW TEMPLATES ---

const t1EffectOfChange: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const a = randInt(120, 480, rng);
    const b = randInt(110, 390, rng);
    const delta = pick([10, 20, 100, 200], rng);
    return buildChoiceProblem({
      question: `IN ${a} + ${b}, IF YOU ADD ${delta} TO ${a}, THE SUM...`,
      answer: `Increases by ${delta}`,
      distractors: [
        `Decreases by ${delta}`,
        `Stays the same`,
        `Increases by ${delta * 2}`,
      ],
      archetype: 'EFFECT_OF_CHANGE',
      rng,
    });
  }

  const base = randInt(12, 89, rng);
  const mult = pick([10, 100], rng);
  const shift = mult === 10 ? '1 place left' : '2 places left';
  return buildChoiceProblem({
    question: `WHEN YOU MULTIPLY ${base} BY ${mult}, ITS DIGITS SHIFT...`,
    answer: shift,
    distractors: [
      mult === 10 ? '2 places left' : '1 place left',
      '1 place right',
      'Do not move',
    ],
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const t1EquivalenceStructure: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(145, 585, rng);
  const offset = pick([1, 2], rng);
  const nearHundred = 100 - offset;
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `WHICH EXPRESSION EQUALS ${a} + ${nearHundred}?`,
      answer: `${a} + 100 - ${offset}`,
      distractors: [
        `${a} + 100 + ${offset}`,
        `${a} - 100 + ${offset}`,
        `${a} + 90 - ${offset}`,
      ],
      archetype: 'EQUIVALENCE_STRUCTURE',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `WHICH EXPRESSION EQUALS ${a} - ${nearHundred}?`,
    answer: `${a} - 100 + ${offset}`,
    distractors: [
      `${a} - 100 - ${offset}`,
      `${a} + 100 - ${offset}`,
      `${a} - 90 + ${offset}`,
    ],
    archetype: 'EQUIVALENCE_STRUCTURE',
    rng,
  });
};

const t1FirstStepStrategy: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const hundreds = pick([200, 300, 400], rng);
    const diff = pick([1, 2, 3], rng);
    const near = hundreds - diff;
    const other = randInt(135, 465, rng);
    return buildChoiceProblem({
      question: `FASTEST MENTAL STRATEGY FOR ${near} + ${other}:`,
      answer: `Add ${hundreds}, then subtract ${diff}`,
      distractors: [
        `Add ${hundreds}, then add ${diff}`,
        `Subtract ${hundreds}, then add ${diff}`,
        `Multiply by ${diff}`,
      ],
      archetype: 'FIRST_STEP_STRATEGY',
      rng,
    });
  }

  const start = pick([500, 600, 700, 800], rng);
  const hundreds = pick([200, 300], rng);
  const diff = pick([1, 2, 3], rng);
  const sub = hundreds - diff;
  return buildChoiceProblem({
    question: `FASTEST MENTAL STRATEGY FOR ${start} - ${sub}:`,
    answer: `Subtract ${hundreds}, then add ${diff}`,
    distractors: [
      `Subtract ${hundreds}, then subtract ${diff}`,
      `Add ${hundreds}, then subtract ${diff}`,
      `Divide by ${diff}`,
    ],
    archetype: 'FIRST_STEP_STRATEGY',
    rng,
  });
};

// --- TIER 2 NEW TEMPLATES ---

const t2EffectOfChange: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(4, 12, rng) * 2;
  const b = randInt(3, 9, rng);
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `IN ${a} × ${b}, IF YOU DOUBLE ${b}, THE PRODUCT...`,
      answer: 'Doubles',
      distractors: ['Stays the same', 'Halves', 'Triples'],
      archetype: 'EFFECT_OF_CHANGE',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `IN ${a} × ${b}, IF YOU HALVE ${a} AND DOUBLE ${b}, THE PRODUCT...`,
    answer: 'Stays the same',
    distractors: ['Doubles', 'Halves', 'Becomes 4× as large'],
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const t2BenchmarkCompare: ConceptualGenerator = (rng = Math.random) => {
  const cases: Array<{ a: number; b: number; c: number; d: number }> = [
    { a: 18, b: 5, c: 20, d: 5 },
    { a: 24, b: 4, c: 12, d: 8 },
    { a: 31, b: 6, c: 30, d: 6 },
    { a: 15, b: 6, c: 30, d: 3 },
    { a: 29, b: 4, c: 30, d: 4 },
    { a: 42, b: 5, c: 40, d: 5 },
    { a: 16, b: 3, c: 8, d: 6 },
    { a: 25, b: 7, c: 25, d: 8 },
  ];
  const { a, b, c, d } = pick(cases, rng);
  return buildBenchmarkProblem({
    question: `COMPARE: ${a} × ${b}  _  ${c} × ${d}`,
    answer: compareNumbers(a * b, c * d),
  });
};

const t2FirstStepStrategy: ConceptualGenerator = (rng = Math.random) => {
  const cases = [
    {
      divisor: 2,
      n: pick([146, 238, 412, 574], rng),
      answer: 'Check if the last digit is even',
      distractors: [
        'Add all the digits together',
        'Check if it ends in 0 only',
        'Check if the first digit is even',
      ],
    },
    {
      divisor: 5,
      n: pick([135, 240, 385, 610], rng),
      answer: 'Check if the last digit is 0 or 5',
      distractors: [
        'Add all the digits together',
        'Check if the last digit is even',
        'Check if the first digit is 5',
      ],
    },
    {
      divisor: 10,
      n: pick([190, 340, 520, 870], rng),
      answer: 'Check if the last digit is 0',
      distractors: [
        'Check if the last digit is 5',
        'Add all the digits together',
        'Check if the first digit is 1',
      ],
    },
    {
      divisor: 3,
      n: pick([126, 234, 351, 417], rng),
      answer: 'Check if the sum of digits divides by 3',
      distractors: [
        'Check if the last digit is 3',
        'Check if the number is odd',
        'Check if the last digit is 0 or 5',
      ],
    },
  ];
  const chosen = pick(cases, rng);
  return buildChoiceProblem({
    question: `FASTEST WAY TO CHECK IF ${chosen.n} IS DIVISIBLE BY ${chosen.divisor}:`,
    answer: chosen.answer,
    distractors: chosen.distractors,
    archetype: 'FIRST_STEP_STRATEGY',
    rng,
  });
};

// --- TIER 3 NEW TEMPLATES ---

const t3EffectOfChange: ConceptualGenerator = (rng = Math.random) => {
  const divisor = pick([4, 6, 8], rng);
  const dividend = divisor * randInt(6, 14, rng);
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `IN ${dividend} ÷ ${divisor}, IF YOU DOUBLE ${dividend}, THE QUOTIENT...`,
      answer: 'Doubles',
      distractors: ['Halves', 'Stays the same', 'Becomes 4× as large'],
      archetype: 'EFFECT_OF_CHANGE',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `IN ${dividend} ÷ ${divisor}, IF YOU DOUBLE ${divisor}, THE QUOTIENT...`,
    answer: 'Halves',
    distractors: ['Doubles', 'Stays the same', 'Increases by 2'],
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const t3BenchmarkCompare: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const dividend = pick([48, 60, 72, 96, 120], rng);
    const d1 = pick([3, 4, 6, 8, 12], rng);
    const d2 = pick([3, 4, 6, 8, 12], rng);
    return buildBenchmarkProblem({
      question: `COMPARE: ${dividend} ÷ ${d1}  _  ${dividend} ÷ ${d2}`,
      answer: compareNumbers(dividend / d1, dividend / d2),
    });
  }

  const divisor = pick([4, 5, 6, 8], rng);
  const q1 = randInt(8, 22, rng);
  const q2 = randInt(8, 22, rng);
  return buildBenchmarkProblem({
    question: `COMPARE: ${divisor * q1} ÷ ${divisor}  _  ${divisor * q2} ÷ ${divisor}`,
    answer: compareNumbers(q1, q2),
  });
};

const t3EquivalenceStructure: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const a = randInt(6, 14, rng);
    const b = pick([7, 8, 9, 10, 11, 12, 13, 14, 15].filter((v) => v !== a), rng);
    const prod = a * b;
    return buildChoiceProblem({
      question: `IF ${a} × ${b} = ${prod}, WHICH STATEMENT MUST BE TRUE?`,
      answer: `${prod} ÷ ${b} = ${a}`,
      distractors: [
        `${prod} ÷ ${a} = ${a}`,
        `${b} ÷ ${prod} = ${a}`,
        `${prod} × ${b} = ${a}`,
      ],
      archetype: 'EQUIVALENCE_STRUCTURE',
      rng,
    });
  }

  const tens = randInt(2, 5, rng) * 10;
  const ones = randInt(2, 8, rng);
  const mult = randInt(11, 15, rng);
  return buildChoiceProblem({
    question: `WHICH AREA-MODEL SPLIT EQUALS ${tens + ones} × ${mult}?`,
    answer: `(${tens} × ${mult}) + (${ones} × ${mult})`,
    distractors: [
      `(${tens} + ${mult}) × (${ones} + ${mult})`,
      `(${tens} × ${ones}) + ${mult}`,
      `(${tens} × ${mult}) + ${ones}`,
    ],
    archetype: 'EQUIVALENCE_STRUCTURE',
    rng,
  });
};

// --- TIER 4 NEW TEMPLATES ---

const t4EffectOfChange: ConceptualGenerator = (rng = Math.random) => {
  const num = randInt(2, 5, rng);
  const den = randInt(num + 2, 11, rng);
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `IN ${num}/${den}, IF YOU INCREASE THE DENOMINATOR (SAME TOP), THE FRACTION...`,
      answer: 'Gets smaller',
      distractors: ['Gets larger', 'Stays the same', 'Becomes greater than 1'],
      archetype: 'EFFECT_OF_CHANGE',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `IN ${num}/${den}, IF YOU INCREASE THE NUMERATOR (SAME BOTTOM), THE FRACTION...`,
    answer: 'Gets larger',
    distractors: ['Gets smaller', 'Stays the same', 'Always equals 1'],
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const t4MagnitudeEstimation: ConceptualGenerator = (rng = Math.random) => {
  const den = pick([8, 10, 12], rng);
  const branch = randInt(0, 2, rng);

  if (branch === 0) {
    // Near 1
    const n1 = den / 2;
    const n2 = den / 2 - 1;
    return buildChoiceProblem({
      question: `ESTIMATE: ${n1}/${den} + ${n2}/${den} IS CLOSEST TO...`,
      answer: '1',
      distractors: ['0', '1/2', '2'],
      archetype: 'MAGNITUDE_ESTIMATION',
      rng,
    });
  }

  if (branch === 1) {
    // Near 0
    const n2 = randInt(2, den - 2, rng);
    const n1 = n2 + 1;
    return buildChoiceProblem({
      question: `ESTIMATE: ${n1}/${den} - ${n2}/${den} IS CLOSEST TO...`,
      answer: '0',
      distractors: ['1/2', '1', '2'],
      archetype: 'MAGNITUDE_ESTIMATION',
      rng,
    });
  }

  // Near 1/2
  const half = den / 2;
  const n1 = 2;
  const n2 = half - 1;
  return buildChoiceProblem({
    question: `ESTIMATE: ${n1}/${den} + ${n2}/${den} IS CLOSEST TO...`,
    answer: '1/2',
    distractors: ['0', '1', '2'],
    archetype: 'MAGNITUDE_ESTIMATION',
    rng,
  });
};

const t4FirstStepStrategy: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const num = randInt(2, 5, rng);
    const d1 = num + randInt(2, 4, rng);
    const d2 = d1 + randInt(2, 4, rng);
    return buildChoiceProblem({
      question: `FASTEST WAY TO COMPARE ${num}/${d1} AND ${num}/${d2}:`,
      answer: 'Same top: smaller denominator is larger',
      distractors: [
        'Same top: larger denominator is larger',
        'Add the two denominators first',
        'Multiply the numerators together',
      ],
      archetype: 'FIRST_STEP_STRATEGY',
      rng,
    });
  }

  const den = pick([7, 9, 11, 12], rng);
  const n1 = randInt(2, den - 3, rng);
  const n2 = n1 + randInt(1, 2, rng);
  return buildChoiceProblem({
    question: `FASTEST WAY TO COMPARE ${n1}/${den} AND ${n2}/${den}:`,
    answer: 'Same bottom: larger numerator is larger',
    distractors: [
      'Same bottom: smaller numerator is larger',
      'Find a new common denominator first',
      'Divide both numerators by 2',
    ],
    archetype: 'FIRST_STEP_STRATEGY',
    rng,
  });
};

// --- TIER 5 NEW TEMPLATES ---

const t5EffectOfChange: ConceptualGenerator = (rng = Math.random) => {
  const baseVol = pick([12, 18, 24, 30, 40], rng);
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `A PRISM HAS VOLUME ${baseVol}. IF YOU DOUBLE BOTH LENGTH AND WIDTH, VOLUME BECOMES...`,
      answer: `${baseVol * 4}`,
      distractors: [`${baseVol * 2}`, `${baseVol * 8}`, `${baseVol}`],
      archetype: 'EFFECT_OF_CHANGE',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `A PRISM HAS VOLUME ${baseVol}. IF YOU DOUBLE HEIGHT AND HALVE WIDTH, VOLUME...`,
    answer: 'Stays the same',
    distractors: ['Doubles', 'Halves', 'Becomes 4× as large'],
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const t5SpotTheGlitch: ConceptualGenerator = (rng = Math.random) => {
  const pairs: Array<{ n1: number; d1: number; n2: number; d2: number }> = [
    { n1: 1, d1: 2, n2: 1, d2: 4 },
    { n1: 1, d1: 3, n2: 1, d2: 6 },
    { n1: 2, d1: 3, n2: 1, d2: 6 },
    { n1: 1, d1: 4, n2: 1, d2: 8 },
    { n1: 3, d1: 4, n2: 1, d2: 8 },
    { n1: 2, d1: 5, n2: 1, d2: 10 },
  ];
  const { n1, d1, n2, d2 } = pick(pairs, rng);
  const k = d2 / d1;
  const scaledN1 = n1 * k;

  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `SPOT THE GLITCH IN ${n1}/${d1} + ${n2}/${d2}:`,
      promptLines: [
        `Step 1: Rewrite ${n1}/${d1} as ${n1}/${d2}`,
        `Step 2: Add numerators: ${n1} + ${n2} = ${n1 + n2}`,
        `Step 3: Result = ${n1 + n2}/${d2}`,
      ],
      answer: 'Step 1',
      distractors: ['Step 2', 'Step 3'],
      archetype: 'SPOT_THE_GLITCH',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `SPOT THE GLITCH IN ${n1}/${d1} + ${n2}/${d2}:`,
    promptLines: [
      `Step 1: Rewrite ${n1}/${d1} as ${scaledN1}/${d2}`,
      `Step 2: Add tops and bottoms: (${scaledN1}+${n2})/(${d2}+${d2})`,
      `Step 3: Result = ${scaledN1 + n2}/${d2 * 2}`,
    ],
    answer: 'Step 2',
    distractors: ['Step 1', 'Step 3'],
    archetype: 'SPOT_THE_GLITCH',
    rng,
  });
};

const t5EquivalenceStructure: ConceptualGenerator = (rng = Math.random) => {
  const cases = [
    { expr: '1/2 + 1/4', answer: '2/4 + 1/4', distractors: ['1/4 + 1/4', '2/2 + 1/4', '1/6 + 1/6'] },
    { expr: '1/3 + 1/6', answer: '2/6 + 1/6', distractors: ['1/6 + 1/6', '3/6 + 1/6', '2/9 + 1/9'] },
    { expr: '2/3 + 1/6', answer: '4/6 + 1/6', distractors: ['2/6 + 1/6', '3/6 + 1/6', '2/9 + 1/9'] },
    { expr: '1/2 + 1/6', answer: '3/6 + 1/6', distractors: ['1/6 + 1/6', '2/6 + 1/6', '1/8 + 1/8'] },
    { expr: '3/4 + 1/8', answer: '6/8 + 1/8', distractors: ['3/8 + 1/8', '4/8 + 1/8', '3/12 + 1/12'] },
    { expr: '2/5 + 3/10', answer: '4/10 + 3/10', distractors: ['2/10 + 3/10', '5/10 + 3/10', '2/15 + 3/15'] },
  ];
  const chosen = pick(cases, rng);
  return buildChoiceProblem({
    question: `WHICH REWRITE EQUALS ${chosen.expr}?`,
    answer: chosen.answer,
    distractors: chosen.distractors,
    archetype: 'EQUIVALENCE_STRUCTURE',
    rng,
  });
};

// --- TIER 6 NEW TEMPLATES ---

const t6EffectOfChange: ConceptualGenerator = (rng = Math.random) => {
  const whole = randInt(1, 9, rng);
  const tenths = randInt(1, 9, rng);
  const numStr = `${whole}.${tenths}`;
  const cases = [
    {
      op: '× 10',
      answer: '1 place right',
      distractors: ['1 place left', '2 places right', 'Does not move'],
    },
    {
      op: '× 100',
      answer: '2 places right',
      distractors: ['1 place right', '2 places left', 'Does not move'],
    },
    {
      op: '÷ 10',
      answer: '1 place left',
      distractors: ['1 place right', '2 places left', 'Does not move'],
    },
    {
      op: '÷ 100',
      answer: '2 places left',
      distractors: ['1 place left', '2 places right', 'Does not move'],
    },
  ];
  const chosen = pick(cases, rng);
  return buildChoiceProblem({
    question: `FOR ${numStr} ${chosen.op}, THE DECIMAL POINT SHIFTS...`,
    answer: chosen.answer,
    distractors: chosen.distractors,
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const t6EquivalenceStructure: ConceptualGenerator = (rng = Math.random) => {
  const cases = [
    { dec: '0.25', answer: '1/4', distractors: ['2/5', '1/25', '1/5'] },
    { dec: '0.75', answer: '3/4', distractors: ['7/5', '3/5', '7/10'] },
    { dec: '0.2', answer: '1/5', distractors: ['1/2', '2/5', '1/20'] },
    { dec: '0.4', answer: '2/5', distractors: ['1/4', '4/5', '1/40'] },
    { dec: '0.6', answer: '3/5', distractors: ['1/6', '6/100', '2/3'] },
    { dec: '0.5', answer: '1/2', distractors: ['1/5', '5/100', '2/5'] },
    { dec: '0.8', answer: '4/5', distractors: ['1/8', '8/100', '3/4'] },
  ];
  const chosen = pick(cases, rng);
  return buildChoiceProblem({
    question: `WHICH SIMPLIFIED FRACTION EQUALS ${chosen.dec}?`,
    answer: chosen.answer,
    distractors: chosen.distractors,
    archetype: 'EQUIVALENCE_STRUCTURE',
    rng,
  });
};

const t6FirstStepStrategy: ConceptualGenerator = (rng = Math.random) => {
  const a = `${randInt(2, 9, rng)}.${randInt(1, 9, rng)}`;
  const b = `0.${randInt(11, 89, rng)}`;
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `BEST FIRST MOVE FOR ${a} + ${b}:`,
      answer: 'Line up the decimal points vertically',
      distractors: [
        'Line up the rightmost digits',
        'Count total decimal places first',
        'Ignore the decimal points completely',
      ],
      archetype: 'FIRST_STEP_STRATEGY',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `HOW DO YOU PLACE THE DECIMAL IN ${a} × ${b}?`,
    answer: 'Count total decimal places in both factors',
    distractors: [
      'Line up the decimal points before multiplying',
      'Always keep 1 decimal place',
      'Move the decimal point 1 place right',
    ],
    archetype: 'FIRST_STEP_STRATEGY',
    rng,
  });
};

// --- TIER 7 NEW TEMPLATES ---

const t7EffectOfChange: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const pct = pick([15, 20, 25, 30], rng);
    return buildChoiceProblem({
      question: `IF A TOTAL DOUBLES, THEN ${pct}% OF THAT TOTAL...`,
      answer: 'Doubles',
      distractors: ['Stays the same', 'Halves', 'Becomes 4× as large'],
      archetype: 'EFFECT_OF_CHANGE',
      rng,
    });
  }

  const a = randInt(2, 5, rng);
  const b = randInt(3, 7, rng);
  const scale = pick([2, 3, 4], rng);
  return buildChoiceProblem({
    question: `IF YOU MULTIPLY BOTH TERMS OF ${a}:${b} BY ${scale}, THE UNIT RATE...`,
    answer: 'Stays the same',
    distractors: [
      `Becomes ${scale}× as large`,
      `Divides by ${scale}`,
      `Increases by ${scale}`,
    ],
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const t7SpotTheGlitch: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(2, 5, rng);
  const b = a + randInt(1, 4, rng);
  const addK = randInt(2, 5, rng);
  return buildChoiceProblem({
    question: `SPOT THE GLITCH MAKING AN EQUIVALENT RATIO TO ${a}:${b}:`,
    promptLines: [
      `Step 1: Start with ratio ${a}:${b}`,
      `Step 2: Add ${addK} to both terms: (${a}+${addK}):(${b}+${addK})`,
      `Step 3: Write equivalent ratio ${a + addK}:${b + addK}`,
    ],
    answer: 'Step 2',
    distractors: ['Step 1', 'Step 3'],
    archetype: 'SPOT_THE_GLITCH',
    rng,
  });
};

const t7FirstStepStrategy: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const pct = pick([15, 20, 30, 40], rng);
    const total = pick([60, 80, 120, 140, 240], rng);
    return buildChoiceProblem({
      question: `FASTEST MENTAL FIRST STEP FOR ${pct}% OF ${total}:`,
      answer: `Find 10% of ${total} first`,
      distractors: [
        `Divide ${total} by ${pct}`,
        `Add ${pct} to ${total}`,
        `Multiply ${total} by ${pct}`,
      ],
      archetype: 'FIRST_STEP_STRATEGY',
      rng,
    });
  }

  const qty = pick([4, 5, 6, 8], rng);
  const cost = qty * randInt(3, 7, rng);
  return buildChoiceProblem({
    question: `${qty} CORES COST $${cost}. BEST FIRST STEP TO FIND COST OF 7 CORES:`,
    answer: `Divide $${cost} by ${qty} to get unit rate`,
    distractors: [
      `Multiply $${cost} by ${qty}`,
      `Add 7 to $${cost}`,
      `Subtract ${qty} from $${cost}`,
    ],
    archetype: 'FIRST_STEP_STRATEGY',
    rng,
  });
};

// --- TIER 8 NEW TEMPLATES ---

const t8EffectOfChange: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(-8, 8, rng);
  const b = randInt(2, 9, rng);
  const branch = randInt(0, 2, rng);

  if (branch === 0) {
    return buildChoiceProblem({
      question: `ON A NUMBER LINE, SUBTRACTING (-${b}) FROM ${a} MOVES...`,
      answer: `${b} units right`,
      distractors: [`${b} units left`, `Stays at ${a}`, `${b * 2} units right`],
      archetype: 'EFFECT_OF_CHANGE',
      rng,
    });
  }

  if (branch === 1) {
    return buildChoiceProblem({
      question: `ON A NUMBER LINE, ADDING (-${b}) TO ${a} MOVES...`,
      answer: `${b} units left`,
      distractors: [`${b} units right`, `Stays at ${a}`, `${b * 2} units left`],
      archetype: 'EFFECT_OF_CHANGE',
      rng,
    });
  }

  const nonZero = pick([-7, -5, -3, 3, 5, 7], rng);
  return buildChoiceProblem({
    question: `MULTIPLYING ${nonZero} BY -1 ON A NUMBER LINE...`,
    answer: 'Reflects it across 0',
    distractors: ['Moves it 1 unit left', 'Moves it 1 unit right', 'Makes it 0'],
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const t8SpotTheGlitch: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(3, 12, rng);
  const b = randInt(2, 9, rng);
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `SPOT THE GLITCH IN ${a} - (-${b}):`,
      promptLines: [
        `Step 1: Rewrite ${a} - (-${b}) as ${a} - ${b}`,
        `Step 2: Subtract: ${a} - ${b} = ${a - b}`,
        `Step 3: Result = ${a - b}`,
      ],
      answer: 'Step 1',
      distractors: ['Step 2', 'Step 3'],
      archetype: 'SPOT_THE_GLITCH',
      rng,
    });
  }

  const big = randInt(7, 14, rng);
  const small = randInt(2, big - 2, rng);
  return buildChoiceProblem({
    question: `SPOT THE GLITCH IN -${big} + ${small}:`,
    promptLines: [
      `Step 1: Find difference of magnitudes: ${big} - ${small} = ${big - small}`,
      `Step 2: Keep positive sign because of +${small}`,
      `Step 3: Result = +${big - small}`,
    ],
    answer: 'Step 2',
    distractors: ['Step 1', 'Step 3'],
    archetype: 'SPOT_THE_GLITCH',
    rng,
  });
};

const t8EquivalenceStructure: ConceptualGenerator = (rng = Math.random) => {
  const a = pick([-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], rng);
  const b = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((v) => v !== Math.abs(a)), rng);
  const negA = -a;
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `WHICH EXPRESSION EQUALS ${a} - (-${b})?`,
      answer: `${a} + ${b}`,
      distractors: [`${a} - ${b}`, `${negA} - ${b}`, `${negA} + ${b}`],
      archetype: 'EQUIVALENCE_STRUCTURE',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `WHICH EXPRESSION EQUALS ${a} + (-${b})?`,
    answer: `${a} - ${b}`,
    distractors: [`${a} + ${b}`, `${negA} + ${b}`, `${negA} - ${b}`],
    archetype: 'EQUIVALENCE_STRUCTURE',
    rng,
  });
};

// --- TIER 9 NEW TEMPLATES ---

const t9EffectOfChange: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `IF x DOUBLES (x > 0), THEN x² BECOMES...`,
      answer: '4× as large',
      distractors: ['2× as large', 'Stays the same', '8× as large'],
      archetype: 'EFFECT_OF_CHANGE',
      rng,
    });
  }

  const k = randInt(2, 6, rng);
  const b = pick([3, 4, 5, 6, 7, 8, 9].filter((v) => v !== k), rng);
  return buildChoiceProblem({
    question: `IN ${k}x + ${b}, IF x INCREASES BY 1, THE VALUE...`,
    answer: `Increases by ${k}`,
    distractors: [
      `Increases by 1`,
      `Increases by ${b}`,
      `Increases by ${k + b}`,
    ],
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const t9BenchmarkCompare: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.6) {
    const a = randInt(1, 6, rng);
    return buildBenchmarkProblem({
      question: `COMPARE: ${a}²  _  2 × ${a}`,
      answer: compareNumbers(a * a, 2 * a),
    });
  }

  const a = randInt(1, 4, rng);
  return buildBenchmarkProblem({
    question: `COMPARE: ${a}³  _  3 × ${a}`,
    answer: compareNumbers(a * a * a, 3 * a),
  });
};

const t9MagnitudeEstimation: ConceptualGenerator = (rng = Math.random) => {
  const k = pick([4, 5, 6], rng);
  const roundX = pick([10, 20], rng);
  const x = roundX + pick([-1, 1], rng);
  const b = randInt(1, 3, rng);
  const est = k * roundX;

  return buildChoiceProblem({
    question: `IF x = ${x}, ESTIMATE ${k}x + ${b} (CLOSEST TO):`,
    answer: formatNumber(est),
    distractors: [
      formatNumber(est / 2),
      formatNumber(est * 2),
      formatNumber(est * 5),
    ],
    archetype: 'MAGNITUDE_ESTIMATION',
    rng,
  });
};

// --- TIER 10 NEW TEMPLATES ---

const t10EffectOfChange: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const k = pick([5, 10, 12], rng);
    return buildChoiceProblem({
      question: `IF YOU ADD +${k} TO EVERY NUMBER IN A DATA SET, THE RANGE...`,
      answer: 'Stays the same',
      distractors: [
        `Increases by ${k}`,
        `Decreases by ${k}`,
        `Doubles`,
      ],
      archetype: 'EFFECT_OF_CHANGE',
      rng,
    });
  }

  const outlier = pick([100, 200, 500], rng);
  return buildChoiceProblem({
    question: `REPLACING THE MAX OF {4, 6, 8, 10, 12} WITH ${outlier}: WHICH STAYS THE SAME?`,
    answer: 'Median',
    distractors: ['Mean', 'Range', 'Sum'],
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const t10BenchmarkCompare: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(2, 5, rng);
  const x = randInt(2, 6, rng);
  const b = randInt(1, 9, rng);
  const lhs = a * x + b;
  const delta = pick([-4, -2, 0, 2, 4], rng);
  const rhs = lhs + delta;

  return buildBenchmarkProblem({
    question: `WHEN x = ${x}, COMPARE: ${a}x + ${b}  _  ${rhs}`,
    answer: compareNumbers(lhs, rhs),
  });
};

const t10EquivalenceStructure: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(2, 6, rng);
  const b = randInt(3, 9, rng);
  const c = randInt(12, 28, rng);
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `WHICH EQUATION IS EQUIVALENT TO ${a}x + ${b} = ${c}?`,
      answer: `${a}x = ${c - b}`,
      distractors: [
        `${a}x = ${c + b}`,
        `x + ${b} = ${c}`,
        `${a}x = ${c * b}`,
      ],
      archetype: 'EQUIVALENCE_STRUCTURE',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `WHICH EQUATION IS EQUIVALENT TO ${a}x - ${b} = ${c}?`,
    answer: `${a}x = ${c + b}`,
    distractors: [
      `${a}x = ${c - b}`,
      `x - ${b} = ${c + a}`,
      `${a}x = ${c * b}`,
    ],
    archetype: 'EQUIVALENCE_STRUCTURE',
    rng,
  });
};

// --- TIER 11 NEW TEMPLATES ---

const t11EffectOfChange: ConceptualGenerator = (rng = Math.random) => {
  const branch = randInt(0, 2, rng);
  if (branch === 0) {
    return buildChoiceProblem({
      question: `IN SIMPLE INTEREST I = Prt, IF TIME t DOUBLES, INTEREST I...`,
      answer: 'Doubles',
      distractors: ['Stays the same', 'Halves', 'Becomes 4× as large'],
      archetype: 'EFFECT_OF_CHANGE',
      rng,
    });
  }

  if (branch === 1) {
    return buildChoiceProblem({
      question: `IN I = Prt, IF PRINCIPAL P DOUBLES AND TIME t HALVES, INTEREST I...`,
      answer: 'Stays the same',
      distractors: ['Doubles', 'Halves', 'Becomes 4× as large'],
      archetype: 'EFFECT_OF_CHANGE',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `IN I = Prt, IF BOTH RATE r AND TIME t DOUBLE, INTEREST I...`,
    answer: 'Becomes 4× as large',
    distractors: ['Doubles', 'Stays the same', 'Halves'],
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const t11BenchmarkCompare: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const k1 = randInt(2, 7, rng);
    const k2 = randInt(2, 7, rng);
    const x = randInt(3, 9, rng);
    return buildBenchmarkProblem({
      question: `AT x = ${x}, COMPARE: y = ${k1}x  _  y = ${k2}x`,
      answer: compareNumbers(k1 * x, k2 * x),
    });
  }

  const price = pick([40, 60, 80, 100], rng);
  const d1 = pick([10, 20, 25], rng);
  const d2 = pick([10, 20, 25], rng);
  return buildBenchmarkProblem({
    question: `COMPARE: $${price} AFTER ${d1}% OFF  _  $${price} AFTER ${d2}% OFF`,
    answer: compareNumbers(price * (100 - d1), price * (100 - d2)),
  });
};

const t11SpotTheGlitch: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const bill = pick([20, 40, 60, 80], rng);
    const pct = pick([15, 20], rng);
    return buildChoiceProblem({
      question: `SPOT THE GLITCH FINDING ${pct}% TIP ON $${bill}:`,
      promptLines: [
        `Step 1: Multiply $${bill} × ${pct} = $${bill * pct}`,
        `Step 2: Add tip to bill: $${bill} + $${bill * pct}`,
        `Step 3: Total = $${bill + bill * pct}`,
      ],
      answer: 'Step 1',
      distractors: ['Step 2', 'Step 3'],
      archetype: 'SPOT_THE_GLITCH',
      rng,
    });
  }

  const bill = pick([30, 50, 70, 90], rng);
  const tax = bill / 10;
  return buildChoiceProblem({
    question: `SPOT THE GLITCH ADDING 10% TAX TO $${bill}:`,
    promptLines: [
      `Step 1: Find 10% of $${bill} = $${tax}`,
      `Step 2: Subtract tax: $${bill} - $${tax}`,
      `Step 3: Total = $${bill - tax}`,
    ],
    answer: 'Step 2',
    distractors: ['Step 1', 'Step 3'],
    archetype: 'SPOT_THE_GLITCH',
    rng,
  });
};

// --- TIER 12 NEW TEMPLATES ---

const t12EffectOfChange: ConceptualGenerator = (rng = Math.random) => {
  const count = pick([3, 4, 5], rng);
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `IN A PRODUCT OF ${count} NONZERO RATIONALS, FLIPPING 1 SIGN...`,
      answer: 'Flips the sign of the product',
      distractors: [
        'Keeps the sign unchanged',
        'Always makes it positive',
        'Makes the product 0',
      ],
      archetype: 'EFFECT_OF_CHANGE',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `IN A PRODUCT OF ${count} NONZERO RATIONALS, FLIPPING 2 SIGNS...`,
    answer: 'Keeps the sign unchanged',
    distractors: [
      'Flips the sign of the product',
      'Always makes it negative',
      'Makes the product 0',
    ],
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const t12EquivalenceStructure: ConceptualGenerator = (rng = Math.random) => {
  const n1 = randInt(1, 5, rng);
  const d1 = randInt(n1 + 1, 7, rng);
  const secondFractionCandidates: Array<[number, number]> = [];
  for (let num = 2; num <= 5; num++) {
    for (let den = num + 1; den <= 8; den++) {
      if (n1 * den !== num * d1) {
        secondFractionCandidates.push([num, den]);
      }
    }
  }
  const [n2, d2] = pick(secondFractionCandidates, rng);
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `WHICH EXPRESSION EQUALS (${n1}/${d1}) ÷ (-${n2}/${d2})?`,
      answer: `(${n1}/${d1}) × (-${d2}/${n2})`,
      distractors: [
        `(${d1}/${n1}) × (-${n2}/${d2})`,
        `(${n1}/${d1}) × (${d2}/${n2})`,
        `(${n1}/${d1}) × (-${n2}/${d2})`,
      ],
      archetype: 'EQUIVALENCE_STRUCTURE',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `WHICH FRACTION IS NOT EQUIVALENT TO -(${n1}/${d1})?`,
    answer: `(-${n1})/(-${d1})`,
    distractors: [`(-${n1})/${d1}`, `${n1}/(-${d1})`, `-${n1}/${d1}`],
    archetype: 'EQUIVALENCE_STRUCTURE',
    rng,
  });
};

const t12FirstStepStrategy: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(2, 5, rng);
  const b = randInt(3, 7, rng);
  const c = randInt(2, 6, rng);
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `BEST FIRST MOVE FOR (-1/${a}) × (-1/${b}) × (1/${c}):`,
      answer: 'Count negatives to determine the final sign',
      distractors: [
        'Find a common denominator first',
        'Add all three denominators',
        'Flip the first fraction',
      ],
      archetype: 'FIRST_STEP_STRATEGY',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `BEST FIRST MOVE FOR (-${a}/${b}) ÷ (${c}/${b + 1}):`,
    answer: 'Multiply by the reciprocal of the second fraction',
    distractors: [
      'Flip the first fraction and multiply',
      'Divide numerators and add denominators',
      'Find a common denominator first',
    ],
    archetype: 'FIRST_STEP_STRATEGY',
    rng,
  });
};

// ============================================================================
// CROSS-TIER FOUNDATIONAL POOL (8 Grade-4+ Templates for Early Signal Sweeps)
// ============================================================================

const fEffectScale10: ConceptualGenerator = (rng = Math.random) => {
  const n = randInt(12, 95, rng);
  const factor = pick([10, 100], rng);
  return buildChoiceProblem({
    question: `IF YOU MULTIPLY ${n} BY ${factor}, ITS VALUE BECOMES...`,
    answer: `${factor}× as large`,
    distractors: [
      `${factor} more`,
      `1/${factor} as large`,
      'Stays the same',
    ],
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const fEffectAddendBalance: ConceptualGenerator = (rng = Math.random) => {
  const a = randInt(25, 85, rng);
  const b = randInt(25, 85, rng);
  const k = randInt(3, 12, rng);
  return buildChoiceProblem({
    question: `IN ${a} + ${b}, ADD ${k} TO ${a} AND SUBTRACT ${k} FROM ${b}. THE SUM...`,
    answer: 'Stays the same',
    distractors: [
      `Increases by ${k}`,
      `Decreases by ${k}`,
      `Increases by ${k * 2}`,
    ],
    archetype: 'EFFECT_OF_CHANGE',
    rng,
  });
};

const fEstRoundSum: ConceptualGenerator = (rng = Math.random) => {
  const t1 = randInt(2, 6, rng);
  const t2 = randInt(2, 5, rng);
  const a = t1 * 10 + pick([-2, -1, 1, 2], rng);
  const b = t2 * 10 + pick([-2, -1, 1, 2], rng);
  const est = (t1 + t2) * 10;
  return buildChoiceProblem({
    question: `ESTIMATE: ${a} + ${b} IS CLOSEST TO...`,
    answer: `${est}`,
    distractors: [`${est + 30}`, `${Math.max(10, est - 30)}`, `${est * 10}`],
    archetype: 'MAGNITUDE_ESTIMATION',
    rng,
  });
};

const fBenchThousand: ConceptualGenerator = (rng = Math.random) => {
  if (rng() < 0.5) {
    const a = pick([480, 495, 500, 515, 540], rng);
    const b = pick([480, 500, 505, 520], rng);
    return buildBenchmarkProblem({
      question: `COMPARE: ${a} + ${b}  _  1,000`,
      answer: compareNumbers(a + b, 1000),
    });
  }

  const a = pick([8, 10, 12, 15], rng);
  const b = pick([8, 10, 12], rng);
  return buildBenchmarkProblem({
    question: `COMPARE: ${a} × ${b}  _  100`,
    answer: compareNumbers(a * b, 100),
  });
};

const fEquivGrouping: ConceptualGenerator = (rng = Math.random) => {
  const pairs: Array<[number, number]> = [
    [17, 3],
    [26, 4],
    [38, 2],
    [45, 5],
    [64, 6],
    [72, 8],
  ];
  const [a, c] = pick(pairs, rng);
  const b = randInt(11, 29, rng);
  return buildChoiceProblem({
    question: `WHICH REGROUPING EQUALS (${a} + ${b}) + ${c}?`,
    answer: `(${a} + ${c}) + ${b}`,
    distractors: [
      `(${a} × ${c}) + ${b}`,
      `(${a} - ${c}) + ${b}`,
      `${a} + (${b} × ${c})`,
    ],
    archetype: 'EQUIVALENCE_STRUCTURE',
    rng,
  });
};

const fStrategyOperation: ConceptualGenerator = (rng = Math.random) => {
  const groups = randInt(4, 9, rng);
  const perGroup = randInt(6, 15, rng);
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `${groups} SQUADS EACH CARRY ${perGroup} CELLS. WHICH OPERATION FINDS THE TOTAL?`,
      answer: 'Multiply',
      distractors: ['Divide', 'Subtract', 'Add once'],
      archetype: 'FIRST_STEP_STRATEGY',
      rng,
    });
  }

  const total = groups * perGroup;
  return buildChoiceProblem({
    question: `${total} CELLS SPLIT EQUALLY AMONG ${groups} SQUADS. WHICH OPERATION FINDS EACH SHARE?`,
    answer: 'Divide',
    distractors: ['Multiply', 'Add', 'Subtract once'],
    archetype: 'FIRST_STEP_STRATEGY',
    rng,
  });
};

const fGlitchPlaceValue: ConceptualGenerator = (rng = Math.random) => {
  const hundreds = randInt(2, 6, rng);
  const tens = randInt(1, 5, rng);
  const base = hundreds * 100 + tens * 10;
  const ones = randInt(2, 8, rng);
  if (rng() < 0.5) {
    return buildChoiceProblem({
      question: `SPOT THE GLITCH IN ${base} + ${ones}:`,
      promptLines: [
        `Step 1: Line up ${ones} under the hundreds digit (${hundreds})`,
        `Step 2: Add hundreds: ${hundreds} + ${ones} = ${hundreds + ones}`,
        `Step 3: Result = ${(hundreds + ones) * 100 + tens * 10}`,
      ],
      answer: 'Step 1',
      distractors: ['Step 2', 'Step 3'],
      archetype: 'SPOT_THE_GLITCH',
      rng,
    });
  }

  return buildChoiceProblem({
    question: `SPOT THE GLITCH IN ${base} + ${ones}:`,
    promptLines: [
      `Step 1: Add ones: 0 + ${ones} = ${ones}`,
      `Step 2: Also add ${ones} to tens: ${tens} + ${ones} = ${tens + ones}`,
      `Step 3: Result = ${hundreds * 100 + (tens + ones) * 10 + ones}`,
    ],
    answer: 'Step 2',
    distractors: ['Step 1', 'Step 3'],
    archetype: 'SPOT_THE_GLITCH',
    rng,
  });
};

const fBenchHalfOfTotal: ConceptualGenerator = (rng = Math.random) => {
  const total = pick([40, 60, 80, 100, 120, 200], rng);
  const half = total / 2;
  const n = half + pick([-10, -5, 0, 5, 10], rng);
  return buildBenchmarkProblem({
    question: `COMPARE: ${n}  _  HALF OF ${total}`,
    answer: compareNumbers(n, half),
  });
};

// ============================================================================
// REGISTRY (Tiers 1-12, 6 Parameterized Generators per Tier = 72 + 8 Foundational = 80)
// ============================================================================

const TAGGED_CONCEPTUAL_GENERATORS: Record<number, readonly TaggedConceptualGenerator[]> = {
  1: [
    { id: 't1-mag-est', archetype: 'MAGNITUDE_ESTIMATION', generate: t1MagnitudeEstimation },
    { id: 't1-bench', archetype: 'BENCHMARK_COMPARE', generate: t1BenchmarkCompare },
    { id: 't1-glitch', archetype: 'SPOT_THE_GLITCH', generate: t1SpotTheGlitch },
    { id: 't1-effect', archetype: 'EFFECT_OF_CHANGE', generate: t1EffectOfChange },
    { id: 't1-equiv', archetype: 'EQUIVALENCE_STRUCTURE', generate: t1EquivalenceStructure },
    { id: 't1-first-step', archetype: 'FIRST_STEP_STRATEGY', generate: t1FirstStepStrategy },
  ],
  2: [
    { id: 't2-equiv', archetype: 'EQUIVALENCE_STRUCTURE', generate: t2EquivalenceStructure },
    { id: 't2-mag-est', archetype: 'MAGNITUDE_ESTIMATION', generate: t2MagnitudeEstimation },
    { id: 't2-glitch', archetype: 'SPOT_THE_GLITCH', generate: t2SpotTheGlitch },
    { id: 't2-effect', archetype: 'EFFECT_OF_CHANGE', generate: t2EffectOfChange },
    { id: 't2-bench', archetype: 'BENCHMARK_COMPARE', generate: t2BenchmarkCompare },
    { id: 't2-first-step', archetype: 'FIRST_STEP_STRATEGY', generate: t2FirstStepStrategy },
  ],
  3: [
    { id: 't3-mag-est', archetype: 'MAGNITUDE_ESTIMATION', generate: t3MagnitudeEstimation },
    { id: 't3-first-step', archetype: 'FIRST_STEP_STRATEGY', generate: t3FirstStepStrategy },
    { id: 't3-glitch', archetype: 'SPOT_THE_GLITCH', generate: t3SpotTheGlitch },
    { id: 't3-effect', archetype: 'EFFECT_OF_CHANGE', generate: t3EffectOfChange },
    { id: 't3-bench', archetype: 'BENCHMARK_COMPARE', generate: t3BenchmarkCompare },
    { id: 't3-equiv', archetype: 'EQUIVALENCE_STRUCTURE', generate: t3EquivalenceStructure },
  ],
  4: [
    { id: 't4-bench', archetype: 'BENCHMARK_COMPARE', generate: t4BenchmarkCompare },
    { id: 't4-equiv', archetype: 'EQUIVALENCE_STRUCTURE', generate: t4EquivalenceStructure },
    { id: 't4-glitch', archetype: 'SPOT_THE_GLITCH', generate: t4SpotTheGlitch },
    { id: 't4-effect', archetype: 'EFFECT_OF_CHANGE', generate: t4EffectOfChange },
    { id: 't4-mag-est', archetype: 'MAGNITUDE_ESTIMATION', generate: t4MagnitudeEstimation },
    { id: 't4-first-step', archetype: 'FIRST_STEP_STRATEGY', generate: t4FirstStepStrategy },
  ],
  5: [
    { id: 't5-bench', archetype: 'BENCHMARK_COMPARE', generate: t5BenchmarkCompare },
    { id: 't5-first-step', archetype: 'FIRST_STEP_STRATEGY', generate: t5FirstStepStrategy },
    { id: 't5-mag-est', archetype: 'MAGNITUDE_ESTIMATION', generate: t5MagnitudeEstimation },
    { id: 't5-effect', archetype: 'EFFECT_OF_CHANGE', generate: t5EffectOfChange },
    { id: 't5-glitch', archetype: 'SPOT_THE_GLITCH', generate: t5SpotTheGlitch },
    { id: 't5-equiv', archetype: 'EQUIVALENCE_STRUCTURE', generate: t5EquivalenceStructure },
  ],
  6: [
    { id: 't6-mag-est', archetype: 'MAGNITUDE_ESTIMATION', generate: t6MagnitudeEstimation },
    { id: 't6-bench', archetype: 'BENCHMARK_COMPARE', generate: t6BenchmarkCompare },
    { id: 't6-glitch', archetype: 'SPOT_THE_GLITCH', generate: t6SpotTheGlitch },
    { id: 't6-effect', archetype: 'EFFECT_OF_CHANGE', generate: t6EffectOfChange },
    { id: 't6-equiv', archetype: 'EQUIVALENCE_STRUCTURE', generate: t6EquivalenceStructure },
    { id: 't6-first-step', archetype: 'FIRST_STEP_STRATEGY', generate: t6FirstStepStrategy },
  ],
  7: [
    { id: 't7-bench', archetype: 'BENCHMARK_COMPARE', generate: t7BenchmarkCompare },
    { id: 't7-mag-est', archetype: 'MAGNITUDE_ESTIMATION', generate: t7MagnitudeEstimation },
    { id: 't7-equiv', archetype: 'EQUIVALENCE_STRUCTURE', generate: t7EquivalenceStructure },
    { id: 't7-effect', archetype: 'EFFECT_OF_CHANGE', generate: t7EffectOfChange },
    { id: 't7-glitch', archetype: 'SPOT_THE_GLITCH', generate: t7SpotTheGlitch },
    { id: 't7-first-step', archetype: 'FIRST_STEP_STRATEGY', generate: t7FirstStepStrategy },
  ],
  8: [
    { id: 't8-sign', archetype: 'SIGN_PREDICTION', generate: t8SignPrediction },
    { id: 't8-quadrant', archetype: 'VISUAL_QUADRANT', generate: t8VisualQuadrant },
    { id: 't8-bench', archetype: 'BENCHMARK_COMPARE', generate: t8BenchmarkCompare },
    { id: 't8-effect', archetype: 'EFFECT_OF_CHANGE', generate: t8EffectOfChange },
    { id: 't8-glitch', archetype: 'SPOT_THE_GLITCH', generate: t8SpotTheGlitch },
    { id: 't8-equiv', archetype: 'EQUIVALENCE_STRUCTURE', generate: t8EquivalenceStructure },
  ],
  9: [
    { id: 't9-first-step', archetype: 'FIRST_STEP_STRATEGY', generate: t9FirstStepStrategy },
    { id: 't9-glitch', archetype: 'SPOT_THE_GLITCH', generate: t9SpotTheGlitch },
    { id: 't9-equiv', archetype: 'EQUIVALENCE_STRUCTURE', generate: t9EquivalenceStructure },
    { id: 't9-effect', archetype: 'EFFECT_OF_CHANGE', generate: t9EffectOfChange },
    { id: 't9-bench', archetype: 'BENCHMARK_COMPARE', generate: t9BenchmarkCompare },
    { id: 't9-mag-est', archetype: 'MAGNITUDE_ESTIMATION', generate: t9MagnitudeEstimation },
  ],
  10: [
    { id: 't10-first-step', archetype: 'FIRST_STEP_STRATEGY', generate: t10FirstStepStrategy },
    { id: 't10-glitch', archetype: 'SPOT_THE_GLITCH', generate: t10SpotTheGlitch },
    { id: 't10-quadrant', archetype: 'VISUAL_QUADRANT', generate: t10VisualQuadrant },
    { id: 't10-effect', archetype: 'EFFECT_OF_CHANGE', generate: t10EffectOfChange },
    { id: 't10-bench', archetype: 'BENCHMARK_COMPARE', generate: t10BenchmarkCompare },
    { id: 't10-equiv', archetype: 'EQUIVALENCE_STRUCTURE', generate: t10EquivalenceStructure },
  ],
  11: [
    { id: 't11-quadrant', archetype: 'VISUAL_QUADRANT', generate: t11VisualQuadrant },
    { id: 't11-mag-est', archetype: 'MAGNITUDE_ESTIMATION', generate: t11MagnitudeEstimation },
    { id: 't11-equiv', archetype: 'EQUIVALENCE_STRUCTURE', generate: t11EquivalenceStructure },
    { id: 't11-effect', archetype: 'EFFECT_OF_CHANGE', generate: t11EffectOfChange },
    { id: 't11-bench', archetype: 'BENCHMARK_COMPARE', generate: t11BenchmarkCompare },
    { id: 't11-glitch', archetype: 'SPOT_THE_GLITCH', generate: t11SpotTheGlitch },
  ],
  12: [
    { id: 't12-sign', archetype: 'SIGN_PREDICTION', generate: t12SignPrediction },
    { id: 't12-glitch', archetype: 'SPOT_THE_GLITCH', generate: t12SpotTheGlitch },
    { id: 't12-bench', archetype: 'BENCHMARK_COMPARE', generate: t12BenchmarkCompare },
    { id: 't12-effect', archetype: 'EFFECT_OF_CHANGE', generate: t12EffectOfChange },
    { id: 't12-equiv', archetype: 'EQUIVALENCE_STRUCTURE', generate: t12EquivalenceStructure },
    { id: 't12-first-step', archetype: 'FIRST_STEP_STRATEGY', generate: t12FirstStepStrategy },
  ],
};

export const FOUNDATIONAL_TAGGED_GENERATORS: readonly TaggedConceptualGenerator[] = [
  { id: 'f-effect-scale10', archetype: 'EFFECT_OF_CHANGE', generate: fEffectScale10 },
  { id: 'f-effect-balance', archetype: 'EFFECT_OF_CHANGE', generate: fEffectAddendBalance },
  { id: 'f-mag-est-sum', archetype: 'MAGNITUDE_ESTIMATION', generate: fEstRoundSum },
  { id: 'f-bench-1000', archetype: 'BENCHMARK_COMPARE', generate: fBenchThousand },
  { id: 'f-equiv-group', archetype: 'EQUIVALENCE_STRUCTURE', generate: fEquivGrouping },
  { id: 'f-first-step-op', archetype: 'FIRST_STEP_STRATEGY', generate: fStrategyOperation },
  { id: 'f-glitch-place', archetype: 'SPOT_THE_GLITCH', generate: fGlitchPlaceValue },
  { id: 'f-bench-half', archetype: 'BENCHMARK_COMPARE', generate: fBenchHalfOfTotal },
];

export const FOUNDATIONAL_CONCEPTUAL_GENERATORS: readonly ConceptualGenerator[] =
  FOUNDATIONAL_TAGGED_GENERATORS.map((entry) => entry.generate);

export function getFoundationalConceptualGenerators(): readonly TaggedConceptualGenerator[] {
  return FOUNDATIONAL_TAGGED_GENERATORS;
}

export function getTaggedConceptualGeneratorsForTier(
  tier: number
): readonly TaggedConceptualGenerator[] {
  const safeTier = clampTier(tier);
  return TAGGED_CONCEPTUAL_GENERATORS[safeTier] || TAGGED_CONCEPTUAL_GENERATORS[1];
}

export const CONCEPTUAL_GENERATORS: Record<number, readonly ConceptualGenerator[]> =
  Object.fromEntries(
    Object.entries(TAGGED_CONCEPTUAL_GENERATORS).map(([tier, entries]) => [
      Number(tier),
      entries.map((entry) => entry.generate),
    ])
  );

export function getConceptualArchetypesForTier(tier: number): readonly ConceptualArchetype[] {
  const safeTier = clampTier(tier);
  const tierEntries = TAGGED_CONCEPTUAL_GENERATORS[safeTier] || TAGGED_CONCEPTUAL_GENERATORS[1];
  return tierEntries.map((entry) => entry.archetype);
}

export interface ConceptualGenerationOptions {
  archetype?: ConceptualArchetype;
  rng?: () => number;
  excludeQuestions?: ReadonlySet<string>;
  excludeTemplateIds?: ReadonlySet<string>;
  excludeArchetypes?: ReadonlySet<ConceptualArchetype>;
  conceptSchedule?: ConceptScheduleMap;
  conceptStepCounter?: number;
  includeFoundational?: boolean;
}

interface SlottedGenerator {
  slotTier: number;
  entry: TaggedConceptualGenerator;
}

const MAX_QUESTION_DEDUP_RETRIES = 8;

export function generateConceptualProblem(
  tier: number,
  type: Exclude<ProblemType, 'ATTACK'> = 'MEDITATION',
  options?: ConceptualGenerationOptions
): MathProblem {
  const safeTier = clampTier(tier);
  const rng = options?.rng ?? Math.random;
  const tierEntries = TAGGED_CONCEPTUAL_GENERATORS[safeTier] || TAGGED_CONCEPTUAL_GENERATORS[1];

  const allCandidates: SlottedGenerator[] = tierEntries.map((entry) => ({
    slotTier: safeTier,
    entry,
  }));
  if (options?.includeFoundational) {
    for (const entry of FOUNDATIONAL_TAGGED_GENERATORS) {
      allCandidates.push({ slotTier: 0, entry });
    }
  }

  const excludeTemplateIds = options?.excludeTemplateIds;
  const excludeArchetypes = options?.excludeArchetypes;
  const excludeQuestions = options?.excludeQuestions;

  const filterByTemplateId = (pool: readonly SlottedGenerator[]): SlottedGenerator[] => {
    if (!excludeTemplateIds || excludeTemplateIds.size === 0) return [...pool];
    const filtered = pool.filter((item) => !excludeTemplateIds.has(item.entry.id));
    return filtered.length > 0 ? filtered : [...pool];
  };

  let pool: SlottedGenerator[];

  if (options?.archetype) {
    const byArchetype = allCandidates.filter((item) => item.entry.archetype === options.archetype);
    pool = filterByTemplateId(byArchetype.length > 0 ? byArchetype : allCandidates);
  } else if (options?.conceptSchedule) {
    const templateEligible = filterByTemplateId(allCandidates);
    const slotMap = new Map<string, ConceptSlot>();
    for (const item of templateEligible) {
      const key = `${item.slotTier}:${item.entry.archetype}`;
      if (!slotMap.has(key)) {
        slotMap.set(key, { tier: item.slotTier, archetype: item.entry.archetype });
      }
    }
    const selectedSlot = selectWeightedConceptSlot(
      Array.from(slotMap.values()),
      options.conceptSchedule,
      options.conceptStepCounter ?? 0,
      { excludeArchetypes, rng }
    );
    if (selectedSlot) {
      const matched = templateEligible.filter(
        (item) =>
          item.slotTier === selectedSlot.tier && item.entry.archetype === selectedSlot.archetype
      );
      pool = matched.length > 0 ? matched : templateEligible;
    } else {
      pool = templateEligible;
    }
  } else {
    // Graceful anti-repeat cascade:
    // 1) Exclude both archetypes and templateIds
    // 2) Relax archetype exclusion (keep templateIds)
    // 3) Relax templateId exclusion (keep archetypes)
    // 4) Full pool fallback
    const noArchNoTpl = allCandidates.filter(
      (item) =>
        !(excludeArchetypes && excludeArchetypes.has(item.entry.archetype)) &&
        !(excludeTemplateIds && excludeTemplateIds.has(item.entry.id))
    );
    if (noArchNoTpl.length > 0) {
      pool = noArchNoTpl;
    } else {
      const noTpl = allCandidates.filter(
        (item) => !(excludeTemplateIds && excludeTemplateIds.has(item.entry.id))
      );
      if (noTpl.length > 0) {
        pool = noTpl;
      } else {
        const noArch = allCandidates.filter(
          (item) => !(excludeArchetypes && excludeArchetypes.has(item.entry.archetype))
        );
        pool = noArch.length > 0 ? noArch : allCandidates;
      }
    }
  }

  let selected = pick(pool, rng).entry;
  let generated = selected.generate(rng);

  if (excludeQuestions && excludeQuestions.size > 0) {
    let retries = 0;
    while (excludeQuestions.has(generated.question) && retries < MAX_QUESTION_DEDUP_RETRIES) {
      selected = pick(pool, rng).entry;
      generated = selected.generate(rng);
      retries += 1;
    }
  }

  return {
    ...generated,
    type,
    category: 'CONCEPTUAL',
    templateId: selected.id,
  };
}
