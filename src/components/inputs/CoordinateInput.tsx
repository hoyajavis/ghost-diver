import React from 'react';
import { CoordinateGrid } from '../CoordinateGrid';
import { CombatActionBar, CombatActionBarProps } from './CombatActionBar';

interface Props {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => void;
  actionBarProps?: Omit<CombatActionBarProps, 'orientation'>;
}

export const CoordinateInput: React.FC<Props> = ({
  input,
  setInput,
  onSubmit,
  actionBarProps,
}) => {
  return (
    <div className="flex flex-col gap-2">
      {actionBarProps && (
        <div className="flex justify-end mb-1">
          <CombatActionBar {...actionBarProps} orientation="row" />
        </div>
      )}
      <CoordinateGrid value={input} onChange={setInput} onSubmit={onSubmit} />
    </div>
  );
};
