import React from 'react';
import { LORE_ENTRIES } from '../../lib/lore';
import { Terminal } from 'lucide-react';

interface Props {
  unlockedLore: string[];
}

export const ArchivistStation: React.FC<Props> = ({ unlockedLore }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-black italic text-gb-3 tracking-tight uppercase flex items-center gap-2 pr-10">
        <Terminal className="w-5 h-5 shrink-0" />
        Archivist Logs
      </h3>
      <div className="bg-gb-0 border border-gb-3 p-4 text-sm leading-relaxed h-72 overflow-y-auto custom-scrollbar space-y-5 font-sans">
        {LORE_ENTRIES.map((entry) => {
          const isUnlocked = unlockedLore.includes(entry.id);
          if (!isUnlocked) {
            return (
              <div key={entry.id} className="opacity-45 pb-4 border-b border-gb-3/20 last:border-b-0">
                <p className="text-xs font-mono text-gb-3 mb-1 font-bold">[{entry.id}] Encrypted Data</p>
                <p className="text-xs text-gb-2 italic">
                  Recover green Data Logs in the datascape to decrypt this entry.
                </p>
              </div>
            );
          }

          return (
            <article key={entry.id} className="pb-4 border-b border-gb-3/25 last:border-b-0">
              <div className="flex flex-wrap justify-between items-baseline gap-2 mb-1">
                <h4 className="text-sm font-mono text-neon-cyan font-bold">
                  {entry.id}: {entry.title}
                </h4>
                <span className="text-xs font-mono text-gb-3/80 tabular-nums">{entry.timestamp}</span>
              </div>
              <p className="text-xs font-mono text-neon-magenta mb-2">Author: {entry.author}</p>
              <p className="text-sm text-gb-2 italic leading-relaxed">&ldquo;{entry.content}&rdquo;</p>
            </article>
          );
        })}
      </div>
    </div>
  );
};
