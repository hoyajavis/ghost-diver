import { ProblemGenerator } from '../mathGenerators';

const pickRandom = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

export const preAlgebraGenerators: Record<number, Record<number, ProblemGenerator>> = {
  6: {
    // Floor 26: Multi-digit Decimal Addition and Subtraction (clean halves, quarters, fifths, tenths)
    1: () => {
      const isAdd = Math.random() > 0.5;
      const isQuarters = Math.random() > 0.5;
      const fracPool = isQuarters ? [0.25, 0.5, 0.75] : [0.2, 0.4, 0.5, 0.6, 0.8];
      const a = Math.round(((Math.floor(Math.random() * 12) + 2) + pickRandom(fracPool)) * 100) / 100;
      const b = Math.round(((Math.floor(Math.random() * 8) + 1) + pickRandom(fracPool)) * 100) / 100;
      
      if (isAdd) {
        const sum = Math.round((a + b) * 100) / 100;
        return {
          question: `ADD: ${a} + ${b}`,
          answer: sum.toString(),
          complexity: 'QUICK',
          steps: [
            {
              prompt: `ALIGN DECIMALS: ${a} + ${b}`,
              answer: sum.toString(),
              clue: 'Add the whole parts and decimal parts separately, then combine.',
              resultLabel: `Sum = ${sum}`
            }
          ]
        };
      } else {
        let big = Math.max(a, b);
        const small = Math.min(a, b);
        if (big === small) big = Math.round((big + 1) * 100) / 100;
        const diff = Math.round((big - small) * 100) / 100;
        return {
          question: `SUBTRACT: ${big} - ${small}`,
          answer: diff.toString(),
          complexity: 'QUICK',
          steps: [
            {
              prompt: `ALIGN DECIMALS: ${big} - ${small}`,
              answer: diff.toString(),
              clue: 'Line up the decimal points and subtract place by place.',
              resultLabel: `Diff = ${diff}`
            }
          ]
        };
      }
    },
    // Floor 27: Decimal Multiplication and Division (mental-friendly decimals)
    2: () => {
      const isMult = Math.random() > 0.5;
      if (isMult) {
        const multPairs = [
          { dec: 0.25, wholes: [4, 8, 12, 16, 20] },
          { dec: 0.5, wholes: [2, 4, 6, 8, 10, 12, 14, 16] },
          { dec: 0.75, wholes: [4, 8, 12, 16] },
          { dec: 0.2, wholes: [5, 10, 15, 20, 25] },
          { dec: 1.2, wholes: [2, 3, 4, 5, 10] },
          { dec: 1.5, wholes: [2, 4, 6, 8, 10] }
        ];
        const pair = pickRandom(multPairs);
        const whole = pickRandom(pair.wholes);
        const prod = Math.round(pair.dec * whole * 100) / 100;
        return {
          question: `MULTIPLY: ${pair.dec} * ${whole}`,
          answer: prod.toString(),
          complexity: 'QUICK',
          steps: [
            {
              prompt: `MULTIPLY: ${pair.dec} * ${whole}`,
              answer: prod.toString(),
              clue: 'Think of the decimal as a clean fraction (1/2, 1/4, 3/4, 1/5) or scale by 10.',
              resultLabel: `Prod = ${prod}`
            }
          ]
        };
      } else {
        const divisor = pickRandom([0.2, 0.25, 0.5]);
        const quotient = Math.floor(Math.random() * 8) + 2; // 2 to 9
        const dividend = Math.round(divisor * quotient * 100) / 100;
        const shift = divisor === 0.25 ? 100 : 10;
        return {
          question: `DIVIDE: ${dividend} / ${divisor}`,
          answer: quotient.toString(),
          complexity: 'QUICK',
          steps: [
            {
              prompt: `SHIFT DECIMALS RIGHT: ${Math.round(dividend * shift)} / ${Math.round(divisor * shift)}`,
              answer: quotient.toString(),
              clue: 'Shift both decimal points right by the same places to divide whole numbers.',
              resultLabel: `Quot = ${quotient}`
            }
          ]
        };
      }
    },
    // Floor 28: Converting Fractions to Decimals
    3: () => {
      const fractions = [
        { n: 1, d: 2, dec: 0.5 },
        { n: 1, d: 4, dec: 0.25 },
        { n: 3, d: 4, dec: 0.75 },
        { n: 1, d: 5, dec: 0.2 },
        { n: 2, d: 5, dec: 0.4 },
        { n: 3, d: 5, dec: 0.6 },
        { n: 4, d: 5, dec: 0.8 },
        { n: 1, d: 10, dec: 0.1 },
        { n: 3, d: 10, dec: 0.3 },
        { n: 7, d: 10, dec: 0.7 },
        { n: 9, d: 10, dec: 0.9 }
      ];
      const f = fractions[Math.floor(Math.random() * fractions.length)];
      return {
        question: `CONVERT TO DECIMAL: ${f.n}/${f.d}`,
        answer: f.dec.toString(),
        complexity: 'QUICK',
        steps: [
          {
            prompt: `DIVIDE NUMERATOR BY DENOMINATOR: ${f.n} / ${f.d}`,
            answer: f.dec.toString(),
            clue: 'Scale the fraction to tenths (/10) or hundredths (/100) to read the decimal.',
            resultLabel: `${f.n}/${f.d} = ${f.dec}`
          }
        ]
      };
    },
    // Floor 29: Converting Decimals to Fractions
    4: () => {
      const fractions = [
        { n: 1, d: 2, dec: 0.5 },
        { n: 1, d: 4, dec: 0.25 },
        { n: 3, d: 4, dec: 0.75 },
        { n: 1, d: 5, dec: 0.2 },
        { n: 2, d: 5, dec: 0.4 },
        { n: 3, d: 5, dec: 0.6 },
        { n: 4, d: 5, dec: 0.8 },
        { n: 1, d: 10, dec: 0.1 },
        { n: 3, d: 10, dec: 0.3 },
        { n: 7, d: 10, dec: 0.7 },
        { n: 9, d: 10, dec: 0.9 }
      ];
      const f = fractions[Math.floor(Math.random() * fractions.length)];
      const decStr = f.dec.toString();
      const isTenths = decStr.length === 3; // e.g., "0.5"
      const unsimplifiedN = isTenths ? Math.round(f.dec * 10) : Math.round(f.dec * 100);
      const unsimplifiedD = isTenths ? 10 : 100;
      
      return {
        question: `CONVERT TO FRACTION: ${f.dec}`,
        answer: `${f.n}/${f.d}`,
        complexity: 'COMBO',
        inputType: 'FRACTION',
        requireSimplified: true,
        steps: [
          {
            prompt: `WRITE ${f.dec} AS A FRACTION OVER ${unsimplifiedD}`,
            answer: `${unsimplifiedN}/${unsimplifiedD}`,
            clue: '1 decimal place = tenths (/10); 2 decimal places = hundredths (/100).',
            resultLabel: `${f.dec} = ${unsimplifiedN}/${unsimplifiedD}`
          },
          {
            prompt: `SIMPLIFY ${unsimplifiedN}/${unsimplifiedD} TO LOWEST TERMS`,
            answer: `${f.n}/${f.d}`,
            requireSimplified: true,
            clue: 'Divide numerator and denominator by their greatest common divisor.',
            resultLabel: `${f.n}/${f.d}`
          }
        ]
      };
    }
  },
  7: {
    // Floor 31: Expressing basic Ratios (a:b)
    1: () => {
      const items = [
        { name1: 'APPLES', name2: 'ORANGES' },
        { name1: 'CATS', name2: 'DOGS' },
        { name1: 'CARS', name2: 'BIKES' },
        { name1: 'RED', name2: 'BLUE' }
      ];
      const item = items[Math.floor(Math.random() * items.length)];
      const count1 = Math.floor(Math.random() * 8) + 2;
      const count2 = Math.floor(Math.random() * 8) + 2;
      
      return {
        question: `RATIO: ${count1} ${item.name1} TO ${count2} ${item.name2}`,
        answer: `${count1}:${count2}`,
        complexity: 'COMBO',
        inputType: 'RATIO',
        steps: [
          {
            prompt: `COUNT OF ${item.name1} (${count1} ${item.name1} TO ${count2} ${item.name2})`,
            answer: count1,
            clue: 'Read the first quantity mentioned in the ratio statement.',
            resultLabel: `${item.name1} = ${count1}`
          },
          {
            prompt: `COUNT OF ${item.name2} (${count1} ${item.name1} TO ${count2} ${item.name2})`,
            answer: count2,
            clue: 'Read the second quantity mentioned in the ratio statement.',
            resultLabel: `${item.name2} = ${count2}`
          },
          {
            prompt: `WRITE RATIO (${count1} ${item.name1} TO ${count2} ${item.name2}) AS A:B`,
            answer: `${count1}:${count2}`,
            clue: 'Ratio order matches the wording: first quantity : second quantity.',
            resultLabel: `${count1}:${count2}`
          }
        ]
      };
    },
    // Floor 32: Calculating Unit Rates
    2: () => {
      const items = [
        { unit: 'MILES', per: 'HOUR' },
        { unit: 'DOLLARS', per: 'ITEM' },
        { unit: 'WORDS', per: 'MINUTE' },
        { unit: 'PAGES', per: 'BOOK' }
      ];
      const item = items[Math.floor(Math.random() * items.length)];
      const rate = Math.floor(Math.random() * 12) + 2;
      const units = Math.floor(Math.random() * 5) + 2;
      const total = rate * units;
      
      return {
        question: `UNIT RATE: ${total} ${item.unit} IN ${units} ${item.per}S`,
        answer: rate.toString(),
        complexity: 'QUICK',
        steps: [
          {
            prompt: `DIVIDE TOTAL BY UNITS: ${total} / ${units}`,
            answer: rate,
            clue: 'Unit rate = total quantity ÷ number of units (amount per 1 unit).',
            resultLabel: `Rate = ${rate}`
          }
        ]
      };
    },
    // Floor 33: Calculating Percentages of a whole number
    3: () => {
      const percents = [10, 20, 25, 50, 75];
      const p = percents[Math.floor(Math.random() * percents.length)];
      const multiplier = (p === 25 || p === 75) ? 4 : 10;
      const whole = (Math.floor(Math.random() * 10) + 1) * multiplier * 10;
      const ans = Math.round((p * whole) / 100);
      
      return {
        question: `PERCENTAGE: ${p}% OF ${whole}`,
        answer: ans.toString(),
        complexity: 'COMBO',
        steps: [
          {
            prompt: `CONVERT ${p}% TO DECIMAL`,
            answer: (p / 100).toString(),
            clue: 'Divide a percent by 100 (shift the decimal 2 places left).',
            resultLabel: `${p}% = ${p / 100}`
          },
          {
            prompt: `MULTIPLY: ${(p / 100)} * ${whole}`,
            answer: ans,
            clue: 'Multiply the decimal rate by the whole amount.',
            resultLabel: `Ans = ${ans}`
          }
        ]
      };
    }
  },
  8: {
    // Floor 36: Positive and Negative Integer Addition
    1: () => {
      const a = Math.floor(Math.random() * 40) - 20;
      const b = Math.floor(Math.random() * 40) - 20;
      const ans = a + b;
      const signChoice = ans < 0 ? 'NEGATIVE' : ans > 0 ? 'POSITIVE' : 'ZERO';
      
      return {
        question: `ADD: ${a} + (${b})`,
        answer: ans.toString(),
        complexity: 'COMBO',
        steps: [
          {
            prompt: `SIGN OF ${a} + (${b})?`,
            answer: signChoice,
            choices: ['POSITIVE', 'NEGATIVE', 'ZERO'],
            clue: 'Compare distances from 0: the number farther from 0 sets the sign.',
            resultLabel: `Sign = ${signChoice}`
          },
          {
            prompt: `CALCULATE SUM: ${a} + (${b})`,
            answer: ans,
            clue: 'Same signs: add magnitudes. Different signs: subtract magnitudes.',
            resultLabel: `Sum = ${ans}`
          }
        ]
      };
    },
    // Floor 37: Positive and Negative Integer Subtraction
    2: () => {
      const a = Math.floor(Math.random() * 40) - 20;
      const b = Math.floor(Math.random() * 40) - 20;
      const oppB = -b || 0;
      const ans = a - b;
      
      return {
        question: `SUBTRACT: ${a} - (${b})`,
        answer: ans.toString(),
        complexity: 'COMBO',
        steps: [
          {
            prompt: `FIND THE OPPOSITE OF ${b}`,
            answer: oppB,
            clue: 'Subtracting a number is the same as adding its opposite (flip the sign).',
            resultLabel: `Opp = ${oppB}`
          },
          {
            prompt: `ADD ${a} + (${oppB})`,
            answer: ans,
            clue: 'Now add the two integers using the integer addition sign rule.',
            resultLabel: `Ans = ${ans}`
          }
        ]
      };
    },
    // Floor 38: Absolute Value calculations
    3: () => {
      const a = Math.floor(Math.random() * 100) - 50;
      const ans = Math.abs(a);
      
      return {
        question: `ABSOLUTE VALUE: |${a}|`,
        answer: ans.toString(),
        complexity: 'QUICK',
        steps: [
          {
            prompt: `DISTANCE OF ${a} FROM ZERO: |${a}|`,
            answer: ans,
            clue: 'Absolute value is always non-negative (drop any minus sign).',
            resultLabel: `|${a}| = ${ans}`
          }
        ]
      };
    },
    // Floor 39: Plotting points on a 4-Quadrant Coordinate Plane
    4: () => {
      const x = Math.floor(Math.random() * 11) - 5; // -5 to 5
      const y = Math.floor(Math.random() * 11) - 5; // -5 to 5
      
      return {
        question: `PLOT POINT: (${x}, ${y})`,
        answer: `${x},${y}`,
        complexity: 'COMBO',
        inputType: 'COORDINATE',
        steps: [
          {
            prompt: `IDENTIFY X-COORDINATE OF (${x}, ${y})`,
            answer: x,
            clue: 'In an ordered pair (x, y), x is the first number (horizontal).',
            resultLabel: `x = ${x}`
          },
          {
            prompt: `IDENTIFY Y-COORDINATE OF (${x}, ${y})`,
            answer: y,
            clue: 'In an ordered pair (x, y), y is the second number (vertical).',
            resultLabel: `y = ${y}`
          },
          {
            prompt: `PLOT (${x}, ${y}) ON GRID`,
            answer: `${x},${y}`,
            clue: 'Move horizontally to x, then vertically to y.',
            resultLabel: `(${x}, ${y})`
          }
        ]
      };
    }
  },
  9: {
    // Floor 41: Exponents (Squares and Cubes)
    1: () => {
      const isCube = Math.random() > 0.5;
      const base = isCube ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 12) + 1;
      const exp = isCube ? 3 : 2;
      const ans = Math.pow(base, exp);
      
      return {
        question: `EVALUATE: ${base}^${exp}`,
        answer: ans.toString(),
        complexity: isCube ? 'COMBO' : 'QUICK',
        steps: isCube
          ? [
              {
                prompt: `SQUARE FIRST: ${base} * ${base}`,
                answer: base * base,
                clue: 'Start a cube by multiplying the base by itself once.',
                resultLabel: `${base}² = ${base * base}`
              },
              {
                prompt: `MULTIPLY BY ${base} AGAIN: ${base * base} * ${base}`,
                answer: ans,
                clue: 'n³ = (n × n) × n: multiply the square by the base once more.',
                resultLabel: `${base}³ = ${ans}`
              }
            ]
          : [
              {
                prompt: `MULTIPLY ${base} BY ITSELF`,
                answer: ans,
                clue: 'Squaring a number means multiplying it by itself (n × n).',
                resultLabel: `${base}² = ${ans}`
              }
            ]
      };
    },
    // Floor 42: Order of Operations (PEMDAS)
    2: () => {
      const a = Math.floor(Math.random() * 5) + 2;
      const b = Math.floor(Math.random() * 5) + 2;
      const c = Math.floor(Math.random() * 5) + 2;
      // a + b * c
      const ans = a + b * c;
      
      return {
        question: `EVALUATE: ${a} + ${b} * ${c}`,
        answer: ans.toString(),
        complexity: 'COMBO',
        steps: [
          {
            prompt: `MULTIPLY FIRST: ${b} * ${c}`,
            answer: b * c,
            clue: 'PEMDAS: always multiply before adding.',
            resultLabel: `${b}×${c} = ${b * c}`
          },
          {
            prompt: `ADD: ${a} + ${b * c}`,
            answer: ans,
            clue: 'Add the remaining term to the product.',
            resultLabel: `Val = ${ans}`
          }
        ]
      };
    },
    // Floor 43: Evaluating Variable Expressions (e.g., 3x + 5 given x = n)
    3: () => {
      const a = Math.floor(Math.random() * 7) + 2; // 2 to 8
      const x = Math.floor(Math.random() * 9) + 2; // 2 to 10
      const b = Math.floor(Math.random() * 12) + 1; // 1 to 12
      const isAdd = Math.random() > 0.5;
      const prod = a * x;
      const ans = isAdd ? prod + b : prod - b;

      return {
        question: `EVALUATE ${a}x ${isAdd ? '+' : '-'} ${b} FOR x = ${x}`,
        answer: ans.toString(),
        complexity: 'COMBO',
        steps: [
          {
            prompt: `SUBSTITUTE & MULTIPLY: ${a} * ${x}`,
            answer: prod,
            clue: `Replace x with ${x} and multiply by the coefficient first.`,
            resultLabel: `${a}x = ${prod}`
          },
          {
            prompt: `${isAdd ? 'ADD' : 'SUBTRACT'}: ${prod} ${isAdd ? '+' : '-'} ${b}`,
            answer: ans,
            clue: `Finish by ${isAdd ? 'adding' : 'subtracting'} the constant term.`,
            resultLabel: `Val = ${ans}`
          }
        ]
      };
    },
    // Floor 44: One-Step Algebraic Equations (All 4 Operations)
    4: () => {
      const opIndex = Math.floor(Math.random() * 4);
      if (opIndex === 0) {
        const x = Math.floor(Math.random() * 20) + 1;
        const a = Math.floor(Math.random() * 15) + 2;
        const c = x + a;
        return {
          question: `SOLVE FOR x: x + ${a} = ${c}`,
          answer: x.toString(),
          complexity: 'QUICK',
          steps: [
            {
              prompt: `SUBTRACT ${a} FROM ${c}`,
              answer: x,
              clue: `Undo +${a} by subtracting ${a} from both sides.`,
              resultLabel: `x = ${x}`
            }
          ]
        };
      } else if (opIndex === 1) {
        const x = Math.floor(Math.random() * 20) + 5;
        const a = Math.floor(Math.random() * 15) + 2;
        const c = x - a;
        return {
          question: `SOLVE FOR x: x - ${a} = ${c}`,
          answer: x.toString(),
          complexity: 'QUICK',
          steps: [
            {
              prompt: `ADD ${a} TO ${c}`,
              answer: x,
              clue: `Undo -${a} by adding ${a} to both sides.`,
              resultLabel: `x = ${x}`
            }
          ]
        };
      } else if (opIndex === 2) {
        const x = Math.floor(Math.random() * 9) + 2; // 2 to 10
        const a = Math.floor(Math.random() * 8) + 2; // 2 to 9
        const c = x * a;
        return {
          question: `SOLVE FOR x: ${a}x = ${c}`,
          answer: x.toString(),
          complexity: 'QUICK',
          steps: [
            {
              prompt: `DIVIDE BOTH SIDES BY ${a}: ${c} / ${a}`,
              answer: x,
              clue: `Undo multiplication by dividing both sides by ${a}.`,
              resultLabel: `x = ${x}`
            }
          ]
        };
      } else {
        const c = Math.floor(Math.random() * 9) + 2; // 2 to 10
        const a = Math.floor(Math.random() * 8) + 2; // 2 to 9
        const dividend = c * a;
        return {
          question: `SOLVE FOR x: x / ${a} = ${c}`,
          answer: dividend.toString(),
          complexity: 'QUICK',
          steps: [
            {
              prompt: `MULTIPLY BOTH SIDES BY ${a}: ${c} * ${a}`,
              answer: dividend,
              clue: `Undo division by multiplying both sides by ${a}.`,
              resultLabel: `x = ${dividend}`
            }
          ]
        };
      }
    }
  },
  10: {
    // Floor 46: Two-Step Algebraic Equations
    1: () => {
      const x = Math.floor(Math.random() * 10) + 1;
      const a = Math.floor(Math.random() * 5) + 2;
      const b = Math.floor(Math.random() * 10) + 1;
      const c = a * x + b;
      
      return {
        question: `SOLVE FOR x: ${a}x + ${b} = ${c}`,
        answer: x.toString(),
        complexity: 'COMBO',
        steps: [
          {
            prompt: `SUBTRACT ${b} FROM BOTH SIDES (${c} - ${b}) TO FIND ${a}x`,
            answer: c - b,
            clue: `Undo +${b} first by subtracting ${b} from both sides.`,
            resultLabel: `${a}x = ${c - b}`
          },
          {
            prompt: `DIVIDE BY ${a}: ${c - b} / ${a}`,
            answer: x,
            clue: `Undo multiplication by dividing both sides by ${a}.`,
            resultLabel: `x = ${x}`
          }
        ]
      };
    },
    // Floor 47: Inequalities
    2: () => {
      const x = Math.floor(Math.random() * 10) + 1;
      const a = Math.floor(Math.random() * 10) + 1;
      const isGreater = Math.random() > 0.5;
      const c = isGreater ? x + a - 1 : x + a + 1; // Ensure x satisfies the inequality
      const symbol = isGreater ? '>' : '<';
      
      return {
        question: `SOLVE FOR x: x + ${a} ${symbol} ${c}`,
        answer: isGreater ? `>${c - a}` : `<${c - a}`,
        complexity: 'COMBO',
        inputType: 'INEQUALITY',
        steps: [
          {
            prompt: `SUBTRACT ${a} FROM BOTH SIDES: ${c} - ${a}`,
            answer: c - a,
            clue: `Subtracting ${a} from both sides keeps the ${symbol} sign unchanged.`,
            resultLabel: `Bound = ${c - a}`
          },
          {
            prompt: `WRITE INEQUALITY FOR x + ${a} ${symbol} ${c}`,
            answer: isGreater ? `>${c - a}` : `<${c - a}`,
            clue: `Combine the ${symbol} symbol with the boundary value.`,
            resultLabel: `x ${symbol} ${c - a}`
          }
        ]
      };
    },
    // Floor 48: Area of Triangles and Parallelograms
    3: () => {
      const isTriangle = Math.random() > 0.5;
      const b = Math.floor(Math.random() * 10) + 2;
      let h = Math.floor(Math.random() * 10) + 2;
      if (isTriangle && b % 2 !== 0 && h % 2 !== 0) {
        h += 1;
      }
      const ans = isTriangle ? (b * h) / 2 : b * h;
      
      return {
        question: `AREA OF ${isTriangle ? 'TRIANGLE' : 'PARALLELOGRAM'}: b=${b}, h=${h}`,
        answer: ans.toString(),
        complexity: isTriangle ? 'COMBO' : 'QUICK',
        steps: [
          {
            prompt: `MULTIPLY BASE * HEIGHT: ${b} * ${h}`,
            answer: b * h,
            clue: isTriangle
              ? 'Triangle Area = (base × height) ÷ 2; multiply base × height first.'
              : 'Parallelogram Area = base × height.',
            resultLabel: `b×h = ${b * h}`
          },
          ...(isTriangle
            ? [
                {
                  prompt: `DIVIDE BY 2: ${b * h} / 2`,
                  answer: ans,
                  clue: 'A triangle is half of a parallelogram—divide by 2.',
                  resultLabel: `Area = ${ans}`
                }
              ]
            : [])
        ]
      };
    },
    // Floor 49: Calculating Mean, Median, Mode, and Range
    4: () => {
      const measure = Math.floor(Math.random() * 3); // 0=Mean, 1=Median, 2=Range
      if (measure === 0) {
        // Generate 5 small integers with exact integer mean
        const mean = Math.floor(Math.random() * 8) + 5; // 5 to 12
        const d1 = Math.floor(Math.random() * 4) + 1;
        const d2 = Math.floor(Math.random() * 4) + 1;
        const nums = [mean - d1, mean + d1, mean - d2, mean + d2, mean];
        const sum = nums.reduce((acc, n) => acc + n, 0);
        return {
          question: `FIND MEAN: [${nums.join(', ')}]`,
          answer: mean.toString(),
          complexity: 'COMBO',
          steps: [
            {
              prompt: `SUM ALL 5 VALUES: ${nums.join(' + ')}`,
              answer: sum,
              clue: 'Add all 5 numbers together first (pair opposites around the middle).',
              resultLabel: `Sum = ${sum}`
            },
            {
              prompt: `DIVIDE SUM BY 5: ${sum} / 5`,
              answer: mean,
              clue: 'Mean = (sum of all values) ÷ (number of values).',
              resultLabel: `Mean = ${mean}`
            }
          ]
        };
      } else if (measure === 1) {
        const base = Math.floor(Math.random() * 12) + 3;
        const sorted = [
          base,
          base + Math.floor(Math.random() * 3) + 1,
          base + Math.floor(Math.random() * 3) + 5,
          base + Math.floor(Math.random() * 3) + 9,
          base + Math.floor(Math.random() * 3) + 13
        ];
        const shuffled = [sorted[3], sorted[0], sorted[4], sorted[1], sorted[2]];
        return {
          question: `FIND MEDIAN: [${shuffled.join(', ')}]`,
          answer: sorted[2].toString(),
          complexity: 'COMBO',
          steps: [
            {
              prompt: `FIND SMALLEST VALUE IN [${shuffled.join(', ')}]`,
              answer: sorted[0],
              clue: 'Start sorting from least to greatest by locating the minimum value.',
              resultLabel: `Min = ${sorted[0]}`
            },
            {
              prompt: `FIND MIDDLE (3RD) VALUE IN [${shuffled.join(', ')}] AFTER SORTING`,
              answer: sorted[2],
              clue: 'Order all 5 values least to greatest; the 3rd value is the median.',
              resultLabel: `Med = ${sorted[2]}`
            }
          ]
        };
      } else {
        const min = Math.floor(Math.random() * 10) + 2;
        const max = min + Math.floor(Math.random() * 18) + 6;
        const mid1 = min + Math.floor((max - min) / 3);
        const mid2 = min + Math.floor((2 * (max - min)) / 3);
        const nums = [mid1, max, min, mid2];
        return {
          question: `FIND RANGE: [${nums.join(', ')}]`,
          answer: (max - min).toString(),
          complexity: 'COMBO',
          steps: [
            {
              prompt: `FIND MAXIMUM VALUE IN [${nums.join(', ')}]`,
              answer: max,
              clue: 'Scan the list for the largest number.',
              resultLabel: `Max = ${max}`
            },
            {
              prompt: `FIND MINIMUM VALUE IN [${nums.join(', ')}]`,
              answer: min,
              clue: 'Scan the list for the smallest number.',
              resultLabel: `Min = ${min}`
            },
            {
              prompt: `SUBTRACT MAX - MIN: ${max} - ${min}`,
              answer: max - min,
              clue: 'Range = Maximum − Minimum.',
              resultLabel: `Range = ${max - min}`
            }
          ]
        };
      }
    }
  }
};
