import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'
import { apply, initialGameState, type GameState } from '../src/game/sim.ts'
import { plantIn, type Square } from '../src/game/board.ts'
import type { Level, Wave } from '../src/game/levels.ts'
import { levelOffering, oneZombieIn } from './helpers.ts'

/**
 * What a Potato Mine costs to plant, written out here rather than read from the
 * rules, because the point of a check is to catch the number being wrong.
 */
const MINE_COST = 25

/**
 * How long a Potato Mine takes to arm itself, in seconds and in steps.
 *
 * Stated in seconds as well because the number a designer would argue about is
 * fifteen seconds rather than nine hundred steps, and for the same reason as every
 * other number in this project: reading it out of `balance.ts` would pass whatever
 * that file happened to say.
 */
const ARMING_SECONDS = 15
const ARMING = ARMING_SECONDS * STEPS_PER_SECOND

/**
 * How long a Potato Mine's Seed Packet takes to Recharge, in seconds and in steps.
 *
 * Thirty seconds, the slowest in the game along with the Wall-nut's, and for a related
 * reason: a Recharge is how often a plant can be planted, and a mine is a plant you put
 * down once and count on rather than one you put down repeatedly. A mine that came back
 * every seven and a half seconds would be a thing a player could line across a Row while
 * they waited, and it would not be a trap any more - it would be a Peashooter that takes
 * fifteen seconds to notice a Zombie.
 */
const THIRTY_SECONDS = 30 * STEPS_PER_SECOND

/**
 * Where the checks below stand their mine, and how long a Zombie takes to get there.
 *
 * The seventh Column, which is a choice rather than a default. A Zombie crosses one
 * Column in about four and a half seconds, so the Column a mine is planted in decides
 * how much warning a check has - and the checks below need both kinds. One wants a
 * Zombie to arrive while the mine is still asleep, and another wants one to arrive
 * after it has woken, and fifteen seconds is between about four and five Columns of
 * Zombie walk. The seventh is the right end of the lawn for that: a Zombie walking in
 * on the first step is standing in it on the 284th, comfortably inside the arming
 * delay, and a Zombie walking in nine hundred steps later is standing in it long
 * after it.
 *
 * Measured rather than worked out, because a check that guesses when a Zombie will
 * arrive is a check that fails for the wrong reason, and one that waits for a thing
 * it can watch is a check that says what it means.
 */
const MINE_SQUARE: Square = { row: 0, column: 7 }

/**
 * A level offering a Potato Mine and nothing else.
 *
 * A mine is all the check gets to put on the lawn, which is not tidiness: a second
 * plant is a second thing that could have done whatever the Zombie did, and a check
 * about what a mine does cannot also be a check about what else on the lawn does.
 */
function aLevelWith(...waves: Wave[]): Level {
  return levelOffering(['potato-mine'], ...waves)
}

/**
 * Steps from a Zombie walking in to its standing in this mine's Square.
 *
 * Measured rather than worked out, for the reason `MINE_SQUARE` gives. It is what lets
 * a check say *a Zombie arrives on this exact step* rather than "some time after", which
 * is the difference between the two sides of a boundary and a check that is somewhere
 * near one.
 *
 * And the reason it is 283 rather than a Column's worth of steps is worth a line: a
 * Zombie spends the step it walks in standing at the right edge of the board, so the
 * steps it has taken when it is standing in the mine's Square is one fewer than the step
 * it is on.
 */
const STEPS_TO_THE_MINE = 283

/** The same Column of the Row below, for the check that needs two mines at once. */
const SECOND_MINE_SQUARE: Square = { row: MINE_SQUARE.row + 1, column: MINE_SQUARE.column }

/** A Zombie walking into the mine's Row on the given step, and no other Zombie at all. */
const A_WAVE_ON = (atStep: number) => oneZombieIn(MINE_SQUARE.row, atStep)

/** A Potato Mine standing in `MINE_SQUARE`, paid for out of the Sun a level starts with. */
function withAMineIn(waves: Wave[] = []): GameState {
  const started = initialGameState(101, aLevelWith(...waves))
  const planted = apply(
    apply(started, { kind: 'choose', choice: 'potato-mine' }),
    { kind: 'place', square: MINE_SQUARE },
  )

  assert.equal(plantAt(planted)?.name, 'potato-mine', 'the mine was planted')

  return planted
}

/** The plant standing in the mine's Square, or undefined when it is bare lawn. */
function plantAt(state: GameState) {
  return plantIn(state.occupants, MINE_SQUARE)
}

/**
 * Plays the game forward by a number of steps, which is the only way time passes.
 *
 * Bounded, and saying what went wrong when it runs out - the same contract as `untilTick`
 * in `helpers.ts`, and for the same reason. An unbounded loop in a check is a check that
 * hangs rather than fails, and a hanging check in a suite says nothing at all about what it
 * was for.
 */
function afterSteps(state: GameState, steps: number): GameState {
  let current = state
  for (let step = 0; step < steps; step++) {
    current = apply(current, { kind: 'advance' })
  }

  assert.ok(
    current.tick === state.tick + steps,
    `the game advanced ${current.tick - state.tick} steps rather than the ${steps} asked for - a level that has ended stops moving`,
  )

  return current
}

test('a freshly planted Potato Mine does nothing, and is planted not yet armed', () => {
  // The Wave is here for a reason worth keeping, and the bound on `afterSteps` is the reason
  // it is noticed: a Level with no Waves left at all is won on its first step, and a won
  // Level refuses even the step command. This check used to play fifteen seconds on a level
  // that had been won before it started, so "it has fired nothing" was a claim about a lawn
  // that had not moved - which passes, and means nothing at all. Every check here now sends a
  // Wave far enough ahead, and `afterSteps` fails with both numbers if one ever forgets.
  const planted = withAMineIn([A_WAVE_ON(2400)])

  assert.equal(planted.sun, 50 - MINE_COST, 'the plant costs exactly 25 Sun')

  // The whole of "not yet armed" is a number in the state, and it is a number the
  // drawing reads as well - the mine is drawn from the same field the rules step it
  // from, so a picture saying "not armed" and rules saying "not armed" cannot be two
  // claims about two different things. Held here because it is game state; the
  // picture itself is the interface's business and is looked at instead.
  assert.equal(
    plantAt(planted)?.stepsUntilArmed,
    ARMING,
    'a mine is planted not yet armed, with its whole delay still to run',
  )

  // And a mine has no attack at all while it waits, which is not the same claim:
  // `not armed` is about when, and this is about what. A mine is never a weapon, so
  // there is nothing for it to fire at anything, at any point in its life.
  const fifteenSecondsIn = afterSteps(planted, ARMING - 1)

  assert.equal(
    fifteenSecondsIn.shots.length,
    0,
    'and it has fired nothing in the whole of the time it spends not being armed',
  )
})

test('a Potato Mine arms itself fifteen seconds after planting, and not a step sooner', () => {
  // The Wave is here for a reason worth keeping: a Level whose Waves have all been
  // sent and which has no Zombies left is won, and a won Level stops moving. Checking a
  // countdown on a level that has already been won would be checking that a stopped
  // clock reads the same number twice.
  //
  // And it is late enough that the Zombie it sends is not standing in the mine's Square
  // at any point this check looks - it walks in on step 2400 and reaches the mine's
  // Square on step 2684, and the last thing asked here is step 1800. Written as a number
  // the margin can be checked by reading it, which is the whole of what a fixture's
  // numbers are for.
  const planted = withAMineIn([A_WAVE_ON(2400)])

  const justBefore = afterSteps(planted, ARMING - 1)
  assert.equal(
    plantAt(justBefore)?.stepsUntilArmed,
    1,
    'one step before the delay is up, the mine is one step from armed',
  )

  const onTime = afterSteps(planted, ARMING)
  assert.equal(
    plantAt(onTime)?.stepsUntilArmed,
    0,
    'and on the step its fifteen seconds are up, it is armed',
  )

  // And it stays armed, rather than being a thing that is briefly ready. A mine spends
  // all of its life after the delay either armed and waiting or gone having fired, so a
  // countdown that ran on past zero would be a second rule about when it is not a trap.
  //
  // Asked about *one* step later rather than a round number of steps later, and that is
  // the whole of the margin. A mine whose countdown kept spending itself once it was
  // armed would go 0, -1, 0, -1, and a check that looked ten seconds later would find
  // whichever of those it happened to land on - so the first version of this held at
  // twice the delay, at an even number of steps after arming, and passed against exactly
  // that. One step is the tightest question there is, and there is no interval in it to
  // fall through.
  const theStepAfter = afterSteps(planted, ARMING + 1)
  assert.equal(
    plantAt(theStepAfter)?.stepsUntilArmed,
    0,
    'and on the step after it arms it is still armed, with nothing having set it off',
  )
  assert.equal(
    plantAt(afterSteps(planted, ARMING + 2))?.stepsUntilArmed,
    0,
    'and the step after that, because a mine is armed and waiting for as long as it lives',
  )
})

test('the first Zombie to reach an armed Potato Mine is destroyed, and the mine is spent', () => {
  // A Zombie walking in on step 700 is standing in the mine's Square on step 984,
  // eighty-four steps after the mine armed, so this is an armed mine being reached and
  // not a slow one being caught out. Measured rather than worked out, in the way
  // `MINE_SQUARE` says it should be.
  // A second Wave in the Row below, far off, because the first Zombie being destroyed is the
  // end of everything this level has: with nothing left to send and nothing left on the lawn
  // it is *won*, and a won level stops. The second Wave is not part of what is being checked -
  // it is here so that the steps up to the detonation are steps that actually happen.
  const planted = withAMineIn([A_WAVE_ON(700), oneZombieIn(MINE_SQUARE.row + 1, 2400)])

  const stillWaiting = afterSteps(planted, ARMING)
  assert.ok(plantAt(stillWaiting), 'the mine is still standing, armed, and nothing has set it off')

  const detonated = afterSteps(planted, 1000)

  assert.equal(
    planted.zombies.length,
    0,
    'and the level had no Zombie on it at the moment it armed, so the one below is the one that reached it',
  )
  assert.equal(
    detonated.zombies.length,
    0,
    'the Zombie that reached the mine is gone from the lawn rather than wounded',
  )
  assert.equal(
    plantAt(detonated),
    undefined,
    'and the mine is gone from its Square, spent on that one Zombie',
  )
})

test('a Potato Mine that has fired is gone, and the Square it was in takes a second Zombie', () => {
  // Two Zombies, spaced so that the first has walked off the mine's Square before the
  // second arrives. Three Columns of walk apart, which is about thirteen and a half
  // seconds - a fifth of the time it takes to eat a Wall-nut and a quarter of the time
  // this mine spends arming, so the two of them cannot be in the Square at once and the
  // check is about one after the other rather than about a tie.
  const planted = withAMineIn([A_WAVE_ON(700), A_WAVE_ON(1100)])

  // The first is destroyed, and the mine with it.
  const afterTheFirst = afterSteps(planted, 1000)
  assert.equal(afterTheFirst.zombies.length, 0, 'the first Zombie has been taken off the lawn')
  assert.equal(plantAt(afterTheFirst), undefined, 'and the mine is gone from its Square')

  // The second walks into the Square the mine used to be in and straight on through it,
  // because there is nothing left there to set off. This is the claim that the mine is
  // *one-shot* rather than a Peashooter that happens to be silent until it is ready: a
  // mine that kept its countdown at zero and stayed on the lawn would take this Zombie
  // too, and a Row could never be walked through the place a mine had been.
  const arrivedAtTheSquare = afterSteps(planted, 1400)
  const second = arrivedAtTheSquare.zombies.find((zombie) => zombie.row === MINE_SQUARE.row)
  assert.ok(second, 'the second Zombie is on the lawn, having walked past the Square')
  assert.equal(second.health, 200, 'and it is at full health, so nothing was waiting for it')
  assert.ok(
    second.walked > 284,
    'and it is past the Column the mine was planted in, rather than stopped in it',
  )
})

test('two Zombies reaching a Potato Mine on the same step: one is destroyed and the other walks on', () => {
  // The one case where "the first Zombie that reaches it" has to mean something. Both
  // of these walk into the mine's Square on the same step, so there is no nearer one and
  // no one that got there first to choose between - and a mine that destroyed both would
  // be a mine with two uses, which is the one thing the plant is not.
  const planted = withAMineIn([A_WAVE_ON(700), A_WAVE_ON(700)])

  const after = afterSteps(planted, 1000)

  // Said by *which* Zombie rather than how many, and that is the whole point of this
  // check. "One Zombie is left" is satisfied by a mine that destroyed both of them and a
  // mine that destroyed neither, and a check that cannot tell those apart holds nothing
  // about the rule - the first version of it did exactly that, and destroyed none of them
  // when broken and still passed. The two Zombies are named 1 and 2, in the order they
  // walked in, and the first in the lawn's list is the one the mine is spent on.
  assert.equal(
    after.zombies.length,
    1,
    'exactly one of the two is still on the lawn, so the mine destroyed one of them and not both',
  )
  assert.deepEqual(
    after.zombies.map((zombie) => zombie.id),
    [2],
    'and it is the second that is left: the mine was spent on the first one in the list',
  )
  assert.equal(after.zombies[0]?.health, 200, 'and the survivor is at full health')
  assert.equal(plantAt(after), undefined, 'while the mine is gone either way, having fired once')

  // And the survivor is *walking*, not standing where the mine was: it came to the same
  // Square and found it gone, so the Square it is standing in is bare lawn and the step
  // after that it is on its way. A Zombie stopped by a mine that had not exploded would
  // be standing in the Square chewing on nothing, and the check cannot tell those two
  // apart by health alone.
  const next = apply(after, { kind: 'advance' })
  assert.ok(
    (next.zombies[0]?.walked ?? 0) > (after.zombies[0]?.walked ?? 0),
    'so the one that got through is walking on rather than standing in a bare Square',
  )
})

test('a Zombie that reaches a Potato Mine before it has armed is not destroyed by it', () => {
  // The other side of the whole plant. A Zombie walking in on step 1 is standing in the
  // mine's Square on step 284, which is a fifth of the way through the fifteen seconds
  // the mine is waiting out - so this is a Zombie walking into a mine that is still
  // asleep, and the claim is that nothing happens to it.
  const planted = withAMineIn([A_WAVE_ON(1)])
  assert.equal(plantAt(planted)?.stepsUntilArmed, ARMING, 'the mine is not yet armed')

  // Well past the arrival, and well past the mine having armed, so that "nothing happened"
  // cannot be a claim about a moment too early to tell. The level keeps playing after
  // this, so the check is looking at a lawn that is still going rather than at a clock
  // that has stopped.
  const after = afterSteps(planted, 500)

  const zombie = after.zombies.find((candidate) => candidate.row === MINE_SQUARE.row)
  assert.ok(zombie, 'the Zombie is still on the lawn a long time after reaching the mine')
  assert.equal(zombie.health, 200, 'at full health, so the mine did not touch it')
})

test('a Potato Mine is a plant while it waits, so a Zombie that reaches it early eats it', () => {
  // What a player loses by putting a mine where a Zombie can get to it too soon. Not an
  // extra rule: a mine is a plant, and the rule for a plant in a Zombie's way is that the
  // Zombie stops and eats it, so this is what "plant" already means - held here because
  // it is the punishment for the one decision the plant exists to make, and nothing else
  // in the game would notice if it stopped being true.
  const planted = withAMineIn([A_WAVE_ON(1)])

  // A bite a second, and a mine is 300 health, so three bites and the mine is gone: the
  // Zombie spends about two and a half seconds standing in front of a plant that has not
  // armed, and by the time it has eaten the trap the trap was never a trap.
  const threeBitesIn = afterSteps(planted, 284 + 2 * STEPS_PER_SECOND)
  assert.equal(
    plantAt(threeBitesIn),
    undefined,
    'the Zombie ate the mine in three bites, and the Square is bare lawn again',
  )

  const carried = afterSteps(planted, 284 + 2 * STEPS_PER_SECOND + STEPS_PER_SECOND)
  const zombie = carried.zombies.find((candidate) => candidate.row === MINE_SQUARE.row)
  assert.ok(zombie, 'and the Zombie is still on the lawn, unharmed by a mine that never fired')
  assert.equal(zombie.health, 200, 'at full health')
  assert.ok(
    zombie.walked > 284,
    'walking on past the Square the mine was in, exactly as it would walk past any other',
  )
})

test('a Potato Mine packet takes thirty seconds to Recharge', () => {
  // A Zombie a long way off, for the reason `tests/helpers.ts` gives: a Level with no
  // Waves left at all is won on its first step, and a won Level refuses every command
  // there is - so a Recharge watched on a level that has already been won is watching
  // a clock that has stopped, and would read as finished for ever.
  const planted = withAMineIn([A_WAVE_ON(2400)])

  // Watched by playing rather than by reading a number, the way every other Recharge in
  // this project is watched: what a player can do with the packet, rather than a
  // countdown in the state. Read out of the state it would pass whatever the rules
  // happened to say, which is the failure mode this project has already had once - the
  // three shooter variants' health and Recharge were copied from the Peashooter and held
  // by nothing, and a Repeater given a two-second Recharge passed the whole suite.
  assert.notEqual(
    apply(planted, { kind: 'choose', choice: 'potato-mine' }).chosen,
    'potato-mine',
    'the packet is not ready the moment it is used',
  )

  let later = planted
  let waited = 0
  while (
    waited < THIRTY_SECONDS &&
    apply(later, { kind: 'choose', choice: 'potato-mine' }).chosen !== 'potato-mine'
  ) {
    later = apply(later, { kind: 'advance' })
    waited += 1
  }

  assert.equal(waited, THIRTY_SECONDS, 'and it is ready again on the step its thirty seconds are up')
  assert.equal(
    apply(later, { kind: 'choose', choice: 'potato-mine' }).chosen,
    'potato-mine',
    'so a Potato Mine packet can be chosen again then',
  )
  // And not a step sooner, because a Recharge that came up early would be a shorter one
  // and thirty seconds is the number this is about.
  assert.notEqual(
    apply(afterSteps(planted, THIRTY_SECONDS - 1), { kind: 'choose', choice: 'potato-mine' }).chosen,
    'potato-mine',
    'while a step before that it is still Recharging',
  )
})

test('a Zombie reaching a Potato Mine on the very step it arms is destroyed by it', () => {
  // The boundary of the two rules, and the only place they meet. A mine that armed a
  // step *after* its delay was up would look identical to one that arms on time in
  // every other check in this file - a Zombie either arrives long after the fifteen
  // seconds or never arrives at all - and the difference is a Zombie walking into a mine
  // on the step it became a trap and walking through it, unharmed, which is the one
  // thing a player would notice about it.
  //
  // The Wave is placed so that the arrival *is* the step the delay is up: the Zombie walks
  // in on the step before `ARMING - STEPS_TO_THE_MINE`, so it is standing in the mine's
  // Square on step `ARMING` exactly. Written as the difference rather than as 617,
  // because a fixture that is a round number away from the thing it is arranging is a
  // fixture that is one step out of date the moment either number changes - and the check
  // below is about a boundary, so being one step out of date is being on the wrong side
  // of it.
  const planted = withAMineIn([A_WAVE_ON(ARMING - STEPS_TO_THE_MINE)])

  // One step before: the mine has a step left to run and the Zombie is already standing
  // in its Square. So the Zombie really is *there*, in the Square, a step before the
  // mine is a trap - which is what makes the step below a boundary and not a coincidence.
  const theStepBefore = afterSteps(planted, ARMING - 1)
  assert.equal(
    plantAt(theStepBefore)?.stepsUntilArmed,
    1,
    'one step before, the mine has one step of its delay still to run',
  )
  assert.equal(
    theStepBefore.zombies.length,
    1,
    'and the Zombie is on the lawn, already in the Square of a mine that is not armed yet',
  )

  // The step itself. There is no countdown left to read here and that is the point: the
  // mine armed and fired on one step, so the thing to say is what is left of each of them.
  const theStepItArms = afterSteps(planted, ARMING)
  assert.equal(
    theStepItArms.zombies.length,
    0,
    'and on the step the delay is up, the Zombie standing in its Square is gone',
  )
  assert.equal(plantAt(theStepItArms), undefined, 'with the mine gone too, having fired on that step')
})

test('two Zombies on two armed Potato Mines in one step: both mines fire, both Zombies go', () => {
  // The claim the code makes for itself, and which had no check behind it: two Zombies
  // reaching two *different* mines in the same step are two detonations, not one. It can
  // go wrong in the obvious direction - a rule that took the lawn off under itself while it
  // worked, so the second mine was never asked and the second Zombie walked through a
  // Square that should have been a hole.
  //
  // A Row each, because two mines in one Row cannot both be reached at once: a Zombie stops
  // at the first plant it meets, so the second would be stopped by the first mine's Square
  // and never arrive at the second one. Two Rows is the only shape in which this can happen
  // at all, which is why it needed a check of its own to be worth saying.
  //
  // And thirty seconds between the two plantings, because there is one Potato Mine packet
  // and it Recharges for thirty seconds after it is used - which is the point of that
  // number showing up here. The first version of this check planted both mines on the same
  // step and passed a row that had no mine in it at all, because the second `place` was
  // refused for a packet still Recharging and nothing said so.
  const arrivingTogether = ARMING + THIRTY_SECONDS
  const level = levelOffering(
    ['potato-mine'],
    oneZombieIn(0, arrivingTogether - STEPS_TO_THE_MINE),
    oneZombieIn(1, arrivingTogether - STEPS_TO_THE_MINE),
  )

  const started = initialGameState(101, level)
  const first = apply(
    apply(started, { kind: 'choose', choice: 'potato-mine' }),
    { kind: 'place', square: MINE_SQUARE },
  )
  const packetReady = afterSteps(first, THIRTY_SECONDS)
  const second = apply(
    apply(packetReady, { kind: 'choose', choice: 'potato-mine' }),
    { kind: 'place', square: { row: 1, column: MINE_SQUARE.column } },
  )
  assert.equal(plantAt(second)?.name, 'potato-mine', 'the first mine is planted in Row 0')
  assert.equal(
    plantIn(second.occupants, SECOND_MINE_SQUARE)?.name,
    'potato-mine',
    'and the second really is planted in Row 1, once the packet has Recharged',
  )

  const after = afterSteps(second, arrivingTogether - second.tick)

  assert.equal(after.zombies.length, 0, 'both Zombies are gone, so both mines fired in the one step')
  assert.equal(
    after.occupants.filter((occupant) => occupant.kind === 'plant').length,
    0,
    'and both mines have left the lawn, rather than one having spent itself and the other still standing',
  )
})
