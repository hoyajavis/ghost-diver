import { describe, expect, it } from 'vitest';
import {
  hydrateSaveData,
  INITIAL_STATS,
  SAVE_SCHEMA_VERSION,
  toPersistedSaveData,
} from '../storage';

describe('storage schema hydration', () => {
  it('returns null for non-object raw payloads', () => {
    expect(hydrateSaveData(null)).toBeNull();
    expect(hydrateSaveData('corrupted')).toBeNull();
    expect(hydrateSaveData([1, 2, 3])).toBeNull();
  });

  it('hydrates partial save payloads safely with defaults and derived max stats', () => {
    const hydrated = hydrateSaveData({
      knowledge: 250,
      upgrades: { hp: 2, fp: 1 },
      maxExtractedFloor: 0,
      neuralScars: ['THE_BLUR', 42],
    });

    expect(hydrated).not.toBeNull();
    expect(hydrated?.knowledge).toBe(250);
    expect(hydrated?.hintPacks).toBe(0);
    expect(hydrated?.upgrades).toEqual({ hp: 2, fp: 1, hints: 0 });
    expect(hydrated?.maxHp).toBe(140);
    expect(hydrated?.hp).toBe(140);
    expect(hydrated?.maxFp).toBe(120);
    expect(hydrated?.fp).toBe(120);
    expect(hydrated?.maxExtractedFloor).toBe(1);
    expect(hydrated?.neuralScars).toEqual(['THE_BLUR']);
  });

  it('migrates legacy numeric encounteredTiers and unlockedDemos to variant IDs', () => {
    const hydrated = hydrateSaveData({
      encounteredTiers: [1, '1-2', '2-3'],
      unlockedDemos: [3, '3-1'],
    });

    expect(hydrated?.encounteredTiers).toEqual(['1-1', '1-2', '2-3']);
    expect(hydrated?.unlockedDemos).toEqual(['3-1', '3-2']);
  });

  it('serializes persisted save data with current schemaVersion', () => {
    const persisted = toPersistedSaveData({
      ...INITIAL_STATS,
      knowledge: 500,
      maxExtractedFloor: 15,
    });

    expect(persisted.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(persisted.knowledge).toBe(500);
    expect(persisted.maxExtractedFloor).toBe(15);
  });
});
