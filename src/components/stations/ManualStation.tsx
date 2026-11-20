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
            Sentinels (skull icons) patrol each floor. Multi-step problems run as rhythmic <strong>Combo Chains</strong> by default, keeping the original problem pinned while solved steps build a breadcrumb trail. Before Step 1, you can toggle <strong>Direct Strike</strong> for a 1-shot kill worth <strong>+50% Shards</strong>—if you miss, you fall back to Step 1 on the same problem. Use <strong>Tactical Hint Packs</strong> to reveal a step clue, auto-clear the current Combo step, and arm a <strong>Shield</strong> that blocks the next counter-hit.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-green font-bold uppercase mb-1">3. Integrity (HP)</h4>
          <p className="text-gb-2">
            HP tracks your Neural Integrity. Wrong answers trigger Sentinel counter-hits (unless blocked by a Tactical Shield). If your HP reaches zero, you lose unbanked run Shards and sustain a Neural Scar.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-cyan font-bold uppercase mb-1">4. Focus (FP)</h4>
          <p className="text-gb-2">
            Every correct step or strike builds Focus Points. Spend {MEDITATION_FP_COST} FP on Meditation Recovery (HEAL) in combat to answer a conceptual check and restore HP.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-gb-3 font-bold uppercase mb-1">5. Knowledge Shards</h4>
          <p className="text-gb-2">
            Defeating Sentinels earns Shards. Extract at a Secure Node to bank them permanently and spend them on upgrades, Tactical Hint Packs, scar repairs, and Training Simulations.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-amber-400 font-bold uppercase mb-1">6. Caches &amp; Data Logs</h4>
          <p className="text-gb-2">
            Amber/Red Caches grant <strong>Neural Overclock</strong> (+15% Shards per stack and skip the final Combo step against Sector Apex bosses). Glowing green Data Logs unlock new entries in the Archivist Logs station.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-cyan font-bold uppercase mb-1">7. Controls &amp; Shortcuts</h4>
          <ul className="text-gb-2 space-y-1 text-xs font-mono">
            <li><span className="text-gb-3 font-bold">Shift + D</span> — Toggle Direct Strike (before Step 1)</li>
            <li><span className="text-gb-3 font-bold">Shift + H</span> — Use Tactical Hint Pack (Clue + Shield)</li>
            <li><span className="text-gb-3 font-bold">Shift + F</span> — Focus / Meditation Heal ({MEDITATION_FP_COST} FP)</li>
            <li><span className="text-gb-3 font-bold">Enter</span> — Advance numerator → denominator in fractions, then submit</li>
            <li><span className="text-gb-3 font-bold">Esc</span> — Open/close Combat Systems menu</li>
          </ul>
        </section>
      </div>
    </div>
  );
};
