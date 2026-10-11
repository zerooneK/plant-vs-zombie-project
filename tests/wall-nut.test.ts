import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'
import { apply, initialGameState, type GameState } from '../src/game/sim.ts'
import { centreX, centreY, plantIn, type Square } from '../src/game/board.ts'
import { zombieX } from '../src/game/zombies.ts'
import type { Level } from '../src/game/levels.ts'
import type { PlantName } from '../src/game/plants.ts'
import { levelOffering, oneZombieIn, untilTick, withSunToPlant } from './helpers.ts'

/** What a Wall-nut and a Tall-nut each cost to plant. The same as each other. */
const NUT_COST = 50

/** The two plants this file is about, named once so the checks below can loop. */
type NutName = 'wall-nut' | 'tall-nut'

/**
 * The health a Wall-nut and a Tall-nut are each planted with.
 *
 * Written out rather than read from the rules, because the point of a check is to
 * catch the number being wrong: reading it would pass whatever `balance.ts`
 * happened to say, which is the thing most worth catching.
 */
const WALL_NUT_HEALTH = 4000
const TALL_NUT_HEALTH = 8000

/** What one bite takes off a plant, and how long between one bite and the next. */
const BITE = 100
const A_SECOND = STEPS_PER_SECOND

/**
 * Where the checks below stand their nuts.
 *
 * The fifth Column, rather than the first. A Zombie walks from the right of the
 * lawn at about four and a half seconds a Column, so a nut in the first Column is
 * reached in nearly forty seconds and in the last Column in no time at all - the
 * Column decides how long the check spends walking before the thing it is about
 * starts. The middle is where the walk is quick enough not to make the check slow
 * and long enough that the Zombie arrives while there is still a plant to find.
 */
const NUT_SQUARE: Square = { row: 0, column: 5 }

/** A level offering the named plants and sending one Zombie down Row 0. */
function oneZombieComing(...plants: PlantName[]): Level {
  return levelOffering(plants, oneZombieIn(NUT_SQUARE.row, 20 * STEPS_PER_SECOND))
}

/** The named plant standing in a Square, with the Sun to pay for it gathered first. */
function withIn(name: NutName, square: Square): GameState {
  const started = withSunToPlant(initialGameState(101, oneZombieComing(name)), 2 * NUT_COST)
  const planted = apply(apply(started, { kind: 'choose', choice: name }), { kind: 'place', square })

  assert.equal(plantAt(planted, square)?.name, name, `the ${name} was planted`)

  return planted
}

/**
 * A Wall-nut in one Row and a Tall-nut in the Row below, in the last Column, with
 * a Zombie walking into each of them on the same step.
 *
 * The last Column so that both Zombies arrive on their first step, and the check
 * is about how long each plant holds one rather than about how long a Zombie takes
 * to walk. Two Rows, so the two are being eaten side by side and the comparison is
 * between plants that have been standing in the same place for the same number of
 * seconds - which is the only comparison that means anything.
 */
function bothNutsEatenSideBySide(): { planted: GameState; wall: Square; tall: Square } {
  const wall: Square = { row: 0, column: 8 }
  const tall: Square = { row: 1, column: 8 }

  const started = withSunToPlant(
    initialGameState(
      101,
      levelOffering(['wall-nut', 'tall-nut'], {
        atStep: 20 * STEPS_PER_SECOND,
        zombies: [
          { name: 'basic', row: wall.row },
          { name: 'basic', row: tall.row },
        ],
      }),
    ),
    2 * NUT_COST,
  )
  const chosen = apply(started, { kind: 'choose', choice: 'wall-nut' })
  const both = apply(apply(chosen, { kind: 'place', square: wall }), { kind: 'choose', choice: 'tall-nut' })

  return { planted: apply(both, { kind: 'place', square: tall }), wall, tall }
}

/** The plant standing in a Square, or undefined once something has eaten it. */
function plantAt(state: GameState, square: Square) {
  return plantIn(state.occupants, square)
}

/** The one Zombie on the lawn, and a complaint if there is not exactly one. */
function theZombie(state: GameState) {
  assert.equal(state.zombies.length, 1, `expected one Zombie, found ${state.zombies.length}`)
  const zombie = state.zombies[0]
  assert.ok(zombie, 'the Zombie')
  return zombie
}

/** Plays on until the game looks like this, or gives up naming what it waited for. */
function until(state: GameState, satisfied: (state: GameState) => boolean, what: string): GameState {
  let current = state
  for (let step = 0; step < 4000; step++) {
    if (satisfied(current)) {
      return current
    }
    current = apply(current, { kind: 'advance' })
  }
  return assert.fail(`the game never got there: ${what}`) as never
}

/** Plays on until the Zombie has taken its first bite, and hands back when it did. */
function untilFirstBite(state: GameState, square: Square): GameState {
  return until(
    state,
    (current) => (plantAt(current, square)?.health ?? WALL_NUT_HEALTH) < WALL_NUT_HEALTH,
    'a Zombie began eating the plant',
  )
}

test('a Zombie that reaches a Wall-nut stops there and eats it, rather than walking through', () => {
  const planted = withIn('wall-nut', NUT_SQUARE)

  // While the Zombie is still walking, the Wall-nut is untouched. A plant that
  // only stops a Zombie once it has arrived would still look like a wall to a
  // player for the whole walk.
  const beforeArrival = until(
    planted,
    (state) => state.zombies.length === 1 && theZombie(state).walked > 0,
    'the Zombie began walking',
  )
  assert.equal(
    plantAt(beforeArrival, NUT_SQUARE)?.health,
    WALL_NUT_HEALTH,
    'and the Wall-nut is still whole while the Zombie is on its way to it',
  )

  const eating = untilFirstBite(beforeArrival, NUT_SQUARE)
  const stopped = zombieX(theZombie(eating))

  assert.equal(
    plantAt(eating, NUT_SQUARE)?.health,
    WALL_NUT_HEALTH - BITE,
    'the first bite has taken 100 off its 4000 health',
  )

  // A second later it is still in the same place, and the Wall-nut is 200 lighter.
  // This is the whole of "it stops to eat it": the Zombie is not slowing down at
  // the plant, it is standing still while the plant is being used up.
  const aSecondOn = untilTick(eating, eating.tick + A_SECOND, 'a second of chewing later')

  assert.equal(
    zombieX(theZombie(aSecondOn)),
    stopped,
    'a second later the Zombie has not gone anywhere: it is eating, not walking',
  )
  assert.equal(
    plantAt(aSecondOn, NUT_SQUARE)?.health,
    WALL_NUT_HEALTH - 2 * BITE,
    'and it has bitten again, taking a second 100 off',
  )
})

test('a Wall-nut is food for forty bites, and then the Square is bare', () => {
  // A Peashooter is food for three bites - `tests/zombies.test.ts` says so, and
  // pins the number. A Wall-nut is 4000 health against bites of 100, so it is
  // forty, and that difference is the whole of what the plant is for: it does not
  // defend a Row, it makes a Zombie stand in one place for three quarters of a
  // minute while whatever is behind it shoots.
  const planted = withIn('wall-nut', NUT_SQUARE)
  const firstBite = untilFirstBite(planted, NUT_SQUARE)

  // The first bite is spent and thirty-nine are left. A bite a second, so the
  // fortieth is thirty-nine seconds on - and it is *on* that step rather than
  // after it, so the last one standing is thirty-eight seconds on, with 100 of
  // the 4000 left.
  const oneBiteLeft = untilTick(
    firstBite,
    firstBite.tick + (WALL_NUT_HEALTH / BITE - 2) * A_SECOND,
    'thirty-eight seconds of biting later',
  )
  assert.equal(
    plantAt(oneBiteLeft, NUT_SQUARE)?.health,
    BITE,
    'with one bite left, having taken thirty-nine of the forty',
  )

  const lastBite = untilTick(oneBiteLeft, oneBiteLeft.tick + A_SECOND, 'the fortieth bite')
  assert.equal(
    plantAt(lastBite, NUT_SQUARE),
    undefined,
    'and a second later the fortieth takes the last 100, leaving the Square bare',
  )
  assert.equal(theZombie(lastBite).health, 200, 'the Zombie is still on the lawn, unhurt by any of it')
})

test('a Tall-nut costs the same as a Wall-nut, and is half eaten by the time the Wall-nut is gone', () => {
  const { planted, wall, tall } = bothNutsEatenSideBySide()

  assert.equal(plantAt(planted, wall)?.health, WALL_NUT_HEALTH, 'the Wall-nut is planted whole')
  assert.equal(plantAt(planted, tall)?.health, TALL_NUT_HEALTH, 'and the Tall-nut is planted whole')

  // Play until the Wall-nut has been eaten right through.
  const wallGone = until(planted, (state) => plantAt(state, wall) === undefined, 'a Zombie ate the Wall-nut')

  // The Tall-nut is being eaten by exactly the same rule, one bite a second, and
  // has been for the same number of bites: forty of its eighty, so half of it is
  // left. This is the whole of what the plant is for - the same Sun, twice as many
  // bites, so a Row that will not hold is held for twice as long.
  assert.equal(
    plantAt(wallGone, tall)?.health,
    TALL_NUT_HEALTH - WALL_NUT_HEALTH,
    'the Tall-nut is half eaten, having taken the same forty bites the Wall-nut did',
  )
  assert.ok((plantAt(wallGone, tall)?.health ?? 0) > 0, 'so it is still standing where the Wall-nut is not')
})

test('neither nut ever fires, and neither ever makes a piece of Sun', () => {
  const { planted, wall, tall } = bothNutsEatenSideBySide()
  let state = planted
  let peas = 0
  let zombieDamageTaken = 0
  let stepsWithAMeat = 0
  let stepsWithNothingToShootAt = 0
  let sunMadeAtANut = 0
  const watched = 60 * STEPS_PER_SECOND

  for (let step = 0; step < watched; step++) {
    state = apply(state, { kind: 'advance' })
    peas = Math.max(peas, state.shots.length)
    zombieDamageTaken += state.zombies.filter((zombie) => zombie.health !== 200).length

    // Sun a plant makes is made at the plant, on the step its interval comes
    // round, and is sitting exactly on the middle of its Square for that one step
    // before it starts to fall. Watching for that is watching for a nut growing
    // into a Sunflower. Eighteen seconds is the Sunflower's interval, so a
    // minute of play covers three of them whole.
    for (const square of [wall, tall]) {
      const atItsOwnCentre = state.tokens.some(
        (token) => token.x === centreX(square) && token.y === centreY(square),
      )
      if (atItsOwnCentre) {
        sunMadeAtANut += 1
      }
    }

    // The control. A check that a plant fires nothing passes for the wrong reason
    // if there was nothing in front of it, so every step is asked, for each nut
    // that is standing in a Row a Zombie has actually reached, whether one of them
    // was in front of it - the one thing a Peashooter in the same place would
    // have fired at.
    //
    // Asked per nut rather than for the pair, and only for a nut that is standing
    // and in a Row that holds a Zombie, because both of those exclusions are the
    // wrong-reason pass coming back in a new shape: a Wall-nut is food for forty
    // seconds and this watches a minute, so the Zombie that ate one carries on
    // walking afterwards, and before the Wave walks in there is nothing in any Row
    // to shoot at in the first place. Neither is a step on which the nut had
    // something in front of it and declined to fire.
    stepsWithAMeat += 1
    for (const square of [wall, tall]) {
      if (plantAt(state, square) === undefined) {
        continue
      }
      const inTheRow = state.zombies.filter((zombie) => zombie.row === square.row)
      if (inTheRow.length === 0) {
        continue
      }
      stepsWithAMeat += 1
      if (!inTheRow.some((zombie) => zombieX(zombie) >= centreX(square))) {
        stepsWithNothingToShootAt += 1
      }
    }
  }

  assert.ok(
    stepsWithAMeat > 3000,
    `both nuts spent most of the minute standing with a Zombie in their Row (${stepsWithAMeat} observations)`,
  )
  assert.equal(
    stepsWithNothingToShootAt,
    0,
    'and one was in front of each of them on every one of those',
  )
  assert.equal(peas, 0, 'not one pea left either of them, while a Zombie ate them')
  assert.equal(zombieDamageTaken, 0, 'and the Zombies that ate them were never shot at')
  assert.equal(
    sunMadeAtANut,
    0,
    'nor did either of them ever make a piece of Sun, in a minute covering two whole intervals',
  )
})

test("a Wall-nut's Seed Packet takes thirty seconds to Recharge, and a Tall-nut's the same", () => {
  // The slowest Recharge in the game, and the reason it is worth anything. A Row
  // holds nine of these, so lining a Row with nuts is four and a half minutes of
  // waiting - longer than a whole Level lasts. It is the Recharge, not the Sun
  // cost, that makes a nut somewhere you chose rather than a Row of them.
  //
  // Both plants are checked because they are meant to Recharge alike. Sharing one
  // number between them is a promise made in `balance.ts`, and nothing else in the
  // suite reads it - a Tall-nut quietly given a Recharge of its own would pass
  // every other check here.
  const level = levelOffering(['wall-nut', 'tall-nut'], oneZombieIn(4, 5 * 60 * STEPS_PER_SECOND))
  const started = withSunToPlant(initialGameState(101, level), 2 * NUT_COST)

  const chosen = apply(started, { kind: 'choose', choice: 'wall-nut' })
  const both = apply(apply(chosen, { kind: 'place', square: { row: 0, column: 1 } }), {
    kind: 'choose',
    choice: 'tall-nut',
  })
  const planted = apply(both, { kind: 'place', square: { row: 1, column: 1 } })

  const rechargeOf = (state: GameState, name: NutName) =>
    state.seedBank.find((candidate) => candidate.name === name)?.stepsUntilReady

  for (const name of ['wall-nut', 'tall-nut'] as const) {
    assert.equal(rechargeOf(planted, name), 1800, `the ${name} packet goes on Recharge for 1800 steps, 30 seconds`)
  }

  const oneStepShort = untilTick(planted, planted.tick + 1799, 'a second before the Recharge is up')
  assert.equal(rechargeOf(oneStepShort, 'wall-nut'), 1, 'a Wall-nut packet is still one step from ready a second early')
  assert.notEqual(
    apply(oneStepShort, { kind: 'choose', choice: 'wall-nut' }).chosen,
    'wall-nut',
    'so a packet with a step left on it cannot be chosen',
  )

  const ready = untilTick(planted, planted.tick + 1800, 'the step the thirty seconds are up')
  for (const name of ['wall-nut', 'tall-nut'] as const) {
    assert.equal(rechargeOf(ready, name), 0, `and a ${name} packet is ready on the step its thirty seconds are up`)
    assert.equal(
      apply(ready, { kind: 'choose', choice: name }).chosen,
      name,
      `and can be chosen again then, whichever of the two it is`,
    )
  }
})
