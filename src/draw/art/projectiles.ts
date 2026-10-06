import type { Shot } from '../../game/shots.ts'
import { middleOfRow, place } from '../layout.ts'
import type { BoardLayout } from '../layout.ts'

export const PEA_RADIUS = 8

const PEA_GREEN = '#8bc34a'
const PEA_HIGHLIGHT = '#c5e1a5'
const PEA_EDGE = '#33691e'

const SNOW_PEA_ICE = '#90caf9'
const SNOW_PEA_HIGHLIGHT = '#e3f2fd'
const SNOW_PEA_EDGE = '#0d47a1'

/**
 * Draws an individual projectile (Pea or Snow Pea) in flight along its Row.
 *
 * Distinctive colours tell the cold shots apart from standard peas at a glance,
 * matching the rule differences: a Snow Pea projectile leaves whatever it hits slowed,
 * so a player watching a Row must be able to see the chill in flight rather than only
 * after impact. Clusters of peas from a Repeater are spread slightly along the Row so
 * two simultaneous shots read as two distinct peas rather than a single doubled disc.
 */
export function drawShotArt(
  context: CanvasRenderingContext2D,
  shot: Shot,
  board: BoardLayout,
  withOthers: number,
  thisIndexInItsCluster: number,
): void {
  const scale = board.scale
  const radius = PEA_RADIUS * scale

  // Spread along the Row rather than vertically, so clusters read as peas in flight together
  const alone =
    withOthers < 2
      ? 0
      : (thisIndexInItsCluster - (withOthers - 1) / 2) * radius * 2.4
  const centre = place({ x: shot.x + alone, y: middleOfRow(shot.row) }, board)

  const isSnowPea = shot.slowSteps > 0

  if (isSnowPea) {
    // Frosty ice-blue crystalline pea
    context.fillStyle = SNOW_PEA_ICE
    context.strokeStyle = SNOW_PEA_EDGE
    context.lineWidth = Math.max(1.2, 1.6 * scale)
    context.beginPath()
    context.arc(centre.x, centre.y, radius, 0, Math.PI * 2)
    context.fill()
    context.stroke()

    // Crystalline facet highlights
    context.fillStyle = SNOW_PEA_HIGHLIGHT
    context.beginPath()
    context.arc(centre.x - radius * 0.35, centre.y - radius * 0.35, radius * 0.35, 0, Math.PI * 2)
    context.fill()
  } else {
    // Vibrant green pea
    context.fillStyle = PEA_GREEN
    context.strokeStyle = PEA_EDGE
    context.lineWidth = Math.max(1.2, 1.6 * scale)
    context.beginPath()
    context.arc(centre.x, centre.y, radius, 0, Math.PI * 2)
    context.fill()
    context.stroke()

    // 3D specular highlight
    context.fillStyle = PEA_HIGHLIGHT
    context.beginPath()
    context.arc(centre.x - radius * 0.32, centre.y - radius * 0.32, radius * 0.35, 0, Math.PI * 2)
    context.fill()
  }
}
