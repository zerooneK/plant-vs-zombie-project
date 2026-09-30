# 0009: A plant's third job is arming, and a Potato Mine destroys rather than damages

**Status:** accepted

**Date:** 2026-10-01

## Context

Ticket 13 is one plant with a rule no other plant has. A Potato Mine is planted dormant,
does nothing for fifteen seconds, then arms, then destroys the first Zombie that reaches
it and leaves the lawn. It is the first plant in the game that is useless from the moment
it goes down, and the first one that acts on a Zombie *arriving* rather than on a Zombie
standing at a distance.

That combination does not fit the roster as it stood. `Plant` had two optional
descriptions — `shooting` and `producing` — and the `null` of each said "does neither".
A mine does neither *temporarily*, and then does a third thing, once. Three shapes were
available and all three are wrong:

- **A plant that is a `shooting: null` with a flag on it.** The flag says how long it
  waits. The trouble is that "not yet armed" and "never fires" are different claims, and
  a flag cannot hold both: a flag read at plant time has to be ignored at fire time, so
  something has to know *when* to read it differently. That something is a branch, and
  the branch is what the roster was supposed to avoid.
- **A mine as a `shooting` with a reach of zero, arming counted as a fire interval.**
  This is tempting because the shapes fit exactly, and it is wrong twice over. A mine
  does not shoot, so it would be a weapon that fires nothing, which is a plant the rules
  describe as a weapon and the picture draws as a lump. And "the first Zombie to reach
  it" is not "the nearest Zombie in its Row": the two disagree the moment a Row has a
  plant between the Zombie and the mine, which is the situation the mine exists for.
- **A mine outside the roster, handled as a special kind of occupant.** This keeps
  `Plant` clean at the cost of everything else. Every place that asks what a plant does —
  the Seed Bank's cost, the Shovel, `plantIn`, the drawing's per-plant branch, the health
  a Zombie eats off — would need to know about two kinds of plant, and `Occupant` would
  gain a variant whose only member is one plant.

## Decision

**A plant has a third optional description, `arming`, and `Arming` is one number: the
delay before it is armed.** What an armed plant does is not a per-plant choice. It takes
the first Zombie standing in its Square, removes that Zombie from the lawn, and removes
itself. There is no damage figure, no area, and no target selection in the roster, because
none of those vary between arming plants — they would be four ways of writing the same
rule and three of them would be unused.

The countdown lives on the plant as `stepsUntilArmed`, alongside `stepsUntilShot` and
`stepsUntilSun`, and is read by the drawing and stepped by the rules from that one number.
Zero means armed. That is the opposite way round from the other two countdowns, and
deliberately: armed is the state a mine spends all of its life in except for the first
fifteen seconds, so "armed is the resting state" is the reading under which a mine
standing on a lawn for the rest of the level needs nothing said about it.

**A mine destroys, which means it removes a Zombie from the lawn and does not damage one.**
This is the same answer the Lawn Mower gives, for the same reason: what each of them does
is take something off the board rather than take a quantity off it. It also refuses to
answer a question that has not been asked yet. Ticket 16 adds a Conehead and a Buckethead,
and the original's Potato Mine destroys a Conehead but not a Buckethead — so the moment
this is a damage number, somebody has to decide what happens to a mine facing armour, and
the honest position is that nobody has. A removal is not a decision about that, and a
number would be one in disguise. If ticket 16 finds the original's answer, this becomes
a field on `Arming` and the mine's rule gains a branch; nothing else about it moves.

**A mine asks "has a Zombie reached it" with the same question the Zombie's own step
asked.** `detonateMines` calls `plantBeingEaten` on the same lawn `walkAndEat` just used,
and fires for the mine that call names. Not a place along a Row worked out again, and not
a distance — because two questions about one thing is how a mine ends up firing at a Zombie
three Columns away, and nothing notices, because nothing else is asking.

That last point turned out not to be tidiness. It was **the bug that made the mine
impossible to build**, and it was not in the mine. `walkAndEat` worked out where a Zombie
had reached, then handed back the place it had been standing at *before* the step, so that
the Zombie would stay put. That reads as equivalent and is not: a Zombie that had just
arrived was reporting itself in the Square *before* its plant's, so the plant it was
chewing on was not the plant `plantBeingEaten` found for it afterwards. Every check that
asked *where it stopped* passed, because a Zombie that has arrived does not move on the
next step either. Two things were reading the lawn and getting different answers: the
drawing, which asks whether a Zombie is eating before drawing its reaching arms, and the
mine, which asks whether it has been reached. Every Zombie in this project had been drawn
standing beside the plant it was eating with its arms down. The fix is the order of two
lines — **ask where a Zombie is before it walks, not after** — and the reason it went
unnoticed for thirteen tickets is worth recording: the off-by-one is a quarter of a
Column wide, which nothing can see, and it crosses a Square boundary, which only something
asking a second question can see.

## Consequences

- **A third plant-file and a third kind of thing, and no new rule per plant.** The Chomper
  and the Cherry Bomb are not "arms then destroys", so they are not `arming` plants and
  will want their own descriptions. What this ticket settles is that the roster's shape is
  "one optional description per job a plant can have", not "three plants and three flags".
- **A mine is food while it waits, and that is free.** A mine is a plant, and the rule for
  a plant in a Zombie's way is that the Zombie stops and eats it — so a Zombie arriving
  early spends three bites on a lump and the player watches 25 Sun and their Row's only
  trap go. No rule was added for this. It is the strongest argument the design has for the
  fifteen seconds, and it came out of rules that were already there.
- **A mine's Recharge is the slowest in the game.** 30 seconds, shared with the Wall-nut,
  for the reason the Wall-nut's is: both are plants a player puts down once and counts on.
  A mine that came back every seven and a half seconds could be lined across a Row while
  the player waited.
- **The test bed's Seed Bank order now has a claim about where the trap goes.** Eight
  packets, and the whole list is held in `tests/planting.test.ts` rather than in a file
  about one kind of plant. It used to be split between `shooters.test.ts` and
  `wall-nut.test.ts`, and a list that lives in two files is a list that has to be changed
  in two files; they came to disagree the moment a fifth plant arrived, and again the
  moment an eighth one did.
- **Armour is still open.** Recorded above and not resolved here. Nothing in the mine's rule
  will need changing for ticket 16 unless a mine turns out to be too weak for something,
  which is the one thing this decision cannot tell you.