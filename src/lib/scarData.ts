export type ScarId = 'STATIC_EYE' | 'CALCULATION_LAG' | 'THE_BLUR';

export interface ScarMetadata {
  id: ScarId;
  name: string;
  description: string;
}

export const SCAR_METADATA: Record<ScarId, ScarMetadata> = {
  STATIC_EYE: {
    id: 'STATIC_EYE',
    name: 'Static Eye',
    description: 'Sentinels flicker and fade on the dungeon radar.',
  },
  CALCULATION_LAG: {
    id: 'CALCULATION_LAG',
    name: 'Calculation Lag',
    description: 'Focus regeneration in combat is halved (+5 FP instead of +10 FP).',
  },
  THE_BLUR: {
    id: 'THE_BLUR',
    name: 'The Blur',
    description: 'Cipher prompts suffer visual static distortion.',
  },
};

export const POSSIBLE_SCARS: readonly ScarId[] = [
  'STATIC_EYE',
  'CALCULATION_LAG',
  'THE_BLUR',
];

export function getScarName(scarId: string): string {
  const entry = SCAR_METADATA[scarId as ScarId];
  return entry ? entry.name : scarId;
}

export function getRandomScar(
  existingScars: readonly string[] = [],
  rng: () => number = Math.random
): ScarId | null {
  const available = POSSIBLE_SCARS.filter((scar) => !existingScars.includes(scar));
  if (available.length === 0) {
    return null;
  }
  const index = Math.floor(rng() * available.length);
  return available[Math.min(index, available.length - 1)];
}
