import type { Planted } from '../../game/board.ts'
import type { BoardLayout } from '../layout.ts'
import { blit, copy, drawnPart, flashLevel, paint, pictures, place, render, wipe } from './pixel.ts'
import type { Box, Cell, Grid, Ink } from './pixel.ts'

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
 * Grids, faces, bites and placing are shared by every pixel-art character;
 * see `pixel.ts`.
 */

/** The front view, as drawn. `.` is empty; every other letter is in `INK`. */
const FRONT: Grid = [
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
  '.......afcccccfeabjabbbbbbbjabbgaiegfccpa.......',
  '.......accccpfebgbbaabbbbbbbaabbgagffccnfa......',
  '........afccfffagbaWabbbbbbaWabbgaefccccfa......',
  '.........gfffffabbaaagbbbbbaaabbgaeeeccfea......',
  '........apfflijagbaaagbbbbbaaakkgaiefffeg.......',
  '.......afcffeeeagbbbbbbarabbbkkkgageffeim.......',
  '.......apcccffeagkkbbbbrrjbbbbkkgaegbiea........',
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

/** The colours the drawing uses, read from it. */
const INK: Ink = {
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
const DRAWN = drawnPart(FRONT)

/** The middle of the face, in cells, for the glow. */
const FACE_COLUMN = 24
const FACE_ROW = 24

/** Sparkles are round the Sunflower, not part of it, so they never flash red. */
const LOOSE = new Set(['L'])

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

/**
 * The boxes the drawing's eyes and mouth sit in, as [first row, last row,
 * first column, last column]. The two eyes are the same shape on purpose: in
 * the picture the left one hung a row lower and a row longer, onto the cheek,
 * which at this size reads as a mistake rather than a tilt, so the left eye
 * is the right eye copied across.
 */
const FACE_BOXES: readonly Box[] = [
  [21, 25, 18, 20],
  [21, 25, 27, 29],
  [26, 28, 21, 25],
]

/**
 * The inks of the eyes and mouth: the only cells a new face wipes, to plain
 * face, so that a box reaching a cheek never punches a hole in it.
 */
const FACE_INKS = new Set(['a', 'j', 'm', 'W', 'r'])

/**
 * What each face changes. The happy face is the drawing as it is; the other
 * two wipe its eyes and mouth (see `FACE_INKS`) and draw their own.
 */
const MOODS: Readonly<Record<SunflowerMood, readonly Cell[]>> = {
  happy: [],
  glowing: [
    // Fuller cheeks for the big grin.
    [26, 17, 'k'], [26, 18, 'k'], [27, 19, 'k'], [27, 29, 'k'],
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
    // Eyes squeezed shut, "> <".
    [21, 18, 'a'], [22, 19, 'a'], [23, 20, 'a'], [24, 19, 'a'], [25, 18, 'a'],
    [21, 29, 'a'], [22, 28, 'a'], [23, 27, 'a'], [24, 28, 'a'], [25, 29, 'a'],
    // An open "ow".
    [26, 23, 'a'], [26, 24, 'a'],
    [27, 22, 'a'], [27, 23, 'r'], [27, 24, 'r'], [27, 25, 'a'],
    [28, 23, 'a'], [28, 24, 'a'],
  ],
}

function build(key: string): HTMLCanvasElement {
  const [mood, flash] = key.split(':') as [SunflowerMood, string]
  const grid = copy(FRONT)
  if (mood !== 'happy') wipe(grid, FACE_BOXES, FACE_INKS, 'b')
  paint(grid, MOODS[mood])
  return render(grid, INK, Number(flash), LOOSE)
}

const sprite = pictures(build)

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
  tick: number,
  beingEaten: boolean,
  flash: number,
): void {
  const mood = sunflowerMood(plant, beingEaten)

  // Each Sunflower bobs on its own beat, worked out from its Square, so a row
  // of them sways rather than marching in step.
  const phase = (plant.square.row * 7 + plant.square.column * 11) * 5
  const bob = Math.floor((tick + phase) / BOB_STEPS) % 2 === 0 ? 0 : 1
  // A Sunflower being eaten shudders instead of bobbing.
  const shake = mood === 'hurt' ? (Math.floor(tick / 4) % 2 === 0 ? -1 : 1) : 0

  const at = place(board, centre, DRAWN, shake, bob)

  if (mood === 'glowing') {
    // A soft light behind the head, pulsing. Kept well short of opaque, so the
    // lawn under it can never blend to the Sun's own core colour.
    const glowX = at.left + (FACE_COLUMN + 0.5) * at.cell
    const glowY = at.top + (FACE_ROW + 0.5) * at.cell
    const radius = 22 * at.cell
    const pulse = 0.35 + 0.15 * Math.sin(tick / 6)
    const gradient = context.createRadialGradient(glowX, glowY, 0, glowX, glowY, radius)
    gradient.addColorStop(0, `rgba(255, 243, 199, ${pulse})`)
    gradient.addColorStop(1, 'rgba(255, 243, 199, 0)')
    context.fillStyle = gradient
    context.beginPath()
    context.arc(glowX, glowY, radius, 0, Math.PI * 2)
    context.fill()
  }

  blit(context, sprite(`${mood}:${flashLevel(flash)}`), at)
}
