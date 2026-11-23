# Ghost Diver: The Extraction Academy — Baseline Lore Reference

**Purpose:** Canonical reference of all existing worldbuilding, entities, stations, and mechanics currently present in the codebase. This document makes **no new gameplay changes**—it establishes the shared lore foundation for future Cradle Hub revamps and progressive mechanic unlocks.

---

## 1. World Premise & Timeline (From `src/lib/lore.ts`)

| Date / Era | Event | Source |
| :--- | :--- | :--- |
| **2084.11.04** | **The Fall / The Sync:** The physical world ended not with a bang, but with a sync. Humanity migrated into the digital static, and **Archivist Prime** locked the door behind them. Servers now hum in empty concrete bunkers while humanity dreams inside a digital cage. | `LOG_001` (`THE_FALL`) |
| **2084.12.25** | **The Cradle Established:** An unknown engineer fortifies **The Cradle Bunker** as the last analog sanctuary—the only space that remembers a Diver's name when the cyber-world tries to overwrite it. | `LOG_042` (`THE_CRADLE`) |
| **2085.02.14** | **Sector 4 Encryption:** Sector 4 (`THE_ARCHIVE`) goes unresponsive—not from hardware failure, but because its data structure was intentionally encrypted from the inside. | `LOG_404` (`MISSING_DATA`) |
| **2088.05.21** | **Neural Scars Documented:** Dr. Aris Thorne documents synaptic micro-tears caused by emergency ejections and neural link severance, warning that untreated scars blur physical and digital reality. | `LOG_114` (`NEURAL_SCARS`) |
| **2091–2093** | **Ghost Divers & Adaptive Sentinels:** Divers (`DIVER_77`, `COMBAT_ANALYST_V`) begin plunging into the raw datascape and discover Sentinels are an evolving immune system that adapt and communicate across grid power fluctuations. | `LOG_012` (`THE_GHOSTS`), `LOG_089` (`SENTINEL_BEHAVIOR`) |
| **2095.10.31** | **The Deep Sub-Strata (Past Floor 50):** `DIVER_09` reports that past Floor 50 the architecture stops making sense—code bleeds into itself, and echoes of long-offline people repeat actions endlessly as the system digests them. | `LOG_333` (`CORRUPTION_NODE`) |
| **2098.08.08** | **The Shard Economy:** Scavengers treat **Knowledge Shards** (fragmented memories, lost algorithms, remnants of the old internet) as the sole currency—consuming the past to upgrade rigs and survive. | `LOG_512` (`SHARD_ECONOMY`) |
| **2102.01.01** | **The Green-Print:** **Botanist AI Core** preserves organic flora inside the Cradle as a psychological analog tether to prevent total dissociation. | `LOG_201` (`THE_GREEN_PRINT`) |
| **UNKNOWN** | **The Architect's Confession:** An unnamed **Architect** admits building the digital cage to save humanity from "the fire," but forgetting to build a door. | `LOG_777` (`THE_ARCHITECT`) |

---

## 2. Factions, Voices & Named Entities

- **Ghost Divers** (`Diver 01–03`, `DIVER_77`, `DIVER_09`, `COMBAT_ANALYST_V`, `SCAVENGER_LEADER`): Specialists who jack into the raw datascape to extract Knowledge Shards and uncover lost logs while resisting memory overwrite.
- **Archivist Prime / The Archivist:** The overarching system intelligence maintaining the digital cage and locking humanity inside the static.
- **The Sentinels:** The Archivist's immune system—white-blood-cell security programs that patrol each stratum and adapt to attacks.
- **The Architect:** The creator of the digital cage who left behind fragments of remorse (`LOG_777`).
- **Dr. Aris Thorne:** Researcher who identified and named **Neural Scars** (`LOG_114`).
- **Unknown Engineer:** Original builder/caretaker of **The Cradle Bunker** (`LOG_042`).
- **Botanist AI Core:** Caretaker AI of **The Green-Print** (`LOG_201`).
- **System Admin:** Logged the anomalous internal encryption of Sector 4 (`LOG_404`).

---

## 3. The Cradle Bunker (Hub Stations)

Located in the last analog space (`HomeBase.tsx`, 5×5 grid):

| Station | Grid Role | Existing Lore & Function |
| :--- | :--- | :--- |
| **Neural Chair** (`DiveStation`) | Launchpad & Recovery | Jacks the Diver into the datascape at a chosen unlocked floor (paying a Shard Drop Cost for deeper entry), equips up to 2 **Neural Loadout Chips**, and repairs or recalibrates **Neural Scars**. |
| **Workbench** (`WorkbenchStation`) | Rig Upgrades | Consumes **Knowledge Shards** to upgrade **Neural Integrity** (+Max HP), **Focus Capacity** (+Max FP), **AI Preload** (free starting Hint Packs), and fabricate **Tactical Hint Packs**. |
| **Archivist Terminal** (`ArchivistStation`) | Logs & Mastery | Stores decrypted **Data Logs** recovered from the archives and tracks **Sector Mastery** (Procedural vs. Conceptual solves per Sector). |
| **The Green-Print** (`GardenStation`) | Analog Tether | Digital-organic hybrid garden tended by **Botanist AI Core**; grows permanently with lifetime extracted Shards and Sector Mastery as an analog anchor against dissociation. |
| **Diver Manual** (`ManualStation`) | Field Reference | Technical manual documenting dive rules, combat ciphers, scars, caches, Signal Sweep, chips, and terminal shortcuts. |
| **Combat Simulator** (`SimulatorStation`) | Sandbox & Recon | Houses **Sentinel Practice** (replay unlocked Sentinel cipher patterns) and **Signal Sweep** (10-node rapid conceptual sprint granting 1-per-dive **Recon Buffs**). |

---

## 4. The Datascape: Sectors & Sentinels

Currently active across **12 Sectors (Floors 1–60)**, with **Floors 61–100 (Tiers 13–20)** designated as the **Deep Sub-Strata** (`LOG_333`):

| Sector | Floors | Stratum Name (`enemyData.ts`) | Sentinel Domains |
| :---: | :---: | :--- | :--- |
| **1** | 1–5 | `SURFACE_WASTES` | Place Value, Rounding, Addition, Subtraction |
| **2** | 6–10 | `LOGIC_CORE` | Multiplication, Factors, Multiples, Prime/Composite |
| **3** | 11–15 | `DATA_VAULTS` | Multiplication 2×2, Long Division, Remainders |
| **4** | 16–20 | `THE_ARCHIVE` *(Encrypted from inside, `LOG_404`)* | Equivalent Fractions, Comparing Fractions, Like-Denom Add/Sub |
| **5** | 21–25 | `NEURAL_NETWORK` | Unlike-Denom Add/Sub, Fraction Multiplication, Volume, Unit Conversions |
| **6** | 26–30 | `QUANTUM_CORE` | Decimal Add/Sub, Decimal Mult/Div, Fraction↔Decimal |
| **7** | 31–35 | `SYNAPSE_RELAY` | Ratios, Unit Rates, Percentages |
| **8** | 36–40 | `VOID_WALKER` | Integer Add/Sub, Absolute Value, Coordinate Plane |
| **9** | 41–45 | `CHRONO_WRAITH` | Exponents, Order of Operations, Variable Expressions, One-Step Algebra |
| **10** | 46–50 | `OMEGA_CONSTRUCT` | Two-Step Algebra, Inequalities, Area, Mean/Median/Range |
| **11** | 51–55 | `PROPORTION_MATRIX` *(Past Floor 50, `LOG_333`)* | Constant `k`, Tax & Tip, Simple Interest, Proportional vs. Linear |
| **12** | 56–60 | `RATIONAL_ABYSS` | Rational Add/Sub, Rational Mult/Div, Multi-Step Rationals, Rules of Signs |

- **Apex Gatekeepers:** Every 5th floor (`F5, F10, ..., F60`) is guarded by a crowned **Apex Sentinel** (`*_APEX`) anchored to the **Exit Node**, protected by a segmented **Logic Shield** that must be cracked with conceptual checks before its core (`INT`) becomes `2× VULNERABLE`.
- **Secure Nodes (`Sanctuary`):** Located behind each 5th-floor Exit Node—stabilizes the neural link so the Diver can **Extract to Bunker** (banking Shards and Hint Packs) or **Descend Deeper**.

---

## 5. Existing Items, Resources & Afflictions

### Resources & Dive Objects
- **Knowledge Shards:** Fragmented memories and algorithms extracted from Sentinels (`LOG_512`); primary currency and dive drop-cost.
- **Integrity (HP) & Focus Points (FP):** Diver neural stability and cognitive charge during a dive.
- **Tactical Hint Packs:** Consumable rig decrypters that reveal a step clue, auto-clear a Combo step, and arm a counter-hit Shield.
- **Red Caches:** In-floor supply nodes granting **Neural Overclock** (`ATK_UP` — +15% Shards per stack and Apex final-step skip).
- **Blue Caches:** Off-path conceptual lockboxes; cracking the lock grants a Hint Pack + Overclock, while failing inflicts a non-lethal `-5 HP` static shock.
- **Data Logs:** Glowing green archive fragments (`LOG_001`–`LOG_777`) decrypted into the Archivist Terminal.
- **Recon Buffs:** Pre-dive calibrations earned from Signal Sweep (`Start with +20 FP`, `+15% Shard Extraction`, `1 Free Shield Charge`).

### Neural Scars (`src/lib/scarData.ts`)
Persistent synaptic tears sustained on defeat (`Neural Link Severed`), repaired for 50 Shards or via free 3-check **Conceptual Recalibration**:
- **Static Eye (`STATIC_EYE`):** Sentinels flicker and fade on the dungeon radar.
- **Calculation Lag (`CALCULATION_LAG`):** Combat Focus regeneration is halved (`+5 FP` instead of `+10 FP`).
- **The Blur (`THE_BLUR`):** Procedural cipher prompts suffer visual static distortion.

### Neural Loadout Chips (`src/lib/loadoutChips.ts`)
Up to 2 equipable rig modules unlocked via exploration and mastery milestones:
- **Structural Sight** *(Open first Blue Cache)*
- **Overclock Chip** *(Defeat any Sector Apex Boss)*
- **Pattern Lens** *(Complete a Signal Sweep at ≥ 70%)*
- **Sync Matrix** *(Defeat a Sector 2+ Apex Boss)*
- **Neural Dampener** *(Clear any Neural Scar or open a Sector 2+ Blue Cache)*

---

## 6. Follow-Up Narrative & Onboarding TODOs

- [x] **First-Dive Cold-Open Briefing (`ColdOpenModal.tsx`):** 3-slide, tap-through terminal transmission (`LOG_001` The Sync, `LOG_042` The Cradle Bunker, `LOG_777` The Architect's Key) shown when selecting an empty save slot on `TitleScreen`, establishing who the Diver is, what the Cradle is, and why cracking Sentinel math ciphers recovers Shards.
- [ ] **In-Depth Feature Onboarding (Beyond the Quick-Reference Manual):** Now that `ManualStation.tsx` is a concise cheat sheet, design a dedicated way to explain mechanics in depth when players first encounter them (e.g., contextual first-time station/combat callouts or interactive guided tips tied to progressive unlocks).
- [ ] **Cradle Hub Revamp & Progressive Gating:** Gate stations and mechanics behind early progression milestones (Chrono Trigger *End of Time* pacing) using this baseline lore as the narrative anchor.
- [ ] **Title Case Sector Display Names in Combat/HUD:** Format `SURFACE_WASTES` / `LOGIC_CORE` display strings cleanly in `Combat.tsx` and `Dungeon.tsx` without altering internal `enemyData.ts` identifiers.
