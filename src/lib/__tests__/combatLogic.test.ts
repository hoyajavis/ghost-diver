import { describe, expect, it } from 'vitest';
import {
  applyMeditationRecovery,
  calculateCombatReward,
  calculateEnemyCounterDamage,
  calculateFpGain,
  calculatePlayerAttackDamage,
  consumeHintPack,
  formatMultiSelectAnswer,
  getTotalHints,
} from '../combatLogic';
import { INITIAL_STATS } from '../storage';

describe('combatLogic', () => {
  it('calculates standard attack damage with ATK_UP buffs', () => {
    const damage = calculatePlayerAttackDamage({
      isHintMode: false,
      stepCount: 0,
      isFinalHintStep: false,
      enemyMaxHp: 60,
      currentEnemyHp: 60,
      runBuffs: ['ATK_UP', 'ATK_UP'],
      rng: () => 0.4, // floor(0.4 * 5) = 2 -> base 12 + 10 = 22
    });

    expect(damage).toBe(22);
  });

  it('splits damage across hint steps and guarantees lethal on final step', () => {
    const stepDamage = calculatePlayerAttackDamage({
      isHintMode: true,
      stepCount: 3,
      isFinalHintStep: false,
      enemyMaxHp: 50,
      currentEnemyHp: 50,
      runBuffs: [],
    });
    expect(stepDamage).toBe(17);

    const finalStepDamage = calculatePlayerAttackDamage({
      isHintMode: true,
      stepCount: 3,
      isFinalHintStep: true,
      enemyMaxHp: 50,
      currentEnemyHp: 25,
      runBuffs: [],
    });
    expect(finalStepDamage).toBe(25);
  });

  it('reduces FP gain when CALCULATION_LAG scar is present', () => {
    expect(calculateFpGain([])).toBe(10);
    expect(calculateFpGain(['THE_BLUR'])).toBe(10);
    expect(calculateFpGain(['CALCULATION_LAG'])).toBe(5);
  });

  it('scales enemy counter damage and combat reward by tier', () => {
    expect(calculateEnemyCounterDamage(1)).toBe(7);
    expect(calculateEnemyCounterDamage(10)).toBe(25);
    expect(calculateCombatReward(1)).toBe(20);
    expect(calculateCombatReward(12)).toBe(240);
  });

  it('applies meditation recovery while clamping HP and FP', () => {
    const recovered = applyMeditationRecovery({
      ...INITIAL_STATS,
      hp: 85,
      maxHp: 100,
      fp: 60,
    });
    expect(recovered.hp).toBe(100);
    expect(recovered.fp).toBe(10);
  });

  it('consumes runHintPacks before banked hintPacks without mutating input', () => {
    const initial = { ...INITIAL_STATS, runHintPacks: 1, hintPacks: 2 };
    expect(getTotalHints(initial)).toBe(3);

    const afterFirst = consumeHintPack(initial);
    expect(afterFirst.runHintPacks).toBe(0);
    expect(afterFirst.hintPacks).toBe(2);
    expect(initial.runHintPacks).toBe(1);

    const afterSecond = consumeHintPack(afterFirst);
    expect(afterSecond.runHintPacks).toBe(0);
    expect(afterSecond.hintPacks).toBe(1);
  });

  it('formats multi-select answers numerically without mutating the source array', () => {
    const selected = ['12', '2', '6', '1'];
    const formatted = formatMultiSelectAnswer(selected);

    expect(formatted).toBe('1,2,6,12');
    expect(selected).toEqual(['12', '2', '6', '1']);
  });
});
