import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllLocalCache,
  exportAnonymizedCacheData,
  getAnonymizedCacheProfile,
  getOrCreateAnonymousId,
  hydrateSaveData,
  INITIAL_STATS,
  loadSlots,
  loadTelemetry,
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
    });
    expect(loadSlots().every((slot) => slot.stats === null)).toBe(true);
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
