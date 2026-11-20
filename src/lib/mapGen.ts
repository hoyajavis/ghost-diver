import { DungeonState, Position, Enemy, Chest, DataLog } from '../types';
import { LORE_ENTRIES } from './lore';
import { ENEMY_TIERS } from './enemyData';
import { getEnemyCountForFloor, getReachablePositions, posKey } from './dungeonLogic';

const GRID_SIZE = 10;
const WALL_COUNT = 15;
const MAX_WALL_GENERATION_ATTEMPTS = 25;
const PLAYER_START: Position = { x: 0, y: 0 };

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

function generateConnectedWalls(
  gridSize: number,
  wallCount: number,
  minReachableTiles: number,
  rng: () => number
): { walls: Position[]; reachable: Position[] } {
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
    const reachable = getReachablePositions(gridSize, PLAYER_START, walls);

    if (reachable.length >= minReachableTiles) {
      return { walls, reachable };
    }
  }

  // Deterministic fallback: open floor with zero walls guarantees connectivity
  return {
    walls: [],
    reachable: getReachablePositions(gridSize, PLAYER_START, []),
  };
}

function selectEnemyVariant(
  floorInTier: number,
  enemyIndex: number,
  variantIds: number[]
): 1 | 2 | 3 | 4 | 5 {
  if (variantIds.length === 0) return 1;

  // Floor 5 (tier culmination) or floors beyond variant count: mixed review across the tier
  if (floorInTier === 5 || floorInTier > variantIds.length) {
    if (floorInTier === 5 && variantIds.includes(5) && enemyIndex === 0) {
      return 5;
    }
    const chosen = variantIds[enemyIndex % variantIds.length];
    return chosen as 1 | 2 | 3 | 4 | 5;
  }

  return variantIds[floorInTier - 1] as 1 | 2 | 3 | 4 | 5;
}

export function generateFloor(
  floor: number,
  tier: number,
  rng: () => number = Math.random
): DungeonState {
  const numEnemies = getEnemyCountForFloor(floor);
  const floorInTier = ((Math.max(1, floor) - 1) % 5) + 1;
  const isTierCulmination = floorInTier === 5;

  // Guarantee enough reachable tiles for player + stairs + enemies + chest + log + maneuvering room
  const minReachableTiles = Math.min(GRID_SIZE * GRID_SIZE - WALL_COUNT, numEnemies + 20);
  const { walls, reachable } = generateConnectedWalls(GRID_SIZE, WALL_COUNT, minReachableTiles, rng);

  // Exclude player start from entity spawn pool
  const spawnPool = shufflePositions(
    reachable.filter((pos) => !(pos.x === PLAYER_START.x && pos.y === PLAYER_START.y)),
    rng
  );

  // Pick stairs from the farthest reachable cells to encourage exploration
  const farthestCandidates = [...spawnPool].sort(
    (a, b) => b.x + b.y - (a.x + a.y)
  );
  const stairsIndexPool = farthestCandidates.slice(0, Math.max(1, Math.min(8, farthestCandidates.length)));
  const stairs = stairsIndexPool[Math.floor(rng() * stairsIndexPool.length)] ?? { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };

  const stairsKey = posKey(stairs);
  const remainingPool = spawnPool.filter((pos) => posKey(pos) !== stairsKey);

  const takeSpawnPos = (): Position | null => remainingPool.pop() ?? null;

  const tierData = ENEMY_TIERS[tier] ?? ENEMY_TIERS[1];
  const baseHp = tierData.baseHp;
  const variantIds = Object.keys(tierData.variants)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b);

  const enemies: Enemy[] = [];
  for (let i = 0; i < numEnemies; i++) {
    const pos = takeSpawnPos();
    if (!pos) break;

    const variant = selectEnemyVariant(floorInTier, i, variantIds);
    const isApex = isTierCulmination && i === 0;
    const hp = isApex ? Math.round(baseHp * 1.25) : baseHp;

    enemies.push({
      id: `e_${floor}_${i}`,
      pos,
      hp,
      maxHp: hp,
      type: isApex ? `${tierData.name}_APEX` : tierData.name,
      variant,
    });
  }

  const chests: Chest[] = [];
  if (rng() > 0.3) {
    const pos = takeSpawnPos();
    if (pos) {
      chests.push({
        id: `c_${floor}_1`,
        pos,
        type: 'RED',
        opened: false,
      });
    }
  }

  const logs: DataLog[] = [];
  if (rng() > 0.8 && LORE_ENTRIES.length > 0) {
    const pos = takeSpawnPos();
    if (pos) {
      const randomLore = LORE_ENTRIES[Math.floor(rng() * LORE_ENTRIES.length)];
      logs.push({
        id: `l_${floor}_1`,
        pos,
        loreId: randomLore.id,
        collected: false,
      });
    }
  }

  return {
    floor,
    tier,
    gridSize: GRID_SIZE,
    walls,
    enemies,
    chests,
    logs,
    stairs,
    playerPos: { ...PLAYER_START },
  };
}
