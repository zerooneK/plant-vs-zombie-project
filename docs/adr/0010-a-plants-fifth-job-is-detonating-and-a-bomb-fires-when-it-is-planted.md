# 0010: A plant's fifth job is detonating, and a Cherry Bomb fires when it is planted

**Status:** accepted

**Date:** 2026-10-02

## Context

Ticket 14 is a second plant with a rule no other plant has. A Cherry Bomb is planted and
on the next step takes every Zombie in a three-by-three patch of lawn off the board and
leaves the lawn itself. It is the first plant in the game that removes *more than one*
Zombie at a time, and the first one that acts on a Zombie that has **already arrived**
rather than on one approaching or standing at a distance.

ADR 0009 added `arming` for the Potato Mine and closed by saying that the Chomper and
the Cherry Bomb "are not 'arms then destroys', so they are not `arming` plants and will
want their own descriptions". This is that description. The question is not *whether*
it is a fifth field — it is whether the fifth field is right, and what is in it.

## Decision

**A plant has a fourth optional description, `detonating`, and `Detonating` is two
numbers: how many Rows and how many Columns the blast reaches.** As with `Arming`,
nothing about *what a blast does* is a per-plant choice: it removes every Zombie standing
in the area from the lawn, and leaves the lawn. No damage figure, no target selection,
no "how many of them" — a blast is not a shot that can miss one of two.

**There is no delay, and that absence is the decision.** `Arming` holds one number
because that is the only thing that differs between arming plants; there is no
equivalent here because a Cherry Bomb is not a plant that *becomes* a bomb. It is the
whole of its rule from the moment it is planted. `Arming` could not have held this plant
even with a delay of zero, because a zero delay would leave it standing on the lawn
waiting for something to set it off — and there is nothing that sets it off. A Potato
Mine is triggered by a Zombie *reaching* it; a Cherry Bomb is triggered by the player
*choosing* it, and those are different triggers, not different delays.

**The blast removes Zombies and not plants, and this is not a special case.** Nothing in
the game takes a plant off the lawn except a bite and the Shovel. A Lawn Mower clears a
Row of Zombies and leaves every plant in it standing; a Potato Mine removes one Zombie
and leaves everything else. So a Cherry Bomb blown up next to a Wall-nut leaves the
Wall-nut, with whatever health it had. This is worth a check of its own rather than a
comment: "clears an area" is a phrase that reads just as well as "leaves nothing standing
there", and that version would take a player's Row of Peashooters with it.

**The bomb runs at a different point in the step than the mines, and this is the whole
of the difference between the two plants.** `detonateMines` runs *after* `walkAndEat`,
because a mine is set off by a Zombie arriving at it and can only be asked once the
Zombies have taken their step. `detonateBombs` runs *before* `walkAndEat`, because a
bomb is waiting for nothing and can be asked at any point. That ordering is not a
detail: a bomb put down in front of a Zombie that is about to reach a plant kills it
before it arrives, whereas asked after the Zombies have walked, that Zombie would
already have taken its bite and the bomb would be rescuing a Row one bite too late. A
Cherry Bomb is the answer to "this Row is already lost", and it is only the answer to
that question if it beats the Zombie to the bite.

## Consequences

- **Four optional descriptions, and the roster's shape is now settled by argument rather
  than by adding one each time**: one optional description per *job a plant can have*,
  and each of those descriptions says nothing that isn't a per-plant choice. Shoot,
  make Sun, stand in the way, arm, detonate.
- **The Chomper will need a sixth, and it is not this shape.** It removes one Zombie and
  is then useless for a long chew. It has no area (so not `detonating`), no delay before
  it acts (so not `arming`), and its distinguishing number is a lockout *after* firing
  rather than a wait before — which is a countdown in the opposite direction to
  `stepsUntilArmed`, and zero means ready in one and zero means spent in the other.
  Ticket 15 owns that argument; this ADR does not make it in advance.
- **The blast is measured in Squares, not board units.** A question about whether an
  explosion reaches a Zombie has to be asked in the unit a Zombie is *in*, because a
  Zombie between Squares has no Square and a blast in board units would then have to say
  what happens to a Zombie standing between two of them. Asking `squareAtX` — the same
  question `walkAndEat` and the drawing ask — is what makes the rules and the picture
  unable to disagree about it.
- **The bomb is drawn from no state at all**, which no other plant on the board is. It
  has no countdown, no health fraction, and no state a player could be waiting on: it
  stands for exactly one step. There is nothing for the drawing and the rules to be
  two different claims about, which is why `drawCherryBomb` takes no `Planted`.
- **Armour is still open, and this ticket does not answer it either.** A bomb removes
  Zombies rather than damaging them, for the same reason a mine does and by the same
  argument in ADR 0009: the original's Cherry Bomb destroys everything in its area, so
  there is nothing for a Conehead's armour to be worth. If ticket 16 finds otherwise,
  this becomes a field on `Detonating` exactly as ADR 0009 describes for `Arming`, and
  nothing else about the bomb moves.

## Superseded in part

The note above on the Chomper is answered by
[`0011-a-plants-sixth-job-is-devouring-and-its-countdown-runs-the-other-way.md`](./0011-a-plants-sixth-job-is-devouring-and-its-countdown-runs-the-other-way.md).
Its prediction held: the Chomper needed a sixth description, it is not `detonating` and
not `arming`, and the countdown runs the opposite way to `stepsUntilArmed` — zero means
ready at one end of a Chomper's life and spent at the other. Ticket 15 owns that argument
and ADR 0011 is it.