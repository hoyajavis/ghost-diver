import {
  AnonymizedCacheExport,
  AnonymizedCacheProfile,
  AnonymizedPlayerTelemetry,
  PlayerStats,
  ProblemMetricSummary,
  SaveSlot,
  UpgradeLevels,
} from '../types';
import { clampFloor } from './dungeonLogic';

export const SAVE_SCHEMA_VERSION = 3;

const SLOT_IDS = [1, 2, 3] as const;
const SAVE_KEY_PREFIX = 'ghost_diver_save_';
const LEGACY_SAVE_KEY_PREFIX = 'extraction_academy_save_';
const ANON_ID_KEY = 'ghost_diver_anon_id';
const TELEMETRY_KEY = 'ghost_diver_telemetry_v1';
const MAX_SOLVE_SAMPLES = 50;
const MAX_SOLVE_MS = 300_000;
const TIER_VARIANT_KEY_REGEX = /^\d{1,2}-\d{1,2}$/;
const ARCHETYPE_KEY_REGEX = /^[A-Z0-9_-]{1,32}$/;

export interface PersistedSaveData {
  schemaVersion: number;
  anonymousId: string;
  updatedAtDay: string;
  knowledge: number;
  hintPacks: number;
  neuralScars: string[];
  maxExtractedFloor: number;
  upgrades: UpgradeLevels;
  unlockedLore: string[];
  encounteredTiers: string[];
  unlockedDemos: string[];
}

export const INITIAL_STATS: PlayerStats = {
  hp: 100,
  maxHp: 100,
  fp: 100,
  maxFp: 100,
  knowledge: 0,
  hintPacks: 0,
  runKnowledge: 0,
  runHintPacks: 0,
  runBuffs: [],
  neuralScars: [],
  maxExtractedFloor: 1,
  upgrades: {
    hp: 0,
    fp: 0,
    hints: 0,
  },
  unlockedLore: [],
  encounteredTiers: [],
  unlockedDemos: [],
};

export const INITIAL_TELEMETRY: AnonymizedPlayerTelemetry = {
  totalDives: 0,
  totalExtractions: 0,
  totalDefeats: 0,
  totalCombatsWon: 0,
  totalKnowledgeExtracted: 0,
  byTierVariant: {},
  byArchetype: {},
};

const memoryFallback = new Map<string, string>();

function getBrowserLocalStorage(): Storage | null {
  try {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return null;
    }
    const storage = globalThis.localStorage;
    if (!storage) return null;
    const probeKey = '__ghost_diver_cache_probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

export function getStorageMode(): 'localStorage' | 'memory' {
  return getBrowserLocalStorage() ? 'localStorage' : 'memory';
}

function safeGetItem(key: string): string | null {
  const storage = getBrowserLocalStorage();
  if (storage) {
    try {
      return storage.getItem(key);
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  }
  return memoryFallback.get(key) ?? null;
}

function safeSetItem(key: string, value: string): void {
  const storage = getBrowserLocalStorage();
  if (storage) {
    try {
      storage.setItem(key, value);
      return;
    } catch {
      // Fall back to in-memory cache if quota is exceeded or blocked
    }
  }
  memoryFallback.set(key, value);
}

function safeRemoveItem(key: string): void {
  const storage = getBrowserLocalStorage();
  if (storage) {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage removal errors and still clear memory fallback
    }
  }
  memoryFallback.delete(key);
}

function getCoarseUtcDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function isValidAnonymousId(value: string | null): value is string {
  return typeof value === 'string' && /^gd-[a-f0-9]{8}-[a-f0-9]{4}$/.test(value);
}

export function generateAnonymousId(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      const raw = globalThis.crypto.randomUUID().replace(/-/g, '').toLowerCase();
      return `gd-${raw.slice(0, 8)}-${raw.slice(8, 12)}`;
    }
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      const bytes = new Uint8Array(6);
      globalThis.crypto.getRandomValues(bytes);
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `gd-${hex.slice(0, 8)}-${hex.slice(8, 12)}`;
    }
  } catch {
    // Fall through to Math.random fallback
  }

  const partA = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0');
  const partB = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');
  return `gd-${partA}-${partB}`;
}

export function getOrCreateAnonymousId(): string {
  const existing = safeGetItem(ANON_ID_KEY);
  if (isValidAnonymousId(existing)) {
    return existing;
  }
  const created = generateAnonymousId();
  safeSetItem(ANON_ID_KEY, created);
  return created;
}

export function rotateAnonymousId(): string {
  const nextId = generateAnonymousId();
  safeSetItem(ANON_ID_KEY, nextId);

  // Re-tag existing cached save slots with the rotated anonymous ID
  for (const id of SLOT_IDS) {
    const raw = safeGetItem(`${SAVE_KEY_PREFIX}${id}`);
    if (!raw) continue;
    try {
      const hydrated = hydrateSaveData(JSON.parse(raw));
      if (hydrated) {
        safeSetItem(`${SAVE_KEY_PREFIX}${id}`, JSON.stringify(toPersistedSaveData(hydrated, nextId)));
      }
    } catch {
      // Ignore malformed slots during ID rotation
    }
  }

  return nextId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function migrateVariantList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const migrated = value.flatMap((entry) => {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      return [`${entry}-1`, `${entry}-2`];
    }
    if (typeof entry === 'string' && entry.trim().length > 0) {
      return [entry];
    }
    return [];
  });
  return Array.from(new Set(migrated));
}

export function hydrateSaveData(raw: unknown): PlayerStats | null {
  if (!isRecord(raw)) return null;

  const rawUpgrades = isRecord(raw.upgrades) ? raw.upgrades : {};
  const upgrades: UpgradeLevels = {
    hp: toNonNegativeInt(rawUpgrades.hp, 0),
    fp: toNonNegativeInt(rawUpgrades.fp, 0),
    hints: toNonNegativeInt(rawUpgrades.hints, 0),
  };

  const maxHp = 100 + upgrades.hp * 20;
  const maxFp = 100 + upgrades.fp * 20;

  return {
    ...INITIAL_STATS,
    knowledge: toNonNegativeInt(raw.knowledge, 0),
    hintPacks: toNonNegativeInt(raw.hintPacks, 0),
    neuralScars: toStringArray(raw.neuralScars),
    maxExtractedFloor: clampFloor(toNonNegativeInt(raw.maxExtractedFloor, 1)),
    upgrades,
    unlockedLore: Array.from(new Set(toStringArray(raw.unlockedLore))),
    encounteredTiers: migrateVariantList(raw.encounteredTiers),
    unlockedDemos: migrateVariantList(raw.unlockedDemos),
    maxHp,
    maxFp,
    hp: maxHp,
    fp: maxFp,
  };
}

/**
 * Strictly allow-lists gameplay fields and attaches only a pseudonymous local ID
 * and coarse UTC day bucket so no PII can ever be written to browser storage.
 */
export function toPersistedSaveData(
  stats: PlayerStats,
  anonymousId: string = getOrCreateAnonymousId()
): PersistedSaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    anonymousId,
    updatedAtDay: getCoarseUtcDay(),
    knowledge: toNonNegativeInt(stats.knowledge, 0),
    hintPacks: toNonNegativeInt(stats.hintPacks, 0),
    neuralScars: Array.from(new Set(toStringArray(stats.neuralScars))),
    maxExtractedFloor: clampFloor(toNonNegativeInt(stats.maxExtractedFloor, 1)),
    upgrades: {
      hp: toNonNegativeInt(stats.upgrades?.hp, 0),
      fp: toNonNegativeInt(stats.upgrades?.fp, 0),
      hints: toNonNegativeInt(stats.upgrades?.hints, 0),
    },
    unlockedLore: Array.from(new Set(toStringArray(stats.unlockedLore))),
    encounteredTiers: Array.from(new Set(toStringArray(stats.encounteredTiers))),
    unlockedDemos: Array.from(new Set(toStringArray(stats.unlockedDemos))),
  };
}

export function loadSlots(): SaveSlot[] {
  const anonymousId = getOrCreateAnonymousId();

  return SLOT_IDS.map((id) => {
    const primaryKey = `${SAVE_KEY_PREFIX}${id}`;
    const legacyKey = `${LEGACY_SAVE_KEY_PREFIX}${id}`;
    const saved = safeGetItem(primaryKey);

    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        return { id, stats: hydrateSaveData(parsed) };
      } catch (e) {
        console.error(`Failed to load slot ${id}`, e);
        return { id, stats: null };
      }
    }

    // Transparently migrate legacy localStorage saves into anonymized local cache
    const legacySaved = safeGetItem(legacyKey);
    if (legacySaved) {
      try {
        const parsed: unknown = JSON.parse(legacySaved);
        const hydrated = hydrateSaveData(parsed);
        if (hydrated) {
          safeSetItem(primaryKey, JSON.stringify(toPersistedSaveData(hydrated, anonymousId)));
          safeRemoveItem(legacyKey);
          return { id, stats: hydrated };
        }
      } catch (e) {
        console.error(`Failed to migrate legacy slot ${id}`, e);
      }
    }

    return { id, stats: null };
  });
}

export function saveSlot(id: number, stats: PlayerStats): void {
  const saveData = toPersistedSaveData(stats);
  safeSetItem(`${SAVE_KEY_PREFIX}${id}`, JSON.stringify(saveData));
}

export function deleteSlot(id: number): void {
  safeRemoveItem(`${SAVE_KEY_PREFIX}${id}`);
  safeRemoveItem(`${LEGACY_SAVE_KEY_PREFIX}${id}`);
}

export function computeMedian(samples: number[]): number {
  const valid = samples.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (valid.length === 0) return 0;
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return Math.round(sorted[mid]);
  }
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function clampSolveMs(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(MAX_SOLVE_MS, Math.max(0, Math.round(value)));
}

function sanitizeProblemMetricSummary(raw: unknown): ProblemMetricSummary | null {
  if (!isRecord(raw)) return null;
  const attempts = toNonNegativeInt(raw.attempts, 0);
  const firstTryCorrect = Math.min(attempts, toNonNegativeInt(raw.firstTryCorrect, 0));
  const rawSamples = Array.isArray(raw.solveMsSamples) ? raw.solveMsSamples : [];
  const solveMsSamples = rawSamples
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
    .map((n) => clampSolveMs(n))
    .slice(-MAX_SOLVE_SAMPLES);

  const firstTryAccuracy = attempts > 0 ? Number((firstTryCorrect / attempts).toFixed(4)) : 0;
  const medianSolveMs = computeMedian(solveMsSamples);

  return {
    attempts,
    firstTryCorrect,
    firstTryAccuracy,
    medianSolveMs,
    solveMsSamples,
  };
}

function sanitizeMetricMap(
  raw: unknown,
  keyRegex: RegExp
): Record<string, ProblemMetricSummary> {
  if (!isRecord(raw)) return {};
  const result: Record<string, ProblemMetricSummary> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (!keyRegex.test(key)) continue;
    const summary = sanitizeProblemMetricSummary(val);
    if (summary) {
      result[key] = summary;
    }
  }
  return result;
}

function createEmptyTelemetry(): AnonymizedPlayerTelemetry {
  return {
    ...INITIAL_TELEMETRY,
    byTierVariant: {},
    byArchetype: {},
  };
}

export function loadTelemetry(): AnonymizedPlayerTelemetry {
  const saved = safeGetItem(TELEMETRY_KEY);
  if (!saved) return createEmptyTelemetry();

  try {
    const parsed: unknown = JSON.parse(saved);
    if (!isRecord(parsed)) return createEmptyTelemetry();
    return {
      totalDives: toNonNegativeInt(parsed.totalDives, 0),
      totalExtractions: toNonNegativeInt(parsed.totalExtractions, 0),
      totalDefeats: toNonNegativeInt(parsed.totalDefeats, 0),
      totalCombatsWon: toNonNegativeInt(parsed.totalCombatsWon, 0),
      totalKnowledgeExtracted: toNonNegativeInt(parsed.totalKnowledgeExtracted, 0),
      byTierVariant: sanitizeMetricMap(parsed.byTierVariant, TIER_VARIANT_KEY_REGEX),
      byArchetype: sanitizeMetricMap(parsed.byArchetype, ARCHETYPE_KEY_REGEX),
    };
  } catch {
    return createEmptyTelemetry();
  }
}

export type TelemetryEventType = 'DIVE_STARTED' | 'EXTRACTION' | 'DEFEAT' | 'COMBAT_WON';

export function recordTelemetryEvent(
  event: TelemetryEventType,
  knowledgeAmount: number = 0
): AnonymizedPlayerTelemetry {
  const current = loadTelemetry();
  const next: AnonymizedPlayerTelemetry = {
    ...current,
    byTierVariant: { ...current.byTierVariant },
    byArchetype: { ...current.byArchetype },
  };

  switch (event) {
    case 'DIVE_STARTED':
      next.totalDives += 1;
      break;
    case 'EXTRACTION':
      next.totalExtractions += 1;
      next.totalKnowledgeExtracted += toNonNegativeInt(knowledgeAmount, 0);
      break;
    case 'DEFEAT':
      next.totalDefeats += 1;
      break;
    case 'COMBAT_WON':
      next.totalCombatsWon += 1;
      break;
  }

  safeSetItem(TELEMETRY_KEY, JSON.stringify(next));
  return next;
}

function updateMetricBucket(
  existing: ProblemMetricSummary | undefined,
  solveMs: number,
  firstTryCorrect: boolean
): ProblemMetricSummary {
  const attempts = (existing?.attempts ?? 0) + 1;
  const firstTryCount = (existing?.firstTryCorrect ?? 0) + (firstTryCorrect ? 1 : 0);
  const solveMsSamples = [...(existing?.solveMsSamples ?? []), solveMs].slice(-MAX_SOLVE_SAMPLES);
  const firstTryAccuracy = Number((firstTryCount / attempts).toFixed(4));
  const medianSolveMs = computeMedian(solveMsSamples);

  return {
    attempts,
    firstTryCorrect: firstTryCount,
    firstTryAccuracy,
    medianSolveMs,
    solveMsSamples,
  };
}

export function recordProblemTelemetry(params: {
  tierVariant?: string;
  archetype?: string;
  solveMs: number;
  firstTryCorrect: boolean;
}): AnonymizedPlayerTelemetry {
  const current = loadTelemetry();
  const next: AnonymizedPlayerTelemetry = {
    ...current,
    byTierVariant: { ...current.byTierVariant },
    byArchetype: { ...current.byArchetype },
  };

  const safeSolveMs = clampSolveMs(params.solveMs);
  const firstTry = Boolean(params.firstTryCorrect);
  let updated = false;

  if (typeof params.tierVariant === 'string' && TIER_VARIANT_KEY_REGEX.test(params.tierVariant)) {
    next.byTierVariant[params.tierVariant] = updateMetricBucket(
      next.byTierVariant[params.tierVariant],
      safeSolveMs,
      firstTry
    );
    updated = true;
  }

  if (typeof params.archetype === 'string' && ARCHETYPE_KEY_REGEX.test(params.archetype)) {
    next.byArchetype[params.archetype] = updateMetricBucket(
      next.byArchetype[params.archetype],
      safeSolveMs,
      firstTry
    );
    updated = true;
  }

  if (updated) {
    safeSetItem(TELEMETRY_KEY, JSON.stringify(next));
  }

  return next;
}

export function getAnonymizedCacheProfile(): AnonymizedCacheProfile {
  return {
    anonymousId: getOrCreateAnonymousId(),
    storageMode: getStorageMode(),
    telemetry: loadTelemetry(),
  };
}

export function exportAnonymizedCacheData(): AnonymizedCacheExport {
  const anonymousId = getOrCreateAnonymousId();
  const slots = loadSlots();

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    exportedDay: getCoarseUtcDay(),
    anonymousId,
    telemetry: loadTelemetry(),
    slots: slots.map((slot) => ({
      slotId: slot.id,
      data: slot.stats
        ? (toPersistedSaveData(slot.stats, anonymousId) as unknown as Record<string, unknown>)
        : null,
    })),
  };
}

export function clearAllLocalCache(): AnonymizedCacheProfile {
  for (const id of SLOT_IDS) {
    deleteSlot(id);
  }
  safeRemoveItem(TELEMETRY_KEY);
  safeRemoveItem(ANON_ID_KEY);
  memoryFallback.clear();

  return getAnonymizedCacheProfile();
}

export function resetMemoryCacheForTests(): void {
  memoryFallback.clear();
}
