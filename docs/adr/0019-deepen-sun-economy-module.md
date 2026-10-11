# 0019: Deepen Sun economy module

**Status:** accepted

**Date:** 2026-10-06

## Context

Following Candidate 1's plant action consolidation, an architectural review surfaced shallowness in how the Sun economy was organized:
1. `src/game/sun.ts` acted as a shallow grab-bag of micro-helper functions (`fallSun`, `spendLife`, `isResting`, `isSpent`, `spawnSun`, `sunUnderPoint`).
2. The simulation loop (`src/game/sim.ts`) was forced to own the low-level lifecycle of tokens: iterating over tokens to determine which were resting versus falling, updating steps of life, filtering spent tokens, and managing the sky Sun spawn countdown.
3. Sun collection in `sim.ts: collect()` directly conducted point-hit queries, extracted token amounts, modified bank state, and filtered token arrays.

## Decision

**1. Consolidate token lifecycle and physics into a deep Sun module (`src/game/sun.ts`).**
We make token lifecycle helper functions (`fallSun`, `spendLife`, `isResting`, `isSpent`, `spawnSun`, `sunUnderPoint`) private to `sun.ts`.

**2. Expose a unified step function (`stepSun`).**
`stepSun(input: StepSunInput): StepSunResult` accepts a state slice (`tokens`, `stepsUntilSkySun`, `nextSunId`, `random`), advances falling and resting tokens, removes expired tokens, checks the sky countdown, and spawns new sky Sun when due. `sim.ts` passes `state` directly and spreads the returned slice.

**3. Encapsulate hit detection and collection in `collectSun`.**
`collectSun(tokens, point): CollectSunResult` handles coordinate hit detection, returns the remaining tokens, and reports the collected Sun amount (0 if missed). `sim.ts: collect` simply applies the returned amount to the player's bank balance.

**4. Preserve `sunFrom` export for plants.**
`sunFrom(square, id, amount): SunToken` remains exported for `plants.ts: producePlantSun` so that Sunflower production generates board-anchored tokens without coupling plant rules to sky timers.

## Consequences

- Hides token physics and expiration details behind a clean, testable seam.
- `sim.ts` no longer manages token mechanics, loops over tokens, or manages `SUN_INTERVAL`.
- Eliminates 35 lines of leaked mechanics and helper interfaces from `sim.ts`.
- The interface is directly tested in `tests/sun.test.ts` via unit tests for `stepSun` and `collectSun`.
- All 172 test cases pass; build and types remain clean.
