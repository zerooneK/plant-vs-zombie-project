import { BOARD_COLUMNS, BOARD_ROWS, isOnBoard, type Square } from '../game/board.ts'

/** The natural size of one Square, before any scaling. */
export const SQUARE_WIDTH = 80
export const SQUARE_HEIGHT = 96

/** The natural size of the whole board, before any scaling. */
export const LOGICAL_WIDTH = SQUARE_WIDTH * BOARD_COLUMNS
export const LOGICAL_HEIGHT = SQUARE_HEIGHT * BOARD_ROWS

export interface Viewport {
  readonly width: number
  readonly height: number
}

export interface BoardLayout {
  /** One number for the whole board, so the Squares never stretch. */
  readonly scale: number
  readonly offsetX: number
  readonly offsetY: number
  readonly width: number
  readonly height: number
  readonly cellWidth: number
  readonly cellHeight: number
}

export function layout(view: Viewport): BoardLayout {
  const scale = Math.min(view.width / LOGICAL_WIDTH, view.height / LOGICAL_HEIGHT)

  // The Square size is the source of truth, and the board is measured from
  // it, so the drawn grid and the hit test are always working from the same
  // numbers and cannot drift apart by even a fraction of a pixel.
  const cellWidth = SQUARE_WIDTH * scale
  const cellHeight = SQUARE_HEIGHT * scale
  const width = cellWidth * BOARD_COLUMNS
  const height = cellHeight * BOARD_ROWS

  return {
    scale,
    width,
    height,
    cellWidth,
    cellHeight,
    offsetX: (view.width - width) / 2,
    offsetY: (view.height - height) / 2,
  }
}

export interface Point {
  readonly x: number
  readonly y: number
}

/** The middle of a Square on screen, for drawing and for hit testing. */
export function centreOf(square: Square, board: BoardLayout): Point {
  return {
    x: board.offsetX + (square.column + 0.5) * board.cellWidth,
    y: board.offsetY + (square.row + 0.5) * board.cellHeight,
  }
}

/**
 * Which Square a click on the canvas lands on, or null when it lands on the
 * empty space around the board. Clicking the board is the only way a Square
 * becomes the selected one.
 */
export function squareAtPoint(point: Point, board: BoardLayout): Square | null {
  const square = {
    row: Math.floor((point.y - board.offsetY) / board.cellHeight),
    column: Math.floor((point.x - board.offsetX) / board.cellWidth),
  }

  return isOnBoard(square) ? square : null
}
