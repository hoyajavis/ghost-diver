import { ProblemGenerator } from '../mathGenerators';

const FRIENDLY_DENOMINATORS = [2, 3, 4, 5, 6, 8, 10, 12] as const;

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
};

const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

const pickRandom = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

const FRIENDLY_DISTINCT_PAIRS: ReadonlyArray<readonly [number, number]> = (() => {
  const pairs: Array<[number, number]> = [];
  for (const d1 of FRIENDLY_DENOMINATORS) {
    for (const d2 of FRIENDLY_DENOMINATORS) {
      if (d1 !== d2 && lcm(d1, d2) <= 24) {
        pairs.push([d1, d2]);
      }
    }
  }
  return pairs;
})();

export const arithmeticGenerators: Record<number, Record<number, ProblemGenerator>> = {
  1: {
    // Floor 1: Base-10 Place Value shifts (Multiplying/Dividing by 10, 100, 1000)
    1: () => {
      const base = Math.floor(Math.random() * 90) + 10; // 10 to 99
      const powers = [10, 100, 1000];
      const power = powers[Math.floor(Math.random() * powers.length)];
      const isMultiply = Math.random() > 0.5;
      const numZeros = Math.log10(power);
      
      if (isMultiply) {
        return {
          question: `PLACE VALUE: ${base} * ${power}`,
          answer: base * power,
          complexity: 'QUICK',
          steps: [
            { prompt: `IDENTIFY BASE IN ${base} * ${power}`, answer: base },
            { prompt: `COUNT ZEROS IN ${power}`, answer: numZeros },
            { prompt: `SHIFT DIGITS LEFT ${numZeros} PLACES`, answer: base * power }
          ]
        };
      } else {
        const dividend = base * power;
        return {
          question: `PLACE VALUE: ${dividend} / ${power}`,
          answer: base,
          complexity: 'QUICK',
          steps: [
            { prompt: `IDENTIFY DIVIDEND IN ${dividend} / ${power}`, answer: dividend },
            { prompt: `COUNT ZEROS IN ${power}`, answer: numZeros },
            { prompt: `SHIFT DIGITS RIGHT ${numZeros} PLACES`, answer: base }
          ]
        };
      }
    },
    // Floor 2: Rounding whole numbers to the nearest 10, 100, or 1000
    2: () => {
      const places = [10, 100, 1000];
      const place = places[Math.floor(Math.random() * places.length)];
      // Generate a number that is somewhat close to a rounding boundary
      const base = Math.floor(Math.random() * 9) + 1;
      const offset = Math.floor(Math.random() * place);
      const num = (base * place) + offset;
      
      const answer = Math.round(num / place) * place;
      
      return {
        question: `APPROXIMATE: Round ${num} to nearest ${place}`,
        answer: answer,
        complexity: 'QUICK',
        steps: [
          { prompt: `IDENTIFY TARGET DIGIT (${place}s) IN ${num}`, answer: Math.floor((num % (place * 10)) / place) },
          { prompt: `CHECK NEXT DIGIT IN ${num}`, answer: Math.floor((num % place) / (place / 10)) },
          { prompt: `EXECUTE ROUNDING ON ${num}`, answer: answer }
        ]
      };
    },
    // Floor 3: Multi-digit integer Addition (Mental-friendly compatible or compensation pairs)
    3: () => {
      const useCompensation = Math.random() > 0.5;
      if (useCompensation) {
        const roundedB = pickRandom([200, 300, 400]);
        const offset = pickRandom([1, 2, 5, 10]);
        const b1 = roundedB - offset;
        const a1 = (Math.floor(Math.random() * 46) + 12) * 10 + pickRandom([0, 5]); // 120 to 575
        const sum = a1 + b1;

        return {
          question: `COMPILE: ${a1} + ${b1}`,
          answer: sum,
          complexity: 'COMBO',
          steps: [
            { prompt: `ROUND ADDEND: ${b1} -> ?`, answer: roundedB },
            { prompt: `ADD ROUNDED: ${a1} + ${roundedB}`, answer: a1 + roundedB },
            { prompt: `SUBTRACT OVERSHOOT: ${a1 + roundedB} - ${offset}`, answer: sum }
          ]
        };
      } else {
        const hundredsA = (Math.floor(Math.random() * 6) + 1) * 100; // 100 to 600
        const hundredsB = (Math.floor(Math.random() * 4) + 1) * 100; // 100 to 400
        const tailPool = Math.random() > 0.5 ? [10, 20, 30, 40, 50, 60, 70, 80] : [25, 50, 75];
        const remA = pickRandom(tailPool);
        const remB = pickRandom(tailPool);
        const a1 = hundredsA + remA;
        const b1 = hundredsB + remB;
        const sum = a1 + b1;

        return {
          question: `COMPILE: ${a1} + ${b1}`,
          answer: sum,
          complexity: 'COMBO',
          steps: [
            { prompt: `ADD HUNDREDS: ${hundredsA} + ${hundredsB}`, answer: hundredsA + hundredsB },
            { prompt: `ADD REMAINING: ${remA} + ${remB}`, answer: remA + remB },
            { prompt: `SUM COMPONENTS: (${hundredsA + hundredsB} + ${remA + remB})`, answer: sum }
          ]
        };
      }
    },
    // Floor 4: Multi-digit integer Subtraction (Mental-friendly compensation, guaranteed non-negative intermediates)
    4: () => {
      const roundedB = pickRandom([100, 200, 300, 400]);
      const overshot = pickRandom([1, 2, 5, 10, 15, 20, 25]);
      const b1 = roundedB - overshot;
      const extra =
        pickRandom([20, 25, 30, 40, 50, 60, 75, 100, 120, 150, 200, 250, 300]) +
        pickRandom([0, 5, 10, 15]);
      const a1 = Math.min(995, roundedB + extra);
      const diff = a1 - b1;
      const partialDiff = a1 - roundedB;
      
      return {
        question: `DECOMPILE: ${a1} - ${b1}`,
        answer: diff,
        complexity: 'COMBO',
        steps: [
          { prompt: `ROUND SUBTRAHEND: ${b1} -> ?`, answer: roundedB },
          { prompt: `SUBTRACT ROUNDED: ${a1} - ${roundedB}`, answer: partialDiff },
          { prompt: `ADD OVERSHOOT: ${partialDiff} + ${overshot}`, answer: diff }
        ]
      };
    }
  },
  2: {
    // Floor 6: 2-digit by 1-digit Multiplication
    1: () => {
      const a2 = Math.floor(Math.random() * 90) + 10; // 10 to 99
      const b2 = Math.floor(Math.random() * 8) + 2; // 2 to 9
      const tensA = Math.floor(a2 / 10) * 10;
      const onesA = a2 % 10;
      
      return { 
        question: `COMPILE: ${a2} * ${b2}`, 
        answer: a2 * b2,
        complexity: 'COMBO',
        steps: [
          { prompt: `MULTIPLY TENS: ${tensA} * ${b2}`, answer: tensA * b2 },
          { prompt: `MULTIPLY ONES: ${onesA} * ${b2}`, answer: onesA * b2 },
          { prompt: `SUM COMPONENTS: (${tensA * b2} + ${onesA * b2})`, answer: a2 * b2 }
        ]
      };
    },
    // Floor 7: Identifying all Factors of a given number
    2: () => {
      // Pick a number with a reasonable amount of factors
      const targets = [12, 16, 18, 20, 24, 28, 30, 32, 36, 40];
      const target = targets[Math.floor(Math.random() * targets.length)];
      
      const factors: number[] = [];
      for (let i = 1; i <= target; i++) {
        if (target % i === 0) factors.push(i);
      }
      
      // Generate some distractors
      const distractors = new Set<number>();
      while (distractors.size < 4) {
        const d = Math.floor(Math.random() * (target - 2)) + 2;
        if (!factors.includes(d)) distractors.add(d);
      }
      
      const options = [...factors, ...Array.from(distractors)].sort((a, b) => a - b).map(String);
      const answerStr = factors.sort((a, b) => a - b).map(String).join(',');
      
      return {
        question: `IDENTIFY FACTORS OF ${target}`,
        answer: answerStr,
        complexity: 'QUICK',
        multiSelectOptions: options,
        steps: [
          { prompt: `FIND FACTOR PAIRS FOR ${target}`, answer: answerStr }
        ]
      };
    },
    // Floor 8: Identifying Multiples of a given number
    3: () => {
      const base = Math.floor(Math.random() * 7) + 3; // 3 to 9
      const multiples: number[] = [];
      for (let i = 1; i <= 4; i++) {
        multiples.push(base * i);
      }
      
      const distractors = new Set<number>();
      while (distractors.size < 4) {
        const d = (Math.floor(Math.random() * 8) + 1) * base + (Math.floor(Math.random() * 2) + 1); // Not a multiple
        if (!multiples.includes(d)) distractors.add(d);
      }
      
      const options = [...multiples, ...Array.from(distractors)].sort((a, b) => a - b).map(String);
      const answerStr = multiples.sort((a, b) => a - b).map(String).join(',');
      
      return {
        question: `IDENTIFY MULTIPLES OF ${base}`,
        answer: answerStr,
        complexity: 'QUICK',
        multiSelectOptions: options,
        steps: [
          { prompt: `FIND NUMBERS DIVISIBLE BY ${base}`, answer: answerStr }
        ]
      };
    },
    // Floor 9: Identifying Prime vs. Composite numbers
    4: () => {
      const isPrimeTarget = Math.random() > 0.5;
      const primes = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
      const composites = [12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28, 30];
      
      const target = isPrimeTarget 
        ? primes[Math.floor(Math.random() * primes.length)]
        : composites[Math.floor(Math.random() * composites.length)];
        
      return {
        question: `CLASSIFY ${target}`,
        answer: isPrimeTarget ? 'PRIME' : 'COMPOSITE',
        complexity: 'QUICK',
        choices: ['PRIME', 'COMPOSITE'],
        steps: [
          {
            prompt: `DOES ${target} HAVE FACTORS OTHER THAN 1 AND ITSELF?`,
            answer: isPrimeTarget ? 'NO' : 'YES',
            choices: ['YES', 'NO']
          },
          {
            prompt: `CLASSIFY ${target}`,
            answer: isPrimeTarget ? 'PRIME' : 'COMPOSITE',
            choices: ['PRIME', 'COMPOSITE']
          }
        ]
      };
    }
  },
  3: {
    // Floor 11: 2-digit by 2-digit Multiplication (Mental-friendly distributive or multiples of 10)
    1: () => {
      const useMultipleOfTen = Math.random() > 0.5;
      if (useMultipleOfTen) {
        const a3 = pickRandom([12, 14, 15, 16, 18, 22, 24, 25, 32, 35]);
        const b3 = pickRandom([20, 30, 40, 50]);
        const tensDigit = b3 / 10;
        const partial = a3 * tensDigit;

        return {
          question: `COMPILE: ${a3} * ${b3}`,
          answer: a3 * b3,
          complexity: 'COMBO',
          steps: [
            { prompt: `MULTIPLY BY TENS DIGIT: ${a3} * ${tensDigit}`, answer: partial },
            { prompt: `SHIFT PLACE VALUE (* 10): ${partial} * 10`, answer: a3 * b3 }
          ]
        };
      } else {
        const a3 = pickRandom([12, 13, 14, 15, 16, 18, 20, 24, 25]);
        const b3 = pickRandom([11, 12, 13, 14, 15]);
        const tensB = 10;
        const onesB = b3 % 10;

        return {
          question: `COMPILE: ${a3} * ${b3}`,
          answer: a3 * b3,
          complexity: 'COMBO',
          steps: [
            { prompt: `MULTIPLY BY ONES: ${a3} * ${onesB}`, answer: a3 * onesB },
            { prompt: `MULTIPLY BY TENS: ${a3} * ${tensB}`, answer: a3 * tensB },
            { prompt: `SUM COMPONENTS: (${a3 * onesB} + ${a3 * tensB})`, answer: a3 * b3 }
          ]
        };
      }
    },
    // Floor 12: Long Division (Crisp 2-digit mental-quotient division)
    2: () => {
      const divisor = Math.floor(Math.random() * 8) + 2; // 2 to 9
      const tensQ = Math.floor(Math.random() * 4) + 1; // 1 to 4
      const onesQ = Math.floor(Math.random() * 9) + 1; // 1 to 9
      const quotient = tensQ * 10 + onesQ; // 11 to 49
      const dividend = divisor * quotient;
      const tensChunk = tensQ * divisor * 10;
      
      return { 
        question: `DECOMPILE: ${dividend} / ${divisor}`, 
        answer: quotient,
        complexity: 'COMBO',
        steps: [
          { prompt: `FIND TENS DIGIT: ? * ${divisor * 10} <= ${dividend}`, answer: tensQ },
          { prompt: `FIND ONES DIGIT: (${dividend} - ${tensChunk}) / ${divisor}`, answer: onesQ },
          { prompt: `COMPILE QUOTIENT: ${tensQ * 10} + ${onesQ}`, answer: quotient }
        ]
      };
    },
    // Floor 13: Interpretation of remainders in word problems
    3: () => {
      const isRoundUp = Math.random() > 0.5;
      const perGroup = Math.floor(Math.random() * 5) + 4; // 4 to 8
      const fullGroups = Math.floor(Math.random() * 10) + 5; // 5 to 14
      const remainder = Math.floor(Math.random() * (perGroup - 1)) + 1; // 1 to perGroup - 1
      const total = fullGroups * perGroup + remainder;
      
      if (isRoundUp) {
        return {
          question: `ALLOCATE: ${total} bytes, ${perGroup} bytes/block. Blocks needed?`,
          answer: fullGroups + 1,
          complexity: 'COMBO',
          steps: [
            { prompt: `FIND FULL BLOCKS: ${total} / ${perGroup}`, answer: fullGroups },
            { prompt: `FIND REMAINDER: ${total} % ${perGroup}`, answer: remainder },
            { prompt: `ADD EXTRA BLOCK FOR REMAINDER: ${fullGroups} + 1`, answer: fullGroups + 1 }
          ]
        };
      } else {
        return {
          question: `PACK: ${total} bytes, ${perGroup} bytes/block. Full blocks?`,
          answer: fullGroups,
          complexity: 'COMBO',
          steps: [
            { prompt: `FIND FULL BLOCKS: ${total} / ${perGroup}`, answer: fullGroups },
            { prompt: `DROP REMAINDER (${remainder})`, answer: fullGroups }
          ]
        };
      }
    }
  },
  4: {
    // Floor 16: Generating Equivalent Fractions and simplifying to lowest terms
    1: () => {
      const multipliers = [2, 3, 4, 5];
      const m = multipliers[Math.floor(Math.random() * multipliers.length)];
      
      const coprimePairs = [
        { d: 3, n: [1, 2] },
        { d: 4, n: [1, 3] },
        { d: 5, n: [1, 2, 3, 4] },
        { d: 6, n: [1, 5] },
        { d: 8, n: [1, 3, 5, 7] },
        { d: 10, n: [1, 3, 7, 9] }
      ];
      const pair = coprimePairs[Math.floor(Math.random() * coprimePairs.length)];
      const d = pair.d;
      const n = pair.n[Math.floor(Math.random() * pair.n.length)];
      
      const bigN = n * m;
      const bigD = d * m;
      
      return {
        question: `SIMPLIFY: ${bigN}/${bigD}`,
        answer: `${n}/${d}`,
        complexity: 'COMBO',
        inputType: 'FRACTION',
        requireSimplified: true,
        steps: [
          { prompt: `FIND GREATEST COMMON DIVISOR OF ${bigN} AND ${bigD}`, answer: m },
          { prompt: `DIVIDE NUMERATOR: ${bigN} / ${m}`, answer: n },
          { prompt: `DIVIDE DENOMINATOR: ${bigD} / ${m}`, answer: d },
          { prompt: `WRITE SIMPLIFIED FRACTION`, answer: `${n}/${d}`, requireSimplified: true }
        ]
      };
    },
    // Floor 17: Comparing Fractions using symbols (<, >, =)
    2: () => {
      const [d1, d2] = pickRandom(FRIENDLY_DISTINCT_PAIRS);
      const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
      const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
      
      const commonD = lcm(d1, d2);
      const scale1 = commonD / d1;
      const scale2 = commonD / d2;
      const newN1 = n1 * scale1;
      const newN2 = n2 * scale2;
      
      let ans = '=';
      if (newN1 > newN2) ans = '>';
      else if (newN1 < newN2) ans = '<';
      
      return {
        question: `COMPARE: ${n1}/${d1} _ ${n2}/${d2}`,
        answer: ans,
        complexity: 'COMBO',
        inputType: 'RELATIONSHIP',
        steps: [
          { prompt: `FIND COMMON DENOMINATOR (LCM OF ${d1} AND ${d2})`, answer: commonD },
          { prompt: `CONVERT LEFT NUMERATOR: ${n1} * ${scale1}`, answer: newN1 },
          { prompt: `CONVERT RIGHT NUMERATOR: ${n2} * ${scale2}`, answer: newN2 },
          { prompt: `COMPARE: ${newN1} _ ${newN2} (<, >, =)`, answer: ans }
        ]
      };
    },
    // Floor 18: Addition with Like Denominators
    3: () => {
      const d = pickRandom([4, 5, 6, 8, 10, 12]);
      const n1 = Math.floor(Math.random() * (d - 2)) + 1;
      const n2 = Math.floor(Math.random() * (d - n1 - 1)) + 1; // Ensure sum < d
      
      return {
        question: `ADD: ${n1}/${d} + ${n2}/${d}`,
        answer: `${n1 + n2}/${d}`,
        complexity: 'QUICK',
        inputType: 'FRACTION',
        steps: [
          { prompt: `IDENTIFY SHARED DENOMINATOR`, answer: d },
          { prompt: `ADD NUMERATORS: ${n1} + ${n2}`, answer: n1 + n2 },
          { prompt: `WRITE SUM AS A FRACTION`, answer: `${n1 + n2}/${d}` }
        ]
      };
    },
    // Floor 19: Subtraction with Like Denominators
    4: () => {
      const d = pickRandom([4, 5, 6, 8, 10, 12]);
      const n1 = Math.floor(Math.random() * (d - 2)) + 2; // 2 to d-1
      const n2 = Math.floor(Math.random() * (n1 - 1)) + 1; // 1 to n1-1
      
      return {
        question: `SUBTRACT: ${n1}/${d} - ${n2}/${d}`,
        answer: `${n1 - n2}/${d}`,
        complexity: 'QUICK',
        inputType: 'FRACTION',
        steps: [
          { prompt: `IDENTIFY SHARED DENOMINATOR`, answer: d },
          { prompt: `SUBTRACT NUMERATORS: ${n1} - ${n2}`, answer: n1 - n2 },
          { prompt: `WRITE DIFFERENCE AS A FRACTION`, answer: `${n1 - n2}/${d}` }
        ]
      };
    }
  },
  5: {
    // Floor 21: Addition with Unlike Denominators
    1: () => {
      const [d1, d2] = pickRandom(FRIENDLY_DISTINCT_PAIRS);
      const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
      const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
      
      const commonD = lcm(d1, d2);
      const scale1 = commonD / d1;
      const scale2 = commonD / d2;
      const newN1 = n1 * scale1;
      const newN2 = n2 * scale2;
      const sumN = newN1 + newN2;
      
      return {
        question: `ADD: ${n1}/${d1} + ${n2}/${d2}`,
        answer: `${sumN}/${commonD}`,
        complexity: 'COMBO',
        inputType: 'FRACTION',
        steps: [
          { prompt: `FIND COMMON DENOMINATOR (LCM OF ${d1} AND ${d2})`, answer: commonD },
          { prompt: `CONVERT LEFT NUMERATOR: ${n1} * ${scale1}`, answer: newN1 },
          { prompt: `CONVERT RIGHT NUMERATOR: ${n2} * ${scale2}`, answer: newN2 },
          { prompt: `SUM NUMERATORS: ${newN1} + ${newN2}`, answer: sumN },
          { prompt: `WRITE SUM AS A FRACTION`, answer: `${sumN}/${commonD}` }
        ]
      };
    },
    // Floor 22: Subtraction with Unlike Denominators (strictly positive numerator)
    2: () => {
      let [d1, d2] = pickRandom(FRIENDLY_DISTINCT_PAIRS);
      let n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
      let n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
      
      // Ensure strictly positive result: n1/d1 > n2/d2 => n1*d2 > n2*d1
      if (n1 * d2 < n2 * d1) {
        [n1, n2] = [n2, n1];
        [d1, d2] = [d2, d1];
      } else if (n1 * d2 === n2 * d1) {
        // Equal fractions (e.g., 1/2 and 2/4): strictly separate while keeping proper fractions
        if (n1 < d1 - 1) {
          n1 += 1;
        } else {
          n2 -= 1;
        }
      }
      
      const commonD = lcm(d1, d2);
      const scale1 = commonD / d1;
      const scale2 = commonD / d2;
      const newN1 = n1 * scale1;
      const newN2 = n2 * scale2;
      const diffN = newN1 - newN2;
      
      return {
        question: `SUBTRACT: ${n1}/${d1} - ${n2}/${d2}`,
        answer: `${diffN}/${commonD}`,
        complexity: 'COMBO',
        inputType: 'FRACTION',
        steps: [
          { prompt: `FIND COMMON DENOMINATOR (LCM OF ${d1} AND ${d2})`, answer: commonD },
          { prompt: `CONVERT LEFT NUMERATOR: ${n1} * ${scale1}`, answer: newN1 },
          { prompt: `CONVERT RIGHT NUMERATOR: ${n2} * ${scale2}`, answer: newN2 },
          { prompt: `SUBTRACT NUMERATORS: ${newN1} - ${newN2}`, answer: diffN },
          { prompt: `WRITE DIFFERENCE AS A FRACTION`, answer: `${diffN}/${commonD}` }
        ]
      };
    },
    // Floor 23: Multiplying Fractions by whole numbers
    3: () => {
      const d = pickRandom(FRIENDLY_DENOMINATORS);
      const n = Math.floor(Math.random() * (d - 1)) + 1;
      const whole = Math.floor(Math.random() * 4) + 2; // 2 to 5
      
      const resultN = n * whole;
      
      return {
        question: `MULTIPLY: ${whole} * (${n}/${d})`,
        answer: `${resultN}/${d}`,
        complexity: 'QUICK',
        inputType: 'FRACTION',
        steps: [
          { prompt: `MULTIPLY WHOLE BY NUMERATOR: ${whole} * ${n}`, answer: resultN },
          { prompt: `KEEP DENOMINATOR`, answer: d },
          { prompt: `WRITE PRODUCT AS A FRACTION`, answer: `${resultN}/${d}` }
        ]
      };
    },
    // Floor 24: Calculating Volume of rectangular prisms
    4: () => {
      const l = Math.floor(Math.random() * 8) + 2;
      const w = Math.floor(Math.random() * 5) + 2;
      const h = Math.floor(Math.random() * 4) + 2;
      const volume = l * w * h;
      
      return {
        question: `VOLUME: L=${l}, W=${w}, H=${h}. V = ?`,
        answer: volume,
        complexity: 'COMBO',
        steps: [
          { prompt: `CALCULATE BASE AREA: ${l} * ${w}`, answer: l * w },
          { prompt: `MULTIPLY BY HEIGHT: ${l * w} * ${h}`, answer: volume }
        ]
      };
    },
    // Floor 25: Unit Conversions (Length and Weight)
    5: () => {
      const types = [
        { name: 'Feet to Inches', factor: 12, unit1: 'ft', unit2: 'in', values: [2, 3, 4, 5, 6, 10] },
        { name: 'Yards to Feet', factor: 3, unit1: 'yd', unit2: 'ft', values: [3, 4, 5, 6, 8, 10, 12] },
        { name: 'Pounds to Ounces', factor: 16, unit1: 'lb', unit2: 'oz', values: [2, 3, 4, 5, 10] },
        { name: 'Kilograms to Grams', factor: 1000, unit1: 'kg', unit2: 'g', values: [2, 3, 4, 5, 6, 8, 10, 12] }
      ];
      const type = pickRandom(types);
      const val = pickRandom(type.values);
      const answer = val * type.factor;
      
      return {
        question: `CONVERT: ${val} ${type.unit1} to ${type.unit2}`,
        answer: answer,
        complexity: 'COMBO',
        steps: [
          { prompt: `IDENTIFY CONVERSION FACTOR`, answer: type.factor },
          { prompt: `MULTIPLY: ${val} * ${type.factor}`, answer: answer }
        ]
      };
    }
  }
};
