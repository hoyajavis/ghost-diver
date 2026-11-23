# Ghost Diver: Design, Tone & Narrative-Systems Framework

**Status:** Active Reference  
**Related Docs:** [`baseline-lore.md`](baseline-lore.md) · [`gameplay-pacing-roadmap.md`](gameplay-pacing-roadmap.md)

This document codifies **why** *Ghost Diver: The Extraction Academy* exists, the **tone and gameplay guardrails** every feature must obey, and the **step-by-step process** for making the Cradle Hub and dive loop more dynamic without scope bloat.

---

## 1. Purpose of the App

*Ghost Diver: The Extraction Academy* is an **educational extraction roguelike** built for **6th–8th grade learners (ages 11–14)**—covering Grade 4–8 math foundations through pre-algebra and modeling—playable on **mobile phones, Chromebooks, and desktop browsers** with **zero accounts, zero PII, and anonymized local browser cache**.

Its core promise is that **math is the combat and exploration system, not an interruption**:
- **Fast Mental Rhythm:** Every standard player input is solvable mentally in **3–12 seconds** without pencil and paper. Multi-step math runs as rhythmic **Combo Chains** (with an optional high-risk **Direct Strike**).
- **Two Halves of Fluency:** Players pair **Attacks** (calculation & execution) with **Logic Checks** (estimation, error analysis, structural reasoning, scaling intuition).
- **Extraction Tension:** Every 5-floor dive builds toward a crowned **Apex Boss** and a **Secure Node** decision: *Extract to Bunker* with banked Shards, or *Descend Deeper* at higher risk.
- **Zero-Nag Retention:** Spaced repetition (`conceptSpacedRep`) and playtest telemetry run silently under the hood—no flashcards, no nag popups, and no server tracking.

---

## 2. Tone & Reading-Level Guardrails

All player-facing copy (logs, station UI, briefings, tooltips, boss lines) must pass these checks:

1. **Grade 6–8 Reading Level:**
   - Use short, active-voice sentences (1–2 lines per UI beat).
   - Avoid academic/clinical vocabulary (*dissociation*, *synaptic pathways*, *organic flora*) and dense textbook walls.
2. **Mysterious, Hopeful Sci-Fi Tone:**
   - Target a *Chrono Trigger* (End of Time) / *Mega Man Battle Network* feel: a locked digital vault, a quiet analog bunker, an evolving AI firewall, and a hidden exit key left by *The Architect*.
   - Keep stakes tense and intriguing—**never** bleak, defeatist, or body-horror (*"digesting us"*, *"nobody escapes"*).
3. **In-World Language Over Teacher Jargon:**
   - Use **Attacks**, **Logic Checks**, **Shield Breaks**, **Loadout Chips**, and **Neural Scars** in player-facing screens.
   - Reserve pedagogy terms (*procedural*, *conceptual*) for internal code, tests, and roadmap docs.
   - Format zone names cleanly for players (`Surface Wastes`, not `SURFACE_WASTES`).
4. **Concise Reference, Contextual Onboarding:**
   - Keep `ManualStation` as a scannable cheat sheet; teach new or gated mechanics contextually when the player first unlocks or encounters them.

---

## 3. Gameplay & Engineering Guardrails

1. **Mental-Math & Input Parity:**
   - Every prompt must be solvable in 3–12s without scratch paper and fully playable via **touch**, **keyboard**, and **mouse**.
2. **No Math Avoidance:**
   - Progression perks (Loadout Chips, Recon Buffs, Cradle unlocks) may **customize how Attacks and Logic Checks combo together**, but must never let a player opt out of either skill.
3. **Mobile-First Viewport Fit:**
   - Core screens (`TitleScreen`, `Combat`, `SignalSweep`, `HomeBase`) must fit cleanly on a standard mobile viewport without clipping primary controls (like the `NumberPad` submit row) or overlapping HUD labels.
4. **No Unbounded Healing or Safe-Room Farming:**
   - Tactical tools and bunker modes (like `SignalSweep`) must stay bounded (e.g., 1 rewarded Recon Buff per completed dive; Focus Scan separated from HP healing) so extraction risk remains real.
5. **Privacy-Strict Persistence:**
   - Any new persisted field must be explicitly added to `hydrateSaveData()` and the strict PII allow-list in `toPersistedSaveData()` (`src/lib/storage.ts`) with backward-compatible migration for existing save slots.
6. **Incremental Scope ("No Big-Bang Overhauls"):**
   - Ship small, self-contained slices (1–2 mechanics or 1–2 hub beats at a time). Never couple a full story rewrite with multiple new combat systems in a single pass.

---

## 4. Codified Process: Systems-First, Lore-Second

When adding replay value, hub interactivity, or narrative integration, **always** follow this 4-step order:

### Step 1 — Design the System Hook First
Before writing lore, define the concrete gameplay or hub state change:
- *What changes in the Cradle Hub or dive loop?* (e.g., a station powering on after a milestone, a post-dive `!` alert, a Sector Boss intercept, or a run modifier).
- *What player decision or reward does it create?*
- *How does it teach itself contextually on first encounter?*

### Step 2 — Run the Guardrail Check
Validate the system hook against Sections 2 & 3:
- Does it keep mental-math pacing (3–12s)?
- Does it preserve both Attacks and Logic Checks?
- Does it fit mobile viewports cleanly?
- Is the scope small enough to ship and playtest independently?
- Are all new persisted fields backward-compatible and PII-free?

### Step 3 — Draft Targeted Lore Beats
Anchor the new system slot to [`baseline-lore.md`](baseline-lore.md):
- Write **only** the exact lines the UI slot needs (e.g., a 1–2 sentence station activation line, a 2-line boss transmission, or a short Green-Print bloom note).
- Check every line for Grade 6–8 readability, in-world terminology, and hopeful-mystery tone.

### Step 4 — Implement, Verify & Update Baseline Docs
- Implement the small slice with unit/component tests (`npm run lint`, `npm test`, `npm run build`).
- Run a quick playtest check for pacing, mobile fit, and clarity.
- Update [`baseline-lore.md`](baseline-lore.md) (with any newly canonized entities/beats) and [`gameplay-pacing-roadmap.md`](gameplay-pacing-roadmap.md).
