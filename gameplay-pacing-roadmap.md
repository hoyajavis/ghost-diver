# Phased Gameplay, Pacing & Conceptual Fluency Roadmap

**Date:** 2026-11-19  
**Design Pillars:** Proposal 5 (Friendly Numbers) + Proposal 2 (Combo Chains & Direct Strike) + Proposal 1 (Skirmishes vs. Boss Breaches) + Conceptual Fluency Integration (see `conceptual-fluency-brainstorm.md`) + Distance-Aware Level Generation + Neural Loadout Chips  
**Target Audience:** Grades 4–8 (ages 9–14), playable on desktop/Chromebook and touch devices without physical pencil and paper.

---

## Core North Star

> **Every individual player input in standard combat should be solvable mentally in 3–12 seconds.**  
> Deep, multi-step mathematics stays in the game—not by forcing scratch paper, but by turning multi-step problems into rhythmic **Combo Chains** anchored by **Conceptual Checks**, **distance-aware floor pacing**, **frictionless input ergonomics**, and **Floor 5 Apex Breaches**.

Each phase below ends with a **mandatory Playtest Gate**. Do not start the next phase until the playtest observations validate the feel, pacing, and balance of the current one.

---

## Phase 1: Baseline Feel — "Mental-Math Friendly" Tuning & Core Fixes (Proposal 5)

**Goal:** Eliminate sudden pencil-and-paper frustration spikes, baseline math/progression bugs, and missing playtest metrics in Tiers 1–12 *before* changing core combat rules, so we have a fair baseline to measure against.

### Phase 1A: Immediate Baseline Bug & Progression Fixes
- [x] **Sync Meditation FP Cost Copy (`CombatActionBar.tsx` vs `combatLogic.ts`):** Align `CombatActionBar.tsx` tooltip/ARIA copy (`25 FP`) with `MEDITATION_FP_COST` (`50`)—or adjust `MEDITATION_FP_COST` intentionally—so UI copy never misleads players.
- [x] **Fix Tier 1 V4 Negative Intermediate Bug (`src/lib/generators/arithmetic.ts`):** When `a1 = 299` and `b1 = 248`, rounding `b1` up to `300` currently produces a negative intermediate step (`299 - 300 = -1`) in Grade 4 subtraction. Clamp/select compatible numbers so `a1 >= roundedB`.
- [x] **Fix Sector Drop-In & Floor 60 Cap (`useGameEngine.ts`, `DiveStation.tsx`, `mapGen.ts`):**
  - Extracting from a Floor 5 Secure Node (`handleBankAndExit`) should unlock `dungeon.floor + 1` (Floor 6 / Sector 2) instead of forcing players to replay Floor 5 to advance.
  - Cap `maxExtractedFloor` / "Descend Deeper" at Floor 60 (Sector 12) with a clear "Deep Sub-Strata Locked" message until Phase 6 ships Tiers 13–20, rather than silently wrapping back to Tier 1.
- [x] **Add Lightweight Anonymized Playtest Telemetry (`src/lib/storage.ts`):** Track per-`tier-variant` and per-archetype median solve time and first-try accuracy inside the existing anonymized local cache and **Export Anonymized JSON** payload so every Playtest Gate can be verified quantitatively.

### Generators & Data Contracts
- [x] **Rewrite specific scratch-paper offenders** across `src/lib/generators/arithmetic.ts`, `preAlgebra.ts`, and `modeling.ts`:
  - **`arithmetic.ts` Tier 1 V3 & V4:** Replace arbitrary 3-digit ± 3-digit (`100..999 ± 100..999`, 4 rounding steps) with compatible/mental-friendly numbers (e.g., multiples of 10/25/50 or clean compensation pairs, guaranteeing non-negative intermediates).
  - **`arithmetic.ts` Tier 3 V1:** Replace arbitrary 2-digit × 2-digit (`10..99 × 10..99`, e.g., `87 × 69`) with mental-friendly products (2-digit × 1-digit, clean multiples of 10/5, or small distributive pairs like `14 × 12`).
  - **`arithmetic.ts` Tier 3 V2:** Replace 3-digit quotient long division (`quotient 100..999`, 6 hint steps) with crisp 2-digit mental-quotient division (2–3 steps max).
  - **`arithmetic.ts` Tier 4 V2 & Tier 5 V3:** Restrict fraction denominators to friendly sets (`2, 3, 4, 5, 6, 8, 10, 12`) with LCM ≤ 24; eliminate coprime pairs like `7` and `9` on standard Sentinels.
  - **`arithmetic.ts` Tier 5 V5 (Unit Conversions):** Replace awkward rolls like `11 lb → 176 oz` (`× 16`) with mental-friendly quantities (e.g., `2–5 lb` or multiples of `10` / `12` / `3`).
  - **`preAlgebra.ts` Tier 6 V1 & V2:** Replace arbitrary hundredths (`10.01..99.99`) and arbitrary decimal products (`8.7 × 6.9`) with clean halves, quarters, fifths, and tenths (`0.2`, `0.25`, `0.5`, `0.75`, `1.2`).
  - **`preAlgebra.ts` Tier 10 V3 (Area of Triangle):** Ensure at least one of `base` or `height` is even so `(b × h) / 2` resolves cleanly to an integer without unexpected `.5` friction.
  - **Equations & Statistics (Tiers 9–10):** Keep datasets to 3–5 small integers with integer means; keep variable coefficients small (`2`–`9`) with clean integer solutions.
  - **`modeling.ts` Tier 11 V3 (Simple Interest):** Keep `P * r * t` rolls mental-friendly (e.g., `$200 * 5% * 3 yrs`) rather than single-step `900 * 0.06 * 5`.
- [x] **Classify `complexity: 'QUICK' | 'COMBO'` on `MathProblem` (`src/types.ts`):**
  - Tag true 1-step variants (including existing single-step generators such as `arithmetic.ts` Tier 2 V2/V3 multi-select, `preAlgebra.ts` Tier 6 V1–V3, Tier 7 V2, Tier 8 V3, Tier 9 V4, and `modeling.ts` Tier 11 V4, Tier 12 V1, Tier 12 V4) as `'QUICK'` so they never get wrapped in a redundant 1-step Combo Chain.
  - Give genuine multi-step problems that currently only have 1 step (such as `modeling.ts` Tier 12 V2 division) a clean 2–3 step chain and tag them `'COMBO'`.
- [x] **Update generator fuzz tests** (`src/lib/__tests__/generators.test.ts`) to assert denominator/LCM/magnitude bounds, non-negative Grade 4 intermediates, and valid `complexity` tagging across all Tiers 1–12.

### Playtest Gate 1: "The No-Paper Stress Test"
- **Format:** 10–15 minute solo or 2–3 student playtest across Tiers 1, 4, 6, 9, and 12 (using both Dungeon dives and Training Sim), exporting the anonymized JSON telemetry afterward.
- **What to Observe:**
  - How often does a player pause > 20 seconds or reach for pencil/paper?
  - Which exact Tier/Variant still causes "staring at the screen" stalls?
  - Does Tier 12 still feel meaningfully harder than Tier 1 without becoming tedious?
- **Exit Criteria to Advance:**
  - ≥ 90% of standard problems feel solvable mentally without scratch paper.
  - Zero outlier rolls where a single hallway Sentinel takes > 60 seconds to clear.

---

## Phase 2: Kinetic Combat Loop, UI Overhaul & Input Ergonomics (Proposal 2)

**Goal:** Align combat pacing with the arcade aesthetic by turning multi-step problems into fast, rhythmic **Combo Chains** by default, rewarding confident calculators with a high-risk **Direct Strike** toggle, fixing step-context visibility, tightening keyboard/touch ergonomics, and rebalancing patrol HP/economy.

### Generators & Data Contracts
- [x] **Fix Context-Dependent Step Prompts across Tiers 1–12:**
  - Audit and rewrite step prompts that currently omit the problem's numbers/context (e.g., `arithmetic.ts` T4 V3/V4 `"IDENTIFY SHARED DENOMINATOR"`, T5 V5 `"IDENTIFY CONVERSION FACTOR"`; `preAlgebra.ts` T7 V1 `"IDENTIFY FIRST QUANTITY"`, T8 V1 `"SIGN OF RESULT?"`, T10 V1–V4 `"SUBTRACT b FROM BOTH SIDES"` / `"SUM ALL 5 VALUES"`; `modeling.ts` T12 V1 `"ALIGN DECIMALS AND ADD"`).
- [x] **Extend `MathStep` (`src/types.ts`):**
  - Add optional `clue?: string` (formula/strategy clue surfaced by repurposed Hint Packs and Training Sim).
  - Add optional `resultLabel?: string` (compact breadcrumb label rendered after a step succeeds, e.g., `LCD = 12`, `3x = 18`).

### Combat Logic & Encounter Balance (`combatLogic.ts`, `dungeonLogic.ts`)
- [x] **Explicit `strikeMode: 'COMBO' | 'DIRECT'` State:**
  - Replace the overloaded `hintStepIndex !== null` flag in `Combat.tsx` with explicit `strikeMode` state.
  - Multi-step (`complexity: 'COMBO'`) problems start in `'COMBO'` mode by default: each step lands a fast strike (`2×`, `3×` combo) with incremental Sentinel INT damage.
  - Single-step (`complexity: 'QUICK'`) problems remain immediate 1-hit strikes.
  - **Miss Rules:** Missing a **Direct Strike** deals normal counter-damage and **falls back to Step 1 of the Combo Chain on the same problem** (rather than discarding the problem). Missing a **Step 2+ mid-chain step** deals counter-damage, keeps the player on that step to retry (revealing the step answer after 2 misses on the same step), and resets the bonus combo streak without discarding solved breadcrumbs.
- [x] **Repurpose Hint Packs into a Single Clear Tactical Tool:**
  - Convert Hint Packs into a one-tap **Tactical Clue + Shield** (reveals `step.clue` / auto-completes the current step and absorbs the next counter-hit) so players don't have to navigate a sub-menu mid-battle.
  - Update `WorkbenchStation.tsx` (`AI Preload` and `Hint Pack` descriptions) to match the new tactical behavior.
- [x] **Rebalance Patrol Sentinel HP, Density, Red Chests & Shard Economy:**
  - Tune standard patrol Sentinel HP so each hallway fight resolves in **1 full Combo Chain or 1–2 Quick Strikes** (~15–25 seconds per battle) instead of 3–4 repetitive full problems.
  - Scale standard floor enemy density progressively: **2–3 Sentinels** in Sector 1, **3–4** in Sectors 2–4, and **capped at 5** in Sector 5+ (down from up to 8 at deep floors) so a full floor clears in ~1.5–2 minutes.
  - Redefine Red Chest `ATK_UP` (`runBuffs`) so it stays relevant under default Combo Chains (e.g., `+15%` Shard bonus per stack and skipping 1 final step on high-HP / Apex encounters).
  - Calibrate base Shard rewards & Direct Strike `+50%` bonus against Workbench upgrade costs to prevent Shard inflation.
  - Tune Sentinel counter-damage slightly to preserve extraction tension once unfair scratch-paper misses are removed.
- [x] **Polish Combat Feedback Timing:**
  - Speed up successful combo-step transitions to `400ms–500ms` while keeping the `1800ms` expected-answer reveal on misses.

### UI & Presentation Layer
- [x] **Extract Shared `ProblemPromptCard` & Pinned Breadcrumb (`Combat.tsx`, `TrainingSim.tsx`):**
  - Extract problem display + `THE_BLUR` handling out of `Combat.tsx` (currently 629 lines) into a reusable `ProblemPromptCard` component.
  - Never replace `problem.question` when in Combo Chain mode; render:
    1. **Pinned Original Problem** at the top of the terminal card.
    2. **Solved-Step Breadcrumb** showing intermediate values earned so far (e.g., `LCD: 12 → 1/4 = 3/12 → 5/6 = 10/12`).
    3. **Active Step Prompt** + **Combo Step Pip Bar** (`Step 2/3 · 2× Combo`).
- [x] **Direct Strike Toggle & Repurposed `CombatActionBar`:**
  - Show a crisp `[Direct Strike · 1-Shot · +50% Shards]` toggle on `COMBO` problems **only before Step 1 is submitted**.
  - Update `CombatActionBar.tsx` labels, icons, and disabled states for the repurposed Tactical Hint tool.
- [x] **Snappier Patrol Battle Intros (`Combat.tsx`):**
  - Shorten standard patrol `Battle Start` overlay from `1200ms` to `450ms–600ms` (or allow keypress/tap skip), reserving the full dramatic `1200ms` intro for Floor 5 Apex Bosses.
- [x] **Align `TrainingSim.tsx` & `ManualStation.tsx`:**
  - Give `TrainingSim.tsx` an untimed **Combo Chain vs. Direct Strike** mode toggle (plus visible `step.clue` support) so it stays distinct and useful once Combo Chains are default in combat.
  - Update `ManualStation.tsx` to explain Combo Chains, Direct Strike, and Tactical Hint Packs.

### Player Input & Ergonomics (`useCombatInput.ts`, `ProblemInputRouter.tsx`, `FractionInput.tsx`)
- [x] **Fast-Combo Keyboard Safety (`useCombatInput.ts`):**
  - Add `if (e.repeat) return;` and `if (e.ctrlKey || e.metaKey || e.altKey) return;` to the global keydown handler so held keys or browser shortcuts never double-submit or bleed across `400ms` combo-step transitions.
  - Reset `input`, `fractionInput`, `fractionFocus`, and `selectedOptions` atomically with step advancement.
- [x] **`FractionInput` Keyboard Flow (`useCombatInput.ts`):**
  - Pressing `Enter` while `fractionFocus === 'num'` and `den` is empty auto-advances focus from `num → den` (and submits once both fields are populated), matching `Tab` / `/` / `:` ergonomics.
- [x] **Stable Touch Layout Across Step Transitions (`ProblemInputRouter.tsx`):**
  - Maintain a consistent input-stage height/alignment when a Combo Chain switches mid-problem from integer `NumberPad` steps to `FractionInput` so the primary Submit button never jumps under the player's thumb on mobile/tablet.
- [x] **Chromebook-Safe Tactical Action Hotkeys (`useCombatInput.ts`):**
  - Add optional keyboard shortcuts for Direct Strike (`Shift+D`), Tactical Hint (`Shift+H`), and Focus/Meditation (`Shift+F`) with subtle button hints—avoiding bare `A–D` / `1–9` (answer inputs) and `F1–F3` (Chromebook/browser OS keys).

### Playtest Gate 2: "The Arcade Rhythm, Ergonomics & Economy Check"
- **Format:** 15–20 minute playtest comparing **Grade 4–5 testers** (Combo Chains) and **Grade 7–8 testers** (trying Direct Strike) across a full 5-floor run on both keyboard and touch devices.
- **What to Observe:**
  - Do players always understand how the active Combo Step relates to the pinned original problem?
  - Do younger players feel *faster and more confident* chaining steps than before?
  - Do stronger players discover and enjoy toggling **Direct Strike** for bonus Shards?
  - Are there any accidental double-submits, awkward fraction entries, or jumping buttons on mobile?
  - How many minutes does a 5-floor run take, and how many Shards do players extract? Does Floor 5 "Extract vs. Push Deeper" still feel tense?
- **Exit Criteria to Advance:**
  - Players visibly enter a "flow rhythm" during combat (average 4–8 seconds per input; ~1.5–2 min per floor).
  - Zero confusion about step context; zero input-misfire complaints on keyboard or touch.
  - Both Combo Chain and Direct Strike feel rewarding, and Shard progression neither starves nor trivializes upgrades.

---

## Phase 3: Conceptual Fluency Core, Distance-Aware MapGen & Spiral Floor Sequencing (Proposal 1 + Brainstorm A & E)

**Goal:** Make conceptual math fluency impossible to miss, tie it directly to each sector's curriculum, upgrade level generation (`mapGen.ts`) so every floor has a deliberate spatial arc (*Spawn Safe Zone → Spiral Skirmishes + Off-Path Conceptual Locks → Far-Zone Exit / Floor 5 Apex Gatekeeper*), and deliver dedicated UI/input support for conceptual prompts.

### Generators & Data Contracts
- [x] **Create Tier-Mapped Conceptual Generator Module (`src/lib/generators/conceptual.ts`):**
  - Build fast, paper-free conceptual prompts for **Tiers 1–12**—starting with **2–3 strong parameterized archetypes per tier** (expanding after Playtest Gate 3) drawn from the 7 arcade archetypes:
    1. *Magnitude & Estimation* (closest power of 10 / reasonable product)
    2. *Benchmark `< / = / >`* (e.g., is `5/8 + 4/9` less than, equal to, or greater than `1`?)
    3. *Spot the Glitch* (error analysis on a Sentinel's broken 2–3 step solution)
    4. *First-Step Strategy* (best operation to isolate a variable or simplify)
    5. *Sign & Behavior Prediction* (sign of products/quotients/differences without computing)
    6. *Equivalence & Structure* (distributive/commutative/inverse structure matching)
    7. *Visual / Quadrant Intuition* (quadrant identification, axis behavior)
- [x] **Expand Domain Types (`src/types.ts`):**
  - `MathProblem`: add `category?: 'PROCEDURAL' | 'CONCEPTUAL'`, `archetype?: ConceptualArchetype`, optional `promptLines?: string[]` (structured lines for *Spot the Glitch*), and expand `type` to include `'LOCK'` and `'SHIELD_BREAK'`.
  - `Chest`: expand `type` to `'RED' | 'BLUE'` plus `locked?: boolean`.
  - `Enemy`: add `isApex?: boolean`, `shieldLayers?: number`, `maxShieldLayers?: number`.
- [x] **Split Focus Scan from Emergency Heal (`mathEngine.ts`, `combatLogic.ts`):**
  - Wire conceptual combat actions to the **active tier's conceptual generator** (replacing the static 5-question pool).
  - Separate **Focus Scan** (1 free/low-FP conceptual check per battle that builds `+FP` or cracks a Logic Shield, without healing HP) from **Emergency Heal** (`MEDITATION_FP_COST`, restores HP) so lowering the conceptual threshold never creates an infinite-heal exploit.

### Distance-Aware MapGen & Spiral Sequencing (`src/lib/mapGen.ts`, `src/lib/dungeonLogic.ts`)
- [x] **Full BFS Distance Map from `(0, 0)`:** Extend existing reachability checks to compute exact shortest-path distance to every reachable tile.
- [x] **Safe Spawn Buffer:** Never place enemies within BFS distance ≤ 2 of `(0, 0)` so players cannot be ambushed on step 1.
- [x] **Far-Zone Exit Node:** Place the Exit Node in the furthest BFS distance quartile (minimum distance ≥ `gridSize`, e.g., ≥ 8–10 tiles) so players cannot skip a floor in 2 moves.
- [x] **Off-Path Blue Caches (Conceptual Locks):** Place 1–2 locked **Blue Caches** off the shortest path to the Exit as optional risk/reward detours; opening one requires solving a single tier-matched conceptual prompt (granting a strong buff, Hint Pack, or Neural Chip unlock in Phase 5).
- [x] **Spiral Variant & Concept-First Sequencing:**
  - **Floor 1 (Concept Primer):** Guarantee a Blue Cache introducing the sector's core conceptual anchor alongside Variant 1 Sentinels.
  - **Floors 2–4 (75/25 Spiral Review):** Spawn ~75% of the floor's featured variant + ~25% spiral review from earlier variants in the same sector (spaced retrieval before Floor 5).
  - **Floor 5 (Apex Breach Gatekeeper):** Reduce hallway clutter to **1–2 guard Sentinels + 1 Two-Phase Apex Boss** guarding the Exit Node:
    - **Exit Anchoring:** Keep `isApex` stationary/leashed at the Exit approach (or lock the Floor 5 Exit Node until the Apex Boss is defeated) so `stepEnemies` never lets players kite the boss aside and skip it.
    - *Phase 1 — Logic Shield (Conceptual Break):* 1–2 rapid tier-matched conceptual checks crack the boss's shield and apply **Vulnerable (2× damage)**.
    - *Phase 2 — Core Breach (Combo Chain):* Multi-step Combo Chain (or Direct Strike) defeats the Apex Boss.
- [x] **Expand `mapGen.test.ts`:** Add automated tests verifying Safe Spawn Buffer (enemy distance ≥ 3), Far-Zone Exit distance, Blue Cache reachability, Floor 5 Apex anchoring, and 75/25 spiral variant distribution.

### UI & Presentation Layer
- [x] **Multi-Line *Spot the Glitch* Card (`ProblemPromptCard`):**
  - Render `problem.promptLines` as a clean, left-aligned numbered step list (e.g., `Step 1: ...`, `Step 2: ...`, `Step 3: ...`) paired with `[A] / [B] / [C]` choice buttons instead of cramming it into a single centered line.
  - Ensure `THE_BLUR` neural scar effect never renders multi-line conceptual text illegible/inaccessible.
- [x] **Dungeon Grid & Legend Updates (`Dungeon.tsx`):**
  - Add a distinct cyan/blue **Blue Cache** tile icon, a **7th Map Legend item**, and a distinct **Apex Boss crown/badge** on Floor 5 so players read patrol vs. boss vs. conceptual cache at a glance.
- [x] **Lightweight Blue Cache `LockModal`:**
  - Opening a Blue Cache triggers a focused, fast **Lock Modal** reusing `ProblemInputRouter` + `useCombatInput` (no HP/FP arena or `Battle Start` delay).
  - **Failure Rule:** Missing a Blue Cache lock deals minor static feedback (`-5 HP`) and lets the player retry or close the modal without permanently destroying the cache.
- [x] **Apex Boss Logic Shield Bar (`Combat.tsx`):**
  - Render a segmented **Logic Shield** bar above the Apex Boss's `INT` bar with a clear phase transition banner (`SHIELD BROKEN — 2× VULNERABLE`) when Phase 1 completes.
- [x] **Free Conceptual Scar Calibration (`DiveStation.tsx`):**
  - Add a **"Recalibrate (Free · 0/3)"** modal alongside **"Repair (50 Shards)"** for Neural Scars: pass 3 consecutive conceptual checks from unlocked tiers to clear a scar through mastery.
- [x] **Update `ManualStation.tsx`:** Document Blue Caches, Logic Shields, Apex Breaches, Focus Scan, and free Scar Recalibration.

### Player Input & Ergonomics
- [x] **Fast Keyboard Shortcuts on `RelationshipInput` (`useCombatInput.ts`, `RelationshipInput.tsx`):**
  - Add visible single-key badges (`[1]` / `[2]` / `[3]` or `[A]` / `[B]` / `[C]`, alongside `<`, `=`, `>`, `≤`, `≥`) so *Benchmark `< / = / >`* conceptual prompts don't require `Shift` combos or untypable `≤`/`≥` keys on Chromebooks/desktops.

### Playtest Gate 3: "The Floor Arc & Conceptual Discoverability Test"
- **Format:** Full 5-floor run playtest (Sector 1 and Sector 2/3) with 3–5 players of mixed ability.
- **What to Observe:**
  - Does every floor feel like an intentional journey from spawn to Exit (no instant 2-step exits, no unfair turn-1 ambushes)?
  - Do players willingly detour to Blue Caches, and does the lightweight Lock Modal feel fast and rewarding?
  - Are *Spot the Glitch* cards and *Benchmark `< / = / >`* prompts immediately readable and snappy on keyboard and touch?
  - Did every player encounter ≥ 3 tier-relevant conceptual questions *without* being coached where to look?
  - Does Floor 5 (1–2 guards + Exit-anchoring Apex Boss with Logic Shield) feel climactic without dragging?
  - Did scarred players try free Conceptual Scar Calibration?
- **Exit Criteria to Advance:**
  - 100% of testers naturally engage with conceptual checks in a single 5-floor run.
  - Conceptual prompts average ≤ 10 seconds per answer with ≥ 70% comprehension on first exposure.
  - Floor 5 feels distinct, fair, and exciting; zero map-layout complaints.

---

## Phase 4: Companion Mode — "Signal Sweep" Recon Terminal (Brainstorm D)

**Goal:** Give players (and classrooms) a dedicated, ultra-fast, zero-paper conceptual warm-up mode in the Cradle Bunker that feeds tangible rewards into their next dungeon dive.

### Data & Persistence
- [ ] **Save Schema & Allow-List Update (`src/lib/storage.ts`, `src/types.ts`):**
  - Bump `SAVE_SCHEMA_VERSION` and explicitly add `activeReconBuff` (consumed on next dive), `reconRewardAvailable` (anti-farming flag), and archetype accuracy stats to both `hydrateSaveData()` and the `toPersistedSaveData()` strict PII allow-list.

### Gameplay & UI (`SignalSweep.tsx`, `SimulatorStation.tsx`, `Dungeon.tsx`)
- [ ] **Build `SignalSweep.tsx` inside `SimulatorStation.tsx`:**
  - Mount Signal Sweep as a dedicated tab inside `SimulatorStation.tsx` (avoiding extra stations on the 5×5 `HomeBase` grid).
  - **10-Node Rapid Conceptual Sprint** pulling tier-matched conceptual archetypes from all tiers the player has reached, displaying a clean 10-pip progress bar.
  - Optional **"Arcade Timer"** toggle vs. **"Relaxed Focus" (untimed)** mode so time-sensitive learners aren't stressed.
  - End-of-sprint **Accuracy Streak** & **Archetype Breakdown** scorecard (e.g., *Estimation: 3/3 · Spot the Glitch: 2/3*).
- [ ] **Connect Signal Sweep Rewards to Dungeon Runs (Anti-Farm Gated):**
  - Completing a Signal Sweep (≥ 70% accuracy) opens a 1-of-3 **Recon Buff** picker (*Start with +20 FP*, *+15% Shard Extraction*, or *1 Free Shield Charge*).
  - Limit rewarded Recon Buffs to **1 per completed dive** (additional sweeps remain playable for warm-up/high-score practice).
  - Display the armed Recon Buff clearly in `DiveStation` and the `Dungeon` HUD until consumed.

### Player Input & Ergonomics
- [ ] **Keyboard-Complete Sprint Flow:** Reuse `ProblemInputRouter` + `useCombatInput` (with `e.repeat` protection) for all 10 nodes, plus `1–3` / `Enter` keyboard selection for the post-run Recon Buff picker.

### Playtest Gate 4: "The 3-Minute Warm-Up & Retention Test"
- **Format:** Test Signal Sweep both as a standalone 3-minute session and immediately before a 5-floor dungeon dive.
- **What to Observe:**
  - Is Signal Sweep fun enough to play on its own for 3 minutes?
  - Do players feel the Recon Buff noticeably improves their subsequent dive without breaking Sector 1–3 difficulty balance?
  - Does doing a conceptual warm-up reduce errors on the actual procedural dungeon run right afterward?
- **Exit Criteria to Advance:**
  - Players voluntarily replay Signal Sweep or run it before diving.
  - Clear observation of which conceptual archetypes land best before scaling them to Tiers 13–20.

---

## Phase 5: Lightweight Meta-Progression — Neural Loadout Chips & Mastery

**Goal:** Deliver meaningful RPG build identity, extraction motivation, and learner differentiation **without** a second currency, branching skill tree UI, or letting players opt out of either conceptual or procedural math.

### Data & Persistence (`src/types.ts`, `src/lib/storage.ts`)
- [ ] **Extend `PlayerStats` & Save Allow-List (`SAVE_SCHEMA_VERSION`):**
  - Add `unlockedChips: string[]`, `equippedChips: string[]` (max 2 slots), and `sectorMastery: Record<number, { proceduralCorrect: number; conceptualCorrect: number }>` to `hydrateSaveData()` and `toPersistedSaveData()` with safe defaults for existing saves.

### Gameplay & Loadout Chips (Single-Currency / Milestone Unlocks)
- [ ] **Neural Loadout Chip System** (1–2 chips equipped at `DiveStation.tsx` before each dive; unlocked via Sector Apex clears, Blue Caches, or Signal Sweep milestones):
  - **Overclock Chip:** `+50%` Direct Strike Shard bonus and faster FP gain; still requires conceptual Focus Scans/Shield Breaks on Apex Bosses.
  - **Pattern Lens:** Conceptual Shield Breaks deal heavy direct damage and unlock *Counter-Hack Parry* on misses (answer a quick conceptual recovery prompt to halve counter-damage).
  - **Sync Matrix:** Alternating Conceptual Setup → Procedural Strike builds a **Sync Multiplier** and converts leftover FP into bonus Shards upon extraction.
  - **Structural Sight:** Automatically surfaces `step.clue` on Step 1 of `COMBO` problems without spending a Hint Pack.
  - **Neural Dampener:** Reduces Neural Scar infliction chance on defeat and softens `THE_BLUR` / `CALCULATION_LAG` penalties.
- [ ] **Fix `GardenStation.tsx` & Rebalance Drop Costs:**
  - Tie `GardenStation.tsx` restoration percentage to **lifetime extracted Shards / Sector Mastery** instead of current unspent `stats.knowledge` so buying Workbench upgrades never regresses the garden.
  - Tune floor-drop costs (`getDiveCost`) and Workbench upgrade prices so progression stays brisk through Floor 60.

### UI, Engineering Hygiene & Presentation Layer
- [ ] **Loadout Chip Picker (`DiveStation.tsx`):** Clean 2-slot chip selector below the Floor selector with 1-sentence effect summaries and unlock hints for locked chips.
- [ ] **Mastery Readout (`HomeBase.tsx` / `ArchivistStation.tsx`):** Add a compact **Sector Mastery** view (Procedural vs. Conceptual accuracy per Sector) for self-directed learners, teachers, and parents.
- [ ] **Code-Splitting & Component Tests:** Add `manualChunks` / `React.lazy` splitting (the production bundle is already >500 kB) and component-level UI tests (`@testing-library/react`) for `Combat`, `TrainingSim`, and `TitleScreen` before Phase 6.

### Playtest Gate 5: "Build Diversity & Extraction Motivation Test"
- **Format:** Multi-session playtest (2–3 dives across a few days) letting players experiment with different Neural Loadout Chip pairings.
- **What to Observe:**
  - Do different learners gravitate to different chip pairings (e.g., *Pattern Lens* vs. *Overclock Chip*) while still engaging both conceptual and procedural math?
  - Do players actively hunt Blue Caches and Apex Bosses to unlock new chips?
  - Are Shard earn/spend rates well-paced across multiple dives?
- **Exit Criteria to Advance:**
  - Players clearly articulate *why* they equipped their chosen chips.
  - Menu overhead between dives stays under ~30 seconds.

---

## Phase 6: Deep Sub-Strata Expansion (Category 6 — Tiers 13–20 & Advanced Inputs)

**Goal:** Build Tiers 13–20 (Floors 61–100 from `curriculum-extension-plan.md`) *native* to the new architecture from day one—so every new tier launches with Friendly Numbers, Combo Chains, Conceptual Generators, distance-aware floor layouts, and targeted tactile inputs already baked in.

### Generators, UI & Standardized Input Pipeline (`input_roadmap.md` Alignment)
- [ ] **Native Tiers 13–20 Generators:** Author procedural + conceptual generators for Tiers 13–20 using mental-friendly bounds, `complexity: 'QUICK' | 'COMBO'`, self-contained `MathStep` breadcrumbs/clues, and tier-matched conceptual archetypes from day one.
- [ ] **De-Risked Advanced Inputs via the 5-File Pipeline:** Prefer **structured slot-based templates** over brittle free-text expression parsing (`ALGEBRA_EXPR` slots like `[__](x + [__])` and `y = [__]x + [__]`, `RADICAL_EXP` slots like `[__] × 10^[__]`, `SLOPE_GRAPH` Interactive Slope-Intercept / Transformation Grid, and `SYSTEMS` Multi-Line `(x, y)` Terminal):
  1. Register in `InputType` union (`src/types.ts`).
  2. Add inference rules in `inferInputType()` (`src/lib/inputUtils.ts`).
  3. Add deterministic slot/equivalence grading + unit tests in `src/lib/answerValidator.ts`.
  4. Build responsive touch/desktop input widget in `src/components/inputs/` and mount in `ProblemInputRouter.tsx`.
  5. Add full keyboard accessibility in `src/hooks/useCombatInput.ts` (including arrow-key point placement & toggle for `SLOPE_GRAPH` so keyboard and touch parity is preserved).

### Playtest Gate 6: "Grade 7–8 Capstone Validation"
- Verify that advanced algebra, functions, systems, and geometric transformations preserve the fast, tactile, paper-free game feel, keyboard/touch ergonomics, and balanced 5-floor pacing established in Phases 1–5.

---

## Quick-Reference Summary

| Phase | Core Focus | Generators & Data | UI & Input Highlights | Playtest Question Answered |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Friendly Numbers & Core Fixes** (Prop. 5) | Phase 1A fixes (FP copy, T1 V4 negative step, F5→F6 unlock, F60 cap, playtest telemetry); rewrite scratch-paper hit list; `QUICK`/`COMBO` tags + fuzz tests | Clean baseline + quantitative JSON telemetry | *"Can hallway fights be played without pencil and paper?"* |
| **2** | **Combo Chains, UI & Input Ergonomics** (Prop. 2) | Self-contained step prompts; `MathStep.clue` & `resultLabel`; mid-chain miss & `ATK_UP` rules; progressive 2–5 patrol & Shard balance | Shared `ProblemPromptCard` + Breadcrumb + Combo Pips; `strikeMode` Direct Strike toggle; faster patrol intros; `e.repeat` + modifier guards; Fraction `Enter` auto-advance; `Shift+D/H/F` hotkeys | *"Does combat feel as fast as it looks, with zero step-context or input friction?"* |
| **3** | **Conceptual Core + Distance-Aware MapGen** (Prop. 1 + A/E) | `conceptual.ts` (2–3 archetypes/tier, T1–12); Focus Scan vs. Heal split; BFS spawn buffer, far Exit, Blue Caches, 75/25 spiral, Exit-anchored Floor 5 Apex Boss | Multi-line *Spot the Glitch* card; Blue Cache tile/Legend/`LockModal`; Apex Shield Bar; Free Scar Calibration; single-key `RelationshipInput` shortcuts | *"Do floors have a great spatial arc and effortless conceptual discovery?"* |
| **4** | **Signal Sweep Mode** (Brainstorm D) | `SAVE_SCHEMA_VERSION` allow-list update (`activeReconBuff`, `reconRewardAvailable`, archetype stats) | Signal Sweep tab inside `SimulatorStation.tsx`, Timer/Relaxed toggle, 1-per-dive Recon Buff picker & HUD badge; full keyboard flow | *"Is pure conceptual fluency fun in a 3-minute sprint?"* |
| **5** | **Neural Loadout Chips & Mastery** | `unlockedChips`, `equippedChips`, `sectorMastery` allow-list migration; `GardenStation` lifetime fix | 2-slot Chip Picker (`DiveStation`); Sector Mastery readout; code-splitting + component tests | *"Do loadout chips deepen build identity without menu bloat or avoidance?"* |
| **6** | **Deep Sub-Strata** (Cat. 6) | Native Friendly + Combo + Conceptual Tiers 13–20 | 5-file `InputType` pipeline for structured Algebra/Radical slots, Interactive Graph (keyboard parity), Systems Terminal | *"Does the system scale cleanly to 8th-grade math?"* |
