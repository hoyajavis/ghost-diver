import React from 'react';

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
  const symbols = includeInclusive ? ['<', '≤', '=', '≥', '>'] : ['<', '=', '>'];

  return (
    <div className="flex gap-2 justify-center items-center flex-wrap mt-1">
      {symbols.map((sym) => (
        <button
          key={sym}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            onSelect(sym);
          }}
          className={`${includeInclusive ? 'w-12 h-14 text-xl' : 'w-16 h-16 text-2xl'} font-bold bg-gb-0 border-2 border-gb-3 text-gb-3 hover:bg-neon-cyan hover:text-gb-0 transition-colors gb-border-sm disabled:opacity-40`}
        >
          {sym}
        </button>
      ))}
    </div>
  );
};
