import React from 'react';
import { Info } from 'lucide-react';
import { MEDITATION_FP_COST } from '../../lib/combatLogic';

export const ManualStation: React.FC = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-black italic text-amber-400 tracking-tight uppercase flex items-center gap-2 pr-10">
        <Info className="w-5 h-5 shrink-0" />
        Diver Manual
      </h3>
      <div className="bg-gb-0 border border-gb-3 p-4 text-sm leading-relaxed h-72 overflow-y-auto custom-scrollbar space-y-4 font-sans">
        <section>
          <h4 className="text-xs font-mono text-neon-cyan font-bold uppercase mb-1">1. The Dive</h4>
          <p className="text-gb-2">
            Explore the archive grid using WASD or Arrow keys. Step onto the glowing Exit Node to move to the next floor. Every 5th floor opens a Secure Node where you can safely bank your Shards.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-magenta font-bold uppercase mb-1">2. Sentinels &amp; Combat</h4>
          <p className="text-gb-2">
            Sentinels (skull icons) patrol each floor. Touching one begins a math duel—solve problems to break their shields. Use Hint Packs to break tough problems into step-by-step prompts.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-green font-bold uppercase mb-1">3. Integrity (HP)</h4>
          <p className="text-gb-2">
            HP tracks your Neural Integrity. Wrong answers trigger Sentinel counter-hits. If your HP reaches zero, you lose unbanked run Shards and sustain a Neural Scar.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-cyan font-bold uppercase mb-1">4. Focus (FP)</h4>
          <p className="text-gb-2">
            Every correct attack builds Focus Points. Spend {MEDITATION_FP_COST} FP on Meditation Recovery (HEAL) in combat to answer a conceptual check and restore HP.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-gb-3 font-bold uppercase mb-1">5. Knowledge Shards</h4>
          <p className="text-gb-2">
            Defeating Sentinels earns Shards. Extract at a Secure Node to bank them permanently and spend them on upgrades, Hint Packs, scar repairs, and Training Simulations.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-amber-400 font-bold uppercase mb-1">6. Caches &amp; Data Logs</h4>
          <p className="text-gb-2">
            Amber Caches grant +10% Attack Power for the current run. Glowing green Data Logs unlock new entries in the Archivist Logs station.
          </p>
        </section>
      </div>
    </div>
  );
};
