import React from 'react';
import { Cpu, BrainCircuit } from 'lucide-react';
import { MEDITATION_FP_COST } from '../../lib/combatLogic';

export interface CombatActionBarProps {
  onHintClick: () => void;
  onMeditationClick: () => void;
  totalHints: number;
  hintDisabled: boolean;
  meditationDisabled: boolean;
  orientation?: 'row' | 'column';
}

export const CombatActionBar: React.FC<CombatActionBarProps> = ({
  onHintClick,
  onMeditationClick,
  totalHints,
  hintDisabled,
  meditationDisabled,
  orientation = 'row',
}) => {
  return (
    <div className={`flex ${orientation === 'column' ? 'flex-col justify-center' : 'flex-row'} gap-1.5`}>
      <button
        type="button"
        onClick={onHintClick}
        disabled={hintDisabled}
        aria-label={`Use Hint Pack (${totalHints} remaining)`}
        title={`Use Hint Pack (${totalHints} left)`}
        className="min-w-11 min-h-11 px-2 bg-gb-0 border border-gb-3 flex flex-col items-center justify-center disabled:opacity-30 hover:bg-gb-2 hover:text-gb-0 transition-colors tabular-nums"
      >
        <Cpu className="w-4 h-4" />
        <span className="text-[11px] font-bold leading-none mt-0.5">{totalHints}</span>
      </button>
      <button
        type="button"
        onClick={onMeditationClick}
        disabled={meditationDisabled}
        aria-label={`Meditate to recover HP (costs ${MEDITATION_FP_COST} FP)`}
        title={`Meditate (${MEDITATION_FP_COST} FP)`}
        className="min-w-11 min-h-11 px-2 bg-gb-0 border border-gb-3 flex flex-col items-center justify-center disabled:opacity-30 hover:bg-gb-2 hover:text-gb-0 transition-colors"
      >
        <BrainCircuit className="w-4 h-4" />
        <span className="text-[11px] font-bold leading-none mt-0.5">HEAL</span>
      </button>
    </div>
  );
};
