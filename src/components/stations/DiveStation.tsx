import React from 'react';
import { NeuralChipId, PlayerStats } from '../../types';
import { clampFloor, getDiveCost, MAX_FLOOR, MAX_TIER } from '../../lib/dungeonLogic';
import { MAX_EQUIPPED_CHIPS, NEURAL_CHIP_MAP, NEURAL_CHIPS } from '../../lib/loadoutChips';
import { getScarName } from '../../lib/scarData';
import { getReconBuffOption } from '../../lib/signalSweepLogic';
import { Activity, ChevronLeft, ChevronRight, Cpu, Database, Lock, Sparkles } from 'lucide-react';

interface Props {
  stats: PlayerStats;
  selectedFloor: number;
  setSelectedFloor: React.Dispatch<React.SetStateAction<number>>;
  onStartDive: (startFloor?: number) => void;
  onHealScar: (scar: string) => void;
  onCalibrateScar: (scar: string) => void;
  onToggleEquipChip: (chipId: NeuralChipId) => void;
}

export const DiveStation: React.FC<Props> = ({
  stats,
  selectedFloor,
  setSelectedFloor,
  onStartDive,
  onHealScar,
  onCalibrateScar,
  onToggleEquipChip,
}) => {
  const maxUnlocked = clampFloor(stats.maxExtractedFloor);
  const clampedFloor = Math.max(1, Math.min(maxUnlocked, selectedFloor));
  const diveCost = getDiveCost(clampedFloor);
  const canAffordDive = stats.knowledge >= diveCost;
  const armedReconBuff = getReconBuffOption(stats.activeReconBuff);
  const slotsFull = stats.equippedChips.length >= MAX_EQUIPPED_CHIPS;

  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-xl font-black italic text-neon-cyan tracking-tight uppercase flex items-center gap-2 pr-10">
        <Activity className="w-5 h-5 shrink-0" />
        Neural Chair
      </h3>

      <div className="bg-gb-0 border border-gb-3 p-3 sm:p-4 flex flex-col items-center gap-2.5 sm:gap-3.5 gb-border-sm tabular-nums">
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
            <div className="text-2xl sm:text-3xl font-black italic">Floor {clampedFloor}</div>
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

        {armedReconBuff ? (
          <div className="w-full border border-neon-cyan bg-neon-cyan/10 p-2 flex items-start gap-2 text-left">
            <Sparkles className="w-4 h-4 text-neon-cyan shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-black uppercase text-neon-cyan">
                Armed Recon Buff: {armedReconBuff.name}
              </div>
              <div className="text-[11px] text-gb-2 font-sans">
                {armedReconBuff.description}
              </div>
            </div>
          </div>
        ) : stats.reconRewardAvailable ? (
          <div className="w-full text-[11px] text-gb-2 font-sans text-center">
            Tip: Run <strong className="text-neon-cyan font-mono">Signal Sweep</strong> in the Combat Simulator to arm a free Recon Buff before diving.
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => onStartDive(clampedFloor)}
          disabled={!canAffordDive}
          className="w-full min-h-11 py-2.5 sm:py-3 px-4 bg-gb-3 text-gb-0 font-black italic uppercase tracking-wider hover:bg-neon-cyan transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gb-3 text-sm"
        >
          {canAffordDive ? 'Start Dive' : `Need ${diveCost} Shards`}
        </button>
      </div>

      {/* Neural Loadout Chip Picker (2 Slots) */}
      <div className="bg-gb-0 border border-gb-3 p-3 gb-border-sm space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 shrink-0" />
            Neural Loadout ({stats.equippedChips.length}/{MAX_EQUIPPED_CHIPS})
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono">
            {Array.from({ length: MAX_EQUIPPED_CHIPS }).map((_, idx) => {
              const chipId = stats.equippedChips[idx];
              return (
                <span
                  key={idx}
                  className={`px-1.5 py-0.5 border uppercase font-bold ${
                    chipId
                      ? 'border-neon-cyan bg-neon-cyan/15 text-neon-cyan'
                      : 'border-gb-3/30 text-gb-2/60'
                  }`}
                >
                  {chipId ? NEURAL_CHIP_MAP[chipId].shortLabel : `Slot ${idx + 1}`}
                </span>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          {NEURAL_CHIPS.map((chip) => {
            const isUnlocked = stats.unlockedChips.includes(chip.id);
            const isEquipped = stats.equippedChips.includes(chip.id);
            const isDisabled = !isUnlocked || (!isEquipped && slotsFull);

            if (!isUnlocked) {
              return (
                <div
                  key={chip.id}
                  className="p-2 border border-gb-3/25 bg-gb-1/40 opacity-60 flex items-start gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-gb-2 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gb-2">{chip.name}</div>
                    <div className="text-[11px] text-gb-2/80 font-sans leading-snug">
                      Unlock: {chip.unlockHint}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => onToggleEquipChip(chip.id)}
                disabled={isDisabled}
                aria-pressed={isEquipped}
                className={`w-full p-2 border text-left transition-colors flex items-start justify-between gap-2 ${
                  isEquipped
                    ? 'border-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/15'
                    : slotsFull
                      ? 'border-gb-3/30 bg-gb-1/40 opacity-50 cursor-not-allowed'
                      : 'border-gb-3/60 bg-gb-1/60 hover:border-neon-cyan'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gb-3">{chip.name}</div>
                  <div className="text-[11px] text-gb-2 font-sans leading-snug">{chip.summary}</div>
                </div>
                <span
                  className={`shrink-0 px-1.5 py-0.5 text-[10px] font-black uppercase border ${
                    isEquipped
                      ? 'border-neon-cyan text-neon-cyan bg-gb-0'
                      : 'border-gb-3/40 text-gb-2'
                  }`}
                >
                  {isEquipped ? 'Equipped' : 'Equip'}
                </span>
              </button>
            );
          })}
        </div>
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
