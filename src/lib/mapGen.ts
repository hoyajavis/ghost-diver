import { DungeonState, Position, Enemy, Chest, DataLog } from '../types';
import { LORE_ENTRIES } from './lore';
import { ENEMY_TIERS } from './enemyData';
import {
  BfsField,
  clampTier,
  computeBfsField,
  FLOORS_PER_SECTOR,
  getApexHpForTier,
  getApexShieldLayersForTier,
  getEnemyCountForFloor,
  getPatrolBaseHpForTier,
  getShortestPathKeys,
  posKey,
  SAFE_SPAWN_MIN_DISTANCE,
} from './dungeonLogic';

const GRID_SIZE = 10;
const WALL_COUNT = 15;
const MAX_WALL_GENERATION_ATTEMPTS = 25;
const PLAYER_START: Position = { x: 0, y: 0 };
const SPIRAL_REVIEW_PROBABILITY = 0.25;

function shufflePositions(positions: Position[], rng: () => number): Position[] {
  const copy = [...positions];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function pickRandom<T>(items: T[], rng: () => number): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(rng() * items.length)] ?? items[0];
}

function generateConnectedWalls(
  gridSize: number,
  wallCount: number,
  minReachableTiles: number,
  minMaxDistance: number,
  rng: () => number
): { walls: Position[]; bfs: BfsField } {
  const candidateWallCells: Position[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (x === PLAYER_START.x && y === PLAYER_START.y) continue;
      candidateWallCells.push({ x, y });
    }
  }

  for (let attempt = 0; attempt < MAX_WALL_GENERATION_ATTEMPTS; attempt++) {
    const shuffled = shufflePositions(candidateWallCells, rng);
    const walls = shuffled.slice(0, wallCount);
    const bfs = computeBfsField(gridSize, PLAYER_START, walls);

    if (bfs.reachable.length >= minReachableTiles && bfs.maxDistance >= minMaxDistance) {
      return { walls, bfs };
    }
  }

  // Deterministic fallback: open floor with zero walls guarantees connectivity and maxDistance = 2 * (gridSize - 1)
  return {
    walls: [],
    bfs: computeBfsField(gridSize, PLAYER_START, []),
  };
}

function selectFarZoneExit(
  gridSize: number,
  bfsFromStart: BfsField,
  rng: () => number
): Position {
  const nonStartReachable = bfsFromStart.reachable.filter(
    (pos) => !(pos.x === PLAYER_START.x && pos.y === PLAYER_START.y)
  );
  const quartileThreshold = Math.ceil(bfsFromStart.maxDistance * 0.75);
  const primaryThreshold = Math.max(gridSize, quartileThreshold);

  const primaryCandidates = nonStartReachable.filter(
    (pos) => (bfsFromStart.distances.get(posKey(pos)) ?? 0) >= primaryThreshold
  );
  if (primaryCandidates.length > 0) {
    return pickRandom(primaryCandidates, rng)!;
  }

  const quartileCandidates = nonStartReachable.filter(
    (pos) => (bfsFromStart.distances.get(posKey(pos)) ?? 0) >= quartileThreshold
  );
  if (quartileCandidates.length > 0) {
    return pickRandom(quartileCandidates, rng)!;
  }

  const maxDistCandidates = nonStartReachable.filter(
    (pos) => (bfsFromStart.distances.get(posKey(pos)) ?? 0) === bfsFromStart.maxDistance
  );
  return (
    pickRandom(maxDistCandidates, rng) ??
    { x: gridSize - 1, y: gridSize - 1 }
  );
}

function selectEnemyVariant(
  floorInTier: number,
  enemyIndex: number,
  variantIds: number[],
  rng: () => number
): 1 | 2 | 3 | 4 | 5 {
  if (variantIds.length === 0) return 1;

  // Floor 1: 100% Variant 1 (Concept Primer)
  if (floorInTier === 1) {
    return variantIds[0] as 1 | 2 | 3 | 4 | 5;
  }

  // Floor 5: Apex Boss gets Variant 5 (if present) or highest variant; guard Sentinels pull from other variants
  if (floorInTier === FLOORS_PER_SECTOR) {
    const apexVariant = variantIds.includes(5)
      ? 5
      : variantIds[variantIds.length - 1];
    if (enemyIndex === 0) {
      return apexVariant as 1 | 2 | 3 | 4 | 5;
    }
    const guardVariants = variantIds.filter((v) => v !== apexVariant);
    if (guardVariants.length === 0) {
      return apexVariant as 1 | 2 | 3 | 4 | 5;
    }
    const chosen = guardVariants[Math.floor(rng() * guardVariants.length)] ?? guardVariants[0];
    return chosen as 1 | 2 | 3 | 4 | 5;
  }

  // Floors 2-4: ~75% featured variant, ~25% spiral review from strictly prior variants
  const featured = variantIds[Math.min(floorInTier - 1, variantIds.length - 1)];
  const prior = variantIds.filter((v) => v < featured);
  if (prior.length > 0 && rng() < SPIRAL_REVIEW_PROBABILITY) {
    const chosen = prior[Math.floor(rng() * prior.length)] ?? prior[0];
    return chosen as 1 | 2 | 3 | 4 | 5;
  }

  return featured as 1 | 2 | 3 | 4 | 5;
}

function selectApexPosition(
  stairs: Position,
  bfsFromStart: BfsField,
  bfsFromExit: BfsField,
  occupied: Set<string>
): Position | null {
  const parentOfStairs = bfsFromStart.parents.get(posKey(stairs)) ?? null;
  if (parentOfStairs) {
    const parentKey = posKey(parentOfStairs);
    const parentDist = bfsFromStart.distances.get(parentKey) ?? 0;
    if (!occupied.has(parentKey) && parentDist >= SAFE_SPAWN_MIN_DISTANCE) {
      return parentOfStairs;
    }
  }

  // Fallback: closest reachable tile to stairs that satisfies Safe Spawn Buffer
  const fallbackCandidates = bfsFromStart.reachable
    .filter((pos) => {
      const key = posKey(pos);
      const dStart = bfsFromStart.distances.get(key) ?? 0;
      return !occupied.has(key) && dStart >= SAFE_SPAWN_MIN_DISTANCE;
    })
    .sort((a, b) => {
      const dExitA = bfsFromExit.distances.get(posKey(a)) ?? Number.POSITIVE_INFINITY;
      const dExitB = bfsFromExit.distances.get(posKey(b)) ?? Number.POSITIVE_INFINITY;
      return dExitA - dExitB;
    });

  return fallbackCandidates[0] ?? null;
}

function selectOffPathBlueCachePosition(
  bfsFromStart: BfsField,
  bfsFromExit: BfsField,
  shortestDist: number,
  canonicalPath: Set<string>,
  canonicalPositions: Position[],
  occupied: Set<string>,
  rng: () => number
): Position | null {
  const unoccupied = bfsFromStart.reachable.filter((pos) => !occupied.has(posKey(pos)));
  if (unoccupied.length === 0) return null;

  // Tier 1: True detour off any shortest path (dStart + dExit > shortestDist) and at least 2 tiles from start
  const tier1 = unoccupied.filter((pos) => {
    const key = posKey(pos);
    const dStart = bfsFromStart.distances.get(key) ?? 0;
    const dExit = bfsFromExit.distances.get(key) ?? Number.POSITIVE_INFINITY;
    return dStart >= 2 && dStart + dExit > shortestDist;
  });
  if (tier1.length > 0) {
    return pickRandom(tier1, rng);
  }

  // Tier 2: Off the canonical shortest path and at least 2 tiles from start (prefer tiles furthest from canonical path)
  const tier2 = unoccupied.filter((pos) => {
    const key = posKey(pos);
    const dStart = bfsFromStart.distances.get(key) ?? 0;
    return dStart >= 2 && !canonicalPath.has(key);
  });
  if (tier2.length > 0) {
    const scored = tier2.map((pos) => {
      let minDist = Number.POSITIVE_INFINITY;
      for (const pathPos of canonicalPositions) {
        const manhattan = Math.abs(pos.x - pathPos.x) + Math.abs(pos.y - pathPos.y);
        if (manhattan < minDist) {
          minDist = manhattan;
        }
      }
      return { pos, score: minDist };
    });
    scored.sort((a, b) => b.score - a.score);
    const topSliceCount = Math.max(1, Math.ceil(scored.length * 0.25));
    const topCandidates = scored.slice(0, topSliceCount).map((entry) => entry.pos);
    return pickRandom(topCandidates, rng);
  }

  // Tier 3: Graceful fallback to any remaining unoccupied reachable tile
  return pickRandom(unoccupied, rng);
}

export function generateFloor(
  floor: number,
  tier: number,
  rng: () => number = Math.random
): DungeonState {
  const safeFloor = Number.isFinite(floor) ? Math.max(1, Math.floor(floor)) : 1;
  const numEnemies = getEnemyCountForFloor(safeFloor);
  const floorInTier = ((safeFloor - 1) % FLOORS_PER_SECTOR) + 1;
  const isTierCulmination = floorInTier === FLOORS_PER_SECTOR;

  // Guarantee enough reachable tiles and sufficient BFS depth for Far-Zone Exit + entities + maneuvering room
  const minReachableTiles = Math.min(GRID_SIZE * GRID_SIZE - WALL_COUNT, numEnemies + 20);
  const { walls, bfs: bfsFromStart } = generateConnectedWalls(
    GRID_SIZE,
    WALL_COUNT,
    minReachableTiles,
    GRID_SIZE,
    rng
  );

  // Place Exit Node in the furthest BFS distance quartile
  const stairs = selectFarZoneExit(GRID_SIZE, bfsFromStart, rng);
  const bfsFromExit = computeBfsField(GRID_SIZE, stairs, walls);
  const shortestDist = bfsFromStart.distances.get(posKey(stairs)) ?? 0;
  const canonicalPath = getShortestPathKeys(PLAYER_START, stairs, bfsFromStart.parents);
  const canonicalPositions = bfsFromStart.reachable.filter((pos) => canonicalPath.has(posKey(pos)));

  const occupied = new Set<string>([posKey(PLAYER_START), posKey(stairs)]);

  const safeTier = clampTier(tier);
  const tierData = ENEMY_TIERS[safeTier] ?? ENEMY_TIERS[1];
  const baseHp = getPatrolBaseHpForTier(safeTier);
  const variantIds = Object.keys(tierData.variants)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b);

  // Build Safe Spawn Buffer pool for non-Apex enemies (BFS distance >= SAFE_SPAWN_MIN_DISTANCE)
  const safeEnemyPool = shufflePositions(
    bfsFromStart.reachable.filter((pos) => {
      const key = posKey(pos);
      const dStart = bfsFromStart.distances.get(key) ?? 0;
      return !occupied.has(key) && dStart >= SAFE_SPAWN_MIN_DISTANCE;
    }),
    rng
  );

  const takeSafeEnemyPos = (): Position | null => {
    while (safeEnemyPool.length > 0) {
      const candidate = safeEnemyPool.pop()!;
      const key = posKey(candidate);
      if (!occupied.has(key)) {
        occupied.add(key);
        return candidate;
      }
    }
    return null;
  };

  const enemies: Enemy[] = [];
  for (let i = 0; i < numEnemies; i++) {
    const isApex = isTierCulmination && i === 0;
    let pos: Position | null;

    if (isApex) {
      pos = selectApexPosition(stairs, bfsFromStart, bfsFromExit, occupied);
      if (pos) {
        occupied.add(posKey(pos));
      }
    } else {
      pos = takeSafeEnemyPos();
    }

    if (!pos) break;

    const variant = selectEnemyVariant(floorInTier, i, variantIds, rng);
    const hp = isApex ? getApexHpForTier(safeTier) : baseHp;

    if (isApex) {
      const shieldLayers = getApexShieldLayersForTier(safeTier);
      enemies.push({
        id: `e_${safeFloor}_${i}`,
        pos,
        hp,
        maxHp: hp,
        type: `${tierData.name}_APEX`,
        variant,
        isApex: true,
        shieldLayers,
        maxShieldLayers: shieldLayers,
      });
    } else {
      enemies.push({
        id: `e_${safeFloor}_${i}`,
        pos,
        hp,
        maxHp: hp,
        type: tierData.name,
        variant,
      });
    }
  }

  const chests: Chest[] = [];

  // Off-path locked BLUE caches: 1-2 on Floors 1-4 (Floor 1 guarantees >= 1), 1 on Floor 5
  const blueCacheCount = isTierCulmination ? 1 : rng() < 0.5 ? 2 : 1;
  for (let idx = 1; idx <= blueCacheCount; idx++) {
    const pos = selectOffPathBlueCachePosition(
      bfsFromStart,
      bfsFromExit,
      shortestDist,
      canonicalPath,
      canonicalPositions,
      occupied,
      rng
    );
    if (pos) {
      occupied.add(posKey(pos));
      chests.push({
        id: `c_${safeFloor}_blue_${idx}`,
        pos,
        type: 'BLUE',
        opened: false,
        locked: true,
      });
    }
  }

  // Remaining unoccupied reachable pool for optional RED cache and Data Log
  const remainingPool = shufflePositions(
    bfsFromStart.reachable.filter((pos) => !occupied.has(posKey(pos))),
    rng
  );
  const takeRemainingPos = (): Position | null => {
    const pos = remainingPool.pop() ?? null;
    if (pos) {
      occupied.add(posKey(pos));
    }
    return pos;
  };

  if (rng() > 0.3) {
    const pos = takeRemainingPos();
    if (pos) {
      chests.push({
        id: `c_${safeFloor}_red_1`,
        pos,
        type: 'RED',
        opened: false,
        locked: false,
      });
    }
  }

  const logs: DataLog[] = [];
  if (rng() > 0.8 && LORE_ENTRIES.length > 0) {
    const pos = takeRemainingPos();
    if (pos) {
      const randomLore = LORE_ENTRIES[Math.floor(rng() * LORE_ENTRIES.length)];
      logs.push({
        id: `l_${safeFloor}_1`,
        pos,
        loreId: randomLore.id,
        collected: false,
      });
    }
  }

  return {
    floor: safeFloor,
    tier: safeTier,
    gridSize: GRID_SIZE,
    walls,
    enemies,
    chests,
    logs,
    stairs,
    playerPos: { ...PLAYER_START },
  };
}
