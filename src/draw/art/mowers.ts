import type { Square } from '../../game/board.ts'
import { centreOf } from '../layout.ts'
import type { BoardLayout } from '../layout.ts'

const MOWER_BODY_RED = '#d32f2f'
const MOWER_BODY_DARK = '#b71c1c'
const MOWER_ENGINE = '#78909c'
const MOWER_ENGINE_DARK = '#455a64'
const MOWER_EDGE = '#37474f'
const MOWER_HANDLE = '#90a4ae'
const MOWER_GRIP = '#212121'
const MOWER_WHEEL = '#263238'
const MOWER_HUBCAP = '#cfd8dc'
const SPENT_MOWER_EDGE = 'rgba(255, 255, 255, 0.32)'

/** Draws active Lawn Mower in its Square. */
export function drawLawnMowerArt(
  context: CanvasRenderingContext2D,
  square: Square,
  board: BoardLayout,
): void {
  const s = board.scale
  const centre = centreOf(square, board)
  const width = board.squareWidth * 0.64
  const height = board.squareHeight * 0.36
  const x = centre.x - width / 2
  const y = centre.y - height / 2

  // Handle angled upward to the left
  context.strokeStyle = MOWER_HANDLE
  context.lineWidth = Math.max(2, 3 * s)
  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(x + width * 0.25, y + height * 0.4)
  context.lineTo(x - width * 0.15, y - height * 0.45)
  context.stroke()

  // Handle grip
  context.strokeStyle = MOWER_GRIP
  context.lineWidth = Math.max(3, 4.5 * s)
  context.beginPath()
  context.moveTo(x - width * 0.18, y - height * 0.48)
  context.lineTo(x - width * 0.1, y - height * 0.4)
  context.stroke()

  // Mower red deck/chassis
  context.fillStyle = MOWER_BODY_RED
  context.strokeStyle = MOWER_EDGE
  context.lineWidth = Math.max(1.5, 2 * s)
  context.beginPath()
  context.roundRect(x, y + height * 0.25, width, height * 0.6, [4 * s])
  context.fill()
  context.stroke()

  // Deck lower rim / blade guard
  context.fillStyle = MOWER_BODY_DARK
  context.beginPath()
  context.roundRect(x + 2 * s, y + height * 0.65, width - 4 * s, height * 0.2, [2 * s])
  context.fill()

  // Silver engine motor block on top of deck
  const engineW = width * 0.48
  const engineH = height * 0.4
  const engineX = x + width * 0.26
  const engineY = y + height * 0.05

  context.fillStyle = MOWER_ENGINE
  context.strokeStyle = MOWER_ENGINE_DARK
  context.lineWidth = Math.max(1.2, 1.8 * s)
  context.beginPath()
  context.roundRect(engineX, engineY, engineW, engineH, [3 * s])
  context.fill()
  context.stroke()

  // Engine cooling vents
  context.strokeStyle = MOWER_ENGINE_DARK
  context.lineWidth = Math.max(1, 1.2 * s)
  for (const off of [0.3, 0.5, 0.7]) {
    context.beginPath()
    context.moveTo(engineX + engineW * 0.2, engineY + engineH * off)
    context.lineTo(engineX + engineW * 0.8, engineY + engineH * off)
    context.stroke()
  }

  // Wheels (front and back)
  const wheelR = height * 0.24
  const wheelY = y + height * 0.82

  for (const wx of [x + width * 0.18, x + width * 0.82]) {
    // Tire
    context.fillStyle = MOWER_WHEEL
    context.strokeStyle = MOWER_EDGE
    context.lineWidth = Math.max(1.2, 1.6 * s)
    context.beginPath()
    context.arc(wx, wheelY, wheelR, 0, Math.PI * 2)
    context.fill()
    context.stroke()

    // Hubcap
    context.fillStyle = MOWER_HUBCAP
    context.beginPath()
    context.arc(wx, wheelY, wheelR * 0.45, 0, Math.PI * 2)
    context.fill()
  }
}

/** Draws spent mower footprint where a Lawn Mower once stood. */
export function drawSpentMowerArt(
  context: CanvasRenderingContext2D,
  square: Square,
  board: BoardLayout,
): void {
  const s = board.scale
  const centre = centreOf(square, board)
  const width = board.squareWidth * 0.64
  const height = board.squareHeight * 0.36
  const x = centre.x - width / 2
  const y = centre.y - height / 2

  context.save()
  context.strokeStyle = SPENT_MOWER_EDGE
  context.lineWidth = Math.max(1.2, 2 * s)
  context.setLineDash([4 * s, 4 * s])

  // Dashed deck
  context.strokeRect(x, y + height * 0.25, width, height * 0.6)

  // Dashed wheels
  const wheelR = height * 0.24
  const wheelY = y + height * 0.82
  for (const wx of [x + width * 0.18, x + width * 0.82]) {
    context.beginPath()
    context.arc(wx, wheelY, wheelR, 0, Math.PI * 2)
    context.stroke()
  }

  context.restore()
}
