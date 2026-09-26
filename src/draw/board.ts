import { everySquare } from '../game/board.ts'
import type { Square } from '../game/board.ts'
import type { SunToken } from '../game/sun.ts'
import { SUN_RADIUS } from '../game/balance.ts'
import { centreOf, place } from './layout.ts'
import type { BoardLayout, Viewport } from './layout.ts'

const BACKGROUND = '#22301f'
const LAWN_EVEN = '#7cb342'
const LAWN_ODD = '#689f38'
const SELECTED_FILL = 'rgba(255, 235, 59, 0.38)'
const SELECTED_EDGE = '#fdd835'
const SUN_RAYS = '#f9a825'
const SUN_FILL = '#fdd835'
const SUN_CORE = '#fff9c4'
const RAYS = 8

/**
 * One piece of Sun: a plain yellow disc with a pale centre and short rays.
 * Drawn from the place the rules gave it, scaled by the same number that
 * scales the board, so it is always exactly where the rules think it is.
 */
function drawSun(context: CanvasRenderingContext2D, token: SunToken, board: BoardLayout): void {
  const centre = place({ x: token.x, y: token.y }, board)
  const radius = SUN_RADIUS * board.scale

  context.fillStyle = SUN_RAYS
  for (let ray = 0; ray < RAYS; ray++) {
    const angle = (ray / RAYS) * Math.PI * 2
    context.beginPath()
    context.arc(centre.x, centre.y, radius * 1.2, angle - 0.2, angle + 0.2)
    context.fill()
  }

  context.fillStyle = SUN_FILL
  context.beginPath()
  context.arc(centre.x, centre.y, radius, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = SUN_CORE
  context.beginPath()
  context.arc(centre.x, centre.y, radius * 0.5, 0, Math.PI * 2)
  context.fill()
}

/**
 * Paints the lawn: five Rows crossed by nine Columns of mown stripes, the
 * selected Square marked, and the Sun lying on it. Placeholder colours only -
 * the real artwork is ticket 20.
 */
export function drawBoard(
  context: CanvasRenderingContext2D,
  view: Viewport,
  board: BoardLayout,
  selected: Square | null,
  tokens: readonly SunToken[],
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

  if (selected !== null) {
    const centre = centreOf(selected, board)
    const left = centre.x - board.squareWidth / 2
    const top = centre.y - board.squareHeight / 2

    context.fillStyle = SELECTED_FILL
    context.fillRect(left, top, board.squareWidth, board.squareHeight)

    context.strokeStyle = SELECTED_EDGE
    context.lineWidth = Math.max(2, 3 * board.scale)
    context.strokeRect(left, top, board.squareWidth, board.squareHeight)
  }

  for (const token of tokens) {
    drawSun(context, token, board)
  }
}
