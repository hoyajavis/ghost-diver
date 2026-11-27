import React from 'react';
import { Bot, Crosshair, Radio, Sprout, Wrench } from 'lucide-react';
import { CrewResidentId, CrewResidentStatus } from '../../lib/cradleUnlocks';
import { CradleAccent } from '../../lib/cradleProps';

interface Props {
  resident: CrewResidentStatus;
}

const ACCENT_MAP: Record<CradleAccent, { border: string; text: string; bg: string }> = {
  cyan: { border: 'border-neon-cyan/50', text: 'text-neon-cyan', bg: 'bg-neon-cyan/10' },
  green: { border: 'border-neon-green/50', text: 'text-neon-green', bg: 'bg-neon-green/10' },
  amber: { border: 'border-amber-400/50', text: 'text-amber-400', bg: 'bg-amber-400/10' },
  purple: { border: 'border-purple-400/50', text: 'text-purple-300', bg: 'bg-purple-500/10' },
  magenta: { border: 'border-neon-magenta/50', text: 'text-neon-magenta', bg: 'bg-neon-magenta/10' },
};

function renderResidentIcon(id: CrewResidentId, className: string): React.ReactNode {
  switch (id) {
    case 'DR_ARIS_THORNE':
      return <Wrench className={className} />;
    case 'DIVER_77':
      return <Radio className={className} />;
    case 'COMBAT_ANALYST_V':
      return <Crosshair className={className} />;
    case 'BOTANIST_AI_CORE':
      return <Sprout className={className} />;
    case 'CRADLE_SYS':
    default:
      return <Bot className={className} />;
  }
}

export const CrewResidentBanner: React.FC<Props> = ({ resident }) => {
  const accent = ACCENT_MAP[resident.accent];

  if (!resident.arrived) {
    return (
      <div className="bg-gb-0/80 border border-gb-3/30 px-3 py-2 text-[11px] text-gb-2 font-sans flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-gb-2/50 shrink-0" aria-hidden="true" />
        <span>{resident.arrivalHint}</span>
      </div>
    );
  }

  return (
    <div className={`bg-gb-0 border ${accent.border} p-2.5 flex items-start gap-2.5`}>
      <div
        className={`w-8 h-8 border ${accent.border} ${accent.bg} flex items-center justify-center shrink-0 mt-0.5`}
      >
        {renderResidentIcon(resident.id, `w-4 h-4 ${accent.text}`)}
      </div>
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={`font-black uppercase tracking-wider ${accent.text}`}>
            {resident.name}
          </span>
          <span className="text-[10px] text-gb-2 font-mono">· {resident.role}</span>
        </div>
        <p className="text-xs text-gb-3 font-sans leading-snug">&ldquo;{resident.dialogue}&rdquo;</p>
      </div>
    </div>
  );
};
