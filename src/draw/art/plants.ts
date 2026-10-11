import type { Planted, Square } from '../../game/board.ts'
import { PLANTS } from '../../game/plants.ts'
import { centreOf } from '../layout.ts'
import type { BoardLayout } from '../layout.ts'
import { drawPeashooterSprite } from './peashooter.ts'
import { drawSunflowerSprite } from './sunflower.ts'

// Color palette for original plant vector artwork
const LEAF_DARK = '#1b5e20'
const LEAF_MID = '#2e7d32'
const LEAF_LIGHT = '#43a047'

const NUT_SHELL = '#c68642'
const NUT_EDGE = '#5d4037'
const NUT_SEAM = '#8d5524'
const TALL_NUT_SHELL = '#a06830'
const TALL_NUT_EDGE = '#4e342e'
const TALL_NUT_SEAM = '#6d421d'

const MINE_SOIL = '#5d4037'
const MINE_BODY = '#a1887f'
const MINE_EDGE = '#4e342e'
const MINE_BEACON_OFF = '#757575'
const MINE_BEACON_ON = '#e53935'
const MINE_BEACON_GLOW = 'rgba(244, 67, 54, 0.35)'

const SNOW_HEAD = '#90caf9'
const SNOW_SNOUT = '#64b5f6'
const SNOW_EDGE = '#1565c0'
const SNOW_ICE = '#e3f2fd'

const CHOMPER_BODY = '#7b1fa2'
const CHOMPER_HEAD_EDGE = '#4a148c'
const CHOMPER_CHEWING = '#8d6e63'
const CHOMPER_CHEWING_EDGE = '#4e342e'
const CHOMPER_MOUTH_INTERIOR = '#212121'
const CHOMPER_TEETH = '#ffffff'
const CHOMPER_EYE = '#fbc02d'

const REPEATER_HEAD = '#43a047'
const REPEATER_SNOUT = '#2e7d32'
const REPEATER_EDGE = '#1b5e20'

const CHERRY_RED = '#d32f2f'
const CHERRY_RED_DARK = '#b71c1c'
const CHERRY_HIGHLIGHT = '#ef5350'
const CHERRY_EDGE = '#7f0000'

const SHROOM_CAP = '#8e24aa'
const SHROOM_CAP_EDGE = '#4a148c'
const SHROOM_SPOTS = '#ba68c8'
const SHROOM_STEM = '#cfd8dc'
const SHROOM_STEM_EDGE = '#546e7a'

/** Fraction of health remaining (0 to 1), driving the bite cutout. */
export function healthFraction(plant: Planted): number {
  return Math.max(0, Math.min(1, plant.health / PLANTS[plant.name].health))
}

/** Draws leaf base at the foot of a plant. */
function drawBaseLeaves(
  context: CanvasRenderingContext2D,
  footX: number,
  footY: number,
  scale: number,
  fill = LEAF_MID,
  edge = LEAF_DARK,
): void {
  const leafWidth = 16 * scale
  const leafHeight = 7 * scale

  context.fillStyle = fill
  context.strokeStyle = edge
  context.lineWidth = Math.max(1, 1.5 * scale)

  // Left leaf
  context.beginPath()
  context.ellipse(footX - leafWidth * 0.7, footY, leafWidth, leafHeight, -0.2, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  // Right leaf
  context.beginPath()
  context.ellipse(footX + leafWidth * 0.7, footY, leafWidth, leafHeight, 0.2, 0, Math.PI * 2)
  context.fill()
  context.stroke()
}

/** Draws curved stem rising from foot to head. */
function drawStem(
  context: CanvasRenderingContext2D,
  footX: number,
  footY: number,
  headX: number,
  headY: number,
  thickness: number,
  color = LEAF_MID,
): void {
  context.save()
  context.strokeStyle = color
  context.lineWidth = thickness
  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(footX, footY)
  context.quadraticCurveTo(footX - thickness * 0.5, (footY + headY) / 2, headX, headY)
  context.stroke()
  context.restore()
}

/**
 * Applies a bitten cutout on the right side of a plant if damaged.
 *
 * The bite is taken out of the side the Zombie is standing on and filled in
 * with the Square's own grass colour, making plant degradation visible at a glance
 * without needing numbers or health bars above the characters.
 */
function applyBiteCutout(
  context: CanvasRenderingContext2D,
  biteX: number,
  biteY: number,
  biteRadius: number,
  lawnColor: string,
): void {
  if (biteRadius <= 0) return
  context.fillStyle = lawnColor
  context.beginPath()
  context.arc(biteX, biteY, biteRadius, 0, Math.PI * 2)
  context.fill()
}

/** Wall-nut: sturdy, wide walnut with shell texture, friendly eyes, and cracks when damaged. */
function drawWallNut(
  context: CanvasRenderingContext2D,
  plant: Planted,
  board: BoardLayout,
  centre: { x: number; y: number },
  lawnColor: string,
): void {
  const scale = board.scale
  const across = board.squareWidth * 0.36
  const down = board.squareHeight * 0.28
  const middleY = centre.y + board.squareHeight * 0.1

  // Outer shell
  context.fillStyle = NUT_SHELL
  context.strokeStyle = NUT_EDGE
  context.lineWidth = Math.max(1.8, 2.5 * scale)
  context.beginPath()
  context.ellipse(centre.x, middleY, across, down, 0, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  // Shell contour lines and center seam
  context.strokeStyle = NUT_SEAM
  context.lineWidth = Math.max(1, 1.5 * scale)
  context.beginPath()
  context.moveTo(centre.x, middleY - down * 0.95)
  context.lineTo(centre.x, middleY + down * 0.95)
  context.stroke()

  context.beginPath()
  context.ellipse(centre.x - across * 0.45, middleY, across * 0.35, down * 0.75, 0, 0, Math.PI * 2)
  context.stroke()
  context.beginPath()
  context.ellipse(centre.x + across * 0.45, middleY, across * 0.35, down * 0.75, 0, 0, Math.PI * 2)
  context.stroke()

  // Eyes
  const eyeXOffset = across * 0.3
  const eyeY = middleY - down * 0.15
  const eyeRadius = across * 0.22
  context.fillStyle = '#ffffff'
  context.strokeStyle = NUT_EDGE
  context.lineWidth = Math.max(1, 1.4 * scale)

  context.beginPath()
  context.ellipse(centre.x - eyeXOffset, eyeY, eyeRadius * 0.85, eyeRadius, 0, 0, Math.PI * 2)
  context.ellipse(centre.x + eyeXOffset, eyeY, eyeRadius * 0.85, eyeRadius, 0, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  // Pupils looking right
  context.fillStyle = '#212121'
  context.beginPath()
  context.arc(centre.x - eyeXOffset + eyeRadius * 0.25, eyeY, eyeRadius * 0.5, 0, Math.PI * 2)
  context.arc(centre.x + eyeXOffset + eyeRadius * 0.25, eyeY, eyeRadius * 0.5, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#ffffff'
  context.beginPath()
  context.arc(centre.x - eyeXOffset + eyeRadius * 0.35, eyeY - eyeRadius * 0.2, eyeRadius * 0.18, 0, Math.PI * 2)
  context.arc(centre.x + eyeXOffset + eyeRadius * 0.35, eyeY - eyeRadius * 0.2, eyeRadius * 0.18, 0, Math.PI * 2)
  context.fill()

  // Smile or weary expression depending on damage
  const health = healthFraction(plant)
  context.strokeStyle = NUT_EDGE
  context.lineWidth = Math.max(1.2, 1.6 * scale)
  context.lineCap = 'round'
  context.beginPath()
  if (health > 0.5) {
    context.arc(centre.x, middleY + down * 0.35, across * 0.22, 0.2, Math.PI - 0.2)
  } else {
    context.moveTo(centre.x - across * 0.18, middleY + down * 0.4)
    context.lineTo(centre.x + across * 0.18, middleY + down * 0.4)
  }
  context.stroke()

  // Stress cracks appearing as shell sustains bites
  if (health < 0.66) {
    context.strokeStyle = NUT_EDGE
    context.lineWidth = Math.max(1, 1.5 * scale)
    context.beginPath()
    context.moveTo(centre.x - across * 0.6, middleY + down * 0.2)
    context.lineTo(centre.x - across * 0.3, middleY + down * 0.4)
    context.lineTo(centre.x - across * 0.4, middleY + down * 0.7)
    context.stroke()
  }

  if (health < 1) {
    applyBiteCutout(context, centre.x + across * 0.75, middleY, across * 1.1 * (1 - health), lawnColor)
  }
}

/** Tall-nut: imposing tall walnut silhouette, thick vertical ridges, resolute eyes. */
function drawTallNut(
  context: CanvasRenderingContext2D,
  plant: Planted,
  board: BoardLayout,
  centre: { x: number; y: number },
  lawnColor: string,
): void {
  const scale = board.scale
  const across = board.squareWidth * 0.26
  const down = board.squareHeight * 0.44
  const middleY = centre.y

  // Tall oblong shell
  context.fillStyle = TALL_NUT_SHELL
  context.strokeStyle = TALL_NUT_EDGE
  context.lineWidth = Math.max(1.8, 2.5 * scale)
  context.beginPath()
  context.ellipse(centre.x, middleY, across, down, 0, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  // Deep vertical shell ridges
  context.strokeStyle = TALL_NUT_SEAM
  context.lineWidth = Math.max(1.2, 1.6 * scale)
  context.beginPath()
  context.moveTo(centre.x, middleY - down * 0.95)
  context.lineTo(centre.x, middleY + down * 0.95)
  context.stroke()

  context.beginPath()
  context.moveTo(centre.x - across * 0.5, middleY - down * 0.8)
  context.lineTo(centre.x - across * 0.5, middleY + down * 0.8)
  context.moveTo(centre.x + across * 0.5, middleY - down * 0.8)
  context.lineTo(centre.x + across * 0.5, middleY + down * 0.8)
  context.stroke()

  // Stoic brow ridge
  const eyeY = middleY - down * 0.3
  context.strokeStyle = TALL_NUT_EDGE
  context.lineWidth = Math.max(1.8, 2.2 * scale)
  context.beginPath()
  context.moveTo(centre.x - across * 0.6, eyeY - down * 0.12)
  context.lineTo(centre.x - across * 0.1, eyeY - down * 0.08)
  context.moveTo(centre.x + across * 0.6, eyeY - down * 0.12)
  context.lineTo(centre.x + across * 0.1, eyeY - down * 0.08)
  context.stroke()

  // Resolute eyes
  const eyeRadius = across * 0.22
  context.fillStyle = '#ffffff'
  context.strokeStyle = TALL_NUT_EDGE
  context.lineWidth = Math.max(1, 1.4 * scale)

  context.beginPath()
  context.ellipse(centre.x - across * 0.35, eyeY, eyeRadius * 0.8, eyeRadius, 0, 0, Math.PI * 2)
  context.ellipse(centre.x + across * 0.35, eyeY, eyeRadius * 0.8, eyeRadius, 0, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  context.fillStyle = '#111111'
  context.beginPath()
  context.arc(centre.x - across * 0.35 + eyeRadius * 0.2, eyeY, eyeRadius * 0.45, 0, Math.PI * 2)
  context.arc(centre.x + across * 0.35 + eyeRadius * 0.2, eyeY, eyeRadius * 0.45, 0, Math.PI * 2)
  context.fill()

  // Straight mouth
  context.strokeStyle = TALL_NUT_EDGE
  context.lineWidth = Math.max(1.5, 2 * scale)
  context.beginPath()
  context.moveTo(centre.x - across * 0.2, middleY - down * 0.05)
  context.lineTo(centre.x + across * 0.2, middleY - down * 0.05)
  context.stroke()

  const health = healthFraction(plant)
  if (health < 1) {
    applyBiteCutout(context, centre.x + across * 0.75, middleY, across * 1.2 * (1 - health), lawnColor)
  }
}

/** Potato Mine: soil mound, potato body, antenna with armed beacon glow. */
function drawPotatoMine(
  context: CanvasRenderingContext2D,
  plant: Planted,
  board: BoardLayout,
  centre: { x: number; y: number },
  lawnColor: string,
): void {
  const scale = board.scale
  const armed = plant.stepsUntilArmed === 0
  const across = board.squareWidth * 0.32
  const down = board.squareHeight * 0.18
  const middleY = centre.y + board.squareHeight * 0.18

  // Soil mound at base
  context.fillStyle = MINE_SOIL
  context.beginPath()
  context.ellipse(centre.x, middleY + down * 0.5, across * 1.25, down * 0.55, 0, 0, Math.PI * 2)
  context.fill()

  // Antenna stalk
  const antennaTopY = middleY - down * 1.35
  context.strokeStyle = MINE_EDGE
  context.lineWidth = Math.max(1.5, 2 * scale)
  context.beginPath()
  context.moveTo(centre.x, middleY - down * 0.5)
  context.lineTo(centre.x, antennaTopY)
  context.stroke()

  // Antenna beacon light: unmistakable glowing beacon when armed
  const beaconRadius = across * 0.25
  if (armed) {
    // Glowing halo
    context.fillStyle = MINE_BEACON_GLOW
    context.beginPath()
    context.arc(centre.x, antennaTopY, beaconRadius * 1.9, 0, Math.PI * 2)
    context.fill()

    context.fillStyle = MINE_BEACON_ON
    context.strokeStyle = '#b71c1c'
    context.lineWidth = Math.max(1.2, 1.6 * scale)
    context.beginPath()
    context.arc(centre.x, antennaTopY, beaconRadius, 0, Math.PI * 2)
    context.fill()
    context.stroke()

    // Beacon specular reflection
    context.fillStyle = '#ffffff'
    context.beginPath()
    context.arc(centre.x - beaconRadius * 0.3, antennaTopY - beaconRadius * 0.3, beaconRadius * 0.3, 0, Math.PI * 2)
    context.fill()
  } else {
    context.fillStyle = MINE_BEACON_OFF
    context.strokeStyle = MINE_EDGE
    context.lineWidth = Math.max(1, 1.4 * scale)
    context.beginPath()
    context.arc(centre.x, antennaTopY, beaconRadius * 0.75, 0, Math.PI * 2)
    context.fill()
    context.stroke()
  }

  // Potato body
  context.fillStyle = MINE_BODY
  context.strokeStyle = MINE_EDGE
  context.lineWidth = Math.max(1.8, 2.2 * scale)
  context.beginPath()
  context.ellipse(centre.x, middleY, across, down, 0, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  // Eyes
  const eyeY = middleY - down * 0.1
  const eyeRadius = across * 0.15
  context.fillStyle = '#212121'
  context.beginPath()
  context.arc(centre.x - across * 0.3, eyeY, eyeRadius, 0, Math.PI * 2)
  context.arc(centre.x + across * 0.3, eyeY, eyeRadius, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#ffffff'
  context.beginPath()
  context.arc(centre.x - across * 0.28, eyeY - eyeRadius * 0.3, eyeRadius * 0.35, 0, Math.PI * 2)
  context.arc(centre.x + across * 0.32, eyeY - eyeRadius * 0.3, eyeRadius * 0.35, 0, Math.PI * 2)
  context.fill()

  const health = healthFraction(plant)
  if (health < 1) {
    applyBiteCutout(context, centre.x + across * 0.75, middleY, across * 1.1 * (1 - health), lawnColor)
  }
}

/** Snow Pea: frosty blue shooter with ice crystal back spikes. */
function drawSnowPea(
  context: CanvasRenderingContext2D,
  plant: Planted,
  board: BoardLayout,
  centre: { x: number; y: number },
  lawnColor: string,
): void {
  const scale = board.scale
  const headRadius = board.squareWidth * 0.24
  const footY = centre.y + board.squareHeight * 0.32
  const headY = centre.y - board.squareHeight * 0.05
  const headX = centre.x - board.squareWidth * 0.03

  drawBaseLeaves(context, centre.x, footY, scale, '#546e7a', '#263238')
  drawStem(context, centre.x, footY, headX, headY, 6 * scale, '#546e7a')

  // Ice crystal spikes on back of head
  context.fillStyle = SNOW_ICE
  context.strokeStyle = SNOW_EDGE
  context.lineWidth = Math.max(1, 1.5 * scale)

  context.beginPath()
  context.moveTo(headX - headRadius * 0.6, headY - headRadius * 0.3)
  context.lineTo(headX - headRadius * 1.3, headY - headRadius * 0.7)
  context.lineTo(headX - headRadius * 0.8, headY)
  context.closePath()
  context.fill()
  context.stroke()

  context.beginPath()
  context.moveTo(headX - headRadius * 0.7, headY)
  context.lineTo(headX - headRadius * 1.4, headY + headRadius * 0.2)
  context.lineTo(headX - headRadius * 0.6, headY + headRadius * 0.4)
  context.closePath()
  context.fill()
  context.stroke()

  // Head sphere
  context.fillStyle = SNOW_HEAD
  context.strokeStyle = SNOW_EDGE
  context.lineWidth = Math.max(1.5, 2 * scale)
  context.beginPath()
  context.arc(headX, headY, headRadius, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  // Snout
  const snoutWidth = headRadius * 0.9
  const snoutHeight = headRadius * 0.55
  const snoutX = headX + headRadius * 0.65
  context.fillStyle = SNOW_SNOUT
  context.strokeStyle = SNOW_EDGE
  context.lineWidth = Math.max(1.2, 1.8 * scale)
  context.beginPath()
  context.moveTo(snoutX, headY - snoutHeight * 0.45)
  context.lineTo(snoutX + snoutWidth, headY - snoutHeight * 0.55)
  context.lineTo(snoutX + snoutWidth, headY + snoutHeight * 0.55)
  context.lineTo(snoutX, headY + snoutHeight * 0.45)
  context.closePath()
  context.fill()
  context.stroke()

  context.fillStyle = '#0d47a1'
  context.beginPath()
  context.ellipse(snoutX + snoutWidth, headY, snoutWidth * 0.18, snoutHeight * 0.55, 0, 0, Math.PI * 2)
  context.fill()

  // Chilled eye
  const eyeX = headX + headRadius * 0.2
  const eyeY = headY - headRadius * 0.25
  const eyeRadius = headRadius * 0.32
  context.fillStyle = '#ffffff'
  context.strokeStyle = SNOW_EDGE
  context.lineWidth = Math.max(1, 1.5 * scale)
  context.beginPath()
  context.ellipse(eyeX, eyeY, eyeRadius * 0.85, eyeRadius, 0, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  context.fillStyle = '#0d47a1'
  context.beginPath()
  context.arc(eyeX + eyeRadius * 0.25, eyeY, eyeRadius * 0.5, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#ffffff'
  context.beginPath()
  context.arc(eyeX + eyeRadius * 0.35, eyeY - eyeRadius * 0.2, eyeRadius * 0.2, 0, Math.PI * 2)
  context.fill()

  const health = healthFraction(plant)
  if (health < 1) {
    applyBiteCutout(context, headX + headRadius * 0.85, headY, headRadius * 1.1 * (1 - health), lawnColor)
  }
}

/** Chomper: large purple carnivorous plant, sharp white teeth when ready, chewing state when busy. */
function drawChomper(
  context: CanvasRenderingContext2D,
  plant: Planted,
  board: BoardLayout,
  centre: { x: number; y: number },
  lawnColor: string,
): void {
  const scale = board.scale
  const chewing = plant.stepsUntilChewed > 0
  const across = board.squareWidth * 0.34
  const down = board.squareHeight * 0.22
  const middleY = centre.y - board.squareHeight * 0.04
  const footY = centre.y + board.squareHeight * 0.32

  drawBaseLeaves(context, centre.x, footY, scale, '#2e7d32', '#1b5e20')
  drawStem(context, centre.x, footY, centre.x, middleY + down * 0.5, 8 * scale, '#388e3c')

  const skin = chewing ? CHOMPER_CHEWING : CHOMPER_BODY
  const edge = chewing ? CHOMPER_CHEWING_EDGE : CHOMPER_HEAD_EDGE

  // Head body
  context.fillStyle = skin
  context.strokeStyle = edge
  context.lineWidth = Math.max(1.8, 2.5 * scale)
  context.beginPath()
  context.ellipse(centre.x, middleY, across, down, 0, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  if (!chewing) {
    // Open jaws pointing leftwards towards incoming zombies
    context.fillStyle = CHOMPER_MOUTH_INTERIOR
    context.beginPath()
    context.moveTo(centre.x - across * 0.2, middleY)
    context.lineTo(centre.x - across * 1.05, middleY - down * 0.7)
    context.lineTo(centre.x - across * 1.05, middleY + down * 0.7)
    context.closePath()
    context.fill()

    // Sharp white teeth lining the jaws
    context.fillStyle = CHOMPER_TEETH
    const teeth = [
      [-across * 0.95, middleY - down * 0.65],
      [-across * 0.7, middleY - down * 0.45],
      [-across * 0.45, middleY - down * 0.25],
      [-across * 0.95, middleY + down * 0.65],
      [-across * 0.7, middleY + down * 0.45],
      [-across * 0.45, middleY + down * 0.25],
    ]
    for (const [tx, ty] of teeth) {
      context.beginPath()
      context.arc(centre.x + tx!, ty!, across * 0.08, 0, Math.PI * 2)
      context.fill()
    }

    // Alert amber eye
    context.fillStyle = CHOMPER_EYE
    context.strokeStyle = '#e65100'
    context.lineWidth = Math.max(1, 1.2 * scale)
    context.beginPath()
    context.arc(centre.x + across * 0.2, middleY - down * 0.4, across * 0.16, 0, Math.PI * 2)
    context.fill()
    context.stroke()

    context.fillStyle = '#212121'
    context.beginPath()
    context.arc(centre.x + across * 0.18, middleY - down * 0.4, across * 0.08, 0, Math.PI * 2)
    context.fill()
  } else {
    // Closed mouth crease while chewing
    context.strokeStyle = CHOMPER_CHEWING_EDGE
    context.lineWidth = Math.max(1.5, 2 * scale)
    context.beginPath()
    context.moveTo(centre.x - across * 0.9, middleY)
    context.lineTo(centre.x - across * 0.2, middleY)
    context.stroke()

    // Content closed eye curve
    context.strokeStyle = CHOMPER_CHEWING_EDGE
    context.lineWidth = Math.max(1.5, 2 * scale)
    context.beginPath()
    context.arc(centre.x + across * 0.2, middleY - down * 0.35, across * 0.14, Math.PI, 0)
    context.stroke()
  }

  const health = healthFraction(plant)
  if (health < 1) {
    applyBiteCutout(context, centre.x + across * 0.75, middleY, across * 1.1 * (1 - health), lawnColor)
  }
}

/** Repeater: double-shooting warrior peashooter with twin leaf crest and dual snout. */
function drawRepeater(
  context: CanvasRenderingContext2D,
  plant: Planted,
  board: BoardLayout,
  centre: { x: number; y: number },
  lawnColor: string,
): void {
  const scale = board.scale
  const headRadius = board.squareWidth * 0.24
  const footY = centre.y + board.squareHeight * 0.32
  const headY = centre.y - board.squareHeight * 0.05
  const headX = centre.x - board.squareWidth * 0.03

  drawBaseLeaves(context, centre.x, footY, scale)
  drawStem(context, centre.x, footY, headX, headY, 6 * scale)

  // Double crest leaves behind head
  context.fillStyle = LEAF_LIGHT
  context.strokeStyle = LEAF_DARK
  context.lineWidth = Math.max(1, 1.8 * scale)

  context.beginPath()
  context.ellipse(headX - headRadius * 0.95, headY - headRadius * 0.6, headRadius * 0.45, headRadius * 0.22, -0.7, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  context.beginPath()
  context.ellipse(headX - headRadius * 0.8, headY - headRadius * 0.85, headRadius * 0.45, headRadius * 0.22, -0.4, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  // Head
  context.fillStyle = REPEATER_HEAD
  context.strokeStyle = REPEATER_EDGE
  context.lineWidth = Math.max(1.5, 2 * scale)
  context.beginPath()
  context.arc(headX, headY, headRadius, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  // Dual snout (upper and lower firing barrels)
  const snoutWidth = headRadius * 0.85
  const snoutHeight = headRadius * 0.36
  const snoutX = headX + headRadius * 0.6

  for (const offset of [-headRadius * 0.22, headRadius * 0.25]) {
    context.fillStyle = REPEATER_SNOUT
    context.strokeStyle = REPEATER_EDGE
    context.lineWidth = Math.max(1, 1.5 * scale)
    context.beginPath()
    context.moveTo(snoutX, headY + offset - snoutHeight * 0.45)
    context.lineTo(snoutX + snoutWidth, headY + offset - snoutHeight * 0.5)
    context.lineTo(snoutX + snoutWidth, headY + offset + snoutHeight * 0.5)
    context.lineTo(snoutX, headY + offset + snoutHeight * 0.45)
    context.closePath()
    context.fill()
    context.stroke()

    context.fillStyle = LEAF_DARK
    context.beginPath()
    context.ellipse(snoutX + snoutWidth, headY + offset, snoutWidth * 0.16, snoutHeight * 0.5, 0, 0, Math.PI * 2)
    context.fill()
  }

  // Determined warrior eye with brow
  const eyeX = headX + headRadius * 0.15
  const eyeY = headY - headRadius * 0.25
  const eyeRadius = headRadius * 0.3

  // Furrowed brow
  context.strokeStyle = REPEATER_EDGE
  context.lineWidth = Math.max(1.5, 2 * scale)
  context.beginPath()
  context.moveTo(eyeX - eyeRadius * 0.7, eyeY - eyeRadius * 0.9)
  context.lineTo(eyeX + eyeRadius * 0.9, eyeY - eyeRadius * 0.6)
  context.stroke()

  context.fillStyle = '#ffffff'
  context.strokeStyle = REPEATER_EDGE
  context.lineWidth = Math.max(1.4, 1.6 * scale)
  context.beginPath()
  context.ellipse(eyeX, eyeY, eyeRadius * 0.85, eyeRadius, 0, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  context.fillStyle = '#111111'
  context.beginPath()
  context.arc(eyeX + eyeRadius * 0.25, eyeY, eyeRadius * 0.5, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#ffffff'
  context.beginPath()
  context.arc(eyeX + eyeRadius * 0.35, eyeY - eyeRadius * 0.2, eyeRadius * 0.2, 0, Math.PI * 2)
  context.fill()

  const health = healthFraction(plant)
  if (health < 1) {
    applyBiteCutout(context, headX + headRadius * 0.85, headY, headRadius * 1.1 * (1 - health), lawnColor)
  }
}

/** Cherry Bomb: twin glossy explosive cherries joined by a Y-stem with angry determined expressions. */
function drawCherryBomb(
  context: CanvasRenderingContext2D,
  board: BoardLayout,
  centre: { x: number; y: number },
): void {
  const scale = board.scale
  const berryRadius = board.squareWidth * 0.2
  const topY = centre.y - board.squareHeight * 0.12
  const stemJointY = centre.y - board.squareHeight * 0.28

  // Joined stem
  context.strokeStyle = LEAF_DARK
  context.lineWidth = Math.max(2, 3 * scale)
  context.lineCap = 'round'

  // Left stem
  context.beginPath()
  context.moveTo(centre.x, stemJointY)
  context.quadraticCurveTo(centre.x - berryRadius * 0.4, topY - berryRadius * 0.5, centre.x - berryRadius * 0.75, topY)
  context.stroke()

  // Right stem
  context.beginPath()
  context.moveTo(centre.x, stemJointY)
  context.quadraticCurveTo(centre.x + berryRadius * 0.4, topY - berryRadius * 0.5, centre.x + berryRadius * 0.75, topY)
  context.stroke()

  // Stem leaf
  context.fillStyle = LEAF_LIGHT
  context.beginPath()
  context.ellipse(centre.x, stemJointY - 3 * scale, berryRadius * 0.4, berryRadius * 0.2, -0.3, 0, Math.PI * 2)
  context.fill()

  // Two berries
  for (const side of [-1, 1]) {
    const bx = centre.x + side * berryRadius * 0.75
    const by = topY + 4 * scale

    // Spherical cherry body
    context.fillStyle = side === -1 ? CHERRY_RED : CHERRY_RED_DARK
    context.strokeStyle = CHERRY_EDGE
    context.lineWidth = Math.max(1.8, 2.5 * scale)
    context.beginPath()
    context.arc(bx, by, berryRadius, 0, Math.PI * 2)
    context.fill()
    context.stroke()

    // 3D specular highlight
    context.fillStyle = CHERRY_HIGHLIGHT
    context.beginPath()
    context.arc(bx - berryRadius * 0.35, by - berryRadius * 0.35, berryRadius * 0.3, 0, Math.PI * 2)
    context.fill()

    // Angry eyes
    const eyeY = by + berryRadius * 0.05
    const eyeRadius = berryRadius * 0.18
    context.fillStyle = '#111111'
    context.beginPath()
    context.arc(bx - berryRadius * 0.25, eyeY, eyeRadius, 0, Math.PI * 2)
    context.arc(bx + berryRadius * 0.25, eyeY, eyeRadius, 0, Math.PI * 2)
    context.fill()

    // Angry brow
    context.strokeStyle = CHERRY_EDGE
    context.lineWidth = Math.max(1.2, 1.6 * scale)
    context.beginPath()
    context.moveTo(bx - berryRadius * 0.4, eyeY - eyeRadius * 1.1)
    context.lineTo(bx - berryRadius * 0.05, eyeY - eyeRadius * 0.6)
    context.moveTo(bx + berryRadius * 0.4, eyeY - eyeRadius * 1.1)
    context.lineTo(bx + berryRadius * 0.05, eyeY - eyeRadius * 0.6)
    context.stroke()
  }
}

/** Puff-shroom: low mushroom with purple spotted cap and small spore snout. */
function drawPuffShroom(
  context: CanvasRenderingContext2D,
  plant: Planted,
  board: BoardLayout,
  centre: { x: number; y: number },
  lawnColor: string,
): void {
  const scale = board.scale
  const headRadius = board.squareWidth * 0.2
  const footY = centre.y + board.squareHeight * 0.32
  const stemHeight = board.squareHeight * 0.22
  const capY = footY - stemHeight

  // Pale stem
  context.fillStyle = SHROOM_STEM
  context.strokeStyle = SHROOM_STEM_EDGE
  context.lineWidth = Math.max(1.2, 1.8 * scale)
  context.beginPath()
  context.roundRect(centre.x - headRadius * 0.45, capY, headRadius * 0.9, stemHeight, [4 * scale])
  context.fill()
  context.stroke()

  // Mushroom cap
  context.fillStyle = SHROOM_CAP
  context.strokeStyle = SHROOM_CAP_EDGE
  context.lineWidth = Math.max(1.8, 2.2 * scale)
  context.beginPath()
  context.arc(centre.x, capY + headRadius * 0.2, headRadius * 1.15, Math.PI, 0)
  context.closePath()
  context.fill()
  context.stroke()

  // Cap spots
  context.fillStyle = SHROOM_SPOTS
  context.beginPath()
  context.arc(centre.x - headRadius * 0.5, capY - headRadius * 0.3, headRadius * 0.25, 0, Math.PI * 2)
  context.arc(centre.x + headRadius * 0.45, capY - headRadius * 0.4, headRadius * 0.3, 0, Math.PI * 2)
  context.arc(centre.x, capY - headRadius * 0.6, headRadius * 0.2, 0, Math.PI * 2)
  context.fill()

  // Small spore snout pointing right
  context.fillStyle = SHROOM_CAP_EDGE
  context.beginPath()
  context.ellipse(centre.x + headRadius * 0.9, capY + headRadius * 0.1, headRadius * 0.18, headRadius * 0.25, 0, 0, Math.PI * 2)
  context.fill()

  // Sleepy eyes on stem
  const eyeY = capY + stemHeight * 0.45
  context.fillStyle = '#263238'
  context.beginPath()
  context.arc(centre.x - headRadius * 0.22, eyeY, headRadius * 0.12, 0, Math.PI * 2)
  context.arc(centre.x + headRadius * 0.22, eyeY, headRadius * 0.12, 0, Math.PI * 2)
  context.fill()

  const health = healthFraction(plant)
  if (health < 1) {
    applyBiteCutout(context, centre.x + headRadius * 0.8, capY, headRadius * 1.1 * (1 - health), lawnColor)
  }
}

/**
 * Draws any of the 10 plants in its Square. `flash` runs from 1 at the moment
 * a Zombie bites the plant down to 0; pixel-art plants flash red with it
 * instead of showing a bite taken out of them.
 */
export function drawPlantArt(
  context: CanvasRenderingContext2D,
  plant: Planted,
  board: BoardLayout,
  lawnColor: (square: Square) => string,
  tick: number,
  beingEaten: boolean,
  flash: number,
): void {
  const centre = centreOf(plant.square, board)
  const squareColor = lawnColor(plant.square)

  switch (plant.name) {
    case 'peashooter':
      drawPeashooterSprite(context, plant, board, centre, tick, beingEaten, flash)
      break
    case 'sunflower':
      // Pixel art from the user's character sheet; the other plants are still
      // flat vector shapes until they get sheets of their own.
      drawSunflowerSprite(context, plant, board, centre, tick, beingEaten, flash)
      break
    case 'wall-nut':
      drawWallNut(context, plant, board, centre, squareColor)
      break
    case 'tall-nut':
      drawTallNut(context, plant, board, centre, squareColor)
      break
    case 'potato-mine':
      drawPotatoMine(context, plant, board, centre, squareColor)
      break
    case 'snow-pea':
      drawSnowPea(context, plant, board, centre, squareColor)
      break
    case 'chomper':
      drawChomper(context, plant, board, centre, squareColor)
      break
    case 'repeater':
      drawRepeater(context, plant, board, centre, squareColor)
      break
    case 'cherry-bomb':
      drawCherryBomb(context, board, centre)
      break
    case 'puff-shroom':
      drawPuffShroom(context, plant, board, centre, squareColor)
      break
  }
}
