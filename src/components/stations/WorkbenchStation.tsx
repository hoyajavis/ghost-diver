import React from 'react';
import { PlayerStats } from '../../types';
import {
  canUpgrade,
  getUpgradeCost,
  HINT_PACK_COST,
  MAX_UPGRADE_LEVELS,
} from '../../lib/dungeonLogic';
import { BrainCircuit, Cpu, Heart, Settings } from 'lucide-react';

interface Props {
  stats: PlayerStats;
  onUpgrade: (type: 'hp' | 'fp' | 'hints' | 'buy_hint') => void;
}

export const WorkbenchStation: React.FC<Props> = ({ stats, onUpgrade }) => {
  const hpCost = getUpgradeCost('hp', stats.upgrades.hp);
  const fpCost = getUpgradeCost('fp', stats.upgrades.fp);
  const hintsCost = getUpgradeCost('hints', stats.upgrades.hints);
  const hpCanUpgrade = canUpgrade('hp', stats.upgrades.hp);
  const fpCanUpgrade = canUpgrade('fp', stats.upgrades.fp);
  const hintsCanUpgrade = canUpgrade('hints', stats.upgrades.hints);

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
        maxLevel={MAX_UPGRADE_LEVELS.hp}
        cost={hpCost}
        isMaxed={!hpCanUpgrade}
        icon={<Heart className="w-4 h-4 text-neon-green" />}
        onUpgrade={() => onUpgrade('hp')}
        canAfford={hpCanUpgrade && hpCost !== null && stats.knowledge >= hpCost}
      />
      <UpgradeItem
        title="Focus Capacity"
        desc="Increases Max FP (+20)"
        level={stats.upgrades.fp}
        maxLevel={MAX_UPGRADE_LEVELS.fp}
        cost={fpCost}
        isMaxed={!fpCanUpgrade}
        icon={<BrainCircuit className="w-4 h-4 text-neon-cyan" />}
        onUpgrade={() => onUpgrade('fp')}
        canAfford={fpCanUpgrade && fpCost !== null && stats.knowledge >= fpCost}
      />
      <UpgradeItem
        title="AI Preload"
        desc="Free Tactical Hint Packs each dive"
        level={stats.upgrades.hints}
        maxLevel={MAX_UPGRADE_LEVELS.hints}
        cost={hintsCost}
        isMaxed={!hintsCanUpgrade}
        icon={<Cpu className="w-4 h-4 text-neon-magenta" />}
        onUpgrade={() => onUpgrade('hints')}
        canAfford={hintsCanUpgrade && hintsCost !== null && stats.knowledge >= hintsCost}
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
            disabled={stats.knowledge < HINT_PACK_COST}
            className={`min-h-10 px-3 py-2 text-xs font-bold gb-border-sm whitespace-nowrap transition-colors ${
              stats.knowledge >= HINT_PACK_COST
                ? 'bg-gb-3 text-gb-0 hover:bg-neon-cyan'
                : 'bg-gb-1 text-gb-2 opacity-40'
            }`}
          >
            {HINT_PACK_COST} Shards
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
  maxLevel: number;
  cost: number | null;
  isMaxed: boolean;
  icon: React.ReactNode;
  onUpgrade: () => void;
  canAfford: boolean;
}

const UpgradeItem: React.FC<UpgradeItemProps> = ({
  title,
  desc,
  level,
  maxLevel,
  cost,
  isMaxed,
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
          {title}{' '}
          <span className="text-gb-2 font-normal">
            · Lv {level}
            {level <= maxLevel ? `/${maxLevel}` : ' (MAX)'}
          </span>
        </div>
        <div className="text-xs text-gb-2 font-sans">{desc}</div>
      </div>
    </div>
    <button
      type="button"
      onClick={onUpgrade}
      disabled={isMaxed || !canAfford}
      className={`min-h-10 px-3 py-2 text-xs font-bold gb-border-sm whitespace-nowrap transition-colors ${
        isMaxed
          ? 'bg-gb-1 text-neon-green border border-neon-green/50 opacity-75 cursor-default'
          : canAfford
            ? 'bg-gb-3 text-gb-0 hover:bg-neon-cyan'
            : 'bg-gb-1 text-gb-2 opacity-40'
      }`}
    >
      {isMaxed || cost === null ? 'MAX' : `${cost} Shards`}
    </button>
  </div>
);
