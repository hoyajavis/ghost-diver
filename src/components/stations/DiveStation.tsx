import React from 'react';
import { PlayerStats } from '../../types';
import { clampFloor, getDiveCost, MAX_FLOOR, MAX_TIER } from '../../lib/dungeonLogic';
import { getScarName } from '../../lib/scarData';
import { Activity, ChevronLeft, ChevronRight, Database } from 'lucide-react';

interface Props {
  stats: PlayerStats;
  selectedFloor: number;
  setSelectedFloor: React.Dispatch<React.SetStateAction<number>>;
  onStartDive: (startFloor?: number) => void;
  onHealScar: (scar: string) => void;
  onCalibrateScar: (scar: string) => void;
}

export const DiveStation: React.FC<Props> = ({
  stats,
  selectedFloor,
  setSelectedFloor,
  onStartDive,
  onHealScar,
  onCalibrateScar,
}) => {
  const maxUnlocked = clampFloor(stats.maxExtractedFloor);
  const clampedFloor = Math.max(1, Math.min(maxUnlocked, selectedFloor));
  const diveCost = getDiveCost(clampedFloor);
  const canAffordDive = stats.knowledge >= diveCost;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-black italic text-neon-cyan tracking-tight uppercase flex items-center gap-2 pr-10">
        <Activity className="w-5 h-5 shrink-0" />
        Neural Chair
      </h3>

      <div className="bg-gb-0 border border-gb-3 p-4 flex flex-col items-center gap-4 gb-border-sm tabular-nums">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setSelectedFloor(Math.max(1, clampedFloor - 1))}
            disabled={clampedFloor <= 1}
            aria-label="Decrease starting floor"
            className="min-w-11 min-h-11 border border-gb-3 flex items-center justify-center hover:bg-gb-3 hover:text-gb-0 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-[110px]">
            <div className="text-3xl font-black italic">Floor {clampedFloor}</div>
            <div className="text-xs text-gb-2">
              Max unlocked: F{maxUnlocked}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedFloor(Math.min(maxUnlocked, clampedFloor + 1))}
            disabled={clampedFloor >= maxUnlocked}
            aria-label="Increase starting floor"
            className="min-w-11 min-h-11 border border-gb-3 flex items-center justify-center hover:bg-gb-3 hover:text-gb-0 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {clampedFloor >= MAX_FLOOR && (
          <div className="text-xs text-amber-400 font-bold uppercase tracking-wider text-center">
            Deep Sub-Strata Locked (Max Sector {MAX_TIER} · F{MAX_FLOOR})
          </div>
        )}

        <div className="flex items-center gap-2 text-xs font-bold">
          <Database className={`w-4 h-4 ${canAffordDive ? 'text-neon-green' : 'text-neon-magenta'}`} />
          <span className="text-gb-2">Drop Cost:</span>
          <span className={canAffordDive ? 'text-neon-green' : 'text-neon-magenta'}>
            {diveCost === 0 ? 'Free' : `${diveCost} Shards`}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onStartDive(clampedFloor)}
          disabled={!canAffordDive}
          className="w-full min-h-11 py-3 px-4 bg-gb-3 text-gb-0 font-black italic uppercase tracking-wider hover:bg-neon-cyan transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gb-3 text-sm"
        >
          {canAffordDive ? 'Start Dive' : `Need ${diveCost} Shards`}
        </button>
      </div>

      {stats.neuralScars.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-neon-magenta font-bold uppercase tracking-wider">
            Active Neural Scars
          </div>
          {stats.neuralScars.map((scar, i) => (
            <div
              key={`${scar}-${i}`}
              className="flex flex-wrap justify-between items-center gap-2 bg-gb-0 p-3 border border-neon-magenta/40"
            >
              <span className="text-xs font-bold text-neon-magenta">{getScarName(scar)}</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCalibrateScar(scar)}
                  className="min-h-10 text-xs font-bold border border-neon-cyan text-neon-cyan px-3 py-1.5 hover:bg-neon-cyan hover:text-gb-0 transition-colors whitespace-nowrap tabular-nums"
                >
                  Recalibrate (Free · 0/3)
                </button>
                <button
                  type="button"
                  onClick={() => onHealScar(scar)}
                  disabled={stats.knowledge < 50}
                  className="min-h-10 text-xs font-bold border border-gb-3 px-3 py-1.5 hover:bg-gb-3 hover:text-gb-0 disabled:opacity-30 transition-colors whitespace-nowrap tabular-nums"
                >
                  Repair (50 Shards)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
