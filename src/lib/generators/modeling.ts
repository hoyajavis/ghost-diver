import { ProblemGenerator } from '../mathGenerators';

const pickRandom = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

export const modelingGenerators: Record<number, Record<number, ProblemGenerator>> = {
  11: {
    // Floor 51: Identifying the Constant of Proportionality (k) from tables
    1: () => {
      const k = Math.floor(Math.random() * 8) + 2; // 2 to 9
      const x1 = Math.floor(Math.random() * 3) + 1;
      const x2 = x1 + Math.floor(Math.random() * 3) + 1;
      const y1 = k * x1;
      const y2 = k * x2;
      
      return {
        question: `FIND k: x=[${x1}, ${x2}], y=[${y1}, ${y2}]`,
        answer: k.toString(),
        complexity: 'COMBO',
        steps: [
          {
            prompt: `DIVIDE y BY x: ${y1} / ${x1}`,
            answer: k,
            clue: 'Constant of proportionality k = y ÷ x for any pair.',
            resultLabel: `k = ${k}`
          },
          {
            prompt: `VERIFY WITH SECOND PAIR: ${y2} / ${x2}`,
            answer: k,
            clue: 'Check that the second y ÷ x ratio gives the same k.',
            resultLabel: `Verified: k=${k}`
          }
        ]
      };
    },
    // Floor 52: Solving multi-step Ratio and Percentage problems (Tax, Tip, Markup)
    2: () => {
      const isTax = Math.random() > 0.5;
      const base = (Math.floor(Math.random() * 10) + 2) * 10; // 20 to 110
      const percent = isTax ? (Math.floor(Math.random() * 3) + 5) : (Math.floor(Math.random() * 3) * 5 + 10); // 5-7% tax or 10-20% tip
      const amount = Math.round(base * percent) / 100;
      const total = Math.round((base + amount) * 100) / 100;
      
      return {
        question: `${isTax ? 'TAX' : 'TIP'}: ${percent}% ON $${base}. TOTAL?`,
        answer: total.toString(),
        complexity: 'COMBO',
        steps: [
          {
            prompt: `CALCULATE ${percent}% OF ${base}`,
            answer: amount,
            clue: 'Find 1% (divide by 100) or 10% (divide by 10), then scale to the percent.',
            resultLabel: `${isTax ? 'Tax' : 'Tip'} = $${amount}`
          },
          {
            prompt: `ADD TO BASE: ${base} + ${amount}`,
            answer: total,
            clue: `Total = original base amount + ${isTax ? 'tax' : 'tip'}.`,
            resultLabel: `Total = $${total}`
          }
        ]
      };
    },
    // Floor 53: Simple Interest calculations (I = Prt, mental-friendly 2-step chain)
    3: () => {
      const p = pickRandom([100, 200, 300, 400, 500]);
      const r = pickRandom([2, 4, 5, 10]);
      const t = pickRandom([2, 3, 4]);
      const annual = (p * r) / 100;
      const i = annual * t;
      
      return {
        question: `INTEREST: P=$${p}, r=${r}%, t=${t}yrs. I=?`,
        answer: i.toString(),
        complexity: 'COMBO',
        steps: [
          {
            prompt: `1-YEAR INTEREST: ${r}% OF $${p}`,
            answer: annual,
            clue: 'Find 1 year of interest first: (Principal × rate) ÷ 100.',
            resultLabel: `1yr = $${annual}`
          },
          {
            prompt: `MULTIPLY BY ${t} YEARS: ${annual} * ${t}`,
            answer: i,
            clue: 'Simple interest I = P × r × t: multiply 1-year interest by years.',
            resultLabel: `I = $${i}`
          }
        ]
      };
    },
    // Floor 54: Conceptual Check (Proportional vs Linear)
    4: () => {
      const isProportional = Math.random() > 0.5;
      const m = Math.floor(Math.random() * 4) + 2;
      const b = Math.floor(Math.random() * 5) + 1;
      
      const eq = isProportional ? `y = ${m}x` : `y = ${m}x + ${b}`;
      
      return {
        question: `IS PROPORTIONAL? ${eq}`,
        answer: isProportional ? 'YES' : 'NO',
        complexity: 'QUICK',
        choices: ['YES', 'NO'],
        steps: [
          {
            prompt: `DOES ${eq} PASS THROUGH (0,0)?`,
            answer: isProportional ? 'YES' : 'NO',
            choices: ['YES', 'NO'],
            clue: 'Plug in x = 0: proportional equations give y = 0 (no "+ b" offset).',
            resultLabel: isProportional ? 'Proportional' : 'Not Prop.'
          }
        ]
      };
    }
  },
  12: {
    // Floor 56: Adding and Subtracting positive and negative fractions/decimals
    1: () => {
      const isFraction = Math.random() > 0.5;
      if (isFraction) {
        const d = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
        const n1 = Math.floor(Math.random() * 5) + 1;
        const n2 = Math.floor(Math.random() * 5) + 1;
        const sign1 = Math.random() > 0.5 ? 1 : -1;
        const sign2 = Math.random() > 0.5 ? 1 : -1;
        
        const num1 = sign1 * n1;
        const num2 = sign2 * n2;
        const sumN = num1 + num2;
        
        return {
          question: `EVALUATE: ${num1}/${d} + (${num2}/${d})`,
          answer: `${sumN}/${d}`,
          complexity: 'QUICK',
          inputType: 'FRACTION',
          steps: [
            {
              prompt: `ADD NUMERATORS: ${num1} + (${num2})`,
              answer: sumN,
              clue: 'Combine the signed numerators using integer addition rules.',
              resultLabel: `Num = ${sumN}`
            },
            {
              prompt: `WRITE ${num1}/${d} + (${num2}/${d}) AS A FRACTION (OVER ${d})`,
              answer: `${sumN}/${d}`,
              clue: `Keep the shared denominator ${d}.`,
              resultLabel: `${sumN}/${d}`
            }
          ]
        };
      } else {
        const num1 = (Math.floor(Math.random() * 100) - 50) / 10;
        const num2 = (Math.floor(Math.random() * 100) - 50) / 10;
        const sum = Math.round((num1 + num2) * 10) / 10;
        
        return {
          question: `EVALUATE: ${num1.toFixed(1)} + (${num2.toFixed(1)})`,
          answer: sum.toString(),
          complexity: 'QUICK',
          steps: [
            {
              prompt: `ALIGN DECIMALS AND ADD: ${num1.toFixed(1)} + (${num2.toFixed(1)})`,
              answer: sum.toString(),
              clue: 'Line up decimal points and watch the signs (same add, opposite subtract).',
              resultLabel: `Sum = ${sum}`
            }
          ]
        };
      }
    },
    // Floor 57: Multiplying and Dividing negative fractions and mixed numbers
    2: () => {
      const isMult = Math.random() > 0.5;
      const d1 = [2, 3, 4][Math.floor(Math.random() * 3)];
      const d2 = [2, 3, 4][Math.floor(Math.random() * 3)];
      const n1 = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const n2 = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
      
      if (isMult) {
        const resN = n1 * n2;
        const resD = d1 * d2;
        return {
          question: `MULTIPLY: (${n1}/${d1}) * (${n2}/${d2})`,
          answer: `${resN}/${resD}`,
          complexity: 'COMBO',
          inputType: 'FRACTION',
          steps: [
            {
              prompt: `MULTIPLY NUMERATORS: ${n1} * ${n2}`,
              answer: resN,
              clue: 'Multiply straight across the top; same signs → positive, different → negative.',
              resultLabel: `Num = ${resN}`
            },
            {
              prompt: `MULTIPLY DENOMINATORS: ${d1} * ${d2}`,
              answer: resD,
              clue: 'Multiply straight across the bottom.',
              resultLabel: `Den = ${resD}`
            },
            {
              prompt: `WRITE (${n1}/${d1}) * (${n2}/${d2}) AS A FRACTION`,
              answer: `${resN}/${resD}`,
              clue: 'Place (num × num) over (den × den).',
              resultLabel: `${resN}/${resD}`
            }
          ]
        };
      } else {
        const recipN = n2 < 0 ? -d2 : d2;
        const recipD = Math.abs(n2);
        const finalN = n1 * recipN;
        const finalD = d1 * recipD;
        
        return {
          question: `DIVIDE: (${n1}/${d1}) / (${n2}/${d2})`,
          answer: `${finalN}/${finalD}`,
          complexity: 'COMBO',
          inputType: 'FRACTION',
          steps: [
            {
              prompt: `FLIP SECOND FRACTION (RECIPROCAL OF ${n2}/${d2})`,
              answer: `${recipN}/${recipD}`,
              inputType: 'FRACTION',
              clue: 'Keep–Change–Flip: swap the second fraction’s top and bottom, keeping its sign.',
              resultLabel: `Flip = ${recipN}/${recipD}`
            },
            {
              prompt: `MULTIPLY NUMERATORS: ${n1} * ${recipN}`,
              answer: finalN,
              clue: 'Multiply the first numerator by the reciprocal’s numerator.',
              resultLabel: `Num = ${finalN}`
            },
            {
              prompt: `MULTIPLY DENOMINATORS (${d1} * ${recipD}) & WRITE FRACTION`,
              answer: `${finalN}/${finalD}`,
              inputType: 'FRACTION',
              clue: 'Multiply the denominators and place the new numerator on top.',
              resultLabel: `${finalN}/${finalD}`
            }
          ]
        };
      }
    },
    // Floor 58: Multi-step operations with Rational Numbers
    3: () => {
      const a = ((Math.floor(Math.random() * 9) + 1) * (Math.random() > 0.5 ? 1 : -1)) / 2; // halves from -4.5 to 4.5
      const b = ((Math.floor(Math.random() * 9) + 1) * (Math.random() > 0.5 ? 1 : -1)) / 2;
      const c = (Math.floor(Math.random() * 4) + 2) * (Math.random() > 0.5 ? 1 : -1); // -5 to -2 or 2 to 5
      const sum = Math.round((a + b) * 10) / 10;
      const result = Math.round(sum * c * 10) / 10;

      return {
        question: `EVALUATE: (${a} + ${b < 0 ? `(${b})` : b}) * (${c})`,
        answer: result.toString(),
        complexity: 'COMBO',
        steps: [
          {
            prompt: `EVALUATE PARENTHESES: ${a} + ${b < 0 ? `(${b})` : b}`,
            answer: sum,
            clue: 'PEMDAS: combine the numbers inside the parentheses first.',
            resultLabel: `Paren = ${sum}`
          },
          {
            prompt: `MULTIPLY BY ${c}: ${sum} * (${c})`,
            answer: result,
            clue: `Multiply the parentheses result by ${c} and watch the sign.`,
            resultLabel: `Ans = ${result}`
          }
        ]
      };
    },
    // Floor 59: Conceptual Check (Rules of Signs)
    4: () => {
      const isMult = Math.random() > 0.5;
      const sameSign = Math.random() > 0.5;
      const expr = isMult
        ? (sameSign ? 'NEG * NEG' : 'POS * NEG')
        : (sameSign ? 'NEG / NEG' : 'NEG / POS');
      
      return {
        question: `SIGN OF: ${expr}`,
        answer: sameSign ? 'POS' : 'NEG',
        complexity: 'QUICK',
        choices: ['POS', 'NEG'],
        steps: [
          {
            prompt: `DO SIGNS MATCH IN ${expr}?`,
            answer: sameSign ? 'YES' : 'NO',
            choices: ['YES', 'NO'],
            clue: 'Check if both terms share the same sign (+/+ or -/-).',
            resultLabel: `Match = ${sameSign ? 'YES' : 'NO'}`
          },
          {
            prompt: `RESULTING SIGN OF ${expr}?`,
            answer: sameSign ? 'POS' : 'NEG',
            choices: ['POS', 'NEG'],
            clue: 'Same signs → POS; different signs → NEG.',
            resultLabel: `Sign = ${sameSign ? 'POS' : 'NEG'}`
          }
        ]
      };
    }
  }
};
