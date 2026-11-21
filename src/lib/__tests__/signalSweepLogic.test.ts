import { describe, expect, it } from 'vitest';
import { ConceptualArchetype } from '../../types';
import { getConceptualArchetypesForTier } from '../generators/conceptual';
import {
  ARCHETYPE_LABELS,
  calculateExtractedKnowledge,
  evaluateSignalSweepRun,
  generateSignalSweepDeck,
  getReachedTiers,
  getReconBuffOption,
  mergeArchetypeStats,
  RECON_BUFF_OPTIONS,
  RECON_BUFF_RUN_TOKENS,
  removeRunBuff,
  SIGNAL_SWEEP_NODE_COUNT,
  SIGNAL_SWEEP_REWARD_THRESHOLD,
  SignalSweepNodeOutcome,
} from '../signalSweepLogic';

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('signalSweepLogic', () => {
  describe('constants & metadata helpers', () => {
    it('defines all 7 conceptual archetype labels and 3 ordered Recon Buff options', () => {
      const allArchetypes: ConceptualArchetype[] = [
        'MAGNITUDE_ESTIMATION',
        'BENCHMARK_COMPARE',
        'SPOT_THE_GLITCH',
        'FIRST_STEP_STRATEGY',
        'SIGN_PREDICTION',
        'EQUIVALENCE_STRUCTURE',
        'VISUAL_QUADRANT',
      ];

      for (const archetype of allArchetypes) {
        expect(ARCHETYPE_LABELS[archetype]).toBeTruthy();
      }

      expect(SIGNAL_SWEEP_NODE_COUNT).toBe(10);
      expect(SIGNAL_SWEEP_REWARD_THRESHOLD).toBe(0.7);
      expect(RECON_BUFF_OPTIONS.map((o) => o.id)).toEqual([
        'START_FP_20',
        'SHARD_BONUS_15',
        'FREE_SHIELD',
      ]);
      expect(RECON_BUFF_OPTIONS.map((o) => o.shortcut)).toEqual(['1', '2', '3']);
      expect(getReconBuffOption('START_FP_20')?.name).toBe('Start with +20 FP');
      expect(getReconBuffOption('SHARD_BONUS_15')?.name).toBe('+15% Shard Extraction');
      expect(getReconBuffOption('FREE_SHIELD')?.name).toBe('1 Free Shield Charge');
      expect(getReconBuffOption(null)).toBeNull();
    });

    it('exposes tier-matched conceptual archetypes with clamping', () => {
      expect(getConceptualArchetypesForTier(1)).toEqual([
        'MAGNITUDE_ESTIMATION',
        'BENCHMARK_COMPARE',
        'SPOT_THE_GLITCH',
      ]);
      expect(getConceptualArchetypesForTier(8)).toEqual([
        'SIGN_PREDICTION',
        'VISUAL_QUADRANT',
        'BENCHMARK_COMPARE',
      ]);
      expect(getConceptualArchetypesForTier(0)).toEqual(getConceptualArchetypesForTier(1));
      expect(getConceptualArchetypesForTier(99)).toEqual(getConceptualArchetypesForTier(12));
    });
  });

  describe('getReachedTiers', () => {
    it('returns [1] for a fresh save', () => {
      expect(getReachedTiers({ maxExtractedFloor: 1, encounteredTiers: [] })).toEqual([1]);
    });

    it('derives reached tiers from maxExtractedFloor', () => {
      expect(getReachedTiers({ maxExtractedFloor: 21, encounteredTiers: [] })).toEqual([
        1, 2, 3, 4, 5,
      ]);
    });

    it('extends reached tiers when encounteredTiers exceeds maxExtractedFloor', () => {
      expect(
        getReachedTiers({
          maxExtractedFloor: 5,
          encounteredTiers: ['1-1', '3-2', '7-4'],
        })
      ).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('clamps extreme floors and ignores malformed encounteredTiers entries', () => {
      expect(
        getReachedTiers({
          maxExtractedFloor: 999,
          encounteredTiers: ['99-1', 'bad-entry', ''],
        })
      ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

      expect(
        getReachedTiers({
          maxExtractedFloor: -5,
          encounteredTiers: ['not-a-tier', '0-1'],
        })
      ).toEqual([1]);
    });
  });

  describe('generateSignalSweepDeck', () => {
    it('falls back to Tier 1 when reachedTiers is empty', () => {
      const deck = generateSignalSweepDeck([], 10, createSeededRng(42));
      expect(deck).toHaveLength(10);
      expect(deck.every((node) => node.tier === 1)).toBe(true);
    });

    it('generates 10 balanced Tier 1 nodes with no consecutive duplicate archetypes', () => {
      const deck = generateSignalSweepDeck([1], 10, createSeededRng(101));
      expect(deck).toHaveLength(10);

      const counts = new Map<ConceptualArchetype, number>();
      for (let i = 0; i < deck.length; i++) {
        const node = deck[i];
        expect(node.tier).toBe(1);
        expect(node.problem.category).toBe('CONCEPTUAL');
        expect(node.problem.complexity).toBe('QUICK');
        expect(node.problem.type).toBe('LOCK');
        expect(node.problem.archetype).toBe(node.archetype);
        expect(node.problem.question.length).toBeGreaterThan(0);

        counts.set(node.archetype, (counts.get(node.archetype) ?? 0) + 1);
        if (i > 0) {
          expect(node.archetype).not.toBe(deck[i - 1].archetype);
        }
      }

      // 10 slots across 3 archetypes => 4, 3, 3
      const sortedCounts = Array.from(counts.values()).sort((a, b) => a - b);
      expect(sortedCounts).toEqual([3, 3, 4]);
    });

    it('balances all 5 archetypes across Tiers 1-5 (2 each) without consecutive repeats', () => {
      const deck = generateSignalSweepDeck([1, 2, 3, 4, 5], 10, createSeededRng(202));
      expect(deck).toHaveLength(10);

      const counts = new Map<ConceptualArchetype, number>();
      for (let i = 0; i < deck.length; i++) {
        const node = deck[i];
        expect(node.tier).toBeGreaterThanOrEqual(1);
        expect(node.tier).toBeLessThanOrEqual(5);
        expect(node.problem.category).toBe('CONCEPTUAL');
        counts.set(node.archetype, (counts.get(node.archetype) ?? 0) + 1);
        if (i > 0) {
          expect(node.archetype).not.toBe(deck[i - 1].archetype);
        }
      }

      expect(counts.size).toBe(5);
      expect(Array.from(counts.values()).every((c) => c === 2)).toBe(true);
    });

    it('covers all 7 archetypes across Tiers 1-12 without consecutive repeats', () => {
      const tiers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      const deck = generateSignalSweepDeck(tiers, 10, createSeededRng(303));
      expect(deck).toHaveLength(10);

      const archetypes = new Set<ConceptualArchetype>();
      const tierArchetypePairs = new Set<string>();
      for (let i = 0; i < deck.length; i++) {
        const node = deck[i];
        archetypes.add(node.archetype);
        tierArchetypePairs.add(`${node.tier}:${node.archetype}`);
        if (i > 0) {
          expect(node.archetype).not.toBe(deck[i - 1].archetype);
        }
      }

      expect(archetypes.size).toBe(7);
      // All 10 nodes draw from distinct (tier, archetype) pairs when 36 pairs are available
      expect(tierArchetypePairs.size).toBe(10);
    });

    it('is deterministic when given the same seeded RNG', () => {
      const deckA = generateSignalSweepDeck([1, 2, 3, 4], 10, createSeededRng(777));
      const deckB = generateSignalSweepDeck([1, 2, 3, 4], 10, createSeededRng(777));

      expect(deckA.map((n) => `${n.tier}:${n.archetype}:${n.problem.question}`)).toEqual(
        deckB.map((n) => `${n.tier}:${n.archetype}:${n.problem.question}`)
      );
    });
  });

  describe('evaluateSignalSweepRun', () => {
    const makeOutcomes = (results: boolean[]): SignalSweepNodeOutcome[] =>
      results.map((correct, i) => ({
        tier: (i % 3) + 1,
        archetype: i % 2 === 0 ? 'MAGNITUDE_ESTIMATION' : 'SPOT_THE_GLITCH',
        correct,
      }));

    it('handles 0/10 and empty runs as ineligible', () => {
      const empty = evaluateSignalSweepRun([]);
      expect(empty.total).toBe(0);
      expect(empty.correct).toBe(0);
      expect(empty.accuracy).toBe(0);
      expect(empty.accuracyPercent).toBe(0);
      expect(empty.bestStreak).toBe(0);
      expect(empty.rewardEligible).toBe(false);
      expect(empty.archetypeBreakdown).toEqual([]);

      const zero = evaluateSignalSweepRun(makeOutcomes(Array(10).fill(false)));
      expect(zero.correct).toBe(0);
      expect(zero.accuracyPercent).toBe(0);
      expect(zero.bestStreak).toBe(0);
      expect(zero.rewardEligible).toBe(false);
    });

    it('marks 6/10 ineligible and 7/10 eligible with accurate bestStreak and archetype breakdown', () => {
      const sixOfTen = evaluateSignalSweepRun(
        makeOutcomes([true, true, false, true, true, true, false, true, false, false])
      );
      expect(sixOfTen.correct).toBe(6);
      expect(sixOfTen.accuracyPercent).toBe(60);
      expect(sixOfTen.bestStreak).toBe(3);
      expect(sixOfTen.rewardEligible).toBe(false);

      const sevenOfTen = evaluateSignalSweepRun(
        makeOutcomes([true, false, true, true, true, true, false, true, true, false])
      );
      expect(sevenOfTen.correct).toBe(7);
      expect(sevenOfTen.accuracyPercent).toBe(70);
      expect(sevenOfTen.bestStreak).toBe(4);
      expect(sevenOfTen.rewardEligible).toBe(true);
      expect(sevenOfTen.archetypeBreakdown).toEqual([
        {
          archetype: 'MAGNITUDE_ESTIMATION',
          label: 'Estimation',
          correct: 4,
          total: 5,
        },
        {
          archetype: 'SPOT_THE_GLITCH',
          label: 'Spot the Glitch',
          correct: 3,
          total: 5,
        },
      ]);
    });

    it('computes 10/10 perfect streak and 100% accuracy', () => {
      const perfect = evaluateSignalSweepRun(makeOutcomes(Array(10).fill(true)));
      expect(perfect.correct).toBe(10);
      expect(perfect.accuracy).toBe(1);
      expect(perfect.accuracyPercent).toBe(100);
      expect(perfect.bestStreak).toBe(10);
      expect(perfect.rewardEligible).toBe(true);
    });
  });

  describe('mergeArchetypeStats', () => {
    it('immutably accumulates attempts and correct counts per archetype', () => {
      const existing = {
        MAGNITUDE_ESTIMATION: { attempts: 3, correct: 2 },
      };
      const outcomes: SignalSweepNodeOutcome[] = [
        { tier: 1, archetype: 'MAGNITUDE_ESTIMATION', correct: true },
        { tier: 1, archetype: 'MAGNITUDE_ESTIMATION', correct: false },
        { tier: 2, archetype: 'SPOT_THE_GLITCH', correct: true },
      ];

      const merged = mergeArchetypeStats(existing, outcomes);
      expect(merged).toEqual({
        MAGNITUDE_ESTIMATION: { attempts: 5, correct: 3 },
        SPOT_THE_GLITCH: { attempts: 1, correct: 1 },
      });
      // Original object and nested stat must not be mutated
      expect(existing).toEqual({
        MAGNITUDE_ESTIMATION: { attempts: 3, correct: 2 },
      });
    });
  });

  describe('calculateExtractedKnowledge & removeRunBuff', () => {
    it('calculates extracted shards with and without +15% Recon Buff and rounds cleanly', () => {
      expect(calculateExtractedKnowledge(0, [RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15])).toBe(0);
      expect(calculateExtractedKnowledge(-50, [RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15])).toBe(0);
      expect(calculateExtractedKnowledge(100, [])).toBe(100);
      expect(calculateExtractedKnowledge(100, ['ATK_UP'])).toBe(100);
      expect(calculateExtractedKnowledge(100, [RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15])).toBe(115);
      // Odd rounding checks: 15 * 1.15 = 17.25 -> 17; 17 * 1.15 = 19.55 -> 20
      expect(calculateExtractedKnowledge(15, [RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15])).toBe(17);
      expect(calculateExtractedKnowledge(17, [RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15])).toBe(20);
    });

    it('rounds exact .5 shard totals half-up and guards non-finite inputs', () => {
      // Exact .5 values: 50 * 1.15 = 57.5 -> 58; 90 * 1.15 = 103.5 -> 104; 110 * 1.15 = 126.5 -> 127
      expect(calculateExtractedKnowledge(50, [RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15])).toBe(58);
      expect(calculateExtractedKnowledge(90, [RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15])).toBe(104);
      expect(calculateExtractedKnowledge(110, [RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15])).toBe(127);

      // Non-finite inputs safely clamp to 0
      expect(calculateExtractedKnowledge(Number.NaN, [RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15])).toBe(0);
      expect(
        calculateExtractedKnowledge(Number.POSITIVE_INFINITY, [RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15])
      ).toBe(0);
      expect(
        calculateExtractedKnowledge(Number.NEGATIVE_INFINITY, [RECON_BUFF_RUN_TOKENS.SHARD_BONUS_15])
      ).toBe(0);
      expect(calculateExtractedKnowledge(Number.NaN, [])).toBe(0);
      expect(calculateExtractedKnowledge(Number.POSITIVE_INFINITY, [])).toBe(0);
    });

    it('removes a single occurrence of a run buff without mutating the original array', () => {
      const original = ['ATK_UP', RECON_BUFF_RUN_TOKENS.FREE_SHIELD, 'ATK_UP'];
      const afterRemove = removeRunBuff(original, RECON_BUFF_RUN_TOKENS.FREE_SHIELD);
      expect(afterRemove).toEqual(['ATK_UP', 'ATK_UP']);
      expect(original).toEqual(['ATK_UP', RECON_BUFF_RUN_TOKENS.FREE_SHIELD, 'ATK_UP']);

      const afterMissing = removeRunBuff(original, 'NON_EXISTENT');
      expect(afterMissing).toEqual(original);
      expect(afterMissing).not.toBe(original);

      const afterSingleAtk = removeRunBuff(original, 'ATK_UP');
      expect(afterSingleAtk).toEqual([RECON_BUFF_RUN_TOKENS.FREE_SHIELD, 'ATK_UP']);
    });
  });
});
