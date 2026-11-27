import { describe, expect, it } from 'vitest';
import { PlayerStats } from '../../types';
import {
  countArrivedCrew,
  getAllStationUnlockStatuses,
  getCrewResidentStatus,
  getStationResident,
  isStationUnlocked,
} from '../cradleUnlocks';
import { getCradleFloorZone, getCradleSysLines } from '../cradleProps';

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

describe('cradleUnlocks', () => {
  it('keeps only Neural Chair, Diver Manual, and CRADLE_SYS online on Dive 1', () => {
    const dive1 = makeStats();
    const statuses = getAllStationUnlockStatuses(dive1);

    expect(statuses.DIVE.unlocked).toBe(true);
    expect(statuses.GUIDE.unlocked).toBe(true);
    expect(statuses.UPGRADES.unlocked).toBe(false);
    expect(statuses.LORE.unlocked).toBe(false);
    expect(statuses.TRAINING.unlocked).toBe(false);
    expect(statuses.GARDEN.unlocked).toBe(false);
    expect(countArrivedCrew(dive1)).toBe(1);

    // Branch conduits to offline stations stay dim on Dive 1
    expect(getCradleFloorZone(1, 2, dive1).conduitPowered).toBe(false);
    expect(getCradleFloorZone(3, 2, dive1).conduitPowered).toBe(false);
    expect(getCradleFloorZone(2, 3, dive1).conduitPowered).toBe(false);
  });

  it('powers on Workbench on first Shards/Scar and Archivist on first Data Log', () => {
    const firstShards = makeStats({ knowledge: 35 });
    expect(isStationUnlocked('UPGRADES', firstShards)).toBe(true);
    expect(getCrewResidentStatus('DR_ARIS_THORNE', firstShards).arrived).toBe(true);
    expect(getCradleFloorZone(1, 2, firstShards).conduitPowered).toBe(true);

    const firstScar = makeStats({ neuralScars: ['STATIC_EYE'] });
    expect(isStationUnlocked('UPGRADES', firstScar)).toBe(true);
    expect(getCrewResidentStatus('DR_ARIS_THORNE', firstScar).dialogue).toMatch(/Neural Scar/i);

    const firstLog = makeStats({ unlockedLore: ['LOG_001'] });
    expect(isStationUnlocked('LORE', firstLog)).toBe(true);
    expect(getCrewResidentStatus('DIVER_77', firstLog).arrived).toBe(true);
    expect(getCradleFloorZone(3, 2, firstLog).conduitPowered).toBe(true);
  });

  it('unlocks all 6 stations by Floor 5 while staggering Combat Analyst V (F10) and Botanist AI Core (F15 or 25%)', () => {
    const floor5 = makeStats({ maxExtractedFloor: 5, lifetimeShardsExtracted: 80 });
    const statuses = getAllStationUnlockStatuses(floor5);

    expect(statuses.DIVE.unlocked).toBe(true);
    expect(statuses.GUIDE.unlocked).toBe(true);
    expect(statuses.UPGRADES.unlocked).toBe(true);
    expect(statuses.LORE.unlocked).toBe(true);
    expect(statuses.TRAINING.unlocked).toBe(true);
    expect(statuses.GARDEN.unlocked).toBe(true);

    // At Floor 5: CRADLE_SYS + Dr. Aris Thorne + Diver 77 = 3 arrived
    expect(countArrivedCrew(floor5)).toBe(3);
    expect(getStationResident('TRAINING', floor5)?.arrived).toBe(false);
    expect(getStationResident('GARDEN', floor5)?.arrived).toBe(false);

    // At Floor 10: Combat Analyst V arrives
    const floor10 = makeStats({ maxExtractedFloor: 10, lifetimeShardsExtracted: 220 });
    expect(getCrewResidentStatus('COMBAT_ANALYST_V', floor10).arrived).toBe(true);
    expect(countArrivedCrew(floor10)).toBe(4);

    // At Floor 15 (or 25% restoration): Botanist AI Core arrives -> all 5 crew online
    const floor15 = makeStats({ maxExtractedFloor: 15, lifetimeShardsExtracted: 350 });
    expect(getCrewResidentStatus('BOTANIST_AI_CORE', floor15).arrived).toBe(true);
    expect(countArrivedCrew(floor15)).toBe(5);
    expect(getCradleSysLines(floor15)[2]).toMatch(/All five voices/i);

    // 25% restoration also wakes Botanist AI Core even before Floor 15
    const garden25 = makeStats({ maxExtractedFloor: 5, lifetimeShardsExtracted: 500 });
    expect(getCrewResidentStatus('BOTANIST_AI_CORE', garden25).arrived).toBe(true);
  });
});
