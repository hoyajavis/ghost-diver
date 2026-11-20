import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllLocalCache,
  computeMedian,
  exportAnonymizedCacheData,
  getAnonymizedCacheProfile,
  getOrCreateAnonymousId,
  hydrateSaveData,
  INITIAL_STATS,
  loadSlots,
  loadTelemetry,
  recordProblemTelemetry,
  recordTelemetryEvent,
  resetMemoryCacheForTests,
  rotateAnonymousId,
  SAVE_SCHEMA_VERSION,
  saveSlot,
  toPersistedSaveData,
} from '../storage';

function createMockLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe('storage schema hydration', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMockLocalStorage());
    resetMemoryCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetMemoryCacheForTests();
  });

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

  it('clamps maxExtractedFloor to 1..60 in both hydrateSaveData and toPersistedSaveData', () => {
    const hydratedHigh = hydrateSaveData({ maxExtractedFloor: 150 });
    expect(hydratedHigh?.maxExtractedFloor).toBe(60);

    const persistedHigh = toPersistedSaveData({
      ...INITIAL_STATS,
      maxExtractedFloor: 99,
    });
    expect(persistedHigh.maxExtractedFloor).toBe(60);

    const persistedLow = toPersistedSaveData({
      ...INITIAL_STATS,
      maxExtractedFloor: 0,
    });
    expect(persistedLow.maxExtractedFloor).toBe(1);
  });

  it('migrates legacy numeric encounteredTiers and unlockedDemos to variant IDs', () => {
    const hydrated = hydrateSaveData({
      encounteredTiers: [1, '1-2', '2-3'],
      unlockedDemos: [3, '3-1'],
    });

    expect(hydrated?.encounteredTiers).toEqual(['1-1', '1-2', '2-3']);
    expect(hydrated?.unlockedDemos).toEqual(['3-1', '3-2']);
  });

  it('serializes persisted save data with current schemaVersion, anonymousId, and coarse UTC day', () => {
    const persisted = toPersistedSaveData({
      ...INITIAL_STATS,
      knowledge: 500,
      maxExtractedFloor: 15,
    });

    expect(persisted.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(persisted.anonymousId).toMatch(/^gd-[a-f0-9]{8}-[a-f0-9]{4}$/);
    expect(persisted.updatedAtDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(persisted.knowledge).toBe(500);
    expect(persisted.maxExtractedFloor).toBe(15);
  });

  it('strictly strips non-allowlisted PII fields from persisted and exported data', () => {
    const dirtyStats = {
      ...INITIAL_STATS,
      knowledge: 120,
      playerName: 'Jane Doe',
      email: 'jane@example.com',
      ipAddress: '192.0.2.1',
    };

    const persisted = toPersistedSaveData(dirtyStats as typeof INITIAL_STATS);
    expect(persisted).not.toHaveProperty('playerName');
    expect(persisted).not.toHaveProperty('email');
    expect(persisted).not.toHaveProperty('ipAddress');

    saveSlot(1, dirtyStats as typeof INITIAL_STATS);
    const exported = exportAnonymizedCacheData();
    const serialized = JSON.stringify(exported);
    expect(serialized).not.toContain('Jane Doe');
    expect(serialized).not.toContain('jane@example.com');
    expect(serialized).not.toContain('192.0.2.1');
  });

  it('migrates legacy extraction_academy_save keys into anonymized ghost_diver_save keys', () => {
    globalThis.localStorage.setItem(
      'extraction_academy_save_2',
      JSON.stringify({
        schemaVersion: 2,
        knowledge: 330,
        maxExtractedFloor: 5,
        upgrades: { hp: 1, fp: 0, hints: 0 },
      })
    );

    const slots = loadSlots();
    expect(slots[1].stats?.knowledge).toBe(330);
    expect(slots[1].stats?.maxExtractedFloor).toBe(5);
    expect(globalThis.localStorage.getItem('extraction_academy_save_2')).toBeNull();

    const migratedRaw = globalThis.localStorage.getItem('ghost_diver_save_2');
    expect(migratedRaw).not.toBeNull();
    const migratedParsed = JSON.parse(migratedRaw!);
    expect(migratedParsed.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(migratedParsed.anonymousId).toBe(getOrCreateAnonymousId());
  });

  it('records anonymized aggregate telemetry events and supports rotation and full cache clear', () => {
    const initialId = getOrCreateAnonymousId();
    saveSlot(1, { ...INITIAL_STATS, knowledge: 400 });

    recordTelemetryEvent('DIVE_STARTED');
    recordTelemetryEvent('COMBAT_WON');
    recordTelemetryEvent('COMBAT_WON');
    recordTelemetryEvent('EXTRACTION', 250);
    recordTelemetryEvent('DEFEAT');

    expect(loadTelemetry()).toEqual({
      totalDives: 1,
      totalExtractions: 1,
      totalDefeats: 1,
      totalCombatsWon: 2,
      totalKnowledgeExtracted: 250,
      byTierVariant: {},
      byArchetype: {},
    });

    const rotatedId = rotateAnonymousId();
    expect(rotatedId).not.toBe(initialId);
    expect(rotatedId).toMatch(/^gd-[a-f0-9]{8}-[a-f0-9]{4}$/);

    const retaggedRaw = globalThis.localStorage.getItem('ghost_diver_save_1');
    expect(JSON.parse(retaggedRaw!).anonymousId).toBe(rotatedId);

    const clearedProfile = clearAllLocalCache();
    expect(clearedProfile.anonymousId).not.toBe(rotatedId);
    expect(clearedProfile.telemetry).toEqual({
      totalDives: 0,
      totalExtractions: 0,
      totalDefeats: 0,
      totalCombatsWon: 0,
      totalKnowledgeExtracted: 0,
      byTierVariant: {},
      byArchetype: {},
    });
    expect(loadSlots().every((slot) => slot.stats === null)).toBe(true);
  });

  it('computes medians accurately for empty, odd, and even sample sets', () => {
    expect(computeMedian([])).toBe(0);
    expect(computeMedian([4200])).toBe(4200);
    expect(computeMedian([5000, 1000, 3000])).toBe(3000);
    expect(computeMedian([1000, 2000, 4000, 8000])).toBe(3000);
    expect(computeMedian([1001, 1002])).toBe(1002);
  });

  it('records per-tierVariant and per-archetype playtest telemetry, caps samples at 50, rejects PII keys, and exports cleanly', () => {
    recordProblemTelemetry({ tierVariant: '1-4', solveMs: 4000, firstTryCorrect: true });
    recordProblemTelemetry({ tierVariant: '1-4', solveMs: 2000, firstTryCorrect: false });
    recordProblemTelemetry({ tierVariant: '1-4', solveMs: 6000, firstTryCorrect: true });
    recordProblemTelemetry({ archetype: 'MEDITATION', solveMs: 3500, firstTryCorrect: true });

    // Invalid / PII keys must be silently ignored
    recordProblemTelemetry({
      tierVariant: 'jane@example.com',
      archetype: 'Jane Doe <pii>',
      solveMs: 1234,
      firstTryCorrect: true,
    });

    const telemetry = loadTelemetry();
    expect(telemetry.byTierVariant['1-4']).toEqual({
      attempts: 3,
      firstTryCorrect: 2,
      firstTryAccuracy: 0.6667,
      medianSolveMs: 4000,
      solveMsSamples: [4000, 2000, 6000],
    });
    expect(telemetry.byArchetype['MEDITATION']).toEqual({
      attempts: 1,
      firstTryCorrect: 1,
      firstTryAccuracy: 1,
      medianSolveMs: 3500,
      solveMsSamples: [3500],
    });
    expect(Object.keys(telemetry.byTierVariant)).toEqual(['1-4']);
    expect(Object.keys(telemetry.byArchetype)).toEqual(['MEDITATION']);

    // Ring buffer caps solveMsSamples at 50 and clamps extreme durations to 300_000
    for (let i = 1; i <= 60; i++) {
      recordProblemTelemetry({
        tierVariant: '2-1',
        solveMs: i === 60 ? 999_999 : i * 100,
        firstTryCorrect: true,
      });
    }
    const capped = loadTelemetry().byTierVariant['2-1'];
    expect(capped.attempts).toBe(60);
    expect(capped.solveMsSamples).toHaveLength(50);
    expect(capped.solveMsSamples[0]).toBe(1100);
    expect(capped.solveMsSamples[49]).toBe(300_000);

    // Export includes new telemetry without PII
    const exported = exportAnonymizedCacheData();
    expect(exported.telemetry.byTierVariant['1-4']?.medianSolveMs).toBe(4000);
    expect(exported.telemetry.byArchetype['MEDITATION']?.firstTryAccuracy).toBe(1);
    const serialized = JSON.stringify(exported);
    expect(serialized).not.toContain('jane@example.com');
    expect(serialized).not.toContain('Jane Doe');
  });

  it('hydrates older v1 telemetry payloads safely and strips injected invalid keys on load', () => {
    globalThis.localStorage.setItem(
      'ghost_diver_telemetry_v1',
      JSON.stringify({
        totalDives: 4,
        totalExtractions: 2,
        totalDefeats: 1,
        totalCombatsWon: 9,
        totalKnowledgeExtracted: 700,
      })
    );

    expect(loadTelemetry()).toEqual({
      totalDives: 4,
      totalExtractions: 2,
      totalDefeats: 1,
      totalCombatsWon: 9,
      totalKnowledgeExtracted: 700,
      byTierVariant: {},
      byArchetype: {},
    });

    // Inject malformed/PII keys directly in localStorage and verify loadTelemetry strips them
    globalThis.localStorage.setItem(
      'ghost_diver_telemetry_v1',
      JSON.stringify({
        totalDives: 1,
        byTierVariant: {
          '3-2': { attempts: 2, firstTryCorrect: 5, solveMsSamples: [-10, 2500, 500_000] },
          'email@test.com': { attempts: 1, firstTryCorrect: 1, solveMsSamples: [1000] },
        },
        byArchetype: {
          MEDITATION: { attempts: 1, firstTryCorrect: 1, solveMsSamples: [1500] },
          'bad key!': { attempts: 1, firstTryCorrect: 1, solveMsSamples: [1000] },
        },
      })
    );

    const sanitized = loadTelemetry();
    expect(Object.keys(sanitized.byTierVariant)).toEqual(['3-2']);
    expect(sanitized.byTierVariant['3-2']).toEqual({
      attempts: 2,
      firstTryCorrect: 2, // clamped to <= attempts
      firstTryAccuracy: 1,
      medianSolveMs: 2500,
      solveMsSamples: [0, 2500, 300_000],
    });
    expect(Object.keys(sanitized.byArchetype)).toEqual(['MEDITATION']);
  });

  it('falls back gracefully to in-memory cache when browser localStorage throws', () => {
    const throwingStorage = {
      length: 0,
      clear: () => {
        throw new Error('SecurityError');
      },
      getItem: () => {
        throw new Error('SecurityError');
      },
      key: () => null,
      removeItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;

    vi.stubGlobal('localStorage', throwingStorage);

    const profile = getAnonymizedCacheProfile();
    expect(profile.storageMode).toBe('memory');
    expect(profile.anonymousId).toMatch(/^gd-[a-f0-9]{8}-[a-f0-9]{4}$/);

    saveSlot(1, { ...INITIAL_STATS, knowledge: 90 });
    const slots = loadSlots();
    expect(slots[0].stats?.knowledge).toBe(90);
  });
});
