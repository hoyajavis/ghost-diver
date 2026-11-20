import { MathProblem } from '../types';
import { ATTACK_GENERATORS, MEDITATION_GENERATOR } from './mathGenerators';

export function generateProblem(
  tier: number,
  type: 'ATTACK' | 'MEDITATION',
  variant: 1 | 2 | 3 | 4 | 5 = 1
): MathProblem {
  if (type === 'ATTACK') {
    const tierGens = ATTACK_GENERATORS[tier] || ATTACK_GENERATORS[1];
    const generator = tierGens[variant] || tierGens[1];
    return { ...generator(), type };
  }

  return { ...MEDITATION_GENERATOR(), type };
}
