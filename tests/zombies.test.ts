import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BOARD_COLUMNS,
  LOGICAL_WIDTH,
  SQUARE_WIDTH,
  centreX,
  occupantAt,
  plantIn,
  squareAtX,
  type Square,
} from '../src/game/board.ts'
import { STEPS_PER_SECOND, advanceFrames, startClock } from '../src/game/clock.ts'
import { LEVEL_1_1, type Level, type Wave } from '../src/game/levels.ts'
import { DEFAULT_SEED, SHOVEL, apply, initialGameState, type GameState } from '../src/game/sim.ts'
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
const BASIC_HEALTH = 200

/** The armour a Conehead Zombie walks in with. */
const CONEHEAD_ARMOUR = 370

/** The armour a Buckethead Zombie walks in with. */
const BUCKETHEAD_ARMOUR = 1100

/** The health a Peashooter is planted with. */
const FULL_HEALTH = 300

/** What one bite takes off a plant. */
const BITE_DAMAGE = 100

/** Where the checks below stand their Peashooter: a long clear run at the left. */
const PEA_SQUARE: Square = { row: 2, column: 1 }

/**
 * Where the eating checks stand their Peashooter: the last Column, the one
 * closest to where the Zombies come in.
 *
 * Not a detail. A Peashooter kills a Basic Zombie in about fourteen seconds of
 * shooting, and a Zombie takes nearly five to cross each Column, so a Peashooter
 * planted in most of the lawn kills everything that walks at it before it can
 * arrive - the plant is never reached, and so is never eaten. Only close to where
 * the Zombies come in does the Zombie get there, hurt, and eat. Putting
 * these checks at the far right is what lets them be about eating and nothing
 * else, and that a Peashooter in the first Columns is a thing that cannot be
 * eaten is a true and useful thing about the game.
 */
const FOOD_SQUARE: Square = { row: 2, column: BOARD_COLUMNS - 1 }

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

/**
 * Plays the rules on until the game looks like this, or gives up.
 *
 * What it was waiting for is named, because a check that fails inside here
 * otherwise reports only that four thousand steps were not enough - which is
 * true and says nothing about which of the game's promises was not kept.
 */
function until(
  state: GameState,
  satisfied: (state: GameState) => boolean,
  whatItIsWaitingFor = 'the game got there',
): GameState {
  let current = state
  for (let step = 0; step < 4000; step++) {
    if (satisfied(current)) {
      return current
    }
    current = apply(current, { kind: 'advance' })
  }
  assert.fail(`the game never got there in four thousand steps: ${whatItIsWaitingFor}`)
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
  // A level with a Wave far in the future, and so nothing on the lawn. The Wave is
  // there so the level is still being played while this check plays it - a level
  // with no Waves at all is won on its first step, and then its Sun stops falling
  // and there is nothing left to watch. What this check is about is a Row holding
  // no Zombie, and a Wave that has not arrived is the honest way to say that
  // without ending the level.
  const planted = withAPeashooterIn(
    PEA_SQUARE,
    levelWith({ atStep: 5 * 60 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 1 }] }),
  )
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
  // How a plant ends up behind a Zombie is now a narrower question than it was.
  // A Zombie can only get past a plant by eating it, and then there is no plant,
  // so the one way a living plant is behind a walking Zombie is being planted
  // into a Square that Zombie has already walked through - a player's mistake, and
  // the reason for the rule. A Peashooter so placed must never fire at all.
  const behind: Square = { row: 2, column: 5 }
  const level = oneZombieIn(2)

  // The Zombie walks in and leaves the Square the plant is about to go into, so
  // that the plant goes in behind it rather than on top of it. The test is the
  // Square's left edge, not its middle: a Zombie standing in the middle of that
  // Square is still in it, and a plant planted there is a plant it eats.
  const crossed = until(
    withSunToPlant(initialGameState(DEFAULT_SEED, level)),
    (state) => state.zombies.length > 0 && zombieX(zombieIn(state, 2)) < behind.column * SQUARE_WIDTH,
    'the Zombie left the Square the plant will go in',
  )

  const chosen = apply(crossed, { kind: 'choose', choice: 'peashooter' })
  assert.equal(chosen.chosen, 'peashooter', 'the Peashooter can be planted there')
  const planted = apply(chosen, { kind: 'place', square: behind })

  assert.ok(
    zombieX(zombieIn(planted, 2)) < behind.column * SQUARE_WIDTH,
    'so the Zombie is standing to the left of that Square, which is behind it',
  )

  let current = planted
  for (let step = 0; step < 30 * STEPS_PER_SECOND; step++) {
    current = apply(current, { kind: 'advance' })
    assert.equal(
      current.shots.length,
      0,
      `the Peashooter behind the Zombie fired a pea on step ${current.tick}`,
    )
  }

  assert.equal(
    plantIn(current.occupants, behind)?.name,
    'peashooter',
    'and the Peashooter is still standing, shooting nothing at the Zombie leaving',
  )
  assert.equal(current.zombies.length, 0, 'which walked on and off the board unhurt')
})

test('a Zombie is removed from the lawn once a pea has taken all of its health', () => {
  // With a second Wave a long way off, for the same reason as the check above: a
  // level of one Wave is won the moment its Zombie is killed, and this check wants
  // to go on watching the lawn afterwards.
  const planted = withAPeashooterIn(
    PEA_SQUARE,
    levelWith(
      { atStep: ZOMBIE_STEP, zombies: [{ name: 'basic', row: 2 }] },
      { atStep: 5 * 60 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 1 }] },
    ),
  )
  const arrived = untilTick(planted, ZOMBIE_STEP)
  assert.equal(zombieIn(arrived, 2).health, BASIC_HEALTH, 'a Basic Zombie walks in with 200 health')

  const hit = until(arrived, (state) => (state.zombies[0]?.health ?? BASIC_HEALTH) < BASIC_HEALTH)
  assert.equal(
    zombieIn(hit, 2).health,
    BASIC_HEALTH - PEA_DAMAGE,
    'and one pea takes 20 off it, so it takes ten of them to fell one',
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

test('a Zombie that reaches a plant stops there and bites it', () => {
  const planted = withAPeashooterIn(FOOD_SQUARE, oneZombieIn(2))
  const arrived = untilTick(planted, ZOMBIE_STEP)

  const eating = until(
    arrived,
    (state) => (plantIn(state.occupants, FOOD_SQUARE)?.health ?? FULL_HEALTH) < FULL_HEALTH,
    'a Zombie began eating the Peashooter',
  )

  const plant = plantIn(eating.occupants, FOOD_SQUARE)
  assert.ok(plant !== undefined, 'the Peashooter is still there, being eaten')
  assert.equal(
    plant.health,
    FULL_HEALTH - BITE_DAMAGE,
    'and the first bite has taken 100 off its 300 health',
  )

  // The place it stopped at is the place it walked to on the step it arrived, which is
  // the step after the one it walked in on. Comparing it to where the Zombie *walked
  // in* used to be the same number, because the Zombie was reporting the step before
  // the one it had arrived on - and that is the bug the check below this one is about.
  // So it is compared to the step after, which is a claim about having stopped rather
  // than a claim about a coincidence.
  const stopped = zombieIn(eating, 2)
  assert.equal(
    zombieX(stopped),
    zombieX(zombieIn(untilTick(arrived, arrived.tick + 1), 2)),
    'the Zombie has stopped walking, rather than walking through the plant as it did before',
  )

  // A Zombie that has merely slowed down, or stopped for a step, is not eating.
  const aSecondOn = untilTick(eating, eating.tick + STEPS_PER_SECOND)
  assert.equal(
    zombieX(zombieIn(aSecondOn, 2)),
    zombieX(stopped),
    'and it is still standing in the same place a second later',
  )
  assert.equal(
    plantIn(aSecondOn.occupants, FOOD_SQUARE)?.health,
    FULL_HEALTH - 2 * BITE_DAMAGE,
    'having bitten again, once a second',
  )
})

test('a Zombie eating a plant is standing in the Square the plant is in', () => {
  const planted = withAPeashooterIn(FOOD_SQUARE, oneZombieIn(2))
  const arrived = untilTick(planted, ZOMBIE_STEP)

  const eating = until(
    arrived,
    (state) => (plantIn(state.occupants, FOOD_SQUARE)?.health ?? FULL_HEALTH) < FULL_HEALTH,
    'a Zombie began eating the Peashooter',
  )

  // The check above holds that a Zombie stops walking when it reaches a plant, and
  // the one before it holds that it stays put. Neither of them asks *where* it
  // stopped, and a Zombie a whole step to the right of the plant it is chewing on is
  // still stopped and still still - so the position was free to be wrong.
  //
  // It matters because two other things ask this exact question of the same lawn and
  // expect the same answer. The drawing asks whether a Zombie is eating before it
  // draws the Zombie reaching out (`src/draw/board.ts`), so a Zombie a Column off is
  // drawn standing next to the plant it is eating with its arms down. And a Potato
  // Mine asks it to decide whether it has been reached, and a mine whose Zombie is
  // one Square to its right never fires - which is the bug that made the mine
  // impossible, found here rather than there.
  const stopped = zombieIn(eating, 2)
  assert.deepEqual(
    squareAtX(stopped.row, zombieX(stopped)),
    FOOD_SQUARE,
    'so the Square a Zombie reads as standing in is the Square the plant is in, and not the one before it',
  )
})

test('a Zombie eats a plant right through, and leaves the Square bare', () => {
  const planted = withAPeashooterIn(FOOD_SQUARE, oneZombieIn(2))
  const arrived = untilTick(planted, ZOMBIE_STEP)

  // The Zombie walks into the Peashooter's Square on the first step it walks at
  // all, and a Peashooter is 300 health against bites of 100, so it takes exactly
  // three bites - a second apart, so two seconds from the step it arrived.
  const gone = until(
    arrived,
    (state) => plantIn(state.occupants, FOOD_SQUARE) === undefined,
    'the Peashooter was eaten',
  )

  assert.equal(
    gone.tick,
    ZOMBIE_STEP + 1 + 2 * STEPS_PER_SECOND,
    'three bites, a second apart, is how long a Peashooter is food for',
  )
  assert.equal(
    occupantAt(gone.occupants, FOOD_SQUARE),
    null,
    'and the Square it was in is bare lawn again, not holding something else',
  )
  assert.equal(gone.zombies.length, 1, 'the Zombie that ate it is still on the lawn')
  assert.equal(
    zombieX(zombieIn(gone, 2)),
    zombieX(zombieIn(untilTick(arrived, arrived.tick + 1), 2)),
    'and has not gone anywhere, so it is standing where the plant was',
  )
})

test('a Zombie carries on walking once the plant is gone', () => {
  const planted = withAPeashooterIn(FOOD_SQUARE, oneZombieIn(2))
  const arrived = untilTick(planted, ZOMBIE_STEP)
  const atThePlant = zombieX(zombieIn(untilTick(arrived, arrived.tick + 1), 2))

  const eaten = until(
    arrived,
    (state) => plantIn(state.occupants, FOOD_SQUARE) === undefined,
    'the Peashooter was eaten',
  )
  assert.equal(
    zombieX(zombieIn(eaten, 2)),
    atThePlant,
    'the Zombie is still standing where the plant was, on the step it finished it',
  )

  const walking = apply(eaten, { kind: 'advance' })
  assert.ok(
    zombieX(zombieIn(walking, 2)) < atThePlant,
    'and on the very next step it is walking left again, rather than lingering',
  )

  const gone = until(
    walking,
    (state) => state.zombies.length === 0,
    'the Zombie walked off the left of the board',
  )
  assert.equal(
    gone.zombies.length,
    0,
    'so it eats its way through a Row and carries on, rather than standing there for ever',
  )
})

test('a Zombie stops eating the moment its food is dug up, and walks on', () => {
  const planted = withAPeashooterIn(FOOD_SQUARE, oneZombieIn(2))
  const arrived = untilTick(planted, ZOMBIE_STEP)

  const eating = until(
    arrived,
    (state) => (plantIn(state.occupants, FOOD_SQUARE)?.health ?? FULL_HEALTH) < FULL_HEALTH,
    'a Zombie began eating the Peashooter',
  )
  const atThePlant = zombieX(zombieIn(eating, 2))

  // Part way through eating, and with the plant only partly gone, the player
  // digs it up. The Zombie is left standing at a plant that is no longer there.
  const dugUp = apply(
    apply(eating, { kind: 'choose', choice: SHOVEL }),
    { kind: 'shovel', square: FOOD_SQUARE },
  )
  assert.equal(plantIn(dugUp.occupants, FOOD_SQUARE), undefined, 'the Peashooter is dug up')

  const walking = apply(dugUp, { kind: 'advance' })
  assert.ok(
    zombieX(zombieIn(walking, 2)) < atThePlant,
    'and the Zombie walks on, rather than standing over an empty Square for the rest of the level',
  )
})

test('a Zombie walks past a plant in another Row without touching it', () => {
  // The plant is a Row above the one the Zombie walks, in the same Column the
  // eating checks use, so the two are side by side on the lawn and the only
  // thing separating them is the Row.
  const otherRow: Square = { row: FOOD_SQUARE.row - 1, column: FOOD_SQUARE.column }
  const planted = withAPeashooterIn(otherRow, oneZombieIn(FOOD_SQUARE.row))
  const arrived = untilTick(planted, ZOMBIE_STEP)

  assert.equal(
    plantIn(arrived.occupants, otherRow)?.health,
    FULL_HEALTH,
    'the Peashooter is standing a Row above the one the Zombie walks in',
  )

  // The Zombie walks the whole of its own Row and off the board, which carries it
  // the length of the lawn underneath that plant. About forty seconds of walking,
  // so this check is about one thing only: whether a plant in another Row is food.
  const gone = until(
    arrived,
    (state) => state.zombies.length === 0,
    'the Zombie walked off the board without eating anything',
  )

  assert.equal(gone.zombies.length, 0, 'the Zombie has crossed the whole Row and left the lawn')
  assert.equal(
    plantIn(gone.occupants, otherRow)?.health,
    FULL_HEALTH,
    'and the plant in the Row above is untouched, still 300 health',
  )
})

test('a Zombie that walks past the left of the board leaves the lawn', () => {
  // The second Wave's step is worked out first, rather than from the state after
  // the first Zombie has been mown. When this check was written a level could not
  // end at all, so a level of one Wave was simply a level that went on for ever;
  // now that a level is won once its last Wave has come and the lawn is clear, a
  // one-Wave fixture is a level that finishes - and the mower saving the first
  // Zombie would win it, forty seconds before the second Zombie was due.
  const SAVED_AT = 1 + 40 * STEPS_PER_SECOND
  const SECOND_WAVE = SAVED_AT + 1
  const oneThenAnother = levelWith(
    { atStep: 1, zombies: [{ name: 'basic', row: 2 }] },
    { atStep: SECOND_WAVE, zombies: [{ name: 'basic', row: 2 }] },
  )

  const arrived = untilTick(initialGameState(DEFAULT_SEED, oneThenAnother), 1)
  assert.equal(arrived.zombies.length, 1, 'a Zombie walks in with nothing on the lawn to stop it')

  // This used to be a Zombie walking off the board, which is what a Row with a
  // mower in it no longer does: the mower is set off long before the left edge.
  // A Zombie only gets past the left of the board in a Row that has already spent
  // its mower, so that is the situation this check now sets up - a broken Row, and
  // a second Zombie sent into it afterwards.
  const saved = untilTick(arrived, SAVED_AT)
  assert.equal(saved.zombies.length, 0, 'and the first one is taken off the lawn by the mower it reached')

  const arrivedAgain = untilTick(initialGameState(DEFAULT_SEED, oneThenAnother), SECOND_WAVE)
  assert.equal(arrivedAgain.zombies.length, 1, 'a second Zombie walks in behind it, into a Row with no mower left')

  // About forty seconds of walking to cross nine Columns, and nothing in the way
  // to interrupt it, so this check is about one thing only: where the Zombie
  // goes when it gets to the end rather than stopping there.
  //
  // Getting to the end is not an ordinary event any more, and the check does not
  // pretend otherwise: a Zombie that gets past the left edge of a spent Row ends
  // the level, and `game-over.test.ts` is where that is checked. All this asks is
  // the narrower thing, which is the Zombie's own account - that it goes, rather
  // than standing off the side of the board for ever where no player can see it.
  const nearlyOff = untilTick(arrivedAgain, arrivedAgain.tick + 40 * STEPS_PER_SECOND)
  assert.ok(zombieX(zombieIn(nearlyOff, 2)) < SQUARE_WIDTH, 'it is nearly off the left of the board')

  const gone = until(nearlyOff, (state) => state.zombies.length === 0)
  assert.equal(gone.zombies.length, 0, 'and it leaves the lawn')
})

test('a Conehead Zombie walks in with armour, and peas damage the armour before the Zombie', () => {
  const planted = withAPeashooterIn(
    PEA_SQUARE,
    levelWith(
      { atStep: ZOMBIE_STEP, zombies: [{ name: 'conehead', row: 2 }] },
      { atStep: 5 * 60 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 1 }] },
    ),
  )
  const arrived = untilTick(planted, ZOMBIE_STEP)
  const conehead = zombieIn(arrived, 2)
  assert.equal(conehead.health, BASIC_HEALTH, 'body health is 200')
  assert.equal(conehead.armour, CONEHEAD_ARMOUR, 'conehead walks in with 370 armour')

  const hit = until(arrived, (state) => (state.zombies[0]?.armour ?? CONEHEAD_ARMOUR) < CONEHEAD_ARMOUR)
  assert.equal(zombieIn(hit, 2).armour, CONEHEAD_ARMOUR - PEA_DAMAGE, 'pea takes 20 off armour')
  assert.equal(zombieIn(hit, 2).health, BASIC_HEALTH, 'body health remains untouched')
})

test('a Buckethead Zombie walks in with more armour than a Conehead, and peas damage the armour first', () => {
  const planted = withAPeashooterIn(
    PEA_SQUARE,
    levelWith(
      { atStep: ZOMBIE_STEP, zombies: [{ name: 'buckethead', row: 2 }] },
      { atStep: 5 * 60 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 1 }] },
    ),
  )
  const arrived = untilTick(planted, ZOMBIE_STEP)
  const buckethead = zombieIn(arrived, 2)
  assert.equal(buckethead.health, BASIC_HEALTH, 'body health is 200')
  assert.equal(buckethead.armour, BUCKETHEAD_ARMOUR, 'buckethead walks in with 1100 armour')

  const hit = until(arrived, (state) => (state.zombies[0]?.armour ?? BUCKETHEAD_ARMOUR) < BUCKETHEAD_ARMOUR)
  assert.equal(zombieIn(hit, 2).armour, BUCKETHEAD_ARMOUR - PEA_DAMAGE, 'pea takes 20 off armour')
  assert.equal(zombieIn(hit, 2).health, BASIC_HEALTH, 'body health remains untouched')
})

test('armour absorbs damage first, excess damage carries over to health, and subsequent peas hit health', () => {
  const planted = withAPeashooterIn(
    PEA_SQUARE,
    levelWith(
      { atStep: ZOMBIE_STEP, zombies: [{ name: 'conehead', row: 2 }] },
      { atStep: 5 * 60 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 1 }] },
    ),
  )
  const arrived = untilTick(planted, ZOMBIE_STEP)
  assert.equal(zombieIn(arrived, 2).armour, CONEHEAD_ARMOUR)
  assert.equal(zombieIn(arrived, 2).health, BASIC_HEALTH)

  // 19 peas hit (18 * 20 = 360, 19th pea breaks the remaining 10 armour and deals 10 to health)
  const coneBroken = until(
    arrived,
    (state) => zombieIn(state, 2).armour === 0,
    'the cone was broken by shooting',
  )
  const brokenZombie = zombieIn(coneBroken, 2)
  assert.equal(brokenZombie.armour, 0, 'armour is completely broken')
  assert.equal(brokenZombie.health, BASIC_HEALTH - 10, 'excess 10 damage carried over to body health')

  // Next pea lands on the unarmoured zombie
  const nextHit = until(
    coneBroken,
    (state) => zombieIn(state, 2).health < brokenZombie.health,
    'next pea hit the unarmoured zombie',
  )
  assert.equal(zombieIn(nextHit, 2).armour, 0, 'armour stays at 0')
  assert.equal(zombieIn(nextHit, 2).health, BASIC_HEALTH - 30, 'subsequent pea deals full 20 damage to body health')

  // Eventually, when all body health is taken, the zombie is removed from the lawn
  const defeated = until(
    nextHit,
    (state) => state.zombies.filter((z) => z.row === 2).length === 0,
    'the Conehead Zombie was defeated and removed',
  )
  assert.equal(defeated.zombies.filter((z) => z.row === 2).length, 0, 'exhausted zombie is removed from the lawn')
})

test('in a Flag Wave, an armoured Zombie has both its armour and health multiplied by the toughness factor', () => {
  const level = levelWith({
    atStep: 10,
    flagWave: true,
    zombies: [{ name: 'conehead', row: 2 }],
  })
  const arrived = untilTick(initialGameState(DEFAULT_SEED, level), 10)
  const conehead = zombieIn(arrived, 2)
  assert.equal(conehead.health, 250, 'health is 200 * 1.25 = 250')
  assert.equal(conehead.armour, 463, 'armour is 370 * 1.25 = 463')
})

test('a Lawn Mower clears a Buckethead Zombie on contact, ignoring its armour', () => {
  const level = levelWith({ atStep: 1, zombies: [{ name: 'buckethead', row: 2 }] })
  const arrived = untilTick(initialGameState(DEFAULT_SEED, level), 1)
  assert.equal(arrived.zombies.length, 1)

  const cleared = until(arrived, (state) => state.zombies.length === 0, 'mower cleared the buckethead')
  assert.equal(cleared.zombies.length, 0, 'the Buckethead Zombie and its armour were cleared by the mower')
})

test('a Cherry Bomb blast destroys an armoured Zombie and its armour in one hit', () => {
  const BOMB_COST = 150
  const BOMB_SQUARE: Square = { row: 2, column: 6 }
  const level: Level = {
    ...LEVEL_1_1,
    plants: ['cherry-bomb'],
    waves: [{ atStep: 30 * STEPS_PER_SECOND, zombies: [{ name: 'buckethead', row: 2 }] }],
  }
  const ready = withSunToPlant(initialGameState(DEFAULT_SEED, level), BOMB_COST)
  // 283 steps from edge to column 7
  const arrivedAtSquare = untilTick(ready, 30 * STEPS_PER_SECOND + 283)
  assert.equal(squareAtX(2, zombieX(zombieIn(arrivedAtSquare, 2)))?.column, 7, 'Buckethead reached Column 7')

  const chosen = apply(arrivedAtSquare, { kind: 'choose', choice: 'cherry-bomb' })
  assert.equal(chosen.chosen, 'cherry-bomb', 'Cherry Bomb was chosen')
  const planted = apply(chosen, { kind: 'place', square: BOMB_SQUARE })
  assert.equal(plantIn(planted.occupants, BOMB_SQUARE)?.name, 'cherry-bomb', 'Cherry Bomb was planted')
  const detonated = apply(planted, { kind: 'advance' })
  assert.equal(detonated.zombies.length, 0, 'Cherry Bomb completely removes the Buckethead Zombie')
})

test('a Chomper devours an armoured Zombie whole in a single bite', () => {
  const CHOMPER_COST = 150
  const CHOMPER_SQUARE: Square = { row: 2, column: 7 }
  const level: Level = {
    ...LEVEL_1_1,
    plants: ['chomper'],
    waves: [
      { atStep: 30 * STEPS_PER_SECOND, zombies: [{ name: 'buckethead', row: 2 }] },
      { atStep: 5 * 60 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 1 }] },
    ],
  }
  const ready = withSunToPlant(initialGameState(DEFAULT_SEED, level), CHOMPER_COST)
  const chosen = apply(ready, { kind: 'choose', choice: 'chomper' })
  assert.equal(chosen.chosen, 'chomper')
  const planted = apply(chosen, { kind: 'place', square: CHOMPER_SQUARE })
  assert.equal(plantIn(planted.occupants, CHOMPER_SQUARE)?.name, 'chomper')

  const eaten = until(
    planted,
    (state) => (plantIn(state.occupants, CHOMPER_SQUARE)?.stepsUntilChewed ?? 0) > 0,
    'Chomper ate the buckethead',
  )
  assert.equal(eaten.zombies.filter((z) => z.row === 2).length, 0, 'Buckethead was devoured')
  assert.ok((plantIn(eaten.occupants, CHOMPER_SQUARE)?.stepsUntilChewed ?? 0) > 0, 'Chomper is now chewing')
})

test('an armed Potato Mine destroys a Buckethead Zombie in one hit', () => {
  const MINE_SQUARE: Square = { row: 2, column: 5 }
  const level: Level = {
    ...LEVEL_1_1,
    plants: ['potato-mine'],
    waves: [{ atStep: 1, zombies: [{ name: 'buckethead', row: 2 }] }],
  }
  const start = initialGameState(DEFAULT_SEED, level)
  const chosen = apply(start, { kind: 'choose', choice: 'potato-mine' })
  const planted = apply(chosen, { kind: 'place', square: MINE_SQUARE })
  assert.equal(plantIn(planted.occupants, MINE_SQUARE)?.name, 'potato-mine')

  const arrived = untilTick(planted, 1)
  assert.equal(arrived.zombies.length, 1, 'Buckethead walked in')

  const cleared = until(
    arrived,
    (state) => state.zombies.length === 0,
    'Potato Mine destroyed the Buckethead',
  )
  assert.equal(cleared.zombies.length, 0, 'Buckethead was destroyed by the armed Potato Mine')
  assert.equal(plantIn(cleared.occupants, MINE_SQUARE), undefined, 'Potato Mine was spent')
})

test('a Pole Vaulting Zombie enters with 500 health, its pole, and runs twice as fast as a basic zombie', () => {
  const POLE_VAULTING_HEALTH = 500
  const level: Level = {
    ...LEVEL_1_1,
    waves: [{ atStep: 1, zombies: [{ name: 'pole-vaulting', row: 2 }] }],
  }
  const state = apply(initialGameState(DEFAULT_SEED, level), { kind: 'advance' })
  assert.equal(state.zombies.length, 1, 'Pole Vaulting Zombie entered the lawn')
  const zombie = state.zombies[0]
  assert.ok(zombie, 'zombie is present')
  assert.equal(zombie.name, 'pole-vaulting')
  assert.equal(zombie.health, POLE_VAULTING_HEALTH, 'has 500 health')
  assert.equal(zombie.armour, 0, 'has no armour')
  assert.equal(zombie.hasPole, true, 'has its pole')

  // In one step, it should move 2 walked steps rather than 1
  const next = apply(state, { kind: 'advance' })
  const nextZombie = next.zombies[0]
  assert.ok(nextZombie)
  assert.equal(nextZombie.walked, 2, 'ran 2 walked steps in one tick')
})

test('a Pole Vaulting Zombie vaults over the first plant it meets without damaging it, and eats the plant behind', () => {
  const WALL_NUT_HEALTH = 4000
  const SUNFLOWER_HEALTH = 300
  const FIRST_PLANT: Square = { row: 2, column: 7 }
  const SECOND_PLANT: Square = { row: 2, column: 6 }
  const level: Level = {
    name: 'test-vault',
    plants: ['wall-nut', 'sunflower'],
    waves: [{ atStep: ZOMBIE_STEP, zombies: [{ name: 'pole-vaulting', row: 2 }] }],
  }

  const start = withSunToPlant(initialGameState(DEFAULT_SEED, level), 100)
  const chooseWall = apply(start, { kind: 'choose', choice: 'wall-nut' })
  const plantWall = apply(chooseWall, { kind: 'place', square: FIRST_PLANT })
  const chooseSun = apply(plantWall, { kind: 'choose', choice: 'sunflower' })
  const planted = apply(chooseSun, { kind: 'place', square: SECOND_PLANT })

  assert.equal(plantIn(planted.occupants, FIRST_PLANT)?.health, WALL_NUT_HEALTH)
  assert.equal(plantIn(planted.occupants, SECOND_PLANT)?.health, SUNFLOWER_HEALTH)

  // Run until the Pole Vaulting Zombie has reached and vaulted the first plant
  const afterVault = until(
    planted,
    (state) => {
      const z = state.zombies.find((z) => z.row === 2)
      return z !== undefined && !z.hasPole
    },
    'Pole Vaulting Zombie vaulted over the Wall-nut',
  )

  const zombie = afterVault.zombies.find((z) => z.row === 2)
  assert.ok(zombie, 'zombie is still alive')
  assert.equal(zombie.hasPole, false, 'has lost its pole after vaulting')

  // The vaulted Wall-nut in column 7 should be completely untouched
  const firstPlant = plantIn(afterVault.occupants, FIRST_PLANT)
  assert.ok(firstPlant, 'first plant is still standing')
  assert.equal(firstPlant.health, WALL_NUT_HEALTH, 'first plant took zero damage from vaulting')

  // The zombie landed in column 6 and begins biting the second plant
  const bittenState = apply(afterVault, { kind: 'advance' })
  const secondPlant = plantIn(bittenState.occupants, SECOND_PLANT)
  assert.ok(secondPlant, 'second plant is still standing')
  assert.ok(secondPlant.health < SUNFLOWER_HEALTH, 'second plant was bitten after landing')
})

test('after vaulting over a solitary plant into an empty square, a Pole Vaulting Zombie walks at normal speed', () => {
  const PLANT_SQUARE: Square = { row: 2, column: 7 }
  const level: Level = {
    name: 'test-vault-empty',
    plants: ['wall-nut'],
    waves: [{ atStep: ZOMBIE_STEP, zombies: [{ name: 'pole-vaulting', row: 2 }] }],
  }

  const start = withSunToPlant(initialGameState(DEFAULT_SEED, level), 50)
  const chooseWall = apply(start, { kind: 'choose', choice: 'wall-nut' })
  const planted = apply(chooseWall, { kind: 'place', square: PLANT_SQUARE })

  const afterVault = until(
    planted,
    (state) => {
      const z = state.zombies.find((z) => z.row === 2)
      return z !== undefined && !z.hasPole
    },
    'Pole Vaulting Zombie vaulted over the solitary Wall-nut',
  )

  const zombie = afterVault.zombies.find((z) => z.row === 2)
  assert.ok(zombie)
  assert.equal(zombie.hasPole, false)
  assert.equal(zombie.stepsUntilBite, 0, 'no plant at landing square, so not biting')

  const walkedBefore = zombie.walked
  const oneTickLater = apply(afterVault, { kind: 'advance' })
  const zombieNext = oneTickLater.zombies.find((z) => z.row === 2)
  assert.ok(zombieNext)
  assert.equal(zombieNext.walked - walkedBefore, 1, 'walks at normal speed (1 step per tick) without its pole')
})

test('a Tall-nut blocks a Pole Vaulting Zombie: it loses its pole and eats the Tall-nut in place', () => {
  const TALL_NUT_HEALTH = 8000
  const PEASHOOTER_HEALTH = 300
  const TALL_SQUARE: Square = { row: 2, column: 7 }
  const BEHIND_SQUARE: Square = { row: 2, column: 6 }
  const level: Level = {
    name: 'test-tall-nut-vault',
    plants: ['tall-nut', 'peashooter'],
    waves: [{ atStep: 50 * STEPS_PER_SECOND, zombies: [{ name: 'pole-vaulting', row: 2 }] }],
  }

  const start = withSunToPlant(initialGameState(DEFAULT_SEED, level), 150)
  const chooseTall = apply(start, { kind: 'choose', choice: 'tall-nut' })
  const plantTall = apply(chooseTall, { kind: 'place', square: TALL_SQUARE })
  const choosePea = apply(plantTall, { kind: 'choose', choice: 'peashooter' })
  const planted = apply(choosePea, { kind: 'place', square: BEHIND_SQUARE })

  assert.equal(plantIn(planted.occupants, TALL_SQUARE)?.health, TALL_NUT_HEALTH)
  assert.equal(plantIn(planted.occupants, BEHIND_SQUARE)?.health, PEASHOOTER_HEALTH)

  // Run until the Pole Vaulting Zombie reaches the Tall-nut and loses its pole
  const reached = until(
    planted,
    (state) => {
      const z = state.zombies.find((z) => z.row === 2)
      return z !== undefined && !z.hasPole
    },
    'Pole Vaulting Zombie reached Tall-nut and lost its pole',
  )

  const zombie = reached.zombies.find((z) => z.row === 2)
  assert.ok(zombie)
  assert.equal(zombie.hasPole, false, 'lost its pole')

  // It should be standing at the Tall-nut in column 7 and biting it
  const tallNut = plantIn(reached.occupants, TALL_SQUARE)
  assert.ok(tallNut, 'Tall-nut is still in column 7')
  assert.ok(tallNut.health < TALL_NUT_HEALTH, 'Tall-nut was bitten and took damage')

  // The plant behind in column 6 must NOT have been reached or damaged
  const behindPlant = plantIn(reached.occupants, BEHIND_SQUARE)
  assert.ok(behindPlant, 'plant behind is still standing')
  assert.equal(behindPlant.health, PEASHOOTER_HEALTH, 'plant behind is completely untouched')
})

test('a Pole Vaulting Zombie vaults over an armed Potato Mine without detonating it', () => {
  const MINE_SQUARE: Square = { row: 2, column: 7 }
  const level: Level = {
    name: 'test-mine-vault',
    plants: ['potato-mine'],
    waves: [{ atStep: 30 * STEPS_PER_SECOND, zombies: [{ name: 'pole-vaulting', row: 2 }] }],
  }

  const start = initialGameState(DEFAULT_SEED, level)
  const chosen = apply(start, { kind: 'choose', choice: 'potato-mine' })
  const planted = apply(chosen, { kind: 'place', square: MINE_SQUARE })

  const afterVault = until(
    planted,
    (state) => {
      const z = state.zombies.find((z) => z.row === 2)
      return z !== undefined && !z.hasPole
    },
    'Pole Vaulting Zombie vaulted over the armed Potato Mine',
  )

  const zombie = afterVault.zombies.find((z) => z.row === 2)
  assert.ok(zombie, 'zombie is still alive after vaulting')
  assert.equal(zombie.hasPole, false)

  const mine = plantIn(afterVault.occupants, MINE_SQUARE)
  assert.ok(mine, 'Potato Mine was not detonated')
  assert.equal(mine.stepsUntilArmed, 0, 'Potato Mine remains armed')
})

test('a Pole Vaulting Zombie landing on an armed Potato Mine is destroyed by it', () => {
  const WALL_SQUARE: Square = { row: 2, column: 7 }
  const MINE_SQUARE: Square = { row: 2, column: 6 }
  const level: Level = {
    name: 'test-mine-landing',
    plants: ['wall-nut', 'potato-mine'],
    waves: [{ atStep: 30 * STEPS_PER_SECOND, zombies: [{ name: 'pole-vaulting', row: 2 }] }],
  }

  const start = withSunToPlant(initialGameState(DEFAULT_SEED, level), 75)
  const chooseMine = apply(start, { kind: 'choose', choice: 'potato-mine' })
  const plantMine = apply(chooseMine, { kind: 'place', square: MINE_SQUARE })
  const chooseWall = apply(plantMine, { kind: 'choose', choice: 'wall-nut' })
  const planted = apply(chooseWall, { kind: 'place', square: WALL_SQUARE })

  const entered = until(planted, (s) => s.zombies.length > 0, 'Pole Vaulting Zombie entered')

  const cleared = until(
    entered,
    (state) => state.zombies.length === 0,
    'armed Potato Mine destroyed the vaulted Pole Vaulting Zombie',
  )

  assert.equal(cleared.zombies.length, 0, 'zombie was destroyed upon landing')
  assert.equal(plantIn(cleared.occupants, MINE_SQUARE), undefined, 'Potato Mine was spent')
  assert.ok(plantIn(cleared.occupants, WALL_SQUARE), 'Wall-nut in column 7 is still intact')
})

test('a ready Chomper devours a Pole Vaulting Zombie that lands in its Square', () => {
  const WALL_SQUARE: Square = { row: 2, column: 7 }
  const CHOMPER_SQUARE: Square = { row: 2, column: 6 }
  const level: Level = {
    name: 'test-chomper-vault',
    plants: ['wall-nut', 'chomper'],
    waves: [{ atStep: 80 * STEPS_PER_SECOND, zombies: [{ name: 'pole-vaulting', row: 2 }] }],
  }

  const start = withSunToPlant(initialGameState(DEFAULT_SEED, level), 200)
  const chooseChomper = apply(start, { kind: 'choose', choice: 'chomper' })
  const plantChomper = apply(chooseChomper, { kind: 'place', square: CHOMPER_SQUARE })
  const chooseWall = apply(plantChomper, { kind: 'choose', choice: 'wall-nut' })
  const planted = apply(chooseWall, { kind: 'place', square: WALL_SQUARE })

  const entered = until(planted, (s) => s.zombies.length > 0, 'Pole Vaulting Zombie entered')

  const devoured = until(
    entered,
    (state) => (plantIn(state.occupants, CHOMPER_SQUARE)?.stepsUntilChewed ?? 0) > 0,
    'Chomper devoured the landed Pole Vaulting Zombie',
  )

  assert.equal(devoured.zombies.length, 0, 'Pole Vaulting Zombie was devoured whole')
  assert.ok(plantIn(devoured.occupants, WALL_SQUARE), 'vaulted Wall-nut is still intact')
})

test('in a Flag Wave, a Pole Vaulting Zombie has its health scaled by the toughness factor', () => {
  const POLE_VAULTING_HEALTH = 500
  const FLAG_TOUGHNESS = 1.25
  const EXPECTED_HEALTH = Math.round(POLE_VAULTING_HEALTH * FLAG_TOUGHNESS)

  const level: Level = {
    ...LEVEL_1_1,
    waves: [{ atStep: 1, flagWave: true, zombies: [{ name: 'pole-vaulting', row: 2 }] }],
  }
  const state = apply(initialGameState(DEFAULT_SEED, level), { kind: 'advance' })
  const zombie = state.zombies[0]
  assert.ok(zombie)
  assert.equal(zombie.health, EXPECTED_HEALTH, 'Flag Wave Pole Vaulting Zombie has 625 health')
})

test('a Snow Pea pea slows a running Pole Vaulting Zombie from speed 2 to speed 1', () => {
  const level: Level = {
    name: 'test-slow-runner',
    plants: ['snow-pea'],
    waves: [{ atStep: 60 * STEPS_PER_SECOND, zombies: [{ name: 'pole-vaulting', row: 2 }] }],
  }

  const start = withSunToPlant(initialGameState(101, level), 175)
  const choose = apply(start, { kind: 'choose', choice: 'snow-pea' })
  const planted = apply(choose, { kind: 'place', square: { row: 2, column: 1 } })

  const hit = until(
    planted,
    (state) => {
      const z = state.zombies.find((z) => z.row === 2)
      return z !== undefined && z.stepsSlowed > 0
    },
    'Snow Pea hit the running Pole Vaulting Zombie',
  )

  const zombie = hit.zombies.find((z) => z.row === 2)
  assert.ok(zombie)
  assert.equal(zombie.hasPole, true, 'still running with pole')
  assert.ok(zombie.stepsSlowed > 0, 'is slowed')

  // While slowed and running, each step advances 1 walked unit (2 * 0.5)
  const walkedBefore = zombie.walked
  const next = apply(hit, { kind: 'advance' })
  const nextZombie = next.zombies.find((z) => z.row === 2)
  assert.ok(nextZombie)
  assert.equal(nextZombie.walked - walkedBefore, 1, 'advanced 1 walked step per tick while slowed')
})
