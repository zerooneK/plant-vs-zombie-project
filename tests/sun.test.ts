import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, SQUARE_HEIGHT } from '../src/game/board.ts'
import { apply, initialGameState } from '../src/game/sim.ts'
import type { GameState } from '../src/game/sim.ts'
import type { SunToken } from '../src/game/sun.ts'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'

/** Plays the game forward by running the one step command over and over. */
function afterSeconds(state: GameState, seconds: number): GameState {
  let current = state
  for (let step = 0; step < seconds * STEPS_PER_SECOND; step++) {
    current = apply(current, { kind: 'advance' })
  }
  return current
}

/** The Sun on the lawn, insisting there is some. */
function firstSun(state: GameState): SunToken {
  const token = state.tokens[0]
  assert.ok(token, 'expected a Sun token on the lawn')
  return token
}

/** Plays on until Sun falls, or gives up and fails the check. */
function untilSunFalls(state: GameState): GameState {
  let current = state
  for (let step = 0; step < 30 * STEPS_PER_SECOND; step++) {
    if (current.tokens.length > 0) {
      return current
    }
    current = apply(current, { kind: 'advance' })
  }
  assert.fail('no Sun fell from the sky within thirty seconds')
}

test('no Sun has fallen at the moment a level begins', () => {
  assert.deepEqual(initialGameState().tokens, [], 'the lawn starts bare')
  assert.equal(initialGameState().sun, 50, 'a level begins holding the original 50 Sun')
})

test('the same play from the same seed always plays out the same way', () => {
  const first = afterSeconds(initialGameState(4242), 25)
  const again = afterSeconds(initialGameState(4242), 25)

  assert.deepEqual(again.tokens, first.tokens, 'the same Sun in the same places')
  assert.equal(again.sun, first.sun, 'and the same Sun in hand')
})

test('a different seed falls Sun in different places', () => {
  const one = afterSeconds(initialGameState(1), 20).tokens
  const other = afterSeconds(initialGameState(2), 20).tokens

  assert.notDeepEqual(other, one, 'the seed decides where Sun lands, not a fixed board')
})

test('clicking a Sun token puts it in the Sun I am holding', () => {
  const before = afterSeconds(initialGameState(), 10)
  const token = firstSun(before)

  const after = apply(before, { kind: 'collect', point: { x: token.x, y: token.y } })

  assert.equal(after.sun, before.sun + 25, 'a piece of Sun is worth 25')
  assert.equal(after.tokens.length, before.tokens.length - 1, 'the Sun leaves the lawn')
})

test('Sun can be clicked as soon as it has fallen', () => {
  const before = untilSunFalls(initialGameState())
  const token = firstSun(before)

  const after = apply(before, { kind: 'collect', point: { x: token.x, y: token.y } })

  assert.equal(after.tokens.length, 0, 'the Sun is taken off the lawn')
  assert.equal(after.sun, before.sun + 25)
})

test('clicking bare lawn collects no Sun and takes none away', () => {
  const before = afterSeconds(initialGameState(), 10)

  const after = apply(before, { kind: 'collect', point: { x: -100, y: -100 } })

  assert.equal(after.sun, before.sun, 'a click on the lawn adds no Sun')
  assert.equal(after.tokens.length, before.tokens.length, 'and takes no Sun away')
})

test('Sun that is not collected is lost', () => {
  const held = initialGameState().sun
  let state = initialGameState()
  let ignored = -1
  let gone = false

  for (let step = 0; step < 30 * STEPS_PER_SECOND; step++) {
    state = apply(state, { kind: 'advance' })
    assert.equal(state.sun, held, 'Sun I never clicked must never be added to what I hold')

    // Follow the first piece of Sun that falls, and watch what becomes of it.
    if (ignored === -1 && state.tokens.length > 0) {
      ignored = firstSun(state).id
    } else if (ignored !== -1 && !state.tokens.some((token) => token.id === ignored)) {
      gone = true
    }
  }

  assert.notEqual(ignored, -1, 'Sun did fall during those thirty seconds')
  assert.equal(gone, true, 'the Sun I ignored was taken off the lawn')
})

test('Sun falls from the sky on a timer', () => {
  const seen = new Set<number>()
  let state = initialGameState()

  for (let step = 0; step < 30 * STEPS_PER_SECOND; step++) {
    state = apply(state, { kind: 'advance' })
    for (const token of state.tokens) {
      seen.add(token.id)
    }
  }

  assert.ok(seen.size >= 2, `Sun kept falling on a timer: ${seen.size} pieces in thirty seconds`)
})

test('Sun falls at a place inside the board', () => {
  const state = afterSeconds(initialGameState(), 20)
  assert.ok(state.tokens.length > 0, 'there is Sun to look at')

  for (const token of state.tokens) {
    assert.ok(token.x > 0 && token.x < LOGICAL_WIDTH, 'inside the board, left to right')
    assert.ok(token.y > 0 && token.y < LOGICAL_HEIGHT, 'inside the board, top to bottom')
  }
})

test('Sun comes down onto the lawn rather than appearing where it will lie', () => {
  for (const seed of [1, 2, 3, 7, 11, 99, 4242]) {
    const appeared = untilSunFalls(initialGameState(seed))
    const { id, y: top } = firstSun(appeared)
    let lowest = top
    let state = appeared

    for (let step = 0; step < 20 * STEPS_PER_SECOND; step++) {
      state = apply(state, { kind: 'advance' })
      for (const token of state.tokens) {
        if (token.id === id) {
          lowest = Math.max(lowest, token.y)
        }
      }
    }

    assert.ok(
      lowest - top >= SQUARE_HEIGHT,
      `seed ${seed}: Sun came down ${(lowest - top).toFixed(0)}, less than one Row`,
    )
  }
})
