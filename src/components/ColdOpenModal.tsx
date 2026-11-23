import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Cpu, Database, Shield, Terminal } from 'lucide-react';

export interface ColdOpenSlide {
  id: string;
  sender: string;
  timestamp: string;
  headline: string;
  body: string;
  subtext: string;
  accent: 'cyan' | 'green' | 'magenta';
}

export const COLD_OPEN_SLIDES: readonly ColdOpenSlide[] = [
  {
    id: 'THE_SYNC',
    sender: 'ARCHIVIST_PRIME // LOG_001',
    timestamp: '2084.11.04_14:00',
    headline: 'Humanity Is Locked in the Static',
    body: 'Everyone uploaded their minds into the digital grid during The Sync—and the Archivist locked the door behind them.',
    subtext: 'Only a few Ghost Divers are still awake to search the ruins for a way out.',
    accent: 'magenta',
  },
  {
    id: 'THE_CRADLE',
    sender: 'UNKNOWN_ENGINEER // LOG_042',
    timestamp: '2084.12.25_23:59',
    headline: 'Welcome to the Cradle Bunker',
    body: 'This hidden bunker is the last real-world room left—the only place that remembers your name when the grid tries to erase it.',
    subtext: 'Use the Neural Chair to dive in, and always extract at a Secure Node before your link breaks.',
    accent: 'green',
  },
  {
    id: 'THE_KEY',
    sender: 'THE_ARCHITECT // LOG_777',
    timestamp: 'SIGNAL_INTERCEPT',
    headline: 'Crack the Ciphers. Recover the Shards.',
    body: 'The Architect hid an exit key deep below, guarded by Sentinel firewalls that only open to math and logic.',
    subtext: 'Break their shields, bring back Knowledge Shards, and power up your rig to reach the deep strata.',
    accent: 'cyan',
  },
] as const;

interface Props {
  slotId?: number | null;
  onComplete: () => void;
}

export const ColdOpenModal: React.FC<Props> = ({ slotId, onComplete }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const currentSlide = COLD_OPEN_SLIDES[slideIndex];
  const isLastSlide = slideIndex === COLD_OPEN_SLIDES.length - 1;
  const diverTag = `DIVER_0${slotId ?? 1}`;

  const handleAdvance = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setSlideIndex((prev) => prev + 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onComplete();
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (slideIndex >= COLD_OPEN_SLIDES.length - 1) {
          onComplete();
        } else {
          setSlideIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft' && slideIndex > 0) {
        e.preventDefault();
        setSlideIndex((prev) => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slideIndex, onComplete]);

  const accentBorder =
    currentSlide.accent === 'magenta'
      ? 'border-neon-magenta'
      : currentSlide.accent === 'green'
        ? 'border-neon-green'
        : 'border-neon-cyan';

  const accentText =
    currentSlide.accent === 'magenta'
      ? 'text-neon-magenta'
      : currentSlide.accent === 'green'
        ? 'text-neon-green'
        : 'text-neon-cyan';

  const SlideIcon =
    currentSlide.accent === 'magenta'
      ? Shield
      : currentSlide.accent === 'green'
        ? Database
        : Cpu;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cold-open-headline"
      className="fixed inset-0 z-[110] bg-gb-0/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono"
    >
      <div
        className={`max-w-md w-full bg-gb-1 border-2 ${accentBorder} p-4 sm:p-6 gb-border dither relative flex flex-col gap-3.5 sm:gap-4`}
      >
        {/* Top Signal Header */}
        <div className="flex items-center justify-between gap-2 border-b border-gb-3/40 pb-2.5 text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5 font-bold text-neon-cyan truncate">
            <Terminal className="w-3.5 h-3.5 shrink-0" />
            <span>INCOMING TRANSMISSION · {diverTag}</span>
          </div>
          <button
            type="button"
            onClick={onComplete}
            aria-label="Skip intro briefing"
            className="px-2 py-0.5 border border-gb-3/60 bg-gb-0 text-gb-2 hover:text-neon-cyan hover:border-neon-cyan text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-colors shrink-0"
          >
            Skip [Esc]
          </button>
        </div>

        {/* Slide Body */}
        <motion.div
          key={currentSlide.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.16 }}
          className="bg-gb-0 border border-gb-3 p-3.5 sm:p-4 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-gb-2">
            <span className="font-bold truncate">{currentSlide.sender}</span>
            <span className="tabular-nums shrink-0">{currentSlide.timestamp}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 border ${accentBorder} bg-gb-1/50 flex items-center justify-center shrink-0`}
            >
              <SlideIcon className={`w-4 h-4 ${accentText}`} />
            </div>
            <h2
              id="cold-open-headline"
              className={`text-base sm:text-lg font-black italic uppercase tracking-tight leading-snug ${accentText}`}
            >
              {currentSlide.headline}
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-gb-3 font-sans leading-relaxed">
            {currentSlide.body}
          </p>

          <p className="text-xs text-gb-2 font-sans leading-snug border-t border-gb-3/25 pt-2">
            {currentSlide.subtext}
          </p>
        </motion.div>

        {/* Progress Pips & Primary Action */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div
            className="flex items-center gap-1.5"
            aria-label={`Transmission ${slideIndex + 1} of ${COLD_OPEN_SLIDES.length}`}
          >
            {COLD_OPEN_SLIDES.map((slide, idx) => (
              <span
                key={slide.id}
                className={`inline-block h-2 transition-all ${
                  idx === slideIndex
                    ? 'w-6 bg-neon-cyan border border-neon-cyan'
                    : idx < slideIndex
                      ? 'w-2.5 bg-neon-green border border-neon-green'
                      : 'w-2.5 bg-gb-0 border border-gb-3/50'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleAdvance}
            className="min-h-10 px-4 py-2 bg-gb-3 text-gb-0 hover:bg-neon-cyan font-black italic uppercase tracking-wider text-xs sm:text-sm transition-colors flex items-center gap-1.5 gb-border-sm"
          >
            <span>{isLastSlide ? 'Enter Cradle Bunker' : 'Next Signal'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
