import {
  CombatMode,
  Enemy,
  MathProblem,
  PlayerStats,
  ProblemComplexity,
  SolvedBreadcrumb,
  StrikeMode,
} from '../types';
import { clampTier } from './dungeonLogic';
import { hasProblemSteps } from './inputUtils';

// Core Recovery & Legacy Attack Constants
export const MEDITATION_FP_COST = 50;
export const MEDITATION_HEAL_AMOUNT = 30;
export const BASE_FP_GAIN = 10;
export const LAG_SCAR_FP_GAIN = 5;
export const BASE_ATTACK_DAMAGE = 10;
export const ATTACK_DAMAGE_VARIANCE = 5;
export const ATK_UP_BONUS = 5;

// Phase 3 Conceptual Focus Scan, Apex Shield & Blue Cache Constants
export const FOCUS_SCAN_FP_GAIN = 15;
export const LAG_SCAR_FOCUS_SCAN_FP_GAIN = 8;
export const SHIELD_BREAK_FP_GAIN = 10;
export const LAG_SCAR_SHIELD_BREAK_FP_GAIN = 5;
export const APEX_SHIELD_LAYERS_DEFAULT = 2;
export const APEX_VULNERABLE_MULTIPLIER = 2;
export const BLUE_CACHE_FAIL_DAMAGE = 5;

// Combat Timing Constants
export const PATROL_INTRO_MS = 500;
export const APEX_INTRO_MS = 1200;
export const COMBO_STEP_ADVANCE_MS = 450;
export const PROBLEM_ADVANCE_MS = 700;
export const MISS_RETRY_MS = 1000;
export const MISS_REVEAL_MS = 1800;
export const COMBAT_END_MS = 1200;

// Economy & Balance Constants
export const DIRECT_STRIKE_SHARD_BONUS = 0.5;
export const ATK_UP_SHARD_BONUS_PER_STACK = 0.15;
export const APEX_SHARD_BONUS = 0.5;
export const SHARD_BASE_OFFSET = 10;
export const SHARD_PER_TIER = 8;
export const COUNTER_DAMAGE_BASE = 8;
export const COUNTER_DAMAGE_PER_TIER = 2;
export const APEX_COUNTER_MULTIPLIER = 1.25;
export const QUICK_STRIKE_HP_RATIO = 0.6;
export const BASE_STEP_FP_GAIN = 5;
export const LAG_SCAR_STEP_FP_GAIN = 3;
export const DIRECT_STRIKE_FP_GAIN = 15;
export const LAG_SCAR_DIRECT_FP_GAIN = 8;

const COMBO_WEIGHT_TABLES: Record<number, readonly number[]> = {
  2: [0.4, 0.6],
  3: [0.25, 0.35, 0.4],
  4: [0.2, 0.2, 0.25, 0.35],
};

export interface CombatTurnState {
  strikeMode: StrikeMode;
  stepIndex: number | null;
  effectiveStepCount: number;
  comboStreak: number;
  stepMissCount: number;
  damageDealtThisProblem: number;
  solvedBreadcrumbs: SolvedBreadcrumb[];
  directStrikeUsedOnKill: boolean;
  directStrikeLocked: boolean;
}

export interface CorrectResolution {
  damage: number;
  newEnemyHp: number;
  fpGain: number;
  isVictory: boolean;
  advanceToNextStep: boolean;
  nextTurn: CombatTurnState;
  delayMs: number;
  skippedFinalStepWithOverclock: boolean;
}

export interface WrongResolution {
  damage: number;
  shieldAbsorbed: boolean;
  nextShieldActive: boolean;
  newPlayerHp: number;
  isDefeat: boolean;
  revealAnswer: boolean;
  keepSameProblem: boolean;
  fellBackToCombo: boolean;
  nextTurn: CombatTurnState;
  delayMs: number;
}

export interface TacticalHintResolution {
  nextStats: PlayerStats;
  nextShieldActive: boolean;
  clueText: string | null;
  autoCompletedStep: boolean;
  attackResolution: CorrectResolution | null;
}

export interface FocusScanResolution {
  nextStats: PlayerStats;
  fpGain: number;
  newShieldLayers: number;
  shieldBroken: boolean;
}

export interface ShieldBreakResolution {
  newShieldLayers: number;
  shieldBroken: boolean;
  isVulnerable: boolean;
  fpGain: number;
}

export function isApexEnemy(enemy: Pick<Enemy, 'type' | 'isApex'>): boolean {
  return Boolean(enemy.isApex) || enemy.type.endsWith('_APEX');
}

export function getInitialEnemyShieldLayers(
  enemy: Pick<Enemy, 'type' | 'isApex' | 'shieldLayers'>
): number {
  if (typeof enemy.shieldLayers === 'number' && Number.isFinite(enemy.shieldLayers)) {
    return Math.max(0, Math.floor(enemy.shieldLayers));
  }
  return isApexEnemy(enemy) ? APEX_SHIELD_LAYERS_DEFAULT : 0;
}

export function canUseFocusScan(params: {
  focusScanUsed: boolean;
  mode: CombatMode;
  shieldLayers: number;
}): boolean {
  return !params.focusScanUsed && params.mode === 'ATTACK';
}

export function applyFocusScanSuccess(
  stats: PlayerStats,
  shieldLayers: number
): FocusScanResolution {
  const safeLayers = Number.isFinite(shieldLayers) ? Math.max(0, Math.floor(shieldLayers)) : 0;
  const fpGain = stats.neuralScars.includes('CALCULATION_LAG')
    ? LAG_SCAR_FOCUS_SCAN_FP_GAIN
    : FOCUS_SCAN_FP_GAIN;
  const newShieldLayers = Math.max(0, safeLayers - 1);
  const shieldBroken = safeLayers > 0 && newShieldLayers === 0;

  return {
    nextStats: {
      ...stats,
      fp: Math.min(stats.maxFp, stats.fp + fpGain),
    },
    fpGain,
    newShieldLayers,
    shieldBroken,
  };
}

export function resolveShieldBreakHit(params: {
  shieldLayers: number;
  neuralScars: string[];
}): ShieldBreakResolution {
  const { shieldLayers, neuralScars } = params;
  const safeLayers = Number.isFinite(shieldLayers) ? Math.max(0, Math.floor(shieldLayers)) : 0;
  const newShieldLayers = Math.max(0, safeLayers - 1);
  const shieldBroken = safeLayers > 0 && newShieldLayers === 0;
  const fpGain = neuralScars.includes('CALCULATION_LAG')
    ? LAG_SCAR_SHIELD_BREAK_FP_GAIN
    : SHIELD_BREAK_FP_GAIN;

  return {
    newShieldLayers,
    shieldBroken,
    isVulnerable: shieldBroken,
    fpGain,
  };
}

export function getAtkUpStacks(runBuffs: string[]): number {
  return runBuffs.filter((buff) => buff === 'ATK_UP').length;
}

export function getEffectiveStepCount(
  stepCount: number,
  isApex: boolean,
  runBuffs: string[]
): number {
  if (stepCount <= 0) return 0;
  if (isApex && getAtkUpStacks(runBuffs) >= 1 && stepCount >= 3) {
    return stepCount - 1;
  }
  return stepCount;
}

export function createCombatTurnState(params: {
  problem: MathProblem;
  mode: CombatMode;
  isApex: boolean;
  runBuffs: string[];
}): CombatTurnState {
  const { problem, mode, isApex, runBuffs } = params;
  const isCombo = mode === 'ATTACK' && problem.complexity === 'COMBO' && hasProblemSteps(problem);

  return {
    strikeMode: isCombo ? 'COMBO' : 'DIRECT',
    stepIndex: isCombo ? 0 : null,
    effectiveStepCount: isCombo
      ? getEffectiveStepCount(problem.steps!.length, isApex, runBuffs)
      : 0,
    comboStreak: 0,
    stepMissCount: 0,
    damageDealtThisProblem: 0,
    solvedBreadcrumbs: [],
    directStrikeUsedOnKill: false,
    directStrikeLocked: false,
  };
}

export function canToggleDirectStrike(params: {
  problem: MathProblem;
  mode: CombatMode;
  turn: CombatTurnState;
}): boolean {
  const { problem, mode, turn } = params;
  if (
    mode !== 'ATTACK' ||
    problem.complexity !== 'COMBO' ||
    !hasProblemSteps(problem) ||
    turn.directStrikeLocked
  ) {
    return false;
  }
  const atInitialStep =
    turn.strikeMode === 'COMBO' ? turn.stepIndex === 0 : turn.stepIndex === null;
  return (
    atInitialStep &&
    turn.solvedBreadcrumbs.length === 0 &&
    turn.stepMissCount === 0 &&
    turn.damageDealtThisProblem === 0
  );
}

export function toggleStrikeMode(
  problem: MathProblem,
  mode: CombatMode,
  turn: CombatTurnState
): CombatTurnState {
  if (!canToggleDirectStrike({ problem, mode, turn })) {
    return turn;
  }
  if (turn.strikeMode === 'COMBO') {
    return {
      ...turn,
      strikeMode: 'DIRECT',
      stepIndex: null,
    };
  }
  return {
    ...turn,
    strikeMode: 'COMBO',
    stepIndex: 0,
  };
}

export function calculateComboStepDamage(params: {
  stepIndex: number;
  effectiveStepCount: number;
  patrolBaseHp: number;
  damageDealtThisProblem: number;
  isVulnerable?: boolean;
}): number {
  const {
    stepIndex,
    effectiveStepCount,
    patrolBaseHp,
    damageDealtThisProblem,
    isVulnerable = false,
  } = params;
  const multiplier = isVulnerable ? APEX_VULNERABLE_MULTIPLIER : 1;
  const safeBaseHp = Number.isFinite(patrolBaseHp)
    ? Math.max(1, Math.floor(patrolBaseHp)) * multiplier
    : multiplier;
  const safeSteps = Math.max(1, Math.floor(effectiveStepCount));
  const safeIndex = Math.max(0, Math.floor(stepIndex));

  if (safeSteps <= 1 || safeIndex >= safeSteps - 1) {
    return Math.max(1, safeBaseHp - damageDealtThisProblem);
  }

  const weights = COMBO_WEIGHT_TABLES[safeSteps];
  const weight = weights
    ? weights[safeIndex]
    : (safeIndex + 1) / ((safeSteps * (safeSteps + 1)) / 2);

  const rawDamage = Math.max(1, Math.floor(safeBaseHp * weight));
  const remainingStepsAfterThis = safeSteps - 1 - safeIndex;
  const maxSafeDamage = Math.max(1, safeBaseHp - damageDealtThisProblem - remainingStepsAfterThis);
  return Math.min(rawDamage, maxSafeDamage);
}

export function calculateStrikeDamage(params: {
  strikeMode: StrikeMode;
  complexity: ProblemComplexity;
  stepIndex: number | null;
  effectiveStepCount: number;
  patrolBaseHp: number;
  damageDealtThisProblem: number;
  isVulnerable?: boolean;
}): number {
  const {
    strikeMode,
    complexity,
    stepIndex,
    effectiveStepCount,
    patrolBaseHp,
    damageDealtThisProblem,
    isVulnerable = false,
  } = params;
  const safeBaseHp = Number.isFinite(patrolBaseHp) ? Math.max(1, Math.floor(patrolBaseHp)) : 1;
  const multiplier = isVulnerable ? APEX_VULNERABLE_MULTIPLIER : 1;

  if (complexity === 'COMBO' && strikeMode === 'COMBO') {
    return calculateComboStepDamage({
      stepIndex: stepIndex ?? 0,
      effectiveStepCount: Math.max(1, effectiveStepCount),
      patrolBaseHp: safeBaseHp,
      damageDealtThisProblem,
      isVulnerable,
    });
  }

  if (complexity === 'COMBO' && strikeMode === 'DIRECT') {
    return safeBaseHp * multiplier;
  }

  return Math.ceil(safeBaseHp * QUICK_STRIKE_HP_RATIO) * multiplier;
}

/**
 * Legacy attack damage helper retained for M2 compatibility with Combat.tsx
 * until M3 migrates Combat.tsx to resolveCorrectAttack / calculateStrikeDamage.
 */
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
  const atkUpCount = getAtkUpStacks(runBuffs);
  return baseDamage + atkUpCount * ATK_UP_BONUS;
}

export function calculateEnemyCounterDamage(tier: number, isApex: boolean = false): number {
  const safeTier = clampTier(tier);
  const base = COUNTER_DAMAGE_BASE + safeTier * COUNTER_DAMAGE_PER_TIER;
  return isApex ? Math.round(base * APEX_COUNTER_MULTIPLIER) : base;
}

export function calculateFpGain(
  neuralScars: string[],
  kind: 'STEP' | 'QUICK' | 'DIRECT' = 'QUICK'
): number {
  const hasLag = neuralScars.includes('CALCULATION_LAG');
  if (kind === 'STEP') {
    return hasLag ? LAG_SCAR_STEP_FP_GAIN : BASE_STEP_FP_GAIN;
  }
  if (kind === 'DIRECT') {
    return hasLag ? LAG_SCAR_DIRECT_FP_GAIN : DIRECT_STRIKE_FP_GAIN;
  }
  return hasLag ? LAG_SCAR_FP_GAIN : BASE_FP_GAIN;
}

export function calculateCombatReward(
  tierOrParams:
    | number
    | {
        tier: number;
        directStrikeBonus?: boolean;
        runBuffs?: string[];
        isApex?: boolean;
      }
): number {
  const {
    tier,
    directStrikeBonus = false,
    runBuffs = [],
    isApex = false,
  } = typeof tierOrParams === 'number' ? { tier: tierOrParams } : tierOrParams;

  const safeTier = clampTier(tier);
  const base = SHARD_BASE_OFFSET + safeTier * SHARD_PER_TIER;
  const apexMultiplier = 1 + (isApex ? APEX_SHARD_BONUS : 0);
  const bonusMultiplier =
    1 +
    (directStrikeBonus ? DIRECT_STRIKE_SHARD_BONUS : 0) +
    getAtkUpStacks(runBuffs) * ATK_UP_SHARD_BONUS_PER_STACK;

  return Math.round(base * apexMultiplier * bonusMultiplier);
}

export function resolveCorrectAttack(params: {
  problem: MathProblem;
  turn: CombatTurnState;
  currentEnemyHp: number;
  patrolBaseHp: number;
  neuralScars: string[];
  isApex: boolean;
  runBuffs: string[];
  isVulnerable?: boolean;
}): CorrectResolution {
  const {
    problem,
    turn,
    currentEnemyHp,
    patrolBaseHp,
    neuralScars,
    isApex,
    runBuffs,
    isVulnerable = false,
  } = params;
  const isComboStep =
    problem.complexity === 'COMBO' &&
    turn.strikeMode === 'COMBO' &&
    hasProblemSteps(problem) &&
    turn.stepIndex !== null;

  const totalRawSteps = hasProblemSteps(problem) ? problem.steps!.length : 0;
  const effectiveSteps = isComboStep
    ? Math.max(1, turn.effectiveStepCount || getEffectiveStepCount(totalRawSteps, isApex, runBuffs))
    : 0;

  const damage = calculateStrikeDamage({
    strikeMode: turn.strikeMode,
    complexity: problem.complexity,
    stepIndex: turn.stepIndex,
    effectiveStepCount: effectiveSteps,
    patrolBaseHp,
    damageDealtThisProblem: turn.damageDealtThisProblem,
    isVulnerable,
  });

  const newEnemyHp = Math.max(0, currentEnemyHp - damage);
  const isVictory = newEnemyHp <= 0;

  const fpKind: 'STEP' | 'QUICK' | 'DIRECT' = isComboStep
    ? 'STEP'
    : problem.complexity === 'COMBO' && turn.strikeMode === 'DIRECT'
      ? 'DIRECT'
      : 'QUICK';
  const fpGain = calculateFpGain(neuralScars, fpKind);

  const directStrikeUsedOnKill =
    isVictory && problem.complexity === 'COMBO' && turn.strikeMode === 'DIRECT';

  if (isComboStep) {
    const currentStepIndex = turn.stepIndex!;
    const currentStep = problem.steps![currentStepIndex];
    const breadcrumb: SolvedBreadcrumb = {
      stepIndex: currentStepIndex,
      label: currentStep?.resultLabel ?? String(currentStep?.answer ?? ''),
      answer: String(currentStep?.answer ?? ''),
    };

    const nextStepIndex = currentStepIndex + 1;
    const isFinalEffectiveStep = nextStepIndex >= effectiveSteps;
    const skippedFinalStepWithOverclock = isFinalEffectiveStep && effectiveSteps < totalRawSteps;
    const advanceToNextStep = !isVictory && !isFinalEffectiveStep;
    const delayMs = isVictory
      ? COMBAT_END_MS
      : advanceToNextStep
        ? COMBO_STEP_ADVANCE_MS
        : PROBLEM_ADVANCE_MS;

    return {
      damage,
      newEnemyHp,
      fpGain,
      isVictory,
      advanceToNextStep,
      skippedFinalStepWithOverclock,
      delayMs,
      nextTurn: {
        ...turn,
        stepIndex: advanceToNextStep ? nextStepIndex : currentStepIndex,
        effectiveStepCount: effectiveSteps,
        comboStreak: turn.comboStreak + 1,
        stepMissCount: 0,
        damageDealtThisProblem: turn.damageDealtThisProblem + damage,
        solvedBreadcrumbs: [...turn.solvedBreadcrumbs, breadcrumb],
        directStrikeUsedOnKill,
      },
    };
  }

  return {
    damage,
    newEnemyHp,
    fpGain,
    isVictory,
    advanceToNextStep: false,
    skippedFinalStepWithOverclock: false,
    delayMs: isVictory ? COMBAT_END_MS : PROBLEM_ADVANCE_MS,
    nextTurn: {
      ...turn,
      comboStreak: turn.comboStreak + 1,
      stepMissCount: 0,
      damageDealtThisProblem: turn.damageDealtThisProblem + damage,
      directStrikeUsedOnKill,
    },
  };
}

export function resolveWrongAttack(params: {
  problem: MathProblem;
  mode: CombatMode;
  turn: CombatTurnState;
  tier: number;
  isApex: boolean;
  currentPlayerHp: number;
  shieldActive: boolean;
}): WrongResolution {
  const { problem, mode, turn, tier, isApex, currentPlayerHp, shieldActive } = params;
  const rawDamage = calculateEnemyCounterDamage(tier, isApex);
  const shieldAbsorbed = shieldActive;
  const damage = shieldAbsorbed ? 0 : rawDamage;
  const nextShieldActive = false;
  const newPlayerHp = Math.max(0, currentPlayerHp - damage);
  const isDefeat = newPlayerHp <= 0;

  // Direct Strike miss on a COMBO problem falls back to Step 0 of the same problem
  if (
    mode === 'ATTACK' &&
    problem.complexity === 'COMBO' &&
    turn.strikeMode === 'DIRECT' &&
    hasProblemSteps(problem)
  ) {
    return {
      damage,
      shieldAbsorbed,
      nextShieldActive,
      newPlayerHp,
      isDefeat,
      revealAnswer: false,
      keepSameProblem: true,
      fellBackToCombo: true,
      delayMs: isDefeat ? COMBAT_END_MS : MISS_RETRY_MS,
      nextTurn: {
        ...turn,
        strikeMode: 'COMBO',
        stepIndex: 0,
        effectiveStepCount:
          turn.effectiveStepCount > 0 ? turn.effectiveStepCount : problem.steps!.length,
        comboStreak: 0,
        stepMissCount: 0,
        solvedBreadcrumbs: [],
        directStrikeUsedOnKill: false,
        directStrikeLocked: true,
      },
    };
  }

  // Mid-chain COMBO miss stays on the same step, preserves breadcrumbs, reveals on 2nd miss
  if (
    mode === 'ATTACK' &&
    problem.complexity === 'COMBO' &&
    turn.strikeMode === 'COMBO' &&
    hasProblemSteps(problem)
  ) {
    const nextMissCount = turn.stepMissCount + 1;
    const revealAnswer = nextMissCount >= 2;
    return {
      damage,
      shieldAbsorbed,
      nextShieldActive,
      newPlayerHp,
      isDefeat,
      revealAnswer,
      keepSameProblem: true,
      fellBackToCombo: false,
      delayMs: isDefeat ? COMBAT_END_MS : revealAnswer ? MISS_REVEAL_MS : MISS_RETRY_MS,
      nextTurn: {
        ...turn,
        comboStreak: 0,
        stepMissCount: nextMissCount,
      },
    };
  }

  // QUICK or conceptual (MEDITATION / FOCUS_SCAN / SHIELD_BREAK) miss reveals the answer and advances
  return {
    damage,
    shieldAbsorbed,
    nextShieldActive,
    newPlayerHp,
    isDefeat,
    revealAnswer: true,
    keepSameProblem: false,
    fellBackToCombo: false,
    delayMs: isDefeat ? COMBAT_END_MS : MISS_REVEAL_MS,
    nextTurn: {
      ...turn,
      comboStreak: 0,
      stepMissCount: turn.stepMissCount + 1,
    },
  };
}

export function applyTacticalHint(params: {
  stats: PlayerStats;
  problem: MathProblem;
  turn: CombatTurnState;
  currentEnemyHp: number;
  patrolBaseHp: number;
  isApex: boolean;
  shieldActive?: boolean;
  isVulnerable?: boolean;
}): TacticalHintResolution {
  const {
    stats,
    problem,
    turn,
    currentEnemyHp,
    patrolBaseHp,
    isApex,
    shieldActive = false,
    isVulnerable = false,
  } = params;

  if (getTotalHints(stats) <= 0) {
    return {
      nextStats: stats,
      nextShieldActive: shieldActive,
      clueText: null,
      autoCompletedStep: false,
      attackResolution: null,
    };
  }

  const nextStats = consumeHintPack(stats);
  const nextShieldActive = true;

  if (problem.complexity === 'COMBO' && hasProblemSteps(problem)) {
    const comboTurn: CombatTurnState =
      turn.strikeMode === 'DIRECT'
        ? {
            ...turn,
            strikeMode: 'COMBO',
            stepIndex: 0,
            effectiveStepCount:
              turn.effectiveStepCount > 0
                ? turn.effectiveStepCount
                : getEffectiveStepCount(problem.steps!.length, isApex, stats.runBuffs),
          }
        : turn;

    const activeIndex = comboTurn.stepIndex ?? 0;
    const activeStep = problem.steps![activeIndex];
    const clueText = activeStep?.clue ?? null;

    const attackResolution = resolveCorrectAttack({
      problem,
      turn: comboTurn,
      currentEnemyHp,
      patrolBaseHp,
      neuralScars: stats.neuralScars,
      isApex,
      runBuffs: stats.runBuffs,
      isVulnerable,
    });

    return {
      nextStats,
      nextShieldActive,
      clueText,
      autoCompletedStep: true,
      attackResolution,
    };
  }

  return {
    nextStats,
    nextShieldActive,
    clueText: problem.steps?.[0]?.clue ?? null,
    autoCompletedStep: false,
    attackResolution: null,
  };
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
