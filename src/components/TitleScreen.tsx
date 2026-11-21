import React, { useEffect, useState } from 'react';
import { AnonymizedCacheProfile, SaveSlot } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal,
  Database,
  Cpu,
  Skull,
  Trash2,
  Info,
  X,
  AlertTriangle,
  ShieldCheck,
  Download,
  RefreshCw,
} from 'lucide-react';

interface Props {
  slots: SaveSlot[];
  cacheProfile: AnonymizedCacheProfile;
  onSelectSlot: (id: number) => void;
  onDeleteSlot: (id: number) => void;
  onRotateAnonymousId: () => void;
  onClearAllCache: () => void;
  onExportCache: () => string;
}

export const TitleScreen: React.FC<Props> = ({
  slots,
  cacheProfile,
  onSelectSlot,
  onDeleteSlot,
  onRotateAnonymousId,
  onClearAllCache,
  onExportCache,
}) => {
  const [showConcept, setShowConcept] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [pendingDeleteSlotId, setPendingDeleteSlotId] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingDeleteSlotId !== null) {
          setPendingDeleteSlotId(null);
        } else if (confirmClearAll) {
          setConfirmClearAll(false);
        } else if (showPrivacyModal) {
          setShowPrivacyModal(false);
        } else if (showConcept) {
          setShowConcept(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingDeleteSlotId, confirmClearAll, showPrivacyModal, showConcept]);

  const handleDownloadExport = () => {
    const json = onExportCache();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ghost-diver-anonymized-cache.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full bg-gb-0 text-gb-3 p-3 sm:p-4 md:p-8 scanlines relative overflow-y-auto custom-scrollbar terminal-text wireframe-bg flex items-center justify-center">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-8 items-center z-10 my-auto">
        {/* Title & Briefing Summary */}
        <motion.div
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lg:col-span-6 text-center lg:text-left space-y-1.5 lg:space-y-4"
        >
          <p className="text-[11px] lg:text-xs font-bold uppercase tracking-[0.2em] lg:tracking-[0.25em] text-gb-2">
            Ghost Diver Protocol
          </p>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic tracking-tight text-neon-cyan drop-shadow-[4px_4px_0px_#000] leading-none text-balance">
            The Extraction Academy
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gb-3/90 max-w-lg mx-auto lg:mx-0 font-sans leading-snug lg:leading-relaxed">
            Dive into the archive strata, break Sentinel shields with math, and extract Knowledge Shards before your neural integrity fails.
          </p>
          <div className="pt-1 lg:pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2 lg:gap-3">
            <button
              type="button"
              onClick={() => setShowConcept(true)}
              className="min-h-9 lg:min-h-11 px-3 lg:px-4 py-1.5 lg:py-2 border-2 border-neon-cyan bg-gb-0 text-neon-cyan hover:bg-neon-cyan hover:text-gb-0 transition-colors flex items-center gap-1.5 lg:gap-2 text-[11px] lg:text-xs font-bold uppercase tracking-wider gb-border-sm whitespace-nowrap"
            >
              <Info className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
              <span className="sm:hidden">Briefing</span>
              <span className="hidden sm:inline">Mission Briefing</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmClearAll(false);
                setShowPrivacyModal(true);
              }}
              className="min-h-9 lg:min-h-11 px-3 lg:px-4 py-1.5 lg:py-2 border-2 border-gb-3 bg-gb-0 text-gb-3 hover:border-neon-green hover:text-neon-green transition-colors flex items-center gap-1.5 lg:gap-2 text-[11px] lg:text-xs font-bold uppercase tracking-wider gb-border-sm whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
              <span className="sm:hidden">Cache &amp; Privacy</span>
              <span className="hidden sm:inline">Local Cache &amp; Privacy</span>
            </button>
          </div>
        </motion.div>

        {/* Save Slot Terminal */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto lg:max-w-none">
          <div className="bg-gb-1 border-2 border-gb-3 p-3 lg:p-5 gb-border dither relative">
            <div className="flex justify-between items-center mb-2.5 pb-2 lg:mb-4 lg:pb-3 border-b border-gb-3">
              <span className="text-xs font-bold text-gb-3 uppercase tracking-wider">
                Select Save Slot
              </span>
              <span className="text-xs text-gb-2 tabular-nums">3 Slots Available</span>
            </div>

            <div className="space-y-2 lg:space-y-3">
              {slots.map((slot) => (
                <div key={slot.id} className="flex items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectSlot(slot.id)}
                    className={`flex-1 min-h-[54px] lg:min-h-[72px] p-2 lg:p-3 border-2 transition-all flex flex-col items-start justify-center gap-1 lg:gap-1.5 gb-border-sm text-left ${
                      slot.stats
                        ? 'bg-gb-0 border-gb-3 hover:border-neon-cyan'
                        : 'bg-gb-1 border-gb-2 border-dashed hover:border-gb-3'
                    }`}
                  >
                    <div className="flex justify-between w-full items-center gap-2">
                      <span className="text-sm font-black italic text-gb-3 uppercase">
                        Slot 0{slot.id}
                      </span>
                      {slot.stats && (
                        <span className="text-xs text-neon-cyan font-bold uppercase tabular-nums">
                          Max Floor {slot.stats.maxExtractedFloor}
                        </span>
                      )}
                    </div>

                    {slot.stats ? (
                      <div className="flex flex-wrap gap-4 text-xs font-bold tabular-nums">
                        <div className="flex items-center gap-1.5" title="Knowledge Shards">
                          <Database className="w-3.5 h-3.5 text-neon-green" />
                          <span>{slot.stats.knowledge}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Hint Packs">
                          <Cpu className="w-3.5 h-3.5 text-neon-cyan" />
                          <span>{slot.stats.hintPacks}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Neural Scars">
                          <Skull className="w-3.5 h-3.5 text-neon-magenta" />
                          <span>{slot.stats.neuralScars.length}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gb-2 italic">
                        Empty slot — Start new run
                      </div>
                    )}
                  </button>

                  {slot.stats && (
                    <button
                      type="button"
                      onClick={() => setPendingDeleteSlotId(slot.id)}
                      className="min-w-10 min-h-10 lg:min-w-11 lg:min-h-11 px-2.5 lg:px-3 border-2 border-gb-3 bg-gb-0 text-gb-2 hover:border-neon-magenta hover:text-neon-magenta transition-colors flex items-center justify-center gb-border-sm"
                      aria-label={`Delete save slot ${slot.id}`}
                      title={`Delete save slot ${slot.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-2.5 lg:mt-5 text-[11px] lg:text-xs text-gb-2 text-center leading-snug">
              Choose a profile slot to enter the Cradle Bunker.
            </div>
          </div>
        </div>
      </div>

      {/* Delete Save Confirmation Modal */}
      <AnimatePresence>
        {pendingDeleteSlotId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-slot-title"
            className="fixed inset-0 z-[100] bg-gb-0/95 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="max-w-sm w-full bg-gb-1 border-2 border-neon-magenta p-6 gb-border dither relative">
              <div className="flex items-center gap-2 text-neon-magenta mb-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h2 id="delete-slot-title" className="text-lg font-black italic uppercase tracking-tight">
                  Delete Save Slot 0{pendingDeleteSlotId}?
                </h2>
              </div>
              <p className="text-sm text-gb-3 font-sans leading-relaxed mb-6">
                This will permanently erase all Shards, upgrades, lore logs, and unlocked simulations in Slot 0{pendingDeleteSlotId}. This action cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPendingDeleteSlotId(null)}
                  className="min-h-11 py-2 px-4 bg-gb-0 border-2 border-gb-3 text-gb-3 hover:bg-gb-3 hover:text-gb-0 text-xs font-bold uppercase tracking-wider transition-colors gb-border-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSlot(pendingDeleteSlotId);
                    setPendingDeleteSlotId(null);
                  }}
                  className="min-h-11 py-2 px-4 bg-neon-magenta border-2 border-neon-magenta text-gb-0 hover:bg-gb-3 hover:border-gb-3 text-xs font-black uppercase tracking-wider transition-colors gb-border-sm"
                >
                  Delete Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Concept Briefing Overlay */}
      <AnimatePresence>
        {showConcept && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mission-briefing-title"
            className="fixed inset-0 z-[100] bg-gb-0/95 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full bg-gb-1 border-2 border-gb-3 p-6 gb-border dither relative">
              <button
                type="button"
                onClick={() => setShowConcept(false)}
                aria-label="Close mission briefing"
                className="absolute top-3 right-3 min-h-10 min-w-10 flex items-center justify-center text-gb-3 hover:text-neon-magenta transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2
                id="mission-briefing-title"
                className="text-xl font-black italic mb-4 text-neon-cyan tracking-tight uppercase flex items-center gap-2 pr-10"
              >
                <Terminal className="w-5 h-5 shrink-0" />
                Mission Briefing
              </h2>

              <div className="space-y-3 text-sm text-gb-3 font-sans leading-relaxed">
                <p>
                  You are a <span className="text-neon-cyan font-bold">Ghost Diver</span>, a neural specialist infiltrating the deep-web archives of the <span className="text-neon-magenta font-bold">Archivist</span>.
                </p>
                <p>
                  Extract <span className="text-neon-green font-bold">Knowledge Shards</span> protected by <span className="text-neon-magenta font-bold">Sentinels</span>—security programs that challenge your mathematical reasoning.
                </p>
                <p>
                  Every dive carries risk. Running out of integrity can inflict <span className="text-neon-magenta font-bold">Neural Scars</span>—persistent glitches until repaired at the bunker.
                </p>
                <p>
                  Reach each fifth-floor Secure Node to bank your Shards, unlock Training Simulations, and upgrade your frame.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowConcept(false)}
                className="mt-6 w-full min-h-11 py-3 px-4 bg-gb-3 text-gb-0 font-black italic uppercase tracking-wider gb-border hover:bg-neon-cyan transition-colors text-sm"
              >
                Close Briefing
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Local Cache & Privacy Modal */}
      <AnimatePresence>
        {showPrivacyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-cache-title"
            className="fixed inset-0 z-[100] bg-gb-0/95 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full bg-gb-1 border-2 border-gb-3 p-6 gb-border dither relative max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setConfirmClearAll(false);
                  setShowPrivacyModal(false);
                }}
                aria-label="Close local cache and privacy modal"
                className="absolute top-3 right-3 min-h-10 min-w-10 flex items-center justify-center text-gb-3 hover:text-neon-magenta transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2
                id="privacy-cache-title"
                className="text-xl font-black italic mb-3 text-neon-green tracking-tight uppercase flex items-center gap-2 pr-10"
              >
                <ShieldCheck className="w-5 h-5 shrink-0" />
                Local Cache &amp; Privacy
              </h2>

              <p className="text-xs text-gb-3 font-sans leading-relaxed mb-4">
                All progress and aggregate stats are stored <span className="text-neon-green font-bold">strictly in this browser&apos;s local cache</span> under a random pseudonymous ID. No personal data, accounts, cookies, or server uploads are used.
              </p>

              <div className="bg-gb-0 border border-gb-3 p-3 mb-4 space-y-2 text-xs">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gb-2 uppercase">Anonymous ID</span>
                  <span className="font-mono font-bold text-neon-cyan">{cacheProfile.anonymousId}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gb-2 uppercase">Storage Engine</span>
                  <span className="font-mono font-bold text-gb-3">
                    {cacheProfile.storageMode === 'localStorage' ? 'Browser localStorage' : 'Memory Fallback'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-5 text-xs tabular-nums">
                <div className="bg-gb-0 border border-gb-2/60 p-2.5">
                  <div className="text-gb-2 uppercase text-[10px]">Dives Started</div>
                  <div className="text-base font-black text-gb-3">{cacheProfile.telemetry.totalDives}</div>
                </div>
                <div className="bg-gb-0 border border-gb-2/60 p-2.5">
                  <div className="text-gb-2 uppercase text-[10px]">Extractions</div>
                  <div className="text-base font-black text-neon-green">{cacheProfile.telemetry.totalExtractions}</div>
                </div>
                <div className="bg-gb-0 border border-gb-2/60 p-2.5">
                  <div className="text-gb-2 uppercase text-[10px]">Sentinels Cleared</div>
                  <div className="text-base font-black text-neon-cyan">{cacheProfile.telemetry.totalCombatsWon}</div>
                </div>
                <div className="bg-gb-0 border border-gb-2/60 p-2.5">
                  <div className="text-gb-2 uppercase text-[10px]">Shards Extracted</div>
                  <div className="text-base font-black text-gb-3">{cacheProfile.telemetry.totalKnowledgeExtracted}</div>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleDownloadExport}
                  className="w-full min-h-11 py-2.5 px-4 bg-gb-0 border-2 border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-gb-0 font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 gb-border-sm"
                >
                  <Download className="w-4 h-4" />
                  Export Anonymized JSON
                </button>

                <button
                  type="button"
                  onClick={onRotateAnonymousId}
                  className="w-full min-h-11 py-2.5 px-4 bg-gb-0 border-2 border-gb-3 text-gb-3 hover:bg-gb-3 hover:text-gb-0 font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 gb-border-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Rotate Anonymous ID
                </button>

                {!confirmClearAll ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(true)}
                    className="w-full min-h-11 py-2.5 px-4 bg-gb-0 border-2 border-neon-magenta text-neon-magenta hover:bg-neon-magenta hover:text-gb-0 font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 gb-border-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All Local Cache
                  </button>
                ) : (
                  <div className="bg-gb-0 border-2 border-neon-magenta p-3 space-y-2.5">
                    <p className="text-xs text-neon-magenta font-sans font-semibold">
                      Erase all 3 save slots, reset telemetry, and generate a new anonymous ID?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(false)}
                        className="min-h-10 py-2 px-3 bg-gb-1 border border-gb-3 text-gb-3 text-xs font-bold uppercase tracking-wider hover:bg-gb-3 hover:text-gb-0 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllCache();
                          setConfirmClearAll(false);
                        }}
                        className="min-h-10 py-2 px-3 bg-neon-magenta border border-neon-magenta text-gb-0 text-xs font-black uppercase tracking-wider hover:bg-gb-3 hover:border-gb-3 transition-colors"
                      >
                        Confirm Wipe
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
