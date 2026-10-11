# 0013: A Pole Vaulting Zombie runs, vaults once, and Tall-nut blocks it

**Status:** accepted

**Date:** 2026-10-06

## Context

Ticket 17 adds the Pole Vaulting Zombie, the fifth and final early zombie specified in the MVP plan.
User Story 49 requires: "As a player, I want a Pole Vaulting Zombie to vault the first plant it meets
and then walk like any other Zombie, so that one plant does not stop it."
In the original Plants vs. Zombies, the Pole Vaulter runs with its pole, jumps over the first plant it
encounters, and is famously stopped dead only by the Tall-nut.

## Decision

**A Pole Vaulting Zombie has 500 health, 0 armour, and runs while holding its pole.**
Holding the pole is tracked by `hasPole: boolean`. While `hasPole` is true, the zombie advances at twice
the standard walking speed (2 steps per tick; 1 step per tick when slowed by Snow Pea).

**Vaulting clears the obstacle Square in a single bound.**
When arriving at a plant:
1. If the plant is **not** a Tall-nut:
   - The zombie vaults across the obstacle Square into the Column immediately to its left.
   - Its `walked` tally advances by `ZOMBIE_STEPS_PER_COLUMN` (moving `zombieX` leftwards by exactly
     `SQUARE_WIDTH`), cleanly preserving integer math without fractional position drift.
   - The obstacle plant takes zero bite damage.
   - The zombie drops its pole (`hasPole = false`).
   - If the landing Square holds a plant, the zombie stops and bites it. If empty, it continues walking
     at normal speed (1 step per tick).
   - If the landing Square holds an armed Potato Mine or ready Chomper, the landing triggers it normally.
2. If the plant **is** a Tall-nut:
   - The Tall-nut blocks the vault.
   - The zombie loses its pole (`hasPole = false`), remains in front of the Tall-nut, and begins eating it.
   - Plants behind the Tall-nut remain unreached and safe.

**Flag Wave toughness scales health.**
In a Flag Wave, the Pole Vaulting Zombie's 500 health is multiplied by `FLAG_WAVE_TOUGHNESS` (1.25, rounded
to 625), matching the Flag Wave scaling rules established for other zombies.

**Visual presentation shows the carried pole.**
While `hasPole` is true, the pole is drawn held in the zombie's hand extending forward. Once vaulted or
blocked, the pole disappears, visually communicating that the zombie has become an ordinary walker.

## Consequences

- All five early zombies from the original game (Basic, Flag, Conehead, Buckethead, Pole Vaulting) are now fully implemented.
- Tall-nut gains its signature gameplay purpose against jumping enemies without altering its plant data definition.
- The rule entry point `apply(state, command)` remains the sole boundary for all simulation and tests.
