import { SUN_RADIUS } from '../../game/balance.ts'
import type { SunToken } from '../../game/sun.ts'
import { place } from '../layout.ts'
import type { BoardLayout } from '../layout.ts'

const SUN_RAYS_OUTER = '#f9a825'
const SUN_RAYS_INNER = '#fbc02d'
const SUN_FILL = '#fdd835'
/** Preserved strictly: used by headless pixel checks to locate Sun tokens. */
export const SUN_CORE = '#fff9c4'
const RAYS = 12

/** Draws radiant Sun token with golden rays and #fff9c4 core. */
export function drawSunArt(
  context: CanvasRenderingContext2D,
  token: SunToken,
  board: BoardLayout,
): void {
  const s = board.scale
  const centre = place({ x: token.x, y: token.y }, board)
  const radius = SUN_RADIUS * s

  // Outer alternating triangular solar rays
  context.fillStyle = SUN_RAYS_OUTER
  for (let ray = 0; ray < RAYS; ray++) {
    const angle = (ray / RAYS) * Math.PI * 2
    const rayLength = ray % 2 === 0 ? radius * 1.35 : radius * 1.2
    const spread = (Math.PI / RAYS) * 0.65

    context.beginPath()
    context.moveTo(
      centre.x + Math.cos(angle - spread) * radius * 0.9,
      centre.y + Math.sin(angle - spread) * radius * 0.9,
    )
    context.lineTo(centre.x + Math.cos(angle) * rayLength, centre.y + Math.sin(angle) * rayLength)
    context.lineTo(
      centre.x + Math.cos(angle + spread) * radius * 0.9,
      centre.y + Math.sin(angle + spread) * radius * 0.9,
    )
    context.closePath()
    context.fill()
  }

  // Inner ray ring
  context.fillStyle = SUN_RAYS_INNER
  context.beginPath()
  context.arc(centre.x, centre.y, radius * 1.05, 0, Math.PI * 2)
  context.fill()

  // Main sun body
  context.fillStyle = SUN_FILL
  context.beginPath()
  context.arc(centre.x, centre.y, radius, 0, Math.PI * 2)
  context.fill()

  // Inner warm glow
  context.fillStyle = '#fff59d'
  context.beginPath()
  context.arc(centre.x, centre.y, radius * 0.75, 0, Math.PI * 2)
  context.fill()

  // Core (#fff9c4 - required by tests)
  context.fillStyle = SUN_CORE
  context.beginPath()
  context.arc(centre.x, centre.y, radius * 0.5, 0, Math.PI * 2)
  context.fill()
}
