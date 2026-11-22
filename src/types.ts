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

export type ReconBuffType = 'START_FP_20' | 'SHARD_BONUS_15' | 'FREE_SHIELD';

export interface ArchetypeAccuracyStat {
  attempts: number;
  correct: number;
}

export type ArchetypeAccuracyMap = Partial<Record<ConceptualArchetype, ArchetypeAccuracyStat>>;

export type ConceptResult = 'PASS' | 'MISS';
export type LeitnerBox = 0 | 1 | 2 | 3 | 4;

export interface ConceptCard {
  box: LeitnerBox;
  nextDueStep: number;
  lastResult: ConceptResult;
}

export type ConceptScheduleMap = Record<string, ConceptCard>;

export interface ConceptBoxDistribution {
  totalTracked: number;
  byBox: Record<'0' | '1' | '2' | '3' | '4', number>;
  passCount: number;
  missCount: number;
}

export type NeuralChipId =
  | 'OVERCLOCK_CHIP'
  | 'PATTERN_LENS'
  | 'SYNC_MATRIX'
  | 'STRUCTURAL_SIGHT'
  | 'NEURAL_DAMPENER';

export interface SectorMasteryEntry {
  proceduralCorrect: number;
  conceptualCorrect: number;
}

export type SectorMasteryMap = Record<number, SectorMasteryEntry>;

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
  activeReconBuff: ReconBuffType | null;
  reconRewardAvailable: boolean;
  archetypeStats: ArchetypeAccuracyMap;
  conceptSchedule: ConceptScheduleMap;
  conceptStepCounter: number;
  unlockedChips: NeuralChipId[];
  equippedChips: NeuralChipId[];
  sectorMastery: SectorMasteryMap;
  lifetimeShardsExtracted: number;
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
  conceptMasteryDistribution: ConceptBoxDistribution;
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
  | 'VISUAL_QUADRANT'
  | 'EFFECT_OF_CHANGE';

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
  templateId?: string;
  promptLines?: string[];
  inputType?: InputType;
  requireSimplified?: boolean;
  steps?: MathStep[];
  choices?: string[];
  multiSelectOptions?: string[];
}
