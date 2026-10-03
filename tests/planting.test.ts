import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SHOVEL, apply, initialGameState } from '../src/game/sim.ts'
import type { GameState } from '../src/game/sim.ts'
import { BOARD_ROWS, MOWER_COLUMN, hasLawnMower, plantIn } from '../src/game/board.ts'
import { LEVEL_TEST } from '../src/game/levels.ts'
import type { PlantName } from '../src/game/plants.ts'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'
import { PEA_COST, withSunToPlant } from './helpers.ts'

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

test('the Seed Bank shows the plants this level allows, and what each one costs', () => {
  const bank = initialGameState().seedBank

  assert.equal(bank.length, 2, 'the first level allows a Peashooter and a Sunflower')

  const peashooter = bank.find((packet) => packet.name === 'peashooter')
  assert.ok(peashooter, 'the Seed Bank has a Peashooter in it')
  assert.equal(peashooter.cost, PEA_COST, 'a Peashooter costs 100 Sun')

  const sunflower = bank.find((packet) => packet.name === 'sunflower')
  assert.ok(sunflower, 'the Seed Bank has a Sunflower in it')
  assert.equal(sunflower.cost, 50, 'a Sunflower costs 50 Sun, which is what a level begins with')

  assert.ok(
    bank.every((packet) => packet.stepsUntilReady === 0),
    'a packet you have not used yet is ready to choose',
  )
})

/**
 * What every plant in the game costs to plant, written out here rather than read
 * from the rules.
 *
 * The point of a check is to catch the number being wrong, so the numbers have to
 * be stated in the check. Reading them from `balance.ts` would pass whatever that
 * file happened to say - which is how two of the Sunflower's three numbers went
 * unchecked until ticket 11.
 *
 * Every plant, and this is the one place the whole list is written. The list used to
 * be split between `shooters.test.ts` and `wall-nut.test.ts`, each holding the plants it
 * had an opinion about, so every plant's cost was written down twice and a change to a cost
 * was a change in two files - a thing to be sorry about rather than a thing that had
 * actually gone wrong. One list, here, in the file that already owns what the Seed Bank
 * shows, and the `Record<PlantName, number>` is what turns a new plant into a compiler error
 * in this file rather than something to remember.
 *
 * The nuts' own check said the test bed was the only Level offering either of them, and
 * that the two had to cost the same, and is gone: it is this check, one plant at a time.
 * A per-file claim about one plant's place in the Seed Bank is worth having when nothing
 * else says it, and by ticket 13 something else did.
 */
const COSTS: Record<PlantName, number> = {
  peashooter: 100,
  'snow-pea': 175,
  repeater: 200,
  'puff-shroom': 0,
  sunflower: 50,
  'wall-nut': 50,
  'tall-nut': 50,
  'potato-mine': 25,
  'cherry-bomb': 150,
  chomper: 150,
}

/**
 * The test bed's Seed Bank is the whole roster, and each packet shows what it costs.
 *
 * Two claims in one check because they are one claim. The test bed is the only
 * Level that offers most of these plants, so a plant missing from it is a plant no
 * player can ever reach - and a Seed Bank that had quietly lost one would let every
 * other check in the project pass, because each of them builds the Level it needs
 * for itself. So what the bank contains, what order it is in, and what each packet
 * charges are all things a person would notice going wrong, and all three are held
 * here.
 *
 * The order is held too, because it is something a player reads. Four shooters
 * together - the three variants beside the Peashooter they are variations of, so
 * the question a player is actually asking, *which of these four do I want in this
 * Row*, is answered by looking along one shelf - then the plant that makes Sun,
 * then the two blocks, then the three that deal with Zombies directly. Nothing in
 * the rules depends on the order, so this check is the only place it is decided,
 * which is the point of deciding it here rather than in the level.
 *
 * The last three are the three plants that remove a Zombie rather than damaging
 * one, and they are the three that are not shooters even though they answer a
 * Zombie's approach the way a shooter does. Within them the order is a *when*, and
 * it is the question a player asking *which of these three do I want* is really
 * asking: the Potato Mine is put down before the Zombies arrive, the Cherry Bomb
 * after they have, and the Chomper at any moment at all - because it eats the first
 * one that reaches it and then cannot eat for forty-two seconds. Two of them cost
 * exactly the same 150 Sun, so a player holding the two packets cannot tell them
 * apart by price, and this order is the only thing that says which is which.
 */
test('the test bed offers every plant the game has, in a readable order, at its own cost', () => {
  const bed = initialGameState(1, LEVEL_TEST).seedBank

  assert.deepEqual(
    bed.map((packet) => packet.name),
    [
      'peashooter',
      'snow-pea',
      'repeater',
      'puff-shroom',
      'sunflower',
      'wall-nut',
      'tall-nut',
      'potato-mine',
      'cherry-bomb',
      'chomper',
    ],
    'the test bed offers every plant there is: four shooters, the Sun maker, the two nuts, and the three that take a Zombie off the lawn whole',
  )

  for (const [name, cost] of Object.entries(COSTS)) {
    assert.equal(
      bed.find((packet) => packet.name === name)?.cost,
      cost,
      `a ${name} packet for ${cost} Sun`,
    )
  }

  // And Level 1-1 is left as it was, which is the whole reason the test bed exists:
  // adding a third packet to the first level would have changed what that level asks
  // of a player, and the balance pass is meant to measure it as it is rather than as
  // it would be with a Potato Mine in the bank.
  assert.deepEqual(
    initialGameState(1).seedBank.map((packet) => packet.name),
    ['peashooter', 'sunflower'],
    'while Level 1-1 still offers a Peashooter and a Sunflower and nothing else',
  )
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
