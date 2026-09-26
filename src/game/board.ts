export const BOARD_ROWS = 5
export const BOARD_COLUMNS = 9

/** The size of one Square, in the board's own units, before the window scales it. */
export const SQUARE_WIDTH = 80

/** The size of one Square up and down, which is not the same as across. */
export const SQUARE_HEIGHT = 96

/** The size of the whole board in the board's own units, before scaling. */
export const LOGICAL_WIDTH = SQUARE_WIDTH * BOARD_COLUMNS
export const LOGICAL_HEIGHT = SQUARE_HEIGHT * BOARD_ROWS

export type Row = number
export type Column = number

export interface Square {
  readonly row: Row
  readonly column: Column
}

/**
 * A point on the board, measured in the board's own units.
 *
 * Sun tokens sit at points and are collected by clicking them, so the rules
 * need a point of their own. Measuring in the board's units rather than in
 * screen pixels is what lets the same Sun be drawn at any window size and
 * still be clicked at the same place.
 */
export interface Point {
  readonly x: number
  readonly y: number
}

export function isOnBoard(square: Square): boolean {
  return (
    square.row >= 0 &&
    square.row < BOARD_ROWS &&
    square.column >= 0 &&
    square.column < BOARD_COLUMNS
  )
}

export function everySquare(): Square[] {
  const squares: Square[] = []
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let column = 0; column < BOARD_COLUMNS; column++) {
      squares.push({ row, column })
    }
  }
  return squares
}
