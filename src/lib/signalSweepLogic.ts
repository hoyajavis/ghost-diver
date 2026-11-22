import {
  ArchetypeAccuracyMap,
  ConceptScheduleMap,
  ConceptualArchetype,
  MathProblem,
  PlayerStats,
  ReconBuffType,
} from '../types';
import {
  ConceptSlot,
  isConceptDue,
  makeConceptKey,
  selectWeightedConceptSlot,
} from './conceptSpacedRep';
import { clampFloor, clampTier, getTierForFloor } from './dungeonLogic';
import { calculateSyncMatrixFpBonus } from './loadoutChips';
import {
  getFoundationalConceptualGenerators,
  getTaggedConceptualGeneratorsForTier,
  TaggedConceptualGenerator,
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
  EFFECT_OF_CHANGE: 'Scaling & Change',
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

export interface SignalSweepDeckOptions {
  conceptSchedule?: ConceptScheduleMap;
  conceptStepCounter?: number;
  excludeQuestions?: ReadonlySet<string>;
  excludeTemplateIds?: ReadonlySet<string>;
}

interface DeckTemplateCandidate {
  tier: number;
  archetype: ConceptualArchetype;
  templateId: string;
  generate: TaggedConceptualGenerator['generate'];
  isFoundational: boolean;
}

function pickUniform<T>(items: readonly T[], rng: () => number): T {
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(rng() * items.length)));
  return items[index];
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

const DECK_QUESTION_RETRIES = 10;

function generateUniqueProblemForCandidate(
  candidate: DeckTemplateCandidate,
  deckSeenQuestions: ReadonlySet<string>,
  crossRunExcludeQuestions: ReadonlySet<string> | undefined,
  rng: () => number
): MathProblem {
  let notInDeckFallback: MathProblem | null = null;
  let anyFallback: MathProblem | null = null;

  for (let attempt = 0; attempt < DECK_QUESTION_RETRIES; attempt++) {
    const raw = candidate.generate(rng);
    const problem: MathProblem = {
      ...raw,
      type: 'LOCK',
      category: 'CONCEPTUAL',
      templateId: candidate.templateId,
    };

    const inDeck = deckSeenQuestions.has(problem.question);
    const inCrossRun = Boolean(crossRunExcludeQuestions?.has(problem.question));

    if (!inDeck && !inCrossRun) {
      return problem;
    }
    if (!inDeck && notInDeckFallback === null) {
      notInDeckFallback = problem;
    }
    if (anyFallback === null) {
      anyFallback = problem;
    }
  }

  return notInDeckFallback ?? anyFallback!;
}

export function generateSignalSweepDeck(
  reachedTiers: readonly number[],
  count: number = SIGNAL_SWEEP_NODE_COUNT,
  rng: () => number = Math.random,
  options?: SignalSweepDeckOptions
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
  const allCandidates: DeckTemplateCandidate[] = [];

  for (const tier of activeTiers) {
    for (const entry of getTaggedConceptualGeneratorsForTier(tier)) {
      allCandidates.push({
        tier,
        archetype: entry.archetype,
        templateId: entry.id,
        generate: entry.generate,
        isFoundational: false,
      });
    }
  }

  // Include cross-tier foundational conceptual pool for early-sector decks (Tiers 1-2)
  // Slotted with activeTiers[0] so UI displays T1/T2 cleanly and schedule keys stay in 1..12
  if (activeTiers.length <= 2) {
    const displayTier = activeTiers[0];
    for (const entry of getFoundationalConceptualGenerators()) {
      allCandidates.push({
        tier: displayTier,
        archetype: entry.archetype,
        templateId: entry.id,
        generate: entry.generate,
        isFoundational: true,
      });
    }
  }

  if (allCandidates.length === 0) return [];

  const schedule = options?.conceptSchedule;
  const stepCounter = options?.conceptStepCounter ?? 0;
  const crossRunExcludeQuestions = options?.excludeQuestions;
  const crossRunExcludeTemplates = options?.excludeTemplateIds;

  const deck: SignalSweepNode[] = [];
  const deckSeenQuestions = new Set<string>();
  const usedTemplateIds = new Set<string>();
  const usedTierArchetypes = new Set<string>();
  const archetypeCounts = new Map<ConceptualArchetype, number>();
  let prevArchetype: ConceptualArchetype | null = null;
  let lastTemplateId: string | null = null;

  for (let i = 0; i < safeCount; i++) {
    // Anti-repeat candidate cascade:
    // 1) Unused template in this deck + not prevArchetype + not in cross-run excluded templates
    // 2) Unused template in this deck + not prevArchetype (relax cross-run exclusion)
    // 3) Not lastTemplateId + not prevArchetype (relax deck-wide template uniqueness)
    // 4) Not lastTemplateId (relax prevArchetype)
    // 5) Full candidate pool fallback
    let stepCandidates = allCandidates.filter(
      (c) =>
        !usedTemplateIds.has(c.templateId) &&
        c.archetype !== prevArchetype &&
        !(crossRunExcludeTemplates && crossRunExcludeTemplates.has(c.templateId))
    );
    if (stepCandidates.length === 0) {
      stepCandidates = allCandidates.filter(
        (c) => !usedTemplateIds.has(c.templateId) && c.archetype !== prevArchetype
      );
    }
    if (stepCandidates.length === 0) {
      stepCandidates = allCandidates.filter(
        (c) => c.templateId !== lastTemplateId && c.archetype !== prevArchetype
      );
    }
    if (stepCandidates.length === 0) {
      stepCandidates = allCandidates.filter((c) => c.templateId !== lastTemplateId);
    }
    if (stepCandidates.length === 0) {
      stepCandidates = allCandidates;
    }

    const hasDueInStep =
      Boolean(schedule) &&
      stepCandidates.some((c) => isConceptDue(schedule?.[makeConceptKey(c.tier, c.archetype)], stepCounter));

    let chosenCandidate: DeckTemplateCandidate;

    if (schedule && hasDueInStep) {
      const slotMap = new Map<string, ConceptSlot>();
      for (const c of stepCandidates) {
        const key = makeConceptKey(c.tier, c.archetype);
        if (!slotMap.has(key)) {
          slotMap.set(key, { tier: c.tier, archetype: c.archetype });
        }
      }

      const selectedSlot = selectWeightedConceptSlot(
        Array.from(slotMap.values()),
        schedule,
        stepCounter,
        { excludeArchetype: prevArchetype, rng }
      );

      if (selectedSlot) {
        const matching = stepCandidates.filter(
          (c) => c.tier === selectedSlot.tier && c.archetype === selectedSlot.archetype
        );
        chosenCandidate = pickUniform(matching.length > 0 ? matching : stepCandidates, rng);
      } else {
        chosenCandidate = pickUniform(stepCandidates, rng);
      }
    } else {
      // Balanced archetype variety: prefer least-used archetypes in this deck, then unused (tier, archetype) pairs
      let minArchCount = Number.POSITIVE_INFINITY;
      for (const c of stepCandidates) {
        const countForArch = archetypeCounts.get(c.archetype) ?? 0;
        if (countForArch < minArchCount) {
          minArchCount = countForArch;
        }
      }

      const leastUsedArchetypes = stepCandidates.filter(
        (c) => (archetypeCounts.get(c.archetype) ?? 0) === minArchCount
      );
      const unusedPairs = leastUsedArchetypes.filter(
        (c) => !usedTierArchetypes.has(makeConceptKey(c.tier, c.archetype))
      );
      const balancedPool = unusedPairs.length > 0 ? unusedPairs : leastUsedArchetypes;
      chosenCandidate = pickUniform(balancedPool, rng);
    }

    let problem = generateUniqueProblemForCandidate(
      chosenCandidate,
      deckSeenQuestions,
      crossRunExcludeQuestions,
      rng
    );

    // If a small-parameter template still collided with an existing deck prompt, try other stepCandidates
    if (deckSeenQuestions.has(problem.question)) {
      for (const alt of stepCandidates) {
        if (alt.templateId === chosenCandidate.templateId) continue;
        const altProblem = generateUniqueProblemForCandidate(
          alt,
          deckSeenQuestions,
          crossRunExcludeQuestions,
          rng
        );
        if (!deckSeenQuestions.has(altProblem.question)) {
          chosenCandidate = alt;
          problem = altProblem;
          break;
        }
      }
    }

    deckSeenQuestions.add(problem.question);
    usedTemplateIds.add(chosenCandidate.templateId);
    usedTierArchetypes.add(makeConceptKey(chosenCandidate.tier, chosenCandidate.archetype));
    archetypeCounts.set(
      chosenCandidate.archetype,
      (archetypeCounts.get(chosenCandidate.archetype) ?? 0) + 1
    );
    prevArchetype = chosenCandidate.archetype;
    lastTemplateId = chosenCandidate.templateId;

    deck.push({
      tier: chosenCandidate.tier,
      archetype: problem.archetype ?? chosenCandidate.archetype,
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

export interface ExtractionBreakdown {
  baseKnowledge: number;
  reconBonus: number;
  syncFpBonus: number;
  total: number;
}

export function calculateExtractionBreakdown(
  runKnowledge: number,
  runBuffs: readonly string[],
  fp: number = 0,
  equippedChips?: readonly string[]
): ExtractionBreakdown {
  const baseKnowledge =
    typeof runKnowledge === 'number' && Number.isFinite(runKnowledge)
      ? Math.max(0, Math.floor(runKnowledge))
      : 0;
  const withRecon = runBuffs.includes(RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15)
    ? Math.round((baseKnowledge * Math.round((1 + RECON_SHARD_EXTRACTION_BONUS) * 100)) / 100)
    : baseKnowledge;
  const reconBonus = withRecon - baseKnowledge;
  const syncFpBonus = calculateSyncMatrixFpBonus(fp, equippedChips);

  return {
    baseKnowledge,
    reconBonus,
    syncFpBonus,
    total: withRecon + syncFpBonus,
  };
}

export function calculateExtractedKnowledge(
  runKnowledge: number,
  runBuffs: readonly string[],
  fp: number = 0,
  equippedChips?: readonly string[]
): number {
  return calculateExtractionBreakdown(runKnowledge, runBuffs, fp, equippedChips).total;
}

export function removeRunBuff(runBuffs: readonly string[], buff: string): string[] {
  const idx = runBuffs.indexOf(buff);
  if (idx === -1) return [...runBuffs];
  return [...runBuffs.slice(0, idx), ...runBuffs.slice(idx + 1)];
}
