import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MOWER_COLUMN,
  SQUARE_WIDTH,
  hasLawnMower,
  occupantAt,
  plantIn,
  type Square,
} from '../src/game/board.ts'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'
import { DEFAULT_SEED, apply, initialGameState, type GameState } from '../src/game/sim.ts'
import { zombieX, type Zombie } from '../src/game/zombies.ts'
import { runMowers } from '../src/game/mowers.ts'
import {
  ZOMBIE_STEPS_PER_COLUMN,
  levelWith,
  oneZombieIn,
  untilTick,
  withSunToPlant,
} from './helpers.ts'

/** The Row the checks below defend, and breach. */
const ROW = 2

/** Where that Row's Lawn Mower stands, and where a Zombie has to get to set it off. */
const MOWER_SQUARE: Square = { row: ROW, column: MOWER_COLUMN }

/**
 * Steps after a Zombie walks in before it reaches its Row's Lawn Mower: nine
 * Columns to cross to get there, because the mower stands in the tenth.
 */
const STEPS_TO_THE_MOWER = 9 * ZOMBIE_STEPS_PER_COLUMN

/**
 * The step a Zombie that walked in on that step is mown on: nine Columns to
 * cross, and then the one step that carries it onto the mower Square.
 *
 * Worked out from the walk rather than looked up, so that a check can ask for the
 * exact step the mower runs on. That exactness is the point: a Zombie walks on for
 * another whole Column after it has passed the mower Square, so a check that
 * waited even one moment longer would see a mown Zombie and a Zombie that walked
 * off the board as the same thing.
 */
function stepAZombieReachesItsMower(walkedInAtStep: number): number {
  return walkedInAtStep + STEPS_TO_THE_MOWER + 1
}

/** The one Zombie in a Row, and a complaint if that Row holds none. */function zombieIn(state: GameState, row: number): Zombie {
  const found = state.zombies.find((zombie) => zombie.row === row)
  assert.ok(found, `Row ${row} holds no Zombie`)
  return found
}

/** The Zombies in a Row, the one furthest left first, and a complaint if there are not enough. */
function zombiesIn(state: GameState, row: number, count: number): Zombie[] {
  const found = state.zombies
    .filter((zombie) => zombie.row === row)
    .sort((a, b) => zombieX(a) - zombieX(b))

  assert.equal(found.length, count, `Row ${row} holds ${found.length} Zombies, not ${count}`)
  return found
}

test('a Zombie reaching the left edge of a Row sets off that Row\'s Lawn Mower', () => {
  const arrived = untilTick(
    initialGameState(DEFAULT_SEED, levelWith(oneZombieIn(ROW, 1))),
    1,
    'the Zombie walked in',
  )

  // Nine Columns of walking, with nothing on the lawn to stop it, brings it to
  // the left edge of its Row. A Zombie walks between Squares rather than in them,
  // so this is the step where it is standing exactly on the mower Square's far
  // edge: it has not yet crossed onto the mower, and the mower is still waiting.
  const onTheLine = untilTick(
    arrived,
    1 + STEPS_TO_THE_MOWER,
    'the Zombie reached the left edge of its Row',
  )
  assert.equal(
    zombieX(zombieIn(onTheLine, ROW)),
    (MOWER_SQUARE.column + 1) * SQUARE_WIDTH,
    'standing on the far edge of the Lawn Mower Square, one step short of it',
  )
  assert.ok(hasLawnMower(onTheLine.occupants, MOWER_SQUARE), 'with the Lawn Mower still waiting on the other side of it')

  const setOff = apply(onTheLine, { kind: 'advance' })

  assert.equal(
    hasLawnMower(setOff.occupants, MOWER_SQUARE),
    false,
    'and the very next step the Lawn Mower is gone, because it has run',
  )
  assert.equal(setOff.zombies.length, 0, 'and it has taken the Zombie that set it off off the lawn with it')
})

test('the mower clears every Zombie in its Row, and leaves the Rows either side alone', () => {
  // Three Zombies: one in Row 2 that reaches its mower, a second in Row 2 that is
  // still near the right of the lawn when it happens, and one in Row 3 which is
  // also still far from its own mower at that moment.
  //
  // The second Row 2 Zombie is the one that makes this a check about the mower and
  // not about the breach. Zombies all walk at the same speed, so two sent in
  // together would stay side by side and reach the mower on the same step - and a
  // mower that removed only the Zombie standing on it would pass. Sending the
  // second one ten seconds later leaves it about three Columns in when the first
  // reaches the edge, so it is plainly still to be mown.
  const tenSecondsOn = 10 * STEPS_PER_SECOND
  const arrived = untilTick(
    initialGameState(
      DEFAULT_SEED,
      levelWith(
        oneZombieIn(ROW, 1),
        oneZombieIn(ROW, 1 + tenSecondsOn),
        oneZombieIn(ROW + 1, 1 + tenSecondsOn),
      ),
    ),
    1,
    'the first Zombie walked in',
  )

  const onTheLine = untilTick(
    arrived,
    1 + STEPS_TO_THE_MOWER,
    'the first Zombie reached the left edge of Row 2',
  )
  const otherInRow = zombiesIn(onTheLine, ROW, 2)
  const inNextRow = zombieIn(onTheLine, ROW + 1)
  assert.ok(
    zombieX(otherInRow[1]!) > 3 * 80,
    'the second Zombie in Row 2 is still near the right of the lawn, a long way from the mower',
  )

  const mown = apply(onTheLine, { kind: 'advance' })

  assert.equal(
    mown.zombies.filter((zombie) => zombie.row === ROW).length,
    0,
    'the mower clears the whole Row, not only the one Zombie that set it off',
  )
  assert.deepEqual(
    mown.zombies.map((zombie) => zombie.id),
    [inNextRow.id],
    'and the Zombie in the Row above is the only one left on the lawn',
  )
  assert.equal(
    zombieIn(mown, ROW + 1).health,
    inNextRow.health,
    'untouched, at the health it walked in with',
  )
  assert.ok(
    hasLawnMower(mown.occupants, { row: ROW + 1, column: MOWER_COLUMN }),
    "and the Row above's Lawn Mower is still waiting, because nothing reached it",
  )
})

test('spending one Row\'s Lawn Mower leaves every other Row its own', () => {
  // A mower is a one-use life, and the life is per Row. So spending Row 2's must
  // not spend Row 3's: ten seconds later a Zombie walks into Row 3, whose mower
  // has never been touched, and that Row is saved as completely as Row 2 was.
  // This is the check that tells a per-Row one-use rescue from a global one, where
  // a single breach would end every Row's protection at once.
  const tenSecondsOn = 10 * STEPS_PER_SECOND
  const secondRowZombieWalksIn = 1 + tenSecondsOn
  const level = levelWith(oneZombieIn(ROW, 1), oneZombieIn(ROW + 1, secondRowZombieWalksIn))

  const firstSaved = untilTick(
    initialGameState(DEFAULT_SEED, level),
    stepAZombieReachesItsMower(1),
    'the Zombie in Row 2 reached its mower and was mown',
  )
  assert.equal(
    firstSaved.zombies.filter((zombie) => zombie.row === ROW).length,
    0,
    'Row 2 is empty, its mower having run',
  )
  assert.equal(hasLawnMower(firstSaved.occupants, MOWER_SQUARE), false, 'and Row 2 has no mower left')
  assert.ok(
    hasLawnMower(firstSaved.occupants, { row: ROW + 1, column: MOWER_COLUMN }),
    "and Row 3 still has its own mower waiting, ten seconds on, untouched by Row 2's breach",
  )

  // Asked at the very step that Zombie reaches Row 3's mower square, and no later,
  // because that is the step that tells a Zombie mown from a Zombie left to walk:
  // a Zombie walks on for another whole Column after it passes the mower Square,
  // so a moment after this one it would be off the board either way and a check
  // that waited would pass for the wrong reason.
  const secondSaved = untilTick(
    firstSaved,
    stepAZombieReachesItsMower(secondRowZombieWalksIn),
    'the Zombie sent in later reached Row 3 and was mown in turn',
  )

  assert.equal(
    secondSaved.zombies.length,
    0,
    'and it is gone on the step it reached the mower, not off the board a Column later',
  )
  assert.equal(
    hasLawnMower(secondSaved.occupants, MOWER_SQUARE),
    false,
    'Row 2 still has no mower, so the second mower to run did not bring it back',
  )
  assert.equal(
    hasLawnMower(secondSaved.occupants, { row: ROW + 1, column: MOWER_COLUMN }),
    false,
    'and Row 3 has spent its own',
  )
})

test('a Row that has spent its Lawn Mower still cannot be planted in the Square it left', () => {
  // The mower Column is not lawn to plant in, before or after its mower has run. It is
  // the original's layout: a strip the mowers stand in, and nine Columns to plant to
  // the right of it.
  //
  // This reverses ticket 06, which let the Square come back as bare grass once the
  // mower had gone. That made a Row that had lost its mower nine Columns wide and
  // every other Row eight, so how much lawn a player had depended on how badly the
  // level had gone. Now every Row is nine Columns to plant, always.
  //
  // The Wave a long way off is there so the level is still being played while this
  // check plays it: a level of one Wave is won the moment its only Zombie is mown,
  // and this check goes on to plant, which a won level will not do.
  const mown = untilTick(
    initialGameState(
      DEFAULT_SEED,
      levelWith(
        oneZombieIn(ROW, 1),
        oneZombieIn(ROW, 5 * 60 * STEPS_PER_SECOND),
      ),
    ),
    stepAZombieReachesItsMower(1),
    'the Zombie reached its mower and the mower ran',
  )
  assert.equal(hasLawnMower(mown.occupants, MOWER_SQUARE), false, 'the mower has run')
  assert.equal(occupantAt(mown.occupants, MOWER_SQUARE), null, 'and nothing is standing in that Square at all')

  const affordable = withSunToPlant(mown)
  const refused = apply(apply(affordable, { kind: 'choose', choice: 'peashooter' }), {
    kind: 'place',
    square: MOWER_SQUARE,
  })

  assert.equal(plantIn(refused.occupants, MOWER_SQUARE), undefined, 'and still no plant goes into it')
  assert.equal(refused.sun, affordable.sun, 'and no Sun is spent')
})

test('initialGameState starts with zero spent lawn mowers', () => {
  const state = initialGameState()
  assert.deepEqual(state.spentMowers, [], 'a fresh lawn has spent no lawn mowers')
})

test('a triggered Lawn Mower records its Row in state.spentMowers', () => {
  const arrived = untilTick(
    initialGameState(DEFAULT_SEED, levelWith(oneZombieIn(ROW, 1))),
    1 + STEPS_TO_THE_MOWER,
    'reached mower',
  )
  assert.deepEqual(arrived.spentMowers, [])
  const setOff = apply(arrived, { kind: 'advance' })
  assert.deepEqual(setOff.spentMowers, [ROW], 'triggered row is explicitly tracked')
})

test('runMowers encapsulates spentMowers accumulation in sorted order', () => {
  const mower0 = { kind: 'lawnMower' as const, square: { row: 0, column: MOWER_COLUMN } }
  const mower3 = { kind: 'lawnMower' as const, square: { row: 3, column: MOWER_COLUMN } }
  const zombieAt0: Zombie = {
    id: 1,
    name: 'basic',
    row: 0,
    walked: 9 * ZOMBIE_STEPS_PER_COLUMN + 1,
    health: 200,
    armour: 0,
    stepsUntilBite: 0,
    stepsSlowed: 0,
    hasPole: false,
  }
  const zombieAt3: Zombie = {
    id: 2,
    name: 'basic',
    row: 3,
    walked: 9 * ZOMBIE_STEPS_PER_COLUMN + 1,
    health: 200,
    armour: 0,
    stepsUntilBite: 0,
    stepsSlowed: 0,
    hasPole: false,
  }

  const result = runMowers([zombieAt0, zombieAt3], [mower0, mower3], [2])
  assert.deepEqual(result.spentMowers, [0, 2, 3], 'accumulates existing spent rows with newly triggered rows sorted')
  assert.equal(result.zombies.length, 0, 'clears zombies in triggered rows')
  assert.equal(result.occupants.length, 0, 'removes mowers from occupants')
})

