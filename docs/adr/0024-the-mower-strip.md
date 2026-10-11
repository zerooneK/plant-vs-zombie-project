# 0024: The mower strip: ten Columns, nine to plant

**Status:** accepted

**Date:** 2026-10-12

Reverses the mower's Square coming back as lawn (ticket 06, in `docs/specs/001-lawn-defence-mvp.md`).

## Context

The board was nine Columns, and each Row's Lawn Mower stood in the first. A fresh Row therefore had eight Columns to plant. Once a mower had run, its Square was bare grass and took a plant, so that Row had nine.

The user compared this with the original. There, the mowers stand on a strip to the left of the lawn, the strip never takes a plant, and every Row has nine Columns to plant. They asked for the original's layout, to make later work easier to match against it.

## Decision

- **The board is ten Columns.** Column 0 is the mower strip and Columns 1 to 9 are the lawn. `BOARD_COLUMNS` is 10, and `MOWER_COLUMN` stays 0.
- **The mower strip never takes a plant.** `isPlantable` in `board.ts` says so, and `place` refuses it the way it refuses a taken Square: no Sun is spent, and the packet stays chosen. This holds whether or not the Row's mower has run.
- **The strip is drawn as bare earth, not grass.** Ticket 06's worry was a Square that looks like any other and refuses a plant. The strip looks different, so it does not.

## Consequences

- Every Row always has nine Columns to plant. How much lawn a player has no longer depends on how badly the level has gone.
- Zombies still walk in from the right edge, at the same speed, and now cross one more Column. They reach a mower 9 Columns after walking in, not 8, and get past the left edge after 10 Columns, not 9. Level 1-1's measured times move with it: a player who plants nothing now loses at 147.0 seconds, not 142.3. An economy-first plan wins with 17.9 seconds to spare, not 17.6.
- The board is a ninth wider, so on the same screen every Square is drawn a little smaller.
