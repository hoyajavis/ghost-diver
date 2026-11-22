import { NeuralChipId, SectorMasteryMap } from '../types';

export const MAX_EQUIPPED_CHIPS = 2;
export const NEURAL_DAMPENER_SCAR_CHANCE = 0.4;
export const SYNC_MATRIX_FP_SHARD_RATIO = 0.5;
export const GARDEN_SHARD_TARGET_FOR_BLEND = 1400;
export const GARDEN_MASTERY_SOLVES_TARGET = 60;
export const GARDEN_SHARD_TARGET_PURE = 2000;

export const NEURAL_CHIP_IDS: readonly NeuralChipId[] = [
  'STRUCTURAL_SIGHT',
  'OVERCLOCK_CHIP',
  'PATTERN_LENS',
  'SYNC_MATRIX',
  'NEURAL_DAMPENER',
] as const;

export interface NeuralChipDefinition {
  id: NeuralChipId;
  name: string;
  shortLabel: string;
  summary: string;
  unlockHint: string;
}

export const NEURAL_CHIPS: readonly NeuralChipDefinition[] = [
  {
    id: 'STRUCTURAL_SIGHT',
    name: 'Structural Sight',
    shortLabel: 'Sight',
    summary:
      'Auto-reveals the strategy clue on Step 1 of Combo problems without spending a Hint Pack.',
    unlockHint: 'Open your first Blue Cache.',
  },
  {
    id: 'OVERCLOCK_CHIP',
    name: 'Overclock Chip',
    shortLabel: 'Overclock',
    summary:
      'Grants +50% extra Direct Strike Shards (+100% total) and +50% faster procedural FP gain.',
    unlockHint: 'Defeat any Sector Apex Boss.',
  },
  {
    id: 'PATTERN_LENS',
    name: 'Pattern Lens',
    shortLabel: 'Pattern',
    summary:
      'Conceptual Shield Breaks deal direct INT damage and misses trigger a Counter-Hack Parry to halve damage.',
    unlockHint: 'Complete a Signal Sweep with ≥ 70% accuracy.',
  },
  {
    id: 'SYNC_MATRIX',
    name: 'Sync Matrix',
    shortLabel: 'Sync',
    summary:
      'Alternating Conceptual checks into Procedural strikes boosts damage & Shards, and leftover FP converts to Shards on extraction.',
    unlockHint: 'Defeat a Sector 2+ Apex Boss (Floor 10+).',
  },
  {
    id: 'NEURAL_DAMPENER',
    name: 'Neural Dampener',
    shortLabel: 'Dampener',
    summary:
      'Cuts Neural Scar infliction chance on defeat by 60% and softens The Blur & Calculation Lag penalties.',
    unlockHint: 'Clear any Neural Scar or open a Sector 2+ Blue Cache.',
  },
] as const;

export const NEURAL_CHIP_MAP: Record<NeuralChipId, NeuralChipDefinition> = {
  STRUCTURAL_SIGHT: NEURAL_CHIPS[0],
  OVERCLOCK_CHIP: NEURAL_CHIPS[1],
  PATTERN_LENS: NEURAL_CHIPS[2],
  SYNC_MATRIX: NEURAL_CHIPS[3],
  NEURAL_DAMPENER: NEURAL_CHIPS[4],
};

export function hasEquippedChip(
  equippedChips: readonly string[] | undefined,
  chipId: NeuralChipId
): boolean {
  if (!Array.isArray(equippedChips)) return false;
  return equippedChips.includes(chipId);
}

export function toggleEquipChip(
  unlockedChips: readonly NeuralChipId[],
  equippedChips: readonly NeuralChipId[],
  chipId: NeuralChipId
): NeuralChipId[] {
  if (equippedChips.includes(chipId)) {
    return equippedChips.filter((id) => id !== chipId);
  }
  if (!unlockedChips.includes(chipId)) {
    return [...equippedChips];
  }
  if (equippedChips.length >= MAX_EQUIPPED_CHIPS) {
    return [...equippedChips];
  }
  return [...equippedChips, chipId];
}

export function unlockChipIfNeeded(
  unlockedChips: readonly NeuralChipId[],
  chipId: NeuralChipId
): { unlockedChips: NeuralChipId[]; newlyUnlocked: NeuralChipId | null } {
  if (unlockedChips.includes(chipId)) {
    return { unlockedChips: [...unlockedChips], newlyUnlocked: null };
  }
  return {
    unlockedChips: [...unlockedChips, chipId],
    newlyUnlocked: chipId,
  };
}

export function shouldInflictScar(
  equippedChips: readonly string[] | undefined,
  rng: () => number = Math.random
): boolean {
  if (!hasEquippedChip(equippedChips, 'NEURAL_DAMPENER')) {
    return true;
  }
  return rng() < NEURAL_DAMPENER_SCAR_CHANCE;
}

export function calculateSyncMatrixFpBonus(
  fp: number,
  equippedChips: readonly string[] | undefined
): number {
  if (!hasEquippedChip(equippedChips, 'SYNC_MATRIX')) {
    return 0;
  }
  if (typeof fp !== 'number' || !Number.isFinite(fp)) {
    return 0;
  }
  return Math.floor(Math.max(0, fp) * SYNC_MATRIX_FP_SHARD_RATIO);
}

const SECTOR_MASTERY_KEY_REGEX = /^(?:[1-9]|1[0-2])$/;

export function recordSectorMastery(
  mastery: SectorMasteryMap,
  tier: number,
  kind: 'PROCEDURAL' | 'CONCEPTUAL'
): SectorMasteryMap {
  const next: SectorMasteryMap = {};
  for (const [key, entry] of Object.entries(mastery)) {
    if (!SECTOR_MASTERY_KEY_REGEX.test(key) || !entry) {
      continue;
    }
    const parsedKey = Number(key);
    next[parsedKey] = {
      proceduralCorrect:
        typeof entry.proceduralCorrect === 'number' && Number.isFinite(entry.proceduralCorrect)
          ? Math.max(0, Math.floor(entry.proceduralCorrect))
          : 0,
      conceptualCorrect:
        typeof entry.conceptualCorrect === 'number' && Number.isFinite(entry.conceptualCorrect)
          ? Math.max(0, Math.floor(entry.conceptualCorrect))
          : 0,
    };
  }

  if (typeof tier !== 'number' || !Number.isFinite(tier)) {
    return next;
  }

  const safeTier = Math.min(12, Math.max(1, Math.floor(tier)));
  const current = next[safeTier] ?? { proceduralCorrect: 0, conceptualCorrect: 0 };
  next[safeTier] = {
    proceduralCorrect: current.proceduralCorrect + (kind === 'PROCEDURAL' ? 1 : 0),
    conceptualCorrect: current.conceptualCorrect + (kind === 'CONCEPTUAL' ? 1 : 0),
  };

  return next;
}

export function calculateGardenRestoration(
  lifetimeShardsExtracted: number,
  sectorMastery?: SectorMasteryMap
): number {
  const safeShards =
    typeof lifetimeShardsExtracted === 'number' && Number.isFinite(lifetimeShardsExtracted)
      ? Math.max(0, Math.floor(lifetimeShardsExtracted))
      : 0;

  let totalMasterySolves = 0;
  if (sectorMastery && typeof sectorMastery === 'object') {
    for (const [key, entry] of Object.entries(sectorMastery)) {
      if (!SECTOR_MASTERY_KEY_REGEX.test(key) || !entry) {
        continue;
      }
      const proc =
        typeof entry.proceduralCorrect === 'number' && Number.isFinite(entry.proceduralCorrect)
          ? Math.max(0, Math.floor(entry.proceduralCorrect))
          : 0;
      const conc =
        typeof entry.conceptualCorrect === 'number' && Number.isFinite(entry.conceptualCorrect)
          ? Math.max(0, Math.floor(entry.conceptualCorrect))
          : 0;
      totalMasterySolves += proc + conc;
    }
  }

  const shardBlendPercent = Math.min(
    70,
    Math.floor((safeShards / GARDEN_SHARD_TARGET_FOR_BLEND) * 70)
  );
  const masteryBlendPercent = Math.min(
    30,
    Math.floor((totalMasterySolves / GARDEN_MASTERY_SOLVES_TARGET) * 30)
  );
  const pureShardPercent = Math.min(
    100,
    Math.floor((safeShards / GARDEN_SHARD_TARGET_PURE) * 100)
  );

  return Math.min(100, Math.max(0, Math.max(shardBlendPercent + masteryBlendPercent, pureShardPercent)));
}
