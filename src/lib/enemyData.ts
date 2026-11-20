export interface EnemyVariantData {
  id: number;
  name: string;
  fullName: string;
}

export interface EnemyTierData {
  tier: number;
  name: string;
  baseHp: number;
  variants: Record<number, EnemyVariantData>;
}

export const ENEMY_TIERS: Record<number, EnemyTierData> = {
  1: {
    tier: 1,
    name: 'SURFACE_WASTES',
    baseHp: 30,
    variants: {
      1: { id: 1, name: 'PLACE VALUE', fullName: 'SURFACE_WASTES (PLACE VALUE)' },
      2: { id: 2, name: 'ROUNDING', fullName: 'SURFACE_WASTES (ROUNDING)' },
      3: { id: 3, name: 'ADDITION', fullName: 'SURFACE_WASTES (ADDITION)' },
      4: { id: 4, name: 'SUBTRACTION', fullName: 'SURFACE_WASTES (SUBTRACTION)' }
    }
  },
  2: {
    tier: 2,
    name: 'LOGIC_CORE',
    baseHp: 40,
    variants: {
      1: { id: 1, name: 'MULTIPLICATION', fullName: 'LOGIC_CORE (MULTIPLICATION)' },
      2: { id: 2, name: 'FACTORS', fullName: 'LOGIC_CORE (FACTORS)' },
      3: { id: 3, name: 'MULTIPLES', fullName: 'LOGIC_CORE (MULTIPLES)' },
      4: { id: 4, name: 'PRIME_COMPOSITE', fullName: 'LOGIC_CORE (PRIME_COMPOSITE)' }
    }
  },
  3: {
    tier: 3,
    name: 'DATA_VAULTS',
    baseHp: 50,
    variants: {
      1: { id: 1, name: 'MULTIPLICATION 2x2', fullName: 'DATA_VAULTS (MULTIPLICATION 2x2)' },
      2: { id: 2, name: 'LONG DIVISION', fullName: 'DATA_VAULTS (LONG DIVISION)' },
      3: { id: 3, name: 'REMAINDERS', fullName: 'DATA_VAULTS (REMAINDERS)' }
    }
  },
  4: {
    tier: 4,
    name: 'THE_ARCHIVE',
    baseHp: 60,
    variants: {
      1: { id: 1, name: 'EQUIVALENT FRACTIONS', fullName: 'THE_ARCHIVE (EQUIVALENT FRACTIONS)' },
      2: { id: 2, name: 'COMPARING FRACTIONS', fullName: 'THE_ARCHIVE (COMPARING FRACTIONS)' },
      3: { id: 3, name: 'ADDITION (LIKE DENOM)', fullName: 'THE_ARCHIVE (ADDITION LIKE DENOM)' },
      4: { id: 4, name: 'SUBTRACTION (LIKE DENOM)', fullName: 'THE_ARCHIVE (SUBTRACTION LIKE DENOM)' }
    }
  },
  5: {
    tier: 5,
    name: 'NEURAL_NETWORK',
    baseHp: 70,
    variants: {
      1: { id: 1, name: 'ADDITION (UNLIKE DENOM)', fullName: 'NEURAL_NETWORK (ADDITION UNLIKE DENOM)' },
      2: { id: 2, name: 'SUBTRACTION (UNLIKE DENOM)', fullName: 'NEURAL_NETWORK (SUBTRACTION UNLIKE DENOM)' },
      3: { id: 3, name: 'FRACTION MULTIPLICATION', fullName: 'NEURAL_NETWORK (FRACTION MULTIPLICATION)' },
      4: { id: 4, name: 'VOLUME CALCULATION', fullName: 'NEURAL_NETWORK (VOLUME CALCULATION)' },
      5: { id: 5, name: 'UNIT CONVERSIONS', fullName: 'NEURAL_NETWORK (UNIT CONVERSIONS)' }
    }
  },
  6: {
    tier: 6,
    name: 'QUANTUM_CORE',
    baseHp: 80,
    variants: {
      1: { id: 1, name: 'DECIMAL ADD/SUB', fullName: 'QUANTUM_CORE (DECIMAL ADD/SUB)' },
      2: { id: 2, name: 'DECIMAL MULT/DIV', fullName: 'QUANTUM_CORE (DECIMAL MULT/DIV)' },
      3: { id: 3, name: 'FRACTION TO DECIMAL', fullName: 'QUANTUM_CORE (FRACTION TO DECIMAL)' },
      4: { id: 4, name: 'DECIMAL TO FRACTION', fullName: 'QUANTUM_CORE (DECIMAL TO FRACTION)' }
    }
  },
  7: {
    tier: 7,
    name: 'SYNAPSE_RELAY',
    baseHp: 90,
    variants: {
      1: { id: 1, name: 'RATIOS', fullName: 'SYNAPSE_RELAY (RATIOS)' },
      2: { id: 2, name: 'UNIT RATES', fullName: 'SYNAPSE_RELAY (UNIT RATES)' },
      3: { id: 3, name: 'PERCENTAGES', fullName: 'SYNAPSE_RELAY (PERCENTAGES)' }
    }
  },
  8: {
    tier: 8,
    name: 'VOID_WALKER',
    baseHp: 100,
    variants: {
      1: { id: 1, name: 'INTEGER ADDITION', fullName: 'VOID_WALKER (INTEGER ADDITION)' },
      2: { id: 2, name: 'INTEGER SUBTRACTION', fullName: 'VOID_WALKER (INTEGER SUBTRACTION)' },
      3: { id: 3, name: 'ABSOLUTE VALUE', fullName: 'VOID_WALKER (ABSOLUTE VALUE)' },
      4: { id: 4, name: 'COORDINATE PLANE', fullName: 'VOID_WALKER (COORDINATE PLANE)' }
    }
  },
  9: {
    tier: 9,
    name: 'CHRONO_WRAITH',
    baseHp: 110,
    variants: {
      1: { id: 1, name: 'EXPONENTS', fullName: 'CHRONO_WRAITH (EXPONENTS)' },
      2: { id: 2, name: 'ORDER OF OPERATIONS', fullName: 'CHRONO_WRAITH (ORDER OF OPERATIONS)' },
      3: { id: 3, name: 'VARIABLE EXPRESSIONS', fullName: 'CHRONO_WRAITH (VARIABLE EXPRESSIONS)' },
      4: { id: 4, name: 'ONE-STEP ALGEBRA', fullName: 'CHRONO_WRAITH (ONE-STEP ALGEBRA)' }
    }
  },
  10: {
    tier: 10,
    name: 'OMEGA_CONSTRUCT',
    baseHp: 120,
    variants: {
      1: { id: 1, name: 'TWO-STEP ALGEBRA', fullName: 'OMEGA_CONSTRUCT (TWO-STEP ALGEBRA)' },
      2: { id: 2, name: 'INEQUALITIES', fullName: 'OMEGA_CONSTRUCT (INEQUALITIES)' },
      3: { id: 3, name: 'AREA (TRI/PARA)', fullName: 'OMEGA_CONSTRUCT (AREA TRI/PARA)' },
      4: { id: 4, name: 'MEAN / MEDIAN / RANGE', fullName: 'OMEGA_CONSTRUCT (MEAN / MEDIAN / RANGE)' }
    }
  },
  11: {
    tier: 11,
    name: 'PROPORTION_MATRIX',
    baseHp: 130,
    variants: {
      1: { id: 1, name: 'CONSTANT OF PROPORTIONALITY', fullName: 'PROPORTION_MATRIX (CONSTANT K)' },
      2: { id: 2, name: 'TAX AND TIP', fullName: 'PROPORTION_MATRIX (TAX AND TIP)' },
      3: { id: 3, name: 'SIMPLE INTEREST', fullName: 'PROPORTION_MATRIX (SIMPLE INTEREST)' },
      4: { id: 4, name: 'PROPORTIONAL VS LINEAR', fullName: 'PROPORTION_MATRIX (PROP VS LINEAR)' }
    }
  },
  12: {
    tier: 12,
    name: 'RATIONAL_ABYSS',
    baseHp: 140,
    variants: {
      1: { id: 1, name: 'RATIONAL ADD/SUB', fullName: 'RATIONAL_ABYSS (RATIONAL ADD/SUB)' },
      2: { id: 2, name: 'RATIONAL MULT/DIV', fullName: 'RATIONAL_ABYSS (RATIONAL MULT/DIV)' },
      3: { id: 3, name: 'MULTI-STEP RATIONALS', fullName: 'RATIONAL_ABYSS (MULTI-STEP RATIONALS)' },
      4: { id: 4, name: 'RULES OF SIGNS', fullName: 'RATIONAL_ABYSS (RULES OF SIGNS)' }
    }
  }
};
