import { everySquare } from '../game/board.ts'
import type { Square } from '../game/board.ts'
import type { SunToken } from '../game/sun.ts'
import { SUN_RADIUS } from '../game/balance.ts'
import type { GameState } from '../game/sim.ts'
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
const PLANT_LEAF = '#2e7d32'
const PLANT_LEAF_EDGE = '#1b5e20'
const PLANT_FACE = '#66bb6a'
const MOWER_BODY = '#b0bec5'
const MOWER_EDGE = '#546e7a'
const MOWER_HANDLE = '#ef5350'

/**
 * A plant as a plain green head with a stalk, so that what is standing on the
 * lawn can be told apart from bare grass at a glance. The real artwork is
 * ticket 20; this is a shape, not a picture.
 */
function drawPlant(
  context: CanvasRenderingContext2D,
  square: Square,
  board: BoardLayout,
): void {
  const centre = centreOf(square, board)
  const head = board.squareWidth * 0.26

  context.fillStyle = PLANT_LEAF_EDGE
  context.fillRect(centre.x - head * 0.15, centre.y, head * 0.3, head * 2.1)

  context.fillStyle = PLANT_LEAF
  context.beginPath()
  context.arc(centre.x, centre.y, head, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = PLANT_FACE
  context.beginPath()
  context.arc(centre.x, centre.y, head * 0.55, 0, Math.PI * 2)
  context.fill()
}

/**
 * A Lawn Mower as a low grey box with a red handle, drawn at the left end of
 * its Row. It has to be recognisably not a plant, because the two are told apart
 * at a glance and a Row's mower is the last thing standing between a player and
 * Game Over.
 */
function drawLawnMower(
  context: CanvasRenderingContext2D,
  square: Square,
  board: BoardLayout,
): void {
  const centre = centreOf(square, board)
  const width = board.squareWidth * 0.62
  const height = board.squareHeight * 0.34

  context.fillStyle = MOWER_HANDLE
  context.fillRect(centre.x - width * 0.42, centre.y - height * 0.95, width * 0.12, height * 0.6)

  context.fillStyle = MOWER_BODY
  context.fillRect(centre.x - width / 2, centre.y - height / 2, width, height)

  context.strokeStyle = MOWER_EDGE
  context.lineWidth = Math.max(1, 2 * board.scale)
  context.strokeRect(centre.x - width / 2, centre.y - height / 2, width, height)
}

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
 * Paints the lawn: five Rows crossed by nine Columns of mown stripes, whatever
 * is standing in them, the selected Square marked, and the Sun lying on it.
 * Placeholder colours only - the real artwork is ticket 20.
 *
 * It is handed the whole game state rather than a list of the things it happens
 * to draw today. Every remaining ticket puts something new on the lawn, and a
 * growing parameter list would mean changing this signature, and its caller,
 * ten times over for no gain.
 */
export function drawBoard(
  context: CanvasRenderingContext2D,
  view: Viewport,
  board: BoardLayout,
  state: GameState,
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

  if (state.selected !== null) {
    const centre = centreOf(state.selected, board)
    const left = centre.x - board.squareWidth / 2
    const top = centre.y - board.squareHeight / 2

    context.fillStyle = SELECTED_FILL
    context.fillRect(left, top, board.squareWidth, board.squareHeight)

    context.strokeStyle = SELECTED_EDGE
    context.lineWidth = Math.max(2, 3 * board.scale)
    context.strokeRect(left, top, board.squareWidth, board.squareHeight)
  }

  for (const occupant of state.occupants) {
    if (occupant.kind === 'plant') {
      drawPlant(context, occupant.square, board)
    } else {
      drawLawnMower(context, occupant.square, board)
    }
  }

  for (const token of state.tokens) {
    drawSun(context, token, board)
  }
}
