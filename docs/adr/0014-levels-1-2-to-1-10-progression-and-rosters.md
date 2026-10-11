# 0014: Levels 1-2 to 1-10 progression and rosters

**Status:** accepted

**Date:** 2026-10-06

## Context

Ticket 18 implements Levels 1-2 through 1-10, completing the 10 levels for the Lawn Defence MVP as specified in `docs/plan.md` and User Stories 57–63 in `docs/specs/001-lawn-defence-mvp.md`.

Prior to this ticket, only `LEVEL_1_1` and `LEVEL_TEST` existed. The remaining 9 levels needed definitions as pure data in `src/game/levels.ts`, pacing the introduction of the 10 plants and 5 zombies across a rising difficulty curve, along with level progression data (`LEVEL_ORDER` and `nextLevel`).

## Decision

**1. Sequential plant expansion across the 10 levels.**
Following the canonical progression of Adventure mode:
- **1-1:** Peashooter, Sunflower
- **1-2:** adds Cherry Bomb
- **1-3:** adds Wall-nut
- **1-4:** adds Potato Mine
- **1-5:** adds Snow Pea
- **1-6:** adds Chomper
- **1-7:** adds Repeater
- **1-8:** adds Puff-shroom
- **1-9:** adds Tall-nut
- **1-10:** all 10 plants available for the tenth Level.

**2. Canonical zombie debuts and escalating wave compositions.**
- **1-1 to 1-2:** Basic Zombie and Flag Zombie.
- **1-3 to 1-5:** Conehead Zombie debuts, demanding Wall-nut stalling, Potato Mine preparation, or Snow Pea slowing.
- **1-6 to 1-7:** Pole Vaulting Zombie debuts with double running speed and plant-clearing vaults, countered by Chomper and Snow Pea.
- **1-8 to 1-9:** Buckethead Zombie debuts with 1100 armour, countered by concentrated fire and 0-cost Puff-shrooms; Tall-nut appears at 1-9 to stop Pole Vaulting Zombies.
- **1-10:** The tenth Level features all 5 zombie varieties across 10 waves.

**3. Wave schedule invariants.**
- Every level begins with an initial breather (at least 20 seconds before Wave 1) so players can accumulate Sun and plant their initial defence.
- Every level concludes with exactly one Flag Wave marked with `flagWave: true` containing at least one Flag Zombie.
- Every level is strictly losable if the player takes no action: at least one row receives repeated attacks spaced far enough apart that the lawn mower clears the first zombie and subsequent zombies breach the unprotected house.

**4. Pure data progression.**
- `LEVEL_ORDER` lists `'1-1'` through `'1-10'` in sequential order.
- `nextLevel(levelName: string): Level | null` returns the next level in Adventure mode, or `null` upon clearing Level 1-10 or for unrecognized level names.
- All 10 levels are registered in `LEVELS`, allowing direct browser testing via `?level=1-x`.

## Consequences

- Levels 1-1 to 1-10 are fully defined and playable in `src/game/levels.ts`.
- The rule boundary is strictly preserved: levels remain pure configuration data with no React, DOM, or drawing dependencies.
- Ticket 19 can now build the Level Select menu and saved persistence on top of `LEVEL_ORDER`, `LEVELS`, and `nextLevel`.
