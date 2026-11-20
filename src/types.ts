export type GameState =
  | 'TITLE'
  | 'HOME'
  | 'DUNGEON'
  | 'COMBAT'
  | 'GAMEOVER'
  | 'SANCTUARY'
  | 'CHEST_LOOT'
  | 'LOCK_MODAL';

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
  isApex?: boolean;
  shieldLayers?: number;
  maxShieldLayers?: number;
}

export interface Chest {
  id: string;
  pos: Position;
  type: 'RED' | 'BLUE';
  opened: boolean;
  locked?: boolean;
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

export interface ProblemMetricSummary {
  attempts: number;
  firstTryCorrect: number;
  firstTryAccuracy: number;
  medianSolveMs: number;
  solveMsSamples: number[];
}

export interface AnonymizedPlayerTelemetry {
  totalDives: number;
  totalExtractions: number;
  totalDefeats: number;
  totalCombatsWon: number;
  totalKnowledgeExtracted: number;
  byTierVariant: Record<string, ProblemMetricSummary>;
  byArchetype: Record<string, ProblemMetricSummary>;
}

export interface AnonymizedCacheProfile {
  anonymousId: string;
  storageMode: 'localStorage' | 'memory';
  telemetry: AnonymizedPlayerTelemetry;
}

export interface AnonymizedCacheExport {
  schemaVersion: number;
  exportedDay: string;
  anonymousId: string;
  telemetry: AnonymizedPlayerTelemetry;
  slots: Array<{
    slotId: number;
    data: Record<string, unknown> | null;
  }>;
}

export type StrikeMode = 'COMBO' | 'DIRECT';

export interface SolvedBreadcrumb {
  stepIndex: number;
  label: string;
  answer: string;
}

export interface MathStep {
  prompt: string;
  answer: number | string;
  choices?: string[];
  inputType?: InputType;
  requireSimplified?: boolean;
  clue?: string;
  resultLabel?: string;
}

export type ProblemComplexity = 'QUICK' | 'COMBO';

export type ConceptualArchetype =
  | 'MAGNITUDE_ESTIMATION'
  | 'BENCHMARK_COMPARE'
  | 'SPOT_THE_GLITCH'
  | 'FIRST_STEP_STRATEGY'
  | 'SIGN_PREDICTION'
  | 'EQUIVALENCE_STRUCTURE'
  | 'VISUAL_QUADRANT';

export type ProblemCategory = 'PROCEDURAL' | 'CONCEPTUAL';

export type ProblemType = 'ATTACK' | 'MEDITATION' | 'LOCK' | 'SHIELD_BREAK';

export type CombatMode = 'ATTACK' | 'MEDITATION' | 'FOCUS_SCAN' | 'SHIELD_BREAK';

export interface MathProblem {
  question: string;
  answer: number | string;
  type: ProblemType;
  complexity: ProblemComplexity;
  category?: ProblemCategory;
  archetype?: ConceptualArchetype;
  promptLines?: string[];
  inputType?: InputType;
  requireSimplified?: boolean;
  steps?: MathStep[];
  choices?: string[];
  multiSelectOptions?: string[];
}
