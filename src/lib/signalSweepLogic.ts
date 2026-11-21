import {
  ArchetypeAccuracyMap,
  ConceptualArchetype,
  MathProblem,
  PlayerStats,
  ReconBuffType,
} from '../types';
import { clampFloor, clampTier, getTierForFloor } from './dungeonLogic';
import {
  generateConceptualProblem,
  getConceptualArchetypesForTier,
} from './generators/conceptual';

export const SIGNAL_SWEEP_NODE_COUNT = 10;
export const SIGNAL_SWEEP_REWARD_THRESHOLD = 0.7;
export const RECON_START_FP_BONUS = 20;
export const RECON_SHARD_EXTRACTION_BONUS = 0.15;

export const RECON_BUFF_RUN_TOKENS = {
  SHARD_BONUS_15: 'RECON_SHARD_15',
  FREE_SHIELD: 'RECON_SHIELD',
} as const;

export const ARCHETYPE_LABELS: Record<ConceptualArchetype, string> = {
  MAGNITUDE_ESTIMATION: 'Estimation',
  BENCHMARK_COMPARE: 'Benchmarks',
  SPOT_THE_GLITCH: 'Spot the Glitch',
  FIRST_STEP_STRATEGY: 'First-Step Strategy',
  SIGN_PREDICTION: 'Sign Prediction',
  EQUIVALENCE_STRUCTURE: 'Equivalence',
  VISUAL_QUADRANT: 'Visual / Quadrant',
};

export interface ReconBuffOption {
  id: ReconBuffType;
  shortcut: '1' | '2' | '3';
  name: string;
  shortLabel: string;
  description: string;
}

export const RECON_BUFF_OPTIONS: readonly ReconBuffOption[] = [
  {
    id: 'START_FP_20',
    shortcut: '1',
    name: 'Start with +20 FP',
    shortLabel: '+20 Start FP',
    description: 'Begin your next dive with 20 Focus Points charged.',
  },
  {
    id: 'SHARD_BONUS_15',
    shortcut: '2',
    name: '+15% Shard Extraction',
    shortLabel: '+15% Shards',
    description: 'Gain +15% bonus Shards when extracting from your next dive.',
  },
  {
    id: 'FREE_SHIELD',
    shortcut: '3',
    name: '1 Free Shield Charge',
    shortLabel: '1 Free Shield',
    description: 'Absorb the first combat counter-hit on your next dive.',
  },
];

export function getReconBuffOption(id: ReconBuffType | null): ReconBuffOption | null {
  if (!id) return null;
  return RECON_BUFF_OPTIONS.find((option) => option.id === id) ?? null;
}

export interface SignalSweepNode {
  tier: number;
  archetype: ConceptualArchetype;
  problem: MathProblem;
}

export interface SignalSweepNodeOutcome {
  tier: number;
  archetype: ConceptualArchetype;
  correct: boolean;
  solveMs?: number;
}

export interface ArchetypeBreakdownEntry {
  archetype: ConceptualArchetype;
  label: string;
  correct: number;
  total: number;
}

export interface SignalSweepSummary {
  total: number;
  correct: number;
  accuracy: number;
  accuracyPercent: number;
  bestStreak: number;
  rewardEligible: boolean;
  archetypeBreakdown: ArchetypeBreakdownEntry[];
}

function shuffleWithRng<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function getReachedTiers(
  stats: Pick<PlayerStats, 'maxExtractedFloor' | 'encounteredTiers'>
): number[] {
  const floorTier = getTierForFloor(clampFloor(stats.maxExtractedFloor));
  let maxEncounteredTier = 1;

  if (Array.isArray(stats.encounteredTiers)) {
    for (const entry of stats.encounteredTiers) {
      if (typeof entry !== 'string') continue;
      const match = /^(\d{1,2})(?:-\d{1,2})?$/.exec(entry.trim());
      if (!match) continue;
      const parsedTier = Number(match[1]);
      if (Number.isFinite(parsedTier) && parsedTier >= 1) {
        maxEncounteredTier = Math.max(maxEncounteredTier, clampTier(parsedTier));
      }
    }
  }

  const maxTier = clampTier(Math.max(floorTier, maxEncounteredTier));
  return Array.from({ length: maxTier }, (_, index) => index + 1);
}

interface TierArchetypeSlot {
  tier: number;
  archetype: ConceptualArchetype;
}

export function generateSignalSweepDeck(
  reachedTiers: readonly number[],
  count: number = SIGNAL_SWEEP_NODE_COUNT,
  rng: () => number = Math.random
): SignalSweepNode[] {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : SIGNAL_SWEEP_NODE_COUNT;
  if (safeCount === 0) return [];

  const normalizedTiers = Array.from(
    new Set(
      reachedTiers
        .filter((tier) => typeof tier === 'number' && Number.isFinite(tier))
        .map((tier) => clampTier(tier))
    )
  ).sort((a, b) => a - b);

  const activeTiers = normalizedTiers.length > 0 ? normalizedTiers : [1];

  const pairsByArchetype = new Map<ConceptualArchetype, TierArchetypeSlot[]>();
  for (const tier of activeTiers) {
    for (const archetype of getConceptualArchetypesForTier(tier)) {
      const list = pairsByArchetype.get(archetype) ?? [];
      list.push({ tier, archetype });
      pairsByArchetype.set(archetype, list);
    }
  }

  const archetypes = shuffleWithRng(Array.from(pairsByArchetype.keys()), rng);
  if (archetypes.length === 0) return [];

  const queues = new Map<ConceptualArchetype, TierArchetypeSlot[]>();
  for (const archetype of archetypes) {
    queues.set(archetype, shuffleWithRng(pairsByArchetype.get(archetype) ?? [], rng));
  }

  // Round-robin across distinct archetypes, exhausting distinct (tier, archetype) pairs before repeating
  const selectedByArchetype = new Map<ConceptualArchetype, TierArchetypeSlot[]>();
  for (let i = 0; i < safeCount; i++) {
    const archetype = archetypes[i % archetypes.length];
    let queue = queues.get(archetype) ?? [];
    if (queue.length === 0) {
      queue = shuffleWithRng(pairsByArchetype.get(archetype) ?? [], rng);
      queues.set(archetype, queue);
    }
    const slot = queue.pop()!;
    const bucket = selectedByArchetype.get(archetype) ?? [];
    bucket.push(slot);
    selectedByArchetype.set(archetype, bucket);
  }

  // Order slots greedily by highest remaining count while avoiding consecutive identical archetypes
  const orderedSlots: TierArchetypeSlot[] = [];
  let prevArchetype: ConceptualArchetype | null = null;

  while (orderedSlots.length < safeCount) {
    const remaining: Array<[ConceptualArchetype, TierArchetypeSlot[]]> = Array.from(
      selectedByArchetype.entries()
    ).filter(([, bucket]) => bucket.length > 0);
    if (remaining.length === 0) break;

    const lastArchetype: ConceptualArchetype | null = prevArchetype;
    const nonConsecutive: Array<[ConceptualArchetype, TierArchetypeSlot[]]> =
      remaining.length > 1 && lastArchetype !== null
        ? remaining.filter(([archetype]) => archetype !== lastArchetype)
        : remaining;
    const candidates: Array<[ConceptualArchetype, TierArchetypeSlot[]]> =
      nonConsecutive.length > 0 ? nonConsecutive : remaining;

    let maxLen = 0;
    for (const [, bucket] of candidates) {
      if (bucket.length > maxLen) maxLen = bucket.length;
    }

    const topCandidates: Array<[ConceptualArchetype, TierArchetypeSlot[]]> = candidates.filter(
      ([, bucket]) => bucket.length === maxLen
    );
    const chosenIndex = Math.floor(rng() * topCandidates.length);
    const [chosenArchetype, chosenBucket] = topCandidates[chosenIndex];
    const nextSlot = chosenBucket.pop()!;
    orderedSlots.push(nextSlot);
    prevArchetype = chosenArchetype;
  }

  // Generate conceptual problems with retry to avoid duplicate questions in the same deck
  const seenQuestions = new Set<string>();
  const deck: SignalSweepNode[] = [];

  for (const slot of orderedSlots) {
    let problem = generateConceptualProblem(slot.tier, 'LOCK', {
      archetype: slot.archetype,
      rng,
    });

    for (let attempt = 1; attempt < 6 && seenQuestions.has(problem.question); attempt++) {
      problem = generateConceptualProblem(slot.tier, 'LOCK', {
        archetype: slot.archetype,
        rng,
      });
    }

    seenQuestions.add(problem.question);
    deck.push({
      tier: slot.tier,
      archetype: problem.archetype ?? slot.archetype,
      problem,
    });
  }

  return deck;
}

export function evaluateSignalSweepRun(
  outcomes: readonly SignalSweepNodeOutcome[]
): SignalSweepSummary {
  const total = outcomes.length;
  let correct = 0;
  let currentStreak = 0;
  let bestStreak = 0;

  const breakdownMap = new Map<ConceptualArchetype, ArchetypeBreakdownEntry>();

  for (const outcome of outcomes) {
    if (outcome.correct) {
      correct += 1;
      currentStreak += 1;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }

    const existing = breakdownMap.get(outcome.archetype);
    if (existing) {
      existing.total += 1;
      if (outcome.correct) existing.correct += 1;
    } else {
      breakdownMap.set(outcome.archetype, {
        archetype: outcome.archetype,
        label: ARCHETYPE_LABELS[outcome.archetype],
        correct: outcome.correct ? 1 : 0,
        total: 1,
      });
    }
  }

  const accuracy = total > 0 ? correct / total : 0;
  const accuracyPercent = Math.round(accuracy * 100);
  const rewardEligible = total > 0 && accuracy + 1e-9 >= SIGNAL_SWEEP_REWARD_THRESHOLD;

  return {
    total,
    correct,
    accuracy,
    accuracyPercent,
    bestStreak,
    rewardEligible,
    archetypeBreakdown: Array.from(breakdownMap.values()),
  };
}

export function mergeArchetypeStats(
  existing: ArchetypeAccuracyMap,
  outcomes: readonly SignalSweepNodeOutcome[]
): ArchetypeAccuracyMap {
  const next: ArchetypeAccuracyMap = {};

  for (const [key, stat] of Object.entries(existing)) {
    if (!stat) continue;
    next[key as ConceptualArchetype] = {
      attempts: stat.attempts,
      correct: stat.correct,
    };
  }

  for (const outcome of outcomes) {
    const prev = next[outcome.archetype];
    next[outcome.archetype] = {
      attempts: (prev?.attempts ?? 0) + 1,
      correct: (prev?.correct ?? 0) + (outcome.correct ? 1 : 0),
    };
  }

  return next;
}

export function calculateExtractedKnowledge(
  runKnowledge: number,
  runBuffs: readonly string[]
): number {
  const safe =
    typeof runKnowledge === 'number' && Number.isFinite(runKnowledge)
      ? Math.max(0, Math.floor(runKnowledge))
      : 0;
  if (runBuffs.includes(RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15)) {
    const bonusPercent = Math.round((1 + RECON_SHARD_EXTRACTION_BONUS) * 100);
    return Math.round((safe * bonusPercent) / 100);
  }
  return safe;
}

export function removeRunBuff(runBuffs: readonly string[], buff: string): string[] {
  const idx = runBuffs.indexOf(buff);
  if (idx === -1) return [...runBuffs];
  return [...runBuffs.slice(0, idx), ...runBuffs.slice(idx + 1)];
}
