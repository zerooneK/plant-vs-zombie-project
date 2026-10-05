# 0012: Armour absorbs hits before health, and one-hit kills ignore it

**Status:** accepted

**Date:** 2026-10-06

## Context

Ticket 16 adds the Conehead and Buckethead Zombies, the first enemies in the game with Armour.
ADR 0009, 0010, and 0011 left Armour open: how do pea projectiles damage an armoured Zombie,
what happens when armour breaks, and how do instant-kill weapons (Potato Mine, Cherry Bomb,
Chomper, and Lawn Mower) treat armoured targets?

## Decision

**Armour is a separate numerical layer on a Zombie that absorbs damage before health is touched.**
A Conehead has 370 armour and 270 health; a Buckethead has 1100 armour and 270 health.
When hit by a projectile:
1. Damage is deducted from `armour` first.
2. If damage exceeds what remains of `armour`, the excess carries over directly to `health`.
3. Subsequent damage reduces `health`.
4. A Zombie is removed only when its `health` drops to zero (at which point its armour is already zero).

**One-hit removals (Potato Mine, Cherry Bomb, Chomper, Lawn Mower) destroy an armoured Zombie whole.**
They do not deal arithmetic damage, so Armour provides no protection against them. A Potato Mine
or Cherry Bomb clears the Zombie and its cone/bucket together; a Chomper devours the Zombie whole
in a single bite; a Lawn Mower removes everything in its Row on contact. Neither `Arming`, `Detonating`,
nor `Devouring` requires any new branch or armour-piercing flag: "destroy" means take off the lawn,
regardless of what the Zombie was wearing.

**Armour is visually two stages.**
A traffic cone or metal bucket is drawn on the Zombie's head only while `armour > 0`. Once armour
reaches zero, the decorative headwear is no longer drawn, and the Zombie underneath looks and behaves
like an ordinary Basic Zombie.

**Flag Wave toughness applies to both health and armour.**
In a Flag Wave, both health and armour are scaled by `FLAG_WAVE_TOUGHNESS` (1.25, rounded), preserving
the rule that every Zombie in the Flag Wave is tougher than in regular waves.

## Consequences

- The `ZombieKind` and `Zombie` models gain an `armour` field (0 for unarmoured zombies).
- No plant definitions or capabilities needed to change.
- Instant-kill weapons retain their single, unified rule: removing the target entity whole.
- The two-stage combat loop is observable both in game rules and on the canvas.
