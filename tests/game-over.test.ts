import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MOWER_COLUMN, hasLawnMower, plantIn, type Square } from '../src/game/board.ts'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'
import { DEFAULT_SEED, apply, initialGameState } from '../src/game/sim.ts'
import { zombieX } from '../src/game/zombies.ts'
import {
  PEA_COST,
  ZOMBIE_STEPS_PER_COLUMN,
  levelWith,
  oneZombieIn,
  untilTick,
  withSunToPlant,
} from './helpers.ts'

/** The Row the checks below spend, and then lose. */
const ROW = 2

/** Where that Row's Lawn Mower stood. */
const MOWER_SQUARE: Square = { row: ROW, column: MOWER_COLUMN }

/** Somewhere to plant, well away from the Row being lost. */
const PLANT_SQUARE: Square = { row: 0, column: 2 }

/**
 * The step the first Zombie is mown on: eight Columns to cross, and then the one
 * step that carries it onto the mower Square.
 */
function stepAZombieReachesItsMower(walkedInAtStep: number): number {
  return walkedInAtStep + 8 * ZOMBIE_STEPS_PER_COLUMN + 1
}

/**
 * The step a Zombie that walked in on that step walks off the left of the board
 * on: nine Columns to cross, and then the one step that carries it past the left
 * edge of the board altogether.
 *
 * Worked out from the walk rather than looked up, for the same reason the mower
 * checks work out the step the mower runs on. It is one step later than a Zombie
 * reaches the last Column, and the whole of Game Over is in that one step: a
 * Zombie standing on the mower Square is still standing on the lawn, and only a
 * Zombie past the left edge of the board has got in.
 */
function stepAZombieBreaches(walkedInAtStep: number): number {
  return walkedInAtStep + 9 * ZOMBIE_STEPS_PER_COLUMN + 1
}

const FIRST_WALK_IN = 1
const SECOND_WALK_IN = stepAZombieReachesItsMower(FIRST_WALK_IN) + 1

/**
 * A level that sends one Zombie in to spend a Row's mower, and then another into
 * that same Row once it has.
 *
 * A Row cannot start without a mower - there is one in every Row of a fresh lawn,
 * and nothing but a running mower takes one away - so the only way a check can
 * ever get a Row with no mower left is to spend one, and that is what a level
 * like this does.
 */
function aRowLeftWithNoMower() {
  return levelWith(oneZombieIn(ROW, FIRST_WALK_IN), oneZombieIn(ROW, SECOND_WALK_IN))
}

test('a Zombie reaching the left edge of a Row with no Lawn Mower left ends the level', () => {
  const mown = untilTick(
    initialGameState(DEFAULT_SEED, aRowLeftWithNoMower()),
    stepAZombieReachesItsMower(FIRST_WALK_IN),
    'the first Zombie reached its mower',
  )
  assert.equal(
    hasLawnMower(mown.occupants, MOWER_SQUARE),
    false,
    'Row 2 spent its mower on the first Zombie, and has nothing left',
  )

  const second = untilTick(
    mown,
    SECOND_WALK_IN,
    'the second Zombie walked in behind it, into a Row with no mower left',
  )
  assert.equal(second.gameOver, false, 'and the level is still being played')

  // The step before the breach is asked about as carefully as the breach itself.
  // A Zombie standing on the last Column of a spent Row is still on the lawn, and a
  // check that only ever looked after the breach would pass just as happily
  // against a rule that ended the level a Column early.
  const onTheLine = untilTick(
    second,
    stepAZombieBreaches(SECOND_WALK_IN) - 1,
    'the second Zombie walked to the left edge of the board',
  )

  assert.equal(
    onTheLine.gameOver,
    false,
    'the level is still being played while the Zombie is still standing on the lawn',
  )
  assert.equal(
    zombieX(onTheLine.zombies[0]!),
    0,
    'and the Zombie is on the left edge of the board itself, not past it',
  )

  const breached = apply(onTheLine, { kind: 'advance' })

  assert.equal(
    breached.gameOver,
    true,
    'and the one step that carries it past the left edge of the board ends the level',
  )
  assert.equal(breached.zombies.length, 0, 'with the Zombie that got in gone from the lawn')
})

test('Game Over stops the level: the Zombies stop walking and planting stops', () => {
  // A third Zombie walks in half a lawn's width before the breach, so that at the
  // moment Row 2 is lost there is still a Zombie on the lawn mid-Row, with its own
  // mower a long way to its left. It is there to be watched: "the Zombies stop" is
  // a claim about a Zombie that is still walking, not about the one that ended
  // the level and is already gone.
  const thirdWalksIn =
    stepAZombieBreaches(SECOND_WALK_IN) - Math.round((9 * ZOMBIE_STEPS_PER_COLUMN) / 2)
  const onTheLine = untilTick(
    withSunToPlant(
      initialGameState(
        DEFAULT_SEED,
        levelWith(
          oneZombieIn(ROW, FIRST_WALK_IN),
          oneZombieIn(ROW, SECOND_WALK_IN),
          oneZombieIn(ROW + 1, thirdWalksIn),
        ),
      ),
    ),
    stepAZombieBreaches(SECOND_WALK_IN) - 1,
    'the second Zombie walked to the left edge of the board',
  )

  // The same two commands, one step before the breach, are shown to work. Without
  // this the rest of the check would be ambiguous: a plant refused because the
  // level is over and a plant refused because the Square was taken or the player
  // was broke are both "nothing happened", and only one of them is Game Over.
  const whilePlaying = apply(apply(onTheLine, { kind: 'choose', choice: 'peashooter' }), {
    kind: 'place',
    square: PLANT_SQUARE,
  })
  assert.equal(
    plantIn(whilePlaying.occupants, PLANT_SQUARE)?.name,
    'peashooter',
    'on the last step of play, choosing a packet and clicking a Square plants it',
  )
  assert.equal(whilePlaying.sun, onTheLine.sun - PEA_COST, 'and it costs Sun')

  const lost = apply(onTheLine, { kind: 'advance' })

  assert.equal(lost.gameOver, true, 'the level has ended')
  assert.equal(
    lost.sun,
    onTheLine.sun,
    'with the Sun for a second Peashooter still in hand, and its Square still bare',
  )
  const walker = lost.zombies.find((zombie) => zombie.row === ROW + 1)
  assert.ok(walker, 'and a Zombie from another Row still standing on the lawn, mid-Row')

  const zombieBefore = { ...walker! }
  const afterLoss = apply(lost, { kind: 'advance' })

  assert.equal(afterLoss.tick, lost.tick, 'the clock does not move')
  assert.equal(
    zombieX(afterLoss.zombies.find((zombie) => zombie.row === ROW + 1)!),
    zombieX(zombieBefore),
    'so the Zombie still on the lawn is exactly where it was, and walks no further',
  )
  assert.deepEqual(afterLoss, lost, 'and a step of a level that is over changes nothing at all')

  const planted = apply(apply(lost, { kind: 'choose', choice: 'peashooter' }), {
    kind: 'place',
    square: PLANT_SQUARE,
  })
  assert.deepEqual(planted, lost, 'and the level cannot be planted on either')
})

test("spending a Row's Lawn Mower saves the Row without ending the level", () => {
  // The other half of spending a mower, and the half that is easy to get wrong. A
  // mower running empties a Row of its last defence, so Game Over could be wired to
  // "this Row has no mower" instead of "a Zombie got in" - and every check about
  // losing would still pass, because a Zombie getting in always follows a mower
  // having gone. What a player actually sees when a mower runs is their Row saved
  // and the level going on, and that is what this checks.
  const mown = untilTick(
    initialGameState(DEFAULT_SEED, levelWith(oneZombieIn(ROW, FIRST_WALK_IN))),
    stepAZombieReachesItsMower(FIRST_WALK_IN),
    'the Zombie reached its mower and the mower ran',
  )

  assert.equal(hasLawnMower(mown.occupants, MOWER_SQUARE), false, 'Row 2 has spent its mower')
  assert.equal(mown.zombies.length, 0, 'and the Zombie that set it off is gone from the lawn')
  assert.equal(mown.gameOver, false, 'but the level is not lost, because a save is not a loss')

  const later = untilTick(
    mown,
    mown.tick + 10 * STEPS_PER_SECOND,
    'the level carried on for ten seconds after the mower ran',
  )

  assert.equal(later.tick, mown.tick + 10 * STEPS_PER_SECOND, 'the clock kept moving')
  assert.equal(later.gameOver, false, 'and the level is still being played ten seconds later')
})

test("another Row's mower still saves that Row after one has been spent", () => {
  // The question behind the last box on the ticket: after a Row has been lost and
  // saved once, is a second Row still worth defending? A rule that ended the level
  // the moment any Row spent its mower would answer no, and a player who saw one
  // mower run would be right to think the game was over. The answer is that each
  // Row has its own, so Row 3 walks the whole length of the lawn, reaches its
  // mower, and is mown in turn - and the level is still being played afterwards.
  const secondWalksIn = stepAZombieReachesItsMower(FIRST_WALK_IN) + 10 * STEPS_PER_SECOND
  const level = levelWith(oneZombieIn(ROW, FIRST_WALK_IN), oneZombieIn(ROW + 1, secondWalksIn))

  const firstSaved = untilTick(
    initialGameState(DEFAULT_SEED, level),
    stepAZombieReachesItsMower(FIRST_WALK_IN),
    'the Zombie in Row 2 reached its mower and was mown',
  )
  assert.equal(firstSaved.gameOver, false, 'Row 2 was saved, and the level went on')
  assert.equal(
    hasLawnMower(firstSaved.occupants, { row: ROW + 1, column: MOWER_COLUMN }),
    true,
    "and Row 3 still has its own mower waiting, untouched by anything that happened in Row 2",
  )

  const secondSaved = untilTick(
    firstSaved,
    stepAZombieReachesItsMower(secondWalksIn),
    'the Zombie sent in later reached Row 3 and was mown in turn',
  )

  assert.equal(
    secondSaved.zombies.length,
    0,
    'the second Zombie was taken off the lawn by the mower it reached, like the first',
  )
  assert.equal(
    hasLawnMower(secondSaved.occupants, { row: ROW + 1, column: MOWER_COLUMN }),
    false,
    'and Row 3 has now spent its own mower',
  )
  assert.equal(
    secondSaved.gameOver,
    false,
    'but losing a Row is not losing the level, and the level is still being played',
  )
})
