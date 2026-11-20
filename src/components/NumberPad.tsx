import React from 'react';
import { Delete } from 'lucide-react';

interface Props {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  extraKeys?: string[];
  allowDecimal?: boolean;
  allowNegative?: boolean;
  disabled?: boolean;
}

export const NumberPad: React.FC<Props> = ({
  onKeyPress,
  onDelete,
  onSubmit,
  extraKeys = [],
  allowDecimal = true,
  allowNegative = true,
  disabled = false,
}) => {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const zeroSpanClass =
    !allowNegative && !allowDecimal
      ? 'col-span-3'
      : !allowNegative || !allowDecimal
        ? 'col-span-2'
        : 'col-span-1';

  return (
    <div className="w-full flex flex-col gap-1">
      {extraKeys.length > 0 && (
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${extraKeys.length}, minmax(0, 1fr))` }}
        >
          {extraKeys.map((k) => (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => onKeyPress(k)}
              className="bg-gb-0 border border-neon-cyan/70 text-neon-cyan hover:bg-neon-cyan hover:text-gb-0 active:bg-neon-cyan active:text-gb-0 text-lg font-bold py-1 transition-colors gb-border-sm disabled:opacity-40"
            >
              {k}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1">
        {digits.map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => onKeyPress(k)}
            className="bg-gb-0 border border-gb-3 text-gb-3 hover:bg-gb-3 hover:text-gb-0 active:bg-neon-cyan active:text-gb-0 text-lg font-bold py-1 transition-colors gb-border-sm disabled:opacity-40"
          >
            {k}
          </button>
        ))}

        {allowNegative && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onKeyPress('-')}
            className="bg-gb-0 border border-gb-3 text-gb-3 hover:bg-gb-3 hover:text-gb-0 active:bg-neon-cyan active:text-gb-0 text-lg font-bold py-1 transition-colors gb-border-sm disabled:opacity-40"
          >
            -
          </button>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={() => onKeyPress('0')}
          className={`${zeroSpanClass} bg-gb-0 border border-gb-3 text-gb-3 hover:bg-gb-3 hover:text-gb-0 active:bg-neon-cyan active:text-gb-0 text-lg font-bold py-1 transition-colors gb-border-sm disabled:opacity-40`}
        >
          0
        </button>

        {allowDecimal && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onKeyPress('.')}
            className="bg-gb-0 border border-gb-3 text-gb-3 hover:bg-gb-3 hover:text-gb-0 active:bg-neon-cyan active:text-gb-0 text-lg font-bold py-1 transition-colors gb-border-sm disabled:opacity-40"
          >
            .
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          aria-label="Backspace"
          className="bg-gb-0 border border-neon-magenta text-neon-magenta hover:bg-neon-magenta hover:text-gb-0 py-1 flex items-center justify-center transition-colors gb-border-sm disabled:opacity-40"
        >
          <Delete className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onSubmit}
          className="bg-gb-3 text-gb-0 hover:bg-neon-cyan font-black py-1 transition-colors text-xs uppercase tracking-widest gb-border-sm disabled:opacity-40"
        >
          SUBMIT
        </button>
      </div>
    </div>
  );
};
