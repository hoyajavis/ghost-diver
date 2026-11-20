import { describe, expect, it } from 'vitest';
import {
  APEX_HP_MULTIPLIER,
  canDescendFromFloor,
  clampFloor,
  clampTier,
  computeBfsField,
  FLOORS_PER_SECTOR,
  getApexHpForTier,
  getApexShieldLayersForTier,
  getBankableHintPacks,
  getDiveCost,
  getEnemyCountForFloor,
  getNextUnlockedFloor,
  getPatrolBaseHpForTier,
  getReachablePositions,
  getShortestPathKeys,
  getTierForFloor,
  isFloorExitLocked,
  MAX_ENEMIES_PER_FLOOR,
  MAX_FLOOR,
  MAX_TIER,
  posKey,
  SAFE_SPAWN_MIN_DISTANCE,
  stepEnemies,
} from '../dungeonLogic';
import { getRandomScar, POSSIBLE_SCARS } from '../scarData';
import { Enemy } from '../../types';

describe('dungeonLogic', () => {
  it('computes dive costs accurately with Floor 1 free', () => {
    expect(getDiveCost(1)).toBe(0);
    expect(getDiveCost(0)).toBe(0);
    expect(getDiveCost(2)).toBe(50);
    expect(getDiveCost(6)).toBe(250);
  });

  it('clamps floors and tiers cleanly to 1..MAX_FLOOR and 1..MAX_TIER', () => {
    expect(MAX_TIER).toBe(12);
    expect(FLOORS_PER_SECTOR).toBe(5);
    expect(MAX_FLOOR).toBe(60);

    expect(clampFloor(-5)).toBe(1);
    expect(clampFloor(0)).toBe(1);
    expect(clampFloor(NaN)).toBe(1);
    expect(clampFloor(15.9)).toBe(15);
    expect(clampFloor(60)).toBe(60);
    expect(clampFloor(61)).toBe(60);
    expect(clampFloor(999)).toBe(60);

    expect(clampTier(-2)).toBe(1);
    expect(clampTier(0)).toBe(1);
    expect(clampTier(Infinity)).toBe(1);
    expect(clampTier(7.4)).toBe(7);
    expect(clampTier(12)).toBe(12);
    expect(clampTier(13)).toBe(12);
    expect(clampTier(99)).toBe(12);
  });

  it('maps floors to sectors/tiers accurately and caps at Tier 12', () => {
    expect(getTierForFloor(1)).toBe(1);
    expect(getTierForFloor(5)).toBe(1);
    expect(getTierForFloor(6)).toBe(2);
    expect(getTierForFloor(55)).toBe(11);
    expect(getTierForFloor(56)).toBe(12);
    expect(getTierForFloor(60)).toBe(12);
    expect(getTierForFloor(120)).toBe(12);
  });

  it('unlocks Floor 6 after extracting from Floor 5 and caps unlocks at Floor 60', () => {
    expect(getNextUnlockedFloor(5, 1)).toBe(6);
    expect(getNextUnlockedFloor(10, 6)).toBe(11);
    expect(getNextUnlockedFloor(5, 20)).toBe(20);
    expect(getNextUnlockedFloor(59, 55)).toBe(60);
    expect(getNextUnlockedFloor(60, 56)).toBe(60);
    expect(getNextUnlockedFloor(60, 60)).toBe(60);
    expect(getNextUnlockedFloor(75, 60)).toBe(60);
  });

  it('forbids descending past Floor 60', () => {
    expect(canDescendFromFloor(1)).toBe(true);
    expect(canDescendFromFloor(5)).toBe(true);
    expect(canDescendFromFloor(59)).toBe(true);
    expect(canDescendFromFloor(60)).toBe(false);
    expect(canDescendFromFloor(61)).toBe(false);
    expect(canDescendFromFloor(NaN)).toBe(false);
  });

  it('prevents banking free preloaded hints while still banking earned hints', () => {
    expect(getBankableHintPacks(2, 2)).toBe(0);
    expect(getBankableHintPacks(1, 2)).toBe(0);
    expect(getBankableHintPacks(4, 2)).toBe(2);
    expect(getBankableHintPacks(1, 0)).toBe(1);
  });

  it('scales Floors 1-4 progressively and caps Floor 5 Apex encounters to 2 (S1-2) or 3 (S3-12)', () => {
    expect(MAX_ENEMIES_PER_FLOOR).toBe(5);
    // Sector 1 (F1-2 -> 2, F3-4 -> 3, F5 Apex -> 2)
    expect(getEnemyCountForFloor(0)).toBe(2);
    expect(getEnemyCountForFloor(1)).toBe(2);
    expect(getEnemyCountForFloor(2)).toBe(2);
    expect(getEnemyCountForFloor(3)).toBe(3);
    expect(getEnemyCountForFloor(4)).toBe(3);
    expect(getEnemyCountForFloor(5)).toBe(2);
    // Sector 2 (F6-9 -> 3, F10 Apex -> 2)
    expect(getEnemyCountForFloor(6)).toBe(3);
    expect(getEnemyCountForFloor(9)).toBe(3);
    expect(getEnemyCountForFloor(10)).toBe(2);
    // Sector 3 (F11-12 -> 3, F13-14 -> 4, F15 Apex -> 3)
    expect(getEnemyCountForFloor(11)).toBe(3);
    expect(getEnemyCountForFloor(12)).toBe(3);
    expect(getEnemyCountForFloor(13)).toBe(4);
    expect(getEnemyCountForFloor(14)).toBe(4);
    expect(getEnemyCountForFloor(15)).toBe(3);
    // Sector 4 (F16-19 -> 4, F20 Apex -> 3)
    expect(getEnemyCountForFloor(16)).toBe(4);
    expect(getEnemyCountForFloor(19)).toBe(4);
    expect(getEnemyCountForFloor(20)).toBe(3);
    // Sector 5+ (Floors 1-4 -> 5, Floor 5 Apex -> 3; >60 clamps to Floor 60 -> 3)
    expect(getEnemyCountForFloor(21)).toBe(MAX_ENEMIES_PER_FLOOR);
    expect(getEnemyCountForFloor(25)).toBe(3);
    expect(getEnemyCountForFloor(59)).toBe(MAX_ENEMIES_PER_FLOOR);
    expect(getEnemyCountForFloor(60)).toBe(3);
    expect(getEnemyCountForFloor(100)).toBe(3);
    expect(getEnemyCountForFloor(500)).toBe(3);
  });

  it('computes patrol base HP, 1.5x Apex HP, and Apex shield layers cleanly across all tiers', () => {
    expect(APEX_HP_MULTIPLIER).toBe(1.5);
    expect(getPatrolBaseHpForTier(0)).toBe(30);
    expect(getPatrolBaseHpForTier(1)).toBe(30);
    expect(getPatrolBaseHpForTier(3)).toBe(50);
    expect(getPatrolBaseHpForTier(12)).toBe(140);
    expect(getPatrolBaseHpForTier(99)).toBe(140);

    expect(getApexHpForTier(1)).toBe(45);
    expect(getApexHpForTier(3)).toBe(75);
    expect(getApexHpForTier(12)).toBe(210);

    expect(getApexShieldLayersForTier(0)).toBe(1);
    expect(getApexShieldLayersForTier(1)).toBe(1);
    expect(getApexShieldLayersForTier(2)).toBe(1);
    expect(getApexShieldLayersForTier(3)).toBe(2);
    expect(getApexShieldLayersForTier(12)).toBe(2);
    expect(getApexShieldLayersForTier(99)).toBe(2);
  });

  it('finds only tiles reachable via BFS around walls', () => {
    // Seal off (0,0) completely with walls at (1,0) and (0,1)
    const trapped = getReachablePositions(5, { x: 0, y: 0 }, [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);
    expect(trapped).toEqual([{ x: 0, y: 0 }]);

    // Open 3x3 grid with 1 wall has 8 reachable tiles
    const open = getReachablePositions(3, { x: 0, y: 0 }, [{ x: 1, y: 1 }]);
    expect(open).toHaveLength(8);
  });

  it('computes exact BFS detour distances and reconstructs connected shortest paths', () => {
    expect(SAFE_SPAWN_MIN_DISTANCE).toBe(3);

    // 4x4 grid with vertical wall barrier at x=1, y=0..2 forcing a detour through (1,3)
    const walls = [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ];
    const start = { x: 0, y: 0 };
    const target = { x: 2, y: 0 };
    const bfs = computeBfsField(4, start, walls);

    expect(bfs.distances.get('0,0')).toBe(0);
    expect(bfs.distances.get('0,3')).toBe(3);
    expect(bfs.distances.get('1,3')).toBe(4);
    expect(bfs.distances.get('2,3')).toBe(5);
    expect(bfs.distances.get('2,0')).toBe(8); // Manhattan is 2, wall detour is 8
    expect(bfs.distances.has('1,0')).toBe(false);
    expect(bfs.maxDistance).toBe(9); // (3,0) is at distance 9

    const pathKeys = getShortestPathKeys(start, target, bfs.parents);
    expect(pathKeys.size).toBe(9); // dist 8 + 1
    expect(pathKeys.has('0,0')).toBe(true);
    expect(pathKeys.has('1,3')).toBe(true);
    expect(pathKeys.has('2,0')).toBe(true);

    // Verify every step on the reconstructed path is 4-directionally adjacent to its parent
    let cursor = target;
    let steps = 0;
    while (posKey(cursor) !== posKey(start)) {
      const parent = bfs.parents.get(posKey(cursor));
      expect(parent).not.toBeNull();
      expect(parent).toBeDefined();
      const manhattan = Math.abs(cursor.x - parent!.x) + Math.abs(cursor.y - parent!.y);
      expect(manhattan).toBe(1);
      cursor = parent!;
      steps++;
    }
    expect(steps).toBe(8);

    // Unreachable wall tile returns an empty shortest path
    expect(getShortestPathKeys(start, { x: 1, y: 0 }, bfs.parents).size).toBe(0);
    // Start === target returns singleton set
    expect(getShortestPathKeys(start, start, bfs.parents)).toEqual(new Set(['0,0']));
  });

  it('moves non-Apex enemies without stacking and holds Apex Bosses stationary', () => {
    const enemies: Enemy[] = [
      { id: 'e1', pos: { x: 2, y: 0 }, hp: 30, maxHp: 30, type: 'SURFACE_WASTES', variant: 1 },
      { id: 'e2', pos: { x: 1, y: 1 }, hp: 30, maxHp: 30, type: 'SURFACE_WASTES', variant: 1 },
    ];

    // Both want to converge toward (1,0)
    const moved = stepEnemies({
      enemies,
      playerPos: { x: 0, y: 0 },
      gridSize: 5,
      walls: [],
      chests: [{ id: 'c1', pos: { x: 0, y: 1 }, type: 'RED', opened: false }],
      logs: [{ id: 'l1', pos: { x: 2, y: 1 }, loreId: 'LOG_001', collected: false }],
      stairs: { x: 4, y: 4 },
      rng: () => 0.9, // prefer horizontal first
    });

    const positions = moved.map((e) => posKey(e.pos));
    expect(new Set(positions).size).toBe(moved.length);
    expect(positions).not.toContain('0,0'); // player
    expect(positions).not.toContain('0,1'); // unopened chest
    expect(positions).not.toContain('2,1'); // uncollected log
    expect(positions).not.toContain('4,4'); // stairs

    // Stationary Apex Bosses do not move and guards cannot overlap them
    const bossAndGuard: Enemy[] = [
      {
        id: 'apex',
        pos: { x: 2, y: 0 },
        hp: 45,
        maxHp: 45,
        type: 'SURFACE_WASTES_APEX',
        variant: 4,
        isApex: true,
        shieldLayers: 1,
        maxShieldLayers: 1,
      },
      {
        id: 'guard',
        pos: { x: 3, y: 0 },
        hp: 30,
        maxHp: 30,
        type: 'SURFACE_WASTES',
        variant: 1,
      },
    ];

    const steppedBoss = stepEnemies({
      enemies: bossAndGuard,
      playerPos: { x: 0, y: 0 },
      gridSize: 5,
      walls: [],
      chests: [],
      logs: [],
      stairs: { x: 4, y: 4 },
      rng: () => 0.9, // guard wants to step left onto (2,0) where Apex sits
    });

    expect(steppedBoss[0].pos).toEqual({ x: 2, y: 0 }); // Apex stays stationary
    expect(steppedBoss[1].pos).toEqual({ x: 3, y: 0 }); // Guard blocked by stationary Apex
  });

  it('locks the Exit on Floor 5 of each sector while an Apex enemy is alive', () => {
    const aliveApex: Enemy = {
      id: 'e_5_0',
      pos: { x: 8, y: 9 },
      hp: 45,
      maxHp: 45,
      type: 'SURFACE_WASTES_APEX',
      variant: 4,
      isApex: true,
      shieldLayers: 1,
      maxShieldLayers: 1,
    };
    const legacyApex: Enemy = {
      id: 'e_10_0',
      pos: { x: 8, y: 9 },
      hp: 60,
      maxHp: 60,
      type: 'FRACTURED_BRIDGES_APEX',
      variant: 4,
    };
    const guard: Enemy = {
      id: 'e_5_1',
      pos: { x: 5, y: 5 },
      hp: 30,
      maxHp: 30,
      type: 'SURFACE_WASTES',
      variant: 1,
    };

    expect(isFloorExitLocked({ floor: 5, enemies: [aliveApex, guard] })).toBe(true);
    expect(isFloorExitLocked({ floor: 10, enemies: [legacyApex] })).toBe(true);
    expect(isFloorExitLocked({ floor: 60, enemies: [aliveApex] })).toBe(true);

    // Unlocked once Apex is defeated (even if guards remain)
    expect(isFloorExitLocked({ floor: 5, enemies: [guard] })).toBe(false);
    expect(isFloorExitLocked({ floor: 60, enemies: [] })).toBe(false);

    // Never locked on Floors 1-4 or floor 0
    expect(isFloorExitLocked({ floor: 1, enemies: [aliveApex] })).toBe(false);
    expect(isFloorExitLocked({ floor: 4, enemies: [aliveApex] })).toBe(false);
    expect(isFloorExitLocked({ floor: 0, enemies: [aliveApex] })).toBe(false);
  });

  it('does not assign duplicate neural scars', () => {
    const existing = [POSSIBLE_SCARS[0], POSSIBLE_SCARS[1]];
    expect(getRandomScar(existing)).toBe(POSSIBLE_SCARS[2]);
    expect(getRandomScar([...POSSIBLE_SCARS])).toBeNull();
  });
});
