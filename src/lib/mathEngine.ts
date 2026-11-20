import { MathProblem, ProblemType } from '../types';
import { ATTACK_GENERATORS } from './mathGenerators';
import { generateConceptualProblem } from './generators/conceptual';
import { clampTier } from './dungeonLogic';

export function generateProblem(
  tier: number,
  type: ProblemType,
  variant: 1 | 2 | 3 | 4 | 5 = 1
): MathProblem {
  if (type === 'ATTACK') {
    const safeTier = clampTier(tier);
    const tierGens = ATTACK_GENERATORS[safeTier] || ATTACK_GENERATORS[1];
    const generator = tierGens[variant] || tierGens[1];
    return { ...generator(), type: 'ATTACK', category: 'PROCEDURAL' };
  }

  return generateConceptualProblem(tier, type);
}
