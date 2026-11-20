import { ProblemGenerator } from '../mathGenerators';

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
        steps: [
          { prompt: `DIVIDE y BY x: ${y1} / ${x1}`, answer: k },
          { prompt: `VERIFY WITH SECOND PAIR: ${y2} / ${x2}`, answer: k }
        ]
      };
    },
    // Floor 52: Solving multi-step Ratio and Percentage problems (Tax, Tip, Markup)
    2: () => {
      const isTax = Math.random() > 0.5;
      const base = (Math.floor(Math.random() * 10) + 2) * 10; // 20 to 110
      const percent = isTax ? (Math.floor(Math.random() * 3) + 5) : (Math.floor(Math.random() * 3) * 5 + 10); // 5-7% tax or 10-20% tip
      const amount = (base * percent) / 100;
      const total = base + amount;
      
      return {
        question: `${isTax ? 'TAX' : 'TIP'}: ${percent}% ON $${base}. TOTAL?`,
        answer: total.toString(),
        steps: [
          { prompt: `CALCULATE ${percent}% OF ${base}`, answer: amount },
          { prompt: `ADD TO BASE: ${base} + ${amount}`, answer: total }
        ]
      };
    },
    // Floor 53: Simple Interest calculations (I = Prt)
    3: () => {
      const p = (Math.floor(Math.random() * 9) + 1) * 100; // 100 to 900
      const r = Math.floor(Math.random() * 5) + 2; // 2% to 6%
      const t = Math.floor(Math.random() * 4) + 2; // 2 to 5 years
      const i = (p * r * t) / 100;
      
      return {
        question: `INTEREST: P=$${p}, r=${r}%, t=${t}yrs. I=?`,
        answer: i.toString(),
        steps: [
          { prompt: `CONVERT RATE TO DECIMAL: ${r} / 100`, answer: r / 100 },
          { prompt: `MULTIPLY P * r * t: ${p} * ${r / 100} * ${t}`, answer: i }
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
        choices: ['YES', 'NO'],
        steps: [
          {
            prompt: `DOES IT PASS THROUGH (0,0)?`,
            answer: isProportional ? 'YES' : 'NO',
            choices: ['YES', 'NO']
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
          inputType: 'FRACTION',
          steps: [
            { prompt: `ADD NUMERATORS: ${num1} + (${num2})`, answer: sumN },
            { prompt: `WRITE RESULT AS A FRACTION`, answer: `${sumN}/${d}` }
          ]
        };
      } else {
        const num1 = (Math.floor(Math.random() * 100) - 50) / 10;
        const num2 = (Math.floor(Math.random() * 100) - 50) / 10;
        const sum = Math.round((num1 + num2) * 10) / 10;
        
        return {
          question: `EVALUATE: ${num1.toFixed(1)} + (${num2.toFixed(1)})`,
          answer: sum.toString(),
          steps: [
            { prompt: `ALIGN DECIMALS AND ADD`, answer: sum.toString() }
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
          inputType: 'FRACTION',
          steps: [
            { prompt: `MULTIPLY NUMERATORS: ${n1} * ${n2}`, answer: resN },
            { prompt: `MULTIPLY DENOMINATORS: ${d1} * ${d2}`, answer: resD },
            { prompt: `WRITE PRODUCT AS A FRACTION`, answer: `${resN}/${resD}` }
          ]
        };
      } else {
        const resN = n1 * d2;
        const resD = d1 * n2;
        // Handle negative denominator
        const finalN = resD < 0 ? -resN : resN;
        const finalD = Math.abs(resD);
        
        return {
          question: `DIVIDE: (${n1}/${d1}) / (${n2}/${d2})`,
          answer: `${finalN}/${finalD}`,
          inputType: 'FRACTION',
          steps: [
            { prompt: `MULTIPLY BY RECIPROCAL: (${n1}/${d1}) * (${d2}/${n2})`, answer: `${finalN}/${finalD}` }
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
        steps: [
          { prompt: `EVALUATE PARENTHESES: ${a} + ${b < 0 ? `(${b})` : b}`, answer: sum },
          { prompt: `MULTIPLY RESULT BY ${c}`, answer: result }
        ]
      };
    },
    // Floor 59: Conceptual Check (Rules of Signs)
    4: () => {
      const isMult = Math.random() > 0.5;
      const sameSign = Math.random() > 0.5;
      
      if (isMult) {
        return {
          question: `SIGN OF: ${sameSign ? 'NEG * NEG' : 'POS * NEG'}`,
          answer: sameSign ? 'POS' : 'NEG',
          choices: ['POS', 'NEG'],
          steps: [
            { prompt: `DO SIGNS MATCH?`, answer: sameSign ? 'YES' : 'NO', choices: ['YES', 'NO'] },
            { prompt: `RESULTING SIGN?`, answer: sameSign ? 'POS' : 'NEG', choices: ['POS', 'NEG'] }
          ]
        };
      } else {
        return {
          question: `SIGN OF: ${sameSign ? 'NEG / NEG' : 'NEG / POS'}`,
          answer: sameSign ? 'POS' : 'NEG',
          choices: ['POS', 'NEG'],
          steps: [
            { prompt: `DO SIGNS MATCH?`, answer: sameSign ? 'YES' : 'NO', choices: ['YES', 'NO'] },
            { prompt: `RESULTING SIGN?`, answer: sameSign ? 'POS' : 'NEG', choices: ['POS', 'NEG'] }
          ]
        };
      }
    }
  }
};
