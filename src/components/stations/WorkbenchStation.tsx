import React from 'react';
import { PlayerStats } from '../../types';
import { BrainCircuit, Cpu, Heart, Settings } from 'lucide-react';

interface Props {
  stats: PlayerStats;
  onUpgrade: (type: 'hp' | 'fp' | 'hints' | 'buy_hint') => void;
}

export const WorkbenchStation: React.FC<Props> = ({ stats, onUpgrade }) => {
  return (
    <div className="space-y-3 tabular-nums">
      <h3 className="text-xl font-black italic text-neon-magenta tracking-tight uppercase flex items-center gap-2 pr-10">
        <Settings className="w-5 h-5 shrink-0" />
        Workbench
      </h3>
      <UpgradeItem
        title="Neural Integrity"
        desc="Increases Max HP (+20)"
        level={stats.upgrades.hp}
        cost={(stats.upgrades.hp + 1) * 100}
        icon={<Heart className="w-4 h-4 text-neon-green" />}
        onUpgrade={() => onUpgrade('hp')}
        canAfford={stats.knowledge >= (stats.upgrades.hp + 1) * 100}
      />
      <UpgradeItem
        title="Focus Capacity"
        desc="Increases Max FP (+20)"
        level={stats.upgrades.fp}
        cost={(stats.upgrades.fp + 1) * 100}
        icon={<BrainCircuit className="w-4 h-4 text-neon-cyan" />}
        onUpgrade={() => onUpgrade('fp')}
        canAfford={stats.knowledge >= (stats.upgrades.fp + 1) * 100}
      />
      <UpgradeItem
        title="AI Preload"
        desc="Free Tactical Hint Packs each dive"
        level={stats.upgrades.hints}
        cost={(stats.upgrades.hints + 1) * 100}
        icon={<Cpu className="w-4 h-4 text-neon-magenta" />}
        onUpgrade={() => onUpgrade('hints')}
        canAfford={stats.knowledge >= (stats.upgrades.hints + 1) * 100}
      />

      <div className="pt-3 border-t border-gb-3 border-dashed space-y-2">
        <h4 className="text-xs font-bold text-gb-3 uppercase tracking-wider">Consumables</h4>
        <div className="bg-gb-0 border border-gb-3 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 border border-gb-3 flex items-center justify-center bg-gb-1 shrink-0">
              <Cpu className="w-4 h-4 text-neon-cyan" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-gb-3">
                Hint Pack <span className="text-gb-2 font-normal">· Owned: {stats.hintPacks}</span>
              </div>
              <div className="text-xs text-gb-2 font-sans">Reveals step clue &amp; shields next hit</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onUpgrade('buy_hint')}
            disabled={stats.knowledge < 50}
            className={`min-h-10 px-3 py-2 text-xs font-bold gb-border-sm whitespace-nowrap transition-colors ${
              stats.knowledge >= 50 ? 'bg-gb-3 text-gb-0 hover:bg-neon-cyan' : 'bg-gb-1 text-gb-2 opacity-40'
            }`}
          >
            50 Shards
          </button>
        </div>
      </div>
    </div>
  );
};

interface UpgradeItemProps {
  title: string;
  desc: string;
  level: number;
  cost: number;
  icon: React.ReactNode;
  onUpgrade: () => void;
  canAfford: boolean;
}

const UpgradeItem: React.FC<UpgradeItemProps> = ({
  title,
  desc,
  level,
  cost,
  icon,
  onUpgrade,
  canAfford,
}) => (
  <div className="bg-gb-0 border border-gb-3 p-3 flex items-center justify-between gap-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 border border-gb-3 flex items-center justify-center bg-gb-1 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold text-gb-3">
          {title} <span className="text-gb-2 font-normal">· Lv {level}</span>
        </div>
        <div className="text-xs text-gb-2 font-sans">{desc}</div>
      </div>
    </div>
    <button
      type="button"
      onClick={onUpgrade}
      disabled={!canAfford}
      className={`min-h-10 px-3 py-2 text-xs font-bold gb-border-sm whitespace-nowrap transition-colors ${
        canAfford ? 'bg-gb-3 text-gb-0 hover:bg-neon-cyan' : 'bg-gb-1 text-gb-2 opacity-40'
      }`}
    >
      {cost} Shards
    </button>
  </div>
);
