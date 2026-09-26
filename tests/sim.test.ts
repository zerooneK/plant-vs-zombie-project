import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apply, initialGameState } from '../src/game/sim.ts'

test('selecting a Square marks it', () => {
  const before = initialGameState()

  const after = apply(before, { kind: 'select', square: { row: 2, column: 4 } })

  assert.deepEqual(after.selected, { row: 2, column: 4 })
})

test('selecting off the board clears the mark', () => {
  const marked = apply(initialGameState(), {
    kind: 'select',
    square: { row: 2, column: 4 },
  })

  const after = apply(marked, { kind: 'select', square: null })

  assert.equal(after.selected, null)
})

test('advancing the rules and selecting a Square do not affect each other', () => {
  const start = initialGameState()
  assert.equal(start.tick, 0)

  const selected = apply(start, { kind: 'select', square: { row: 0, column: 0 } })
  assert.equal(selected.tick, 0, 'selecting must not move the clock')

  const advanced = apply(selected, { kind: 'advance' })
  assert.equal(advanced.tick, 1, 'advancing must move the clock on')
  assert.deepEqual(
    advanced.selected,
    { row: 0, column: 0 },
    'advancing must not change the selection',
  )
})
