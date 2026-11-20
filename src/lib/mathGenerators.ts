import { MathProblem } from '../types';
import { arithmeticGenerators } from './generators/arithmetic';
import { preAlgebraGenerators } from './generators/preAlgebra';
import { modelingGenerators } from './generators/modeling';

export type ProblemGenerator = () => Omit<MathProblem, 'type'>;

export const ATTACK_GENERATORS: Record<number, Record<number, ProblemGenerator>> = {
  ...arithmeticGenerators,
  ...preAlgebraGenerators,
  ...modelingGenerators
};

const CONCEPTUAL_QUESTIONS = [
  {
    question: "Why align the decimal point when adding?",
    choices: ["Place Value", "Ease of Reading", "Rule of Math", "Looks Neat"],
    answer: "Place Value"
  },
  {
    question: "What is the role of zero in 405?",
    choices: ["Placeholder", "Nothing", "Multiplier", "Divider"],
    answer: "Placeholder"
  },
  {
    question: "Difference between factors and multiples?",
    choices: ["Factors divide, Multiples multiply", "They are the same", "Multiples are smaller", "Factors are infinite"],
    answer: "Factors divide, Multiples multiply"
  },
  {
    question: "Inverse of multiplication?",
    choices: ["Division", "Addition", "Subtraction", "Exponents"],
    answer: "Division"
  },
  {
    question: "What does the denominator represent?",
    choices: ["Total equal parts", "Parts selected", "Whole number", "Remainder"],
    answer: "Total equal parts"
  },
  {
    question: "How does 2D Area scale into 3D Volume?",
    choices: ["Multiply by height", "Add height", "Divide by height", "Square the height"],
    answer: "Multiply by height"
  },
  {
    question: "Why move the decimal when multiplying by 10?",
    choices: ["Place values shift left", "Numbers get smaller", "It's a magic trick", "To align decimals"],
    answer: "Place values shift left"
  },
  {
    question: "Which word indicates a unit rate?",
    choices: ["Total", "Difference", "Per", "Sum"],
    answer: "Per"
  },
  {
    question: "What does zero represent in temperature?",
    choices: ["Nothing", "A relative reference point", "The lowest possible", "Absolute zero"],
    answer: "A relative reference point"
  },
  {
    question: "What does an exponent indicate?",
    choices: ["Repeated multiplication", "Repeated addition", "Division", "Fractions"],
    answer: "Repeated multiplication"
  },
  {
    question: "In PEMDAS, what comes after Parentheses?",
    choices: ["Exponents", "Multiplication", "Division", "Addition"],
    answer: "Exponents"
  },
  {
    question: "What is the goal of solving an algebraic equation?",
    choices: ["Isolate the variable", "Find the biggest number", "Remove all numbers", "Make it zero"],
    answer: "Isolate the variable"
  },
  {
    question: "What does an inequality represent?",
    choices: ["A range of solutions", "A single answer", "An error", "A fraction"],
    answer: "A range of solutions"
  }
];

export const MEDITATION_GENERATOR: ProblemGenerator = () => {
  const q = CONCEPTUAL_QUESTIONS[Math.floor(Math.random() * CONCEPTUAL_QUESTIONS.length)];
  return {
    question: `CONCEPT: ${q.question}`,
    answer: q.answer,
    complexity: 'QUICK',
    choices: q.choices,
    steps: []
  };
};
