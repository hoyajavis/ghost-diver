export type GameState = 'TITLE' | 'HOME' | 'DUNGEON' | 'COMBAT' | 'GAMEOVER' | 'SANCTUARY' | 'CHEST_LOOT';

export interface UpgradeLevels {
  hp: number;
  fp: number;
  hints: number;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  fp: number;
  maxFp: number;
  knowledge: number;
  hintPacks: number;
  runKnowledge: number;
  runHintPacks: number;
  runBuffs: string[];
  neuralScars: string[];
  maxExtractedFloor: number;
  upgrades: UpgradeLevels;
  unlockedLore: string[];
  encounteredTiers: string[];
  unlockedDemos: string[];
}

export interface Position {
  x: number;
  y: number;
}

export interface Enemy {
  id: string;
  pos: Position;
  hp: number;
  maxHp: number;
  type: string;
  variant: 1 | 2 | 3 | 4 | 5;
}

export interface Chest {
  id: string;
  pos: Position;
  type: 'RED';
  opened: boolean;
}

export interface DataLog {
  id: string;
  pos: Position;
  loreId: string;
  collected: boolean;
}

export interface DungeonState {
  floor: number;
  tier: number;
  gridSize: number;
  walls: Position[];
  enemies: Enemy[];
  chests: Chest[];
  logs: DataLog[];
  stairs: Position;
  playerPos: Position;
}

export type InputType =
  | 'NUMPAD'
  | 'FRACTION'
  | 'RELATIONSHIP'
  | 'RATIO'
  | 'COORDINATE'
  | 'INEQUALITY';

export interface SaveSlot {
  id: number;
  stats: PlayerStats | null;
}

export interface MathStep {
  prompt: string;
  answer: number | string;
  choices?: string[];
  inputType?: InputType;
  requireSimplified?: boolean;
}

export interface MathProblem {
  question: string;
  answer: number | string;
  type: 'ATTACK' | 'MEDITATION';
  inputType?: InputType;
  requireSimplified?: boolean;
  steps?: MathStep[];
  choices?: string[];
  multiSelectOptions?: string[];
}
