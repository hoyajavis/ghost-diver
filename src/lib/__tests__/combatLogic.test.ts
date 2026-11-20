import { describe, expect, it } from 'vitest';
import {
  APEX_INTRO_MS,
  APEX_SHIELD_LAYERS_DEFAULT,
  APEX_VULNERABLE_MULTIPLIER,
  applyFocusScanSuccess,
  applyMeditationRecovery,
  applyTacticalHint,
  BLUE_CACHE_FAIL_DAMAGE,
  calculateCombatReward,
  calculateComboStepDamage,
  calculateEnemyCounterDamage,
  calculateFpGain,
  calculatePlayerAttackDamage,
  calculateStrikeDamage,
  canToggleDirectStrike,
  canUseFocusScan,
  COMBAT_END_MS,
  COMBO_STEP_ADVANCE_MS,
  consumeHintPack,
  createCombatTurnState,
  FOCUS_SCAN_FP_GAIN,
  formatMultiSelectAnswer,
  getAtkUpStacks,
  getEffectiveStepCount,
  getInitialEnemyShieldLayers,
  getTotalHints,
  isApexEnemy,
  LAG_SCAR_FOCUS_SCAN_FP_GAIN,
  LAG_SCAR_SHIELD_BREAK_FP_GAIN,
  MISS_RETRY_MS,
  MISS_REVEAL_MS,
  PATROL_INTRO_MS,
  PROBLEM_ADVANCE_MS,
  resolveCorrectAttack,
  resolveShieldBreakHit,
  resolveWrongAttack,
  SHIELD_BREAK_FP_GAIN,
  toggleStrikeMode,
} from '../combatLogic';
import { getApexHpForTier, getPatrolBaseHpForTier } from '../dungeonLogic';
import { INITIAL_STATS } from '../storage';
import { MathProblem } from '../../types';

const SAMPLE_COMBO_PROBLEM: MathProblem = {
  question: 'Solve: 2x + 4 = 14',
  answer: 5,
  type: 'ATTACK',
  complexity: 'COMBO',
  steps: [
    {
      prompt: 'Subtract 4 from 14',
      answer: 10,
      clue: 'Undo +4 by subtracting 4 from both sides.',
      resultLabel: '2x = 10',
    },
    {
      prompt: 'Divide 10 by 2',
      answer: 5,
      clue: 'Divide both sides by 2 to isolate x.',
      resultLabel: 'x = 5',
    },
    {
      prompt: 'Check: what is 2(5) + 4?',
      answer: 14,
      clue: 'Substitute x = 5 back into 2x + 4.',
      resultLabel: '2(5)+4 = 14',
    },
  ],
};

const SAMPLE_QUICK_PROBLEM: MathProblem = {
  question: 'What is 8 × 7?',
  answer: 56,
  type: 'ATTACK',
  complexity: 'QUICK',
  steps: [
    {
      prompt: 'Multiply 8 by 7',
      answer: 56,
      clue: 'Think 8 × 5 = 40 plus 8 × 2 = 16.',
      resultLabel: '8 × 7 = 56',
    },
  ],
};

const SAMPLE_MEDITATION_PROBLEM: MathProblem = {
  question: 'What is 6 + 9?',
  answer: 15,
  type: 'MEDITATION',
  complexity: 'QUICK',
};

describe('combatLogic', () => {
  it('exports expected Phase 2 combat timing constants', () => {
    expect(PATROL_INTRO_MS).toBe(500);
    expect(APEX_INTRO_MS).toBe(1200);
    expect(COMBO_STEP_ADVANCE_MS).toBe(450);
    expect(PROBLEM_ADVANCE_MS).toBe(700);
    expect(MISS_RETRY_MS).toBe(1000);
    expect(MISS_REVEAL_MS).toBe(1800);
    expect(COMBAT_END_MS).toBe(1200);
  });

  it('identifies Apex enemies, ATK_UP stacks, and effective step counts', () => {
    expect(isApexEnemy({ type: 'SURFACE_WASTES' })).toBe(false);
    expect(isApexEnemy({ type: 'SURFACE_WASTES_APEX' })).toBe(true);

    expect(getAtkUpStacks([])).toBe(0);
    expect(getAtkUpStacks(['ATK_UP', 'OTHER', 'ATK_UP'])).toBe(2);

    // Patrol never skips steps
    expect(getEffectiveStepCount(3, false, ['ATK_UP'])).toBe(3);
    // Apex without ATK_UP does not skip steps
    expect(getEffectiveStepCount(3, true, [])).toBe(3);
    // Apex with ATK_UP skips final step when stepCount >= 3
    expect(getEffectiveStepCount(3, true, ['ATK_UP'])).toBe(2);
    expect(getEffectiveStepCount(4, true, ['ATK_UP', 'ATK_UP'])).toBe(3);
    // 2-step Apex does not drop below 2
    expect(getEffectiveStepCount(2, true, ['ATK_UP'])).toBe(2);
  });

  it('initializes turn state to COMBO for COMBO problems and DIRECT for QUICK/MEDITATION', () => {
    const comboTurn = createCombatTurnState({
      problem: SAMPLE_COMBO_PROBLEM,
      mode: 'ATTACK',
      isApex: false,
      runBuffs: [],
    });
    expect(comboTurn.strikeMode).toBe('COMBO');
    expect(comboTurn.stepIndex).toBe(0);
    expect(comboTurn.effectiveStepCount).toBe(3);

    const apexOverclockTurn = createCombatTurnState({
      problem: SAMPLE_COMBO_PROBLEM,
      mode: 'ATTACK',
      isApex: true,
      runBuffs: ['ATK_UP'],
    });
    expect(apexOverclockTurn.strikeMode).toBe('COMBO');
    expect(apexOverclockTurn.effectiveStepCount).toBe(2);

    const quickTurn = createCombatTurnState({
      problem: SAMPLE_QUICK_PROBLEM,
      mode: 'ATTACK',
      isApex: false,
      runBuffs: [],
    });
    expect(quickTurn.strikeMode).toBe('DIRECT');
    expect(quickTurn.stepIndex).toBeNull();

    const medTurn = createCombatTurnState({
      problem: SAMPLE_COMBO_PROBLEM,
      mode: 'MEDITATION',
      isApex: false,
      runBuffs: [],
    });
    expect(medTurn.strikeMode).toBe('DIRECT');
    expect(medTurn.stepIndex).toBeNull();
  });

  it('allows toggling Direct Strike only before Step 1 on COMBO attack problems', () => {
    const initial = createCombatTurnState({
      problem: SAMPLE_COMBO_PROBLEM,
      mode: 'ATTACK',
      isApex: false,
      runBuffs: [],
    });
    expect(canToggleDirectStrike({ problem: SAMPLE_COMBO_PROBLEM, mode: 'ATTACK', turn: initial })).toBe(true);

    const toggledDirect = toggleStrikeMode(SAMPLE_COMBO_PROBLEM, 'ATTACK', initial);
    expect(toggledDirect.strikeMode).toBe('DIRECT');
    expect(toggledDirect.stepIndex).toBeNull();
    expect(canToggleDirectStrike({ problem: SAMPLE_COMBO_PROBLEM, mode: 'ATTACK', turn: toggledDirect })).toBe(true);

    const toggledBack = toggleStrikeMode(SAMPLE_COMBO_PROBLEM, 'ATTACK', toggledDirect);
    expect(toggledBack.strikeMode).toBe('COMBO');
    expect(toggledBack.stepIndex).toBe(0);

    // Disallowed on QUICK or MEDITATION
    const quickTurn = createCombatTurnState({
      problem: SAMPLE_QUICK_PROBLEM,
      mode: 'ATTACK',
      isApex: false,
      runBuffs: [],
    });
    expect(canToggleDirectStrike({ problem: SAMPLE_QUICK_PROBLEM, mode: 'ATTACK', turn: quickTurn })).toBe(false);
    expect(toggleStrikeMode(SAMPLE_QUICK_PROBLEM, 'ATTACK', quickTurn)).toBe(quickTurn);
    expect(canToggleDirectStrike({ problem: SAMPLE_COMBO_PROBLEM, mode: 'MEDITATION', turn: initial })).toBe(false);

    // Disallowed after Step 1 solved or after a miss
    const afterStep1 = { ...initial, stepIndex: 1, solvedBreadcrumbs: [{ stepIndex: 0, label: '2x = 10', answer: '10' }] };
    expect(canToggleDirectStrike({ problem: SAMPLE_COMBO_PROBLEM, mode: 'ATTACK', turn: afterStep1 })).toBe(false);

    const afterMiss = { ...initial, stepMissCount: 1 };
    expect(canToggleDirectStrike({ problem: SAMPLE_COMBO_PROBLEM, mode: 'ATTACK', turn: afterMiss })).toBe(false);
  });

  it('guarantees 1 full Combo Chain equals exact patrolBaseHp across 2, 3, 4, and 5 steps for every tier', () => {
    for (let tier = 1; tier <= 12; tier++) {
      const patrolHp = getPatrolBaseHpForTier(tier);
      for (const stepCount of [2, 3, 4, 5]) {
        let dealt = 0;
        const stepDamages: number[] = [];
        for (let stepIndex = 0; stepIndex < stepCount; stepIndex++) {
          const dmg = calculateComboStepDamage({
            stepIndex,
            effectiveStepCount: stepCount,
            patrolBaseHp: patrolHp,
            damageDealtThisProblem: dealt,
          });
          expect(dmg).toBeGreaterThanOrEqual(1);
          stepDamages.push(dmg);
          dealt += dmg;
        }
        expect(dealt).toBe(patrolHp);
        // Final step should be at least as large as the first step (rising combo feel)
        expect(stepDamages[stepDamages.length - 1]).toBeGreaterThanOrEqual(stepDamages[0]);
      }
    }
  });

  it('calibrates Direct Strike and Quick Strike TTK for patrols (1.0x) and Apex Sentinels (1.5x)', () => {
    for (let tier = 1; tier <= 12; tier++) {
      const patrolHp = getPatrolBaseHpForTier(tier);
      const apexHp = getApexHpForTier(tier);

      const directDmg = calculateStrikeDamage({
        strikeMode: 'DIRECT',
        complexity: 'COMBO',
        stepIndex: null,
        effectiveStepCount: 0,
        patrolBaseHp: patrolHp,
        damageDealtThisProblem: 0,
      });
      expect(directDmg).toBe(patrolHp); // 1-shots patrol

      const quickDmg = calculateStrikeDamage({
        strikeMode: 'DIRECT',
        complexity: 'QUICK',
        stepIndex: null,
        effectiveStepCount: 0,
        patrolBaseHp: patrolHp,
        damageDealtThisProblem: 0,
      });
      expect(quickDmg).toBe(Math.ceil(patrolHp * 0.6));
      expect(quickDmg * 2).toBeGreaterThanOrEqual(patrolHp); // 2 Quick Strikes kill patrol
      expect(directDmg + quickDmg).toBeGreaterThanOrEqual(apexHp); // 1 Combo/Direct + 1 Quick kills Apex
    }
  });

  it('resolves a full 3-step Combo Chain on a patrol with exact kill, breadcrumbs, and timings', () => {
    const patrolHp = getPatrolBaseHpForTier(3); // 50
    let turn = createCombatTurnState({
      problem: SAMPLE_COMBO_PROBLEM,
      mode: 'ATTACK',
      isApex: false,
      runBuffs: [],
    });
    let enemyHp = patrolHp;

    const step1 = resolveCorrectAttack({
      problem: SAMPLE_COMBO_PROBLEM,
      turn,
      currentEnemyHp: enemyHp,
      patrolBaseHp: patrolHp,
      neuralScars: [],
      isApex: false,
      runBuffs: [],
    });
    expect(step1.isVictory).toBe(false);
    expect(step1.advanceToNextStep).toBe(true);
    expect(step1.delayMs).toBe(COMBO_STEP_ADVANCE_MS);
    expect(step1.fpGain).toBe(5);
    expect(step1.nextTurn.stepIndex).toBe(1);
    expect(step1.nextTurn.comboStreak).toBe(1);
    expect(step1.nextTurn.solvedBreadcrumbs).toEqual([
      { stepIndex: 0, label: '2x = 10', answer: '10' },
    ]);

    enemyHp = step1.newEnemyHp;
    turn = step1.nextTurn;

    const step2 = resolveCorrectAttack({
      problem: SAMPLE_COMBO_PROBLEM,
      turn,
      currentEnemyHp: enemyHp,
      patrolBaseHp: patrolHp,
      neuralScars: [],
      isApex: false,
      runBuffs: [],
    });
    expect(step2.isVictory).toBe(false);
    expect(step2.advanceToNextStep).toBe(true);
    expect(step2.nextTurn.stepIndex).toBe(2);
    expect(step2.nextTurn.comboStreak).toBe(2);

    enemyHp = step2.newEnemyHp;
    turn = step2.nextTurn;

    const step3 = resolveCorrectAttack({
      problem: SAMPLE_COMBO_PROBLEM,
      turn,
      currentEnemyHp: enemyHp,
      patrolBaseHp: patrolHp,
      neuralScars: [],
      isApex: false,
      runBuffs: [],
    });
    expect(step3.isVictory).toBe(true);
    expect(step3.newEnemyHp).toBe(0);
    expect(step3.advanceToNextStep).toBe(false);
    expect(step3.delayMs).toBe(COMBAT_END_MS);
    expect(step3.nextTurn.directStrikeUsedOnKill).toBe(false);
    expect(step1.damage + step2.damage + step3.damage).toBe(patrolHp);
  });

  it('triggers Overclock Finisher (step-skip) on 3-step Apex encounter with ATK_UP', () => {
    const patrolHp = getPatrolBaseHpForTier(1); // 30
    const apexHp = getApexHpForTier(1); // 45
    const runBuffs = ['ATK_UP'];

    const turn0 = createCombatTurnState({
      problem: SAMPLE_COMBO_PROBLEM,
      mode: 'ATTACK',
      isApex: true,
      runBuffs,
    });
    expect(turn0.effectiveStepCount).toBe(2);

    const step1 = resolveCorrectAttack({
      problem: SAMPLE_COMBO_PROBLEM,
      turn: turn0,
      currentEnemyHp: apexHp,
      patrolBaseHp: patrolHp,
      neuralScars: [],
      isApex: true,
      runBuffs,
    });
    expect(step1.advanceToNextStep).toBe(true);
    expect(step1.skippedFinalStepWithOverclock).toBe(false);

    const step2 = resolveCorrectAttack({
      problem: SAMPLE_COMBO_PROBLEM,
      turn: step1.nextTurn,
      currentEnemyHp: step1.newEnemyHp,
      patrolBaseHp: patrolHp,
      neuralScars: [],
      isApex: true,
      runBuffs,
    });
    expect(step2.skippedFinalStepWithOverclock).toBe(true);
    expect(step2.advanceToNextStep).toBe(false);
    expect(step2.isVictory).toBe(false);
    expect(step1.damage + step2.damage).toBe(patrolHp);
    expect(step2.newEnemyHp).toBe(apexHp - patrolHp); // 15 HP remaining
    expect(step2.delayMs).toBe(PROBLEM_ADVANCE_MS);
  });

  it('marks directStrikeUsedOnKill only when a Direct Strike on a COMBO problem deals lethal damage', () => {
    const patrolHp = getPatrolBaseHpForTier(2); // 40
    const apexHp = getApexHpForTier(2); // 60
    const directTurn = toggleStrikeMode(
      SAMPLE_COMBO_PROBLEM,
      'ATTACK',
      createCombatTurnState({
        problem: SAMPLE_COMBO_PROBLEM,
        mode: 'ATTACK',
        isApex: false,
        runBuffs: [],
      })
    );

    const patrolKill = resolveCorrectAttack({
      problem: SAMPLE_COMBO_PROBLEM,
      turn: directTurn,
      currentEnemyHp: patrolHp,
      patrolBaseHp: patrolHp,
      neuralScars: [],
      isApex: false,
      runBuffs: [],
    });
    expect(patrolKill.isVictory).toBe(true);
    expect(patrolKill.fpGain).toBe(15);
    expect(patrolKill.nextTurn.directStrikeUsedOnKill).toBe(true);

    const apexChunk = resolveCorrectAttack({
      problem: SAMPLE_COMBO_PROBLEM,
      turn: directTurn,
      currentEnemyHp: apexHp,
      patrolBaseHp: patrolHp,
      neuralScars: [],
      isApex: true,
      runBuffs: [],
    });
    expect(apexChunk.isVictory).toBe(false);
    expect(apexChunk.newEnemyHp).toBe(20);
    expect(apexChunk.nextTurn.directStrikeUsedOnKill).toBe(false);
  });

  it('falls back to COMBO Step 0 on Direct Strike miss without revealing the final answer', () => {
    const initial = createCombatTurnState({
      problem: SAMPLE_COMBO_PROBLEM,
      mode: 'ATTACK',
      isApex: false,
      runBuffs: [],
    });
    const directTurn = toggleStrikeMode(SAMPLE_COMBO_PROBLEM, 'ATTACK', initial);

    const wrong = resolveWrongAttack({
      problem: SAMPLE_COMBO_PROBLEM,
      mode: 'ATTACK',
      turn: directTurn,
      tier: 1,
      isApex: false,
      currentPlayerHp: 100,
      shieldActive: false,
    });

    expect(wrong.damage).toBe(10);
    expect(wrong.newPlayerHp).toBe(90);
    expect(wrong.shieldAbsorbed).toBe(false);
    expect(wrong.revealAnswer).toBe(false);
    expect(wrong.keepSameProblem).toBe(true);
    expect(wrong.fellBackToCombo).toBe(true);
    expect(wrong.delayMs).toBe(MISS_RETRY_MS);
    expect(wrong.nextTurn.strikeMode).toBe('COMBO');
    expect(wrong.nextTurn.stepIndex).toBe(0);
    expect(wrong.nextTurn.comboStreak).toBe(0);
    expect(wrong.nextTurn.stepMissCount).toBe(0);
    expect(wrong.nextTurn.directStrikeLocked).toBe(true);
    expect(
      canToggleDirectStrike({
        problem: SAMPLE_COMBO_PROBLEM,
        mode: 'ATTACK',
        turn: wrong.nextTurn,
      })
    ).toBe(false);
    expect(toggleStrikeMode(SAMPLE_COMBO_PROBLEM, 'ATTACK', wrong.nextTurn)).toBe(wrong.nextTurn);
  });

  it('preserves breadcrumbs on mid-chain miss, reveals after 2nd miss, and supports Shield absorption', () => {
    const turnOnStep2 = {
      ...createCombatTurnState({
        problem: SAMPLE_COMBO_PROBLEM,
        mode: 'ATTACK',
        isApex: false,
        runBuffs: [],
      }),
      stepIndex: 1,
      comboStreak: 1,
      solvedBreadcrumbs: [{ stepIndex: 0, label: '2x = 10', answer: '10' }],
    };

    // 1st miss absorbed by Shield
    const miss1 = resolveWrongAttack({
      problem: SAMPLE_COMBO_PROBLEM,
      mode: 'ATTACK',
      turn: turnOnStep2,
      tier: 3,
      isApex: false,
      currentPlayerHp: 80,
      shieldActive: true,
    });
    expect(miss1.damage).toBe(0);
    expect(miss1.shieldAbsorbed).toBe(true);
    expect(miss1.nextShieldActive).toBe(false);
    expect(miss1.newPlayerHp).toBe(80);
    expect(miss1.revealAnswer).toBe(false);
    expect(miss1.keepSameProblem).toBe(true);
    expect(miss1.delayMs).toBe(MISS_RETRY_MS);
    expect(miss1.nextTurn.stepIndex).toBe(1);
    expect(miss1.nextTurn.comboStreak).toBe(0);
    expect(miss1.nextTurn.stepMissCount).toBe(1);
    expect(miss1.nextTurn.solvedBreadcrumbs).toEqual(turnOnStep2.solvedBreadcrumbs);

    // 2nd miss reveals step answer and deals counter-damage
    const miss2 = resolveWrongAttack({
      problem: SAMPLE_COMBO_PROBLEM,
      mode: 'ATTACK',
      turn: miss1.nextTurn,
      tier: 3,
      isApex: false,
      currentPlayerHp: miss1.newPlayerHp,
      shieldActive: miss1.nextShieldActive,
    });
    expect(miss2.damage).toBe(14);
    expect(miss2.newPlayerHp).toBe(66);
    expect(miss2.revealAnswer).toBe(true);
    expect(miss2.keepSameProblem).toBe(true);
    expect(miss2.delayMs).toBe(MISS_REVEAL_MS);
    expect(miss2.nextTurn.stepIndex).toBe(1);
    expect(miss2.nextTurn.solvedBreadcrumbs).toEqual(turnOnStep2.solvedBreadcrumbs);

    // QUICK / MEDITATION miss reveals answer and moves to next problem
    const quickTurn = createCombatTurnState({
      problem: SAMPLE_MEDITATION_PROBLEM,
      mode: 'MEDITATION',
      isApex: false,
      runBuffs: [],
    });
    const medMiss = resolveWrongAttack({
      problem: SAMPLE_MEDITATION_PROBLEM,
      mode: 'MEDITATION',
      turn: quickTurn,
      tier: 1,
      isApex: false,
      currentPlayerHp: 5,
      shieldActive: false,
    });
    expect(medMiss.revealAnswer).toBe(true);
    expect(medMiss.keepSameProblem).toBe(false);
    expect(medMiss.isDefeat).toBe(true);
    expect(medMiss.newPlayerHp).toBe(0);
    expect(medMiss.delayMs).toBe(COMBAT_END_MS);
  });

  it('applies Tactical Hint Pack: consumes pack, activates Shield, surfaces clue, and auto-completes COMBO step', () => {
    const stats = { ...INITIAL_STATS, runHintPacks: 1, hintPacks: 2 };
    const patrolHp = getPatrolBaseHpForTier(1); // 30
    const directTurn = toggleStrikeMode(
      SAMPLE_COMBO_PROBLEM,
      'ATTACK',
      createCombatTurnState({
        problem: SAMPLE_COMBO_PROBLEM,
        mode: 'ATTACK',
        isApex: false,
        runBuffs: [],
      })
    );

    // Invoked in DIRECT mode on a COMBO problem -> drops to COMBO Step 0 and auto-completes Step 0
    const comboHint = applyTacticalHint({
      stats,
      problem: SAMPLE_COMBO_PROBLEM,
      turn: directTurn,
      currentEnemyHp: patrolHp,
      patrolBaseHp: patrolHp,
      isApex: false,
    });
    expect(comboHint.nextStats.runHintPacks).toBe(0);
    expect(comboHint.nextStats.hintPacks).toBe(2);
    expect(comboHint.nextShieldActive).toBe(true);
    expect(comboHint.clueText).toBe('Undo +4 by subtracting 4 from both sides.');
    expect(comboHint.autoCompletedStep).toBe(true);
    expect(comboHint.attackResolution).not.toBeNull();
    expect(comboHint.attackResolution!.nextTurn.strikeMode).toBe('COMBO');
    expect(comboHint.attackResolution!.nextTurn.stepIndex).toBe(1);
    expect(comboHint.attackResolution!.nextTurn.solvedBreadcrumbs).toEqual([
      { stepIndex: 0, label: '2x = 10', answer: '10' },
    ]);

    // Invoked on a QUICK problem -> activates Shield + reveals clue without skipping the problem
    const quickTurn = createCombatTurnState({
      problem: SAMPLE_QUICK_PROBLEM,
      mode: 'ATTACK',
      isApex: false,
      runBuffs: [],
    });
    const quickHint = applyTacticalHint({
      stats: comboHint.nextStats,
      problem: SAMPLE_QUICK_PROBLEM,
      turn: quickTurn,
      currentEnemyHp: patrolHp,
      patrolBaseHp: patrolHp,
      isApex: false,
    });
    expect(quickHint.nextStats.runHintPacks).toBe(0);
    expect(quickHint.nextStats.hintPacks).toBe(1);
    expect(quickHint.nextShieldActive).toBe(true);
    expect(quickHint.clueText).toBe('Think 8 × 5 = 40 plus 8 × 2 = 16.');
    expect(quickHint.autoCompletedStep).toBe(false);
    expect(quickHint.attackResolution).toBeNull();
  });

  it('calculates calibrated FP gains across STEP, QUICK, and DIRECT with and without CALCULATION_LAG', () => {
    expect(calculateFpGain([])).toBe(10);
    expect(calculateFpGain(['THE_BLUR'])).toBe(10);
    expect(calculateFpGain(['CALCULATION_LAG'])).toBe(5);

    expect(calculateFpGain([], 'STEP')).toBe(5);
    expect(calculateFpGain(['CALCULATION_LAG'], 'STEP')).toBe(3);

    expect(calculateFpGain([], 'DIRECT')).toBe(15);
    expect(calculateFpGain(['CALCULATION_LAG'], 'DIRECT')).toBe(8);
  });

  it('scales enemy counter damage (including 1.25x Apex) and calibrated Shard rewards', () => {
    expect(calculateEnemyCounterDamage(1)).toBe(10);
    expect(calculateEnemyCounterDamage(1, true)).toBe(13);
    expect(calculateEnemyCounterDamage(5)).toBe(18);
    expect(calculateEnemyCounterDamage(5, true)).toBe(23);
    expect(calculateEnemyCounterDamage(12)).toBe(32);
    expect(calculateEnemyCounterDamage(12, true)).toBe(40);

    // Numeric backward-compatible overload
    expect(calculateCombatReward(1)).toBe(18);
    expect(calculateCombatReward(12)).toBe(106);

    // Direct Strike (+50%), ATK_UP (+15%/stack additive), Apex (+50% multiplicative)
    expect(calculateCombatReward({ tier: 1, directStrikeBonus: true })).toBe(27);
    expect(calculateCombatReward({ tier: 1, isApex: true })).toBe(27);
    expect(
      calculateCombatReward({
        tier: 1,
        directStrikeBonus: true,
        runBuffs: ['ATK_UP', 'ATK_UP'],
      })
    ).toBe(32); // Math.round(18 * (1 + 0.5 + 0.3)) = 32
    expect(
      calculateCombatReward({
        tier: 5,
        isApex: true,
        directStrikeBonus: true,
        runBuffs: ['ATK_UP'],
      })
    ).toBe(124); // Math.round(50 * 1.5 * (1 + 0.5 + 0.15)) = Math.round(123.75) = 124
  });

  it('retains backward-compatible legacy calculatePlayerAttackDamage for M2 transition', () => {
    const damage = calculatePlayerAttackDamage({
      isHintMode: false,
      stepCount: 0,
      isFinalHintStep: false,
      enemyMaxHp: 60,
      currentEnemyHp: 60,
      runBuffs: ['ATK_UP', 'ATK_UP'],
      rng: () => 0.4,
    });
    expect(damage).toBe(22);
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

  it('treats applyTacticalHint as a strict no-op when total hints === 0 across COMBO, DIRECT, and QUICK', () => {
    const zeroHintStats = { ...INITIAL_STATS, runHintPacks: 0, hintPacks: 0 };
    const patrolHp = getPatrolBaseHpForTier(1);

    const comboTurn = createCombatTurnState({
      problem: SAMPLE_COMBO_PROBLEM,
      mode: 'ATTACK',
      isApex: false,
      runBuffs: [],
    });
    const comboResult = applyTacticalHint({
      stats: zeroHintStats,
      problem: SAMPLE_COMBO_PROBLEM,
      turn: comboTurn,
      currentEnemyHp: patrolHp,
      patrolBaseHp: patrolHp,
      isApex: false,
    });
    expect(comboResult).toEqual({
      nextStats: zeroHintStats,
      nextShieldActive: false,
      clueText: null,
      autoCompletedStep: false,
      attackResolution: null,
    });

    const directTurn = toggleStrikeMode(SAMPLE_COMBO_PROBLEM, 'ATTACK', comboTurn);
    const directResult = applyTacticalHint({
      stats: zeroHintStats,
      problem: SAMPLE_COMBO_PROBLEM,
      turn: directTurn,
      currentEnemyHp: patrolHp,
      patrolBaseHp: patrolHp,
      isApex: false,
      shieldActive: true,
    });
    expect(directResult).toEqual({
      nextStats: zeroHintStats,
      nextShieldActive: true,
      clueText: null,
      autoCompletedStep: false,
      attackResolution: null,
    });

    const quickTurn = createCombatTurnState({
      problem: SAMPLE_QUICK_PROBLEM,
      mode: 'ATTACK',
      isApex: false,
      runBuffs: [],
    });
    const quickResult = applyTacticalHint({
      stats: zeroHintStats,
      problem: SAMPLE_QUICK_PROBLEM,
      turn: quickTurn,
      currentEnemyHp: patrolHp,
      patrolBaseHp: patrolHp,
      isApex: false,
    });
    expect(quickResult).toEqual({
      nextStats: zeroHintStats,
      nextShieldActive: false,
      clueText: null,
      autoCompletedStep: false,
      attackResolution: null,
    });
  });

  it('clamps invalid and out-of-range tiers in calculateCombatReward and calculateEnemyCounterDamage to Tier 1..12', () => {
    const lowOrInvalidTiers = [0, -5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    for (const badTier of lowOrInvalidTiers) {
      expect(calculateEnemyCounterDamage(badTier, false)).toBe(calculateEnemyCounterDamage(1, false));
      expect(calculateEnemyCounterDamage(badTier, true)).toBe(calculateEnemyCounterDamage(1, true));
      expect(calculateCombatReward(badTier)).toBe(calculateCombatReward(1));
      expect(calculateCombatReward({ tier: badTier, directStrikeBonus: true, isApex: true })).toBe(
        calculateCombatReward({ tier: 1, directStrikeBonus: true, isApex: true })
      );
    }

    const highTiers = [13, 100];
    for (const highTier of highTiers) {
      expect(calculateEnemyCounterDamage(highTier, false)).toBe(calculateEnemyCounterDamage(12, false));
      expect(calculateEnemyCounterDamage(highTier, true)).toBe(calculateEnemyCounterDamage(12, true));
      expect(calculateCombatReward(highTier)).toBe(calculateCombatReward(12));
      expect(calculateCombatReward({ tier: highTier, directStrikeBonus: true, isApex: true })).toBe(
        calculateCombatReward({ tier: 12, directStrikeBonus: true, isApex: true })
      );
    }
  });

  it('clamps non-positive or NaN patrolBaseHp in calculateStrikeDamage to positive finite damage >= 1', () => {
    const invalidBaseHps = [0, -10, Number.NaN, Number.NEGATIVE_INFINITY];

    for (const badHp of invalidBaseHps) {
      const comboDmg = calculateStrikeDamage({
        strikeMode: 'COMBO',
        complexity: 'COMBO',
        stepIndex: 0,
        effectiveStepCount: 3,
        patrolBaseHp: badHp,
        damageDealtThisProblem: 0,
      });
      const directDmg = calculateStrikeDamage({
        strikeMode: 'DIRECT',
        complexity: 'COMBO',
        stepIndex: null,
        effectiveStepCount: 0,
        patrolBaseHp: badHp,
        damageDealtThisProblem: 0,
      });
      const quickDmg = calculateStrikeDamage({
        strikeMode: 'DIRECT',
        complexity: 'QUICK',
        stepIndex: null,
        effectiveStepCount: 0,
        patrolBaseHp: badHp,
        damageDealtThisProblem: 0,
      });

      for (const dmg of [comboDmg, directDmg, quickDmg]) {
        expect(Number.isFinite(dmg)).toBe(true);
        expect(dmg).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('exports Phase 3 Focus Scan, Shield Break, Apex Vulnerable, and Blue Cache constants', () => {
    expect(FOCUS_SCAN_FP_GAIN).toBe(15);
    expect(LAG_SCAR_FOCUS_SCAN_FP_GAIN).toBe(8);
    expect(SHIELD_BREAK_FP_GAIN).toBe(10);
    expect(LAG_SCAR_SHIELD_BREAK_FP_GAIN).toBe(5);
    expect(APEX_SHIELD_LAYERS_DEFAULT).toBe(2);
    expect(APEX_VULNERABLE_MULTIPLIER).toBe(2);
    expect(BLUE_CACHE_FAIL_DAMAGE).toBe(5);
  });

  it('detects Apex via isApex flag or _APEX suffix and computes initial shield layers', () => {
    expect(isApexEnemy({ type: 'SURFACE_WASTES', isApex: true })).toBe(true);
    expect(isApexEnemy({ type: 'SURFACE_WASTES_APEX', isApex: false })).toBe(true);
    expect(isApexEnemy({ type: 'SURFACE_WASTES', isApex: false })).toBe(false);

    expect(getInitialEnemyShieldLayers({ type: 'SURFACE_WASTES' })).toBe(0);
    expect(getInitialEnemyShieldLayers({ type: 'SURFACE_WASTES_APEX' })).toBe(APEX_SHIELD_LAYERS_DEFAULT);
    expect(getInitialEnemyShieldLayers({ type: 'SURFACE_WASTES', isApex: true })).toBe(APEX_SHIELD_LAYERS_DEFAULT);
    expect(getInitialEnemyShieldLayers({ type: 'SURFACE_WASTES_APEX', shieldLayers: 1 })).toBe(1);
    expect(getInitialEnemyShieldLayers({ type: 'SURFACE_WASTES_APEX', shieldLayers: 0 })).toBe(0);
    expect(getInitialEnemyShieldLayers({ type: 'SURFACE_WASTES_APEX', shieldLayers: -3 })).toBe(0);
  });

  it('enforces Focus Scan 1/battle guard, never heals HP, respects CALCULATION_LAG, and cracks shields if present', () => {
    expect(canUseFocusScan({ focusScanUsed: false, mode: 'ATTACK', shieldLayers: 0 })).toBe(true);
    expect(canUseFocusScan({ focusScanUsed: true, mode: 'ATTACK', shieldLayers: 0 })).toBe(false);
    expect(canUseFocusScan({ focusScanUsed: false, mode: 'SHIELD_BREAK', shieldLayers: 2 })).toBe(false);
    expect(canUseFocusScan({ focusScanUsed: false, mode: 'FOCUS_SCAN', shieldLayers: 0 })).toBe(false);
    expect(canUseFocusScan({ focusScanUsed: false, mode: 'MEDITATION', shieldLayers: 0 })).toBe(false);

    const injuredStats = {
      ...INITIAL_STATS,
      hp: 40,
      maxHp: 100,
      fp: 20,
      maxFp: 100,
      neuralScars: [],
    };
    const scanNoShield = applyFocusScanSuccess(injuredStats, 0);
    expect(scanNoShield.nextStats.hp).toBe(40); // NEVER heals HP
    expect(scanNoShield.fpGain).toBe(FOCUS_SCAN_FP_GAIN);
    expect(scanNoShield.nextStats.fp).toBe(35);
    expect(scanNoShield.newShieldLayers).toBe(0);
    expect(scanNoShield.shieldBroken).toBe(false);

    const lagStats = { ...injuredStats, fp: 95, neuralScars: ['CALCULATION_LAG'] };
    const scanWithLagAndShield = applyFocusScanSuccess(lagStats, 1);
    expect(scanWithLagAndShield.nextStats.hp).toBe(40); // NEVER heals HP
    expect(scanWithLagAndShield.fpGain).toBe(LAG_SCAR_FOCUS_SCAN_FP_GAIN);
    expect(scanWithLagAndShield.nextStats.fp).toBe(100); // clamped to maxFp
    expect(scanWithLagAndShield.newShieldLayers).toBe(0);
    expect(scanWithLagAndShield.shieldBroken).toBe(true);

    const scanCrackTwoLayer = applyFocusScanSuccess(injuredStats, 2);
    expect(scanCrackTwoLayer.newShieldLayers).toBe(1);
    expect(scanCrackTwoLayer.shieldBroken).toBe(false);
  });

  it('resolves Apex Shield Break layers 2 -> 1 -> 0 with isVulnerable transition and CALCULATION_LAG scaling', () => {
    const hit1 = resolveShieldBreakHit({ shieldLayers: 2, neuralScars: [] });
    expect(hit1).toEqual({
      newShieldLayers: 1,
      shieldBroken: false,
      isVulnerable: false,
      fpGain: SHIELD_BREAK_FP_GAIN,
    });

    const hit2 = resolveShieldBreakHit({
      shieldLayers: hit1.newShieldLayers,
      neuralScars: ['CALCULATION_LAG'],
    });
    expect(hit2).toEqual({
      newShieldLayers: 0,
      shieldBroken: true,
      isVulnerable: true,
      fpGain: LAG_SCAR_SHIELD_BREAK_FP_GAIN,
    });

    const alreadyBroken = resolveShieldBreakHit({ shieldLayers: 0, neuralScars: [] });
    expect(alreadyBroken.newShieldLayers).toBe(0);
    expect(alreadyBroken.shieldBroken).toBe(false);
    expect(alreadyBroken.isVulnerable).toBe(false);
  });

  it('defeats a Vulnerable Apex Boss in 1 full Combo Chain or 1 Direct Strike across all 12 tiers', () => {
    for (let tier = 1; tier <= 12; tier++) {
      const patrolHp = getPatrolBaseHpForTier(tier);
      const apexHp = getApexHpForTier(tier);

      // 1 Direct Strike defeats Vulnerable Apex Boss
      const directTurn = toggleStrikeMode(
        SAMPLE_COMBO_PROBLEM,
        'ATTACK',
        createCombatTurnState({
          problem: SAMPLE_COMBO_PROBLEM,
          mode: 'ATTACK',
          isApex: true,
          runBuffs: [],
        })
      );
      const directHit = resolveCorrectAttack({
        problem: SAMPLE_COMBO_PROBLEM,
        turn: directTurn,
        currentEnemyHp: apexHp,
        patrolBaseHp: patrolHp,
        neuralScars: [],
        isApex: true,
        runBuffs: [],
        isVulnerable: true,
      });
      expect(directHit.damage).toBe(patrolHp * APEX_VULNERABLE_MULTIPLIER);
      expect(directHit.isVictory).toBe(true);
      expect(directHit.newEnemyHp).toBe(0);

      // 1 full Combo Chain defeats Vulnerable Apex Boss
      let comboTurn = createCombatTurnState({
        problem: SAMPLE_COMBO_PROBLEM,
        mode: 'ATTACK',
        isApex: true,
        runBuffs: [],
      });
      let remainingHp = apexHp;
      let defeated = false;
      for (let step = 0; step < SAMPLE_COMBO_PROBLEM.steps!.length && !defeated; step++) {
        const res = resolveCorrectAttack({
          problem: SAMPLE_COMBO_PROBLEM,
          turn: comboTurn,
          currentEnemyHp: remainingHp,
          patrolBaseHp: patrolHp,
          neuralScars: [],
          isApex: true,
          runBuffs: [],
          isVulnerable: true,
        });
        remainingHp = res.newEnemyHp;
        comboTurn = res.nextTurn;
        defeated = res.isVictory;
      }
      expect(defeated, `Tier ${tier} Vulnerable Apex should fall in 1 Combo Chain`).toBe(true);
      expect(remainingHp).toBe(0);
    }
  });

  it('handles FOCUS_SCAN and SHIELD_BREAK modes in turn state, Direct Strike guard, and wrong-answer resolution', () => {
    for (const mode of ['FOCUS_SCAN', 'SHIELD_BREAK'] as const) {
      const turn = createCombatTurnState({
        problem: SAMPLE_COMBO_PROBLEM,
        mode,
        isApex: true,
        runBuffs: [],
      });
      expect(turn.strikeMode).toBe('DIRECT');
      expect(turn.stepIndex).toBeNull();
      expect(canToggleDirectStrike({ problem: SAMPLE_COMBO_PROBLEM, mode, turn })).toBe(false);

      const wrong = resolveWrongAttack({
        problem: SAMPLE_COMBO_PROBLEM,
        mode,
        turn,
        tier: 2,
        isApex: true,
        currentPlayerHp: 100,
        shieldActive: false,
      });
      expect(wrong.revealAnswer).toBe(true);
      expect(wrong.keepSameProblem).toBe(false);
      expect(wrong.fellBackToCombo).toBe(false);
    }
  });
});
