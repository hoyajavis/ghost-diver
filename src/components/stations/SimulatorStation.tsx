import React from 'react';
import { PlayerStats } from '../../types';
import { ENEMY_TIERS } from '../../lib/enemyData';
import { BrainCircuit, Lock, Play, Unlock } from 'lucide-react';

interface Props {
  stats: PlayerStats;
  onUnlockDemo: (variantId: string) => void;
  onRunSim: (variantId: string) => void;
}

export const SimulatorStation: React.FC<Props> = ({ stats, onUnlockDemo, onRunSim }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-black italic text-purple-400 tracking-tight uppercase flex items-center gap-2 pr-10">
        <BrainCircuit className="w-5 h-5 shrink-0" />
        Combat Simulator
      </h3>
      <div className="bg-gb-0 border border-gb-3 p-3 text-xs leading-relaxed h-72 overflow-y-auto custom-scrollbar space-y-3">
        <p className="text-gb-2 italic font-sans text-sm mb-2">
          Practice guided step-by-step Sentinel patterns safely. Unlocking a simulation costs 100 Knowledge Shards.
        </p>

        {Object.entries(ENEMY_TIERS).flatMap(([tierStr, tierData]) =>
          Object.keys(tierData.variants).map((variantStr) => {
            const tier = parseInt(tierStr, 10);
            const variant = parseInt(variantStr, 10);
            const variantId = `${tier}-${variant}`;
            const isEncountered = stats.encounteredTiers.includes(variantId);
            const isUnlocked = stats.unlockedDemos.includes(variantId);

            const variantData = tierData.variants[variant];
            const variantFullName = variantData?.fullName || `Tier ${tier} Variant ${variant}`;

            if (!isEncountered) {
              return (
                <div
                  key={variantId}
                  className="border border-gb-3/30 p-3 opacity-55 bg-gb-1/50 flex items-center gap-3"
                >
                  <div className="w-9 h-9 flex items-center justify-center border border-gb-3/30 shrink-0">
                    <Lock className="w-4 h-4 text-gb-3" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-gb-3 font-bold">
                      Unknown Sentinel · T{tier} V{variant}
                    </div>
                    <div className="text-xs text-gb-2 font-sans">Encounter in the datascape to identify</div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={variantId}
                className={`border p-3 flex items-center justify-between gap-3 transition-colors ${
                  isUnlocked ? 'border-purple-400 bg-purple-500/10' : 'border-gb-3 bg-gb-1/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 flex items-center justify-center border shrink-0 ${
                      isUnlocked ? 'border-purple-400 text-purple-400' : 'border-gb-3 text-gb-3'
                    }`}
                  >
                    {isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-bold truncate ${isUnlocked ? 'text-purple-300' : 'text-gb-3'}`}>
                      Sector {tier} · V{variant}
                    </div>
                    <div className="text-xs text-gb-2 truncate">{variantFullName}</div>
                  </div>
                </div>

                {isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => onRunSim(variantId)}
                    className="min-h-10 px-3 py-2 text-xs font-bold uppercase bg-purple-500 text-gb-0 hover:bg-neon-cyan transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" /> Practice
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUnlockDemo(variantId)}
                    disabled={stats.knowledge < 100}
                    className={`min-h-10 px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      stats.knowledge >= 100 ? 'bg-gb-3 text-gb-0 hover:bg-neon-cyan' : 'bg-gb-1 text-gb-2 opacity-40'
                    }`}
                  >
                    Unlock (100)
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
