import React from 'react';
import { TreePine } from 'lucide-react';
import { SectorMasteryMap } from '../../types';
import { calculateGardenRestoration } from '../../lib/loadoutChips';

interface Props {
  lifetimeShardsExtracted: number;
  sectorMastery: SectorMasteryMap;
}

export const GardenStation: React.FC<Props> = ({ lifetimeShardsExtracted, sectorMastery }) => {
  const restorationPercent = calculateGardenRestoration(lifetimeShardsExtracted, sectorMastery);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-black italic text-neon-green tracking-tight uppercase flex items-center gap-2 pr-10">
        <TreePine className="w-5 h-5 shrink-0" />
        The Green-Print
      </h3>
      <p className="text-sm text-gb-2 leading-relaxed font-sans">
        A digital-organic hybrid garden. It grows permanently with your lifetime extracted Shards and Sector Mastery—spending Shards at the Workbench never regresses restoration.
      </p>
      <div className="grid grid-cols-5 gap-2 bg-gb-0 p-4 gb-border-sm">
        {Array.from({ length: 10 }).map((_, i) => {
          const isActive = restorationPercent >= (i + 1) * 10;
          return (
            <div
              key={i}
              className={`aspect-square border flex items-center justify-center ${
                isActive ? 'border-neon-green bg-neon-green/10' : 'border-gb-3/15 opacity-25'
              }`}
            >
              <TreePine className={`w-5 h-5 ${isActive ? 'text-neon-green' : 'text-gb-3'}`} />
            </div>
          );
        })}
      </div>
      <div className="text-center space-y-1 tabular-nums">
        <div className="text-xs text-neon-green font-bold uppercase tracking-wider">
          Restoration Level: {restorationPercent}%
        </div>
        <div className="text-[11px] text-gb-2 font-mono">
          Lifetime Extracted: {lifetimeShardsExtracted} Shards
        </div>
      </div>
    </div>
  );
};
