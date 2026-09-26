import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_CATCH_UP_STEPS,
  STEPS_PER_SECOND,
  advanceClock,
  advanceFrames,
  startClock,
  type Clock,
} from '../src/game/clock.ts'


/**
 * Plays out real time through the game loop, a frame at a time, the way the
 * browser does, and returns the clock it arrives at.
 */
function playFor(seconds: number, framesPerSecond: number): Clock {
  let clock = startClock()
  let previous = 0
  const frames = Math.round(seconds * framesPerSecond)

  for (let frame = 1; frame <= frames; frame++) {
    const advanced = advanceFrames(clock, previous, (frame * 1000) / framesPerSecond)
    clock = advanced.clock
    previous = advanced.previous
  }

  return clock
}

/** Steps played after so many seconds of real time at a given frame rate. */
function stepsAfter(seconds: number, framesPerSecond: number): number {
  return playFor(seconds, framesPerSecond).steps
}

test('ten seconds of play is ten seconds of play at any frame rate', () => {
  for (const framesPerSecond of [30, 60, 75, 120, 144, 240]) {
    assert.equal(
      stepsAfter(10, framesPerSecond),
      10 * STEPS_PER_SECOND,
      `${framesPerSecond} frames a second`,
    )
  }
})

test('a fast machine is not an easier machine', () => {
  // The same ten seconds of play, watched at two very different frame rates,
  // has to arrive at the same place. Measuring elapsed time from the start of
  // the game instead of from the last frame broke exactly this.
  assert.equal(stepsAfter(30, 60), stepsAfter(30, 144))
  assert.equal(stepsAfter(30, 30), stepsAfter(30, 240))
})

test('a frame is measured from the frame before it', () => {
  // One frame's worth of time, offered twice, is still one frame's worth.
  const first = advanceFrames(startClock(), 0, 16)

  assert.equal(first.previous, 16, 'the next frame measures from this one, not from zero')
  assert.equal(first.steps, 0, '16ms is not yet a whole step')

  const second = advanceFrames(first.clock, first.previous, 32)
  assert.equal(second.steps, 1, 'two frames of 16ms together are one whole step')
})

test('a frame that arrives late is still measured from the frame before it', () => {
  // A long gap is deliberately capped, so the game falls behind rather than
  // freezing - but the cap must not be paid out again on every later frame.
  const late = advanceFrames(startClock(), 0, 1000)

  assert.equal(late.clock.steps, MAX_CATCH_UP_STEPS, 'a very late frame is capped')
  assert.equal(late.previous, 1000, 'the next frame measures from the late one, not from zero')

  let clock = late.clock
  let previous = late.previous
  for (let frame = 1001; frame <= 1060; frame++) {
    const advanced = advanceFrames(clock, previous, frame)
    clock = advanced.clock
    previous = advanced.previous
  }

  assert.equal(
    clock.steps - late.clock.steps,
    3,
    'sixty more milliseconds of frames play three steps, not the whole capped second again',
  )
})

/** Play out one whole second of real time at a given frame rate. */
function stepsInOneSecond(framesPerSecond: number): number {
  return stepsAfter(1, framesPerSecond)
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
