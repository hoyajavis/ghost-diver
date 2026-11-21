import React from 'react';
import {
  INCLUSIVE_RELATIONSHIP_SYMBOLS,
  RELATIONSHIP_SYMBOLS,
} from '../../lib/inputUtils';

interface Props {
  onSelect: (sym: string) => void;
  disabled: boolean;
  includeInclusive?: boolean;
}

export const RelationshipInput: React.FC<Props> = ({
  onSelect,
  disabled,
  includeInclusive = false,
}) => {
  const symbols = includeInclusive
    ? INCLUSIVE_RELATIONSHIP_SYMBOLS
    : RELATIONSHIP_SYMBOLS;

  return (
    <div className="flex gap-2 justify-center items-center flex-wrap mt-1">
      {symbols.map((sym, idx) => {
        const letter = String.fromCharCode(65 + idx);
        return (
          <button
            key={sym}
            type="button"
            disabled={disabled}
            aria-label={`${sym} (shortcut ${idx + 1} or ${letter})`}
            onClick={() => {
              if (disabled) return;
              onSelect(sym);
            }}
            className={`${includeInclusive ? 'w-14 h-16' : 'w-16 h-16'} flex flex-col items-center justify-center gap-0.5 font-bold bg-gb-0 border-2 border-gb-3 text-gb-3 hover:bg-neon-cyan hover:text-gb-0 transition-colors gb-border-sm disabled:opacity-40`}
          >
            <span className={`${includeInclusive ? 'text-xl' : 'text-2xl'} leading-none`}>
              {sym}
            </span>
            <span className="text-[10px] font-mono text-neon-cyan leading-none">
              [{idx + 1}]
            </span>
          </button>
        );
      })}
    </div>
  );
};
