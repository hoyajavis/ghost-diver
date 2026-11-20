# Codebase & Presentation Layer Review

**Date:** 2026-11-19  
**Scope:** Full-stack client codebase (`src/`), build/type configuration, UI/UX presentation layer, and alignment with `curriculum_plan.md`, `curriculum-extension-plan.md`, and `input_roadmap.md`.

---

## Criticality Scale

| Level | Label | Definition |
| :--- | :--- | :--- |
| **P0** | **Critical** | Runtime crashes, soft-locks, unsolvable problems, or broken core interactions. |
| **P1** | **High** | Incorrect math grading, gameplay/economy exploits, missing core controls, or pedagogical defects. |
| **P2** | **Medium** | Legibility, responsiveness, accessibility, visual polish, and UX friction. |
| **P3** | **Low** | Architecture debt, type strictness, dead code/dependencies, testing, and future roadmap prerequisites. |

---

## Summary Matrix

| Category | P0 Critical | P1 High | P2 Medium | P3 Low | Total |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 1. Math Engine, Generators & Grading | 2 | 4 | 0 | 1 | 7 |
| 2. Combat & Simulation Gameplay | 3 | 4 | 1 | 1 | 9 |
| 3. Dungeon Generation & Core Game Loop | 2 | 3 | 0 | 1 | 6 |
| 4. User Presentation Layer, UI & Accessibility | 0 | 1 | 7 | 0 | 8 |
| 5. Architecture, Type Safety & Code Hygiene | 0 | 1 | 0 | 4 | 5 |
| 6. Extended Curriculum & Input Roadmap | 0 | 0 | 1 | 4 | 5 |
| **Total** | **7** | **13** | **9** | **11** | **40** |

---

## 1. Math Engine, Generators & Grading

### `[P0]` Unsolvable Hint Steps Due to Unsupported Operators
- **Status:** `[x] Done` *(Replaced unenterable `+`/`*` hint steps with choice/numeric steps in `preAlgebra.ts`, added per-step `choices` support, and added generator hint-solvability fuzz tests)*
- **Location:** `src/lib/generators/preAlgebra.ts` (lines 196, 258, 291, 319)
- **Problem:** Several intermediate hint steps require operators (`+`, `*`) that neither `NumberPad` nor `useCombatInput` accept:
  - Tier 8 V1 (line 196): expects `'+'` or `'-'`
  - Tier 9 V1 (line 258): expects `${base}*${base}*${base}`
  - Tier 9 V3 (line 291): expects `${c}+${a}` or `${c}-${a}`
  - Tier 9 V4 (line 319): expects `${c}*${a}`
- **Impact:** Players who spend Hint Packs on these enemies are permanently stuck on the hint step and take repeated damage.
- **Recommended Fix:** Update hint steps to expect numeric answers or explicit multiple-choice selections until an algebraic expression input is built, and add automated generator-to-input validation tests.

### `[P0]` Empty `steps: []` Array Causes Runtime Crash / Divide-by-Zero
- **Status:** `[x] Done` *(Fixed via `hasProblemSteps()` and `getCurrentStep()` guards in `src/lib/inputUtils.ts`)*
- **Location:** `src/lib/mathGenerators.ts` (line 88), `src/components/TrainingSim.tsx` (lines 33, 53, 114), `src/components/Combat.tsx` (lines 48, 83, 176, 477)
- **Problem:** `MEDITATION_GENERATOR` returns `steps: []`. Because `Boolean([]) === true`, `problem.steps ? problem.steps[hintStepIndex].prompt : problem.question` dereferences `undefined.prompt` (`TypeError`), and `enemy.maxHp / problem.steps.length` divides by zero (`Infinity`).
- **Impact:** Immediate crash in `TrainingSim` or broken damage math in `Combat` whenever a generator emits an empty `steps` array.
- **Recommended Fix:** Replace all `problem.steps` truthiness checks with `Boolean(problem.steps && problem.steps.length > 0)`.

### `[P1]` Strict String Grading Rejects Mathematically Equivalent Answers
- **Status:** `[x] Done` *(Created `src/lib/answerValidator.ts` with fraction/ratio equivalence, `requireSimplified` support, numeric epsilon tolerance, and coordinate/inequality/multi-select normalization; wired into `Combat.tsx` and `TrainingSim.tsx`)*
- **Location:** `src/components/Combat.tsx` (line 74), `src/components/TrainingSim.tsx` (line 49), `src/lib/generators/arithmetic.ts` (Tiers 4–5), `src/lib/generators/modeling.ts` (Tier 12)
- **Problem:** Answer checking uses exact string equality (`valueToSubmit.trim() === expectedAnswer`). Unsimplified fraction generators expect raw results like `2/4`, `8/8`, `0/4`, or `-2/4`, rejecting properly simplified inputs (`1/2`, `1`, `0`, `-1/2`). Decimals also reject `.5` vs `0.5`, `1.50` vs `1.5`, and `-0` vs `0`.
- **Impact:** Students are penalized for correct math, undermining educational trust.
- **Recommended Fix:** Create `src/lib/answerValidator.ts` supporting numeric epsilon comparison, fraction cross-multiplication/GCD normalization (with an opt-in `requireSimplified` flag for simplification problems), and whitespace/format normalization for coordinates and inequalities.

### `[P1]` Hint Prompts Give Away Exact Answers
- **Status:** `[x] Done` *(Rewrote answer-leaking final assembly prompts across `arithmetic.ts`, `preAlgebra.ts`, and `modeling.ts`)*
- **Location:** `src/lib/generators/arithmetic.ts` (lines 298, 347, 364, 391, 426, 445), `src/lib/generators/preAlgebra.ts` (line 50), `src/lib/generators/modeling.ts` (lines 94, 129)
- **Problem:** Prompts like `COMPILE FRACTION: ${sumN}/${commonD}` or `PLACE DECIMAL (2 PLACES): ...` display the exact answer string directly in the question box.
- **Impact:** Turns guided scaffolding into copy-typing rather than active recall.
- **Recommended Fix:** Rephrase final assembly steps to prompt the student without revealing the computed result (e.g., `"Write the combined fraction using your numerator and denominator"`).

### `[P1]` Confusing Place-Value Shift Terminology
- **Status:** `[x] Done` *(Updated Tier 1 V1 prompts in `arithmetic.ts` to explicitly state `SHIFT DIGITS LEFT` / `SHIFT DIGITS RIGHT`)*
- **Location:** `src/lib/generators/arithmetic.ts` (lines 15, 26)
- **Problem:** Tier 1 V1 labels multiplication by `10/100/1000` as `"SHIFT RIGHT"` and division as `"SHIFT LEFT"` without clarifying whether digits or the decimal point shift (digits shift left on multiplication; the decimal shifts right).
- **Impact:** Pedagogical confusion for 4th-grade learners.
- **Recommended Fix:** Explicitly clarify `"SHIFT DECIMAL RIGHT"` / `"SHIFT DIGITS LEFT"` (or `"MULTIPLY BY POWER OF 10"`).

### `[P1]` Duplicate Generators & Drift from `curriculum_plan.md`
- **Status:** `[x] Done` *(Realigned Tier 9 V3 to Evaluating Variable Expressions, Tier 9 V4 to One-Step Equations, Tier 10 V4 to Mean/Median/Range, Tier 12 V3 to Multi-Step Rational Operations, and synced `enemyData.ts`)*
- **Location:** `src/lib/generators/arithmetic.ts` (Tier 5 V4), `src/lib/generators/preAlgebra.ts` (Tier 9 V3, Tier 10 V4), `src/lib/generators/modeling.ts` (Tier 12 V2–3)
- **Problem:**
  - Tier 5 V4 and Tier 10 V4 are duplicate rectangular prism volume (`l * w * h`) generators.
  - Tier 12 V2 (division branch) and Tier 12 V3 (complex fractions) generate nearly identical `(n1/d1) / (n2/d2)` problems.
  - `curriculum_plan.md` specifies Tier 9 V3 as *Evaluating Variable Expressions* and Tier 10 V4 as *Mean, Median, Mode, and Range*, which are currently missing.
- **Impact:** Repetitive encounters and unfulfilled curriculum milestones.
- **Recommended Fix:** Realign Tier 9 V3 and Tier 10 V4 with `curriculum_plan.md`, and differentiate Tier 12 V3 into true multi-step rational operations per `curriculum-extension-plan.md`.

### `[P3]` Unused `LOCK` Problem Type
- **Status:** `[x] Done` *(Removed unused `'LOCK'` branch and union member from `src/lib/mathEngine.ts` and `src/types.ts`)*
- **Location:** `src/lib/mathEngine.ts` (lines 12–19)
- **Problem:** The `'LOCK'` problem branch is never invoked anywhere in the app (Blue Chests from `input_roadmap.md` were not implemented).
- **Impact:** Dead code in the math engine.
- **Recommended Fix:** Either wire `'LOCK'` to locked Blue Chests or remove the unused branch until needed.

---

## 2. Combat & Simulation Gameplay

### `[P0]` Hint Mode Soft-Lock on Multiple-Choice Problems
- **Status:** `[x] Done` *(Added `MathStep.choices`, `getActiveChoices()`, and `getActiveMultiSelectOptions()` wired through `Combat.tsx`, `TrainingSim.tsx`, `ProblemInputRouter.tsx`, and `useCombatInput.ts`)*
- **Location:** `src/components/Combat.tsx` (lines 483–501)
- **Problem:** The JSX checks `problem.choices || problem.multiSelectOptions` before checking `isHintMode`. When a player triggers a hint on Tier 2 V4 (`['PRIME', 'COMPOSITE']`) or Tier 12 V4 (`['POS', 'NEG']`), the hint step expects `'YES'` or `'NO'` while the UI continues rendering the original choice buttons.
- **Impact:** Neither button matches the expected step answer, trapping the player until defeat.
- **Recommended Fix:** Render choices from `currentStep?.choices` when in hint mode, falling back to `currentInputType` if the hint step has no choices of its own.

### `[P0]` Stale `mode` Closure Generates Meditation Question in Attack Mode
- **Status:** `[x] Done` *(Fixed in `Combat.tsx` using local `nextMode`)*
- **Location:** `src/components/Combat.tsx` (lines 120–127, 155–164)
- **Problem:** On a correct `MEDITATION` answer, `setMode('ATTACK')` is called, then 800ms later `setTimeout` calls `generateProblem(tier, mode, enemy.variant)` with the stale `'MEDITATION'` closure value.
- **Impact:** Player returns to `ATTACK` mode with a meditation problem (which also has `steps: []`).
- **Recommended Fix:** Capture `const nextMode = mode === 'MEDITATION' ? 'ATTACK' : mode;` before scheduling `setTimeout` and pass `nextMode`.

### `[P0]` `TrainingSim.tsx` Unplayable for Non-Numpad Problem Types
- **Status:** `[x] Done` *(Fixed by migrating `TrainingSim.tsx` to shared `ProblemInputRouter` + `useCombatInput`)*
- **Location:** `src/components/TrainingSim.tsx` (lines 36–44, 128–133)
- **Problem:** Despite computing `currentInputType`, `TrainingSim` only renders `<NumberPad>`. Multiple-choice, multi-select, fraction, ratio, relationship (`<`, `>`, `=`), and coordinate-plane variants render no choices, no fraction boxes, and no grid.
- **Impact:** Players who spend 100 Knowledge Shards to unlock these simulations cannot play them properly.
- **Recommended Fix:** Replace `TrainingSim`'s hardcoded `<NumberPad>` with a shared `<ProblemInputRouter>` shared with `Combat.tsx`.

### `[P1]` Broken Literal `$` Interpolation in Damage Feedback
- **Status:** `[x] Done` *(Fixed JSX template interpolation in `Combat.tsx`)*
- **Location:** `src/components/Combat.tsx` (line 449)
- **Problem:** `COUNTER MEASURE DETECTED: -${lastDamage} HP` is written as JSX text instead of a template literal, rendering a literal `$` (e.g., `-$7 HP`).
- **Impact:** Visible UI bug on every wrong answer.
- **Recommended Fix:** Change to `COUNTER MEASURE DETECTED: -{lastDamage} HP`.

### `[P1]` Missing Hint & Meditation Actions on Multiple-Choice Problems
- **Status:** `[x] Done` *(Unified `CombatActionBar` now rendered in `MultipleChoiceInput`)*
- **Location:** `src/components/Combat.tsx` (lines 483–501), `src/components/inputs/MultipleChoiceInput.tsx`
- **Problem:** Unlike `DefaultInput`, `FractionInput`, `RelationshipInput`, and `CoordinateInput`, `MultipleChoiceInput` does not render Hint or Meditation (`REC`) buttons.
- **Impact:** Players cannot heal or request hints during multiple-choice or multi-select encounters.
- **Recommended Fix:** Hoist Hint and Meditation controls into a shared `<CombatActionBar>` rendered consistently above/beside all input types.

### `[P1]` Missing Multi-Select Keyboard Support & In-Place State Mutation
- **Status:** `[x] Done` *(Fixed in-place `.sort()` via `formatMultiSelectAnswer()`, added `1–9` toggle & `Enter` submit in `useCombatInput.ts`, and added `[1]`–`[9]` keycap labels in `MultipleChoiceInput.tsx`)*
- **Location:** `src/components/Combat.tsx` (line 65), `src/hooks/useCombatInput.ts` (lines 43–59)
- **Problem:**
  - `Combat.tsx:65` calls `selectedOptions.sort(...)`, mutating React state in place.
  - `useCombatInput` handles `problem.choices` via keyboard (`A–D`, `1–4`) but has no keyboard handling for `problem.multiSelectOptions` or `Enter` submission.
- **Impact:** Subtle React state mutation risk and broken keyboard-only play on Tier 2 Factors/Multiples.
- **Recommended Fix:** Clone before sorting (`[...selectedOptions].sort(...)`) and add number-key toggling + `Enter` submit for `multiSelectOptions` in `useCombatInput`.

### `[P1]` Input Component Constraints & Missing Symbols
- **Status:** `[x] Done` *(Added `allowDecimal`/`allowNegative`/`disabled` flags and dedicated `extraKeys` row in `NumberPad.tsx`, disabled decimals on `FractionInput` and negatives on `RATIO`, added `≤`/`≥` support to `RelationshipInput` and `DefaultInput`)*
- **Location:** `src/components/inputs/FractionInput.tsx`, `src/components/inputs/RelationshipInput.tsx`, `src/components/NumberPad.tsx`
- **Problem:**
  - `FractionInput` uses `NumberPad` with the decimal `.` key enabled, allowing malformed decimal inputs inside integer fraction numerators/denominators.
  - `RelationshipInput` only renders `<`, `>`, `=`, omitting `≤` and `≥` even though `useCombatInput.ts:85` checks for them.
- **Impact:** Invalid input states and missing inequality operators for higher tiers.
- **Recommended Fix:** Make `NumberPad` accept configurable modifier flags (`allowDecimal`, `allowNegative`) and support `≤`/`≥` in `RelationshipInput` when needed.

### `[P2]` No Wrong-Answer Explanation or Correct Answer Reveal
- **Status:** `[x] Done` *(Added expected-answer reveal on miss in `Combat.tsx` with 1800ms read window, progressive retry/reveal in hint mode and `TrainingSim.tsx`, and double-submit guard during feedback)*
- **Location:** `src/components/Combat.tsx` (lines 128–153, 441–451)
- **Problem:** On an incorrect answer, the player takes damage and the problem immediately disappears and regenerates after 800ms without ever showing the correct answer or why they missed it.
- **Impact:** Missed learning opportunity in an educational math game.
- **Recommended Fix:** Display the expected answer briefly on miss (or allow retrying the same problem / stepping into guided breakdown).

### `[P3]` Uncleaned `setTimeout` Timers on Unmount
- **Status:** `[x] Done` *(Added `useSafeTimeout` hook in `src/hooks/useSafeTimeout.ts` and migrated all timers in `Combat.tsx` and `TrainingSim.tsx` with automatic unmount & reset cleanup)*
- **Location:** `src/components/Combat.tsx` (lines 103, 111, 140, 145, 155), `src/components/TrainingSim.tsx` (lines 52, 63)
- **Problem:** Multiple `setTimeout` calls are not tracked in refs or cleared on component unmount.
- **Impact:** Potential stale callbacks firing if the player disconnects or closes a modal mid-transition.
- **Recommended Fix:** Track active timer IDs in a ref and clear them in a cleanup `useEffect`.

---

## 3. Dungeon Generation & Core Game Loop

### `[P0]` Random Wall Placement Can Soft-Lock Floors
- **Status:** `[x] Done` *(Added BFS reachability validation in `src/lib/dungeonLogic.ts` and connected wall generation in `src/lib/mapGen.ts`)*
- **Location:** `src/lib/mapGen.ts` (lines 30–33, 80)
- **Problem:** 15 walls are placed completely randomly with no BFS/DFS pathfinding validation between `playerPos (0,0)` and `stairs` (or chests/logs).
- **Impact:** A run can become unwinnable on any floor, forcing an Emergency Eject and loss of all unbanked Shards.
- **Recommended Fix:** Run BFS from `(0,0)` after wall placement; reject or re-roll maps where `stairs` (or collectibles) are unreachable.

### `[P0]` Unbounded Enemy Scaling Risks Infinite Loop on Deep Floors
- **Status:** `[x] Done` *(Capped enemy counts at `MAX_ENEMIES_PER_FLOOR` and replaced `do...while` placement with a finite shuffled reachable spawn pool)*
- **Location:** `src/lib/mapGen.ts` (lines 21–28, 36)
- **Problem:** `numEnemies = 2 + Math.floor(floor / 2)` on a `10×10` grid (`100` tiles) creates extreme overcrowding on Floors 60–100 and triggers an infinite `do...while (isOccupied)` loop if total entities ever exceed 100.
- **Impact:** Severe floor clutter in Deep Sub-Strata and browser tab freeze on deep runs.
- **Recommended Fix:** Cap enemies per floor (e.g., `Math.min(10, 2 + Math.floor(floor / 5))`) and add a bounded-iteration pool of free coordinates instead of a `do...while` loop.

### `[P1]` Dive Cost Is Hidden & Fails Silently
- **Status:** `[x] Done` *(Exposed shared `getDiveCost()`, displayed drop cost and max floor in `DiveStation.tsx`, and disabled button with clear feedback when unaffordable)*
- **Location:** `src/hooks/useGameEngine.ts` (lines 82–84), `src/components/HomeBase.tsx` (lines 230–249)
- **Problem:** `startDive` charges `(startFloor - 1) * 50` Knowledge Shards, but the `NEURAL_DIVE_INTERFACE` modal never displays the cost, never disables `INITIATE_EXTRACTION`, and gives zero feedback when `stats.knowledge < cost`.
- **Impact:** Players think the Dive button is broken when selecting Floor > 1.
- **Recommended Fix:** Display the calculated shard cost (or `FREE` for Floor 1), disable the button when unaffordable, and show an explicit insufficiency message.

### `[P1]` Infinite Hint Pack Farming Exploit
- **Status:** `[x] Done` *(Added `getBankableHintPacks()` so preloaded `AI_PRELOAD` hints cannot be banked permanently and synced `Sanctuary.tsx` display)*
- **Location:** `src/hooks/useGameEngine.ts` (lines 99–103, 278–289)
- **Problem:** `startDive` grants `runHintPacks = upgrades.hints` for free at the start of every dive, and `handleBankAndExit` permanently adds `runHintPacks` into `stats.hintPacks`.
- **Impact:** Once `AI_PRELOAD` is upgraded, players can farm unlimited banked Hint Packs by starting and extracting repeatedly.
- **Recommended Fix:** Separate free preloaded run hints from found/looted hint packs, or only bank hint packs acquired during the dive.

### `[P1]` Enemy Tile Stacking & Duplicate Scar Keys
- **Status:** `[x] Done` *(Extracted sequential collision-aware `stepEnemies()`, prevented duplicate scars in `getRandomScar()`, and used composite React keys)*
- **Location:** `src/hooks/useGameEngine.ts` (lines 207–231, 263–276), `src/components/HomeBase.tsx` (line 254)
- **Problem:**
  - Step-sync enemy movement does not check collision against other enemies, allowing multiple Sentinels to stack on the same tile.
  - `handleCombatLose` can append duplicate scar IDs to `neuralScars`, while `HomeBase.tsx:254` renders them with `key={scar}`.
- **Impact:** Hidden stacked enemies in the dungeon and React duplicate-key warnings/reconciliation glitches.
- **Recommended Fix:** Prevent enemies from moving onto tiles occupied by other enemies (or stairs/logs), and either prevent duplicate scars or key scar list items by `${scar}-${index}`.

### `[P3]` Floor 5 Clamping & Single-Variant Floors
- **Status:** `[x] Done` *(Floor 5 now spawns mixed-review variants across the tier plus a boosted `_APEX` Sentinel, and enemies use tier names instead of hardcoded `'Basic'`)*
- **Location:** `src/lib/mapGen.ts` (lines 37–57)
- **Problem:** Every enemy on a floor receives the exact same variant (`Math.min(floorInTier, availableVariants)`), so Floor 5 of 4-variant tiers simply repeats Variant 4 instead of offering a mixed-variant review or Conceptual Check floor.
- **Impact:** Floor 5 feels repetitive rather than serving as a tier culmination before Sanctuary.
- **Recommended Fix:** On Floor 5 of each tier, spawn mixed variants from the tier plus a designated Conceptual Check Sentinel.

---

## 4. User Presentation Layer, UI & Accessibility

### `[P1]` `window.confirm()` Fails in Sandboxed Iframes & Delete Button Hidden on Touch
- **Status:** `[x] Done` *(Removed `window.confirm()`, added accessible in-app confirmation modal in `TitleScreen.tsx`, and made delete buttons persistently visible with `>= 44px` touch targets and `aria-label`)*
- **Location:** `src/hooks/useGameEngine.ts` (line 56), `src/components/TitleScreen.tsx` (lines 92–103)
- **Problem:**
  - `handleDeleteSlot` uses `window.confirm()`, which is blocked in sandboxed iframes.
  - The `Trash2` delete button on save slots uses `opacity-0 group-hover:opacity-100`, making it invisible and unreachable on touch devices and keyboard navigation.
- **Impact:** Players cannot delete save slots in embedded preview environments or on mobile/touch screens.
- **Recommended Fix:** Make the delete button persistently visible (with subtle contrast until focused/hovered) and replace `window.confirm()` with an in-app confirmation modal.

### `[P2]` Micro-Typography (`6px–8px`) & Excessive All-Caps / Snake-Case Copy
- **Status:** `[x] Done` *(Removed forced uppercase from `.terminal-text`, upgraded all UI labels across screens and stations to `>= 12px` with `tabular-nums`, prose to `14px`, and cleaned snake-case copy)*
- **Location:** `src/index.css` (lines 64–68), `src/components/HomeBase.tsx`, `src/components/Dungeon.tsx`, `src/components/Combat.tsx`, `src/components/Sanctuary.tsx`, `src/components/TitleScreen.tsx`
- **Problem:** Many critical UI labels use `text-[6px]`, `text-[7px]`, and `text-[8px]` combined with `.terminal-text` (`uppercase` + `0.1em` tracking). Station labels in `HomeBase` (`text-[6px]`) also collide with the player avatar overlay, and snake-case identifiers (`PRESS_SPACE_TO_ACCESS_NEURAL_CHAIR`, `50_SHARDS`, `OWNED_0`) reduce readability for Grade 4–8 students.
- **Impact:** Fails WCAG legibility baselines and slows reading speed during combat.
- **Recommended Fix:** Enforce a `12px` (`text-xs`) minimum for UI labels, `14px–16px` for body/instructional prose, and `tabular-nums` on all numeric HUD counters; keep the terminal aesthetic while using clean, readable phrasing on buttons and prompts.

### `[P2]` Desktop Viewport Under-Utilization & Short-Screen Clipping
- **Status:** `[x] Done` *(Added responsive 12-column desktop layouts across `TitleScreen`, `HomeBase`, `Dungeon`, and `Combat`, plus scrollable terminal/modal panes to prevent clipping on short viewports)*
- **Location:** `src/index.css` (lines 18–26), `src/components/Combat.tsx`, `src/components/Dungeon.tsx`, `src/components/HomeBase.tsx`
- **Problem:**
  - On desktop (1280px–1440px+), all screens collapse into narrow mobile-width boxes (`max-w-sm`/`max-w-md`) floating in empty wireframe space.
  - Because `html, body, #root` uses `overflow: hidden`, tall combat inputs (11×11 `CoordinateGrid` or stacked `FractionInput` + `NumberPad`) can clip off-screen on short viewports or mobile landscape.
- **Impact:** Wasted desktop screen real estate and unusable clipped controls on smaller heights.
- **Recommended Fix:** Add responsive desktop split layouts (e.g., Combat Arena + Terminal side-by-side; Dungeon Grid + Legend/Status/Log sidebar) and enable safe vertical scrolling inside the input pane on compact viewports.

### `[P2]` `CoordinateGrid` Lacks Axis Numbers & Touch Usability
- **Status:** `[x] Done` *(Added explicit `-5` to `5` X/Y axis tick labels, origin/axis highlights, ARIA cell labels, and a touch-friendly live coordinate readout bar in `CoordinateGrid.tsx`)*
- **Location:** `src/components/CoordinateGrid.tsx` (lines 16–51)
- **Problem:** The 11×11 coordinate plane has no numeric tick labels (`-5` to `5`) along the x/y axes and relies on `group-hover:block` tooltips to display `(cx, cy)`.
- **Impact:** Unusable on touch devices and forces students to manually count grid squares from the origin.
- **Recommended Fix:** Render axis tick numbers (`-5`..`5`) along the grid edges or axes, clearly highlight the origin and axes, and show the selected coordinate in a dedicated readout bar.

### `[P2]` Missing `prefers-reduced-motion` Support & High-Noise Scanline Overlay
- **Status:** `[x] Done` *(Wrapped `App` in `<MotionConfig reducedMotion="user">`, softened `.scanlines` opacity, and added `@media (prefers-reduced-motion: reduce)` CSS overrides in `src/index.css`)*
- **Location:** `src/index.css` (lines 29–45, 81–107), `src/components/Dungeon.tsx` (line 88), `src/App.tsx`
- **Problem:**
  - `.scanlines::before` covers the entire viewport at `z-50`, reducing text contrast across math expressions and lore modals.
  - Infinite `.wireframe-bg` scrolling, `.glitch`, `animate-pulse`, `animate-bounce`, and `STATIC_EYE`'s `animate-ping` have no `@media (prefers-reduced-motion: reduce)` fallback or `<MotionConfig reducedMotion="user">`.
- **Impact:** Accessibility hazard for motion-sensitive users and eye strain during extended math sessions.
- **Recommended Fix:** Wrap `App` in `<MotionConfig reducedMotion="user">`, pause/disable continuous CSS animations under `prefers-reduced-motion: reduce`, and soften scanlines (or provide a CRT toggle in System settings).

### `[P2]` Undersized Touch Targets & Missing Keyboard Focus / ARIA Labels
- **Status:** `[x] Done` *(Increased interactive controls and mobile D-pads to `>= 40px–48px`, added `aria-label`/`role="dialog"` across modals and icon buttons, and added global `:focus-visible` outline styles)*
- **Location:** `src/components/HomeBase.tsx`, `src/components/Dungeon.tsx`, `src/components/Combat.tsx`, `src/components/TitleScreen.tsx`
- **Problem:** Icon-only buttons (`Settings`, `LogOut`, `X`, mobile D-pad) are as small as ~22–28px (below the 40–44px touch guideline) and lack `aria-label` attributes and visible `:focus-visible` outlines.
- **Impact:** Poor mobile ergonomics and inaccessible keyboard/screen-reader navigation.
- **Recommended Fix:** Increase interactive targets to `min-h-10 min-w-10`, add descriptive `aria-label`s to all icon buttons, and add consistent `focus-visible:outline-2 focus-visible:outline-neon-cyan` rings.

### `[P2]` Placeholder HTML Metadata, Hardcoded HUD Strings & Undefined CSS Class
- **Status:** `[x] Done` *(Synced `index.html` title/meta/OG tags with `metadata.json`, aligned title branding, passed active `slotId` and real enemy names into `Combat.tsx`, and defined `.custom-scrollbar` in `src/index.css`)*
- **Location:** `index.html` (line 6), `metadata.json`, `src/components/Combat.tsx` (lines 232, 242), `src/lib/mapGen.ts` (line 54), `src/components/HomeBase.tsx` (lines 299, 357, 402)
- **Problem:**
  - `index.html` still has `<title>My Google AI Studio App</title>` and no `<meta name="description">`. App naming also conflicts between `metadata.json` (`"The Extraction Academy"`) and `TitleScreen.tsx` (`"GHOST_DIVER"`).
  - `Combat.tsx:242` displays `enemy.type.toUpperCase()`, which is hardcoded to `'Basic'` for every enemy, and line 232 hardcodes `GHOST_01` regardless of active save slot.
  - `HomeBase.tsx` applies `.custom-scrollbar` on three scroll containers, but that class is never defined in `src/index.css`.
- **Impact:** Unpolished presentation and misleading combat telemetry.
- **Recommended Fix:** Sync `index.html` title/meta with `metadata.json`, show the real enemy tier/archetype name and active slot ID in Combat HUD, and define `.custom-scrollbar` (or use standard scrollbar utilities).

### `[P2]` `ChestLoot` Prompt Mismatch & Missing Dungeon Legend
- **Status:** `[x] Done` *(Added guarded any-key `keydown` listener in `ChestLoot.tsx` and added full 6-tile Map Legend in `Dungeon.tsx` desktop sidebar and compact mobile strip)*
- **Location:** `src/components/ChestLoot.tsx` (lines 44–54), `src/components/Dungeon.tsx`
- **Problem:**
  - `ChestLoot` displays `[ PRESS_ANY_KEY_TO_DISMISS ]`, but has no `keydown` listener (only Enter/Space work via button `autoFocus`).
  - `Dungeon.tsx` displays 5 distinct tile icon types without a visible legend.
- **Impact:** Unresponsive keyboard dismissal and steeper onboarding for new players.
- **Recommended Fix:** Attach a `keydown` listener in `ChestLoot` to dismiss on any key (with a brief mount delay to prevent accidental instant dismissal from movement keys), and add a compact Dungeon icon legend.

---

## 5. Architecture, Type Safety & Code Hygiene

### `[P1]` Type Contract Mismatch Hidden by Non-Strict `tsconfig.json`
- **Status:** `[x] Done` *(Installed `@types/react` & `@types/react-dom`, enabled `"strict": true` in `tsconfig.json`, and fixed `onUnlockDemo: (variantId: string) => void`)*
- **Location:** `tsconfig.json`, `src/components/HomeBase.tsx` (lines 14, 449), `src/hooks/useGameEngine.ts` (line 355)
- **Problem:** `tsconfig.json` does not enable `"strict": true`. `HomeBase.tsx:14` declares `onUnlockDemo: (tier: number) => void`, contradicting `useGameEngine.ts` (`variantId: string`) and its own call site `onUnlockDemo(variantId)` on line 449.
- **Impact:** Silent type errors and brittle refactors.
- **Recommended Fix:** Fix the `onUnlockDemo` prop signature to `(variantId: string) => void` and enable `"strict": true` in `tsconfig.json`.

### `[P3]` Duplicated Domain Logic Across Components
- **Status:** `[x] Done` *(Extracted `src/lib/inputUtils.ts`, `src/lib/scarData.ts`, `src/lib/combatLogic.ts`, `CombatActionBar`, and `ProblemInputRouter`)*
- **Location:** `src/components/Combat.tsx`, `src/components/TrainingSim.tsx`, `src/components/HomeBase.tsx`, `src/components/Sanctuary.tsx`, `src/components/inputs/*`
- **Problem:**
  - `inferInputType()` is duplicated verbatim in `Combat.tsx` and `TrainingSim.tsx`.
  - `scarNames` mapping is duplicated in `HomeBase.tsx` and `Sanctuary.tsx` (and raw keys appear in `Dungeon.tsx`/`Combat.tsx`).
  - Hint & Meditation buttons are copy-pasted across 4 input components.
  - Combat rules (damage, scar debuffs, rewards) live inside `Combat.tsx` instead of a pure module.
- **Impact:** Bug fixes must be applied in multiple places and frequently drift (as seen in `TrainingSim`).
- **Recommended Fix:** Extract `src/lib/inputUtils.ts`, `src/lib/scarData.ts`, `src/lib/combatLogic.ts`, and `<CombatActionBar>` / `<ProblemInputRouter>`.

### `[P3]` Monolithic `HomeBase.tsx` & Sequential `setStats` Calls
- **Status:** `[x] Done` *(Extracted 6 station components into `src/components/stations/` and merged `startDive` `setStats` calls in `useGameEngine.ts`)*
- **Location:** `src/components/HomeBase.tsx` (498 lines), `src/hooks/useGameEngine.ts` (lines 86–103)
- **Problem:**
  - `HomeBase.tsx` inlines 6 full modal stations (`DIVE`, `UPGRADES`, `LORE`, `GARDEN`, `GUIDE`, `TRAINING`) plus room grid logic.
  - `startDive` calls `setStats` twice sequentially instead of merging `runHintPacks: prev.upgrades.hints` into one state update.
- **Impact:** Harder maintenance and unnecessary double renders.
- **Recommended Fix:** Split station overlays into `src/components/stations/` and combine `startDive`'s state update.

### `[P3]` Unvalidated `localStorage` Save Parsing
- **Status:** `[x] Done` *(Added `SAVE_SCHEMA_VERSION`, `hydrateSaveData()`, and `toPersistedSaveData()` in `src/lib/storage.ts`)*
- **Location:** `src/lib/storage.ts` (lines 25–37), `src/hooks/useGameEngine.ts` (lines 21–53)
- **Problem:** `loadSlots()` blindly casts `JSON.parse(saved) as PlayerStats` without schema versioning or field validation; migration logic is split into `useGameEngine.ts`.
- **Impact:** Corrupted or partial saved JSON can break slot previews on `TitleScreen` (e.g., `slot.stats.neuralScars.length` throwing on undefined).
- **Recommended Fix:** Add a `schemaVersion` field and a central `hydrateSaveData()` normalizer inside `storage.ts`.

### `[P3]` Unused Dependencies, Dead Imports & Zero Automated Tests
- **Status:** `[x] Done` *(Pruned unused dependencies from `package.json`, cleaned dead imports and `vite.config.ts`, and added Vitest unit test suite in `src/lib/__tests__/`)*
- **Location:** `package.json`, `vite.config.ts`, `src/components/*`
- **Problem:**
  - `package.json` includes unused `@google/genai`, `express`, `dotenv`, `tsx`, `@types/express`, and `autoprefixer`; `vite.config.ts` injects unused `GEMINI_API_KEY`.
  - Multiple components contain unused icon/hook imports.
  - No unit tests exist for math generators, answer grading, or map reachability.
- **Impact:** Bloated install footprint, noisy diffs, and undetected generator regressions.
- **Recommended Fix:** Prune unused dependencies/imports and add a Vitest suite fuzz-testing every math generator, `answerValidator`, and `mapGen` connectivity.

---

## 6. Extended Curriculum & Input Roadmap

### `[P2]` Curriculum Extension Progress Tracking (Tiers 13–20 Unimplemented)
- **Status:** `[ ] Open`
- **Location:** `curriculum-extension-plan.md`, `src/lib/generators/`, `src/lib/enemyData.ts`
- **Problem:** Only Tiers 11–12 (Floors 51–60) are implemented. Tiers 13–20 (Floors 61–100) are not yet built:
  - Tier 13 (Floors 61–65): Advanced Expressions & Equations
  - Tier 14 (Floors 66–70): Statistics & Probability
  - Tier 15 (Floors 71–75): Scale & 3D Geometry
  - Tier 16 (Floors 76–80): Roots & Scientific Notation
  - Tier 17 (Floors 81–85): Linear Functions
  - Tier 18 (Floors 86–90): Systems of Equations
  - Tier 19 (Floors 91–95): Geometric Transformations
  - Tier 20 (Floors 96–100): The Root Breach (Pythagorean Theorem, Distance, Cones/Cylinders/Spheres, Scatter Plots)
- **Recommended Fix:** Implement in paired generator + enemy-data modules (`src/lib/generators/algebra.ts`, `geometryStats.ts`, `functionsSystems.ts`) once P0/P1 grading and new input components are ready.

### `[P3]` Input Roadmap Component: Algebra Bar
- **Status:** `[ ] Open`
- **Location:** `src/components/inputs/` (new component)
- **Problem:** No variable/expression input (`x`, `y`, `z`, `+`, `-`, `(`, `)`) exists yet.
- **Impact:** Blocks Tier 13 (Factoring Linear Expressions) and Tier 17 (Slope-Intercept Form).

### `[P3]` Input Roadmap Component: Radical & Exponent Modifiers
- **Status:** `[ ] Open`
- **Location:** `src/components/inputs/` (new component)
- **Problem:** No `√` or superscript exponent (`x^y` / `×10^n`) input exists.
- **Impact:** Blocks Tier 16 (Roots & Scientific Notation).

### `[P3]` Input Roadmap Component: Interactive Graph & Transformation Controls
- **Status:** `[ ] Open`
- **Location:** `src/components/CoordinateGrid.tsx` / new components
- **Problem:** No draggable Slope-Intercept line handles or Translate/Rotate/Reflect/Dilate shape controls exist.
- **Impact:** Blocks tactile interactions for Tier 17 (Slope-Intercept), Tier 18 (Graphing Systems), and Tier 19 (Transformations).

### `[P3]` Input Roadmap Component: Multi-Line Systems Terminal
- **Status:** `[ ] Open`
- **Location:** `src/components/inputs/` (new component)
- **Problem:** No multi-field `(x, y)` / dual-equation terminal input exists.
- **Impact:** Blocks Tier 18 (Systems of Equations).

---

## Recommended Execution Order

1. **Milestone 1 — Stabilize & Fix Grading (P0 + P1):** Fix unsolvable hint steps, stale meditation closure, `steps: []` guards, `mapGen` BFS + enemy cap, `answerValidator.ts`, shared `<ProblemInputRouter>` (fixes `TrainingSim`), `window.confirm()` modal, dive cost display, and hint-farming fix.
2. **Milestone 2 — Presentation & Accessibility Overhaul (P2):** Upgrade typography scale (no 6–8px text), add responsive desktop layouts, add `CoordinateGrid` axis ticks, add `prefers-reduced-motion` support, fix touch targets/ARIA/focus rings, and sync `index.html`/HUD metadata.
3. **Milestone 3 — Hardening & Tests (P3):** Enable `strict` TypeScript, split `HomeBase` and combat logic, clean up unused dependencies, and add generator/validator/mapGen tests.
4. **Milestone 4 — Deep Sub-Strata Completion (Tiers 13–20):** Build the Algebra Bar, Radical/Exponent input, Interactive Graph/Transformation controls, and Multi-Line Systems terminal alongside Tiers 13–20 generators and enemy data.
