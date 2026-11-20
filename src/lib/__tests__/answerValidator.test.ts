import { describe, expect, it } from 'vitest';
import { gcd, validateAnswer } from '../answerValidator';

describe('answerValidator', () => {
  describe('gcd', () => {
    it('computes greatest common divisor across positive, negative, and zero inputs', () => {
      expect(gcd(12, 18)).toBe(6);
      expect(gcd(-8, 12)).toBe(4);
      expect(gcd(7, 13)).toBe(1);
      expect(gcd(0, 5)).toBe(5);
    });
  });

  describe('fractions', () => {
    it('accepts mathematically equivalent fractions by default', () => {
      expect(validateAnswer('2/4', '1/2', { inputType: 'FRACTION' })).toBe(true);
      expect(validateAnswer('6/9', '2/3', { inputType: 'FRACTION' })).toBe(true);
      expect(validateAnswer('4/4', '1', { inputType: 'FRACTION' })).toBe(true);
      expect(validateAnswer('1', '4/4', { inputType: 'FRACTION' })).toBe(true);
      expect(validateAnswer('0/5', '0', { inputType: 'FRACTION' })).toBe(true);
      expect(validateAnswer('-1/2', '1/-2', { inputType: 'FRACTION' })).toBe(true);
      expect(validateAnswer(' 3 / 6 ', '1/2', { inputType: 'FRACTION' })).toBe(true);
    });

    it('enforces reduced lowest terms when requireSimplified is true', () => {
      expect(validateAnswer('2/4', '1/2', { inputType: 'FRACTION', requireSimplified: true })).toBe(false);
      expect(validateAnswer('1/2', '1/2', { inputType: 'FRACTION', requireSimplified: true })).toBe(true);
      expect(validateAnswer('-1/2', '-1/2', { inputType: 'FRACTION', requireSimplified: true })).toBe(true);
      expect(validateAnswer('1/-2', '-1/2', { inputType: 'FRACTION', requireSimplified: true })).toBe(false);
      expect(validateAnswer('0.5', '1/2', { inputType: 'FRACTION', requireSimplified: true })).toBe(false);
    });

    it('rejects division by zero and malformed fractions', () => {
      expect(validateAnswer('1/0', '1/2', { inputType: 'FRACTION' })).toBe(false);
      expect(validateAnswer('1/', '1/2', { inputType: 'FRACTION' })).toBe(false);
      expect(validateAnswer('/2', '1/2', { inputType: 'FRACTION' })).toBe(false);
      expect(validateAnswer('1/2/3', '1/2', { inputType: 'FRACTION' })).toBe(false);
    });
  });

  describe('ratios', () => {
    it('accepts equivalent ratios and whitespace variations', () => {
      expect(validateAnswer('4:6', '2:3', { inputType: 'RATIO' })).toBe(true);
      expect(validateAnswer('2 : 3', '2:3', { inputType: 'RATIO' })).toBe(true);
      expect(validateAnswer('3:2', '2:3', { inputType: 'RATIO' })).toBe(false);
      expect(validateAnswer('-2:3', '2:-3', { inputType: 'RATIO' })).toBe(false);
    });
  });

  describe('numbers and decimals', () => {
    it('accepts equivalent decimal and signed representations', () => {
      expect(validateAnswer('.5', '0.5', { inputType: 'NUMPAD' })).toBe(true);
      expect(validateAnswer('1.50', '1.5', { inputType: 'NUMPAD' })).toBe(true);
      expect(validateAnswer('-0', '0', { inputType: 'NUMPAD' })).toBe(true);
      expect(validateAnswer('042', 42, { inputType: 'NUMPAD' })).toBe(true);
      expect(validateAnswer('42.00', 42, { inputType: 'NUMPAD' })).toBe(true);
      expect(validateAnswer('42.1', 42, { inputType: 'NUMPAD' })).toBe(false);
    });
  });

  describe('coordinates', () => {
    it('accepts coordinates with or without parentheses and spaces', () => {
      expect(validateAnswer('(2, -3)', '2,-3', { inputType: 'COORDINATE' })).toBe(true);
      expect(validateAnswer('2, -3', '2,-3', { inputType: 'COORDINATE' })).toBe(true);
      expect(validateAnswer('2.0,-3.0', '2,-3', { inputType: 'COORDINATE' })).toBe(true);
      expect(validateAnswer('-3,2', '2,-3', { inputType: 'COORDINATE' })).toBe(false);
    });
  });

  describe('inequalities and relationships', () => {
    it('accepts inequalities with optional variable prefix and spacing', () => {
      expect(validateAnswer('x > 5', '>5', { inputType: 'INEQUALITY' })).toBe(true);
      expect(validateAnswer('> 5', '>5', { inputType: 'INEQUALITY' })).toBe(true);
      expect(validateAnswer('<= 10', '≤10', { inputType: 'INEQUALITY' })).toBe(true);
      expect(validateAnswer('x >= -2', '≥-2', { inputType: 'INEQUALITY' })).toBe(true);
      expect(validateAnswer('<5', '>5', { inputType: 'INEQUALITY' })).toBe(false);
    });

    it('normalizes relationship operators', () => {
      expect(validateAnswer('<=', '≤', { inputType: 'RELATIONSHIP' })).toBe(true);
      expect(validateAnswer('>=', '≥', { inputType: 'RELATIONSHIP' })).toBe(true);
      expect(validateAnswer('<', '>', { inputType: 'RELATIONSHIP' })).toBe(false);
    });
  });

  describe('multi-select and text choices', () => {
    it('accepts multi-select answers regardless of ordering or spacing', () => {
      expect(validateAnswer('6, 2, 1, 3', '1,2,3,6', { isMultiSelect: true })).toBe(true);
      expect(validateAnswer('1,2,3', '1,2,3,6', { isMultiSelect: true })).toBe(false);
    });

    it('handles case-insensitive choice matching and rejects blank inputs', () => {
      expect(validateAnswer('positive', 'POSITIVE')).toBe(true);
      expect(validateAnswer('   ', '5')).toBe(false);
    });

    it('performs exact normalized string match when isChoice is true without triggering RATIO or FRACTION parsing', () => {
      expect(
        validateAnswer('Step 1: subtracted instead of added', 'Step 1: subtracted instead of added', {
          isChoice: true,
        })
      ).toBe(true);
      expect(
        validateAnswer('  step 1:   subtracted   instead of added ', 'Step 1: subtracted instead of added', {
          isChoice: true,
        })
      ).toBe(true);
      expect(
        validateAnswer('Divide by 3/4', 'Divide by 3/4', {
          isChoice: true,
        })
      ).toBe(true);
      expect(
        validateAnswer('4:6', '4:6', {
          isChoice: true,
        })
      ).toBe(true);
      // Equivalent ratio/fraction distractors must NOT match an exact choice string
      expect(
        validateAnswer('2:3', '4:6', {
          isChoice: true,
        })
      ).toBe(false);
      expect(
        validateAnswer('2/4', '1/2', {
          isChoice: true,
        })
      ).toBe(false);
      expect(
        validateAnswer('Step 2: wrong move', 'Step 1: wrong move', {
          isChoice: true,
        })
      ).toBe(false);
    });
  });
});
