import { zombieX, type Zombie } from '../../game/zombies.ts'
import { middleOfRow, place } from '../layout.ts'
import type { BoardLayout } from '../layout.ts'

const ZOMBIE_WIDTH = 0.62

// Color palette
const ZOMBIE_SKIN = '#9e9e9e'
const ZOMBIE_SKIN_EDGE = '#616161'
const ZOMBIE_SHIRT = '#5d4037'
const ZOMBIE_SHIRT_EDGE = '#3e2723'
const ZOMBIE_COLLAR = '#f5f5f5'
const ZOMBIE_TIE = '#c62828'
const ZOMBIE_PANTS = '#37474f'
const ZOMBIE_PANTS_EDGE = '#212121'
const ZOMBIE_SHOES = '#212121'

// Chilled cold palette
const CHILLED_SKIN = '#8ea9c4'
const CHILLED_SKIN_EDGE = '#4a5f7a'
const CHILLED_JACKET = '#455a64'
const CHILLED_FROST = '#e1f5fe'

// Accessories
const CONE_FILL = '#ff9800'
const CONE_EDGE = '#e65100'
const CONE_STRIPE = '#ffffff'
const CONE_BASE = '#f57c00'

const BUCKET_FILL = '#90a4ae'
const BUCKET_EDGE = '#37474f'
const BUCKET_RIM = '#b0bec5'
const BUCKET_HIGHLIGHT = '#cfd8dc'

const FLAG_POLE = '#8d6e63'
const FLAG_POLE_EDGE = '#5d4037'
const FLAG_CLOTH = '#e53935'
const FLAG_CLOTH_EDGE = '#b71c1c'
const FLAG_SYMBOL = '#ffffff'

const VAULT_POLE = '#e0b060'
const VAULT_POLE_EDGE = '#795548'
const ATHLETIC_SINGLET = '#d32f2f'
const ATHLETIC_STRIPE = '#ffffff'

/** Draws traffic cone on a Zombie's head while its armour remains. */
function drawCone(
  context: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  headRadius: number,
  board: BoardLayout,
): void {
  const scale = board.scale
  const baseY = headY - headRadius * 0.2
  const tipY = headY - headRadius * 2.2
  const baseHalfWidth = headRadius * 0.88

  // Base rim
  context.fillStyle = CONE_BASE
  context.strokeStyle = CONE_EDGE
  context.lineWidth = Math.max(1, 1.5 * scale)
  context.beginPath()
  context.roundRect(
    headX - baseHalfWidth * 1.15,
    baseY - headRadius * 0.15,
    baseHalfWidth * 2.3,
    headRadius * 0.22,
    [2 * scale],
  )
  context.fill()
  context.stroke()

  // Cone triangular body
  context.beginPath()
  context.moveTo(headX - baseHalfWidth, baseY)
  context.lineTo(headX - headRadius * 0.1, tipY)
  context.lineTo(headX + headRadius * 0.1, tipY)
  context.lineTo(headX + baseHalfWidth, baseY)
  context.closePath()
  context.fillStyle = CONE_FILL
  context.fill()
  context.strokeStyle = CONE_EDGE
  context.lineWidth = Math.max(1.2, 1.8 * scale)
  context.stroke()

  // Reflective white safety stripe
  const stripeBottomY = baseY - (baseY - tipY) * 0.32
  const stripeTopY = baseY - (baseY - tipY) * 0.58
  const stripeBottomHalfWidth = baseHalfWidth * 0.68
  const stripeTopHalfWidth = baseHalfWidth * 0.44

  context.beginPath()
  context.moveTo(headX - stripeBottomHalfWidth, stripeBottomY)
  context.lineTo(headX - stripeTopHalfWidth, stripeTopY)
  context.lineTo(headX + stripeTopHalfWidth, stripeTopY)
  context.lineTo(headX + stripeBottomHalfWidth, stripeBottomY)
  context.closePath()
  context.fillStyle = CONE_STRIPE
  context.fill()
}

/** Draws metal bucket on a Zombie's head while its armour remains. */
function drawBucket(
  context: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  headRadius: number,
  board: BoardLayout,
): void {
  const scale = board.scale
  const bottomY = headY + headRadius * 0.15
  const topY = headY - headRadius * 1.85
  const bottomHalfWidth = headRadius * 0.85
  const topHalfWidth = headRadius * 1.05

  // Bucket trapezoid
  context.beginPath()
  context.moveTo(headX - bottomHalfWidth, bottomY)
  context.lineTo(headX - topHalfWidth, topY)
  context.lineTo(headX + topHalfWidth, topY)
  context.lineTo(headX + bottomHalfWidth, bottomY)
  context.closePath()

  context.fillStyle = BUCKET_FILL
  context.fill()
  context.strokeStyle = BUCKET_EDGE
  context.lineWidth = Math.max(1.5, 2 * scale)
  context.stroke()

  // Metallic highlight
  context.strokeStyle = BUCKET_HIGHLIGHT
  context.lineWidth = Math.max(1, 1.5 * scale)
  context.beginPath()
  context.moveTo(headX - topHalfWidth * 0.6, topY + headRadius * 0.2)
  context.lineTo(headX - bottomHalfWidth * 0.6, bottomY - headRadius * 0.2)
  context.stroke()

  // Rim at bottom
  context.fillStyle = BUCKET_RIM
  context.strokeStyle = BUCKET_EDGE
  context.lineWidth = Math.max(1, 1.5 * scale)
  context.beginPath()
  context.roundRect(
    headX - bottomHalfWidth * 1.1,
    bottomY - headRadius * 0.12,
    bottomHalfWidth * 2.2,
    headRadius * 0.22,
    [2 * scale],
  )
  context.fill()
  context.stroke()

  // Handle ear rivet on side
  context.fillStyle = BUCKET_EDGE
  context.beginPath()
  context.arc(headX - bottomHalfWidth * 1.05, bottomY - headRadius * 0.05, headRadius * 0.12, 0, Math.PI * 2)
  context.fill()
}

/** Draws vaulting pole held by Pole Vaulting Zombie. */
function drawVaultPole(
  context: CanvasRenderingContext2D,
  centre: { x: number; y: number },
  board: BoardLayout,
): void {
  const width = board.squareWidth * ZOMBIE_WIDTH
  const handY = centre.y + board.squareHeight * 0.06
  const backX = centre.x + width * 0.45
  const frontX = centre.x - width * 1.55
  const frontY = handY + board.squareHeight * 0.08
  const backY = handY - board.squareHeight * 0.05
  const thickness = Math.max(2.5, board.squareWidth * 0.038)

  context.save()
  context.strokeStyle = VAULT_POLE_EDGE
  context.lineWidth = thickness + Math.max(1, 1.5 * board.scale)
  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(backX, backY)
  context.lineTo(frontX, frontY)
  context.stroke()

  context.strokeStyle = VAULT_POLE
  context.lineWidth = thickness
  context.beginPath()
  context.moveTo(backX, backY)
  context.lineTo(frontX, frontY)
  context.stroke()
  context.restore()
}

/** Draws flag carried by Flag Zombie. */
function drawFlag(
  context: CanvasRenderingContext2D,
  centre: { x: number; y: number },
  board: BoardLayout,
): void {
  const scale = board.scale
  const hand = centre.y + board.squareHeight * 0.06
  const top = hand - board.squareHeight * 0.65
  const poleX = centre.x + board.squareWidth * ZOMBIE_WIDTH * 0.32
  const thickness = Math.max(2.5, board.squareWidth * 0.045)

  // Wooden pole
  context.fillStyle = FLAG_POLE
  context.strokeStyle = FLAG_POLE_EDGE
  context.lineWidth = Math.max(1, 1.2 * scale)
  context.beginPath()
  context.rect(poleX - thickness / 2, top, thickness, hand - top)
  context.fill()
  context.stroke()

  // Flag cloth banner
  const flagW = board.squareWidth * 0.4
  const flagH = (hand - top) * 0.42
  context.fillStyle = FLAG_CLOTH
  context.strokeStyle = FLAG_CLOTH_EDGE
  context.lineWidth = Math.max(1.2, 1.8 * scale)

  context.beginPath()
  context.moveTo(poleX, top + thickness * 0.8)
  context.quadraticCurveTo(poleX + flagW * 0.5, top, poleX + flagW, top + flagH * 0.2)
  context.lineTo(poleX + flagW * 0.8, top + flagH * 0.5)
  context.lineTo(poleX + flagW, top + flagH * 0.8)
  context.quadraticCurveTo(poleX + flagW * 0.5, top + flagH, poleX, top + flagH)
  context.closePath()
  context.fill()
  context.stroke()

  // Symbol on flag
  context.fillStyle = FLAG_SYMBOL
  context.beginPath()
  context.arc(poleX + flagW * 0.4, top + flagH * 0.45, flagH * 0.2, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = FLAG_CLOTH
  context.beginPath()
  context.arc(poleX + flagW * 0.35, top + flagH * 0.45, flagH * 0.05, 0, Math.PI * 2)
  context.arc(poleX + flagW * 0.45, top + flagH * 0.45, flagH * 0.05, 0, Math.PI * 2)
  context.fill()
}

/** Draws original vector artwork for any Zombie walking, eating, or chilled. */
export function drawZombieArt(
  context: CanvasRenderingContext2D,
  zombie: Zombie,
  eating: boolean,
  board: BoardLayout,
): void {
  const scale = board.scale
  const centre = place({ x: zombieX(zombie), y: middleOfRow(zombie.row) }, board)
  const width = board.squareWidth * ZOMBIE_WIDTH
  const headRadius = width * 0.34
  const headY = centre.y - board.squareHeight * 0.18

  const chilled = zombie.stepsSlowed > 0
  const skin = chilled ? CHILLED_SKIN : ZOMBIE_SKIN
  const skinEdge = chilled ? CHILLED_SKIN_EDGE : ZOMBIE_SKIN_EDGE
  const jacket = chilled ? CHILLED_JACKET : ZOMBIE_SHIRT
  const jacketEdge = chilled ? '#263238' : ZOMBIE_SHIRT_EDGE

  const isRunner = zombie.name === 'pole-vaulting'
  const isRunning = isRunner && zombie.hasPole

  // Legs and shoes
  const legW = width * 0.18
  const legH = headRadius * 0.95
  const legY = centre.y + headRadius * 0.35
  const leftLegX = centre.x - width * 0.24
  const rightLegX = centre.x + width * 0.08

  context.fillStyle = isRunner ? '#c62828' : ZOMBIE_PANTS
  context.strokeStyle = ZOMBIE_PANTS_EDGE
  context.lineWidth = Math.max(1, 1.5 * scale)

  // Back leg
  context.beginPath()
  context.rect(rightLegX, legY, legW, legH)
  context.fill()
  context.stroke()

  // Front leg
  context.beginPath()
  context.rect(leftLegX, legY, legW, legH)
  context.fill()
  context.stroke()

  // Shoes
  context.fillStyle = ZOMBIE_SHOES
  context.beginPath()
  context.roundRect(rightLegX - 2 * scale, legY + legH - 3 * scale, legW + 5 * scale, 6 * scale, [2 * scale])
  context.roundRect(leftLegX - 3 * scale, legY + legH - 3 * scale, legW + 5 * scale, 6 * scale, [2 * scale])
  context.fill()

  // Torso / Suit jacket / Athletic singlet
  const bodyW = width * 0.65
  const bodyH = headRadius * 1.15
  const bodyX = centre.x - width * 0.32
  const bodyY = centre.y - headRadius * 0.5

  if (isRunner) {
    // Athletic singlet
    context.fillStyle = ATHLETIC_SINGLET
    context.strokeStyle = '#b71c1c'
    context.lineWidth = Math.max(1.2, 1.8 * scale)
    context.beginPath()
    context.rect(bodyX, bodyY, bodyW, bodyH)
    context.fill()
    context.stroke()

    // Singlet stripe
    context.fillStyle = ATHLETIC_STRIPE
    context.fillRect(bodyX + bodyW * 0.35, bodyY, bodyW * 0.3, bodyH)
  } else {
    // Suit jacket
    context.fillStyle = jacket
    context.strokeStyle = jacketEdge
    context.lineWidth = Math.max(1.2, 1.8 * scale)
    context.beginPath()
    context.rect(bodyX, bodyY, bodyW, bodyH)
    context.fill()
    context.stroke()

    // White collared shirt opening
    context.fillStyle = ZOMBIE_COLLAR
    context.beginPath()
    context.moveTo(centre.x - width * 0.08, bodyY)
    context.lineTo(centre.x + width * 0.08, bodyY)
    context.lineTo(centre.x, bodyY + bodyH * 0.5)
    context.closePath()
    context.fill()

    // Crooked red necktie
    context.fillStyle = ZOMBIE_TIE
    context.beginPath()
    context.moveTo(centre.x - width * 0.03, bodyY + 2 * scale)
    context.lineTo(centre.x + width * 0.03, bodyY + 2 * scale)
    context.lineTo(centre.x + width * 0.05, bodyY + bodyH * 0.6)
    context.lineTo(centre.x - width * 0.02, bodyY + bodyH * 0.7)
    context.closePath()
    context.fill()
  }

  // Arms: eating, running, or walking
  if (eating) {
    // Both arms reaching forward to claw the plant
    context.fillStyle = skin
    context.strokeStyle = skinEdge
    context.lineWidth = Math.max(1, 1.5 * scale)

    const armW = width * 0.8
    const armH = headRadius * 0.35

    context.beginPath()
    context.roundRect(centre.x - armW, headY + headRadius * 0.1, armW, armH, [3 * scale])
    context.roundRect(centre.x - armW, centre.y - headRadius * 0.1, armW, armH, [3 * scale])
    context.fill()
    context.stroke()
  } else if (isRunning) {
    // Forward lean runner arm pose
    context.fillStyle = skin
    context.strokeStyle = skinEdge
    context.lineWidth = Math.max(1, 1.5 * scale)

    context.beginPath()
    context.roundRect(centre.x - width * 0.7, centre.y - headRadius * 0.2, width * 0.6, headRadius * 0.35, [3 * scale])
    context.fill()
    context.stroke()
  } else {
    // Shambling zombie arm forward
    context.fillStyle = skin
    context.strokeStyle = skinEdge
    context.lineWidth = Math.max(1, 1.5 * scale)

    context.beginPath()
    context.roundRect(centre.x - width * 0.6, centre.y - headRadius * 0.2, width * 0.55, headRadius * 0.35, [3 * scale])
    context.fill()
    context.stroke()
  }

  // Zombie Head
  context.fillStyle = skin
  context.strokeStyle = skinEdge
  context.lineWidth = Math.max(1.5, 2 * scale)
  context.beginPath()
  context.arc(centre.x, headY, headRadius, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  // Ragged hair strands
  context.strokeStyle = skinEdge
  context.lineWidth = Math.max(1, 1.5 * scale)
  context.beginPath()
  context.moveTo(centre.x - headRadius * 0.4, headY - headRadius * 0.9)
  context.lineTo(centre.x - headRadius * 0.2, headY - headRadius * 1.15)
  context.moveTo(centre.x, headY - headRadius * 0.95)
  context.lineTo(centre.x + headRadius * 0.15, headY - headRadius * 1.2)
  context.stroke()

  // Goofy mismatched zombie eyes
  const leftEyeX = centre.x - headRadius * 0.35
  const rightEyeX = centre.x + headRadius * 0.2
  const eyeY = headY - headRadius * 0.1
  const eyeR1 = headRadius * 0.32
  const eyeR2 = headRadius * 0.25

  context.fillStyle = '#ffffff'
  context.strokeStyle = skinEdge
  context.lineWidth = Math.max(1, 1.2 * scale)

  // Left eye (larger)
  context.beginPath()
  context.arc(leftEyeX, eyeY, eyeR1, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  // Right eye (smaller)
  context.beginPath()
  context.arc(rightEyeX, eyeY, eyeR2, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  // Pupils (looking leftwards towards house)
  context.fillStyle = '#212121'
  context.beginPath()
  context.arc(leftEyeX - eyeR1 * 0.3, eyeY, eyeR1 * 0.4, 0, Math.PI * 2)
  context.arc(rightEyeX - eyeR2 * 0.3, eyeY, eyeR2 * 0.4, 0, Math.PI * 2)
  context.fill()

  // Slack jaw / crooked mouth
  context.strokeStyle = skinEdge
  context.lineWidth = Math.max(1.5, 2 * scale)
  context.beginPath()
  context.moveTo(centre.x - headRadius * 0.4, headY + headRadius * 0.45)
  context.lineTo(centre.x + headRadius * 0.2, headY + headRadius * 0.55)
  context.stroke()

  // Crooked yellow tooth
  context.fillStyle = '#fff59d'
  context.beginPath()
  context.rect(centre.x - headRadius * 0.2, headY + headRadius * 0.45, headRadius * 0.14, headRadius * 0.16)
  context.fill()

  // Cold chilled sparkles if slowed
  if (chilled) {
    context.fillStyle = CHILLED_FROST
    context.beginPath()
    context.arc(centre.x + headRadius * 0.6, headY - headRadius * 0.5, 2.5 * scale, 0, Math.PI * 2)
    context.arc(centre.x - headRadius * 0.6, headY + headRadius * 0.3, 2 * scale, 0, Math.PI * 2)
    context.fill()
  }

  // Accessories on top of head / in hands
  if (zombie.name === 'flag') {
    drawFlag(context, centre, board)
  } else if (zombie.name === 'conehead' && zombie.armour > 0) {
    drawCone(context, centre.x, headY, headRadius, board)
  } else if (zombie.name === 'buckethead' && zombie.armour > 0) {
    drawBucket(context, centre.x, headY, headRadius, board)
  } else if (zombie.name === 'pole-vaulting' && zombie.hasPole) {
    drawVaultPole(context, centre, board)
  }
}
