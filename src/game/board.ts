export const BOARD_ROWS = 5
export const BOARD_COLUMNS = 9

export type Row = number
export type Column = number

export interface Square {
  readonly row: Row
  readonly column: Column
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
