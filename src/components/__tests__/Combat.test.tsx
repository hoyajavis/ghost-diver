// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MotionConfig, MotionGlobalConfig } from 'motion/react';
import { Combat } from '../Combat';
import {
  APEX_INTRO_MS,
  COMBO_STEP_ADVANCE_MS,
  MEDITATION_FP_COST,
  MISS_RETRY_MS,
  PATROL_INTRO_MS,
  PROBLEM_ADVANCE_MS,
} from '../../lib/combatLogic';
import { INITIAL_STATS, resetMemoryCacheForTests } from '../../lib/storage';
import { Enemy, MathProblem, PlayerStats } from '../../types';

MotionGlobalConfig.skipAnimations = true;

const { generateProblemMock } = vi.hoisted(() => ({
  generateProblemMock: vi.fn(),
}));

vi.mock('../../lib/mathEngine', () => ({
  generateProblem: generateProblemMock,
}));

function makeComboAttackProblem(): MathProblem {
  return {
    type: 'ATTACK',
    question: 'Solve for x: 2x + 4 = 12',
    answer: 4,
    inputType: 'NUMPAD',
    category: 'PROCEDURAL',
    complexity: 'COMBO',
    steps: [
      {
        prompt: 'Step 1: Subtract 4 from 12. What is 2x?',
        answer: 8,
        inputType: 'NUMPAD',
        clue: 'Undo +4 by subtracting 4 from 12.',
        resultLabel: '2x = 8',
      },
      {
        prompt: 'Step 2: Divide 8 by 2. What is x?',
        answer: 4,
        inputType: 'NUMPAD',
        clue: 'Divide 8 by 2.',
        resultLabel: 'x = 4',
      },
    ],
  };
}

function makeConceptualProblem(tag = 'A'): MathProblem {
  return {
    type: 'SHIELD_BREAK',
    question: `Conceptual Check ${tag}: Which value is larger?`,
    answer: '1/2',
    choices: ['1/2', '1/4', '1/8'],
    category: 'CONCEPTUAL',
    complexity: 'QUICK',
    archetype: 'BENCHMARK_COMPARE',
    templateId: `tpl-${tag}`,
    steps: [],
  };
}

function makePatrolEnemy(overrides?: Partial<Enemy>): Enemy {
  return {
    id: 'enemy-1',
    pos: { x: 2, y: 2 },
    type: 'Sentinel Alpha',
    variant: 1,
    hp: 30,
    maxHp: 30,
    ...overrides,
  };
}

function makeApexEnemy(overrides?: Partial<Enemy>): Enemy {
  return {
    id: 'apex-1',
    pos: { x: 4, y: 4 },
    type: 'Apex Warden',
    variant: 5,
    hp: 120,
    maxHp: 120,
    isApex: true,
    shieldLayers: 2,
    maxShieldLayers: 2,
    ...overrides,
  };
}

function makeStats(overrides?: Partial<PlayerStats>): PlayerStats {
  return {
    ...INITIAL_STATS,
    hp: 100,
    maxHp: 100,
    fp: 30,
    maxFp: 50,
    hintPacks: 2,
    ...overrides,
  };
}

interface RenderCombatOptions {
  stats?: Partial<PlayerStats>;
  enemy?: Enemy;
  tier?: number;
  floor?: number;
  skipIntroImmediately?: boolean;
}

function renderCombat(options: RenderCombatOptions = {}) {
  const initialStats = makeStats(options.stats);
  const enemy = options.enemy ?? makePatrolEnemy();
  const tier = options.tier ?? 1;
  const floor = options.floor ?? 1;
  const onWin = vi.fn();
  const onLose = vi.fn();
  const onUpdateStats = vi.fn();

  const Harness: React.FC = () => {
    const [stats, setStats] = useState<PlayerStats>(initialStats);
    return (
      <MotionConfig reducedMotion="always">
        <Combat
          stats={stats}
          enemy={enemy}
          tier={tier}
          floor={floor}
          slotId={1}
          onWin={onWin}
          onLose={onLose}
          onUpdateStats={(next) => {
            onUpdateStats(next);
            setStats(next);
          }}
        />
      </MotionConfig>
    );
  };

  const result = render(<Harness />);

  if (options.skipIntroImmediately) {
    fireEvent.click(screen.getByRole('button', { name: 'Skip battle intro' }));
  }

  return { ...result, onWin, onLose, onUpdateStats };
}

function submitNumericKeys(value: string) {
  for (const ch of value) {
    fireEvent.keyDown(window, { key: ch });
  }
  fireEvent.keyDown(window, { key: 'Enter' });
}

beforeEach(() => {
  generateProblemMock.mockReset();
  generateProblemMock.mockImplementation((_tier: number, type: string) => {
    if (type === 'ATTACK') {
      return makeComboAttackProblem();
    }
    return makeConceptualProblem(type);
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  resetMemoryCacheForTests();
  window.localStorage.clear();
});

describe('Combat', () => {
  it('displays Battle Start / Apex Encounter intro and skips via click, Enter, or auto-timer', async () => {
    vi.useFakeTimers();

    // 1. Patrol intro skipped via click
    const r1 = renderCombat({ enemy: makePatrolEnemy(), floor: 1 });
    expect(screen.getByText('Battle Start')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip battle intro' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.queryByText('Battle Start')).not.toBeInTheDocument();
    r1.unmount();

    // 2. Apex intro skipped via Enter key
    const r2 = renderCombat({ enemy: makeApexEnemy(), floor: 5 });
    expect(screen.getByText('Apex Encounter')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Enter' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.queryByText('Apex Encounter')).not.toBeInTheDocument();
    r2.unmount();

    // 3. Patrol intro auto-dismisses after PATROL_INTRO_MS
    const r3 = renderCombat({ enemy: makePatrolEnemy(), floor: 1 });
    expect(screen.getByText('Battle Start')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PATROL_INTRO_MS + 50);
    });
    expect(screen.queryByText('Battle Start')).not.toBeInTheDocument();
    r3.unmount();

    // 4. Apex intro auto-dismisses after APEX_INTRO_MS
    renderCombat({ enemy: makeApexEnemy(), floor: 5 });
    expect(screen.getByText('Apex Encounter')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(APEX_INTRO_MS + 50);
    });
    expect(screen.queryByText('Apex Encounter')).not.toBeInTheDocument();
  });

  it('starts patrol COMBO in Combo mode, allows Direct Strike toggle before Step 1, and wins with sectorMastery update', () => {
    vi.useFakeTimers();
    const { onWin, onUpdateStats } = renderCombat({
      enemy: makePatrolEnemy({ hp: 30, maxHp: 30 }),
      skipIntroImmediately: true,
    });

    // Starts in Combo mode
    expect(screen.getByText('Step 1/2')).toBeInTheDocument();
    const directBtn = screen.getByRole('button', { name: /Direct Strike/i });
    expect(directBtn).toHaveAttribute('aria-pressed', 'false');

    // Toggle Direct Strike on before Step 1
    fireEvent.click(directBtn);
    expect(directBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/DIRECT · 1-SHOT · \+50% SHARDS/i)).toBeInTheDocument();

    // Submit correct final answer (4) to 1-shot patrol
    submitNumericKeys('4');
    expect(screen.getByText(/Direct Strike Kill/i)).toBeInTheDocument();

    // Verify sectorMastery updated via onUpdateStats
    expect(onUpdateStats).toHaveBeenCalled();
    const lastStatsCall = onUpdateStats.mock.calls.at(-1)?.[0] as PlayerStats;
    expect(lastStatsCall.sectorMastery[1]?.proceduralCorrect).toBe(1);

    // Advance victory delay -> onWin(shards)
    act(() => {
      vi.advanceTimersByTime(PROBLEM_ADVANCE_MS + 500);
    });
    expect(onWin).toHaveBeenCalledTimes(1);
    expect(onWin.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it('deducts HP on wrong answer, falls back to Combo Step 1 on Direct Strike miss, and calls onLose at 0 HP', () => {
    vi.useFakeTimers();

    // 1. Direct Strike miss deducts HP and falls back to Combo Step 1
    const r1 = renderCombat({
      stats: { hp: 100, maxHp: 100 },
      skipIntroImmediately: true,
    });
    fireEvent.click(screen.getByRole('button', { name: /Direct Strike/i }));
    submitNumericKeys('99');

    expect(screen.getByText(/Falling back to Combo Step 1/i)).toBeInTheDocument();
    const statsAfterMiss = r1.onUpdateStats.mock.calls.at(-1)?.[0] as PlayerStats;
    expect(statsAfterMiss.hp).toBeLessThan(100);

    act(() => {
      vi.advanceTimersByTime(MISS_RETRY_MS + 500);
    });
    expect(screen.getByText('Step 1/2')).toBeInTheDocument();
    r1.unmount();

    // 2. HP reaching 0 calls onLose()
    const r2 = renderCombat({
      stats: { hp: 1, maxHp: 100 },
      skipIntroImmediately: true,
    });
    submitNumericKeys('99');
    const statsAtZero = r2.onUpdateStats.mock.calls.at(-1)?.[0] as PlayerStats;
    expect(statsAtZero.hp).toBe(0);

    act(() => {
      vi.advanceTimersByTime(MISS_RETRY_MS + 1000);
    });
    expect(r2.onLose).toHaveBeenCalledTimes(1);
  });

  it('supports Tactical Actions: Focus Scan, Emergency Heal (FP gating), and Tactical Hint (consumes pack & arms shield)', () => {
    vi.useFakeTimers();

    // Low FP: Emergency Heal disabled
    const rLowFp = renderCombat({
      stats: { fp: MEDITATION_FP_COST - 1, maxFp: 50, hintPacks: 2 },
      skipIntroImmediately: true,
    });
    const healBtnDisabled = screen.getByRole('button', { name: /Emergency Heal/i });
    expect(healBtnDisabled).toBeDisabled();

    // Tactical Hint consumes hint pack & arms shield
    const hintBtn = screen.getByRole('button', { name: /Use Tactical Hint/i });
    fireEvent.click(hintBtn);
    expect(screen.getByLabelText('Tactical Shield active')).toBeInTheDocument();
    const statsAfterHint = rLowFp.onUpdateStats.mock.calls.at(-1)?.[0] as PlayerStats;
    expect(statsAfterHint.hintPacks).toBe(1);

    // Wait for tactical hint auto-step advance (or idle)
    act(() => {
      vi.advanceTimersByTime(COMBO_STEP_ADVANCE_MS + 500);
    });

    // Focus Scan switches to FOCUS_SCAN mode and marks used
    const scanBtn = screen.getByRole('button', { name: /Focus Scan/i });
    fireEvent.click(scanBtn);
    expect(screen.getByText('Focus Scan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Focus Scan already used/i })).toBeDisabled();
    rLowFp.unmount();

    // Sufficient FP: Emergency Heal enabled and switches to Emergency Heal mode
    renderCombat({
      stats: { fp: MEDITATION_FP_COST, maxFp: 50 },
      skipIntroImmediately: true,
    });
    const healBtn = screen.getByRole('button', { name: /Emergency Heal/i });
    expect(healBtn).toBeEnabled();
    fireEvent.click(healBtn);
    expect(screen.getByText('Emergency Heal')).toBeInTheDocument();
  });

  it('handles Apex Boss: starts in SHIELD_BREAK with SHIELD 2/2, blocks Direct Strike while shielded, and transitions to 2x Vulnerable ATTACK', () => {
    vi.useFakeTimers();
    let conceptualCounter = 0;
    generateProblemMock.mockImplementation((_tier: number, type: string) => {
      if (type === 'ATTACK') return makeComboAttackProblem();
      conceptualCounter += 1;
      return makeConceptualProblem(String(conceptualCounter));
    });

    renderCombat({
      enemy: makeApexEnemy({ shieldLayers: 2, maxShieldLayers: 2 }),
      floor: 5,
      skipIntroImmediately: true,
    });

    // Starts in SHIELD_BREAK with SHIELD 2/2 and no Direct Strike button
    expect(screen.getByText('Logic Shield Breach')).toBeInTheDocument();
    expect(screen.getByText('SHIELD')).toBeInTheDocument();
    expect(screen.getByText('2/2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Direct Strike/i })).not.toBeInTheDocument();

    // Break shield layer 1
    fireEvent.click(screen.getByRole('button', { name: /1\/2/ }));
    expect(screen.getByLabelText('Logic Shield 1 of 2')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(PROBLEM_ADVANCE_MS);
    });

    // Break shield layer 2 -> transitions to ATTACK with SHIELD BROKEN — 2× VULNERABLE
    fireEvent.click(screen.getByRole('button', { name: /1\/2/ }));
    expect(screen.getByRole('status')).toHaveTextContent('SHIELD BROKEN — 2× VULNERABLE');

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByText('Cipher Attack')).toBeInTheDocument();
    expect(screen.getByText('2× VULN')).toBeInTheDocument();
  });

  it('Phase 5 Chips: STRUCTURAL_SIGHT auto-reveals Step 1 clue, OVERCLOCK_CHIP shows +100% Shards, PATTERN_LENS triggers Counter-Hack Parry and halves damage', () => {
    vi.useFakeTimers();

    // 1. STRUCTURAL_SIGHT + OVERCLOCK_CHIP
    const rChips = renderCombat({
      stats: {
        unlockedChips: ['STRUCTURAL_SIGHT', 'OVERCLOCK_CHIP'],
        equippedChips: ['STRUCTURAL_SIGHT', 'OVERCLOCK_CHIP'],
        hintPacks: 2,
      },
      skipIntroImmediately: true,
    });

    // STRUCTURAL_SIGHT auto-reveals Step 1 clue without spending Hint Packs
    expect(screen.getByRole('note')).toHaveTextContent(
      'Clue: Undo +4 by subtracting 4 from 12.'
    );
    expect(rChips.onUpdateStats).not.toHaveBeenCalled();

    // OVERCLOCK_CHIP displays +100% Shards on Direct Strike button and prompt badge
    const directBtn = screen.getByRole('button', { name: /\+100% Shards/i });
    expect(directBtn).toBeInTheDocument();
    fireEvent.click(directBtn);
    expect(screen.getByText(/DIRECT · 1-SHOT · \+100% SHARDS/i)).toBeInTheDocument();
    rChips.unmount();

    // 2. PATTERN_LENS triggers Counter-Hack Parry on miss and halves incoming damage on success
    // First measure baseline unparried damage at tier 1
    const rBaseline = renderCombat({
      stats: { hp: 100, maxHp: 100, equippedChips: [] },
      skipIntroImmediately: true,
    });
    submitNumericKeys('99');
    const baselineHp = (rBaseline.onUpdateStats.mock.calls.at(-1)?.[0] as PlayerStats).hp;
    const rawDamage = 100 - baselineHp;
    expect(rawDamage).toBeGreaterThan(0);
    rBaseline.unmount();

    // Now test with PATTERN_LENS equipped
    const rLens = renderCombat({
      stats: {
        hp: 100,
        maxHp: 100,
        unlockedChips: ['PATTERN_LENS'],
        equippedChips: ['PATTERN_LENS'],
      },
      skipIntroImmediately: true,
    });
    submitNumericKeys('99');

    // Parry prompt activates
    expect(screen.getByText('Counter-Hack Parry')).toBeInTheDocument();
    expect(screen.getByText(/COUNTER-HACK PARRY! Solve to halve incoming damage/i)).toBeInTheDocument();

    // Solve parry check correctly -> incoming damage halved
    fireEvent.click(screen.getByRole('button', { name: /1\/2/ }));
    const expectedParriedDamage = Math.max(1, Math.floor(rawDamage / 2));
    expect(
      screen.getByText(new RegExp(`Counter-Hack Parry! Damage halved: -${expectedParriedDamage} HP`))
    ).toBeInTheDocument();
    const parriedHp = (rLens.onUpdateStats.mock.calls.at(-1)?.[0] as PlayerStats).hp;
    expect(parriedHp).toBe(100 - expectedParriedDamage);
  });

  it('opens Combat Systems menu via Escape / button, displays equipped chips, and Force Disconnect calls onLose', async () => {
    const { onLose } = renderCombat({
      stats: {
        unlockedChips: ['OVERCLOCK_CHIP', 'PATTERN_LENS'],
        equippedChips: ['OVERCLOCK_CHIP', 'PATTERN_LENS'],
      },
      skipIntroImmediately: true,
    });

    // Open via Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Combat Systems')).toBeInTheDocument();
    expect(within(dialog).getByText('Overclock Chip')).toBeInTheDocument();
    expect(within(dialog).getByText('Pattern Lens')).toBeInTheDocument();

    // Close via Escape, then re-open via header button
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open combat systems menu' }));
    const reopened = screen.getByRole('dialog');
    fireEvent.click(within(reopened).getByRole('button', { name: /Force Disconnect/i }));
    expect(onLose).toHaveBeenCalledTimes(1);
  });
});
