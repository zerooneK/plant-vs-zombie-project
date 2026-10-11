import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SEED, initialGameState, apply } from '../src/game/sim.ts'
import {
  LEVELS,
  LEVEL_ORDER,
  LEVEL_1_1,
  LEVEL_1_2,
  LEVEL_1_3,
  LEVEL_1_4,
  LEVEL_1_5,
  LEVEL_1_6,
  LEVEL_1_7,
  LEVEL_1_8,
  LEVEL_1_9,
  LEVEL_1_10,
  nextLevel,
} from '../src/game/levels.ts'
import { untilTheLevelEnds } from './helpers.ts'
import { DEFENCE_FIRST, playLevel } from './plans.ts'

test('all ten levels 1-1 to 1-10 exist and are ordered sequentially', () => {
  const expectedOrder = [
    '1-1',
    '1-2',
    '1-3',
    '1-4',
    '1-5',
    '1-6',
    '1-7',
    '1-8',
    '1-9',
    '1-10',
  ]

  assert.deepEqual(LEVEL_ORDER, expectedOrder, 'LEVEL_ORDER contains all 10 levels in exact sequence')

  for (const name of expectedOrder) {
    assert.ok(name in LEVELS, `level ${name} is registered in LEVELS table`)
    assert.equal(LEVELS[name]?.name, name, `level ${name} name property matches its key`)
  }

  assert.equal(LEVELS['1-1'], LEVEL_1_1)
  assert.equal(LEVELS['1-2'], LEVEL_1_2)
  assert.equal(LEVELS['1-3'], LEVEL_1_3)
  assert.equal(LEVELS['1-4'], LEVEL_1_4)
  assert.equal(LEVELS['1-5'], LEVEL_1_5)
  assert.equal(LEVELS['1-6'], LEVEL_1_6)
  assert.equal(LEVELS['1-7'], LEVEL_1_7)
  assert.equal(LEVELS['1-8'], LEVEL_1_8)
  assert.equal(LEVELS['1-9'], LEVEL_1_9)
  assert.equal(LEVELS['1-10'], LEVEL_1_10)
})

test('plants expand sequentially by level up to all ten plants in 1-10', () => {
  const expectedPlantsByLevel: Record<string, string[]> = {
    '1-1': ['peashooter', 'sunflower'],
    '1-2': ['peashooter', 'sunflower', 'cherry-bomb'],
    '1-3': ['peashooter', 'sunflower', 'cherry-bomb', 'wall-nut'],
    '1-4': ['peashooter', 'sunflower', 'cherry-bomb', 'wall-nut', 'potato-mine'],
    '1-5': ['peashooter', 'sunflower', 'cherry-bomb', 'wall-nut', 'potato-mine', 'snow-pea'],
    '1-6': [
      'peashooter',
      'sunflower',
      'cherry-bomb',
      'wall-nut',
      'potato-mine',
      'snow-pea',
      'chomper',
    ],
    '1-7': [
      'peashooter',
      'sunflower',
      'cherry-bomb',
      'wall-nut',
      'potato-mine',
      'snow-pea',
      'chomper',
      'repeater',
    ],
    '1-8': [
      'peashooter',
      'sunflower',
      'cherry-bomb',
      'wall-nut',
      'potato-mine',
      'snow-pea',
      'chomper',
      'repeater',
      'puff-shroom',
    ],
    '1-9': [
      'peashooter',
      'sunflower',
      'cherry-bomb',
      'wall-nut',
      'potato-mine',
      'snow-pea',
      'chomper',
      'repeater',
      'puff-shroom',
      'tall-nut',
    ],
    '1-10': [
      'peashooter',
      'sunflower',
      'cherry-bomb',
      'wall-nut',
      'potato-mine',
      'snow-pea',
      'chomper',
      'repeater',
      'puff-shroom',
      'tall-nut',
    ],
  }

  for (const [levelName, expectedPlants] of Object.entries(expectedPlantsByLevel)) {
    const level = LEVELS[levelName]
    assert.ok(level, `level ${levelName} exists`)
    assert.deepEqual(
      level.plants,
      expectedPlants,
      `level ${levelName} offers the expected plant roster`,
    )
  }
})

test('zombies debut at their canonical levels and all five appear in 1-10', () => {
  function zombieNamesIn(levelName: string): Set<string> {
    const level = LEVELS[levelName]!
    const names = new Set<string>()
    for (const wave of level.waves) {
      for (const z of wave.zombies) {
        names.add(z.name)
      }
    }
    return names
  }

  assert.deepEqual([...zombieNamesIn('1-1')].sort(), ['basic', 'flag'])
  assert.deepEqual([...zombieNamesIn('1-2')].sort(), ['basic', 'flag'])

  assert.ok(!zombieNamesIn('1-1').has('conehead'))
  assert.ok(!zombieNamesIn('1-2').has('conehead'))
  assert.ok(zombieNamesIn('1-3').has('conehead'))

  for (const name of ['1-1', '1-2', '1-3', '1-4', '1-5']) {
    assert.ok(!zombieNamesIn(name).has('pole-vaulting'), `${name} should not have pole-vaulting`)
  }
  assert.ok(zombieNamesIn('1-6').has('pole-vaulting'))

  for (const name of ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7']) {
    assert.ok(!zombieNamesIn(name).has('buckethead'), `${name} should not have buckethead`)
  }
  assert.ok(zombieNamesIn('1-8').has('buckethead'))

  const finalRoster = [...zombieNamesIn('1-10')].sort()
  assert.deepEqual(
    finalRoster,
    ['basic', 'buckethead', 'conehead', 'flag', 'pole-vaulting'],
    '1-10 has all 5 zombies',
  )
})

test('every level schedule has valid timings, valid rows, and exactly one Flag Wave', () => {
  for (const levelName of LEVEL_ORDER) {
    const level = LEVELS[levelName]!
    assert.ok(level.waves.length >= 5, `${levelName} has at least 5 waves`)
    assert.ok(level.waves[0]!.atStep >= 20 * 60, `${levelName} first wave starts after at least 20s`)

    let previousStep = 0
    for (const [index, wave] of level.waves.entries()) {
      assert.ok(
        wave.atStep >= previousStep,
        `${levelName} wave ${index} timing (${wave.atStep}) is >= previous step (${previousStep})`,
      )
      previousStep = wave.atStep

      assert.ok(wave.zombies.length > 0, `${levelName} wave ${index} has zombies`)
      for (const z of wave.zombies) {
        assert.ok(z.row >= 0 && z.row <= 4, `${levelName} wave ${index} has row between 0 and 4`)
      }

      if (index === level.waves.length - 1) {
        assert.equal(wave.flagWave, true, `${levelName} last wave is marked as flagWave`)
        assert.ok(
          wave.zombies.some((z) => z.name === 'flag'),
          `${levelName} last wave contains at least one flag zombie`,
        )
      } else {
        assert.equal(
          wave.flagWave,
          undefined,
          `${levelName} wave ${index} before last wave is not marked as flagWave`,
        )
      }
    }
  }
})

test('a player who does nothing loses every level from 1-1 to 1-10', () => {
  for (const levelName of LEVEL_ORDER) {
    const level = LEVELS[levelName]!
    const lost = untilTheLevelEnds(
      initialGameState(DEFAULT_SEED, level),
      `a player who planted nothing in level ${levelName} was never breached`,
    )
    assert.equal(lost.outcome, 'lost', `doing nothing loses level ${levelName}`)
  }
})

test('nextLevel advances through levels sequentially and terminates at null', () => {
  for (let i = 0; i < LEVEL_ORDER.length - 1; i++) {
    const currentName = LEVEL_ORDER[i]!
    const nextExpected = LEVELS[LEVEL_ORDER[i + 1]!]!
    assert.equal(nextLevel(currentName), nextExpected)
  }
  assert.equal(nextLevel('1-10'), null, 'beating Level 1-10 has no next level')
  assert.equal(nextLevel('test-bed'), null, 'test bed has no next level')
  assert.equal(nextLevel('unknown'), null, 'unknown level name has no next level')
})

test('Level 1-2 can be played through to a win with the defence plan', () => {
  const won = playLevel(DEFENCE_FIRST, initialGameState(DEFAULT_SEED, LEVEL_1_2))
  assert.equal(won.pendingWaves.length, 0, "Level 1-2's last wave has arrived")
  assert.equal(won.zombies.length, 0, 'all zombies in Level 1-2 are defeated')
  assert.equal(won.outcome, 'won', 'Level 1-2 is won')
})

test('initialGameState accurately prepares the seed bank for each level', () => {
  for (const levelName of LEVEL_ORDER) {
    const level = LEVELS[levelName]!
    const state = initialGameState(DEFAULT_SEED, level)
    assert.equal(
      state.seedBank.length,
      level.plants.length,
      `${levelName} seedBank length matches level plants`,
    )
    assert.deepEqual(
      state.seedBank.map((packet) => packet.name),
      level.plants,
      `${levelName} seedBank matches level plant names in order`,
    )
    for (const packet of state.seedBank) {
      assert.equal(packet.stepsUntilReady, 0, `${packet.name} starts ready`)
      assert.ok(packet.cost >= 0, `${packet.name} has non-negative cost`)
    }
    assert.equal(state.outcome, 'playing')
    assert.equal(state.pendingWaves.length, level.waves.length)
  }
})

test('Level 1-10 advances waves and brings the zombie roster onto the lawn', () => {
  let state = initialGameState(DEFAULT_SEED, LEVEL_1_10)
  const zombiesSeen = new Set<string>()

  for (let step = 0; step < 86 * 60; step++) {
    state = apply(state, { kind: 'advance' })
    for (const zombie of state.zombies) {
      zombiesSeen.add(zombie.name)
    }
  }

  assert.ok(zombiesSeen.has('basic'), 'Level 1-10 has basic zombies on the lawn')
  assert.ok(zombiesSeen.has('conehead'), 'Level 1-10 has Conehead Zombies on the lawn')
  assert.ok(zombiesSeen.has('pole-vaulting'), 'Level 1-10 has Pole Vaulting Zombies on the lawn')
  assert.ok(zombiesSeen.has('buckethead'), 'Level 1-10 has Buckethead Zombies on the lawn')

  const lastWave = LEVEL_1_10.waves[LEVEL_1_10.waves.length - 1]!
  assert.equal(lastWave.flagWave, true, 'Level 1-10 ends in a Flag Wave')
  assert.ok(lastWave.zombies.some((z) => z.name === 'flag'), 'Flag Wave has a Flag Zombie')
})
