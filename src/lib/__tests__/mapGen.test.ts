import { describe, expect, it } from 'vitest';
import { ENEMY_TIERS } from '../enemyData';
import {
  computeBfsField,
  getApexHpForTier,
  getApexShieldLayersForTier,
  getPatrolBaseHpForTier,
  getReachablePositions,
  getShortestPathKeys,
  getTierForFloor,
  MAX_ENEMIES_PER_FLOOR,
  posKey,
  SAFE_SPAWN_MIN_DISTANCE,
} from '../dungeonLogic';
import { generateFloor } from '../mapGen';

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('mapGen floor generation', () => {
  it('always produces reachable stairs, enemies, chests, and logs with zero overlaps', () => {
    const testFloors = [1, 2, 5, 15, 50, 60, 100, 200];

    for (const floor of testFloors) {
      const tier = Math.min(12, Math.max(1, Math.ceil(floor / 5)));
      for (let run = 0; run < 15; run++) {
        const dungeon = generateFloor(floor, tier, createSeededRng(floor * 100 + run + 1));
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
    const dungeon = generateFloor(15, 3, createSeededRng(1503)); // Tier 3 has 3 variants, Floor 15 has floorInTier === 5
    const tierData = ENEMY_TIERS[3];

    expect(dungeon.enemies.length).toBe(3);
    expect(dungeon.enemies[0].type).toBe(`${tierData.name}_APEX`);
    expect(dungeon.enemies[0].isApex).toBe(true);
    expect(dungeon.enemies[0].shieldLayers).toBe(2);
    expect(dungeon.enemies[0].maxShieldLayers).toBe(2);
    expect(dungeon.enemies[0].maxHp).toBe(getApexHpForTier(3));
    expect(dungeon.enemies[1].maxHp).toBe(getPatrolBaseHpForTier(3));

    const variantsSpawned = new Set(dungeon.enemies.map((e) => e.variant));
    expect(variantsSpawned.size).toBeGreaterThan(1);
  });

  it('enforces Safe Spawn Buffer (enemy BFS distance >= 3) and Far-Zone Exit across Floors 1-60', () => {
    for (let floor = 1; floor <= 60; floor++) {
      const tier = getTierForFloor(floor);
      for (let seedOffset = 0; seedOffset < 3; seedOffset++) {
        const dungeon = generateFloor(floor, tier, createSeededRng(floor * 31 + seedOffset + 7));
        const bfs = computeBfsField(dungeon.gridSize, dungeon.playerPos, dungeon.walls);

        // Far-Zone Exit check
        const exitDist = bfs.distances.get(posKey(dungeon.stairs));
        expect(exitDist).toBeDefined();
        expect(exitDist!).toBeGreaterThanOrEqual(dungeon.gridSize);
        expect(exitDist!).toBeGreaterThanOrEqual(Math.ceil(bfs.maxDistance * 0.75));

        // Safe Spawn Buffer check
        for (const enemy of dungeon.enemies) {
          const enemyDist = bfs.distances.get(posKey(enemy.pos));
          expect(enemyDist).toBeDefined();
          expect(enemyDist!).toBeGreaterThanOrEqual(SAFE_SPAWN_MIN_DISTANCE);
        }
      }
    }
  });

  it('places locked off-path Blue Caches (guaranteed on Floor 1 of every sector) without overlaps', () => {
    for (let floor = 1; floor <= 60; floor++) {
      const tier = getTierForFloor(floor);
      const floorInTier = ((floor - 1) % 5) + 1;
      const dungeon = generateFloor(floor, tier, createSeededRng(floor * 97 + 13));
      const bfs = computeBfsField(dungeon.gridSize, dungeon.playerPos, dungeon.walls);
      const canonicalPath = getShortestPathKeys(dungeon.playerPos, dungeon.stairs, bfs.parents);

      const blueCaches = dungeon.chests.filter((c) => c.type === 'BLUE');
      if (floorInTier === 1) {
        expect(blueCaches.length).toBeGreaterThanOrEqual(1);
        expect(blueCaches.length).toBeLessThanOrEqual(2);
      } else if (floorInTier === 5) {
        expect(blueCaches.length).toBe(1);
      } else {
        expect(blueCaches.length).toBeGreaterThanOrEqual(1);
        expect(blueCaches.length).toBeLessThanOrEqual(2);
      }

      const nonPathReachableCount = bfs.reachable.filter(
        (pos) => !canonicalPath.has(posKey(pos))
      ).length;

      for (const cache of blueCaches) {
        const key = posKey(cache.pos);
        expect(cache.locked).toBe(true);
        expect(cache.opened).toBe(false);
        expect(bfs.distances.has(key)).toBe(true);
        if (nonPathReachableCount > dungeon.enemies.length + blueCaches.length) {
          expect(canonicalPath.has(key)).toBe(false);
        }
      }
    }
  });

  it('anchors Floor 5 Apex Boss adjacent to Exit with proper shield layers and counts', () => {
    const bossFloors = [5, 10, 15, 20, 25, 60];

    for (const floor of bossFloors) {
      const tier = getTierForFloor(floor);
      const expectedCount = tier <= 2 ? 2 : 3;
      const expectedShields = getApexShieldLayersForTier(tier);

      for (let run = 0; run < 10; run++) {
        const dungeon = generateFloor(floor, tier, createSeededRng(floor * 53 + run + 19));
        expect(dungeon.enemies.length).toBe(expectedCount);

        const apexEnemies = dungeon.enemies.filter((e) => e.isApex);
        expect(apexEnemies).toHaveLength(1);

        const apex = apexEnemies[0];
        expect(apex.type.endsWith('_APEX')).toBe(true);
        expect(apex.shieldLayers).toBe(expectedShields);
        expect(apex.maxShieldLayers).toBe(expectedShields);

        const bfsFromStart = computeBfsField(dungeon.gridSize, dungeon.playerPos, dungeon.walls);
        const bfsFromExit = computeBfsField(dungeon.gridSize, dungeon.stairs, dungeon.walls);

        const apexDistFromStart = bfsFromStart.distances.get(posKey(apex.pos));
        const apexDistFromExit = bfsFromExit.distances.get(posKey(apex.pos));
        expect(apexDistFromStart).toBeGreaterThanOrEqual(SAFE_SPAWN_MIN_DISTANCE);
        expect(apexDistFromExit).toBe(1);

        // Tier 5 has 5 variants: Apex should always be Variant 5 and guards non-5
        if (tier === 5) {
          expect(apex.variant).toBe(5);
          for (const guard of dungeon.enemies.filter((e) => !e.isApex)) {
            expect(guard.variant).not.toBe(5);
          }
        }
      }
    }
  });

  it('enforces 100% Variant 1 on Floor 1 and 75/25 spiral variant review on Floors 2-4', () => {
    // Floor 1 of every sector spawns 100% Variant 1 (Concept Primer)
    for (let sector = 1; sector <= 12; sector++) {
      const floor = (sector - 1) * 5 + 1;
      for (let run = 0; run < 10; run++) {
        const dungeon = generateFloor(floor, sector, createSeededRng(sector * 41 + run + 3));
        expect(dungeon.enemies.length).toBeGreaterThan(0);
        for (const enemy of dungeon.enemies) {
          expect(enemy.variant).toBe(1);
        }
      }
    }

    // 200 seeded runs of Floors 2-4 across both 4-variant (Tier 6) and 3-variant (Tier 3) sectors
    const spiralCases = [
      { floor: 27, tier: 6, featured: 2 }, // 4-variant tier, Floor 2
      { floor: 28, tier: 6, featured: 3 }, // 4-variant tier, Floor 3
      { floor: 29, tier: 6, featured: 4 }, // 4-variant tier, Floor 4
      { floor: 12, tier: 3, featured: 2 }, // 3-variant tier, Floor 2
      { floor: 13, tier: 3, featured: 3 }, // 3-variant tier, Floor 3
      { floor: 14, tier: 3, featured: 3 }, // 3-variant tier, Floor 4 (caps at Variant 3)
    ];

    for (const { floor, tier, featured } of spiralCases) {
      let total = 0;
      let featuredCount = 0;
      let priorCount = 0;
      let futureCount = 0;

      for (let run = 0; run < 200; run++) {
        const dungeon = generateFloor(floor, tier, createSeededRng(floor * 1000 + run + 101));
        for (const enemy of dungeon.enemies) {
          total++;
          if (enemy.variant === featured) {
            featuredCount++;
          } else if (enemy.variant < featured) {
            priorCount++;
          } else {
            futureCount++;
          }
        }
      }

      const featuredShare = featuredCount / total;
      const priorShare = priorCount / total;
      expect(futureCount).toBe(0);
      expect(featuredShare).toBeGreaterThanOrEqual(0.65);
      expect(featuredShare).toBeLessThanOrEqual(0.85);
      expect(priorShare).toBeGreaterThanOrEqual(0.15);
      expect(priorShare).toBeLessThanOrEqual(0.35);
    }
  });

  it('clamps tier > 12 to Tier 12 instead of wrapping back to Tier 1', () => {
    const dungeon = generateFloor(61, 13, createSeededRng(6113));
    const tier12Data = ENEMY_TIERS[12];

    expect(dungeon.tier).toBe(12);
    expect(dungeon.enemies.length).toBeGreaterThan(0);
    expect(dungeon.enemies[0].type).toBe(tier12Data.name);
    expect(dungeon.enemies[0].maxHp).toBe(getPatrolBaseHpForTier(12));
  });

  it('sanitizes invalid and non-integer floors to finite integers >= 1 with defined enemy variants and positive HP', () => {
    const invalidFloors = [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 2.5];

    for (const rawFloor of invalidFloors) {
      const dungeon = generateFloor(rawFloor, 1, createSeededRng(42));

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
    const fractional = generateFloor(2.5, 1, createSeededRng(25));
    expect(fractional.floor).toBe(2);
    expect(fractional.enemies[0].id).toBe('e_2_0');
  });
});
