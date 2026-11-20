import React from 'react';
import { TreePine } from 'lucide-react';

interface Props {
  knowledge: number;
}

export const GardenStation: React.FC<Props> = ({ knowledge }) => {
  const restorationPercent = Math.min(100, Math.floor(knowledge / 5));

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-black italic text-neon-green tracking-tight uppercase flex items-center gap-2 pr-10">
        <TreePine className="w-5 h-5 shrink-0" />
        The Green-Print
      </h3>
      <p className="text-sm text-gb-2 leading-relaxed font-sans">
        A digital-organic hybrid garden. It grows as you recover lost Knowledge Shards from the archives—a world learning to breathe again.
      </p>
      <div className="grid grid-cols-5 gap-2 bg-gb-0 p-4 gb-border-sm">
        {Array.from({ length: 10 }).map((_, i) => {
          const isActive = knowledge / 10 >= (i + 1) * 5;
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
      <div className="text-center text-xs text-neon-green font-bold uppercase tracking-wider tabular-nums">
        Restoration Level: {restorationPercent}%
      </div>
    </div>
  );
};
