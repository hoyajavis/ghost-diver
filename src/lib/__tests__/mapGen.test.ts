import { describe, expect, it } from 'vitest';
import { ENEMY_TIERS } from '../enemyData';
import {
  getApexHpForTier,
  getPatrolBaseHpForTier,
  getReachablePositions,
  MAX_ENEMIES_PER_FLOOR,
  posKey,
} from '../dungeonLogic';
import { generateFloor } from '../mapGen';

describe('mapGen floor generation', () => {
  it('always produces reachable stairs, enemies, chests, and logs with zero overlaps', () => {
    const testFloors = [1, 2, 5, 15, 50, 60, 100, 200];

    for (const floor of testFloors) {
      const tier = Math.min(12, Math.max(1, Math.ceil(floor / 5)));
      for (let run = 0; run < 15; run++) {
        const dungeon = generateFloor(floor, tier);
        const reachable = getReachablePositions(dungeon.gridSize, dungeon.playerPos, dungeon.walls);
        const reachableSet = new Set(reachable.map(posKey));

        expect(dungeon.enemies.length).toBeLessThanOrEqual(MAX_ENEMIES_PER_FLOOR);
        expect(reachableSet.has(posKey(dungeon.stairs))).toBe(true);

        const occupied = new Set<string>([posKey(dungeon.playerPos), posKey(dungeon.stairs)]);
        for (const wall of dungeon.walls) {
          const key = posKey(wall);
          expect(occupied.has(key)).toBe(false);
          occupied.add(key);
        }

        for (const enemy of dungeon.enemies) {
          const key = posKey(enemy.pos);
          expect(reachableSet.has(key)).toBe(true);
          expect(occupied.has(key)).toBe(false);
          occupied.add(key);
        }

        for (const chest of dungeon.chests) {
          const key = posKey(chest.pos);
          expect(reachableSet.has(key)).toBe(true);
          expect(occupied.has(key)).toBe(false);
          occupied.add(key);
        }

        for (const log of dungeon.logs) {
          const key = posKey(log.pos);
          expect(reachableSet.has(key)).toBe(true);
          expect(occupied.has(key)).toBe(false);
          occupied.add(key);
        }
      }
    }
  });

  it('spawns mixed variants and an Apex Sentinel with 1.5x boosted HP on Floor 5 of each tier', () => {
    const dungeon = generateFloor(15, 3); // Tier 3 has 3 variants, Floor 15 has floorInTier === 5
    const tierData = ENEMY_TIERS[3];

    expect(dungeon.enemies.length).toBe(4);
    expect(dungeon.enemies[0].type).toBe(`${tierData.name}_APEX`);
    expect(dungeon.enemies[0].maxHp).toBe(getApexHpForTier(3));
    expect(dungeon.enemies[1].maxHp).toBe(getPatrolBaseHpForTier(3));

    const variantsSpawned = new Set(dungeon.enemies.map((e) => e.variant));
    expect(variantsSpawned.size).toBeGreaterThan(1);
  });

  it('clamps tier > 12 to Tier 12 instead of wrapping back to Tier 1', () => {
    const dungeon = generateFloor(61, 13);
    const tier12Data = ENEMY_TIERS[12];

    expect(dungeon.tier).toBe(12);
    expect(dungeon.enemies.length).toBeGreaterThan(0);
    expect(dungeon.enemies[0].type).toBe(tier12Data.name);
    expect(dungeon.enemies[0].maxHp).toBe(getPatrolBaseHpForTier(12));
  });

  it('sanitizes invalid and non-integer floors to finite integers >= 1 with defined enemy variants and positive HP', () => {
    const invalidFloors = [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 2.5];

    for (const rawFloor of invalidFloors) {
      const dungeon = generateFloor(rawFloor, 1);

      expect(Number.isFinite(dungeon.floor)).toBe(true);
      expect(Number.isInteger(dungeon.floor)).toBe(true);
      expect(dungeon.floor).toBeGreaterThanOrEqual(1);
      expect(dungeon.enemies.length).toBeGreaterThan(0);

      for (const enemy of dungeon.enemies) {
        expect(enemy.variant).toBeDefined();
        expect(Number.isInteger(enemy.variant)).toBe(true);
        expect(Number.isFinite(enemy.hp)).toBe(true);
        expect(enemy.hp).toBeGreaterThan(0);
        expect(Number.isFinite(enemy.maxHp)).toBe(true);
        expect(enemy.maxHp).toBeGreaterThan(0);
      }
    }

    // Fractional floor 2.5 floors to 2 (floorInTier === 2)
    const fractional = generateFloor(2.5, 1);
    expect(fractional.floor).toBe(2);
    expect(fractional.enemies[0].id).toBe('e_2_0');
  });
});
