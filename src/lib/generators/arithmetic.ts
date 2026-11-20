import { ProblemGenerator } from '../mathGenerators';

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
        steps: [
          { prompt: `IDENTIFY TARGET DIGIT (${place}s) IN ${num}`, answer: Math.floor((num % (place * 10)) / place) },
          { prompt: `CHECK NEXT DIGIT IN ${num}`, answer: Math.floor((num % place) / (place / 10)) },
          { prompt: `EXECUTE ROUNDING ON ${num}`, answer: answer }
        ]
      };
    },
    // Floor 3: Multi-digit integer Addition
    3: () => {
      const a1 = Math.floor(Math.random() * 900) + 100; // 3 digit
      const b1 = Math.floor(Math.random() * 900) + 100; // 3 digit
      const hundredsA = Math.floor(a1 / 100) * 100;
      const tensA = Math.floor((a1 % 100) / 10) * 10;
      const onesA = a1 % 10;
      const hundredsB = Math.floor(b1 / 100) * 100;
      const tensB = Math.floor((b1 % 100) / 10) * 10;
      const onesB = b1 % 10;
      
      return { 
        question: `COMPILE: ${a1} + ${b1}`, 
        answer: a1 + b1, 
        steps: [
          { prompt: `EXTRACT HUNDREDS: ${hundredsA} + ${hundredsB}`, answer: hundredsA + hundredsB },
          { prompt: `EXTRACT TENS: ${tensA} + ${tensB}`, answer: tensA + tensB },
          { prompt: `EXTRACT ONES: ${onesA} + ${onesB}`, answer: onesA + onesB },
          { prompt: `SUM COMPONENTS: (${hundredsA + hundredsB} + ${tensA + tensB} + ${onesA + onesB})`, answer: a1 + b1 }
        ]
      };
    },
    // Floor 4: Multi-digit integer Subtraction
    4: () => {
      const a1 = Math.floor(Math.random() * 800) + 200; // 200 to 999
      const b1 = Math.floor(Math.random() * (a1 - 100)) + 50; // Ensure positive result, decent size
      
      // We'll do a simpler step breakdown for subtraction to avoid negative intermediate steps
      const diff = a1 - b1;
      const roundedB = Math.ceil(b1 / 100) * 100;
      const overshot = roundedB - b1;
      
      return {
        question: `DECOMPILE: ${a1} - ${b1}`,
        answer: diff,
        steps: [
          { prompt: `ROUND SUBTRAHEND: ${b1} -> ?`, answer: roundedB },
          { prompt: `SUBTRACT ROUNDED: ${a1} - ${roundedB}`, answer: a1 - roundedB },
          { prompt: `ADD OVERSHOOT: ${(a1 - roundedB)} + ${overshot}`, answer: diff }
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
    // Floor 11: 2-digit by 2-digit Multiplication
    1: () => {
      const a3 = Math.floor(Math.random() * 90) + 10; // 10 to 99
      const b3 = Math.floor(Math.random() * 90) + 10; // 10 to 99
      const tensB = Math.floor(b3 / 10) * 10;
      const onesB = b3 % 10;
      
      return { 
        question: `COMPILE: ${a3} * ${b3}`, 
        answer: a3 * b3, 
        steps: [
          { prompt: `MULTIPLY BY ONES: ${a3} * ${onesB}`, answer: a3 * onesB },
          { prompt: `MULTIPLY BY TENS: ${a3} * ${tensB}`, answer: a3 * tensB },
          { prompt: `SUM COMPONENTS: (${a3 * onesB} + ${a3 * tensB})`, answer: a3 * b3 }
        ]
      };
    },
    // Floor 12: Long Division (Standard algorithm without remainders)
    2: () => {
      const divisor = Math.floor(Math.random() * 8) + 2; // 2 to 9
      const quotient = Math.floor(Math.random() * 900) + 100; // 100 to 999
      const dividend = divisor * quotient;
      
      const hundredsQ = Math.floor(quotient / 100);
      const tensQ = Math.floor((quotient % 100) / 10);
      const onesQ = quotient % 10;
      
      const rem1 = dividend - (hundredsQ * 100 * divisor);
      const rem2 = rem1 - (tensQ * 10 * divisor);
      
      return { 
        question: `DECOMPILE: ${dividend} / ${divisor}`, 
        answer: quotient, 
        steps: [
          { prompt: `EXTRACT HUNDREDS: ? * ${divisor}00 <= ${dividend}`, answer: hundredsQ },
          { prompt: `REMAINING: ${dividend} - ${hundredsQ * divisor * 100}`, answer: rem1 },
          { prompt: `EXTRACT TENS: ? * ${divisor}0 <= ${rem1}`, answer: tensQ },
          { prompt: `REMAINING: ${rem1} - ${tensQ * divisor * 10}`, answer: rem2 },
          { prompt: `EXTRACT ONES: ? * ${divisor} = ${rem2}`, answer: onesQ },
          { prompt: `COMPILE QUOTIENT: ${hundredsQ}00 + ${tensQ}0 + ${onesQ}`, answer: quotient }
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
      const d1 = Math.floor(Math.random() * 8) + 3; // 3 to 10
      const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
      
      const d2 = Math.floor(Math.random() * 8) + 3;
      const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
      
      const val1 = n1 / d1;
      const val2 = n2 / d2;
      
      let ans = '=';
      if (val1 > val2) ans = '>';
      else if (val1 < val2) ans = '<';
      else ans = '=';
      
      const commonD = d1 * d2;
      const newN1 = n1 * d2;
      const newN2 = n2 * d1;
      
      return {
        question: `COMPARE: ${n1}/${d1} _ ${n2}/${d2}`,
        answer: ans,
        inputType: 'RELATIONSHIP',
        steps: [
          { prompt: `FIND COMMON DENOMINATOR: ${d1} * ${d2}`, answer: commonD },
          { prompt: `CONVERT LEFT NUMERATOR: ${n1} * ${d2}`, answer: newN1 },
          { prompt: `CONVERT RIGHT NUMERATOR: ${n2} * ${d1}`, answer: newN2 },
          { prompt: `COMPARE: ${newN1} _ ${newN2} (<, >, =)`, answer: ans }
        ]
      };
    },
    // Floor 18: Addition with Like Denominators
    3: () => {
      const d = Math.floor(Math.random() * 8) + 4; // 4 to 11
      const n1 = Math.floor(Math.random() * (d - 2)) + 1;
      const n2 = Math.floor(Math.random() * (d - n1 - 1)) + 1; // Ensure sum < d
      
      return {
        question: `ADD: ${n1}/${d} + ${n2}/${d}`,
        answer: `${n1 + n2}/${d}`,
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
      const d = Math.floor(Math.random() * 8) + 4; // 4 to 11
      const n1 = Math.floor(Math.random() * (d - 2)) + 2; // 2 to d-1
      const n2 = Math.floor(Math.random() * (n1 - 1)) + 1; // 1 to n1-1
      
      return {
        question: `SUBTRACT: ${n1}/${d} - ${n2}/${d}`,
        answer: `${n1 - n2}/${d}`,
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
      const d1 = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
      const d2 = [2, 3, 4, 5].filter(d => d !== d1)[Math.floor(Math.random() * 3)];
      const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
      const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
      
      const commonD = d1 * d2;
      const newN1 = n1 * d2;
      const newN2 = n2 * d1;
      const sumN = newN1 + newN2;
      
      return {
        question: `ADD: ${n1}/${d1} + ${n2}/${d2}`,
        answer: `${sumN}/${commonD}`,
        inputType: 'FRACTION',
        steps: [
          { prompt: `FIND COMMON DENOMINATOR: ${d1} * ${d2}`, answer: commonD },
          { prompt: `CONVERT LEFT NUMERATOR: ${n1} * ${d2}`, answer: newN1 },
          { prompt: `CONVERT RIGHT NUMERATOR: ${n2} * ${d1}`, answer: newN2 },
          { prompt: `SUM NUMERATORS: ${newN1} + ${newN2}`, answer: sumN },
          { prompt: `WRITE SUM AS A FRACTION`, answer: `${sumN}/${commonD}` }
        ]
      };
    },
    // Floor 22: Subtraction with Unlike Denominators
    2: () => {
      let d1 = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
      let d2 = [2, 3, 4, 5].filter(d => d !== d1)[Math.floor(Math.random() * 3)];
      
      // Ensure positive result: n1/d1 > n2/d2 => n1*d2 > n2*d1
      let n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
      let n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
      
      if (n1 * d2 <= n2 * d1) {
        // Swap or adjust
        const tempN = n1; n1 = n2; n2 = tempN;
        const tempD = d1; d1 = d2; d2 = tempD;
        // If still negative or zero, just force n1 to be larger
        if (n1 * d2 <= n2 * d1) n1 = d1 - 1;
      }
      
      const commonD = d1 * d2;
      const newN1 = n1 * d2;
      const newN2 = n2 * d1;
      const diffN = newN1 - newN2;
      
      return {
        question: `SUBTRACT: ${n1}/${d1} - ${n2}/${d2}`,
        answer: `${diffN}/${commonD}`,
        inputType: 'FRACTION',
        steps: [
          { prompt: `FIND COMMON DENOMINATOR: ${d1} * ${d2}`, answer: commonD },
          { prompt: `CONVERT LEFT NUMERATOR: ${n1} * ${d2}`, answer: newN1 },
          { prompt: `CONVERT RIGHT NUMERATOR: ${n2} * ${d1}`, answer: newN2 },
          { prompt: `SUBTRACT NUMERATORS: ${newN1} - ${newN2}`, answer: diffN },
          { prompt: `WRITE DIFFERENCE AS A FRACTION`, answer: `${diffN}/${commonD}` }
        ]
      };
    },
    // Floor 23: Multiplying Fractions by whole numbers
    3: () => {
      const d = Math.floor(Math.random() * 7) + 3; // 3 to 9
      const n = Math.floor(Math.random() * (d - 1)) + 1;
      const whole = Math.floor(Math.random() * 4) + 2; // 2 to 5
      
      const resultN = n * whole;
      
      return {
        question: `MULTIPLY: ${whole} * (${n}/${d})`,
        answer: `${resultN}/${d}`,
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
        steps: [
          { prompt: `CALCULATE BASE AREA: ${l} * ${w}`, answer: l * w },
          { prompt: `MULTIPLY BY HEIGHT: ${l * w} * ${h}`, answer: volume }
        ]
      };
    },
    // Floor 25: Unit Conversions (Length and Weight)
    5: () => {
      const types = [
        { name: 'Feet to Inches', factor: 12, unit1: 'ft', unit2: 'in' },
        { name: 'Yards to Feet', factor: 3, unit1: 'yd', unit2: 'ft' },
        { name: 'Pounds to Ounces', factor: 16, unit1: 'lb', unit2: 'oz' },
        { name: 'Kilograms to Grams', factor: 1000, unit1: 'kg', unit2: 'g' }
      ];
      const type = types[Math.floor(Math.random() * types.length)];
      const val = Math.floor(Math.random() * 10) + 2;
      const answer = val * type.factor;
      
      return {
        question: `CONVERT: ${val} ${type.unit1} to ${type.unit2}`,
        answer: answer,
        steps: [
          { prompt: `IDENTIFY CONVERSION FACTOR`, answer: type.factor },
          { prompt: `MULTIPLY: ${val} * ${type.factor}`, answer: answer }
        ]
      };
    }
  }
};
