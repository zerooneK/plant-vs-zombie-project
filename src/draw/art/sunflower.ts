import type { Planted } from '../../game/board.ts'
import type { BoardLayout } from '../layout.ts'

/**
 * The Sunflower as 48 x 48 pixel art, from the character sheet the user drew.
 *
 * Built from shapes rather than typed out as 2,304 letters, because a typed
 * grid cannot be read or changed by anyone: move the eyes one pixel in a string
 * grid and every row has to be counted by hand. Shapes are tested for at the
 * centre of each pixel, so what comes out is still hard-edged pixel art.
 *
 * Every picture the Sunflower can show is built once and kept, so a lawn full
 * of Sunflowers costs one image copy each per frame and not two thousand
 * rectangles each.
 */

const SIZE = 48

// The character sheet's eight colours, and nothing else.
const PETAL = '#ffd54f'
const PETAL_SHADE = '#f9a825'
const DISK = '#5b3a29'
const DETAIL = '#3b2619'
const LEAF = '#4caf50'
const LEAF_LIGHT = '#8bc34a'
/**
 * The glow when Sun is being made. Deliberately not the Sun's own core colour,
 * `#fff9c4`, which nothing else may draw: the headless checks find Sun on the
 * lawn by looking for exactly that colour.
 */
const LIGHT = '#fff3c7'
const CHEEK = '#ff8a8a'
/** Eye shine. Not on the sheet's palette, but the sheet's eyes have it. */
const SHINE = '#ffffff'
/**
 * Eyes and mouth. Darker than the palette's face-detail brown, because on the
 * sheet they read near-black, and the detail brown barely shows on the face.
 */
const EYE = '#1e120b'

/** The middle of the flower head, between pixels so the face is symmetric. */
const HEAD_X = 24.5
const HEAD_Y = 22
/** Big, because on the sheet the face is most of the flower. */
const DISK_RADIUS = 11.5

/** Where on the head a bite is taken: the right, the side Zombies come from. */
const BITE_X = HEAD_X + 13
const BITE_Y = HEAD_Y + 1
/** A bite's radius in sprite pixels when nothing at all is left. */
const BITE_MAX = 14

/**
 * The three faces from the sheet that this game has a reason to show.
 * Turn-arounds, walking and shooting are left out: a Sunflower here stands
 * still, faces the Zombies, and fires nothing.
 */
export type SunflowerMood = 'happy' | 'glowing' | 'hurt'

/** How long before its Sun appears that a Sunflower starts to glow. */
const GLOW_STEPS = 90
/** Steps between one bob of the head and the next. */
const BOB_STEPS = 30

type Grid = (string | null)[]

function blank(): Grid {
  return new Array<string | null>(SIZE * SIZE).fill(null)
}

function set(grid: Grid, x: number, y: number, colour: string): void {
  if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
    grid[y * SIZE + x] = colour
  }
}

/** Colours every pixel whose centre the test says is inside a shape. */
function fill(grid: Grid, inside: (x: number, y: number) => string | null): void {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const colour = inside(x + 0.5, y + 0.5)
      if (colour !== null) {
        set(grid, x, y, colour)
      }
    }
  }
}

function inEllipse(px: number, py: number, cx: number, cy: number, rx: number, ry: number, angle: number): boolean {
  const dx = px - cx
  const dy = py - cy
  const along = dx * Math.cos(angle) + dy * Math.sin(angle)
  const across = -dx * Math.sin(angle) + dy * Math.cos(angle)
  return (along * along) / (rx * rx) + (across * across) / (ry * ry) <= 1
}

/**
 * How far inside an ellipse a point is: 0 at the middle, 1 on the edge, more
 * than 1 outside. Used to shade a rim on each petal.
 */
function ellipseDepth(px: number, py: number, cx: number, cy: number, rx: number, ry: number, angle: number): number {
  const dx = px - cx
  const dy = py - cy
  const along = dx * Math.cos(angle) + dy * Math.sin(angle)
  const across = -dx * Math.sin(angle) + dy * Math.cos(angle)
  return (along * along) / (rx * rx) + (across * across) / (ry * ry)
}

/** Two chunky leaves tucked under the head, pointing out and down. */
function drawLeaves(grid: Grid): void {
  for (const [cx, angle] of [[15, 0.4], [34, -0.4]] as const) {
    fill(grid, (x, y) => {
      if (!inEllipse(x, y, cx, 40.5, 10, 5, angle)) return null
      // Lit from above, as every plant on the sheet is.
      return y < 40 ? LEAF_LIGHT : LEAF
    })
  }
}

/**
 * Two rings of big petals. The ring behind is all shade and shows between the
 * petals in front; each front petal has a shaded rim, so neighbours stay
 * separate petals rather than melting into one yellow ring.
 */
function drawPetals(grid: Grid): void {
  const count = 10
  const shape = { reach: 14.8, long: 6, wide: 5 }
  // The ring behind sits further in, so each front petal bumps out past it and
  // the outline is scalloped like the sheet's rather than a plain circle.
  for (let i = 0; i < count; i++) {
    const angle = ((i + 0.5) / count) * Math.PI * 2
    const cx = HEAD_X + Math.cos(angle) * (shape.reach - 2.5)
    const cy = HEAD_Y + Math.sin(angle) * (shape.reach - 2.5)
    fill(grid, (x, y) => (inEllipse(x, y, cx, cy, shape.long, shape.wide, angle) ? PETAL_SHADE : null))
  }
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const cx = HEAD_X + Math.cos(angle) * shape.reach
    const cy = HEAD_Y + Math.sin(angle) * shape.reach
    fill(grid, (x, y) => {
      const depth = ellipseDepth(x, y, cx, cy, shape.long, shape.wide, angle)
      if (depth > 1) return null
      return depth > 0.62 ? PETAL_SHADE : PETAL
    })
  }
}

function drawDisk(grid: Grid): void {
  fill(grid, (x, y) => {
    const far = Math.hypot(x - HEAD_X, y - HEAD_Y)
    if (far > DISK_RADIUS) return null
    return far > DISK_RADIUS - 0.9 ? DETAIL : DISK
  })
}

function dots(grid: Grid, colour: string, points: readonly (readonly [number, number])[]): void {
  for (const [x, y] of points) {
    set(grid, x, y, colour)
  }
}

/**
 * The face. Pixel positions are written out by hand, because a face at this
 * size is a handful of pixels and the exact handful is the expression.
 */
function drawFace(grid: Grid, mood: SunflowerMood): void {
  // Every pair of pixels mirrored across the middle adds up to 48 across, so
  // the face sits on the head's centre line and not half a pixel off it.

  // Cheeks, on every face the sheet draws.
  dots(grid, CHEEK, [
    [15, 24], [16, 24], [17, 24], [15, 25], [16, 25], [17, 25],
    [31, 24], [32, 24], [33, 24], [31, 25], [32, 25], [33, 25],
  ])

  if (mood === 'happy') {
    // Big round eyes with a tall shine, and a small smile.
    for (const left of [18, 28]) {
      for (let y = 17; y <= 22; y++) {
        // Rounded: the outer columns start a row lower and stop a row higher.
        const edge = y === 17 || y === 22
        dots(grid, EYE, edge ? [[left + 1, y]] : [[left, y], [left + 1, y], [left + 2, y]])
      }
    }
    dots(grid, SHINE, [[19, 18], [19, 19], [29, 18], [29, 19]])
    dots(grid, EYE, [[21, 24], [22, 25], [23, 25], [24, 25], [25, 25], [26, 25], [27, 24]])
    return
  }

  if (mood === 'glowing') {
    // Eyes shut in a grin and mouth open, the sheet's "making energy" face.
    dots(grid, EYE, [
      [17, 21], [18, 20], [19, 19], [20, 20], [21, 21],
      [27, 21], [28, 20], [29, 19], [30, 20], [31, 21],
    ])
    dots(grid, EYE, [
      [21, 24], [22, 24], [23, 24], [24, 24], [25, 24], [26, 24], [27, 24],
      [22, 25], [26, 25], [23, 26], [24, 26], [25, 26],
    ])
    dots(grid, CHEEK, [[23, 25], [24, 25], [25, 25]])
    // Sparkles in the corners, the sheet's little stars.
    for (const [sx, sy] of [[3, 4], [44, 6], [3, 30], [45, 29]] as const) {
      dots(grid, LIGHT, [[sx, sy], [sx - 1, sy], [sx + 1, sy], [sx, sy - 1], [sx, sy + 1]])
    }
    return
  }

  // Hurt: squeezed-shut "> <" eyes and an open "ow", the sheet's being-hit face.
  dots(grid, EYE, [
    [18, 18], [19, 19], [20, 20], [19, 21], [18, 22],
    [30, 18], [29, 19], [28, 20], [29, 21], [30, 22],
  ])
  dots(grid, EYE, [[23, 24], [24, 24], [25, 24], [22, 25], [26, 25], [22, 26], [26, 26], [23, 27], [24, 27], [25, 27]])
  dots(grid, CHEEK, [[23, 25], [24, 25], [25, 25], [23, 26], [24, 26], [25, 26]])
}

/** Clears a bite out of the right of the head, before the outline is traced. */
function takeBite(grid: Grid, radius: number): void {
  if (radius <= 0) return
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // Above the leaves only: a Zombie bites the head, not the foliage.
      if (Math.hypot(x + 0.5 - BITE_X, y + 0.5 - BITE_Y) < radius && y < 38) {
        grid[y * SIZE + x] = null
      }
    }
  }
}

/**
 * A dark line round the whole shape, the sheet's outline. Traced last, so it
 * follows a bite as well as the petals. Sparkles are left unlined, as they are
 * on the sheet.
 */
function outline(grid: Grid): void {
  const edge: number[] = []
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (grid[y * SIZE + x] !== null) continue
      const solid = (nx: number, ny: number) => {
        if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) return false
        const colour = grid[ny * SIZE + nx]
        return colour !== null && colour !== undefined && colour !== LIGHT
      }
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        edge.push(y * SIZE + x)
      }
    }
  }
  for (const index of edge) {
    grid[index] = DETAIL
  }
}

function build(mood: SunflowerMood, bite: number): HTMLCanvasElement {
  const grid = blank()
  drawLeaves(grid)
  drawPetals(grid)
  drawDisk(grid)
  drawFace(grid, mood)
  takeBite(grid, bite)
  outline(grid)

  const sprite = document.createElement('canvas')
  sprite.width = SIZE
  sprite.height = SIZE
  const context = sprite.getContext('2d')
  if (context !== null) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const colour = grid[y * SIZE + x]
        if (colour !== null && colour !== undefined) {
          context.fillStyle = colour
          context.fillRect(x, y, 1, 1)
        }
      }
    }
  }
  return sprite
}

const sprites = new Map<string, HTMLCanvasElement>()

function sprite(mood: SunflowerMood, bite: number): HTMLCanvasElement {
  const key = `${mood}:${bite}`
  let found = sprites.get(key)
  if (found === undefined) {
    found = build(mood, bite)
    sprites.set(key, found)
  }
  return found
}

/**
 * Which face to show. Being eaten beats glowing: a Sunflower about to make
 * Sun while a Zombie chews it is, first of all, being chewed.
 */
export function sunflowerMood(plant: Planted, beingEaten: boolean): SunflowerMood {
  if (beingEaten) return 'hurt'
  if (plant.stepsUntilSun <= GLOW_STEPS) return 'glowing'
  return 'happy'
}

export function drawSunflowerSprite(
  context: CanvasRenderingContext2D,
  plant: Planted,
  board: BoardLayout,
  centre: { x: number; y: number },
  health: number,
  tick: number,
  beingEaten: boolean,
): void {
  const mood = sunflowerMood(plant, beingEaten)
  // Rounded to whole sprite pixels, so a bite grows a pixel at a time and only
  // fifteen pictures of a bitten Sunflower are ever built.
  const bite = Math.round(BITE_MAX * (1 - health))

  const size = board.squareWidth * 1.02
  const pixel = size / SIZE

  // Each Sunflower bobs on its own beat, worked out from its Square, so a row
  // of them sways rather than marching in step.
  const phase = (plant.square.row * 7 + plant.square.column * 11) * 5
  const bob = Math.floor((tick + phase) / BOB_STEPS) % 2 === 0 ? 0 : pixel
  // A Sunflower being eaten shudders instead of bobbing.
  const shake = mood === 'hurt' ? (Math.floor(tick / 4) % 2 === 0 ? -pixel : pixel) : 0

  const left = Math.round(centre.x - size / 2 + shake)
  const top = Math.round(centre.y + board.squareHeight * 0.47 - size + bob)

  if (mood === 'glowing') {
    // A soft light behind the head, pulsing. Kept well short of opaque, so the
    // lawn under it can never blend to the Sun's own core colour.
    const glowX = left + HEAD_X * pixel
    const glowY = top + HEAD_Y * pixel
    const radius = 22 * pixel
    const pulse = 0.35 + 0.15 * Math.sin(tick / 6)
    const gradient = context.createRadialGradient(glowX, glowY, 0, glowX, glowY, radius)
    gradient.addColorStop(0, `rgba(255, 243, 199, ${pulse})`)
    gradient.addColorStop(1, 'rgba(255, 243, 199, 0)')
    context.fillStyle = gradient
    context.beginPath()
    context.arc(glowX, glowY, radius, 0, Math.PI * 2)
    context.fill()
  }

  context.save()
  // Nearest-neighbour scaling, or the pixel art is smeared into a blur.
  context.imageSmoothingEnabled = false
  context.drawImage(sprite(mood, bite), left, top, Math.round(size), Math.round(size))
  context.restore()
}
