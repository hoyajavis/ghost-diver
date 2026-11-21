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
            Explore the archive grid using WASD or Arrow keys. Every floor starts with a <strong>Safe Spawn Buffer</strong> and places the glowing Exit Node in the far zone. On every 5th floor, a crowned <strong>Apex Gatekeeper</strong> locks the Exit Node until defeated, opening a Secure Node where you can bank your Shards.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-magenta font-bold uppercase mb-1">2. Sentinels, Combo Chains &amp; Apex Breaches</h4>
          <p className="text-gb-2">
            Sentinels (skull icons) patrol each floor. Multi-step problems run as rhythmic <strong>Combo Chains</strong> by default, keeping the original problem pinned while solved steps build a breadcrumb trail. Before Step 1, you can toggle <strong>Direct Strike</strong> for a 1-shot kill worth <strong>+50% Shards</strong>—if you miss, you fall back to Step 1 on the same problem. Use <strong>Tactical Hint Packs</strong> to reveal a step clue, auto-clear the current Combo step, and arm a <strong>Shield</strong> that blocks the next counter-hit. On Floor 5, <strong>Apex Bosses</strong> begin with a segmented <strong>Logic Shield</strong>: break it with rapid conceptual checks to trigger <strong>SHIELD BROKEN — 2× VULNERABLE</strong> before breaching their core!
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-green font-bold uppercase mb-1">3. Integrity (HP) &amp; Neural Scars</h4>
          <p className="text-gb-2">
            HP tracks your Neural Integrity. Wrong answers trigger Sentinel counter-hits (unless blocked by a Tactical Shield). If your HP reaches zero, you lose unbanked run Shards and sustain a Neural Scar. At the Neural Chair, clear any scar by paying 50 Shards or passing <strong>Recalibrate (Free · 0/3)</strong>—3 consecutive conceptual checks from your unlocked tiers.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-cyan font-bold uppercase mb-1">4. Focus Scan &amp; Emergency Heal (FP)</h4>
          <p className="text-gb-2">
            Every correct step or strike builds Focus Points. Once per battle, trigger a free <strong>Focus Scan</strong> (<span className="font-mono">Shift + S</span>) to answer a conceptual check for <strong>+{FOCUS_SCAN_FP_GAIN} FP</strong> (or crack a Logic Shield) without healing HP. Spend <strong>{MEDITATION_FP_COST} FP</strong> on <strong>Emergency Heal</strong> (<span className="font-mono">Shift + F</span>) to solve a conceptual check and restore <strong>+{MEDITATION_HEAL_AMOUNT} HP</strong>.
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
            <strong>Red Caches</strong> grant <strong>Neural Overclock</strong> (+15% Shards per stack and skip the final Combo step against Sector Apex bosses). Off-path cyan <strong>Blue Caches</strong> are conceptual locks: crack 1 prompt for +1 Hint Pack &amp; Overclock; missing deals <strong>-{BLUE_CACHE_FAIL_DAMAGE} HP</strong> static shock (non-lethal) and lets you retry or step back without losing the cache. Glowing green Data Logs unlock new entries in the Archivist Logs station.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-cyan font-bold uppercase mb-1">7. Signal Sweep &amp; Recon Buffs</h4>
          <p className="text-gb-2">
            Open the <strong>Combat Simulator</strong> and choose the <strong>Signal Sweep</strong> tab for a fast 10-node conceptual sprint across all Sectors you have reached (toggle between <strong>Arcade Timer</strong> and untimed <strong>Relaxed Focus</strong>). Scoring <strong>≥ 70%</strong> lets you arm 1 of 3 <strong>Recon Buffs</strong> for your next dive (<em>Start with +20 FP</em>, <em>+15% Shard Extraction</em>, or <em>1 Free Shield Charge</em>). You can earn 1 rewarded buff per completed extraction—additional sweeps stay open for unlimited practice.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-mono text-neon-cyan font-bold uppercase mb-1">8. Controls &amp; Shortcuts</h4>
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
