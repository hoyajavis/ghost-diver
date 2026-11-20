# Phased Gameplay, Pacing & Conceptual Fluency Roadmap

**Date:** 2026-11-19  
**Design Pillars:** Proposal 5 (Friendly Numbers) + Proposal 2 (Combo Chains & Direct Strike) + Proposal 1 (Skirmishes vs. Boss Breaches) + Conceptual Fluency Integration (see `conceptual-fluency-brainstorm.md`) + Distance-Aware Level Generation & Economy Rebalancing  
**Target Audience:** Grades 4–8 (ages 9–14), playable on desktop/Chromebook and touch devices without physical pencil and paper.

---

## Core North Star

> **Every individual player input in standard combat should be solvable mentally in 3–12 seconds.**  
> Deep, multi-step mathematics stays in the game—not by forcing scratch paper, but by turning multi-step problems into rhythmic **Combo Chains** anchored by **Conceptual Checks**, **distance-aware floor pacing**, **frictionless input ergonomics**, and **Floor 5 Apex Breaches**.

Each phase below ends with a **mandatory Playtest Gate**. Do not start the next phase until the playtest observations validate the feel, pacing, and balance of the current one.

---

## Phase 1: Baseline Feel — "Mental-Math Friendly" Tuning (Proposal 5)

**Goal:** Eliminate sudden pencil-and-paper frustration spikes in Tiers 1–12 *before* changing core combat rules, so we have a fair baseline to measure against.

### Generators & Data Contracts
- [ ] **Rewrite specific scratch-paper offenders** across `src/lib/generators/arithmetic.ts`, `preAlgebra.ts`, and `modeling.ts`:
  - **`arithmetic.ts` Tier 1 V3 & V4:** Replace arbitrary 3-digit ± 3-digit (`100..999 ± 100..999`, 4 rounding steps) with compatible/mental-friendly numbers (e.g., multiples of 10/25/50 or clean compensation pairs).
  - **`arithmetic.ts` Tier 3 V1:** Replace arbitrary 2-digit × 2-digit (`10..99 × 10..99`, e.g., `87 × 69`) with mental-friendly products (2-digit × 1-digit, clean multiples of 10/5, or small distributive pairs like `14 × 12`).
  - **`arithmetic.ts` Tier 3 V2:** Replace 3-digit quotient long division (`quotient 100..999`, 6 hint steps) with crisp 2-digit mental-quotient division (2–3 steps max).
  - **`arithmetic.ts` Tier 4 V2 & Tier 5 V3:** Restrict fraction denominators to friendly sets (`2, 3, 4, 5, 6, 8, 10, 12`) with LCM ≤ 24; eliminate coprime pairs like `7` and `9` on standard Sentinels.
  - **`preAlgebra.ts` Tier 6 V1 & V2:** Replace arbitrary hundredths (`10.01..99.99`) and arbitrary decimal products (`8.7 × 6.9`) with clean halves, quarters, fifths, and tenths (`0.2`, `0.25`, `0.5`, `0.75`, `1.2`).
  - **`preAlgebra.ts` Tier 10 V3 (Area of Triangle):** Ensure at least one of `base` or `height` is even so `(b × h) / 2` resolves cleanly to an integer without unexpected `.5` friction.
  - **Equations & Statistics (Tiers 9–10):** Keep datasets to 3–5 small integers with integer means; keep variable coefficients small (`2`–`9`) with clean integer solutions.
- [ ] **Classify `complexity: 'QUICK' | 'COMBO'` on `MathProblem` (`src/types.ts`):**
  - Tag true 1-step variants (including existing single-step generators such as `arithmetic.ts` Tier 2 V2/V3 multi-select, `preAlgebra.ts` Tier 6 V1–V3, Tier 7 V2, Tier 8 V3, Tier 9 V4, and `modeling.ts` Tier 12 V1) as `'QUICK'` so they never get wrapped in a redundant 1-step Combo Chain.
  - Give genuine multi-step problems that currently only have 1 step (such as `modeling.ts` Tier 12 V2 division) a clean 2–3 step chain and tag them `'COMBO'`.
- [ ] **Update generator fuzz tests** (`src/lib/__tests__/generators.test.ts`) to assert denominator/LCM/magnitude bounds and valid `complexity` tagging across all Tiers 1–12.

### Playtest Gate 1: "The No-Paper Stress Test"
- **Format:** 10–15 minute solo or 2–3 student playtest across Tiers 1, 4, 6, 9, and 12 (using both Dungeon dives and Training Sim).
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
- [ ] **Fix Context-Dependent Step Prompts across Tiers 1–12:**
  - Audit and rewrite step prompts that currently omit the problem's numbers/context (e.g., `arithmetic.ts` T4 V3/V4 `"IDENTIFY SHARED DENOMINATOR"`, T5 V5 `"IDENTIFY CONVERSION FACTOR"`; `preAlgebra.ts` T7 V1 `"IDENTIFY FIRST QUANTITY"`, T8 V1 `"SIGN OF RESULT?"`, T10 V1–V4 `"SUBTRACT b FROM BOTH SIDES"` / `"SUM ALL 5 VALUES"`; `modeling.ts` T12 V1 `"ALIGN DECIMALS AND ADD"`).
- [ ] **Extend `MathStep` (`src/types.ts`):**
  - Add optional `clue?: string` (formula/strategy clue surfaced by repurposed Hint Packs and Training Sim).
  - Add optional `resultLabel?: string` (compact breadcrumb label rendered after a step succeeds, e.g., `LCD = 12`, `3x = 18`).

### Combat Logic & Encounter Balance (`combatLogic.ts`, `dungeonLogic.ts`)
- [ ] **Explicit `strikeMode: 'COMBO' | 'DIRECT'` State:**
  - Replace the overloaded `hintStepIndex !== null` flag in `Combat.tsx` with explicit `strikeMode` state.
  - Multi-step (`complexity: 'COMBO'`) problems start in `'COMBO'` mode by default: each step lands a fast strike (`2×`, `3×` combo) with incremental Sentinel INT damage.
  - Single-step (`complexity: 'QUICK'`) problems remain immediate 1-hit strikes.
  - Missing a **Direct Strike** deals normal counter-damage and **falls back to Step 1 of the Combo Chain on the same problem** (rather than discarding the problem).
- [ ] **Repurpose Hint Packs into Tactical Combat Tools:**
  - Convert Hint Packs into proactive tactical actions: *Formula Clue / Auto-Clear Current Step* or *Shield Pulse* (absorbs the next counter-hit).
- [ ] **Rebalance Patrol Sentinel HP, Density & Shard Economy:**
  - Tune standard patrol Sentinel HP so each hallway fight resolves in **1 full Combo Chain or 1–2 Quick Strikes** (~15–25 seconds per battle) instead of 3–4 repetitive full problems.
  - Tighten standard floor enemy density to **3–5 Sentinels** (down from up to 8) so a full floor clears in ~1.5–2 minutes.
  - Calibrate base Shard rewards & Direct Strike `+50%` bonus against Workbench upgrade costs to prevent Shard inflation.
  - Tune Sentinel counter-damage slightly to preserve extraction tension once unfair scratch-paper misses are removed.
- [ ] **Polish Combat Feedback Timing:**
  - Speed up successful combo-step transitions to `400ms–500ms` while keeping the `1800ms` expected-answer reveal on misses.

### UI & Presentation Layer
- [ ] **Pinned Original-Problem Header + Live Solved-Step Breadcrumb (`Combat.tsx`):**
  - Never replace `problem.question` when in Combo Chain mode; render:
    1. **Pinned Original Problem** at the top of the terminal card.
    2. **Solved-Step Breadcrumb** showing intermediate values earned so far (e.g., `LCD: 12 → 1/4 = 3/12 → 5/6 = 10/12`).
    3. **Active Step Prompt** + **Combo Step Pip Bar** (`Step 2/3 · 2× Combo`).
- [ ] **Direct Strike Toggle & Repurposed `CombatActionBar`:**
  - Show a crisp `[Direct Strike · 1-Shot · +50% Shards]` toggle on `COMBO` problems **only before Step 1 is submitted**.
  - Update `CombatActionBar.tsx` labels, icons, and disabled states for the repurposed Tactical Hint / Shield tool.
- [ ] **Snappier Patrol Battle Intros (`Combat.tsx`):**
  - Shorten standard patrol `Battle Start` overlay from `1200ms` to `450ms–600ms` (or allow keypress/tap skip), reserving the full dramatic `1200ms` intro for Floor 5 Apex Bosses.
- [ ] **Align `TrainingSim.tsx` & `ManualStation.tsx`:**
  - Give `TrainingSim.tsx` an untimed **Combo Chain vs. Direct Strike** mode toggle (plus visible `step.clue` support) so it stays distinct and useful once Combo Chains are default in combat.
  - Update `ManualStation.tsx` to explain Combo Chains, Direct Strike, and Tactical Hint Packs.

### Player Input & Ergonomics (`useCombatInput.ts`, `ProblemInputRouter.tsx`, `FractionInput.tsx`)
- [ ] **Fast-Combo Keyboard Safety (`useCombatInput.ts`):**
  - Add `if (e.repeat) return;` to the global keydown handler so held keys never double-submit or bleed across `400ms` combo-step transitions.
  - Reset `input`, `fractionInput`, `fractionFocus`, and `selectedOptions` atomically with step advancement.
- [ ] **`FractionInput` Keyboard Flow (`useCombatInput.ts`):**
  - Pressing `Enter` while `fractionFocus === 'num'` and `den` is empty auto-advances focus from `num → den` (and submits once both fields are populated), matching `Tab` / `/` / `:` ergonomics.
- [ ] **Stable Touch Layout Across Step Transitions (`ProblemInputRouter.tsx`):**
  - Maintain a consistent input-stage height/alignment when a Combo Chain switches mid-problem from integer `NumberPad` steps to `FractionInput` so the primary Submit button never jumps under the player's thumb on mobile/tablet.
- [ ] **Non-Colliding Tactical Action Hotkeys (`useCombatInput.ts`):**
  - Add optional keyboard shortcuts for Direct Strike, Tactical Hint/Shield, and Focus/Meditation using modifier/function keys (`Shift+D`, `Shift+H`, `Shift+F` or `F1–F3` with button hints)—never binding bare `A–D` or `1–9`, which belong to answer inputs.

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
- [ ] **Create Tier-Mapped Conceptual Generator Module (`src/lib/generators/conceptual.ts`):**
  - Build fast, paper-free conceptual prompts for **Tiers 1–12** using the 7 arcade archetypes:
    1. *Magnitude & Estimation* (closest power of 10 / reasonable product)
    2. *Benchmark `< / = / >`* (e.g., is `5/8 + 4/9` less than, equal to, or greater than `1`?)
    3. *Spot the Glitch* (error analysis on a Sentinel's broken 2–3 step solution)
    4. *First-Step Strategy* (best operation to isolate a variable or simplify)
    5. *Sign & Behavior Prediction* (sign of products/quotients/differences without computing)
    6. *Equivalence & Structure* (distributive/commutative/inverse structure matching)
    7. *Visual / Quadrant Intuition* (quadrant identification, axis behavior)
- [ ] **Expand Domain Types (`src/types.ts`):**
  - `MathProblem`: add `category?: 'PROCEDURAL' | 'CONCEPTUAL'`, `archetype?: ConceptualArchetype`, optional `promptLines?: string[]` (structured lines for *Spot the Glitch*), and expand `type` to include `'LOCK'` and `'SHIELD_BREAK'`.
  - `Chest`: expand `type` to `'RED' | 'BLUE'` plus `locked?: boolean`.
  - `Enemy`: add `isApex?: boolean`, `shieldLayers?: number`, `maxShieldLayers?: number`.
- [ ] **Fix Meditation Generation:**
  - Wire `MEDITATION` (`mathEngine.ts`) to draw from the **active tier's conceptual generator** (replacing the static 5-question pool) and lower its threshold (`15 FP` or 1 free "Focus Scan" per battle).

### Distance-Aware MapGen & Spiral Sequencing (`src/lib/mapGen.ts`, `src/lib/dungeonLogic.ts`)
- [ ] **Full BFS Distance Map from `(0, 0)`:** Extend existing reachability checks to compute exact shortest-path distance to every reachable tile.
- [ ] **Safe Spawn Buffer:** Never place enemies within BFS distance ≤ 2 of `(0, 0)` so players cannot be ambushed on step 1.
- [ ] **Far-Zone Exit Node:** Place the Exit Node in the furthest BFS distance quartile (minimum distance ≥ `gridSize`, e.g., ≥ 8–10 tiles) so players cannot skip a floor in 2 moves.
- [ ] **Off-Path Blue Caches (Conceptual Locks):** Place 1–2 locked **Blue Caches** off the shortest path to the Exit as optional risk/reward detours; opening one requires solving a single tier-matched conceptual prompt (granting a strong buff, Hint Pack, or Insight Core in Phase 5).
- [ ] **Spiral Variant & Concept-First Sequencing:**
  - **Floor 1 (Concept Primer):** Guarantee a Blue Cache introducing the sector's core conceptual anchor alongside Variant 1 Sentinels.
  - **Floors 2–4 (75/25 Spiral Review):** Spawn ~75% of the floor's featured variant + ~25% spiral review from earlier variants in the same sector (spaced retrieval before Floor 5).
  - **Floor 5 (Apex Breach Gatekeeper):** Reduce hallway clutter to **1–2 guard Sentinels + 1 Two-Phase Apex Boss** positioned adjacent to / guarding the approach to the Exit Node:
    - *Phase 1 — Logic Shield (Conceptual Break):* 1–2 rapid tier-matched conceptual checks crack the boss's shield and apply **Vulnerable (2× damage)**.
    - *Phase 2 — Core Breach (Combo Chain):* Multi-step Combo Chain (or Direct Strike) defeats the Apex Boss.
- [ ] **Expand `mapGen.test.ts`:** Add automated tests verifying Safe Spawn Buffer (enemy distance ≥ 3), Far-Zone Exit distance, Blue Cache reachability, Floor 5 Apex placement, and 75/25 spiral variant distribution.

### UI & Presentation Layer
- [ ] **Multi-Line *Spot the Glitch* Card (`Combat.tsx` / shared Problem Card):**
  - Render `problem.promptLines` as a clean, left-aligned numbered step list (e.g., `Step 1: ...`, `Step 2: ...`, `Step 3: ...`) paired with `[A] / [B] / [C]` choice buttons instead of cramming it into a single centered line.
  - Ensure `THE_BLUR` neural scar effect never renders multi-line conceptual text illegible/inaccessible.
- [ ] **Dungeon Grid & Legend Updates (`Dungeon.tsx`):**
  - Add a distinct cyan/blue **Blue Cache** tile icon, a **7th Map Legend item**, and a distinct **Apex Boss crown/badge** on Floor 5 so players read patrol vs. boss vs. conceptual cache at a glance.
- [ ] **Lightweight Blue Cache `LockModal`:**
  - Opening a Blue Cache triggers a focused, fast **Lock Modal** reusing `ProblemInputRouter` + `useCombatInput` (no HP/FP arena or `Battle Start` delay).
- [ ] **Apex Boss Logic Shield Bar (`Combat.tsx`):**
  - Render a segmented **Logic Shield** bar above the Apex Boss's `INT` bar with a clear phase transition banner (`SHIELD BROKEN — 2× VULNERABLE`) when Phase 1 completes.
- [ ] **Free Conceptual Scar Calibration (`DiveStation.tsx`):**
  - Add a **"Recalibrate (Free · 0/3)"** modal alongside **"Repair (50 Shards)"** for Neural Scars: pass 3 consecutive conceptual checks from unlocked tiers to clear a scar through mastery.
- [ ] **Update `ManualStation.tsx`:** Document Blue Caches, Logic Shields, Apex Breaches, Focus Scan, and free Scar Recalibration.

### Player Input & Ergonomics
- [ ] **Fast Keyboard Shortcuts on `RelationshipInput` (`useCombatInput.ts`, `RelationshipInput.tsx`):**
  - Add visible single-key badges (`[1]` / `[2]` / `[3]` or `[A]` / `[B]` / `[C]`, alongside `<`, `=`, `>`, `≤`, `≥`) so *Benchmark `< / = / >`* conceptual prompts don't require `Shift` combos or untypable `≤`/`≥` keys on Chromebooks/desktops.

### Playtest Gate 3: "The Floor Arc & Conceptual Discoverability Test"
- **Format:** Full 5-floor run playtest (Sector 1 and Sector 2/3) with 3–5 players of mixed ability.
- **What to Observe:**
  - Does every floor feel like an intentional journey from spawn to Exit (no instant 2-step exits, no unfair turn-1 ambushes)?
  - Do players willingly detour to Blue Caches, and does the lightweight Lock Modal feel fast and rewarding?
  - Are *Spot the Glitch* cards and *Benchmark `< / = / >`* prompts immediately readable and snappy on keyboard and touch?
  - Did every player encounter ≥ 3 tier-relevant conceptual questions *without* being coached where to look?
  - Does Floor 5 (1–2 guards + Exit-guarding Apex Boss with Logic Shield) feel climactic without dragging?
  - Did scarred players try free Conceptual Scar Calibration?
- **Exit Criteria to Advance:**
  - 100% of testers naturally engage with conceptual checks in a single 5-floor run.
  - Conceptual prompts average ≤ 10 seconds per answer with ≥ 70% comprehension on first exposure.
  - Floor 5 feels distinct, fair, and exciting; zero map-layout complaints.

---

## Phase 4: Companion Mode — "Signal Sweep" Recon Terminal (Brainstorm D)

**Goal:** Give players (and classrooms) a dedicated, ultra-fast, zero-paper conceptual warm-up mode in the Cradle Bunker that feeds tangible rewards into their next dungeon dive.

### Data & Persistence
- [ ] **Save Schema Migration (`src/lib/storage.ts`, `src/types.ts`):**
  - Bump `SAVE_SCHEMA_VERSION` with backward-compatible defaults for `activeReconBuff` (consumed on next dive) and lightweight archetype accuracy stats.

### Gameplay & UI (`SignalSweep.tsx`, `HomeBase.tsx`, `Dungeon.tsx`)
- [ ] **Build Dedicated `SignalSweep.tsx` Mode** (accessible from the Combat Simulator or a dedicated Recon tab in the Cradle Bunker):
  - **10-Node Rapid Conceptual Sprint** pulling tier-matched conceptual archetypes from all tiers the player has reached, displaying a clean 10-pip progress bar.
  - Optional **"Arcade Timer"** toggle vs. **"Relaxed Focus" (untimed)** mode so time-sensitive learners aren't stressed.
  - End-of-sprint **Accuracy Streak** & **Archetype Breakdown** scorecard (e.g., *Estimation: 3/3 · Spot the Glitch: 2/3*).
- [ ] **Connect Signal Sweep Rewards to Dungeon Runs:**
  - Completing a Signal Sweep (≥ 70% accuracy) opens a 1-of-3 **Recon Buff** picker (*Start with +20 FP*, *+15% Shard Extraction*, or *1 Free Shield Charge*).
  - Display the armed Recon Buff clearly in `HomeBase` (`DiveStation`) and the `Dungeon` HUD until consumed.

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

## Phase 5: RPG Meta-Progression — Diver Classes & Dual-Axis Skill Tree (Brainstorm B & C)

**Goal:** Once pacing, map layout, Combo Chains, and the Conceptual Bank are playtest-proven, layer deep RPG build identity and dual-currency balance onto the Cradle Bunker.

### Data & Persistence (`src/types.ts`, `src/lib/storage.ts`)
- [ ] **Extend `PlayerStats` & Save Migration (`SAVE_SCHEMA_VERSION`):**
  - Add `insightCores`, `activeClass: 'STRIKER' | 'ANALYST' | 'ARCHITECT'`, `unlockedSkills: string[]`, and `sectorMastery: Record<number, { proceduralCorrect: number; conceptualCorrect: number }>` with safe defaults for existing save slots.

### Gameplay & Economy
- [ ] **Diver Class System** (selectable/switchable at the Neural Chair before each dive):
  - **Striker (Execution Focus):** Bonus damage & Shards on Direct Strikes and quick procedural kills; builds FP faster on combos.
  - **Analyst (Conceptual Focus):** Conceptual Shield Breaks deal heavy direct damage; unlocks *Counter-Hack Parry* on misses (answer a quick conceptual recovery question to halve damage); auto-simplifies complex problems into Combo Chains.
  - **Architect (Hybrid Tactician):** Alternating Conceptual Setup → Procedural Strike triggers a **Sync Multiplier**; converts leftover FP into bonus Shards upon extraction at a Secure Node.
- [ ] **Dual-Axis Neural Skill Tree:**
  - **Execution Track (Knowledge Shards):** HP/FP caps, Direct Strike crit bonus, floor-drop cost discounts.
  - **Insight Track (Insight Cores earned from Blue Caches, Boss Shield Breaks, & Signal Sweeps):**
    - *Estimation Lens* (narrows/highlights bounds or eliminates 1 wrong choice)
    - *Structural Sight* (shows GCF/LCD or operation cue automatically on Step 1)
    - *Neural Dampener* (reduces Neural Scar chance on defeat)
- [ ] **Economy & Drop-Cost Rebalance Pass:** Tune Shard vs. Insight Core earn rates, floor-drop costs (`getDiveCost`), and skill-node prices so both currencies stay meaningful through Floor 60+.

### UI & Presentation Layer
- [ ] **Diver Class Selector Cards (`DiveStation.tsx`):** Clean 3-card selector with 1-sentence role identity and active class badge.
- [ ] **Dual-Axis Skill Tree (`WorkbenchStation.tsx`):** Two-column (desktop) / tabbed (mobile) layout separating **Execution [Shards]** and **Insight [Insight Cores]** tracks with clear unlock states and costs.
- [ ] **Extraction & Mastery Readouts (`Sanctuary.tsx`, `HomeBase.tsx`):**
  - Update `Sanctuary.tsx` to display **Insight Cores** earned on the run alongside Shards and Hints.
  - Add a clean **Sector Mastery** view (Procedural vs. Conceptual progress per Sector) for self-directed learners, teachers, and parents.

### Playtest Gate 5: "Build Diversity, Economy & Long-Term Motivation Test"
- **Format:** Multi-session playtest (2–3 dives across a few days) letting players experiment with different classes and skill tree paths.
- **What to Observe:**
  - Do different learners gravitate to different classes (e.g., visual/conceptual thinkers loving *Analyst*, speed calculators loving *Striker*)?
  - Does the Dual-Axis Skill Tree motivate players to seek out off-path Blue Caches and Signal Sweeps?
  - Are Shard and Insight Core earn/spend rates well-paced across multiple dives?
- **Exit Criteria to Advance:**
  - Players clearly articulate *why* they chose their Diver Class.
  - Both Execution and Insight tracks see active investment without either currency piling up unused.

---

## Phase 6: Deep Sub-Strata Expansion (Category 6 — Tiers 13–20 & Advanced Inputs)

**Goal:** Build Tiers 13–20 (Floors 61–100 from `curriculum-extension-plan.md`) *native* to the new architecture from day one—so every new tier launches with Friendly Numbers, Combo Chains, Conceptual Generators, distance-aware floor layouts, and targeted tactile inputs already baked in.

### Generators, UI & Standardized Input Pipeline (`input_roadmap.md` Alignment)
- [ ] **Native Tiers 13–20 Generators:** Author procedural + conceptual generators for Tiers 13–20 using mental-friendly bounds, `complexity: 'QUICK' | 'COMBO'`, self-contained `MathStep` breadcrumbs/clues, and tier-matched conceptual archetypes from day one.
- [ ] **Register New Advanced Inputs via the 5-File Pipeline:** For each new input (`ALGEBRA_EXPR` Algebra Bar, `RADICAL_EXP` Radical/Exponent modifiers, `SLOPE_GRAPH` Interactive Slope-Intercept / Transformation Grid, `SYSTEMS` Multi-Line Systems Terminal):
  1. Register in `InputType` union (`src/types.ts`).
  2. Add inference rules in `inferInputType()` (`src/lib/inputUtils.ts`).
  3. Add equivalence/normalized grading + unit tests in `src/lib/answerValidator.ts`.
  4. Build responsive touch/desktop input widget in `src/components/inputs/` and mount in `ProblemInputRouter.tsx`.
  5. Add full keyboard accessibility in `src/hooks/useCombatInput.ts` (including arrow-key point placement & toggle for `SLOPE_GRAPH` so keyboard and touch parity is preserved).

### Playtest Gate 6: "Grade 7–8 Capstone Validation"
- Verify that advanced algebra, functions, systems, and geometric transformations preserve the fast, tactile, paper-free game feel, keyboard/touch ergonomics, and balanced 5-floor pacing established in Phases 1–5.

---

## Quick-Reference Summary

| Phase | Core Focus | Generators & Data | UI & Input Highlights | Playtest Question Answered |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Friendly Numbers** (Prop. 5) | Fix scratch-paper hit list (T1 V3–4, T3 V1–2, T4 V2, T5 V3, T6 V1–2, T10 V3); `QUICK`/`COMBO` tags + fuzz tests | Clean baseline (no UI/input churn yet) | *"Can hallway fights be played without pencil and paper?"* |
| **2** | **Combo Chains, UI & Input Ergonomics** (Prop. 2) | Self-contained step prompts; `MathStep.clue` & `resultLabel`; 3–5 patrol & Shard balance | Pinned Problem + Breadcrumb + Combo Pips; `strikeMode` Direct Strike toggle; faster patrol intros; `e.repeat` guard; Fraction `Enter` auto-advance; stable touch height; non-colliding hotkeys | *"Does combat feel as fast as it looks, with zero step-context or input friction?"* |
| **3** | **Conceptual Core + Distance-Aware MapGen** (Prop. 1 + A/E) | `conceptual.ts` (7 archetypes, T1–12); `promptLines`; BFS spawn buffer, far Exit, Blue Caches, 75/25 spiral, Floor 5 Apex Boss | Multi-line *Spot the Glitch* card; Blue Cache tile/Legend/`LockModal`; Apex Shield Bar; Free Scar Calibration; single-key `RelationshipInput` shortcuts | *"Do floors have a great spatial arc and effortless conceptual discovery?"* |
| **4** | **Signal Sweep Mode** (Brainstorm D) | `SAVE_SCHEMA_VERSION` migration for `activeReconBuff` & archetype stats | Dedicated `SignalSweep.tsx` 10-node sprint, Timer/Relaxed toggle, Recon Buff picker & HUD badge; full keyboard flow | *"Is pure conceptual fluency fun in a 3-minute sprint?"* |
| **5** | **Classes, Skill Tree & Economy** (Brainstorm B/C) | `insightCores`, `activeClass`, `unlockedSkills`, `sectorMastery` migration + dual-currency balance | Class cards (`DiveStation`); Dual-Axis Tree (`WorkbenchStation`); Insight Cores (`Sanctuary`); Sector Mastery readout | *"Does RPG build choice deepen motivation for all learner types?"* |
| **6** | **Deep Sub-Strata** (Cat. 6) | Native Friendly + Combo + Conceptual Tiers 13–20 | 5-file `InputType` pipeline for Algebra Bar, Radicals, Interactive Graph (with keyboard parity), Systems Terminal | *"Does the system scale cleanly to 8th-grade math?"* |
