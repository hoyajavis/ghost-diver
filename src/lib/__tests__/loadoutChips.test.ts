import { describe, expect, it } from 'vitest';
import {
  calculateGardenRestoration,
  calculateSyncMatrixFpBonus,
  hasEquippedChip,
  MAX_EQUIPPED_CHIPS,
  NEURAL_CHIP_IDS,
  NEURAL_CHIP_MAP,
  NEURAL_CHIPS,
  NEURAL_DAMPENER_SCAR_CHANCE,
  recordSectorMastery,
  shouldInflictScar,
  toggleEquipChip,
  unlockChipIfNeeded,
} from '../loadoutChips';
import { NeuralChipId, SectorMasteryMap } from '../../types';

describe('loadoutChips', () => {
  it('defines all 5 neural chips with metadata, 1-sentence summaries, and unlock hints', () => {
    expect(MAX_EQUIPPED_CHIPS).toBe(2);
    expect(NEURAL_CHIP_IDS).toHaveLength(5);
    expect(NEURAL_CHIPS).toHaveLength(5);

    for (const id of NEURAL_CHIP_IDS) {
      const def = NEURAL_CHIP_MAP[id];
      expect(def).toBeDefined();
      expect(def.id).toBe(id);
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.shortLabel.length).toBeGreaterThan(0);
      expect(def.summary.length).toBeGreaterThan(10);
      expect(def.unlockHint.length).toBeGreaterThan(10);
    }
  });

  it('checks equipped chips safely including undefined arrays', () => {
    expect(hasEquippedChip(undefined, 'OVERCLOCK_CHIP')).toBe(false);
    expect(hasEquippedChip([], 'OVERCLOCK_CHIP')).toBe(false);
    expect(hasEquippedChip(['PATTERN_LENS'], 'OVERCLOCK_CHIP')).toBe(false);
    expect(hasEquippedChip(['PATTERN_LENS', 'OVERCLOCK_CHIP'], 'OVERCLOCK_CHIP')).toBe(true);
  });

  it('enforces unlocked-only, max-2 slot cap, and immutable toggling in toggleEquipChip', () => {
    const unlocked: NeuralChipId[] = ['STRUCTURAL_SIGHT', 'OVERCLOCK_CHIP', 'PATTERN_LENS'];
    const initial: NeuralChipId[] = [];

    // Locked chip cannot be equipped
    expect(toggleEquipChip(unlocked, initial, 'SYNC_MATRIX')).toEqual([]);

    // Equip first and second unlocked chips
    const one = toggleEquipChip(unlocked, initial, 'STRUCTURAL_SIGHT');
    expect(one).toEqual(['STRUCTURAL_SIGHT']);
    expect(initial).toEqual([]); // immutable

    const two = toggleEquipChip(unlocked, one, 'OVERCLOCK_CHIP');
    expect(two).toEqual(['STRUCTURAL_SIGHT', 'OVERCLOCK_CHIP']);

    // Third unlocked chip is ignored while 2 slots are full
    const stillTwo = toggleEquipChip(unlocked, two, 'PATTERN_LENS');
    expect(stillTwo).toEqual(['STRUCTURAL_SIGHT', 'OVERCLOCK_CHIP']);

    // Unequipping an active chip frees a slot
    const afterUnequip = toggleEquipChip(unlocked, two, 'STRUCTURAL_SIGHT');
    expect(afterUnequip).toEqual(['OVERCLOCK_CHIP']);

    // Now the third chip can be equipped
    const swapped = toggleEquipChip(unlocked, afterUnequip, 'PATTERN_LENS');
    expect(swapped).toEqual(['OVERCLOCK_CHIP', 'PATTERN_LENS']);
  });

  it('unlocks chips idempotently via unlockChipIfNeeded without mutating input', () => {
    const start: NeuralChipId[] = ['STRUCTURAL_SIGHT'];

    const first = unlockChipIfNeeded(start, 'OVERCLOCK_CHIP');
    expect(first.newlyUnlocked).toBe('OVERCLOCK_CHIP');
    expect(first.unlockedChips).toEqual(['STRUCTURAL_SIGHT', 'OVERCLOCK_CHIP']);
    expect(start).toEqual(['STRUCTURAL_SIGHT']);

    const duplicate = unlockChipIfNeeded(first.unlockedChips, 'OVERCLOCK_CHIP');
    expect(duplicate.newlyUnlocked).toBeNull();
    expect(duplicate.unlockedChips).toEqual(['STRUCTURAL_SIGHT', 'OVERCLOCK_CHIP']);
  });

  it('applies 100% scar chance without NEURAL_DAMPENER and 40% chance with NEURAL_DAMPENER', () => {
    expect(NEURAL_DAMPENER_SCAR_CHANCE).toBe(0.4);
    expect(shouldInflictScar(undefined, () => 0.99)).toBe(true);
    expect(shouldInflictScar(['OVERCLOCK_CHIP'], () => 0.99)).toBe(true);

    // With NEURAL_DAMPENER: < 0.4 inflicts, >= 0.4 blocks
    expect(shouldInflictScar(['NEURAL_DAMPENER'], () => 0.0)).toBe(true);
    expect(shouldInflictScar(['NEURAL_DAMPENER'], () => 0.399)).toBe(true);
    expect(shouldInflictScar(['NEURAL_DAMPENER'], () => 0.4)).toBe(false);
    expect(shouldInflictScar(['NEURAL_DAMPENER'], () => 0.95)).toBe(false);
  });

  it('calculates SYNC_MATRIX leftover FP extraction bonus safely', () => {
    expect(calculateSyncMatrixFpBonus(100, undefined)).toBe(0);
    expect(calculateSyncMatrixFpBonus(100, ['OVERCLOCK_CHIP'])).toBe(0);
    expect(calculateSyncMatrixFpBonus(0, ['SYNC_MATRIX'])).toBe(0);
    expect(calculateSyncMatrixFpBonus(-20, ['SYNC_MATRIX'])).toBe(0);
    expect(calculateSyncMatrixFpBonus(Number.NaN, ['SYNC_MATRIX'])).toBe(0);
    expect(calculateSyncMatrixFpBonus(Number.POSITIVE_INFINITY, ['SYNC_MATRIX'])).toBe(0);
    expect(calculateSyncMatrixFpBonus(15, ['SYNC_MATRIX'])).toBe(7);
    expect(calculateSyncMatrixFpBonus(100, ['SYNC_MATRIX'])).toBe(50);
    expect(calculateSyncMatrixFpBonus(140, ['SYNC_MATRIX', 'PATTERN_LENS'])).toBe(70);
  });

  it('records sector mastery immutably with tier clamping to 1..12', () => {
    const empty: SectorMasteryMap = {};
    const step1 = recordSectorMastery(empty, 1, 'PROCEDURAL');
    expect(step1).toEqual({ 1: { proceduralCorrect: 1, conceptualCorrect: 0 } });
    expect(empty).toEqual({});

    const step2 = recordSectorMastery(step1, 1, 'CONCEPTUAL');
    expect(step2).toEqual({ 1: { proceduralCorrect: 1, conceptualCorrect: 1 } });
    expect(step1).toEqual({ 1: { proceduralCorrect: 1, conceptualCorrect: 0 } });

    // Out-of-range tiers clamp cleanly
    const lowClamp = recordSectorMastery(step2, -3, 'PROCEDURAL');
    expect(lowClamp[1]).toEqual({ proceduralCorrect: 2, conceptualCorrect: 1 });

    const highClamp = recordSectorMastery(lowClamp, 99, 'CONCEPTUAL');
    expect(highClamp[12]).toEqual({ proceduralCorrect: 0, conceptualCorrect: 1 });

    // Non-finite tier is a safe no-op
    const nanUpdate = recordSectorMastery(highClamp, Number.NaN, 'PROCEDURAL');
    expect(nanUpdate).toEqual(highClamp);
  });

  it('computes non-regressing Garden restoration from lifetimeShardsExtracted and sectorMastery', () => {
    expect(calculateGardenRestoration(0)).toBe(0);
    expect(calculateGardenRestoration(-100)).toBe(0);
    expect(calculateGardenRestoration(Number.NaN)).toBe(0);

    // Monotonicity across increasing Shards
    let prev = 0;
    for (let shards = 0; shards <= 2500; shards += 50) {
      const next = calculateGardenRestoration(shards);
      expect(next).toBeGreaterThanOrEqual(prev);
      expect(next).toBeLessThanOrEqual(100);
      prev = next;
    }
    expect(calculateGardenRestoration(2000)).toBe(100);
    expect(calculateGardenRestoration(5000)).toBe(100);

    // Mastery contributes smoothly and reaches 100% with 1,400 Shards + 60 solves
    const partialMastery: SectorMasteryMap = {
      1: { proceduralCorrect: 15, conceptualCorrect: 15 },
      2: { proceduralCorrect: 15, conceptualCorrect: 15 },
    };
    expect(calculateGardenRestoration(0, partialMastery)).toBe(30);
    expect(calculateGardenRestoration(1400, partialMastery)).toBe(100);

    // Adding mastery never decreases restoration
    const baseAt500 = calculateGardenRestoration(500, {});
    const withMasteryAt500 = calculateGardenRestoration(500, {
      1: { proceduralCorrect: 5, conceptualCorrect: 5 },
    });
    expect(withMasteryAt500).toBeGreaterThan(baseAt500);
  });

  it('sanitizes NaN/Infinity counts and ignores non-canonical keys in recordSectorMastery and calculateGardenRestoration', () => {
    const malformedMastery = {
      '1': { proceduralCorrect: 10, conceptualCorrect: 2 },
      '01': { proceduralCorrect: 1, conceptualCorrect: 99 },
      ' 2 ': { proceduralCorrect: 30, conceptualCorrect: 30 },
      '3': { proceduralCorrect: Number.NaN, conceptualCorrect: Number.POSITIVE_INFINITY },
      '4': { proceduralCorrect: Number.NEGATIVE_INFINITY, conceptualCorrect: -5 },
    } as unknown as SectorMasteryMap;

    const updated = recordSectorMastery(malformedMastery, 2, 'PROCEDURAL');
    // Canonical key '1' is preserved and NOT overwritten by '01'
    expect(updated[1]).toEqual({ proceduralCorrect: 10, conceptualCorrect: 2 });
    // Target tier 2 starts from 0 because ' 2 ' is non-canonical and ignored
    expect(updated[2]).toEqual({ proceduralCorrect: 1, conceptualCorrect: 0 });
    // Non-finite and negative counts are sanitized to 0
    expect(updated[3]).toEqual({ proceduralCorrect: 0, conceptualCorrect: 0 });
    expect(updated[4]).toEqual({ proceduralCorrect: 0, conceptualCorrect: 0 });
    // Non-canonical keys do not survive into the output map
    expect(Object.keys(updated).sort()).toEqual(['1', '2', '3', '4']);

    // calculateGardenRestoration ignores non-canonical keys ('01', ' 2 ') so they are not double-counted
    const duplicateKeyMastery = {
      '1': { proceduralCorrect: 15, conceptualCorrect: 15 },
      '01': { proceduralCorrect: 30, conceptualCorrect: 30 },
      ' 2 ': { proceduralCorrect: 30, conceptualCorrect: 30 },
    } as unknown as SectorMasteryMap;
    // Only canonical '1' (30 solves => 30 / 60 * 30 = 15%) should count
    expect(calculateGardenRestoration(0, duplicateKeyMastery)).toBe(15);
  });
});
