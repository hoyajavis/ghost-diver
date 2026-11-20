# Combat Input & Question Form Roadmap

To transition from a simple 2-digit addition prototype to a full 4th–6th grade curriculum, the input system needs to expand beyond a standard numpad. The goal is to keep the "Hacker Terminal" aesthetic while ensuring the inputs don't become clunky during a high-stakes ATB (Active Time Battle) fight.

## 1. The Enhanced Numeric Interface
The standard 0-9 numpad is a great start, but it needs "Modifiers" to handle the technical depth of the later Tiers.
* **Decimal Point (.)**: Essential for Tier 6 (Decimals) and Tier 5 (Unit Conversions).
* **Negative Sign (-)**: Critical for Tier 8 (Integers).
* **Fraction Toggle**: Instead of a simple slash (/), a "Fraction Box" input is much better for confidence. When the player hits the "Fraction" button, the input field splits into two small boxes (Numerator/Denominator) that they can toggle between.
  * Applicable Tiers: 4, 5, 6, and 7.

## 2. Symbolic & Comparative Inputs
Many problems don't ask for a sum; they ask for a relationship.
* **Comparison Picker (<, >, =)**: A small 3-button sub-menu. This is necessary for Tier 4 (Comparing Fractions) and Tier 10 (Inequalities).
* **Ratio Colon (:)**: A specific symbol for Tier 7.
* **Inequality Set (≤, ≥)**: While you have <, >, you may need the "or equal to" variants for 6th-grade inequalities in Tier 10.

## 3. Selection & Multiple-Choice (The "Hacker Menu")
For conceptual checks and multi-factor problems, the player needs to select from a list rather than calculate.
* **Multi-Select Toggles**: For Tier 2 (Factors and Multiples), a player might need to click on all numbers that apply. Instead of typing them one by one, presenting a "Data Stream" of 6–8 numbers where they tap the correct ones feels more like hacking.
* **Radio Buttons (A, B, C) [COMPLETED]**: Essential for Conceptual Checks (Meditation). Since these are high-text "Why" questions, a 4-button horizontal or vertical layout is standard.
  * *Example:* "Why align the decimal?" [A] Place Value [B] Ease of Reading [C] Rule of Math.

## 4. Spatial & Interactive Input
These move away from "the keyboard" and into "the environment."
* **Coordinate Grid Interaction**: For Tier 8, you should allow the player to tap/click directly on a (x, y) grid. This is much more intuitive than typing (2, -3) and helps build that "spatial mastery" you're aiming for.
* **Sorting/Ordering (Drag & Drop)**: Used for Relational Locks (Blue Chests). For Tier 1 (Rounding) or Tier 8 (Integers), the player could drag tiles into a sequence from least to greatest.

## 5. Implementation Map by Tier

| Input Type | Tiers Affected | UI Component Recommendation |
|---|---|---|
| Numpad + Decimal | 1, 3, 5, 6, 7, 10 | Standard numpad + . key. |
| Numpad + Negatives | 8, 9 | Add - key; place it prominently. |
| Fraction Bridge | 4, 5, 6 | A "Stacked Box" UI where the cursor jumps from Top to Bottom. |
| Relationship Bar | 4, 10 | A small 3-5 button bar (<, >, =, ≤, ≥). |
| Grid Interaction | 8, 10 | Interactive 10 x 10 graph for plotting points. |
| Choice Select | All (Meditation) | Minimalist terminal buttons (A, B, C, D). [COMPLETED] |

## A Note on "Hacker Fluency"
For PC players, map these to the keyboard immediately:
* `Enter` to submit.
* `Tab` to jump between numerator and denominator.
* `Space` for Meditation/Healing.
* `Numbers` for Ciphers.

For Mobile players, ensure the numpad is large enough for "thumb-hacking." Place the numpad on the right and the "Modifier" keys (fraction, decimal, negative) on the left to allow for two-handed input during fast ATB fights.
