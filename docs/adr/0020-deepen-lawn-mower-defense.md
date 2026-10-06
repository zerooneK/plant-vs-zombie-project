# 0020: Deepen Lawn Mower defense across the UI seam

**Status:** accepted

**Date:** 2026-10-06

## Context

Following Candidate 2's Sun economy deepening, an architectural review identified a leaky seam in how Lawn Mower defense state was represented and consumed:
1. Active mowers were stored solely as `{ kind: 'lawnMower' }` in `state.occupants`. When triggered, mowers were deleted from `occupants` without any first-class record.
2. The presentation layer leaked across the rules seam:
   - `src/ui/Lawn.tsx` implemented a private deduction loop (`rowsWithoutAMower`) scanning all 5 rows of `state.occupants` to deduce spent rows for the UI status report.
   - `src/draw/board.ts` repeatedly queried `!hasLawnMower(state.occupants, square)` to decide where to draw dashed spent footprints.
3. The absence of an explicit field forced multiple presentation sites to infer game rules by searching generic board occupants.

## Decision

**1. Represent spent mowers explicitly on `GameState`.**
Add `spentMowers: readonly Row[]` to `GameState`, initialized as `[]` in `initialGameState()`.

**2. Manage spent mower lifecycle inside `src/game/mowers.ts`.**
`runMowers(zombies, occupants, spentMowers): MowerStep` clears zombies in breached rows, removes mowers from `occupants` (freeing Column 0 for planting per Ticket 06), and returns updated, numerically-sorted `spentMowers`.

**3. Consume explicit state directly in presentation.**
- `src/ui/Lawn.tsx`: Deleted `rowsWithoutAMower`. `Report.spent` is assigned directly from `state.spentMowers`.
- `src/draw/board.ts`: Iterates `state.spentMowers` directly to render spent footprints, eliminating row-by-row occupancy queries.

## Consequences

- Clean UI seam: Presentation components receive direct facts from `GameState` with zero deduction loops.
- Locality: Breach detection, zombie clearing, and spent mower tracking live entirely in `mowers.ts`.
- Preserves backwards compatibility: Column 0 planting (Ticket 06) and existing occupant tests continue to work without disruption.
- Verified by unit tests in `tests/mowers.test.ts`. All 175 tests pass.
