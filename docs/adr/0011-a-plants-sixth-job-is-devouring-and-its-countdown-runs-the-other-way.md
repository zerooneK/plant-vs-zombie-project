# 0011: A plant's sixth job is devouring, and its countdown runs the other way

**Status:** accepted

**Date:** 2026-10-03

## Context

Ticket 15 is the Chomper, and it is the plant that finally broke the shape. A Potato Mine
(`arming`) waits fifteen seconds and then takes one Zombie. A Cherry Bomb (`detonating`)
takes a three-by-three patch and is gone. A Chomper takes one Zombie — **and stays standing,
unable to take another for forty-two seconds.**

ADR 0010 said this would need a sixth description and declined to guess at it. It was right
that a sixth is needed, and it was right that it is not `arming`, for the reason recorded
there: "a countdown in the opposite direction to `stepsUntilArmed`, and zero means ready in
one and zero means spent in the other." This is that argument, and the opposite direction
turns out to cost more than the sixth field did.

## Decision

**A plant has a fifth optional description, `devouring`, and `Devouring` is one number: how
long it spends chewing after eating.** As with `Arming` and `Detonating`, nothing about
*what eating does* is a per-plant choice: it removes the first Zombie that reaches it from
the lawn, exactly as a mine does, and the plant stays where it is. So the only thing about a
Chomper that is a fact about *this* Chomper is how long it is then out of action.

**One field, `stepsUntilChewed`, and it means two things at the two ends of a Chomper's life
rather than being two fields.** Zero is ready for a plant that has not eaten yet and spent
for one that has — the same reading every other countdown in the game gives at its "ready"
end, and the same one `stepsUntilBite` gives a Zombie that has just arrived at a plant. A
Chomper is the only plant in the game that has both readings in one life, and two fields
would let them disagree: a Chomper could be "ready" and "chewing" at once, which is exactly
the contradiction one field cannot hold.

**It is not `arming` with a negative delay, and the number is positive because of that.**
`Arming` counts *down towards* a moment the plant has not reached; `Devouring` counts *up
from* a moment it has just passed. One reads "how long until ready", the other reads "how
long since last time", and the two cannot be the same counter even though both are "steps
remaining". Making the chew a negative arming delay would have produced a plant that is
armed to a negative number and a rules file that has to ask which of two countdown readings
applies to the plant in front of it.

**The chew runs in the same place in the step as the mines — after `walkAndEat` — and before
the peas fly.** A Chomper eats a Zombie that has *reached* it, so like a mine it can only be
asked once the Zombies have taken their step and are standing where they have got to. It
comes after `detonateMines` because a mine needs a Zombie still standing to be spent on, and
a Zombie a Chomper has just eaten is off the lawn rather than left for a mine in the same
Square to find.

**Nothing exempts a chewing Chomper from being food.** A Chomper that has just eaten stands
in its Square for forty-two seconds unable to eat, and a Zombie that walks into it stops and
eats it like any other plant. That is not a rule about Chompers; it is the rule about plants
that was already here, and it is the punishment the lockout creates.

## Consequences

- **Five optional descriptions, and the roster's rule is settled by argument rather than by
  adding one each time:** one optional description per *job a plant can have*, and each says
  nothing that is not a per-plant choice. Shoot, make Sun, stand in the way, arm, detonate,
  devour. A plant that only blocks is described by no capability at all, deliberately.
- **The step order now has three plants that remove a Zombie rather than damaging one, and
  they run in three different places.** `detonateBombs` before `walkAndEat` — it is waiting
  for nothing. `detonateMines` and `devourWithChompers` after it — they are asked by a Zombie
  *reaching* them. The order is the design, and moving any line changes checks.
- **A Chomper is the first plant that must be *drawn* differently depending on a countdown.**
  Every other difference on the board is a colour or a shape read at a glance; a Chomper's
  whole rule is a *when*, and a Chomper that has just eaten looks identical to a ready one if
  the picture does not say otherwise. `stepsUntilChewed` is read by the drawing for exactly
  the reason `stepsUntilArmed` is read by the mine's light — one number, two readers, so the
  lawn and the rules cannot be two claims about two things.
- **The chew's number is a boundary, and the boundary is what makes it checkable.** Three
  mutations of a countdown — added-to rather than set, spent a step late, spent a step early
  — all leave a chew that counts down, is forty-two seconds long, and that a Chomper comes
  out of. Every one of them passed every check in the file until there was a check about the
  *step* the chew runs out on, with a Zombie standing in the Square at the time. That check
  is the reason the file has five checks rather than four.
- **A Chomper that eats something standing in its Square has already been bitten once by it.**
  `walkAndEat` bites a plant a Zombie has reached and `devourWithChompers` takes that same
  Zombie off the lawn a moment later, both inside one step. Not a rule about Chompers —
  what "a Zombie that walks into a plant stops there" means — but surprising enough that a
  check says so.
- **Armour is still open, and this ticket does not answer it either.** A Chomper removes a
  Zombie rather than damaging it, for the same reason a mine and a bomb do and by the same
  argument in ADR 0009: the original's Chomper destroys outright, so there is nothing for a
  Conehead's armour to be worth. If ticket 16 finds otherwise, this becomes a field on
  `Devouring` exactly as ADR 0009 describes for `Arming`, and nothing else about the plant
  moves.
