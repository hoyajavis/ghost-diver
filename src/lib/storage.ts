import { PlayerStats, SaveSlot, UpgradeLevels } from '../types';

export const SAVE_SCHEMA_VERSION = 2;

export interface PersistedSaveData {
  schemaVersion: number;
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
    maxExtractedFloor: Math.max(1, toNonNegativeInt(raw.maxExtractedFloor, 1)),
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

export function toPersistedSaveData(stats: PlayerStats): PersistedSaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    knowledge: stats.knowledge,
    hintPacks: stats.hintPacks,
    neuralScars: stats.neuralScars,
    maxExtractedFloor: stats.maxExtractedFloor,
    upgrades: stats.upgrades,
    unlockedLore: stats.unlockedLore,
    encounteredTiers: stats.encounteredTiers,
    unlockedDemos: stats.unlockedDemos,
  };
}

export function loadSlots(): SaveSlot[] {
  return [1, 2, 3].map((id) => {
    const saved = localStorage.getItem(`extraction_academy_save_${id}`);
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        return { id, stats: hydrateSaveData(parsed) };
      } catch (e) {
        console.error(`Failed to load slot ${id}`, e);
      }
    }
    return { id, stats: null };
  });
}

export function saveSlot(id: number, stats: PlayerStats): void {
  const saveData = toPersistedSaveData(stats);
  localStorage.setItem(`extraction_academy_save_${id}`, JSON.stringify(saveData));
}

export function deleteSlot(id: number): void {
  localStorage.removeItem(`extraction_academy_save_${id}`);
}
