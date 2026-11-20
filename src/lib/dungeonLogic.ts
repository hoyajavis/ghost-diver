import { Chest, DataLog, DungeonState, Enemy, Position } from '../types';
import { ENEMY_TIERS } from './enemyData';

export const DIVE_COST_PER_FLOOR = 50;
export const MAX_ENEMIES_PER_FLOOR = 5;
export const APEX_HP_MULTIPLIER = 1.5;
export const MAX_TIER = 12;
export const FLOORS_PER_SECTOR = 5;
export const MAX_FLOOR = MAX_TIER * FLOORS_PER_SECTOR;
export const SAFE_SPAWN_MIN_DISTANCE = 3;

export interface BfsField {
  reachable: Position[];
  distances: Map<string, number>;
  parents: Map<string, Position | null>;
  maxDistance: number;
}

export function clampFloor(floor: number): number {
  if (!Number.isFinite(floor)) return 1;
  return Math.min(MAX_FLOOR, Math.max(1, Math.floor(floor)));
}

export function clampTier(tier: number): number {
  if (!Number.isFinite(tier)) return 1;
  return Math.min(MAX_TIER, Math.max(1, Math.floor(tier)));
}

export function getTierForFloor(floor: number): number {
  return clampTier(Math.ceil(clampFloor(floor) / FLOORS_PER_SECTOR));
}

export function getNextUnlockedFloor(extractedFloor: number, currentMax: number): number {
  const safeCurrentMax = clampFloor(currentMax);
  const safeExtracted = Number.isFinite(extractedFloor) ? Math.floor(extractedFloor) : 1;
  return clampFloor(Math.max(safeCurrentMax, safeExtracted + 1));
}

export function canDescendFromFloor(floor: number): boolean {
  return Number.isFinite(floor) && Math.floor(floor) < MAX_FLOOR;
}

export function posKey(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

export function getDiveCost(startFloor: number): number {
  return Math.max(0, startFloor - 1) * DIVE_COST_PER_FLOOR;
}

export function getBankableHintPacks(runHintPacks: number, preloadedHints: number): number {
  return Math.max(0, runHintPacks - preloadedHints);
}

export function getEnemyCountForFloor(floor: number): number {
  const safeFloor = clampFloor(floor);
  const tier = getTierForFloor(safeFloor);
  const floorInTier = ((safeFloor - 1) % FLOORS_PER_SECTOR) + 1;

  // Floor 5 of each sector is the Apex Gatekeeper encounter: 1 Apex Boss + 1-2 guard Sentinels
  if (floorInTier === FLOORS_PER_SECTOR) {
    return tier <= 2 ? 2 : 3;
  }

  if (tier === 1) return floorInTier <= 2 ? 2 : 3;
  if (tier === 2) return 3;
  if (tier === 3) return floorInTier <= 2 ? 3 : 4;
  if (tier === 4) return 4;
  return MAX_ENEMIES_PER_FLOOR;
}

export function getPatrolBaseHpForTier(tier: number): number {
  const safeTier = clampTier(tier);
  return (ENEMY_TIERS[safeTier] ?? ENEMY_TIERS[1]).baseHp;
}

export function getApexHpForTier(tier: number): number {
  return Math.round(getPatrolBaseHpForTier(tier) * APEX_HP_MULTIPLIER);
}

export function getApexShieldLayersForTier(tier: number): number {
  return clampTier(tier) <= 2 ? 1 : 2;
}

export function isFloorExitLocked(
  dungeon: Pick<DungeonState, 'floor' | 'enemies'>
): boolean {
  return (
    dungeon.floor > 0 &&
    dungeon.floor % FLOORS_PER_SECTOR === 0 &&
    dungeon.enemies.some((e) => Boolean(e.isApex) || e.type.endsWith('_APEX'))
  );
}

export function computeBfsField(
  gridSize: number,
  start: Position,
  walls: Position[]
): BfsField {
  const wallSet = new Set(walls.map(posKey));
  const distances = new Map<string, number>();
  const parents = new Map<string, Position | null>();
  const reachable: Position[] = [];
  let maxDistance = 0;

  if (
    gridSize <= 0 ||
    start.x < 0 ||
    start.x >= gridSize ||
    start.y < 0 ||
    start.y >= gridSize ||
    wallSet.has(posKey(start))
  ) {
    return { reachable, distances, parents, maxDistance };
  }

  const startKey = posKey(start);
  const queue: Position[] = [start];
  distances.set(startKey, 0);
  parents.set(startKey, null);

  const directions: readonly Position[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const currentKey = posKey(current);
    const currentDist = distances.get(currentKey)!;
    reachable.push(current);
    if (currentDist > maxDistance) {
      maxDistance = currentDist;
    }

    for (const dir of directions) {
      const next: Position = { x: current.x + dir.x, y: current.y + dir.y };
      if (next.x < 0 || next.x >= gridSize || next.y < 0 || next.y >= gridSize) {
        continue;
      }
      const key = posKey(next);
      if (distances.has(key) || wallSet.has(key)) {
        continue;
      }
      distances.set(key, currentDist + 1);
      parents.set(key, current);
      queue.push(next);
    }
  }

  return { reachable, distances, parents, maxDistance };
}

export function getReachablePositions(
  gridSize: number,
  start: Position,
  walls: Position[]
): Position[] {
  return computeBfsField(gridSize, start, walls).reachable;
}

export function getShortestPathKeys(
  start: Position,
  target: Position,
  parents: Map<string, Position | null>
): Set<string> {
  const path = new Set<string>();
  const startKey = posKey(start);
  const targetKey = posKey(target);

  if (!parents.has(targetKey)) {
    return path;
  }

  let cursor: Position | null = target;
  let steps = 0;
  const maxSteps = parents.size + 1;

  while (cursor !== null && steps <= maxSteps) {
    const key = posKey(cursor);
    path.add(key);
    if (key === startKey) {
      return path;
    }
    cursor = parents.get(key) ?? null;
    steps++;
  }

  return new Set<string>();
}

export interface StepEnemiesParams {
  enemies: Enemy[];
  playerPos: Position;
  gridSize: number;
  walls: Position[];
  chests: Chest[];
  logs: DataLog[];
  stairs: Position;
  rng?: () => number;
}

export function stepEnemies({
  enemies,
  playerPos,
  gridSize,
  walls,
  chests,
  logs,
  stairs,
  rng = Math.random,
}: StepEnemiesParams): Enemy[] {
  const staticBlocked = new Set<string>([
    posKey(playerPos),
    posKey(stairs),
    ...walls.map(posKey),
    ...chests.filter((c) => !c.opened).map((c) => posKey(c.pos)),
    ...logs.filter((l) => !l.collected).map((l) => posKey(l.pos)),
  ]);

  // Track current occupied enemy positions and update sequentially to prevent stacking
  const occupiedByEnemies = new Set<string>(enemies.map((e) => posKey(e.pos)));

  return enemies.map((enemy) => {
    // Apex Bosses remain anchored at the Exit approach rather than chasing the player
    if (enemy.isApex || enemy.type.endsWith('_APEX')) {
      return enemy;
    }

    const currentKey = posKey(enemy.pos);
    const edx = Math.sign(playerPos.x - enemy.pos.x);
    const edy = Math.sign(playerPos.y - enemy.pos.y);

    const horizontalMove: Position = { x: enemy.pos.x + edx, y: enemy.pos.y };
    const verticalMove: Position = { x: enemy.pos.x, y: enemy.pos.y + edy };

    const candidates =
      rng() > 0.5
        ? [horizontalMove, verticalMove]
        : [verticalMove, horizontalMove];

    for (const candidate of candidates) {
      if (candidate.x === enemy.pos.x && candidate.y === enemy.pos.y) {
        continue;
      }
      if (
        candidate.x < 0 ||
        candidate.x >= gridSize ||
        candidate.y < 0 ||
        candidate.y >= gridSize
      ) {
        continue;
      }
      const candidateKey = posKey(candidate);
      if (staticBlocked.has(candidateKey) || occupiedByEnemies.has(candidateKey)) {
        continue;
      }

      occupiedByEnemies.delete(currentKey);
      occupiedByEnemies.add(candidateKey);
      return { ...enemy, pos: candidate };
    }

    return enemy;
  });
}
