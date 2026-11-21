import React from 'react';
import { InputType } from '../../types';
import { NumberPad } from '../NumberPad';

interface Props {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  currentInputType: InputType;
  onSubmit: () => void;
  disabled?: boolean;
}

export const DefaultInput: React.FC<Props> = ({
  input,
  setInput,
  currentInputType,
  onSubmit,
  disabled = false,
}) => {
  return (
    <>
      <div className="min-h-[44px] lg:min-h-[92px] flex items-center">
        <div className="w-full bg-gb-0 border-2 border-gb-3 p-1.5 lg:p-2 text-xl lg:text-2xl font-bold text-center text-neon-cyan min-h-[42px] lg:min-h-[56px] flex items-center justify-center gb-border-sm">
          {input || <span className="opacity-30 animate-pulse">_</span>}
        </div>
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
