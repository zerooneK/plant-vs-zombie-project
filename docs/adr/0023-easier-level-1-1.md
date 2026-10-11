# 0023: An easier Level 1-1: weaker Zombies and a faster Sunflower

**Status:** accepted

**Date:** 2026-10-12

Supersedes the Sunflower interval in [0007](0007-sunflower-numbers-confirmed-by-playing.md).

## Context

The user played Level 1-1 on the deployed game. Two things felt wrong:

- **A Peashooter planted a few seconds late could not stop the first Zombie.** A Basic Zombie had 270 health: fourteen peas, about nineteen seconds of shooting. The user remembered the original's Zombie falling at about ten peas.
- **A new Sunflower took far too long to make its first Sun.** It made its first piece after the full interval, 24.25 seconds.

ADR 0007 had kept 24.25 seconds on purpose. Two pieces paid a Sunflower back at 48.5 seconds, longer than the 42.3 seconds a Zombie takes to cross the lawn, so a Sunflower was a bet on a Zombie arriving late. A faster one would pay everywhere, and the decision of where to plant it would matter less.

## Decision

- **A Basic Zombie has 200 health.** That is ten peas, about fourteen seconds. It is the original's number too: the original's 270 is 200 of body plus a 70 head that falls off first. Conehead, Buckethead and Flag Zombies share the body and get easier with it. A Flag Wave Zombie has 250, which is thirteen peas.
- **A Sunflower makes Sun every 18 seconds**, the first piece included.

The user chose these knowing what 0007 protected. Payback is now 36 seconds, shorter than a crossing, so a Sunflower comes out ahead in every Row of Level 1-1. When a Zombie arrives still decides how much it earns, but no longer whether it pays.

## Consequences

- Level 1-1 forgives a late first Peashooter, and an economy-first plan wins sooner: 17.6 seconds after the Flag Wave instead of 22.9.
- Planting Sunflowers is no longer a gamble in any Row of Level 1-1. If later Levels need that tension back, their schedules have to bring it, for example with an earlier first Wave, not this number.
- The checks restate the new numbers, as they restate every number.
