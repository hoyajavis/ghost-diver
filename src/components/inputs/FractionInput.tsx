import React from 'react';
import { NumberPad } from '../NumberPad';
import { CombatActionBar, CombatActionBarProps } from './CombatActionBar';

interface Props {
  type: 'FRACTION' | 'RATIO';
  fractionInput: { num: string; den: string };
  fractionFocus: 'num' | 'den';
  setFractionFocus: React.Dispatch<React.SetStateAction<'num' | 'den'>>;
  setFractionInput: React.Dispatch<React.SetStateAction<{ num: string; den: string }>>;
  onSubmit: () => void;
  disabled?: boolean;
  actionBarProps?: Omit<CombatActionBarProps, 'orientation'>;
}

export const FractionInput: React.FC<Props> = ({
  type,
  fractionInput,
  fractionFocus,
  setFractionFocus,
  setFractionInput,
  onSubmit,
  disabled = false,
  actionBarProps,
}) => {
  return (
    <>
      <div className="flex gap-2">
        <div className={`flex-1 flex ${type === 'RATIO' ? 'flex-row' : 'flex-col'} items-center justify-center gap-1`}>
          <div
            onClick={() => !disabled && setFractionFocus('num')}
            className={`w-24 h-10 bg-gb-0 border-2 ${fractionFocus === 'num' ? 'border-neon-cyan text-neon-cyan' : 'border-gb-3 text-gb-3'} text-xl text-center flex items-center justify-center gb-border-sm cursor-pointer transition-colors`}
          >
            {fractionInput.num || (fractionFocus === 'num' ? <span className="opacity-30 animate-pulse">_</span> : '')}
          </div>
          {type === 'RATIO' ? (
            <div className="text-2xl font-bold text-gb-3 px-2">:</div>
          ) : (
            <div className="w-24 h-1 bg-gb-3" />
          )}
          <div
            onClick={() => !disabled && setFractionFocus('den')}
            className={`w-24 h-10 bg-gb-0 border-2 ${fractionFocus === 'den' ? 'border-neon-cyan text-neon-cyan' : 'border-gb-3 text-gb-3'} text-xl text-center flex items-center justify-center gb-border-sm cursor-pointer transition-colors`}
          >
            {fractionInput.den || (fractionFocus === 'den' ? <span className="opacity-30 animate-pulse">_</span> : '')}
          </div>
        </div>
        <div className="flex flex-col gap-1 justify-center">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setFractionFocus((prev) => (prev === 'num' ? 'den' : 'num'))}
            className="w-10 h-10 bg-gb-0 border border-gb-3 flex items-center justify-center hover:bg-gb-2 hover:text-gb-0 transition-colors text-[10px] font-bold disabled:opacity-40"
          >
            SWAP
          </button>
          {actionBarProps && <CombatActionBar {...actionBarProps} orientation="column" />}
        </div>
      </div>
      <NumberPad
        onKeyPress={(k) => setFractionInput((prev) => ({ ...prev, [fractionFocus]: prev[fractionFocus] + k }))}
        onDelete={() => setFractionInput((prev) => ({ ...prev, [fractionFocus]: prev[fractionFocus].slice(0, -1) }))}
        onSubmit={onSubmit}
        allowDecimal={false}
        allowNegative={type === 'FRACTION'}
        disabled={disabled}
      />
    </>
  );
};
