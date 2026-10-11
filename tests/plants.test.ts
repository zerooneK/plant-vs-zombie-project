import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createPlanted,
  resolveInstantPlantActions,
  resolveContactPlantActions,
  producePlantSun,
} from '../src/game/plants.ts'
import { zombieAtEdge } from '../src/game/zombies.ts'
import { BOARD_COLUMNS, type Square } from '../src/game/board.ts'
import { ZOMBIE_STEPS_PER_COLUMN } from '../src/game/balance.ts'

function stepsToReach(square: Square): number {
  const columnsToWalk = BOARD_COLUMNS - 1 - square.column
  return columnsToWalk * ZOMBIE_STEPS_PER_COLUMN + ZOMBIE_STEPS_PER_COLUMN / 2
}

test('createPlanted creates a plant whole with correct health and job countdowns', () => {
  const square: Square = { row: 1, column: 2 }
  const peashooter = createPlanted('peashooter', square)
  assert.equal(peashooter.name, 'peashooter')
  assert.equal(peashooter.square.row, 1)
  assert.equal(peashooter.square.column, 2)
  assert.equal(peashooter.health, 300)
  assert.equal(peashooter.stepsUntilShot, 0)
  assert.equal(peashooter.stepsUntilArmed, 0)
  assert.equal(peashooter.stepsUntilChewed, 0)

  const potato = createPlanted('potato-mine', square)
  assert.equal(potato.stepsUntilArmed, 900, 'starts with 15 seconds of arming delay')

  const sunflower = createPlanted('sunflower', square)
  assert.equal(sunflower.stepsUntilSun, 1080, 'starts with 18 seconds produce interval')

  const chomper = createPlanted('chomper', square)
  assert.equal(chomper.stepsUntilChewed, 0, 'starts ready to devour')
})

test('resolveInstantPlantActions detonates a Cherry Bomb and removes nearby zombies', () => {
  const square: Square = { row: 1, column: 1 }
  const bomb = createPlanted('cherry-bomb', square)
  const zombie = {
    ...zombieAtEdge(1, 'basic', 1, 200, 0),
    walked: stepsToReach(square),
  }

  const result = resolveInstantPlantActions([zombie], [bomb])
  assert.equal(result.zombies.length, 0, 'zombie in blast radius is removed')
  assert.equal(result.occupants.length, 0, 'Cherry Bomb is spent after detonating')
})

test('resolveContactPlantActions detonates an armed mine and devours with ready Chomper', () => {
  const mineSquare: Square = { row: 0, column: 1 }
  const armedMine = {
    ...createPlanted('potato-mine', mineSquare),
    stepsUntilArmed: 0,
  }

  const zombie = {
    ...zombieAtEdge(1, 'basic', 0, 200, 0),
    walked: stepsToReach(mineSquare),
  }

  const result = resolveContactPlantActions([zombie], [armedMine])
  assert.equal(result.zombies.length, 0, 'zombie is removed by armed mine')
  assert.equal(result.occupants.length, 0, 'mine is spent')
})

test('producePlantSun generates a Sun token when production countdown expires', () => {
  const square: Square = { row: 2, column: 3 }
  const readySunflower = {
    ...createPlanted('sunflower', square),
    stepsUntilSun: 1,
  }

  const result = producePlantSun([readySunflower], 10)
  assert.equal(result.tokens.length, 1, 'emits one Sun token')
  assert.equal(result.tokens[0]!.id, 10)
  assert.equal(result.tokens[0]!.amount, 25)
  assert.equal(result.nextId, 11)
  assert.equal(
    (result.occupants[0] as typeof readySunflower).stepsUntilSun,
    1080,
    'resets production interval',
  )
})

