// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MotionConfig, MotionGlobalConfig } from 'motion/react';
import { HomeBase } from '../HomeBase';
import { PlayerStats } from '../../types';

MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
  return {
    hp: 100,
    maxHp: 100,
    fp: 50,
    maxFp: 50,
    knowledge: 0,
    hintPacks: 2,
    runKnowledge: 0,
    runHintPacks: 0,
    runBuffs: [],
    neuralScars: [],
    maxExtractedFloor: 0,
    upgrades: { hp: 0, fp: 0, hints: 0 },
    unlockedLore: [],
    encounteredTiers: [],
    unlockedDemos: [],
    activeReconBuff: null,
    reconRewardAvailable: false,
    archetypeStats: {},
    conceptSchedule: {},
    conceptStepCounter: 0,
    unlockedChips: [],
    equippedChips: [],
    sectorMastery: {},
    lifetimeShardsExtracted: 0,
    ...overrides,
  };
}

function renderHomeBase(stats: PlayerStats) {
  return render(
    <MotionConfig reducedMotion="always">
      <HomeBase
        stats={stats}
        onStartDive={vi.fn()}
        onHealScar={vi.fn()}
        onCalibrateScar={vi.fn()}
        onUpgrade={vi.fn()}
        onToggleEquipChip={vi.fn()}
        onUnlockDemo={vi.fn()}
        onRecordConceptOutcome={vi.fn()}
        onRecordArchetypeStats={vi.fn()}
        onClaimReconBuff={vi.fn()}
        onLogout={vi.fn()}
      />
    </MotionConfig>
  );
}

describe('HomeBase (Slice 1 & Slice 2 Cradle Hub)', () => {
  it('shows standby hints in-panel (no modal) for offline stations on Dive 1 and cycles props/CRADLE_SYS', () => {
    renderHomeBase(makeStats());

    // Default readout is CRADLE_SYS Dive 1 welcome
    const readout = screen.getByRole('region', { name: /Cradle Inspector Readout/i });
    expect(readout).toHaveTextContent(/CRADLE_SYS/i);
    expect(readout).toHaveTextContent(/first dive/i);

    // Clicking an offline station (Workbench) shows standby hint in-panel without opening a dialog
    fireEvent.click(screen.getByRole('button', { name: /Workbench \(Standby\)/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(readout).toHaveTextContent(/Workbench is on standby/i);

    // Clicking a Bunker Prop displays its flavor text and repeat-click cycles to the next line
    const powerBtn = screen.getByRole('button', { name: /Inspect Main Power Conduit/i });
    fireEvent.click(powerBtn);
    const firstLine = readout.textContent;
    expect(firstLine).toMatch(/low power/i);

    fireEvent.click(powerBtn);
    expect(readout.textContent).not.toBe(firstLine);
  });

  it('opens unlocked stations at Floor 10+ and displays arrived Crew Resident banners', async () => {
    renderHomeBase(
      makeStats({
        maxExtractedFloor: 10,
        knowledge: 150,
        lifetimeShardsExtracted: 250,
        unlockedLore: ['LOG_001'],
      })
    );

    // Open Workbench -> shows Dr. Aris Thorne
    fireEvent.click(screen.getByRole('button', { name: /Open Workbench/i }));
    const workbenchDialog = screen.getByRole('dialog');
    expect(workbenchDialog).toBeInTheDocument();
    expect(workbenchDialog).toHaveTextContent(/Dr\. Aris Thorne/i);
    expect(workbenchDialog).toHaveTextContent(/Rig Engineer/i);

    fireEvent.click(screen.getByRole('button', { name: /Close station panel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Open Combat Simulator at Floor 10 -> shows COMBAT_ANALYST_V
    fireEvent.click(screen.getByRole('button', { name: /Open Combat Simulator/i }));
    const simDialog = screen.getByRole('dialog');
    expect(simDialog).toBeInTheDocument();
    expect(simDialog).toHaveTextContent(/COMBAT_ANALYST_V/i);
    expect(simDialog).toHaveTextContent(/Sentinel Tactician/i);
  });
});
