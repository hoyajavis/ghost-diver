import React from 'react';
import { Info } from 'lucide-react';
import {
  BLUE_CACHE_FAIL_DAMAGE,
  FOCUS_SCAN_FP_GAIN,
  MEDITATION_FP_COST,
  MEDITATION_HEAL_AMOUNT,
} from '../../lib/combatLogic';

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
            Move with WASD or Arrow keys to reach the glowing Exit Node. Every 5th floor has a crowned <strong>Apex Boss</strong> guarding the exit—beat it to reach a Secure Node and bank your Shards.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-magenta font-bold uppercase mb-1">2. Sentinels &amp; Combos</h4>
          <p className="text-gb-2">
            Multi-step problems run as <strong>Combo Chains</strong>. Before Step 1, you can toggle <strong>Direct Strike</strong> for a 1-shot win worth <strong>+50% Shards</strong> (if you miss, you drop back to Step 1). Use <strong>Hint Packs</strong> to reveal a clue, clear a step, and block the next hit. Apex Bosses start with a <strong>Logic Shield</strong>—crack it with quick Logic Checks for <strong>2× damage</strong>!
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-green font-bold uppercase mb-1">3. Integrity (HP) &amp; Scars</h4>
          <p className="text-gb-2">
            Wrong answers damage your HP. Hit 0 HP and you lose unbanked Shards and pick up a <strong>Neural Scar</strong> glitch. Fix scars at the Neural Chair for 50 Shards or free with <strong>Recalibrate (0/3)</strong>.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-cyan font-bold uppercase mb-1">4. Focus Scan &amp; Heal (FP)</h4>
          <p className="text-gb-2">
            Correct answers build Focus (FP). Use a free <strong>Focus Scan</strong> once per battle for <strong>+{FOCUS_SCAN_FP_GAIN} FP</strong> (or to crack a Logic Shield). Spend <strong>{MEDITATION_FP_COST} FP</strong> on <strong>Heal</strong> to restore <strong>+{MEDITATION_HEAL_AMOUNT} HP</strong>.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-gb-3 font-bold uppercase mb-1">5. Knowledge Shards</h4>
          <p className="text-gb-2">
            Bank Shards at Secure Nodes to buy rig upgrades, Hint Packs, scar repairs, and practice sims at the Workbench.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-amber-400 font-bold uppercase mb-1">6. Caches &amp; Data Logs</h4>
          <p className="text-gb-2">
            <strong>Red Caches</strong> boost your Shards (+15%) and skip the final step on Apex Bosses. <strong>Blue Caches</strong> hold a Hint Pack + Overclock behind a quick Logic Check (missing deals a small -{BLUE_CACHE_FAIL_DAMAGE} HP zap). Green <strong>Data Logs</strong> unlock story entries in the Archivist Terminal.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-cyan font-bold uppercase mb-1">7. Signal Sweep &amp; Recon Buffs</h4>
          <p className="text-gb-2">
            Play <strong>Signal Sweep</strong> inside the Combat Simulator for a 10-question sprint. Score <strong>≥ 70%</strong> to pick a 1-dive <strong>Recon Buff</strong> (+20 Start FP, +15% Shards, or 1 Free Shield).
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-purple-300 font-bold uppercase mb-1">8. Loadout Chips &amp; Mastery</h4>
          <p className="text-gb-2">
            Equip up to <strong>2 Loadout Chips</strong> at the Neural Chair—unlocked by clearing Apex Bosses, Blue Caches, Scars, and Signal Sweeps. Check your progress in the <strong>Archivist Terminal</strong> and watch <strong>The Green-Print</strong> grow.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-cyan font-bold uppercase mb-1">9. Controls &amp; Shortcuts</h4>
          <ul className="text-gb-2 space-y-1 text-xs font-mono">
            <li><span className="text-gb-3 font-bold">Shift + D</span> — Toggle Direct Strike (before Step 1)</li>
            <li><span className="text-gb-3 font-bold">Shift + H</span> — Use Tactical Hint Pack (Clue + Shield)</li>
            <li><span className="text-gb-3 font-bold">Shift + S</span> — Focus Scan (1 free conceptual check/battle, +{FOCUS_SCAN_FP_GAIN} FP)</li>
            <li><span className="text-gb-3 font-bold">Shift + F</span> — Emergency Heal ({MEDITATION_FP_COST} FP → +{MEDITATION_HEAL_AMOUNT} HP)</li>
            <li><span className="text-gb-3 font-bold">1 / 2 / 3</span> (or <span className="text-gb-3 font-bold">A / B / C</span>) — Single-key &lt; / = / &gt; relationship shortcuts</li>
            <li><span className="text-gb-3 font-bold">Enter</span> — Advance numerator → denominator in fractions, then submit</li>
            <li><span className="text-gb-3 font-bold">Esc</span> — Open/close Combat Systems or step back from modals</li>
          </ul>
        </section>
      </div>
    </div>
  );
};
