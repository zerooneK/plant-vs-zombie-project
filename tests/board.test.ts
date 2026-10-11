import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BOARD_COLUMNS, BOARD_ROWS, everySquare, isOnBoard, isPlantable } from '../src/game/board.ts'
import { apply, initialGameState } from '../src/game/sim.ts'

test('the board is five Rows crossed by ten Columns: the mower Column and nine to plant in', () => {
  assert.equal(BOARD_ROWS, 5)
  assert.equal(BOARD_COLUMNS, 10)
})

test('every one of the 50 Squares on the board can be selected', () => {
  const squares = everySquare()
  assert.equal(squares.length, 50)

  for (const square of squares) {
    const state = apply(initialGameState(), { kind: 'select', square })

    assert.deepEqual(state.selected, square)
  }
})

test('a Square just past the edge of the board is not on it', () => {
  assert.equal(isOnBoard({ row: 5, column: 0 }), false, 'one Row below')
  assert.equal(isOnBoard({ row: 0, column: 10 }), false, 'one Column right')
  assert.equal(isOnBoard({ row: -1, column: 0 }), false, 'one Row above')
  assert.equal(isOnBoard({ row: 0, column: -1 }), false, 'one Column left')
})

test('the first Column is the mower strip, and every Square but those takes a plant', () => {
  const strip = everySquare().filter((square) => !isPlantable(square))
  assert.equal(strip.length, 5, 'one Square in each of the five Rows refuses a plant')
  assert.ok(
    strip.every((square) => square.column === 0),
    'and they are the first Column, where the mowers stand',
  )
  assert.equal(everySquare().filter(isPlantable).length, 45, 'which leaves nine Columns of five Rows to plant in')
})
