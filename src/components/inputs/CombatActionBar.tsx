import React from 'react';
import { Cpu, BrainCircuit, Shield } from 'lucide-react';
import { MEDITATION_FP_COST } from '../../lib/combatLogic';

export interface CombatActionBarProps {
  onHintClick: () => void;
  onMeditationClick: () => void;
  totalHints: number;
  hintDisabled: boolean;
  meditationDisabled: boolean;
  shieldActive?: boolean;
  showShortcutHints?: boolean;
  orientation?: 'row' | 'column';
}

export const CombatActionBar: React.FC<CombatActionBarProps> = ({
  onHintClick,
  onMeditationClick,
  totalHints,
  hintDisabled,
  meditationDisabled,
  shieldActive = false,
  showShortcutHints = true,
  orientation = 'row',
}) => {
  const isRow = orientation === 'row';

  return (
    <div
      className={`flex ${isRow ? 'flex-row items-stretch w-full' : 'flex-col justify-center'} gap-2`}
    >
      <button
        type="button"
        onClick={onHintClick}
        disabled={hintDisabled}
        aria-label={
          shieldActive
            ? `Use Tactical Hint: reveal clue, shield already active (${totalHints} remaining, Shift+H)`
            : `Use Tactical Hint: reveal clue and shield next hit (${totalHints} remaining, Shift+H)`
        }
        title={`Tactical Hint: reveal clue & shield next hit (${totalHints} left, Shift+H)`}
        className={`${isRow ? 'flex-1' : ''} min-w-11 min-h-11 px-2.5 py-1.5 bg-gb-0 border ${
          shieldActive ? 'border-neon-cyan text-neon-cyan' : 'border-gb-3 text-gb-3'
        } flex items-center justify-center gap-1.5 disabled:opacity-30 hover:bg-gb-2 hover:text-gb-0 transition-colors tabular-nums`}
      >
        <Cpu className="w-4 h-4 shrink-0" />
        <span className="text-xs font-bold leading-none whitespace-nowrap">
          CLUE {totalHints}
        </span>
        {shieldActive && (
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-neon-cyan/20 border border-neon-cyan text-[10px] font-black leading-none text-neon-cyan">
            <Shield className="w-2.5 h-2.5" />
            SHIELD
          </span>
        )}
        {showShortcutHints && (
          <kbd className="hidden sm:inline-block px-1 py-0.5 text-[10px] font-mono border border-current/40 opacity-75 leading-none">
            ⇧H
          </kbd>
        )}
      </button>

      <button
        type="button"
        onClick={onMeditationClick}
        disabled={meditationDisabled}
        aria-label={`Meditate to recover HP (costs ${MEDITATION_FP_COST} FP, Shift+F)`}
        title={`Meditate (${MEDITATION_FP_COST} FP, Shift+F)`}
        className={`${isRow ? 'flex-1' : ''} min-w-11 min-h-11 px-2.5 py-1.5 bg-gb-0 border border-gb-3 text-gb-3 flex items-center justify-center gap-1.5 disabled:opacity-30 hover:bg-gb-2 hover:text-gb-0 transition-colors`}
      >
        <BrainCircuit className="w-4 h-4 shrink-0" />
        <span className="text-xs font-bold leading-none whitespace-nowrap">HEAL</span>
        {showShortcutHints && (
          <kbd className="hidden sm:inline-block px-1 py-0.5 text-[10px] font-mono border border-current/40 opacity-75 leading-none">
            ⇧F
          </kbd>
        )}
      </button>
    </div>
  );
};
