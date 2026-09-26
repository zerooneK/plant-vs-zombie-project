import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_CATCH_UP_STEPS, advanceClock, startClock } from '../src/game/clock.ts'

/** Play out one whole second of real time at a given frame rate. */
function stepsInOneSecond(framesPerSecond: number): number {
  let clock = startClock()

  for (let frame = 0; frame < framesPerSecond; frame++) {
    clock = advanceClock(clock, 1000 / framesPerSecond)
  }

  return clock.steps
}

test('a second of play is sixty steps, not fifty-nine', () => {
  assert.equal(stepsInOneSecond(20), 60)
  assert.equal(stepsInOneSecond(25), 60)
  assert.equal(stepsInOneSecond(50), 60)
  assert.equal(stepsInOneSecond(100), 60)
  assert.equal(stepsInOneSecond(200), 60)
})

test('a second of play is sixty steps however the time arrives', () => {
  // Uneven gaps, none big enough to trip the catch-up limit, adding up to
  // exactly one second.
  const ragged = [40, 22.5, 40, 22.5, 40, 22.5, 40, 22.5, 40, 22.5, 40, 22.5, 40, 22.5, 40, 22.5,
                  40, 22.5, 40, 22.5, 40, 22.5, 40, 22.5, 40, 22.5, 40, 22.5, 40, 22.5, 40, 22.5]
  assert.equal(
    ragged.reduce((total, gap) => total + gap, 0),
    1000,
    'the gaps should add up to exactly one second',
  )

  let clock = startClock()
  for (const gap of ragged) {
    clock = advanceClock(clock, gap)
  }

  assert.equal(clock.steps, 60)
})

test('time too small for a step is not lost', () => {
  const first = advanceClock(startClock(), 8)
  assert.equal(first.steps, 0, '8ms is not a whole 60th of a second')

  const second = advanceClock(first, 9)
  assert.equal(second.steps, 1, '8ms plus 9ms does make a whole step')
})

test('a long pause does not owe thousands of steps', () => {
  const after = advanceClock(startClock(), 30_000)

  assert.equal(after.steps, MAX_CATCH_UP_STEPS)
})

test('the game keeps its pace after a long pause', () => {
  const paused = advanceClock(startClock(), 30_000)
  const oneMoreFrame = advanceClock(paused, 1000 / 60)

  assert.equal(oneMoreFrame.steps, MAX_CATCH_UP_STEPS + 1)
})
