import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  everySquare,
} from '../src/game/board.ts'
import {
  centreOf,
  layout,
  place,
  pointOnBoard,
  squareAtPoint,
} from '../src/draw/layout.ts'

const WIDE = { width: 1600, height: 400 }

const SHAPE = LOGICAL_WIDTH / LOGICAL_HEIGHT
const CLOSE_ENOUGH = 1e-9

test('the board keeps its shape in a window wider than it is tall', () => {
  const board = layout({ width: 1600, height: 400 })

  assert.ok(
    Math.abs(board.width / board.height - SHAPE) < CLOSE_ENOUGH,
    `drew ${board.width}x${board.height}, expected the shape ${SHAPE}`,
  )
})

test('the board keeps its shape in a window taller than it is wide', () => {
  const board = layout({ width: 400, height: 1600 })

  assert.ok(
    Math.abs(board.width / board.height - SHAPE) < CLOSE_ENOUGH,
    `drew ${board.width}x${board.height}, expected the shape ${SHAPE}`,
  )
})

test('the board is drawn at its natural size when the window matches it', () => {
  const board = layout({ width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT })

  assert.equal(board.scale, 1)
  assert.equal(board.width, LOGICAL_WIDTH)
  assert.equal(board.height, LOGICAL_HEIGHT)
})

test('the board sits centred in the window', () => {
  const board = layout({ width: 1600, height: 400 })

  const gapLeft = board.offsetX
  const gapRight = 1600 - board.offsetX - board.width
  const gapTop = board.offsetY
  const gapBottom = 400 - board.offsetY - board.height

  assert.ok(Math.abs(gapLeft - gapRight) < CLOSE_ENOUGH, 'left and right gaps differ')
  assert.ok(Math.abs(gapTop - gapBottom) < CLOSE_ENOUGH, 'top and bottom gaps differ')
})

test('the board is exactly as wide and tall as its Squares need', () => {
  const board = layout({ width: 1000, height: 1000 })

  assert.equal(board.squareWidth * BOARD_COLUMNS, board.width)
  assert.equal(board.squareHeight * BOARD_ROWS, board.height)
})

test('every Square maps back to itself from the middle of what is drawn', () => {
  const board = layout(WIDE)

  for (const square of everySquare()) {
    assert.deepEqual(
      squareAtPoint(centreOf(square, board), board),
      square,
      `the middle of Row ${square.row}, Column ${square.column} was read as something else`,
    )
  }
})

test('a click on the empty space beside the board selects nothing', () => {
  const board = layout(WIDE)

  assert.equal(squareAtPoint({ x: 1, y: 1 }, board), null, 'top left of the window')
  assert.equal(squareAtPoint({ x: 1599, y: 399 }, board), null, 'bottom right of the window')
  assert.equal(
    squareAtPoint({ x: board.offsetX + board.width + 1, y: board.offsetY + 10 }, board),
    null,
    'one pixel past the right edge of the board',
  )
})

test('either side of a boundary between two Columns reads as the Column clicked', () => {
  const board = layout(WIDE)
  const boundary = board.offsetX + board.squareWidth * 2
  const y = board.offsetY + board.squareHeight * 3 + 1

  assert.deepEqual(squareAtPoint({ x: boundary - 1, y }, board), { row: 3, column: 1 })
  assert.deepEqual(squareAtPoint({ x: boundary + 1, y }, board), { row: 3, column: 2 })
})

test('a place on the lawn is the same place whatever size the window is', () => {
  const small = layout({ width: 800, height: 480 })
  const large = layout({ width: 1600, height: 960 })
  const onTheLawn = { x: 321, y: 210 }

  const here = pointOnBoard(place(onTheLawn, small), small)
  const there = pointOnBoard(place(onTheLawn, large), large)

  assert.ok(Math.abs(here.x - there.x) < CLOSE_ENOUGH, 'across differs between window sizes')
  assert.ok(Math.abs(here.y - there.y) < CLOSE_ENOUGH, 'down differs between window sizes')
  assert.ok(Math.abs(here.x - onTheLawn.x) < CLOSE_ENOUGH, 'a click comes back where it went')
  assert.ok(Math.abs(here.y - onTheLawn.y) < CLOSE_ENOUGH, 'a click comes back where it went')
})

test('a Sun token drawn at a place is read back at that same place', () => {
  const board = layout(WIDE)

  for (const onTheLawn of [
    { x: 0, y: 0 },
    { x: LOGICAL_WIDTH, y: LOGICAL_HEIGHT },
    { x: LOGICAL_WIDTH / 2, y: LOGICAL_HEIGHT / 3 },
  ]) {
    const read = pointOnBoard(place(onTheLawn, board), board)

    assert.ok(Math.abs(read.x - onTheLawn.x) < CLOSE_ENOUGH, `across for ${onTheLawn.x}`)
    assert.ok(Math.abs(read.y - onTheLawn.y) < CLOSE_ENOUGH, `down for ${onTheLawn.y}`)
  }
})
