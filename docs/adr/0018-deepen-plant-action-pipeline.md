# 0018: Deepen plant action pipeline

**Status:** accepted

**Date:** 2026-10-06

## Context

Following completion of the Lawn Defence MVP (Ticket 21, v0.29.0), an architectural review surfaced shallowness and friction in how plant actions were orchestrated:
1. `mines.ts`, `bombs.ts`, and `chompers.ts` were three shallow, single-function modules. Each exported a function taking zombies and occupants, ran a pass over the lawn, and returned updated lists.
2. The simulation loop (`sim.ts: advance`) was burdened with plumbing intermediate state across four separate passes: `detonateBombs`, `detonateMines`, `devourWithChompers`, and a private `stepProduction` helper.
3. Every plant instance in `Planted` was created manually inside `sim.ts: place()` by initializing four disparate countdown fields (`stepsUntilShot`, `stepsUntilSun`, `stepsUntilArmed`, `stepsUntilChewed`).

## Decision

**1. Consolidate into a deep Plant module (`src/game/plants.ts`).**
We delete `mines.ts`, `bombs.ts`, and `chompers.ts`. All plant data definitions and execution behaviors are unified within `src/game/plants.ts`.

**2. Expose a phase-oriented plant action interface.**
The Plant module now presents two high-leverage phase functions:
- `resolveInstantPlantActions(zombies, occupants): PlantActionResult`: Resolves detonating plants (Cherry Bomb) before Zombies take their step, preserving ADR 0010.
- `resolveContactPlantActions(zombies, occupants): PlantActionResult`: Resolves contact-triggered plants (arming/detonating Potato Mines, then devouring Chompers) after Zombies have walked and Lawn Mowers have run, preserving ADR 0009 and ADR 0011.
- `producePlantSun(occupants, firstId): PlantSunResult`: Advances Sun-producing plants at step conclusion and produces Sun tokens.

**3. Encapsulate plant creation with `createPlanted`.**
Plant instantiation is encapsulated inside `createPlanted(name, square): Planted`. The simulation caller no longer has knowledge of plant-specific countdown initialization.

## Consequences

- Deletes 3 shallow modules (`mines.ts`, `bombs.ts`, `chompers.ts`).
- Maximizes locality: plant capabilities and rules live in one cohesive module.
- High leverage for callers: `sim.ts` interacts with a clean two-phase interface rather than managing four disparate passes.
- All 168 rule tests pass and zero presentation files were affected.
