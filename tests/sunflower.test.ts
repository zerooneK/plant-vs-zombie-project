import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apply, initialGameState } from '../src/game/sim.ts'
import { SQUARE_HEIGHT, centreX, centreY, plantIn } from '../src/game/board.ts'
import { levelWith, oneZombieIn } from './helpers.ts'

/** The Sun a Sunflower costs to plant, and the Sun it is worth when collected. */
const FLOWER_COST = 50

test('a Sunflower can be planted for 50 Sun, and Level 1-1 offers one', () => {
  const before = initialGameState()

  const packet = before.seedBank.find((candidate) => candidate.name === 'sunflower')
  assert.ok(packet, 'Level 1-1 offers a Sunflower in its Seed Bank')
  assert.equal(packet.cost, FLOWER_COST, 'a Sunflower costs 50 Sun')
  assert.equal(packet.stepsUntilReady, 0, 'a packet you have not used yet is ready to choose')

  const square = { row: 0, column: 1 }
  const chosen = apply(before, { kind: 'choose', choice: 'sunflower' })
  const after = apply(chosen, { kind: 'place', square })

  assert.equal(after.sun, before.sun - FLOWER_COST, 'the plant costs exactly its Sun cost')
  assert.equal(plantIn(after.occupants, square)?.name, 'sunflower', 'the Sunflower is in that Square')
})

/** Runs the one step command a number of times, which is the only way time passes. */
function afterSteps(state: ReturnType<typeof initialGameState>, steps: number) {
  let current: ReturnType<typeof initialGameState> = state
  for (let step = 0; step < steps; step++) {
    current = apply(current, { kind: 'advance' })
  }
  return current
}

/** Plants a Sunflower in the given Square, which the 50 Sun it costs is already there to pay for. */
function withASunflowerIn(square: { row: number; column: number }) {
  return apply(apply(initialGameState(), { kind: 'choose', choice: 'sunflower' }), { kind: 'place', square })
}

/** The pieces of Sun lying over one Square, which is where a Sunflower makes its own. */
function sunOver(state: ReturnType<typeof initialGameState>, square: { row: number; column: number }) {
  return state.tokens.filter((token) => token.x === centreX(square))
}

const INTERVAL = 1080

/** The size of the Sun a plant makes, which is what a falling piece is drawn as. */
const SUN_RADIUS = 18

test('a Sunflower makes one piece of Sun every 18 seconds, and not a step sooner', () => {
  const square = { row: 0, column: 1 }
  const planted = withASunflowerIn(square)

  const justBefore = afterSteps(planted, INTERVAL - 1)
  assert.equal(sunOver(justBefore, square).length, 0, 'no Sun one step before the interval is up')

  const onTime = afterSteps(planted, INTERVAL)
  const first = sunOver(onTime, square)
  assert.equal(first.length, 1, 'exactly one piece of Sun on the step the interval is up')
  assert.equal(first[0]?.amount, 25, 'worth 25 Sun, the same as Sun from the sky')

  const later = afterSteps(planted, INTERVAL * 2)
  const second = sunOver(later, square)
  assert.equal(second.length, 1, 'one piece of Sun at a time over a Sunflower')
  assert.ok(
    (second[0]?.id ?? 0) > (first[0]?.id ?? 0),
    'and it is a further one, so it keeps making Sun rather than stopping at one',
  )
})

test('the Sun a Sunflower makes falls from the plant to the foot of its own Square', () => {
  const square = { row: 0, column: 1 }
  const planted = withASunflowerIn(square)

  const onTime = afterSteps(planted, INTERVAL)
  const made = sunOver(onTime, square)[0]
  assert.ok(made, 'the Sunflower has made a piece of Sun')
  assert.ok(made.y < made.restingY, 'it starts up at the plant, still on its way down')

  const landed = afterSteps(planted, INTERVAL + 200)
  const resting = sunOver(landed, square)[0]
  assert.ok(resting, 'and it is still there afterwards')
  assert.ok(resting.y >= resting.restingY, 'it has come to rest')
  assert.ok(
    resting.restingY > centreY(square),
    'the rest of it is lower down the Square than the middle, so it settles at the foot',
  )
  assert.ok(
    resting.restingY <= (square.row + 1) * SQUARE_HEIGHT - SUN_RADIUS,
    'and it stops inside its own Square rather than out on the lawn',
  )
})

test('the Sun a Sunflower makes is collected by clicking, exactly like Sun from the sky', () => {
  const square = { row: 0, column: 1 }
  const planted = withASunflowerIn(square)
  const landed = afterSteps(planted, INTERVAL + 200)
  const resting = sunOver(landed, square)[0]
  assert.ok(resting, 'the Sunflower has made a piece of Sun')

  const collected = apply(landed, { kind: 'collect', point: { x: resting.x, y: resting.y } })

  assert.equal(collected.sun, landed.sun + 25, 'clicking it adds what it is worth')
  assert.equal(
    collected.tokens.filter((token) => token.x === centreX(square)).length,
    0,
    'and takes it off the lawn',
  )
})

test('Sun a Sunflower makes is lost if it is not collected, on the same terms as any other', () => {
  const square = { row: 0, column: 1 }
  const planted = withASunflowerIn(square)
  const landed = afterSteps(planted, INTERVAL + 200)
  const held = landed.sun

  // Long enough for the Sun to spend all 420 steps of its life, and short
  // enough that the Sunflower has not made another: it is due again at 2910.
  const waitedOut = afterSteps(landed, 400)

  assert.equal(waitedOut.sun, held, 'waiting for it gains nothing')
  assert.equal(
    waitedOut.tokens.filter((token) => token.x === centreX(square)).length,
    0,
    'and it is gone from the lawn, as uncollected Sun from the sky is',
  )
})

/** A level that sends one Basic Zombie into a Row, so a Sunflower has something to meet. */
function withAZombieIn(row: number, atStep = 0) {
  return initialGameState(7, levelWith(oneZombieIn(row, atStep)))
}

/** The Sunflower in a Square, or null once something has eaten it. */
function flowerIn(state: ReturnType<typeof initialGameState>, square: { row: number; column: number }) {
  const plant = plantIn(state.occupants, square)
  return plant !== undefined && plant.name === 'sunflower' ? plant : null
}

test('a Sunflower has no attack, and a Zombie walks straight past it', () => {
  const square = { row: 0, column: 1 }
  const started = apply(withAZombieIn(0), { kind: 'choose', choice: 'sunflower' })
  const planted = apply(started, { kind: 'place', square })

  let state = planted
  let shotsEverFired = 0
  let zombiesSeen = 0
  let healthEverChanged = false

  for (let step = 0; step < 2500; step++) {
    state = apply(state, { kind: 'advance' })
    shotsEverFired = Math.max(shotsEverFired, state.shots.length)
    for (const zombie of state.zombies) {
      zombiesSeen += 1
      if (zombie.health !== 200) {
        healthEverChanged = true
      }
    }
  }

  assert.ok(zombiesSeen > 0, 'a Zombie did come down that Row')
  assert.equal(shotsEverFired, 0, 'a Sunflower never fires at anything')
  assert.equal(healthEverChanged, false, 'so nothing it did took any off the Zombie that walked past')
})

test('a Sunflower a Zombie has eaten makes no more Sun', () => {
  const square = { row: 0, column: 1 }
  const started = apply(withAZombieIn(0), { kind: 'choose', choice: 'sunflower' })
  const planted = apply(started, { kind: 'place', square })

  // Far enough for the Zombie to reach the Sunflower and eat all 300 of it.
  let state = planted
  for (let step = 0; step < 2600; step++) {
    state = apply(state, { kind: 'advance' })
    if (flowerIn(state, square) === null) {
      break
    }
  }
  assert.equal(flowerIn(state, square), null, 'the Sunflower has been eaten')

  // Sun it made before it was eaten may still be lying there, and is let run out
  // first: what is being asked is whether it makes any more.
  for (let step = 0; step < INTERVAL && sunOver(state, square).length > 0; step++) {
    state = apply(state, { kind: 'advance' })
  }
  const before = sunOver(state, square).length
  const waitedOn = afterSteps(state, INTERVAL)

  assert.equal(before, 0, 'and once the Sun it made before then has gone, nothing is lying over the Square it was eaten on')
  assert.equal(
    waitedOn.tokens.filter((token) => token.x === centreX(square)).length,
    0,
    'and it makes nothing more, however long the level goes on',
  )
})
