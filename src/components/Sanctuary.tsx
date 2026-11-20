import React from 'react';
import { PlayerStats } from '../types';
import { getBankableHintPacks } from '../lib/dungeonLogic';
import { getScarName } from '../lib/scarData';
import { Home, ArrowDownToLine, Activity, Database, ShieldAlert, Cpu } from 'lucide-react';

interface Props {
  stats: PlayerStats;
  onBankAndExit: () => void;
  onDiveDeeper: () => void;
}

export const Sanctuary: React.FC<Props> = ({ stats, onBankAndExit, onDiveDeeper }) => {
  const bankableHints = getBankableHintPacks(stats.runHintPacks, stats.upgrades.hints);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gb-0 text-gb-3 p-4 scanlines relative overflow-y-auto custom-scrollbar terminal-text wireframe-bg">
      <div className="max-w-md w-full flex flex-col items-center bg-gb-1 border-2 border-gb-3 p-6 gb-border shadow-2xl dither relative my-auto">
        <div className="w-12 h-12 bg-gb-0 border-2 border-neon-green flex items-center justify-center shadow-[0_0_20px_rgba(57,255,20,0.3)] mb-3">
          <Activity className="w-6 h-6 text-neon-green" />
        </div>

        <h2 className="text-2xl font-black italic mb-1 text-gb-3 tracking-tight uppercase">
          Secure Node
        </h2>
        <div className="w-full h-[1px] bg-gb-3/60 my-2" />
        <p className="text-gb-2 mb-5 text-center text-xs leading-relaxed font-sans">
          Neural link stabilized. Extract now to bank your gains, or descend into the next sector.
        </p>

        {/* Current Run Stats */}
        <div className="w-full grid grid-cols-2 gap-3 mb-5 tabular-nums">
          <div className="bg-gb-0 border border-gb-3 p-3 gb-border-sm flex flex-col items-center">
            <Database className="w-4 h-4 text-neon-green mb-1" />
            <span className="text-xs text-gb-2 font-bold">Unbanked Shards</span>
            <span className="text-xl font-bold text-gb-3">+{stats.runKnowledge}</span>
          </div>
          <div className="bg-gb-0 border border-gb-3 p-3 gb-border-sm flex flex-col items-center">
            <Cpu className="w-4 h-4 text-neon-cyan mb-1" />
            <span className="text-xs text-gb-2 font-bold">Bankable Hints</span>
            <span className="text-xl font-bold text-gb-3">+{bankableHints}</span>
          </div>
        </div>

        {/* Neural Scars Warning */}
        {stats.neuralScars.length > 0 && (
          <div className="w-full bg-gb-0 border border-neon-magenta p-3 mb-5 gb-border-sm">
            <div className="text-neon-magenta font-bold uppercase tracking-wider text-xs mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Neural Corruption Detected
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold text-gb-3">
              {stats.neuralScars.map((scar, i) => (
                <span key={`${scar}-${i}`} className="text-neon-magenta">
                  {getScarName(scar)}
                  {i < stats.neuralScars.length - 1 ? ' ·' : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col w-full gap-3">
          <button
            type="button"
            onClick={onBankAndExit}
            className="w-full min-h-11 py-2.5 px-4 bg-gb-0 border-2 border-gb-3 hover:bg-gb-3 hover:text-gb-0 text-gb-3 font-black italic transition-all flex items-center justify-center gap-2 uppercase tracking-wider gb-border-sm text-sm"
          >
            <Home className="w-4 h-4" />
            Extract to Bunker
          </button>

          <button
            type="button"
            onClick={onDiveDeeper}
            className="w-full min-h-11 py-2.5 px-4 bg-gb-3 text-gb-0 hover:bg-neon-cyan font-black italic transition-all flex items-center justify-center gap-2 uppercase tracking-wider gb-border shadow-[0_0_20px_rgba(0,243,255,0.25)] text-sm"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Descend Deeper
          </button>
        </div>

        <p className="mt-4 text-xs text-gb-2 text-center leading-relaxed font-sans">
          Descending deeper raises Sentinel difficulty and Neural Scar risk.
        </p>
      </div>
    </div>
  );
};
