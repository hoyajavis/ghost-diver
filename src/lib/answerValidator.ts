import { InputType } from '../types';

const NUMERIC_EPSILON = 1e-6;

export interface ValidateAnswerOptions {
  inputType?: InputType;
  requireSimplified?: boolean;
  isMultiSelect?: boolean;
  isChoice?: boolean;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

interface ParsedFraction {
  num: number;
  den: number;
}

function parseFraction(raw: string): ParsedFraction | null {
  const cleaned = raw.replace(/\s+/g, '');
  if (!cleaned) return null;

  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return { num, den };
  }

  // Allow whole numbers to match integer-valued fractions (e.g., 1 === 4/4, 0 === 0/4)
  const asNum = Number(cleaned);
  if (Number.isFinite(asNum)) {
    return { num: asNum, den: 1 };
  }

  return null;
}

function parseRatio(raw: string): [number, number] | null {
  const cleaned = raw.replace(/\s+/g, '');
  const parts = cleaned.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return [a, b];
}

function parseCoordinate(raw: string): [number, number] | null {
  const cleaned = raw.trim().replace(/^\(/, '').replace(/\)$/, '').replace(/\s+/g, '');
  const parts = cleaned.split(',');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x, y];
}

function parseInequality(raw: string): { op: string; value: number } | null {
  const cleaned = raw.trim().replace(/^[a-zA-Z]\s*/, '').replace(/\s+/g, '');
  const match = cleaned.match(/^(<=|>=|≤|≥|<|>)(.+)$/);
  if (!match) return null;
  const op = match[1].replace('<=', '≤').replace('>=', '≥');
  const value = Number(match[2]);
  if (!Number.isFinite(value)) return null;
  return { op, value };
}

function normalizeMultiSelect(raw: string): string {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b);
    })
    .join(',');
}

export function validateAnswer(
  submitted: string,
  expected: string | number,
  options: ValidateAnswerOptions = {}
): boolean {
  const subTrimmed = submitted.trim();
  const expTrimmed = expected.toString().trim();

  if (!subTrimmed || !expTrimmed) return false;

  const {
    inputType,
    requireSimplified = false,
    isMultiSelect = false,
    isChoice = false,
  } = options;

  if (isMultiSelect) {
    return normalizeMultiSelect(subTrimmed) === normalizeMultiSelect(expTrimmed);
  }

  if (isChoice) {
    const normalizeChoice = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
    return normalizeChoice(subTrimmed) === normalizeChoice(expTrimmed);
  }

  if (inputType === 'FRACTION' || expTrimmed.includes('/')) {
    const subFrac = parseFraction(subTrimmed);
    const expFrac = parseFraction(expTrimmed);
    if (!subFrac || !expFrac) return false;

    const isEquivalent =
      Math.abs(subFrac.num * expFrac.den - expFrac.num * subFrac.den) < NUMERIC_EPSILON;
    if (!isEquivalent) return false;

    if (requireSimplified) {
      if (!Number.isInteger(subFrac.num) || !Number.isInteger(subFrac.den)) return false;
      if (subFrac.den <= 0) return false;
      return gcd(subFrac.num, subFrac.den) === 1;
    }

    return true;
  }

  if (inputType === 'RATIO' || expTrimmed.includes(':')) {
    const subRatio = parseRatio(subTrimmed);
    const expRatio = parseRatio(expTrimmed);
    if (!subRatio || !expRatio) return false;

    const [sa, sb] = subRatio;
    const [ea, eb] = expRatio;
    if (ea === 0 && eb === 0) return sa === 0 && sb === 0;
    if (sb === 0 || eb === 0) return sa === ea && sb === eb;
    // Same sign orientation and equivalent proportion
    return Math.sign(sa) === Math.sign(ea) && Math.sign(sb) === Math.sign(eb) &&
      Math.abs(sa * eb - ea * sb) < NUMERIC_EPSILON;
  }

  if (inputType === 'COORDINATE') {
    const subCoord = parseCoordinate(subTrimmed);
    const expCoord = parseCoordinate(expTrimmed);
    if (!subCoord || !expCoord) return false;
    return (
      Math.abs(subCoord[0] - expCoord[0]) < NUMERIC_EPSILON &&
      Math.abs(subCoord[1] - expCoord[1]) < NUMERIC_EPSILON
    );
  }

  if (inputType === 'INEQUALITY') {
    const subIneq = parseInequality(subTrimmed);
    const expIneq = parseInequality(expTrimmed);
    if (!subIneq || !expIneq) return false;
    return subIneq.op === expIneq.op && Math.abs(subIneq.value - expIneq.value) < NUMERIC_EPSILON;
  }

  if (inputType === 'RELATIONSHIP') {
    const normalizeRel = (v: string) => v.replace('<=', '≤').replace('>=', '≥');
    return normalizeRel(subTrimmed) === normalizeRel(expTrimmed);
  }

  // Numeric comparison handles .5 vs 0.5, 1.50 vs 1.5, -0 vs 0, +4 vs 4
  const subNum = Number(subTrimmed);
  const expNum = Number(expTrimmed);
  if (Number.isFinite(subNum) && Number.isFinite(expNum)) {
    return Math.abs(subNum - expNum) < NUMERIC_EPSILON;
  }

  return subTrimmed.toUpperCase() === expTrimmed.toUpperCase();
}
