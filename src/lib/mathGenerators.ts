import { MathProblem } from '../types';
import { arithmeticGenerators } from './generators/arithmetic';
import { preAlgebraGenerators } from './generators/preAlgebra';
import { modelingGenerators } from './generators/modeling';
import { generateConceptualProblem } from './generators/conceptual';

export type ProblemGenerator = () => Omit<MathProblem, 'type'>;

export const ATTACK_GENERATORS: Record<number, Record<number, ProblemGenerator>> = {
  ...arithmeticGenerators,
  ...preAlgebraGenerators,
  ...modelingGenerators
};

export const MEDITATION_GENERATOR: ProblemGenerator = () => {
  const { type: _type, ...problem } = generateConceptualProblem(1, 'MEDITATION');
  return problem;
};
