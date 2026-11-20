import { Chest, DataLog, Enemy, Position } from '../types';

export const DIVE_COST_PER_FLOOR = 50;
export const MAX_ENEMIES_PER_FLOOR = 8;
export const MAX_TIER = 12;
export const FLOORS_PER_SECTOR = 5;
export const MAX_FLOOR = MAX_TIER * FLOORS_PER_SECTOR;

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
  const safeFloor = Math.max(1, Math.floor(floor));
  return Math.min(MAX_ENEMIES_PER_FLOOR, 2 + Math.floor(safeFloor / 5));
}

export function getReachablePositions(
  gridSize: number,
  start: Position,
  walls: Position[]
): Position[] {
  const wallSet = new Set(walls.map(posKey));
  const visited = new Set<string>();
  const reachable: Position[] = [];

  if (
    start.x < 0 ||
    start.x >= gridSize ||
    start.y < 0 ||
    start.y >= gridSize ||
    wallSet.has(posKey(start))
  ) {
    return reachable;
  }

  const queue: Position[] = [start];
  visited.add(posKey(start));

  const directions: readonly Position[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    reachable.push(current);

    for (const dir of directions) {
      const next: Position = { x: current.x + dir.x, y: current.y + dir.y };
      if (next.x < 0 || next.x >= gridSize || next.y < 0 || next.y >= gridSize) {
        continue;
      }
      const key = posKey(next);
      if (visited.has(key) || wallSet.has(key)) {
        continue;
      }
      visited.add(key);
      queue.push(next);
    }
  }

  return reachable;
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
