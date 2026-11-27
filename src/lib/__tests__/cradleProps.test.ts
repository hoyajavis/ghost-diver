import { describe, expect, it } from 'vitest';
import { PlayerStats } from '../../types';
import {
  CRADLE_GRID_SIZE,
  CRADLE_PROPS,
  CRADLE_SYS_POSITION,
  getCradleFloorGrid,
  getCradleFloorZone,
  getCradlePropAt,
  getCradleSysLines,
  getMossStageAt,
  getPropLines,
  inspectCradleProp,
  inspectCradleTile,
  isCradleSysAt,
  talkToCradleSys,
} from '../cradleProps';

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

describe('cradleProps', () => {
  it('places all 5 Bunker Props and CRADLE_SYS on exact non-overlapping coordinates inside the 5x5 grid', () => {
    expect(CRADLE_GRID_SIZE).toBe(5);
    expect(CRADLE_PROPS).toHaveLength(5);
    expect(CRADLE_SYS_POSITION).toEqual({ x: 2, y: 2 });
    expect(isCradleSysAt(2, 2)).toBe(true);
    expect(isCradleSysAt(2, 3)).toBe(false);

    expect(getCradlePropAt(2, 0)?.id).toBe('MAIN_POWER_CONDUIT');
    expect(getCradlePropAt(1, 0)?.id).toBe('ARCHIVE_SERVER_RACK');
    expect(getCradlePropAt(3, 0)?.id).toBe('SIM_COOLING_VENTS');
    expect(getCradlePropAt(0, 3)?.id).toBe('SPARE_RIG_LOCKER');
    expect(getCradlePropAt(4, 3)?.id).toBe('SEALED_BLAST_DOOR');
    expect(getCradlePropAt(2, 2)).toBeNull();

    // Ensure zero collisions with the 6 hub stations, CRADLE_SYS, and player start (2,3)
    const reservedKeys = new Set([
      '2,1', // Neural Chair
      '0,2', // Workbench
      '4,2', // Archivist Logs
      '2,4', // Green-Print
      '0,0', // Diver Manual
      '4,0', // Combat Simulator
      '2,2', // CRADLE_SYS
      '2,3', // Player spawn
    ]);

    const seenPropKeys = new Set<string>();
    for (const prop of CRADLE_PROPS) {
      expect(prop.x).toBeGreaterThanOrEqual(0);
      expect(prop.x).toBeLessThan(CRADLE_GRID_SIZE);
      expect(prop.y).toBeGreaterThanOrEqual(0);
      expect(prop.y).toBeLessThan(CRADLE_GRID_SIZE);
      const key = `${prop.x},${prop.y}`;
      expect(reservedKeys.has(key)).toBe(false);
      expect(seenPropKeys.has(key)).toBe(false);
      seenPropKeys.add(key);
    }
  });

  it('builds architectural floor zones with power conduit traces and growing Green-Print moss tiles', () => {
    const freshStats = makeStats();
    const freshGrid = getCradleFloorGrid(freshStats);
    expect(freshGrid).toHaveLength(25);

    // Center hub (2,2) connects power conduits in all 4 directions
    const center = getCradleFloorZone(2, 2, freshStats);
    expect(center.hasConduit).toBe(true);
    expect(center.conduit).toEqual({ north: true, south: true, east: true, west: true });
    expect(center.conduitPowered).toBe(false);
    expect(center.mossStage).toBe('NONE');
    expect(center.zoneLabel).toBe('POWER_SPINE');

    // Out-of-bounds returns safe default
    const oob = getCradleFloorZone(-1, 9, freshStats);
    expect(oob.hasConduit).toBe(false);
    expect(oob.mossStage).toBe('NONE');

    // Extracting Floor 5+ powers the conduit lines
    const poweredStats = makeStats({ maxExtractedFloor: 5 });
    expect(getCradleFloorZone(2, 2, poweredStats).conduitPowered).toBe(true);

    // Moss stages expand outward from Green-Print (2,4) as restoration rises
    expect(getMossStageAt(2, 4, 0)).toBe('NONE');
    expect(getMossStageAt(2, 4, 10)).toBe('SPROUT');
    expect(getMossStageAt(1, 4, 10)).toBe('SPROUT');
    expect(getMossStageAt(2, 4, 30)).toBe('LUSH');
    expect(getMossStageAt(2, 3, 45)).toBe('SPROUT');
    expect(getMossStageAt(1, 2, 85)).toBe('SPROUT');
    expect(getMossStageAt(1, 2, 95)).toBe('LUSH');

    // High-restoration save produces CONDUIT_MOSS on shared power+moss tiles like (2,3) and (1,2)
    const lushStats = makeStats({
      maxExtractedFloor: 25,
      lifetimeShardsExtracted: 2000,
    });
    const lushWalkway = getCradleFloorZone(2, 3, lushStats);
    expect(lushWalkway.hasConduit).toBe(true);
    expect(lushWalkway.mossStage).toBe('LUSH');
    expect(lushWalkway.zoneLabel).toBe('CONDUIT_MOSS');
  });

  it('evolves all 5 Bunker Props with save state and cycles cleanly on repeat inspect', () => {
    const fresh = makeStats();

    // 1. Main Power Conduit reacts to maxExtractedFloor and neuralScars
    const powerFresh = inspectCradleProp('MAIN_POWER_CONDUIT', fresh, 0);
    expect(powerFresh.text).toMatch(/low power/i);
    const powerDeep = inspectCradleProp(
      'MAIN_POWER_CONDUIT',
      makeStats({ maxExtractedFloor: 55, neuralScars: ['THE_BLUR'] }),
      0
    );
    expect(powerDeep.text).toMatch(/Floor 50/i);
    const powerScarLine = inspectCradleProp(
      'MAIN_POWER_CONDUIT',
      makeStats({ maxExtractedFloor: 10, neuralScars: ['THE_BLUR'] }),
      1
    );
    expect(powerScarLine.text).toMatch(/Neural Scar/i);

    // 2. Archive Server Rack reacts to unlockedLore and LOG_777
    const rackEmpty = inspectCradleProp('ARCHIVE_SERVER_RACK', fresh, 0);
    expect(rackEmpty.text).toMatch(/quiet and dark/i);
    const rackFull = inspectCradleProp(
      'ARCHIVE_SERVER_RACK',
      makeStats({
        unlockedLore: [
          'LOG_001',
          'LOG_012',
          'LOG_042',
          'LOG_089',
          'LOG_114',
          'LOG_201',
          'LOG_404',
          'LOG_777',
        ],
      }),
      0
    );
    expect(rackFull.text).toMatch(/nearly complete/i);
    const rackArchitect = inspectCradleProp(
      'ARCHIVE_SERVER_RACK',
      makeStats({ unlockedLore: ['LOG_777'] }),
      1
    );
    expect(rackArchitect.text).toMatch(/Architect/i);

    // 3. Sim Cooling Vents reacts to activeReconBuff
    expect(inspectCradleProp('SIM_COOLING_VENTS', fresh, 0).text).toMatch(/idle/i);
    expect(
      inspectCradleProp('SIM_COOLING_VENTS', makeStats({ activeReconBuff: 'START_FP_20' }), 0).text
    ).toMatch(/\+20 FP/i);
    expect(
      inspectCradleProp('SIM_COOLING_VENTS', makeStats({ activeReconBuff: 'SHARD_BONUS_15' }), 0)
        .text
    ).toMatch(/\+15% bonus Shards/i);
    expect(
      inspectCradleProp('SIM_COOLING_VENTS', makeStats({ activeReconBuff: 'FREE_SHIELD' }), 0).text
    ).toMatch(/Shield/i);

    // 4. Spare Rig & Gear Locker reacts to equippedChips and unlockedChips
    expect(inspectCradleProp('SPARE_RIG_LOCKER', fresh, 0).text).toMatch(/empty/i);
    expect(
      inspectCradleProp(
        'SPARE_RIG_LOCKER',
        makeStats({ unlockedChips: ['OVERCLOCK_CHIP'], equippedChips: ['OVERCLOCK_CHIP'] }),
        0
      ).text
    ).toMatch(/One Loadout Chip/i);
    expect(
      inspectCradleProp(
        'SPARE_RIG_LOCKER',
        makeStats({
          unlockedChips: ['OVERCLOCK_CHIP', 'PATTERN_LENS'],
          equippedChips: ['OVERCLOCK_CHIP', 'PATTERN_LENS'],
        }),
        0
      ).text
    ).toMatch(/full 2-chip setup/i);

    // 5. Sealed Blast Door & Periscope reacts to Green-Print restoration %
    expect(inspectCradleProp('SEALED_BLAST_DOOR', fresh, 0).text).toMatch(/gray clouds/i);
    expect(
      inspectCradleProp('SEALED_BLAST_DOOR', makeStats({ lifetimeShardsExtracted: 1800 }), 0).text
    ).toMatch(/Bright green shoots/i);

    // Repeat-inspect cycling wraps cleanly and handles invalid counts safely
    const lines = getPropLines('MAIN_POWER_CONDUIT', fresh);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    const first = inspectCradleProp('MAIN_POWER_CONDUIT', fresh, 0);
    const second = inspectCradleProp('MAIN_POWER_CONDUIT', fresh, 1);
    const third = inspectCradleProp('MAIN_POWER_CONDUIT', fresh, 2);
    const wrapped = inspectCradleProp('MAIN_POWER_CONDUIT', fresh, lines.length);
    const negative = inspectCradleProp('MAIN_POWER_CONDUIT', fresh, -4);
    const nanCount = inspectCradleProp('MAIN_POWER_CONDUIT', fresh, Number.NaN);

    expect(first.text).not.toBe(second.text);
    expect(second.text).not.toBe(third.text);
    expect(wrapped.text).toBe(first.text);
    expect(wrapped.lineIndex).toBe(0);
    expect(negative.lineIndex).toBe(0);
    expect(nanCount.lineIndex).toBe(0);
  });

  it('makes CRADLE_SYS react dynamically to save state and cycle dialogue on repeat talk', () => {
    // Dive 1 welcome
    const dive1 = talkToCradleSys(makeStats(), 0);
    expect(dive1.speaker).toBe('CRADLE_SYS');
    expect(dive1.tag).toContain('DIVE 1');
    expect(dive1.text).toMatch(/first dive/i);

    // Neural Scar alert takes top priority
    const scarred = talkToCradleSys(
      makeStats({ maxExtractedFloor: 10, neuralScars: ['STATIC_EYE'] }),
      0
    );
    expect(scarred.tag).toContain('SCAR ALERT');
    expect(scarred.text).toMatch(/Neural Scar/i);

    // Unequipped unlocked chip nudge
    const unequippedChip = talkToCradleSys(
      makeStats({
        maxExtractedFloor: 5,
        lifetimeShardsExtracted: 120,
        unlockedChips: ['STRUCTURAL_SIGHT'],
        equippedChips: [],
      }),
      0
    );
    expect(unequippedChip.text).toMatch(/Loadout Chip/i);

    // Recon reward available nudge
    const reconReady = talkToCradleSys(
      makeStats({
        maxExtractedFloor: 5,
        lifetimeShardsExtracted: 120,
        reconRewardAvailable: true,
        activeReconBuff: null,
      }),
      0
    );
    expect(reconReady.text).toMatch(/Signal Sweep/i);

    // Deep strata Floor 50+ reaction
    const deepDiver = talkToCradleSys(
      makeStats({ maxExtractedFloor: 52, lifetimeShardsExtracted: 1600 }),
      0
    );
    expect(deepDiver.text).toMatch(/Floor 50/i);

    // Repeat talk cycles through all lines and inspectCradleTile routes (2,2) to CRADLE_SYS
    const allLines = getCradleSysLines(makeStats());
    expect(allLines.length).toBeGreaterThanOrEqual(3);
    expect(inspectCradleTile(2, 2, makeStats(), 1)?.text).toBe(allLines[1]);
    expect(inspectCradleTile(2, 0, makeStats(), 0)?.id).toBe('MAIN_POWER_CONDUIT');
    expect(inspectCradleTile(1, 1, makeStats(), 0)).toBeNull();
  });
});
