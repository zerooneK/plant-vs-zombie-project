import { everySquare } from '../game/board.ts'
import type { Square } from '../game/board.ts'
import { centreOf } from './layout.ts'
import type { BoardLayout, Viewport } from './layout.ts'

const BACKGROUND = '#22301f'
const LAWN_EVEN = '#7cb342'
const LAWN_ODD = '#689f38'
const SELECTED_FILL = 'rgba(255, 235, 59, 0.38)'
const SELECTED_EDGE = '#fdd835'

/**
 * Paints the lawn: five Rows crossed by nine Columns of mown stripes, with
 * the selected Square marked. Placeholder colours only - the real artwork is
 * ticket 20.
 */
export function drawBoard(
  context: CanvasRenderingContext2D,
  view: Viewport,
  board: BoardLayout,
  selected: Square | null,
): void {
  context.fillStyle = BACKGROUND
  context.fillRect(0, 0, view.width, view.height)

  for (const square of everySquare()) {
    context.fillStyle = (square.row + square.column) % 2 === 0 ? LAWN_EVEN : LAWN_ODD
    context.fillRect(
      board.offsetX + square.column * board.squareWidth,
      board.offsetY + square.row * board.squareHeight,
      board.squareWidth,
      board.squareHeight,
    )
  }

  if (selected === null) {
    return
  }

  const centre = centreOf(selected, board)
  const left = centre.x - board.squareWidth / 2
  const top = centre.y - board.squareHeight / 2

  context.fillStyle = SELECTED_FILL
  context.fillRect(left, top, board.squareWidth, board.squareHeight)

  context.strokeStyle = SELECTED_EDGE
  context.lineWidth = Math.max(2, 3 * board.scale)
  context.strokeRect(left, top, board.squareWidth, board.squareHeight)
}
