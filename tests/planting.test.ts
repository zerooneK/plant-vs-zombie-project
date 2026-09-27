import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SHOVEL, apply, initialGameState } from '../src/game/sim.ts'
import type { GameState } from '../src/game/sim.ts'
import { BOARD_ROWS, MOWER_COLUMN, hasLawnMower, plantIn } from '../src/game/board.ts'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'

/**
 * What a Peashooter costs, written out here rather than read from the rules.
 *
 * The point of a check is to catch the number being wrong, so the number has to
 * be stated in the check. Reading it from `balance.ts` would pass whatever that
 * file happened to say.
 */
const PEA_COST = 100

/** How many plants are standing on the lawn, ignoring the Lawn Mowers. */
function plantsOn(state: GameState): number {
  return state.occupants.filter((occupant) => occupant.kind === 'plant').length
}

/** Plays the game forward by running the one step command over and over. */
function afterSeconds(state: GameState, seconds: number): GameState {
  let current = state
  for (let step = 0; step < seconds * STEPS_PER_SECOND; step++) {
    current = apply(current, { kind: 'advance' })
  }
  return current
}

/**
 * Plays until there is enough Sun in hand to pay for a Peashooter, collecting
 * every piece that falls on the way.
 *
 * A level begins with 50 Sun and a Peashooter costs 100, exactly as in the
 * original, so nothing can be planted until Sun has been collected. Every
 * planting check has to start from here: a check that tried to plant on 50 Sun
 * would be refused for being broke rather than for the reason it is about, and
 * would pass whether or not the rule worked.
 */
function withSunToPlant(start: GameState): GameState {
  let state = start
  for (let step = 0; step < 2 * 60 * STEPS_PER_SECOND; step++) {
    if (state.sun >= PEA_COST) {
      return state
    }
    state = apply(state, { kind: 'advance' })
    const token = state.tokens[state.tokens.length - 1]
    if (token !== undefined) {
      state = apply(state, { kind: 'collect', point: { x: token.x, y: token.y } })
    }
  }
  assert.fail(`only ${state.sun} Sun fell in two minutes, not enough to plant a Peashooter`)
}

test('the Seed Bank shows the plants this level allows, and what each one costs', () => {
  const bank = initialGameState().seedBank

  assert.equal(bank.length, 1, 'the first level allows one plant for now')
  const packet = bank[0]
  assert.ok(packet, 'the Seed Bank has a packet in it')
  assert.equal(packet.name, 'peashooter', 'the one plant this level allows is a Peashooter')
  assert.equal(packet.cost, PEA_COST, 'a Peashooter costs 100 Sun')
  assert.equal(packet.stepsUntilReady, 0, 'a packet you have not used yet is ready to choose')
})

test('choosing a Seed Packet and then a Square plants it, and costs me its Sun', () => {
  const before = withSunToPlant(initialGameState())
  const square = { row: 2, column: 1 }

  const chosen = apply(before, { kind: 'choose', choice: 'peashooter' })
  const after = apply(chosen, { kind: 'place', square })

  assert.equal(after.sun, before.sun - PEA_COST, 'the plant costs exactly its Sun cost')
  assert.equal(plantIn(after.occupants, square)?.name, 'peashooter', 'the Peashooter is in that Square')
  assert.equal(after.chosen, null, 'the choice is cleared, so the next click is a fresh one')
})

test('a Square I plant on is not planted on again by the click after', () => {
  const chosen = apply(withSunToPlant(initialGameState()), { kind: 'choose', choice: 'peashooter' })
  const planted = apply(chosen, { kind: 'place', square: { row: 2, column: 1 } })

  const after = apply(planted, { kind: 'place', square: { row: 2, column: 1 } })

  assert.equal(plantIn(after.occupants, { row: 2, column: 1 })?.name, 'peashooter', 'still just the one plant')
  assert.equal(after.chosen, null, 'and nothing is chosen, so the click was not a plant')
})

test('a Seed Packet I have just used cannot be chosen again until it has Recharged', () => {
  const square = { row: 2, column: 1 }
  const planted = apply(
    apply(withSunToPlant(initialGameState()), { kind: 'choose', choice: 'peashooter' }),
    { kind: 'place', square },
  )

  const packet = planted.seedBank[0]
  assert.ok(packet, 'the Seed Bank still shows the packet')
  assert.ok(packet.stepsUntilReady > 0, 'the Seed Bank shows the packet as unavailable')

  const atOnce = apply(planted, { kind: 'choose', choice: 'peashooter' })
  assert.equal(atOnce.chosen, null, 'a packet still Recharging cannot be chosen')

  const almost = apply(afterSeconds(planted, 7), { kind: 'choose', choice: 'peashooter' })
  assert.equal(almost.chosen, null, 'nor can it be chosen after seven seconds')

  const recharged = afterSeconds(planted, 8)
  assert.equal(recharged.seedBank[0]?.stepsUntilReady, 0, 'the Seed Bank shows it ready again')
  assert.equal(
    apply(recharged, { kind: 'choose', choice: 'peashooter' }).chosen,
    'peashooter',
    'and once it has Recharged it can be chosen again',
  )
})

test('a Square that already holds a plant refuses another, and costs me nothing', () => {
  const square = { row: 2, column: 1 }
  const planted = apply(
    apply(withSunToPlant(initialGameState()), { kind: 'choose', choice: 'peashooter' }),
    { kind: 'place', square },
  )
  const ready = afterSeconds(planted, 8)
  const chosen = apply(ready, { kind: 'choose', choice: 'peashooter' })
  assert.equal(chosen.chosen, 'peashooter', 'the packet is ready and chosen, so the refusal below is about the Square')

  const after = apply(chosen, { kind: 'place', square })

  assert.equal(plantIn(after.occupants, square)?.name, 'peashooter', 'the Square still holds the one plant')
  assert.equal(after.sun, planted.sun, 'and no Sun is spent on a refused plant')
  assert.equal(after.chosen, 'peashooter', 'the packet stays chosen, so I can plant it somewhere else')
})

test('a plant I cannot pay for is not planted, and no Sun is spent', () => {
  const before = initialGameState()
  assert.ok(before.sun < PEA_COST, `a level begins with less than a Peashooter costs (${before.sun})`)
  const square = { row: 2, column: 1 }

  const chosen = apply(before, { kind: 'choose', choice: 'peashooter' })
  const after = apply(chosen, { kind: 'place', square })

  assert.equal(plantsOn(after), 0, 'nothing is planted')
  assert.equal(after.sun, before.sun, 'and no Sun is spent on a plant I cannot afford')
  assert.equal(after.chosen, 'peashooter', 'the packet stays chosen, ready for when I can pay')
  assert.equal(after.seedBank[0]?.stepsUntilReady, 0, 'and it never started Recharging')
})

test('a level begins with a Lawn Mower at the left of every Row', () => {
  const state = initialGameState()

  for (let row = 0; row < BOARD_ROWS; row++) {
    assert.ok(
      hasLawnMower(state.occupants, { row, column: 0 }),
      `Row ${row} has no Lawn Mower at its left end`,
    )
  }
  assert.equal(hasLawnMower(state.occupants, { row: 0, column: 1 }), false, 'and nowhere else')
})

test('a Square holding a Lawn Mower refuses a plant, and costs me nothing', () => {
  const before = withSunToPlant(initialGameState())
  const square = { row: 2, column: 0 }
  const chosen = apply(before, { kind: 'choose', choice: 'peashooter' })

  const after = apply(chosen, { kind: 'place', square })

  assert.equal(plantsOn(after), 0, 'nothing is planted on top of a Lawn Mower')
  assert.ok(hasLawnMower(after.occupants, square), 'the Lawn Mower is still there')
  assert.equal(after.sun, before.sun, 'and no Sun is spent')
  assert.equal(after.chosen, 'peashooter', 'the packet stays chosen')
})

test('the Shovel clears a plant out of its Square and gives no Sun back', () => {
  const square = { row: 2, column: 1 }
  const planted = apply(
    apply(withSunToPlant(initialGameState()), { kind: 'choose', choice: 'peashooter' }),
    { kind: 'place', square },
  )

  const dug = apply(
    apply(planted, { kind: 'choose', choice: SHOVEL }),
    { kind: 'shovel', square },
  )

  assert.equal(plantIn(dug.occupants, square), undefined, 'the Square is bare lawn again')
  assert.equal(dug.sun, planted.sun, 'and the Shovel gives no Sun back')
  assert.equal(dug.chosen, null, 'the Shovel is put down afterwards, so the next click is a fresh one')
})

test('the Shovel will not clear a Lawn Mower', () => {
  const square = { row: 2, column: MOWER_COLUMN }
  const before = initialGameState()

  const after = apply(
    apply(before, { kind: 'choose', choice: SHOVEL }),
    { kind: 'shovel', square },
  )

  assert.ok(hasLawnMower(after.occupants, square), 'the Lawn Mower is still there')
})
