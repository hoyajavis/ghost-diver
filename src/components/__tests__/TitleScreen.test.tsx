// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MotionConfig, MotionGlobalConfig } from 'motion/react';
import { TitleScreen } from '../TitleScreen';
import { INITIAL_STATS, resetMemoryCacheForTests } from '../../lib/storage';
import { AnonymizedCacheProfile, SaveSlot } from '../../types';

MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetMemoryCacheForTests();
  window.localStorage.clear();
});

function makeSlots(): SaveSlot[] {
  const populated = {
    ...INITIAL_STATS,
    knowledge: 245,
    hintPacks: 4,
    neuralScars: ['THE_BLUR', 'CALCULATION_LAG'],
    maxExtractedFloor: 15,
  };

  return [
    { id: 1, stats: populated },
    { id: 2, stats: null },
    { id: 3, stats: null },
  ];
}

function makeCacheProfile(overrides?: Partial<AnonymizedCacheProfile>): AnonymizedCacheProfile {
  return {
    anonymousId: 'anon-test-7742',
    storageMode: 'localStorage',
    telemetry: {
      totalDives: 9,
      totalExtractions: 6,
      totalDefeats: 3,
      totalCombatsWon: 27,
      totalKnowledgeExtracted: 1420,
      byTierVariant: {},
      byArchetype: {},
    },
    ...overrides,
  };
}

function renderTitleScreen(overrides?: Partial<React.ComponentProps<typeof TitleScreen>>) {
  const props: React.ComponentProps<typeof TitleScreen> = {
    slots: makeSlots(),
    cacheProfile: makeCacheProfile(),
    onSelectSlot: vi.fn(),
    onDeleteSlot: vi.fn(),
    onRotateAnonymousId: vi.fn(),
    onClearAllCache: vi.fn(),
    onExportCache: vi.fn(() => JSON.stringify({ ok: true })),
    ...overrides,
  };

  render(
    <MotionConfig reducedMotion="always">
      <TitleScreen {...props} />
    </MotionConfig>
  );

  return props;
}

describe('TitleScreen', () => {
  it('renders empty and populated save slots with stats and invokes onSelectSlot(id)', () => {
    const props = renderTitleScreen();

    // Populated Slot 01 displays Max Floor, Shards, Hint Packs, Neural Scars
    expect(screen.getByText('Slot 01')).toBeInTheDocument();
    expect(screen.getByText('Max Floor 15')).toBeInTheDocument();
    expect(screen.getByTitle('Knowledge Shards')).toHaveTextContent('245');
    expect(screen.getByTitle('Hint Packs')).toHaveTextContent('4');
    expect(screen.getByTitle('Neural Scars')).toHaveTextContent('2');

    // Empty slots display placeholder text
    expect(screen.getAllByText(/Empty slot — Start new run/i)).toHaveLength(2);

    // Selecting populated and empty slots passes exact slot id
    fireEvent.click(screen.getByText('Slot 01'));
    expect(props.onSelectSlot).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByText('Slot 02'));
    expect(props.onSelectSlot).toHaveBeenCalledWith(2);
  });

  it('handles delete slot confirmation: Cancel and Escape abort, Delete Save invokes onDeleteSlot', async () => {
    const props = renderTitleScreen();

    // Only populated slot 1 has a delete button
    expect(screen.queryByRole('button', { name: 'Delete save slot 2' })).not.toBeInTheDocument();

    // Open delete confirmation and cancel via button
    fireEvent.click(screen.getByRole('button', { name: 'Delete save slot 1' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Delete Save Slot 01?')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(props.onDeleteSlot).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Open delete confirmation and cancel via Escape
    fireEvent.click(screen.getByRole('button', { name: 'Delete save slot 1' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onDeleteSlot).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Open delete confirmation and confirm deletion
    fireEvent.click(screen.getByRole('button', { name: 'Delete save slot 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Save' }));
    expect(props.onDeleteSlot).toHaveBeenCalledTimes(1);
    expect(props.onDeleteSlot).toHaveBeenCalledWith(1);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('opens and closes Mission Briefing modal via buttons and Escape', async () => {
    renderTitleScreen();

    fireEvent.click(screen.getByRole('button', { name: /Mission Briefing/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Mission Briefing')).toBeInTheDocument();

    // Close via Close Briefing button
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close Briefing' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Re-open and close via Escape
    fireEvent.click(screen.getByRole('button', { name: /Mission Briefing/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('handles Local Cache & Privacy modal: telemetry, export, rotate ID, and two-step wipe', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const props = renderTitleScreen();

    fireEvent.click(screen.getByRole('button', { name: /Local Cache & Privacy/i }));
    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByText('anon-test-7742')).toBeInTheDocument();
    expect(within(dialog).getByText('Browser localStorage')).toBeInTheDocument();
    expect(within(dialog).getByText('9')).toBeInTheDocument();
    expect(within(dialog).getByText('6')).toBeInTheDocument();
    expect(within(dialog).getByText('27')).toBeInTheDocument();
    expect(within(dialog).getByText('1420')).toBeInTheDocument();

    // Export Anonymized JSON
    fireEvent.click(within(dialog).getByRole('button', { name: /Export Anonymized JSON/i }));
    expect(props.onExportCache).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    // Rotate Anonymous ID
    fireEvent.click(within(dialog).getByRole('button', { name: /Rotate Anonymous ID/i }));
    expect(props.onRotateAnonymousId).toHaveBeenCalledTimes(1);

    // Two-step Clear All Local Cache -> Confirm Wipe
    fireEvent.click(within(dialog).getByRole('button', { name: /Clear All Local Cache/i }));
    expect(props.onClearAllCache).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('button', { name: 'Confirm Wipe' })).toBeInTheDocument();

    // Escape cancels confirmClearAll step without closing the privacy modal
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Confirm Wipe' })).not.toBeInTheDocument();

    // Click Clear All again and Confirm Wipe
    fireEvent.click(within(dialog).getByRole('button', { name: /Clear All Local Cache/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm Wipe' }));
    expect(props.onClearAllCache).toHaveBeenCalledTimes(1);
  });
});
