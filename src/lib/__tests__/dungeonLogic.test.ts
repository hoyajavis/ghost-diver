import { describe, expect, it } from 'vitest';
import {
  getBankableHintPacks,
  getDiveCost,
  getEnemyCountForFloor,
  getReachablePositions,
  MAX_ENEMIES_PER_FLOOR,
  posKey,
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

  it('prevents banking free preloaded hints while still banking earned hints', () => {
    expect(getBankableHintPacks(2, 2)).toBe(0);
    expect(getBankableHintPacks(1, 2)).toBe(0);
    expect(getBankableHintPacks(4, 2)).toBe(2);
    expect(getBankableHintPacks(1, 0)).toBe(1);
  });

  it('caps enemy counts safely even at extreme depths', () => {
    expect(getEnemyCountForFloor(1)).toBe(2);
    expect(getEnemyCountForFloor(10)).toBe(4);
    expect(getEnemyCountForFloor(100)).toBe(MAX_ENEMIES_PER_FLOOR);
    expect(getEnemyCountForFloor(500)).toBe(MAX_ENEMIES_PER_FLOOR);
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

  it('moves enemies without stacking on each other or overlapping player/stairs/chests/logs', () => {
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
  });

  it('does not assign duplicate neural scars', () => {
    const existing = [POSSIBLE_SCARS[0], POSSIBLE_SCARS[1]];
    expect(getRandomScar(existing)).toBe(POSSIBLE_SCARS[2]);
    expect(getRandomScar([...POSSIBLE_SCARS])).toBeNull();
  });
});
