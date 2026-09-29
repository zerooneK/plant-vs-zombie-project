# 0008: A shooter variant is the plain pea with one thing changed

**Status:** accepted

**Date:** 2026-09-29

## Context

Ticket 12 is three plants, and the ticket describes each of them as the Peashooter
with a single difference: a Snow Pea that slows and passes through, a Repeater that
fires twice, a Puff-shroom that is free and short. That is a small amount of behaviour
and an awkward amount of *shape*. The rules already had a `Shooting` description with
a fire interval and a damage, and a pea in flight with an id, a Row, a place along it,
the Zombie it was aimed at and a damage. Everything the ticket asks for is either a
new field on that description or a new question asked of a pea in flight.

There were two ways to build it. Each variant could get its own branch in the rules -
`if (plant is snowpea) { ... }` - or the description of a shot could grow the four
fields the three plants actually vary in, so that the variants become four entries in
the roster rather than four places in the code. The first is what the roster was built
to avoid: `plants.ts` exists so that the next plant is an entry rather than a branch,
and the note on the `Shooting` interface already promised that adding a plant which
shoots differently would be "an edit to this and not a new place in the rules".

That promise had never been tested, because no plant had yet needed a shot that
differed from the Peashooter's in anything but price.

## Decision

**What a shot does is one value, and the four shooters are four versions of a single
plain pea.**

```ts
const ONE_PEA: ShotEffect = {
  damage: PEA_DAMAGE,
  slowSteps: 0,
  passesThrough: false,
  reachIn: WHOLE_LAWN,
}
```

and each variant is a copy with the one line that is its own changed:

| Plant | What differs from `ONE_PEA` |
|---|---|
| Snow Pea | `slowSteps`, and `passesThrough` |
| Repeater | nothing — it is `projectiles: 2` |
| Puff-shroom | `reachIn: 3` |

The reach is the one number in the roster that took a second measurement to pin, and the
way it was first measured was wrong in an instructive way. A check asked how far a
*Zombie* was standing when a Puff-shroom's puff reached it, and answered "between two
and three Columns" — which catches a reach of one and a reach of nine, and passes on two
and a quarter. The shot and the Zombie were moving towards each other, so the number
being read was a mixture of the reach and the Zombie's walking speed rather than the
reach. Asking instead where the puff *stops* — which is the reach, with no Zombie in it
at all — gives three Columns to within one puff-step, and seven intermediate values
that had been passing now fail.

Two fields and not one, because *what a projectile does to a Zombie* and *what it does
to the Zombies behind that one* are different questions. A Snow Pea answers both yes,
and coupling them would make the second question unreachable — a plant that slowed one
Zombie without passing through would need a new rule rather than a false one.

A projectile carries its effect with it rather than looking it up from the plant that
fired it, so what a pea does is settled when it is fired and cannot change in flight.
That was already the reason `Shot` carried a damage, and the note on it named the
Repeater's two peas and the Snow Pea's pea as the cases it was written for. The reach
travels with the pea for the same reason, and in the same absolute form — a pea's
limit is where it stops, settled at the moment of firing, not a Column count looked up
again on every step.

**A slow is a countdown on the Zombie, and it shortens the Zombie's step rather than
making the Zombie skip one.**

`walked` is a tally of steps rather than a position, so that where a Zombie is can
never drift and is the same on a fast machine and a slow one. A step-granular slow
cannot be expressed in that tally: a Zombie that took a whole step every other step is
walking at half speed exactly, and anything else would have to either skip a step it did
not have or drift. Half a step is a number the tally holds, which is why the original's
half is the fraction here — not because half is a good number, but because it is the
only one that is exact in whole and half steps together.

The countdown lives on the Zombie rather than on the Snow Pea, and runs down on every
step whether the Zombie is walking or eating. Both of those are the same decision
wearing different clothes: **a slow is something that happened to a Zombie's legs, not
something a plant is holding on to.** So digging the Snow Pea up does not un-slow the
Zombie — it walks slowly for what is left of the ten seconds and then walks normally.
A check that only looked at the end of that would have passed just as happily on a slow
that ended the instant its plant was dug up, so both halves are held.

## What it cost, and what it caught

**A check that watched a level rather than a single shot was worthless here, and the
first version of this ticket's main check was exactly that.**

The claim was that a Snow Pea affects every Zombie along its path. The first check
counted, over a whole level, how many Zombies in a Row were ever hit — and it passed.
But the Snow Pea in the data was not passing through anything: `passesThrough` was
never set, and each pea aimed at the nearest Zombie like any other. It hit all three
anyway, over about a second and a half, because the Zombies it hit were slowed and fell
behind, so the next one became the nearest and was aimed at in turn.

That is a completely different mechanism, and it stops working the moment a Row's
Zombies are spread out instead of queueing up: a pea that has to re-aim between
Zombies cannot hit Zombies that walk in together. The check was measuring an accident
of the numbers and would have gone on reporting it as a rule.

Rewritten to watch **one shot** — wait for three Zombies in a Row, note the next pea
that plant fires, count how many Zombies that one pea hits before it leaves the lawn —
it failed immediately and said `1 !== 3`. The second thing it caught was in the rule
itself: the first version of "every Zombie it has reached" tested only that the pea had
got level with a Zombie, so a passing-through pea went on hitting the same Zombie on
every step for the rest of its flight, emptying it in a fraction of the time its health
says. A pea sweeps over a Zombie on one step, and the rule has to say so with both edges
of the pea.

**Every field of every shooter's *shot* is held by a check, and the tables are the
reason.**
Each of the four shooters is asked what one shot reached and what it left on what it
reached, from two positions on the lawn. Both positions are load-bearing: from the
seventh Column, where every Zombie in the Row is within a Puff-shroom's reach, the table
catches a variant quietly given a second difference (a Repeater whose peas also passed
through, a Puff-shroom whose puff also slowed); from the first Column, where they are
five Columns out, it catches a plain shooter that has been given a Puff-shroom's reach,
which close up behaves exactly like a Peashooter and passes everything else in the file.

Every one of those was tried against a deliberately broken roster and watched to fail.

The two fields that are *not* about a shot took a second pass, and they are worth
recording because the review found them and a first pass had missed them. Health and
Recharge for the three new plants were copied from the Peashooter's — correctly, and
with a comment in `balance.ts` saying so — and nothing was holding the copy. A Snow Pea
quietly given a Wall-nut's health, or a Repeater given a two-second Recharge, passed the
whole suite unchanged, because every other check in the file is about what a plant does
with a shot and none of them looked at how long it survives or how long its packet takes.
A review that mutation-tested the roster found five such breaks, all of which sailed
through. They are now held by counting bites until a Square is bare and by finding the
step a used packet can be chosen again on — both read out of the rules rather than
asserted beside a literal, so a number that is wrong somewhere fails a check rather
than agreeing with itself.

The lesson is the one this project has already learned twice: **a copy is not a
check.** Writing `HEALTH = PEASHOOTER_HEALTH` in the roster is a claim; the comment
above it is another claim; neither is anything that would notice being false.

## What this settles for later

The next shooter is an entry, and the question to ask of it is which of the four fields
is its own. The Chomper, the Potato Mine and the Cherry Bomb are not shooters and will
want something else — a `shooting` of `null` already covers a plant that never shoots,
and what a plant does *instead* of shooting is the open question those three share.

The numbers themselves are the weakest thing here, and deliberately so. **Every number
this ticket added is from memory and none of it has been played.** The Sunflower's
numbers were confirmed at ticket 11 by playing Level 1-1 and watching the plant in it;
these three have never been in a Level a player can play, because the only Level that
offers them is the test bed, and a test bed is somewhere to look at a plant rather than
somewhere to balance one. A Snow Pea at 175 and a Repeater at 200 are the original's as
best they are remembered, and nothing has yet asked whether they are *these* numbers.
That is not a reason to guess better. It is a reason to know which numbers are
load-bearing before a Level offers any of them — the Repeater's 200 and its two peas are
a straight sum a player can do in their head, and the Snow Pea's is the number the slow
is worth ten seconds of.
