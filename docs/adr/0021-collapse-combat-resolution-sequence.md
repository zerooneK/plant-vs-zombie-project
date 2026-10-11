# 0021: Collapse combat resolution sequence

**Status:** accepted

**Date:** 2026-10-06

## Context

Following Candidate 3's Lawn Mower defense consolidation, an architectural review identified shallowness in how projectile combat and zombie casualties were orchestrated:
1. `src/game/sim.ts: advance` manually coordinated three sequential micro-operations:
   - `flyRight(shots, zombies)`: Advanced projectiles, applied collision damage and chill, but left zero-health zombie corpses on the lawn.
   - `removeExhausted(landing.zombies)`: Cleared dead zombies so subsequent plant targeting wouldn't fire at corpses.
   - `fireFromPlants(occupants, standing, landing.shots, nextShotId)`: Decremented shooter cooldowns and discharged new projectiles aimed at living survivors.
2. The simulation loop was burdened with intermediate corpse lifecycle management. If a caller omitted `removeExhausted`, dead corpses would leak into plant targeting.

## Decision

**1. Consolidate combat resolution into a deep module (`src/game/shots.ts`).**
Expand `src/game/shots.ts` to own projectile flight, collision mechanics, casualty purging, and plant firing behind a unified seam: `resolveCombat(input: CombatInput): CombatResult`.

**2. Make micro-steps internal to `src/game/shots.ts`.**
`flyRight`, `fireFromPlants`, and `fireShot` are now private to `src/game/shots.ts`.

**3. Encapsulate casualty cleanup.**
`resolveCombat` calls `removeExhausted` internally between projectile impact and plant targeting, ensuring zero-health corpses are purged immediately and never leak to plant targeting or the win/loss condition.

## Consequences

- High leverage for callers: `sim.ts` interacts with a single combat seam (`resolveCombat`) rather than plumbing intermediate lists across three sequential passes.
- Strong locality: Projectile physics, casualty filtering, and shooter targeting are contained entirely inside `shots.ts`.
- Intermediate corpse state is encapsulated and cannot leak.
- Directly verified by unit checks in `tests/shooters.test.ts`. All 178 tests pass.
