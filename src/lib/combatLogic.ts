import { PlayerStats } from '../types';

export const MEDITATION_FP_COST = 50;
export const MEDITATION_HEAL_AMOUNT = 30;
export const BASE_FP_GAIN = 10;
export const LAG_SCAR_FP_GAIN = 5;
export const BASE_ATTACK_DAMAGE = 10;
export const ATTACK_DAMAGE_VARIANCE = 5;
export const ATK_UP_BONUS = 5;

export function calculatePlayerAttackDamage(params: {
  isHintMode: boolean;
  stepCount: number;
  isFinalHintStep: boolean;
  enemyMaxHp: number;
  currentEnemyHp: number;
  runBuffs: string[];
  rng?: () => number;
}): number {
  const {
    isHintMode,
    stepCount,
    isFinalHintStep,
    enemyMaxHp,
    currentEnemyHp,
    runBuffs,
    rng = Math.random,
  } = params;

  if (isHintMode && stepCount > 0) {
    const stepDamage = Math.ceil(enemyMaxHp / stepCount);
    return isFinalHintStep ? Math.max(stepDamage, currentEnemyHp) : stepDamage;
  }

  const baseDamage = BASE_ATTACK_DAMAGE + Math.floor(rng() * ATTACK_DAMAGE_VARIANCE);
  const atkUpCount = runBuffs.filter((buff) => buff === 'ATK_UP').length;
  return baseDamage + atkUpCount * ATK_UP_BONUS;
}

export function calculateEnemyCounterDamage(tier: number): number {
  return 5 + tier * 2;
}

export function calculateFpGain(neuralScars: string[]): number {
  return neuralScars.includes('CALCULATION_LAG') ? LAG_SCAR_FP_GAIN : BASE_FP_GAIN;
}

export function calculateCombatReward(tier: number): number {
  return 20 * tier;
}

export function applyMeditationRecovery(stats: PlayerStats): PlayerStats {
  return {
    ...stats,
    hp: Math.min(stats.maxHp, stats.hp + MEDITATION_HEAL_AMOUNT),
    fp: Math.max(0, stats.fp - MEDITATION_FP_COST),
  };
}

export function consumeHintPack(stats: PlayerStats): PlayerStats {
  if (stats.runHintPacks > 0) {
    return { ...stats, runHintPacks: stats.runHintPacks - 1 };
  }
  if (stats.hintPacks > 0) {
    return { ...stats, hintPacks: stats.hintPacks - 1 };
  }
  return stats;
}

export function getTotalHints(stats: PlayerStats): number {
  return stats.runHintPacks + stats.hintPacks;
}

export function formatMultiSelectAnswer(selectedOptions: string[]): string {
  return [...selectedOptions]
    .sort((a, b) => Number(a) - Number(b))
    .join(',');
}
