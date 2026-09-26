import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BOARD_COLUMNS, BOARD_ROWS, everySquare, isOnBoard } from '../src/game/board.ts'
import { apply, initialGameState } from '../src/game/sim.ts'

test('the board is five Rows crossed by nine Columns', () => {
  assert.equal(BOARD_ROWS, 5)
  assert.equal(BOARD_COLUMNS, 9)
})

test('every one of the 45 Squares on the board can be selected', () => {
  const squares = everySquare()
  assert.equal(squares.length, 45)

  for (const square of squares) {
    const state = apply(initialGameState(), { kind: 'select', square })

    assert.deepEqual(state.selected, square)
  }
})

test('a Square just past the edge of the board is not on it', () => {
  assert.equal(isOnBoard({ row: 5, column: 0 }), false, 'one Row below')
  assert.equal(isOnBoard({ row: 0, column: 9 }), false, 'one Column right')
  assert.equal(isOnBoard({ row: -1, column: 0 }), false, 'one Row above')
  assert.equal(isOnBoard({ row: 0, column: -1 }), false, 'one Column left')
})
