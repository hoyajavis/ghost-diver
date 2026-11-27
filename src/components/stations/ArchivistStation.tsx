import React, { useState, useEffect } from 'react';
import { SectorMasteryMap } from '../../types';
import { ENEMY_TIERS } from '../../lib/enemyData';
import { getTierForFloor, MAX_TIER } from '../../lib/dungeonLogic';
import { LORE_ENTRIES } from '../../lib/lore';
import { BarChart3, Terminal } from 'lucide-react';
import { CrewResidentStatus } from '../../lib/cradleUnlocks';
import { CrewResidentBanner } from './CrewResidentBanner';

interface Props {
  unlockedLore: string[];
  sectorMastery: SectorMasteryMap;
  maxExtractedFloor: number;
  initialTab?: 'MASTERY' | 'LOGS';
  resident?: CrewResidentStatus | null;
}

export const ArchivistStation: React.FC<Props> = ({
  unlockedLore,
  sectorMastery,
  maxExtractedFloor,
  initialTab = 'LOGS',
  resident,
}) => {
  const [activeTab, setActiveTab] = useState<'MASTERY' | 'LOGS'>(initialTab);
  const [showAllSectors, setShowAllSectors] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const reachedMaxTier = getTierForFloor(maxExtractedFloor);
  const visibleTierCount = showAllSectors ? MAX_TIER : reachedMaxTier;

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-black italic text-gb-3 tracking-tight uppercase flex items-center gap-2 pr-10">
        <Terminal className="w-5 h-5 shrink-0" />
        Archivist Terminal
      </h3>
      {resident && <CrewResidentBanner resident={resident} />}

      {/* 2-Tab Switcher */}
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Archivist views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'MASTERY'}
          onClick={() => setActiveTab('MASTERY')}
          className={`min-h-10 px-3 py-1.5 border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'MASTERY'
              ? 'bg-neon-cyan/15 border-neon-cyan text-neon-cyan'
              : 'bg-gb-0 border-gb-3/50 text-gb-2 hover:border-gb-3'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 shrink-0" />
          Sector Mastery
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'LOGS'}
          onClick={() => setActiveTab('LOGS')}
          className={`min-h-10 px-3 py-1.5 border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'LOGS'
              ? 'bg-neon-cyan/15 border-neon-cyan text-neon-cyan'
              : 'bg-gb-0 border-gb-3/50 text-gb-2 hover:border-gb-3'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 shrink-0" />
          Data Logs ({unlockedLore.length}/{LORE_ENTRIES.length})
        </button>
      </div>

      {activeTab === 'MASTERY' ? (
        <div className="bg-gb-0 border border-gb-3 p-3.5 h-72 overflow-y-auto custom-scrollbar space-y-2.5 tabular-nums">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-gb-3/25 text-[11px]">
            <span className="text-gb-2 font-sans">
              <span className="text-neon-cyan font-bold">Attacks</span> (Speed) vs.{' '}
              <span className="text-purple-300 font-bold">Logic Checks</span> (Strategy)
            </span>
            {reachedMaxTier < MAX_TIER && (
              <button
                type="button"
                onClick={() => setShowAllSectors((prev) => !prev)}
                className="text-[10px] font-mono font-bold uppercase text-neon-cyan hover:underline shrink-0"
              >
                {showAllSectors ? `Reached (1–${reachedMaxTier})` : `All (1–${MAX_TIER})`}
              </button>
            )}
          </div>

          {Array.from({ length: visibleTierCount }, (_, idx) => idx + 1).map((tier) => {
            const entry = sectorMastery[tier] ?? { proceduralCorrect: 0, conceptualCorrect: 0 };
            const total = entry.proceduralCorrect + entry.conceptualCorrect;
            const procPct = total > 0 ? Math.round((entry.proceduralCorrect / total) * 100) : 0;
            const concPct = total > 0 ? 100 - procPct : 0;
            const rawSectorName = ENEMY_TIERS[tier]?.name ?? `SECTOR_${tier}`;
            const sectorName = rawSectorName
              .toLowerCase()
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (ch) => ch.toUpperCase());

            return (
              <div
                key={tier}
                className="p-2.5 bg-gb-1/60 border border-gb-3/35 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-gb-3 truncate">
                    Sector {tier} · <span className="text-gb-2">{sectorName}</span>
                  </span>
                  <span className="text-[11px] font-mono text-gb-2 shrink-0">
                    {total} solves
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neon-cyan">Attacks: {entry.proceduralCorrect}</span>
                  <span className="text-purple-300">Logic Checks: {entry.conceptualCorrect}</span>
                </div>

                <div
                  className="h-1.5 w-full bg-gb-0 border border-gb-3/30 flex overflow-hidden"
                  aria-label={`Sector ${tier} mastery: ${entry.proceduralCorrect} procedural, ${entry.conceptualCorrect} conceptual`}
                >
                  {total > 0 && (
                    <>
                      <div
                        className="h-full bg-neon-cyan transition-all"
                        style={{ width: `${procPct}%` }}
                      />
                      <div
                        className="h-full bg-purple-400 transition-all"
                        style={{ width: `${concPct}%` }}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
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
      )}
    </div>
  );
};
