import { describe, expect, it } from 'vitest';
import { ConceptScheduleMap, ConceptualArchetype } from '../../types';
import {
  applyConceptOutcomeToStats,
  ConceptSlot,
  DUE_CONCEPT_WEIGHT,
  isConceptDue,
  LEITNER_INTERVALS,
  makeConceptKey,
  MAX_LEITNER_BOX,
  parseConceptKey,
  recordConceptOutcome,
  recordConceptOutcomesBatch,
  selectWeightedConceptSlot,
  summarizeConceptBoxDistribution,
} from '../conceptSpacedRep';
import { INITIAL_STATS, VALID_CONCEPTUAL_ARCHETYPES } from '../storage';

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('conceptSpacedRep', () => {
  describe('key formatting and strict parsing', () => {
    it('formats clamped tier:archetype keys and parses valid keys strictly', () => {
      expect(makeConceptKey(1, 'MAGNITUDE_ESTIMATION')).toBe('1:MAGNITUDE_ESTIMATION');
      expect(makeConceptKey(0, 'EFFECT_OF_CHANGE')).toBe('0:EFFECT_OF_CHANGE');
      expect(makeConceptKey(12, 'BENCHMARK_COMPARE')).toBe('12:BENCHMARK_COMPARE');
      expect(makeConceptKey(-5, 'SPOT_THE_GLITCH')).toBe('0:SPOT_THE_GLITCH');
      expect(makeConceptKey(99, 'VISUAL_QUADRANT')).toBe('12:VISUAL_QUADRANT');

      expect(parseConceptKey('0:EFFECT_OF_CHANGE', VALID_CONCEPTUAL_ARCHETYPES)).toEqual({
        tier: 0,
        archetype: 'EFFECT_OF_CHANGE',
      });
      expect(parseConceptKey('12:SIGN_PREDICTION', VALID_CONCEPTUAL_ARCHETYPES)).toEqual({
        tier: 12,
        archetype: 'SIGN_PREDICTION',
      });

      // Reject malformed / PII / out-of-range keys
      expect(parseConceptKey('13:EFFECT_OF_CHANGE', VALID_CONCEPTUAL_ARCHETYPES)).toBeNull();
      expect(parseConceptKey('-1:EFFECT_OF_CHANGE', VALID_CONCEPTUAL_ARCHETYPES)).toBeNull();
      expect(parseConceptKey('01:EFFECT_OF_CHANGE', VALID_CONCEPTUAL_ARCHETYPES)).toBeNull();
      expect(parseConceptKey('1:UNKNOWN_ARCHETYPE', VALID_CONCEPTUAL_ARCHETYPES)).toBeNull();
      expect(parseConceptKey('1:EFFECT_OF_CHANGE:extra', VALID_CONCEPTUAL_ARCHETYPES)).toBeNull();
      expect(parseConceptKey('jane@example.com', VALID_CONCEPTUAL_ARCHETYPES)).toBeNull();
      expect(parseConceptKey('', VALID_CONCEPTUAL_ARCHETYPES)).toBeNull();
    });
  });

  describe('Leitner box promotion, miss reset, and intervals', () => {
    it('promotes unseen -> 1 -> 2 -> 3 -> 4 (capped at 4) using [1, 3, 6, 12, 24] intervals', () => {
      expect(LEITNER_INTERVALS).toEqual([1, 3, 6, 12, 24]);
      expect(MAX_LEITNER_BOX).toBe(4);
      expect(DUE_CONCEPT_WEIGHT).toBe(0.65);

      let schedule: ConceptScheduleMap = {};
      let step = 0;

      // Unseen -> box 1, nextDueStep = 1 + 3 = 4
      const r1 = recordConceptOutcome(schedule, step, {
        tier: 2,
        archetype: 'EFFECT_OF_CHANGE',
        correct: true,
      });
      expect(r1.conceptStepCounter).toBe(1);
      expect(r1.conceptSchedule['2:EFFECT_OF_CHANGE']).toEqual({
        box: 1,
        nextDueStep: 4,
        lastResult: 'PASS',
      });

      // Box 1 -> box 2, nextDueStep = 2 + 6 = 8
      const r2 = recordConceptOutcome(r1.conceptSchedule, r1.conceptStepCounter, {
        tier: 2,
        archetype: 'EFFECT_OF_CHANGE',
        correct: true,
      });
      expect(r2.conceptStepCounter).toBe(2);
      expect(r2.conceptSchedule['2:EFFECT_OF_CHANGE']).toEqual({
        box: 2,
        nextDueStep: 8,
        lastResult: 'PASS',
      });

      // Box 2 -> box 3, nextDueStep = 3 + 12 = 15
      const r3 = recordConceptOutcome(r2.conceptSchedule, r2.conceptStepCounter, {
        tier: 2,
        archetype: 'EFFECT_OF_CHANGE',
        correct: true,
      });
      expect(r3.conceptSchedule['2:EFFECT_OF_CHANGE']).toEqual({
        box: 3,
        nextDueStep: 15,
        lastResult: 'PASS',
      });

      // Box 3 -> box 4, nextDueStep = 4 + 24 = 28
      const r4 = recordConceptOutcome(r3.conceptSchedule, r3.conceptStepCounter, {
        tier: 2,
        archetype: 'EFFECT_OF_CHANGE',
        correct: true,
      });
      expect(r4.conceptSchedule['2:EFFECT_OF_CHANGE']).toEqual({
        box: 4,
        nextDueStep: 28,
        lastResult: 'PASS',
      });

      // Box 4 stays capped at 4, nextDueStep = 5 + 24 = 29
      const r5 = recordConceptOutcome(r4.conceptSchedule, r4.conceptStepCounter, {
        tier: 2,
        archetype: 'EFFECT_OF_CHANGE',
        correct: true,
      });
      expect(r5.conceptSchedule['2:EFFECT_OF_CHANGE']).toEqual({
        box: 4,
        nextDueStep: 29,
        lastResult: 'PASS',
      });

      // Miss resets to box 0, nextDueStep = nextStep + 1 = 7
      const rMiss = recordConceptOutcome(r5.conceptSchedule, r5.conceptStepCounter, {
        tier: 2,
        archetype: 'EFFECT_OF_CHANGE',
        correct: false,
      });
      expect(rMiss.conceptStepCounter).toBe(6);
      expect(rMiss.conceptSchedule['2:EFFECT_OF_CHANGE']).toEqual({
        box: 0,
        nextDueStep: 7,
        lastResult: 'MISS',
      });

      // Not due on step 6, becomes due on step 7
      expect(isConceptDue(rMiss.conceptSchedule['2:EFFECT_OF_CHANGE'], 6)).toBe(false);
      expect(isConceptDue(rMiss.conceptSchedule['2:EFFECT_OF_CHANGE'], 7)).toBe(true);

      // Recovery from box 0 -> box 1, nextDueStep = 7 + 3 = 10
      schedule = rMiss.conceptSchedule;
      step = rMiss.conceptStepCounter;
      const rRecover = recordConceptOutcome(schedule, step, {
        tier: 2,
        archetype: 'EFFECT_OF_CHANGE',
        correct: true,
      });
      expect(rRecover.conceptSchedule['2:EFFECT_OF_CHANGE']).toEqual({
        box: 1,
        nextDueStep: 10,
        lastResult: 'PASS',
      });
    });

    it('folds outcome batches sequentially and applies cleanly to PlayerStats', () => {
      const batch = recordConceptOutcomesBatch({}, 0, [
        { tier: 1, archetype: 'MAGNITUDE_ESTIMATION', correct: false },
        { tier: 1, archetype: 'BENCHMARK_COMPARE', correct: true },
        { tier: 1, archetype: 'MAGNITUDE_ESTIMATION', correct: true },
      ]);
      expect(batch.conceptStepCounter).toBe(3);
      expect(batch.conceptSchedule['1:MAGNITUDE_ESTIMATION']).toEqual({
        box: 1,
        nextDueStep: 6,
        lastResult: 'PASS',
      });
      expect(batch.conceptSchedule['1:BENCHMARK_COMPARE']).toEqual({
        box: 1,
        nextDueStep: 5,
        lastResult: 'PASS',
      });

      const nextStats = applyConceptOutcomeToStats(INITIAL_STATS, {
        tier: 3,
        archetype: 'SPOT_THE_GLITCH',
        correct: false,
      });
      expect(nextStats.conceptStepCounter).toBe(1);
      expect(nextStats.conceptSchedule['3:SPOT_THE_GLITCH']).toEqual({
        box: 0,
        nextDueStep: 2,
        lastResult: 'MISS',
      });
      expect(INITIAL_STATS.conceptStepCounter).toBe(0);
    });
  });

  describe('weighted selection (~65% due / ~35% fresh) and anti-repeat', () => {
    it('selects due concepts roughly 65% of the time and fresh concepts roughly 35% of the time', () => {
      const candidates: ConceptSlot[] = [
        { tier: 1, archetype: 'MAGNITUDE_ESTIMATION' },
        { tier: 1, archetype: 'BENCHMARK_COMPARE' },
        { tier: 1, archetype: 'SPOT_THE_GLITCH' },
        { tier: 1, archetype: 'EFFECT_OF_CHANGE' },
      ];
      const schedule: ConceptScheduleMap = {
        '1:MAGNITUDE_ESTIMATION': { box: 0, nextDueStep: 5, lastResult: 'MISS' },
        '1:BENCHMARK_COMPARE': { box: 3, nextDueStep: 5, lastResult: 'PASS' },
        // SPOT_THE_GLITCH and EFFECT_OF_CHANGE are unseen (fresh)
      };

      const rng = createSeededRng(2026);
      const trials = 2000;
      let duePicks = 0;
      let box0Picks = 0;
      let box3Picks = 0;

      for (let i = 0; i < trials; i++) {
        const picked = selectWeightedConceptSlot(candidates, schedule, 10, { rng });
        expect(picked).not.toBeNull();
        if (picked!.archetype === 'MAGNITUDE_ESTIMATION') {
          duePicks += 1;
          box0Picks += 1;
        } else if (picked!.archetype === 'BENCHMARK_COMPARE') {
          duePicks += 1;
          box3Picks += 1;
        }
      }

      const dueRatio = duePicks / trials;
      expect(dueRatio).toBeGreaterThan(0.6);
      expect(dueRatio).toBeLessThan(0.7);
      // Box 0 (weight 5) should be selected significantly more often than Box 3 (weight 2)
      expect(box0Picks).toBeGreaterThan(box3Picks * 1.8);
    });

    it('honors excludeArchetype, excludeArchetypes, and excludeKeys with graceful fallback', () => {
      const candidates: ConceptSlot[] = [
        { tier: 1, archetype: 'MAGNITUDE_ESTIMATION' },
        { tier: 1, archetype: 'BENCHMARK_COMPARE' },
        { tier: 1, archetype: 'SPOT_THE_GLITCH' },
      ];
      const schedule: ConceptScheduleMap = {
        '1:MAGNITUDE_ESTIMATION': { box: 0, nextDueStep: 1, lastResult: 'MISS' },
      };

      // Exclude the due archetype -> must pick from the remaining two
      const rng = createSeededRng(77);
      for (let i = 0; i < 30; i++) {
        const picked = selectWeightedConceptSlot(candidates, schedule, 10, {
          excludeArchetype: 'MAGNITUDE_ESTIMATION',
          rng,
        });
        expect(picked?.archetype).not.toBe('MAGNITUDE_ESTIMATION');
      }

      // Exclude two archetypes via Set -> must pick the remaining one
      const onlyLeft = selectWeightedConceptSlot(candidates, schedule, 10, {
        excludeArchetypes: new Set<ConceptualArchetype>([
          'MAGNITUDE_ESTIMATION',
          'BENCHMARK_COMPARE',
        ]),
        rng,
      });
      expect(onlyLeft?.archetype).toBe('SPOT_THE_GLITCH');

      // Exclude all keys -> graceful fallback still returns a valid candidate
      const allKeys = new Set(candidates.map((c) => makeConceptKey(c.tier, c.archetype)));
      const fallback = selectWeightedConceptSlot(candidates, schedule, 10, {
        excludeKeys: allKeys,
        excludeArchetypes: new Set<ConceptualArchetype>([
          'MAGNITUDE_ESTIMATION',
          'BENCHMARK_COMPARE',
          'SPOT_THE_GLITCH',
        ]),
        rng,
      });
      expect(fallback).not.toBeNull();

      // Empty candidate list returns null
      expect(selectWeightedConceptSlot([], schedule, 10, { rng })).toBeNull();
    });
  });

  describe('summarizeConceptBoxDistribution', () => {
    it('aggregates tracked counts, per-box counts, and pass/miss totals across slots', () => {
      expect(summarizeConceptBoxDistribution([null, undefined, {}])).toEqual({
        totalTracked: 0,
        byBox: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0 },
        passCount: 0,
        missCount: 0,
      });

      const slot1: ConceptScheduleMap = {
        '1:EFFECT_OF_CHANGE': { box: 0, nextDueStep: 2, lastResult: 'MISS' },
        '1:MAGNITUDE_ESTIMATION': { box: 2, nextDueStep: 10, lastResult: 'PASS' },
      };
      const slot2: ConceptScheduleMap = {
        '4:BENCHMARK_COMPARE': { box: 4, nextDueStep: 30, lastResult: 'PASS' },
        '4:SPOT_THE_GLITCH': { box: 1, nextDueStep: 7, lastResult: 'PASS' },
        '2:EFFECT_OF_CHANGE': { box: 0, nextDueStep: 4, lastResult: 'MISS' },
      };

      expect(summarizeConceptBoxDistribution([slot1, null, slot2])).toEqual({
        totalTracked: 5,
        byBox: { '0': 2, '1': 1, '2': 1, '3': 0, '4': 1 },
        passCount: 3,
        missCount: 2,
      });
    });
  });
});
