import {
  ConceptBoxDistribution,
  ConceptCard,
  ConceptResult,
  ConceptScheduleMap,
  ConceptualArchetype,
  LeitnerBox,
  PlayerStats,
} from '../types';

export const LEITNER_INTERVALS = [1, 3, 6, 12, 24] as const;
export const MAX_LEITNER_BOX: LeitnerBox = 4;
export const DUE_CONCEPT_WEIGHT = 0.65;

const CONCEPT_TIER_REGEX = /^(?:0|[1-9]|1[0-2])$/;

export interface ConceptOutcome {
  tier: number;
  archetype: ConceptualArchetype;
  correct: boolean;
}

export interface ConceptSlot {
  tier: number;
  archetype: ConceptualArchetype;
}

export interface WeightedConceptSelectionOptions {
  excludeArchetype?: ConceptualArchetype | null;
  excludeArchetypes?: ReadonlySet<ConceptualArchetype>;
  excludeKeys?: ReadonlySet<string>;
  dueWeight?: number;
  rng?: () => number;
}

function clampConceptTier(tier: number): number {
  if (!Number.isFinite(tier)) return 1;
  return Math.max(0, Math.min(12, Math.floor(tier)));
}

function toLeitnerBox(value: number): LeitnerBox {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.max(0, Math.min(MAX_LEITNER_BOX, Math.floor(value)));
  return clamped as LeitnerBox;
}

function pickUniform<T>(items: readonly T[], rng: () => number): T {
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(rng() * items.length)));
  return items[index];
}

export function makeConceptKey(tier: number, archetype: ConceptualArchetype): string {
  return `${clampConceptTier(tier)}:${archetype}`;
}

export function parseConceptKey(
  key: string,
  validArchetypes: ReadonlySet<ConceptualArchetype>
): ConceptSlot | null {
  if (typeof key !== 'string') return null;
  const parts = key.split(':');
  if (parts.length !== 2) return null;

  const [tierRaw, archetypeRaw] = parts;
  if (!CONCEPT_TIER_REGEX.test(tierRaw)) return null;
  if (!validArchetypes.has(archetypeRaw as ConceptualArchetype)) return null;

  return {
    tier: Number(tierRaw),
    archetype: archetypeRaw as ConceptualArchetype,
  };
}

export function isConceptDue(card: ConceptCard | undefined, currentStep: number): boolean {
  if (!card) return false;
  const safeStep = Number.isFinite(currentStep) ? Math.max(0, Math.floor(currentStep)) : 0;
  return card.nextDueStep <= safeStep;
}

export function recordConceptOutcome(
  schedule: ConceptScheduleMap,
  currentStep: number,
  outcome: ConceptOutcome
): { conceptSchedule: ConceptScheduleMap; conceptStepCounter: number } {
  const safeStep = Number.isFinite(currentStep) ? Math.max(0, Math.floor(currentStep)) : 0;
  const nextStep = safeStep + 1;
  const key = makeConceptKey(outcome.tier, outcome.archetype);
  const prev = schedule[key];

  let nextBox: LeitnerBox;
  let lastResult: ConceptResult;
  if (outcome.correct) {
    nextBox = prev ? toLeitnerBox(prev.box + 1) : 1;
    lastResult = 'PASS';
  } else {
    nextBox = 0;
    lastResult = 'MISS';
  }

  const nextCard: ConceptCard = {
    box: nextBox,
    nextDueStep: nextStep + LEITNER_INTERVALS[nextBox],
    lastResult,
  };

  return {
    conceptSchedule: {
      ...schedule,
      [key]: nextCard,
    },
    conceptStepCounter: nextStep,
  };
}

export function recordConceptOutcomesBatch(
  schedule: ConceptScheduleMap,
  currentStep: number,
  outcomes: readonly ConceptOutcome[]
): { conceptSchedule: ConceptScheduleMap; conceptStepCounter: number } {
  let nextSchedule = schedule;
  let nextStep = Number.isFinite(currentStep) ? Math.max(0, Math.floor(currentStep)) : 0;

  for (const outcome of outcomes) {
    const updated = recordConceptOutcome(nextSchedule, nextStep, outcome);
    nextSchedule = updated.conceptSchedule;
    nextStep = updated.conceptStepCounter;
  }

  return {
    conceptSchedule: nextSchedule,
    conceptStepCounter: nextStep,
  };
}

export function applyConceptOutcomeToStats(
  stats: PlayerStats,
  outcome: ConceptOutcome
): PlayerStats {
  const updated = recordConceptOutcome(
    stats.conceptSchedule ?? {},
    stats.conceptStepCounter ?? 0,
    outcome
  );

  return {
    ...stats,
    conceptSchedule: updated.conceptSchedule,
    conceptStepCounter: updated.conceptStepCounter,
  };
}

function pickWeightedDueSlot(
  dueSlots: readonly ConceptSlot[],
  schedule: ConceptScheduleMap,
  rng: () => number
): ConceptSlot {
  let totalWeight = 0;
  const weights: number[] = [];

  for (const slot of dueSlots) {
    const card = schedule[makeConceptKey(slot.tier, slot.archetype)];
    const box = card ? toLeitnerBox(card.box) : 0;
    const weight = Math.max(1, 5 - box);
    weights.push(weight);
    totalWeight += weight;
  }

  let threshold = rng() * totalWeight;
  for (let i = 0; i < dueSlots.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) {
      return dueSlots[i];
    }
  }

  return dueSlots[dueSlots.length - 1];
}

export function selectWeightedConceptSlot(
  candidates: readonly ConceptSlot[],
  schedule: ConceptScheduleMap,
  currentStep: number,
  options?: WeightedConceptSelectionOptions
): ConceptSlot | null {
  if (candidates.length === 0) return null;

  const rng = options?.rng ?? Math.random;
  const dueWeight =
    typeof options?.dueWeight === 'number' && Number.isFinite(options.dueWeight)
      ? Math.max(0, Math.min(1, options.dueWeight))
      : DUE_CONCEPT_WEIGHT;
  const excludeKeys = options?.excludeKeys;

  const isExcludedArchetype = (archetype: ConceptualArchetype): boolean => {
    if (options?.excludeArchetype && archetype === options.excludeArchetype) {
      return true;
    }
    if (options?.excludeArchetypes && options.excludeArchetypes.has(archetype)) {
      return true;
    }
    return false;
  };

  const isExcludedKey = (slot: ConceptSlot): boolean => {
    if (!excludeKeys || excludeKeys.size === 0) return false;
    return excludeKeys.has(makeConceptKey(slot.tier, slot.archetype));
  };

  // Graceful anti-repeat cascade:
  // 1) Respect both key and archetype exclusions
  // 2) Relax archetype exclusion while keeping key exclusion
  // 3) Relax key exclusion while keeping archetype exclusion
  // 4) Fall back to full candidate list
  let eligible = candidates.filter(
    (slot) => !isExcludedKey(slot) && !isExcludedArchetype(slot.archetype)
  );
  if (eligible.length === 0) {
    eligible = candidates.filter((slot) => !isExcludedKey(slot));
  }
  if (eligible.length === 0) {
    eligible = candidates.filter((slot) => !isExcludedArchetype(slot.archetype));
  }
  if (eligible.length === 0) {
    eligible = [...candidates];
  }

  const dueSlots: ConceptSlot[] = [];
  const unseenSlots: ConceptSlot[] = [];
  const deferredSlots: ConceptSlot[] = [];

  for (const slot of eligible) {
    const card = schedule[makeConceptKey(slot.tier, slot.archetype)];
    if (!card) {
      unseenSlots.push(slot);
    } else if (isConceptDue(card, currentStep)) {
      dueSlots.push(slot);
    } else {
      deferredSlots.push(slot);
    }
  }

  const freshPool = unseenSlots.length > 0 ? unseenSlots : deferredSlots;

  if (dueSlots.length > 0 && freshPool.length > 0) {
    if (rng() < dueWeight) {
      return pickWeightedDueSlot(dueSlots, schedule, rng);
    }
    return pickUniform(freshPool, rng);
  }

  if (dueSlots.length > 0) {
    return pickWeightedDueSlot(dueSlots, schedule, rng);
  }

  return pickUniform(freshPool, rng);
}

export function summarizeConceptBoxDistribution(
  schedules: readonly (ConceptScheduleMap | null | undefined)[]
): ConceptBoxDistribution {
  const byBox: Record<'0' | '1' | '2' | '3' | '4', number> = {
    '0': 0,
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
  };
  let totalTracked = 0;
  let passCount = 0;
  let missCount = 0;

  for (const schedule of schedules) {
    if (!schedule) continue;
    for (const card of Object.values(schedule)) {
      if (!card) continue;
      const boxKey = String(toLeitnerBox(card.box)) as '0' | '1' | '2' | '3' | '4';
      byBox[boxKey] += 1;
      totalTracked += 1;
      if (card.lastResult === 'PASS') {
        passCount += 1;
      } else if (card.lastResult === 'MISS') {
        missCount += 1;
      }
    }
  }

  return {
    totalTracked,
    byBox,
    passCount,
    missCount,
  };
}
