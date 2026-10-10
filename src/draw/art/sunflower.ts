import type { Planted } from '../../game/board.ts'
import type { BoardLayout } from '../layout.ts'

/**
 * The Sunflower, from the user's 1254 x 1254 front-view picture, shrunk to
 * the 48 x 48 it was drawn at.
 *
 * The picture is pixel art enlarged about 26 times, with its edges softened by
 * the enlarging. It was shrunk by reading the middle of each 26-pixel cell, so
 * the soft edges between cells never mix into a colour, with the grid lined up
 * where the cells came out most even. The white background and the grey
 * shadow on the ground were cleared, since the lawn is the ground here; the
 * colours were grouped into the handful the drawing really uses; the eye
 * shines were set back to white and the tongue back to red, where grouping had
 * merged them into their neighbours.
 *
 * Written out as letters rather than kept as an image file, so the faces
 * below can repaint single cells and the game still opens from `file://`.
 *
 * Every picture the Sunflower can show is built once and kept, so a lawn full
 * of Sunflowers costs one image copy each per frame.
 */

/** The front view, as drawn. `.` is empty; every other letter is in `INK`. */
const FRONT: readonly string[] = [
  '................................................',
  '................................................',
  '................................................',
  '................................................',
  '................................................',
  '................................................',
  '......................aaaa......................',
  '.....................accccgja...................',
  '....................acnnncfla...................',
  '....................acncccclfa..................',
  '..............aaaa..jcccccccfa.jaa..............',
  '..............acccaaecccccccfaaeeba.............',
  '...........aa.gcncpbicccccoclacccciaa...........',
  '..........accgmccccogcffccfeifcccfbcca..........',
  '..........acnccfccccgefffffegcccfeecca..........',
  '..........apccclccofeeffffegfccffecncoa.........',
  '...........bccccecffejjjjjaaeeffeccccoa.........',
  '........aaaafcfffffajjbbbbbmjmfiiccccfa.........',
  '.......afccceffffjmggbbbbbbibgmffoccffa.........',
  '.......acccpfifffgiiibbbbbbibbbgfpcofg..........',
  '.......afnccpligagiiibbbbbbbbbbajfffmmma........',
  '.......afcccccfeabbbbbbbbbbjabbgaiegfccpa.......',
  '.......accccpfebgbbaabbbbbbbaabbgagffccnfa......',
  '........afccfffagbbaabbbbbbaWabbgaefccccfa......',
  '.........gfffffabbaWagbbbbbaaabbgaeeeccfea......',
  '........apfflijagbaaagbbbbbaaakkgaiefffeg.......',
  '.......afcffeeeagbjaammarabbbkkkgageffeim.......',
  '.......apcccffeagkkjjbbrrjbbbbkkgaegbiea........',
  '.......apcccccfeakkkbbbaabbbbbbgalffmjg.........',
  '........jlcccffgagbbbbbbbbbbbbgaelfcfa..........',
  '.........aefegeeeeagggbbbbbbjjalfccccfa.........',
  '..........aaafcefceaaajjjjjjjffifccfcla.........',
  '............accfccejeeffejeeffclafffga..........',
  '............aeccceaaefccfaefccclaaaaa...........',
  '.............afcladdacncpadefcaaaa..............',
  '..............aaahhddappaddaaadddda.............',
  '.............addhhhhddaadddadddhhdda............',
  '............ahhhhhhhddaddddadhhhhhhda...........',
  '............addhhhdhddaaaaaddhhhdhhda...........',
  '.............adhhddddda...addddhhdhda...........',
  '..............adddddaa.....addddddda............',
  '...............aaa...........aaaa.a.............',
  '................................................',
  '................................................',
  '................................................',
  '................................................',
  '................................................',
  '................................................',
]

const SIZE = 48

/** The colours the drawing uses, read from it. */
const INK: Readonly<Record<string, string>> = {
  a: '#311610', // outline, eyes
  j: '#491e13', // outline, softer
  m: '#622514', // mouth and face edge
  g: '#7e3318', // face shade
  b: '#964628', // face
  i: '#bf531b', // face light
  e: '#f5780e', // petal deep shade
  l: '#f98c11', // petal shade
  f: '#fda518', // petal
  p: '#fcb41e', // petal
  o: '#fdc424', // petal light
  c: '#fed22b', // petal lighter
  n: '#fef5a9', // petal highlight
  d: '#327b3b', // leaf shade
  h: '#82c23b', // leaf
  k: '#f4846b', // cheek
  r: '#e64e51', // tongue
  W: '#ffffff', // eye shine
  /**
   * Sparkles when Sun is being made. Deliberately not the Sun's own core
   * colour, `#fff9c4`, which nothing else may draw: the headless checks find
   * Sun on the lawn by looking for exactly that colour.
   */
  L: '#fff3c7',
}

/** Where the drawing actually is inside its 48 x 48, so it is sized and placed by that. */
const DRAWN_LEFT = 7
const DRAWN_RIGHT = 41
const DRAWN_BOTTOM = 41

/** The middle of the face, in cells, for the glow. */
const FACE_COLUMN = 24
const FACE_ROW = 24

/** Where a bite is taken: the right of the head, the side Zombies come from. */
const BITE_COLUMN = 42
const BITE_ROW = 24
/** A bite's radius in cells when nothing at all is left. */
const BITE_MAX = 14
/** Rows from here down are leaves, and a Zombie bites the head, not the leaves. */
const LEAVES_ROW = 33

/**
 * The three faces this game has a reason to show. Turn-arounds, walking and
 * shooting are left out: a Sunflower here stands still, faces the Zombies,
 * and fires nothing.
 */
export type SunflowerMood = 'happy' | 'glowing' | 'hurt'

/** How long before its Sun appears that a Sunflower starts to glow. */
const GLOW_STEPS = 90
/** Steps between one bob of the head and the next. */
const BOB_STEPS = 30

type Cell = readonly [row: number, column: number, ink: string]

function block(rows: readonly number[], columns: readonly number[], ink: string): Cell[] {
  return rows.flatMap((row) => columns.map((column): Cell => [row, column, ink]))
}

/** The drawing's eyes and mouth, wiped to face so another face can be drawn. */
const WIPE: readonly Cell[] = [
  ...block([22, 23, 24, 25, 26, 27], [18, 19, 20, 21], 'b'),
  ...block([22, 23, 24, 25], [27, 28, 29], 'b'),
  ...block([26, 27, 28], [21, 22, 23, 24, 25], 'b'),
]

/**
 * What each face changes. The happy face is the drawing as it is; the other
 * two wipe its eyes and mouth and draw their own.
 */
const MOODS: Readonly<Record<SunflowerMood, readonly Cell[]>> = {
  happy: [],
  glowing: [
    ...WIPE,
    // Eyes shut in a grin: two little arches.
    [24, 17, 'a'], [23, 18, 'a'], [23, 19, 'a'], [23, 20, 'a'], [24, 21, 'a'],
    [24, 26, 'a'], [23, 27, 'a'], [23, 28, 'a'], [23, 29, 'a'], [24, 30, 'a'],
    // Mouth open wide.
    [26, 22, 'a'], [26, 23, 'a'], [26, 24, 'a'], [26, 25, 'a'],
    [27, 22, 'a'], [27, 23, 'r'], [27, 24, 'r'], [27, 25, 'a'],
    [28, 23, 'a'], [28, 24, 'a'],
    // Sparkles in the empty corners.
    ...([[4, 9], [4, 39], [37, 5], [36, 43]] as const).flatMap(([row, column]): Cell[] => [
      [row, column, 'L'], [row - 1, column, 'L'], [row + 1, column, 'L'],
      [row, column - 1, 'L'], [row, column + 1, 'L'],
    ]),
  ],
  hurt: [
    ...WIPE,
    // Eyes squeezed shut, "> <".
    [22, 18, 'a'], [23, 19, 'a'], [24, 20, 'a'], [25, 19, 'a'], [26, 18, 'a'],
    [22, 29, 'a'], [23, 28, 'a'], [24, 27, 'a'], [25, 28, 'a'], [26, 29, 'a'],
    // An open "ow".
    [26, 23, 'a'], [26, 24, 'a'],
    [27, 22, 'a'], [27, 23, 'r'], [27, 24, 'r'], [27, 25, 'a'],
    [28, 23, 'a'], [28, 24, 'a'],
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
    for (let column = 0; column < SIZE; column++) {
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
      if (inked(grid, r, c)) grid[r]![c] = 'a'
    }
  }
}

function build(mood: SunflowerMood, bite: number): HTMLCanvasElement {
  const grid = FRONT.map((line) => [...line])
  for (const [row, column, ink] of MOODS[mood]) {
    const line = grid[row]
    if (line !== undefined && column >= 0 && column < SIZE) line[column] = ink
  }
  takeBite(grid, bite)

  const sprite = document.createElement('canvas')
  sprite.width = SIZE
  sprite.height = SIZE
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
  // Rounded to whole cells, so a bite grows a cell at a time and only fifteen
  // pictures of a bitten Sunflower are ever built.
  const bite = Math.round(BITE_MAX * (1 - health))

  // Sized by the drawing, not by the empty margin round it: the drawn part is
  // as wide as the Square.
  const cell = (board.squareWidth * 1.02) / (DRAWN_RIGHT - DRAWN_LEFT + 1)
  const size = cell * SIZE

  // Each Sunflower bobs on its own beat, worked out from its Square, so a row
  // of them sways rather than marching in step.
  const phase = (plant.square.row * 7 + plant.square.column * 11) * 5
  const bob = Math.floor((tick + phase) / BOB_STEPS) % 2 === 0 ? 0 : cell
  // A Sunflower being eaten shudders instead of bobbing.
  const shake = mood === 'hurt' ? (Math.floor(tick / 4) % 2 === 0 ? -cell : cell) : 0

  const drawnMiddle = (DRAWN_LEFT + DRAWN_RIGHT + 1) / 2
  const left = Math.round(centre.x - drawnMiddle * cell + shake)
  const top = Math.round(centre.y + board.squareHeight * 0.47 - (DRAWN_BOTTOM + 1) * cell + bob)

  if (mood === 'glowing') {
    // A soft light behind the head, pulsing. Kept well short of opaque, so the
    // lawn under it can never blend to the Sun's own core colour.
    const glowX = left + (FACE_COLUMN + 0.5) * cell
    const glowY = top + (FACE_ROW + 0.5) * cell
    const radius = 22 * cell
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
