import type { Planted } from '../../game/board.ts'
import type { BoardLayout } from '../layout.ts'

/**
 * The Sunflower, pixel for pixel from the front view on the user's character
 * sheet.
 *
 * Written out as a grid of letters rather than built from shapes, because the
 * point is to match one particular drawing: shapes can only approximate it,
 * and a grid is the drawing. The sheet is AI-made art scaled down to about
 * four screen pixels per art pixel, so the grid was read off it cell by cell -
 * sampled, cleaned of the blur round its edges, and finished by hand where the
 * blur had eaten detail (the smile, the eye shine). It is 33 by 31 and not the
 * 48 by 48 the sheet's caption says, because 33 by 31 is what the picture
 * actually holds.
 *
 * Every picture the Sunflower can show is built once and kept, so a lawn full
 * of Sunflowers costs one image copy each per frame.
 */

/** The front view, as drawn. `.` is empty; every other letter is in `INK`. */
const FRONT: readonly string[] = [
  '.................................',
  '.................KKKKK...........',
  '............KKK.KYYYYYK..........',
  '...........KYYYKYYYYYYKK.........',
  '..........KYYYORYYYYYYYK.........',
  '..........KYYYOOYYYYYYYK.........',
  '....KKKKKKRYYYOOYYOYYYORKKKKK....',
  '...KOYYYYYROYYOOYYOYYYORYYYYOK...',
  '...KOYYYYYOOOYOOOOOOOORRYYYYYOK..',
  '...KOYYYYYORRROBBBBBRRRYYYYYYOK..',
  '...KOYYYYYORbbbbbbbbbBRYYYYYYOK..',
  '....KOYYYOObbBBBBBBBBBBbYYYYRKK..',
  '...KOOOOOOOBBBBBBBBBBBBbYYOORK...',
  '..KKOOOOOObBBBBBBBBBBBBbOOORRRK..',
  '.KRYYYYYRbbBBKWBBBBBBKWBBBORYYYK.',
  '.KRYYYYOObbBKKWBBBBBKKWBBOOYYYYK.',
  '.KRYYYOORbbBKKWBBBBBKKWBBOOOYYYK.',
  '.KRROOOORbbBKKWBBBBBKKWBBOOOOOOK.',
  '..KKRRRRRRBPPPBBDBBDBPPPBRRRRKK..',
  '....KOOOOOPPPPBBBDDBBPPPPOOOK....',
  '....KYYYYYOBBBBBBBBBBBOYYYYYK....',
  '....KYYYYYObbbbbbbbbbbYYYYYYK....',
  '....KOOOOORbbbbbbbbbbOOOOOOK.....',
  '....KRRRRRRRRRbbbbbbOOOOOOK......',
  '...KggggggggggOYYYOggggggK.......',
  '....KggGGGGGGGggGGGGGGGggK.......',
  '.....KGGGggGGGGgGGggGGGGGK.......',
  '......KKKgGGGGgGGGggGGGGK........',
  '.......KKGGGGGgKKKgGGGGGK........',
  '.......KKGGGggK...KGGGGKK........',
  '........KKKKKKK..KKKKKKK.........',
]

const WIDTH = 33
const HEIGHT = 31

/**
 * The colours, taken from the picture itself rather than the sheet's printed
 * palette: the printed swatches are not quite what the drawing uses, and the
 * drawing is what is being matched.
 */
const INK: Readonly<Record<string, string>> = {
  K: '#181813', // outline
  Y: '#fccf41', // petal
  O: '#f5a31f', // petal shade
  R: '#de6e14', // petal deep shade
  B: '#904a2d', // face
  b: '#693c2c', // face shade
  D: '#392517', // mouth
  G: '#54a53f', // leaf
  g: '#296f2f', // leaf shade
  P: '#f09a8a', // cheek
  W: '#ffffff', // eye shine
  /**
   * Sparkles when Sun is being made. Deliberately not the Sun's own core
   * colour, `#fff9c4`, which nothing else may draw: the headless checks find
   * Sun on the lawn by looking for exactly that colour.
   */
  L: '#fff3c7',
}

/** The middle of the face, in grid cells, for the glow. */
const FACE_COLUMN = 17
const FACE_ROW = 15

/** Where a bite is taken: the right of the head, the side Zombies come from. */
const BITE_COLUMN = 31
const BITE_ROW = 15
/** A bite's radius in cells when nothing at all is left. */
const BITE_MAX = 10
/** Rows from here down are leaves, and a Zombie bites the head, not the leaves. */
const LEAVES_ROW = 23

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

type Cell = readonly [row: number, column: number, ink: string]

/** The eyes and mouth as drawn, which the other two faces paint over. */
const FACE_CELLS: readonly Cell[] = [
  [14, 13, 'B'], [14, 14, 'B'], [14, 21, 'B'], [14, 22, 'B'],
  ...[15, 16, 17].flatMap((row): Cell[] => [
    [row, 12, 'B'], [row, 13, 'B'], [row, 14, 'B'],
    [row, 20, 'B'], [row, 21, 'B'], [row, 22, 'B'],
  ]),
  [18, 16, 'B'], [18, 19, 'B'], [19, 17, 'B'], [19, 18, 'B'],
]

/**
 * What each face changes. The happy face is the drawing as it is; the other
 * two wipe its eyes and mouth and draw their own, after the sheet's
 * "making energy" and "being hit" faces.
 */
const MOODS: Readonly<Record<SunflowerMood, readonly Cell[]>> = {
  happy: [],
  glowing: [
    ...FACE_CELLS,
    // Eyes shut in a grin: two little arches.
    [15, 12, 'K'], [15, 13, 'K'], [16, 11, 'K'], [16, 14, 'K'],
    [15, 20, 'K'], [15, 21, 'K'], [16, 19, 'K'], [16, 22, 'K'],
    // Mouth open wide, tongue showing.
    [18, 16, 'D'], [18, 17, 'D'], [18, 18, 'D'], [18, 19, 'D'],
    [19, 16, 'D'], [19, 17, 'P'], [19, 18, 'P'], [19, 19, 'D'],
    [20, 17, 'D'], [20, 18, 'D'],
    // Sparkles in the empty corners.
    ...([[2, 3], [2, 28], [26, 2], [25, 29]] as const).flatMap(([row, column]): Cell[] => [
      [row, column, 'L'], [row - 1, column, 'L'], [row + 1, column, 'L'],
      [row, column - 1, 'L'], [row, column + 1, 'L'],
    ]),
  ],
  hurt: [
    ...FACE_CELLS,
    // Eyes squeezed shut, "> <".
    [14, 12, 'K'], [15, 13, 'K'], [16, 12, 'K'],
    [14, 21, 'K'], [15, 20, 'K'], [16, 21, 'K'],
    // An open "ow".
    [18, 17, 'D'], [18, 18, 'D'],
    [19, 16, 'D'], [19, 17, 'P'], [19, 18, 'P'], [19, 19, 'D'],
    [20, 17, 'D'], [20, 18, 'D'],
  ],
}

function inked(grid: readonly (readonly string[])[], row: number, column: number): boolean {
  const ink = grid[row]?.[column]
  return ink !== undefined && ink !== '.' && ink !== 'L'
}

/**
 * Clears a bite out of the right of the head, then outlines the edge the bite
 * leaves, so a bitten Sunflower still has its dark line all the way round.
 */
function takeBite(grid: string[][], radius: number): void {
  if (radius <= 0) return
  const bitten: [number, number][] = []
  for (let row = 0; row < LEAVES_ROW; row++) {
    for (let column = 0; column < WIDTH; column++) {
      if (Math.hypot(row - BITE_ROW, column - BITE_COLUMN) < radius && inked(grid, row, column)) {
        bitten.push([row, column])
      }
    }
  }
  for (const [row, column] of bitten) {
    grid[row]![column] = '.'
  }
  for (const [row, column] of bitten) {
    for (const [r, c] of [[row + 1, column], [row - 1, column], [row, column + 1], [row, column - 1]] as const) {
      if (inked(grid, r, c)) grid[r]![c] = 'K'
    }
  }
}

function build(mood: SunflowerMood, bite: number): HTMLCanvasElement {
  const grid = FRONT.map((line) => [...line])
  for (const [row, column, ink] of MOODS[mood]) {
    const line = grid[row]
    if (line !== undefined && column >= 0 && column < WIDTH) line[column] = ink
  }
  takeBite(grid, bite)

  const sprite = document.createElement('canvas')
  sprite.width = WIDTH
  sprite.height = HEIGHT
  const context = sprite.getContext('2d')
  if (context !== null) {
    grid.forEach((line, row) => {
      line.forEach((letter, column) => {
        const colour = INK[letter]
        if (colour !== undefined) {
          context.fillStyle = colour
          context.fillRect(column, row, 1, 1)
        }
      })
    })
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
  // Rounded to whole cells, so a bite grows a cell at a time and only a
  // dozen pictures of a bitten Sunflower are ever built.
  const bite = Math.round(BITE_MAX * (1 - health))

  const width = board.squareWidth * 1.02
  const cell = width / WIDTH
  const height = cell * HEIGHT

  // Each Sunflower bobs on its own beat, worked out from its Square, so a row
  // of them sways rather than marching in step.
  const phase = (plant.square.row * 7 + plant.square.column * 11) * 5
  const bob = Math.floor((tick + phase) / BOB_STEPS) % 2 === 0 ? 0 : cell
  // A Sunflower being eaten shudders instead of bobbing.
  const shake = mood === 'hurt' ? (Math.floor(tick / 4) % 2 === 0 ? -cell : cell) : 0

  const left = Math.round(centre.x - width / 2 + shake)
  const top = Math.round(centre.y + board.squareHeight * 0.47 - height + bob)

  if (mood === 'glowing') {
    // A soft light behind the head, pulsing. Kept well short of opaque, so the
    // lawn under it can never blend to the Sun's own core colour.
    const glowX = left + (FACE_COLUMN + 0.5) * cell
    const glowY = top + (FACE_ROW + 0.5) * cell
    const radius = 17 * cell
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
  context.drawImage(sprite(mood, bite), left, top, Math.round(width), Math.round(height))
  context.restore()
}
