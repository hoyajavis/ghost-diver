import { ConceptualArchetype, MathProblem, ProblemType } from '../../types';
import { clampTier } from '../dungeonLogic';

export type ConceptualGenerator = (rng?: () => number) => Omit<MathProblem, 'type'>;

interface TaggedConceptualGenerator {
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
// REGISTRY (Tiers 1-12, 3 Parameterized Generators per Tier = 36 Generators)
// ============================================================================

const TAGGED_CONCEPTUAL_GENERATORS: Record<number, readonly TaggedConceptualGenerator[]> = {
  1: [
    { archetype: 'MAGNITUDE_ESTIMATION', generate: t1MagnitudeEstimation },
    { archetype: 'BENCHMARK_COMPARE', generate: t1BenchmarkCompare },
    { archetype: 'SPOT_THE_GLITCH', generate: t1SpotTheGlitch },
  ],
  2: [
    { archetype: 'EQUIVALENCE_STRUCTURE', generate: t2EquivalenceStructure },
    { archetype: 'MAGNITUDE_ESTIMATION', generate: t2MagnitudeEstimation },
    { archetype: 'SPOT_THE_GLITCH', generate: t2SpotTheGlitch },
  ],
  3: [
    { archetype: 'MAGNITUDE_ESTIMATION', generate: t3MagnitudeEstimation },
    { archetype: 'FIRST_STEP_STRATEGY', generate: t3FirstStepStrategy },
    { archetype: 'SPOT_THE_GLITCH', generate: t3SpotTheGlitch },
  ],
  4: [
    { archetype: 'BENCHMARK_COMPARE', generate: t4BenchmarkCompare },
    { archetype: 'EQUIVALENCE_STRUCTURE', generate: t4EquivalenceStructure },
    { archetype: 'SPOT_THE_GLITCH', generate: t4SpotTheGlitch },
  ],
  5: [
    { archetype: 'BENCHMARK_COMPARE', generate: t5BenchmarkCompare },
    { archetype: 'FIRST_STEP_STRATEGY', generate: t5FirstStepStrategy },
    { archetype: 'MAGNITUDE_ESTIMATION', generate: t5MagnitudeEstimation },
  ],
  6: [
    { archetype: 'MAGNITUDE_ESTIMATION', generate: t6MagnitudeEstimation },
    { archetype: 'BENCHMARK_COMPARE', generate: t6BenchmarkCompare },
    { archetype: 'SPOT_THE_GLITCH', generate: t6SpotTheGlitch },
  ],
  7: [
    { archetype: 'BENCHMARK_COMPARE', generate: t7BenchmarkCompare },
    { archetype: 'MAGNITUDE_ESTIMATION', generate: t7MagnitudeEstimation },
    { archetype: 'EQUIVALENCE_STRUCTURE', generate: t7EquivalenceStructure },
  ],
  8: [
    { archetype: 'SIGN_PREDICTION', generate: t8SignPrediction },
    { archetype: 'VISUAL_QUADRANT', generate: t8VisualQuadrant },
    { archetype: 'BENCHMARK_COMPARE', generate: t8BenchmarkCompare },
  ],
  9: [
    { archetype: 'FIRST_STEP_STRATEGY', generate: t9FirstStepStrategy },
    { archetype: 'SPOT_THE_GLITCH', generate: t9SpotTheGlitch },
    { archetype: 'EQUIVALENCE_STRUCTURE', generate: t9EquivalenceStructure },
  ],
  10: [
    { archetype: 'FIRST_STEP_STRATEGY', generate: t10FirstStepStrategy },
    { archetype: 'SPOT_THE_GLITCH', generate: t10SpotTheGlitch },
    { archetype: 'VISUAL_QUADRANT', generate: t10VisualQuadrant },
  ],
  11: [
    { archetype: 'VISUAL_QUADRANT', generate: t11VisualQuadrant },
    { archetype: 'MAGNITUDE_ESTIMATION', generate: t11MagnitudeEstimation },
    { archetype: 'EQUIVALENCE_STRUCTURE', generate: t11EquivalenceStructure },
  ],
  12: [
    { archetype: 'SIGN_PREDICTION', generate: t12SignPrediction },
    { archetype: 'SPOT_THE_GLITCH', generate: t12SpotTheGlitch },
    { archetype: 'BENCHMARK_COMPARE', generate: t12BenchmarkCompare },
  ],
};

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

export function generateConceptualProblem(
  tier: number,
  type: Exclude<ProblemType, 'ATTACK'> = 'MEDITATION',
  options?: { archetype?: ConceptualArchetype; rng?: () => number }
): MathProblem {
  const safeTier = clampTier(tier);
  const rng = options?.rng ?? Math.random;
  const tierEntries = TAGGED_CONCEPTUAL_GENERATORS[safeTier] || TAGGED_CONCEPTUAL_GENERATORS[1];

  const pool = options?.archetype
    ? tierEntries.filter((entry) => entry.archetype === options.archetype)
    : tierEntries;
  const selected = pick(pool.length > 0 ? pool : tierEntries, rng);

  return {
    ...selected.generate(rng),
    type,
    category: 'CONCEPTUAL',
  };
}
