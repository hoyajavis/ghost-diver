import { describe, expect, it } from 'vitest';
import { ENEMY_TIERS } from '../enemyData';
import { getReachablePositions, MAX_ENEMIES_PER_FLOOR, posKey } from '../dungeonLogic';
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

  it('spawns mixed variants and an Apex Sentinel with boosted HP on Floor 5 of each tier', () => {
    const dungeon = generateFloor(15, 3); // Tier 3 has 3 variants, Floor 15 has floorInTier === 5
    const tierData = ENEMY_TIERS[3];

    expect(dungeon.enemies.length).toBeGreaterThanOrEqual(3);
    expect(dungeon.enemies[0].type).toBe(`${tierData.name}_APEX`);
    expect(dungeon.enemies[0].maxHp).toBe(Math.round(tierData.baseHp * 1.25));

    const variantsSpawned = new Set(dungeon.enemies.map((e) => e.variant));
    expect(variantsSpawned.size).toBeGreaterThan(1);
  });
});
