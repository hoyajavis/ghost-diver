import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Zap, ChevronRight, FileText } from 'lucide-react';
import { useSafeTimeout } from '../hooks/useSafeTimeout';

interface Props {
  message: string;
  type?: 'CHEST' | 'LOG';
  onDismiss: () => void;
}

export const ChestLoot: React.FC<Props> = ({ message, type = 'CHEST', onDismiss }) => {
  const isLog = type === 'LOG';
  const borderColor = isLog ? 'border-neon-green' : 'border-neon-magenta';
  const textColor = isLog ? 'text-neon-green' : 'text-neon-magenta';
  const bgColor = isLog ? 'bg-neon-green' : 'bg-neon-magenta';
  const bgOpacity = isLog ? 'bg-neon-green/20' : 'bg-neon-magenta/20';
  const shadowColor = isLog ? 'shadow-[0_0_20px_rgba(0,255,0,0.3)]' : 'shadow-[0_0_20px_rgba(255,0,255,0.3)]';

  const canDismissRef = useRef(false);
  const { scheduleTimeout } = useSafeTimeout();

  useEffect(() => {
    canDismissRef.current = false;
    scheduleTimeout(() => {
      canDismissRef.current = true;
    }, 250);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canDismissRef.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.key === 'Shift') return;
      e.preventDefault();
      onDismiss();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss, scheduleTimeout]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chest-loot-title"
      className="absolute inset-0 z-50 bg-gb-0/90 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className={`max-w-sm w-full bg-gb-1 border-2 p-6 gb-border flex flex-col items-center text-center gap-4 ${borderColor} ${shadowColor}`}
      >
        <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${borderColor} ${bgOpacity}`}>
          {isLog ? <FileText className={`w-8 h-8 ${textColor}`} /> : <Zap className={`w-8 h-8 ${textColor}`} />}
        </div>

        <div className="space-y-1.5">
          <h3 id="chest-loot-title" className={`text-lg font-black italic uppercase tracking-tight ${textColor}`}>
            {isLog ? 'Data Log Recovered' : 'Cache Extracted'}
          </h3>
          <p className="text-gb-3 text-sm font-semibold leading-snug font-sans">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          autoFocus
          className={`mt-2 w-full min-h-11 py-3 px-4 flex items-center justify-center gap-2 font-black italic uppercase tracking-wider transition-colors ${bgColor} text-gb-0 hover:bg-gb-3 text-sm`}
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>

        <div className="text-xs text-gb-2">
          Press any key to dismiss
        </div>
      </motion.div>
    </motion.div>
  );
};
