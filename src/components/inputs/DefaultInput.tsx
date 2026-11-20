import React from 'react';
import { InputType } from '../../types';
import { NumberPad } from '../NumberPad';
import { CombatActionBar, CombatActionBarProps } from './CombatActionBar';

interface Props {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  currentInputType: InputType;
  onSubmit: () => void;
  disabled?: boolean;
  actionBarProps?: Omit<CombatActionBarProps, 'orientation'>;
}

export const DefaultInput: React.FC<Props> = ({
  input,
  setInput,
  currentInputType,
  onSubmit,
  disabled = false,
  actionBarProps,
}) => {
  return (
    <>
      <div className="flex gap-2">
        <div className="flex-1 bg-gb-0 border-2 border-gb-3 p-1 text-xl text-center text-neon-cyan min-h-[40px] flex items-center justify-center gb-border-sm">
          {input || <span className="opacity-30 animate-pulse">_</span>}
        </div>
        {actionBarProps && <CombatActionBar {...actionBarProps} orientation="row" />}
      </div>

      <NumberPad
        onKeyPress={(k) => setInput((prev) => prev + k)}
        onDelete={() => setInput((prev) => prev.slice(0, -1))}
        onSubmit={onSubmit}
        extraKeys={currentInputType === 'INEQUALITY' ? ['<', '≤', '≥', '>'] : []}
        disabled={disabled}
      />
    </>
  );
};
