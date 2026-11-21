import React, { useState } from 'react';
import { ConceptualArchetype, PlayerStats } from '../../types';
import { ENEMY_TIERS } from '../../lib/enemyData';
import {
  ARCHETYPE_LABELS,
  getReachedTiers,
  getReconBuffOption,
  SIGNAL_SWEEP_NODE_COUNT,
} from '../../lib/signalSweepLogic';
import { BrainCircuit, Clock, Lock, Play, Radio, Sparkles, Unlock } from 'lucide-react';

interface Props {
  stats: PlayerStats;
  onUnlockDemo: (variantId: string) => void;
  onRunSim: (variantId: string) => void;
  onLaunchSignalSweep: (options: { timed: boolean }) => void;
}

export const SimulatorStation: React.FC<Props> = ({
  stats,
  onUnlockDemo,
  onRunSim,
  onLaunchSignalSweep,
}) => {
  const [activeTab, setActiveTab] = useState<'SWEEP' | 'SENTINEL'>('SWEEP');
  const [timed, setTimed] = useState<boolean>(true);

  const reachedTiers = getReachedTiers(stats);
  const maxTier = reachedTiers[reachedTiers.length - 1] ?? 1;
  const armedReconBuff = getReconBuffOption(stats.activeReconBuff);
  const showRewardDot = stats.reconRewardAvailable && !stats.activeReconBuff;

  const lifetimeArchetypes = (
    Object.entries(stats.archetypeStats) as Array<
      [ConceptualArchetype, { attempts: number; correct: number } | undefined]
    >
  ).filter((entry): entry is [ConceptualArchetype, { attempts: number; correct: number }] =>
    Boolean(entry[1] && entry[1].attempts > 0)
  );

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-black italic text-purple-400 tracking-tight uppercase flex items-center gap-2 pr-10">
        <BrainCircuit className="w-5 h-5 shrink-0" />
        Combat Simulator
      </h3>

      {/* Two-Tab Navigation */}
      <div className="grid grid-cols-2 gap-1.5" role="tablist" aria-label="Simulator modes">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'SWEEP'}
          onClick={() => setActiveTab('SWEEP')}
          className={`min-h-10 px-2.5 py-2 text-xs font-black uppercase tracking-wider border transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'SWEEP'
              ? 'border-neon-cyan bg-neon-cyan/15 text-neon-cyan'
              : 'border-gb-3/50 bg-gb-0 text-gb-2 hover:text-gb-3 hover:border-gb-3'
          }`}
        >
          <Radio className="w-3.5 h-3.5 shrink-0" />
          <span>Signal Sweep</span>
          {showRewardDot && (
            <span
              aria-label="Recon reward available"
              className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse shrink-0"
            />
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'SENTINEL'}
          onClick={() => setActiveTab('SENTINEL')}
          className={`min-h-10 px-2.5 py-2 text-xs font-black uppercase tracking-wider border transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'SENTINEL'
              ? 'border-purple-400 bg-purple-500/15 text-purple-300'
              : 'border-gb-3/50 bg-gb-0 text-gb-2 hover:text-gb-3 hover:border-gb-3'
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5 shrink-0" />
          <span>Sentinel Practice</span>
        </button>
      </div>

      {activeTab === 'SWEEP' ? (
        <div
          role="tabpanel"
          className="bg-gb-0 border border-neon-cyan/60 p-3 text-xs leading-relaxed space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-gb-2 font-sans text-xs sm:text-sm leading-snug">
              Rapid <strong className="text-gb-3 font-mono">{SIGNAL_SWEEP_NODE_COUNT}-node</strong> conceptual sprint across your reached sectors. Score <strong className="text-neon-cyan font-mono">≥70%</strong> to arm a Recon Buff for your next dive.
            </p>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-gb-1 border border-neon-cyan/50 text-neon-cyan whitespace-nowrap shrink-0 tabular-nums">
              Tiers 1–{maxTier}
            </span>
          </div>

          {/* Timer Mode Toggle */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neon-cyan" />
              Sprint Mode
            </div>
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Signal Sweep timer mode">
              <button
                type="button"
                aria-pressed={timed}
                onClick={() => setTimed(true)}
                className={`min-h-10 px-2.5 py-1.5 border text-left transition-colors ${
                  timed
                    ? 'border-neon-cyan bg-neon-cyan/15 text-neon-cyan'
                    : 'border-gb-3/40 bg-gb-1/60 text-gb-2 hover:text-gb-3'
                }`}
              >
                <div className="text-xs font-bold uppercase">Arcade Timer</div>
                <div className="text-[10px] font-sans opacity-80">Live stopwatch</div>
              </button>
              <button
                type="button"
                aria-pressed={!timed}
                onClick={() => setTimed(false)}
                className={`min-h-10 px-2.5 py-1.5 border text-left transition-colors ${
                  !timed
                    ? 'border-neon-cyan bg-neon-cyan/15 text-neon-cyan'
                    : 'border-gb-3/40 bg-gb-1/60 text-gb-2 hover:text-gb-3'
                }`}
              >
                <div className="text-xs font-bold uppercase">Relaxed Focus</div>
                <div className="text-[10px] font-sans opacity-80">Untimed calm sprint</div>
              </button>
            </div>
          </div>

          {/* Recon Buff Status Strip */}
          {armedReconBuff ? (
            <div className="border border-neon-green bg-neon-green/10 p-2.5 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-neon-green shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-xs font-black uppercase text-neon-green">
                  Armed: {armedReconBuff.name}
                </div>
                <div className="text-[11px] text-gb-2 font-sans">
                  {armedReconBuff.description}
                </div>
              </div>
            </div>
          ) : stats.reconRewardAvailable ? (
            <div className="border border-neon-cyan/50 bg-neon-cyan/10 p-2.5 flex items-center gap-2 text-neon-cyan">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold">
                Recon Buff Ready · 1 rewarded buff per completed dive
              </span>
            </div>
          ) : (
            <div className="border border-amber-400/40 bg-gb-1/70 p-2.5 text-[11px] text-amber-300 font-sans">
              Recon Buff already claimed this dive cycle — extract from a dive to recharge. Unlimited practice remains open!
            </div>
          )}

          {/* Optional Compact Lifetime Archetype Accuracy Summary */}
          {lifetimeArchetypes.length > 0 && (
            <div className="border border-gb-3/40 bg-gb-1/60 p-2 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gb-2">
                Lifetime Recon Accuracy
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] tabular-nums">
                {lifetimeArchetypes.map(([archetype, stat]) => {
                  const pct = Math.round((stat.correct / stat.attempts) * 100);
                  return (
                    <div
                      key={archetype}
                      className="flex items-center justify-between gap-1 px-1.5 py-0.5 bg-gb-0/80 border border-gb-3/25"
                    >
                      <span className="text-gb-2 truncate">{ARCHETYPE_LABELS[archetype]}</span>
                      <span className="font-bold text-gb-3 shrink-0">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => onLaunchSignalSweep({ timed })}
            className="w-full min-h-11 py-2.5 px-4 bg-neon-cyan text-gb-0 hover:bg-gb-3 font-black italic uppercase tracking-wider transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Radio className="w-4 h-4 shrink-0" />
            Start 10-Node Signal Sweep
          </button>
        </div>
      ) : (
        <div
          role="tabpanel"
          className="bg-gb-0 border border-gb-3 p-3 text-xs leading-relaxed h-72 overflow-y-auto custom-scrollbar space-y-3"
        >
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
      )}
    </div>
  );
};
