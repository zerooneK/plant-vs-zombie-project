import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BOARD_COLUMNS,
  LOGICAL_WIDTH,
  SQUARE_WIDTH,
  centreX,
  plantIn,
  type Square,
} from '../src/game/board.ts'
import { STEPS_PER_SECOND, advanceFrames, startClock } from '../src/game/clock.ts'
import { LEVEL_1_1, type Level, type Wave } from '../src/game/levels.ts'
import { DEFAULT_SEED, apply, initialGameState, type GameState } from '../src/game/sim.ts'
import { zombieX, type Zombie } from '../src/game/zombies.ts'
import type { Shot } from '../src/game/shots.ts'
import { withSunToPlant } from './helpers.ts'

/**
 * Steps before the level's Zombie walks in, chosen well past the point where
 * the player can have planted a Peashooter and gathered the Sun to pay for it.
 */
const ZOMBIE_STEP = 30 * STEPS_PER_SECOND

/** What one pea does to a Zombie, written out so a wrong number is caught. */
const PEA_DAMAGE = 20

/** The health a Basic Zombie walks in with, likewise written out. */
const BASIC_HEALTH = 270

/** Where the checks below stand their Peashooter: a long clear run at the left. */
const PEA_SQUARE: Square = { row: 2, column: 1 }

/** A level that sends one Zombie into a Row, at the step the checks below want. */
function oneZombieIn(row: number, atStep: number = ZOMBIE_STEP): Level {
  return levelWith({ atStep, zombies: [{ name: 'basic', row }] })
}

/** A Peashooter standing in a Square, and the level's Zombies still to come. */
function withAPeashooterIn(square: Square, level: Level): GameState {
  const chosen = apply(withSunToPlant(initialGameState(DEFAULT_SEED, level)), {
    kind: 'choose',
    choice: 'peashooter',
  })
  return apply(chosen, { kind: 'place', square })
}

/** The one pea in flight, and a complaint if there is not exactly one. */
function onlyPea(state: GameState): Shot {
  assert.equal(state.shots.length, 1, `expected one pea in flight, found ${state.shots.length}`)
  const pea = state.shots[0]
  assert.ok(pea, 'the pea in flight')
  return pea
}

/**
 * Steps a Zombie takes to walk across one Column, worked out here rather than
 * read from the rules.
 *
 * The point of a check is to catch the number being wrong, so the number has to
 * be stated in the check: reading it from the rules would pass whatever the
 * rules happened to say.
 */
const ZOMBIE_STEPS_PER_COLUMN = Math.round(4.7 * STEPS_PER_SECOND)

/**
 * A level that sends in exactly the Zombies a check needs, and nothing else.
 *
 * Zombies come in on a level's schedule, so a check that wants one Zombie in
 * one Row has to say so, rather than take whatever the level would send next.
 */
function levelWith(...waves: Wave[]): Level {
  return { ...LEVEL_1_1, waves }
}

/** Plays the rules on until the game looks like this, or gives up. */
function until(state: GameState, satisfied: (state: GameState) => boolean): GameState {
  let current = state
  for (let step = 0; step < 4000; step++) {
    if (satisfied(current)) {
      return current
    }
    current = apply(current, { kind: 'advance' })
  }
  assert.fail('the game never got there in four thousand steps')
}

/** Plays the rules on until the game has reached that step of play. */
function untilTick(state: GameState, tick: number): GameState {
  return until(state, (current) => current.tick >= tick)
}

/** Plays on until the pea with that name has left the lawn one way or another. */
function untilPeaIsGone(state: GameState, id: number): GameState {
  return until(state, (current) => !current.shots.some((pea) => pea.id === id))
}

/**
 * Plays the game for so many seconds of real time, a frame at a time and at a
 * given frame rate, the way a browser does - so that a check can ask what
 * happens on a fast machine and on a slow one.
 */
function playFor(state: GameState, seconds: number, framesPerSecond: number): GameState {
  let clock = startClock()
  let previous = 0

  for (let frame = 1; frame <= Math.round(seconds * framesPerSecond); frame++) {
    const advanced = advanceFrames(clock, previous, (frame * 1000) / framesPerSecond)
    clock = advanced.clock
    previous = advanced.previous

    for (let step = 0; step < advanced.steps; step++) {
      state = apply(state, { kind: 'advance' })
    }
  }

  return state
}

/** The one Zombie in a Row, and a complaint if that Row holds none. */
function zombieIn(state: GameState, row: number): Zombie {
  const found = state.zombies.find((zombie) => zombie.row === row)
  assert.ok(found, `Row ${row} holds no Zombie`)
  return found
}

/**
 * The Zombies in a Row, the one furthest left first, and a complaint if the Row
 * does not hold that many.
 *
 * Leftmost first is walking order: the Zombie that walked in earliest has got
 * furthest, so it is the one nearest the Peashooters at the left of the lawn.
 */
function zombiesIn(state: GameState, row: number, count: number): Zombie[] {
  const found = state.zombies
    .filter((zombie) => zombie.row === row)
    .sort((a, b) => zombieX(a) - zombieX(b))

  assert.equal(found.length, count, `Row ${row} holds ${found.length} Zombies, not ${count}`)
  return found
}

/** Exactly two Zombies in a Row, the one furthest left first. */
function twoZombiesIn(state: GameState, row: number): [Zombie, Zombie] {
  const [nearer, further] = zombiesIn(state, row, 2)
  if (nearer === undefined || further === undefined) {
    assert.fail(`Row ${row} does not hold two Zombies`)
  }
  return [nearer, further]
}

test('a Zombie walks in at the right of a Row and walks left', () => {
  const start = initialGameState(DEFAULT_SEED, levelWith({ atStep: 10, zombies: [{ name: 'basic', row: 2 }] }))

  const tooEarly = untilTick(start, 9)
  assert.equal(tooEarly.zombies.length, 0, 'nothing walks in before its Wave is due')

  const arrived = untilTick(tooEarly, 10)
  assert.equal(arrived.zombies.length, 1, 'a Zombie walks in when its Wave is due')
  const walking = zombieIn(arrived, 2)
  assert.equal(zombieX(walking), LOGICAL_WIDTH, 'standing at the right edge of the board, which is where Zombies come in')

  const oneStepOn = apply(arrived, { kind: 'advance' })
  assert.ok(zombieX(zombieIn(oneStepOn, 2)) < zombieX(walking), 'and it walks left on the very next step')

  const aSecondLater = untilTick(arrived, 70)
  assert.ok(zombieX(zombieIn(aSecondLater, 2)) < zombieX(walking), 'and it is still walking a second later')
})

test('a Zombie takes the same time to cross every Column of the lawn', () => {
  const arrived = untilTick(
    initialGameState(DEFAULT_SEED, levelWith({ atStep: 1, zombies: [{ name: 'basic', row: 2 }] })),
    1,
  )

  // The speed, stated as a player would meet it: this many seconds to cross one
  // Column, and so this many to cross two, and the same each time. A Zombie
  // crossing a whole number of Columns lands exactly on the line rather than a
  // hair past it, which is what a fixed rate of walking looks like from outside
  // and what a walk that drifts a little each Column would not.
  for (const columns of [1, 2, 3, 5]) {
    const walked = untilTick(arrived, 1 + columns * ZOMBIE_STEPS_PER_COLUMN)

    assert.equal(
      zombieX(zombieIn(walked, 2)),
      LOGICAL_WIDTH - columns * SQUARE_WIDTH,
      `after crossing ${columns} Column${columns === 1 ? '' : 's'}`,
    )
  }
})

test('a fast machine and a slow machine play out the same game', () => {
  // The promise is that a Zombie's speed is the same on every machine. So this
  // plays one Zombie's crossing of a Column through the frame loop at four very
  // different frame rates, and asks for the same place every time - rather than
  // only asking that two machines agree with each other, which they would if
  // both were wrong in the same direction.
  const level = levelWith({ atStep: 1, zombies: [{ name: 'basic', row: 2 }] })
  const crossing = ZOMBIE_STEPS_PER_COLUMN / STEPS_PER_SECOND

  // Measured from the step the Zombie walked in on, because that step is the one
  // it spends standing still: its first step of walking is the step after.
  const arrived = untilTick(initialGameState(DEFAULT_SEED, level), 1)

  for (const framesPerSecond of [30, 60, 144, 240]) {
    const played = playFor(arrived, crossing, framesPerSecond)

    assert.equal(
      played.tick,
      1 + ZOMBIE_STEPS_PER_COLUMN,
      `${framesPerSecond} frames a second is the same amount of play`,
    )
    assert.equal(
      zombieX(zombieIn(played, 2)),
      LOGICAL_WIDTH - SQUARE_WIDTH,
      `and the same Zombie a whole Column further left at ${framesPerSecond} frames a second`,
    )
  }
})

test('a Peashooter fires at the nearest Zombie in its Row', () => {
  const planted = withAPeashooterIn(PEA_SQUARE, oneZombieIn(2))
  const arrived = untilTick(planted, ZOMBIE_STEP)

  const fired = apply(arrived, { kind: 'advance' })
  const pea = onlyPea(fired)
  assert.equal(pea.row, PEA_SQUARE.row, 'the pea travels along its own Peashooter\'s Row')
  assert.equal(pea.x, centreX(PEA_SQUARE), 'and leaves the Peashooter')
  assert.ok(zombieX(zombieIn(fired, 2)) > pea.x, 'heading for the Zombie in that Row')

  const next = apply(fired, { kind: 'advance' })
  assert.ok(onlyPea(next).x > pea.x, 'and travels right on every step after that')
})


test('a Peashooter does nothing at all when its Row holds no Zombie', () => {
  const planted = withAPeashooterIn(PEA_SQUARE, levelWith())
  assert.equal(planted.zombies.length, 0, 'there is nothing on the lawn at all')

  const fiveSecondsOn = untilTick(planted, planted.tick + 5 * STEPS_PER_SECOND)

  assert.equal(fiveSecondsOn.shots.length, 0, 'so the Peashooter fires nothing at all')
  assert.equal(
    plantIn(fiveSecondsOn.occupants, PEA_SQUARE)?.name,
    'peashooter',
    'and is still standing there waiting, rather than spent or wilted',
  )
})

/**
 * A level with a Zombie already being shot at, and a second one five seconds
 * behind it in the same Row, plus one in the Row above.
 *
 * Two Zombies in the same Row is the interesting case, because a pea aimed at
 * the nearer one flies straight through where the further one is standing a
 * moment later. The third Zombie is there to be walked past unharmed.
 */
function crowdedLevel(): Level {
  return levelWith(
    { atStep: ZOMBIE_STEP, zombies: [{ name: 'basic', row: 2 }] },
    {
      atStep: ZOMBIE_STEP + 5 * STEPS_PER_SECOND,
      zombies: [
        { name: 'basic', row: 2 },
        { name: 'basic', row: 3 },
      ],
    },
  )
}

/** Plays the pea that leaves on the next step until it has landed. */
function afterAPeaLands(state: GameState): GameState {
  const fired = apply(state, { kind: 'advance' })
  return untilPeaIsGone(fired, onlyPea(fired).id)
}

test('a pea hits the Zombie it was aimed at, and spends itself there', () => {
  const planted = withAPeashooterIn(PEA_SQUARE, crowdedLevel())
  const crowded = untilTick(planted, ZOMBIE_STEP + 5 * STEPS_PER_SECOND)
  const [nearerBefore, furtherBefore] = twoZombiesIn(crowded, 2)

  // A moment past the landing, so that a pea which went straight through its
  // target would have had time to reach the Zombie behind it as well.
  const settled = untilTick(afterAPeaLands(crowded), afterAPeaLands(crowded).tick + 60)
  const [hit, untouched] = twoZombiesIn(settled, 2)

  assert.equal(
    hit.health,
    nearerBefore.health - PEA_DAMAGE,
    'the pea takes its damage off the Zombie it was aimed at',
  )
  assert.equal(untouched.health, furtherBefore.health, 'and the Zombie behind that one is never touched')
})

test('a pea passes harmlessly through every other Row', () => {
  const planted = withAPeashooterIn(PEA_SQUARE, crowdedLevel())
  const crowded = untilTick(planted, ZOMBIE_STEP + 5 * STEPS_PER_SECOND)
  const otherRow = zombieIn(crowded, 3)

  const settled = afterAPeaLands(crowded)
  const otherRowAfter = zombieIn(untilTick(settled, settled.tick + 60), 3)

  assert.equal(otherRowAfter.health, otherRow.health, 'a Zombie in another Row is not hurt by a pea travelling past it')
  assert.ok(
    zombieX(otherRowAfter) > zombieX(zombieIn(settled, 2)),
    'and it walked the whole way under the pea without so much as slowing',
  )
})

test('a Peashooter shoots forwards, at a Zombie that has not yet walked past it', () => {
  const atTheRightEnd: Square = { row: 2, column: BOARD_COLUMNS - 1 }
  const planted = withAPeashooterIn(atTheRightEnd, oneZombieIn(2))
  const arrived = untilTick(planted, ZOMBIE_STEP)
  assert.ok(
    zombieX(zombieIn(arrived, 2)) > centreX(atTheRightEnd),
    'the Zombie walks in to the right of the Peashooter',
  )

  const shot = until(arrived, (state) => state.shots.length > 0)
  assert.ok(shot.shots.length > 0, 'and is shot at while it is in front of the plant')

  const gonePast = untilTick(arrived, arrived.tick + 200)
  assert.ok(
    zombieX(zombieIn(gonePast, 2)) < centreX(atTheRightEnd),
    'the Zombie walks on and passes the Peashooter',
  )

  const after = untilTick(gonePast, gonePast.tick + 300)
  assert.equal(after.shots.length, 0, 'and the Peashooter shoots nothing at all once it has')
})

test('a Zombie is removed from the lawn once a pea has taken all of its health', () => {
  const planted = withAPeashooterIn(PEA_SQUARE, oneZombieIn(2))
  const arrived = untilTick(planted, ZOMBIE_STEP)
  assert.equal(zombieIn(arrived, 2).health, BASIC_HEALTH, 'a Basic Zombie walks in with 270 health')

  const hit = until(arrived, (state) => (state.zombies[0]?.health ?? BASIC_HEALTH) < BASIC_HEALTH)
  assert.equal(
    zombieIn(hit, 2).health,
    BASIC_HEALTH - PEA_DAMAGE,
    'and one pea takes 20 off it, so it takes fourteen of them to fell one',
  )

  const gone = until(hit, (state) => state.zombies.length === 0)
  assert.equal(gone.zombies.length, 0, 'a Zombie with nothing left of it is taken off the lawn')
  assert.equal(
    plantIn(gone.occupants, PEA_SQUARE)?.name,
    'peashooter',
    'and the Peashooter that shot it is still standing there',
  )

  const cleared = untilTick(gone, gone.tick + 5 * STEPS_PER_SECOND)
  assert.equal(
    cleared.shots.length,
    0,
    'leaving the lawn clear of peas, because a Peashooter with nothing to shoot at shoots nothing',
  )
})

test('a Zombie that walks past the left of the board leaves the lawn', () => {
  const arrived = untilTick(initialGameState(DEFAULT_SEED, oneZombieIn(2, 1)), 1)
  assert.equal(arrived.zombies.length, 1, 'a Zombie walks in with nothing on the lawn to stop it')

  // About forty seconds of walking to cross nine Columns, and nothing in the way
  // to interrupt it, so this check is about one thing only: where the Zombie
  // goes when it gets to the end rather than stopping there.
  const nearlyOff = untilTick(arrived, arrived.tick + 40 * STEPS_PER_SECOND)
  assert.ok(zombieX(zombieIn(nearlyOff, 2)) < SQUARE_WIDTH, 'it is nearly off the left of the board')

  const gone = until(nearlyOff, (state) => state.zombies.length === 0)
  assert.equal(gone.zombies.length, 0, 'and it leaves the lawn')
})
