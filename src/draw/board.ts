import { BOARD_ROWS, MOWER_COLUMN, everySquare, hasLawnMower } from '../game/board.ts'
import type { Square } from '../game/board.ts'
import { plantBeingEaten } from '../game/zombies.ts'
import type { GameState } from '../game/sim.ts'
import { centreOf } from './layout.ts'
import type { BoardLayout, Viewport } from './layout.ts'
import { drawPlantArt } from './art/plants.ts'
import { drawZombieArt } from './art/zombies.ts'
import { drawLawnMowerArt, drawSpentMowerArt } from './art/mowers.ts'
import { drawSunArt } from './art/sun.ts'
import { PEA_RADIUS, drawShotArt } from './art/projectiles.ts'

const BACKGROUND = '#22301f'
const LAWN_EVEN = '#7cb342'
const LAWN_ODD = '#689f38'
const SELECTED_FILL = 'rgba(255, 235, 59, 0.38)'
const SELECTED_EDGE = '#fdd835'

/**
 * The colour of one Square's grass, which alternates in stripes across the lawn.
 *
 * Asked of the Square rather than worked out elsewhere, so that a bite taken out
 * of a plant can be filled in with the grass the plant was standing on — and cannot
 * be filled in with the wrong stripe if the stripes ever change.
 */
export function lawnColour(square: Square): string {
  return (square.row + square.column) % 2 === 0 ? LAWN_EVEN : LAWN_ODD
}

/**
 * Paints the lawn: five Rows crossed by nine Columns of mown stripes, whatever
 * is standing in them, the selected Square marked, and the Sun lying on it.
 *
 * All characters and elements are drawn as original flat vector artwork made
 * specifically for this project, held cleanly apart from the rules so artwork
 * can be replaced without changing game state.
 */
export function drawBoard(
  context: CanvasRenderingContext2D,
  view: Viewport,
  board: BoardLayout,
  state: GameState,
): void {
  // Deep garden background border
  context.fillStyle = BACKGROUND
  context.fillRect(0, 0, view.width, view.height)

  // Grass lawn checkerboard squares
  for (const square of everySquare()) {
    context.fillStyle = lawnColour(square)
    context.fillRect(
      board.offsetX + square.column * board.squareWidth,
      board.offsetY + square.row * board.squareHeight,
      board.squareWidth,
      board.squareHeight,
    )
  }

  // Every Row that has spent its mower marks where it stood with a dashed footprint
  for (let row = 0; row < BOARD_ROWS; row++) {
    const square: Square = { row, column: MOWER_COLUMN }
    if (!hasLawnMower(state.occupants, square)) {
      drawSpentMowerArt(context, square, board)
    }
  }

  // Selected square highlight
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

  // Plants and Lawn Mowers
  for (const occupant of state.occupants) {
    if (occupant.kind === 'plant') {
      drawPlantArt(context, occupant, board, lawnColour)
    } else {
      drawLawnMowerArt(context, occupant.square, board)
    }
  }

  // Projectiles in flight (peas, ice peas, spores)
  for (const shot of state.shots) {
    const cluster = state.shots.filter(
      (other) => other.row === shot.row && Math.abs(other.x - shot.x) <= PEA_RADIUS,
    )
    drawShotArt(context, shot, board, cluster.length, cluster.findIndex((o) => o.id === shot.id))
  }

  // Zombies walking or eating
  for (const zombie of state.zombies) {
    const eating = plantBeingEaten(zombie, state.occupants) !== undefined
    drawZombieArt(context, zombie, eating, board)
  }

  // Sun tokens
  for (const token of state.tokens) {
    drawSunArt(context, token, board)
  }
}
