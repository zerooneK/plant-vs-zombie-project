import type { PlantName } from './plants.ts'

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

/**
 * The Column a Row's Lawn Mower stands in.
 *
 * In the original the mower sits on its own strip to the left of the lawn,
 * which is not one of the nine plantable Columns. This board has no such strip,
 * so the mower stands in the first Column instead. That is a deliberate
 * difference from the original, and it is a visible one: the first Column of
 * every Row cannot be planted, so the lawn is eight Columns wide to plant.
 */
export const MOWER_COLUMN = 0

/**
 * Anything standing in a Square.
 *
 * A Square holds one thing, whatever that thing is. Asking what occupies a
 * Square is therefore one question with one answer, whether the answer is a
 * plant, a Lawn Mower or nothing - and it is the question the rules ask before
 * they charge anyone for a plant.
 */
export type Occupant = Planted | LawnMower

/** A Lawn Mower standing at the left of one Row. */
export interface LawnMower {
  readonly kind: 'lawnMower'
  readonly square: Square
}

/**
 * A plant standing in one Square.
 */
export interface Planted {
  readonly kind: 'plant'
  readonly square: Square
  readonly name: PlantName
}

/** The lawn as it stands: a mower for every Row, and nothing planted yet. */
export function startingOccupants(): readonly Occupant[] {
  const occupants: Occupant[] = []
  for (let row = 0; row < BOARD_ROWS; row++) {
    occupants.push({ kind: 'lawnMower', square: { row, column: MOWER_COLUMN } })
  }
  return occupants
}

/** Whatever is in a Square, or null when it is bare lawn. */
export function occupantAt(occupants: readonly Occupant[], square: Square): Occupant | null {
  const found = occupants.find(
    (occupant) => occupant.square.row === square.row && occupant.square.column === square.column,
  )
  return found ?? null
}

/** The plant in a Square, or undefined when there is none. */
export function plantIn(occupants: readonly Occupant[], square: Square): Planted | undefined {
  const occupant = occupantAt(occupants, square)
  return occupant !== null && occupant.kind === 'plant' ? occupant : undefined
}

/** Is a Lawn Mower standing in this Square? */
export function hasLawnMower(occupants: readonly Occupant[], square: Square): boolean {
  const occupant = occupantAt(occupants, square)
  return occupant !== null && occupant.kind === 'lawnMower'
}
