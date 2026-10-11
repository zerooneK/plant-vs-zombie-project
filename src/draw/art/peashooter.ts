import { PEASHOOTER_FIRE_INTERVAL } from '../../game/balance.ts'
import type { Planted } from '../../game/board.ts'
import type { BoardLayout } from '../layout.ts'
import { blit, copy, drawnPart, flashLevel, pictures, place, render, rowDrop } from './pixel.ts'
import type { Grid, Ink, Placement } from './pixel.ts'

/**
 * The Peashooter, from the user's 1254 x 1254 front-view picture, shrunk to
 * the 48 x 48 it was drawn at.
 *
 * The picture is pixel art enlarged about 25 times (24.9 across, 24.7 down),
 * with its edges softened by the enlarging. It was shrunk by reading the
 * middle of each cell, so the soft edges between cells never mix into a
 * colour, with the grid lined up where the cells came out most even. The white
 * background and the grey shadow on the ground were cleared, since the lawn is
 * the ground here; the colours were grouped into the handful the drawing really
 * uses. White cells shut inside the outline (the eye shines) were kept white by
 * telling them apart from the background, which can be reached from the
 * picture's edge and they cannot.
 *
 * Grids, flashing and placing are shared by every pixel-art character;
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
  '................................................',
  '................................................',
  '................................................',
  '........aaaaaa..................................',
  '.......ajjklnaa.................................',
  '.......ahjjkkkia......aaaaaa....................',
  '.......agjhijjjga...aajlnnljaa..................',
  '........aiiieghga..ajllnnnlllja.................',
  '........afhhhefgfaakllnllllllljaa...............',
  '.........efhhheegaknnllllllllllja...............',
  '.........affffffajlnnllllllllllla...............',
  '..........afffffallllllllllllllaja..aaaa........',
  '...........aaaaailkllllaalllllalla.anllla.......',
  '.............aeajjklllllaaalllaWeaanlliila......',
  '............ahhajjjlllllaWalllaWajnlkddfjla.....',
  '............aifajjjjlllaaaalllaaalnldddffka.....',
  '............affahjjjlllaaaalllaajllldddffka.....',
  '.............aaafjjjjlllaallllkjgjjldddffla.....',
  '................agjjjllllllllljjgjjldddffla.....',
  '................afgjjjllllllljjjagjldddgika.....',
  '.................agjjjjjllljjjjgaahllddgla......',
  '..................agghjjjjjjjjgaa.agjllka.......',
  '...................afggjjjjjjea....aaaaa........',
  '....................aefggggaaa..................',
  '.....................aaaaaaa....................',
  '......................afffh.....................',
  '...................a..ahgd......................',
  '...............aaaaea.ajha..aaaaa...............',
  '..............afhjjhgaajjajafiihfa..............',
  '.............afhiiffhgeajeahjjjjjfa.............',
  '.............afggfjkjjhegefgfgkkjha.............',
  '.............afffjlkjjjgafggggikjjga............',
  '..............afhjjjfgggaffgggeejjha............',
  '...............ahjigggfaaaefgggehhga............',
  '................ahgfeaa...ieffffffa.............',
  '.................aaaa.......aaaaa...............',
  '................................................',
  '................................................',
  '................................................',
  '................................................',
  '................................................',
  '................................................',
]

/** The colours the drawing uses, read from it. */
const INK: Ink = {
  a: '#2b1810', // outline, eyes
  d: '#1e2f18', // inside of the snout
  e: '#295128', // leaf, darkest shade
  f: '#297333', // leaf shade
  g: '#3e9234', // leaf, head shade
  h: '#56a631', // leaf
  i: '#6eb531', // leaf light
  j: '#85c030', // head shade, leaf light
  k: '#acd53b', // head, a little shaded
  l: '#cae346', // head
  n: '#f4f8a2', // highlight
  W: '#ffffff', // eye shine
}

/** Where the drawing actually is inside its 48 x 48, so it is sized and placed by that. */
const DRAWN = drawnPart(FRONT)

/** The middle row of the snout's dark opening, where a pea comes out. */
const MUZZLE_ROW = 23

/**
 * The last row of the head. The head is drawn apart from the stem and leaves
 * below it, so it can lunge and kick back while the plant stays planted.
 */
const NECK_ROW = 30

/** Steps between one bob of the head and the next. */
const BOB_STEPS = 30

/**
 * A shot, from the user's three-frame sheet: aim, fire, kick back. Each part
 * is a number of steps around the moment the pea leaves; the whole of it fits
 * well inside one firing interval.
 */
/** Steps before a shot during which the Peashooter takes aim, a glint over its snout. */
const AIM_STEPS = 14
/** Steps after a shot during which the head lunges forward and the pea streaks off. */
const FIRE_STEPS = 5
/** Steps after the lunge during which the head is thrown back by the shot. */
const KICK_STEPS = 6
/** Steps after that during which it comes half way back, before standing still. */
const SETTLE_STEPS = 6

export type Pose = 'still' | 'aim' | 'fire' | 'kick' | 'settle'

/**
 * Where in a shot the Peashooter is. The countdown is set to the whole
 * interval at the moment of a shot and runs down from there; a plant with
 * nothing to shoot at waits at zero, which is standing still, not aiming.
 */
export function pose(plant: Planted): Pose {
  const sinceShot = PEASHOOTER_FIRE_INTERVAL - plant.stepsUntilShot
  if (plant.stepsUntilShot === 0) return 'still'
  if (sinceShot < FIRE_STEPS) return 'fire'
  if (sinceShot < FIRE_STEPS + KICK_STEPS) return 'kick'
  if (sinceShot < FIRE_STEPS + KICK_STEPS + SETTLE_STEPS) return 'settle'
  if (plant.stepsUntilShot <= AIM_STEPS) return 'aim'
  return 'still'
}

/** How far the head is moved, in cells, in each pose. */
const HEAD_SHIFT: Readonly<Record<Pose, readonly [dx: number, dy: number]>> = {
  still: [0, 0],
  aim: [0, 0],
  fire: [1, 0],
  kick: [-2, -1],
  settle: [-1, 0],
}

/**
 * Marks drawn round the Peashooter, not part of it, so they never flash.
 * Each is a list of [row, column] cells in the grid's own cells, and may run
 * past its edge: the streak is in front of the snout.
 */
type Marks = readonly (readonly [row: number, column: number])[]

/** Lays a run of cells along a row. */
function dash(row: number, from: number, to: number): Marks {
  return Array.from({ length: to - from + 1 }, (_, i) => [row, from + i] as const)
}

/** Aiming: two short slanted strokes over the snout, as in the sheet. */
const GLINT: Marks = [
  [11, 42], [12, 42], [12, 41], [13, 41],
  [13, 45], [14, 45], [14, 44], [15, 44], [15, 43],
]
const GLINT_INK = '#ffd54f'

/** Firing: streaks in front of the snout, behind the pea. */
const STREAK: Marks = [...dash(18, 46, 50), ...dash(22, 45, 53), ...dash(23, 45, 53), ...dash(27, 46, 50)]
const STREAK_LIGHT: Marks = [...dash(20, 48, 50), ...dash(25, 48, 50)]
const STREAK_INK = '#dcedc8'
const STREAK_LIGHT_INK = '#ffffff'

/** Kicking back: a spark behind the head and dashes off both sides, as in the sheet. */
const KICK: Marks = [
  // A small plus behind the head.
  [21, 11], [22, 10], [22, 11], [22, 12], [23, 11],
  // Two strokes low behind it.
  [26, 13], [27, 12], [28, 12], [29, 11],
  [29, 15], [30, 14], [31, 14],
  // Three dashes off the front.
  ...dash(17, 46, 48), ...dash(22, 47, 49), ...dash(27, 46, 48),
]
const KICK_INK = '#ffa726'

/**
 * The picture is the only face: being eaten shows as a shudder and a red
 * flash, not a different face, and never as a bite out of the head - a
 * Peashooter that is being eaten still fires, and a snout bitten away would
 * have peas coming out of nothing.
 *
 * Built in two parts, the head and what holds it up. The stem reaches one row
 * up behind the head, so a head thrown back and up never shows a gap at the neck.
 */
const HEAD: Grid = FRONT.map((line, row) => (row <= NECK_ROW ? line : '.'.repeat(line.length)))
const BASE: Grid = FRONT.map((line, row) => (row > NECK_ROW ? line : row === NECK_ROW ? (FRONT[NECK_ROW + 1] ?? line) : '.'.repeat(line.length)))
const head = pictures((flash) => render(copy(HEAD), INK, Number(flash)))
const base = pictures((flash) => render(copy(BASE), INK, Number(flash)))

/** How far below the middle of its Row a pea leaving the snout is drawn. */
export function muzzleDrop(board: BoardLayout): number {
  return rowDrop(board, DRAWN, MUZZLE_ROW)
}

function drawMarks(context: CanvasRenderingContext2D, at: Placement, marks: Marks, ink: string): void {
  context.fillStyle = ink
  for (const [row, column] of marks) {
    const left = Math.round(at.left + column * at.cell)
    const top = Math.round(at.top + row * at.cell)
    context.fillRect(left, top, Math.round(at.left + (column + 1) * at.cell) - left, Math.round(at.top + (row + 1) * at.cell) - top)
  }
}

export function drawPeashooterSprite(
  context: CanvasRenderingContext2D,
  plant: Planted,
  board: BoardLayout,
  centre: { x: number; y: number },
  tick: number,
  beingEaten: boolean,
  flash: number,
): void {
  // Each Peashooter bobs on its own beat, worked out from its Square, so a row
  // of them sways rather than marching in step.
  const phase = (plant.square.row * 7 + plant.square.column * 11) * 5
  const bob = Math.floor((tick + phase) / BOB_STEPS) % 2 === 0 ? 0 : 1
  // A Peashooter being eaten shudders instead of bobbing.
  const shake = beingEaten ? (Math.floor(tick / 4) % 2 === 0 ? -1 : 1) : 0
  const now = pose(plant)
  const [headX, headY] = HEAD_SHIFT[now]

  const key = String(flashLevel(flash))
  const at = place(board, centre, DRAWN, shake, bob)
  blit(context, base(key), at)
  const headAt = place(board, centre, DRAWN, shake + headX, bob + headY)
  blit(context, head(key), headAt)

  // A glint while aiming blinks, three steps on and three off, so it reads as a sparkle.
  if (now === 'aim' && Math.floor(plant.stepsUntilShot / 3) % 2 === 0) drawMarks(context, headAt, GLINT, GLINT_INK)
  if (now === 'fire') {
    drawMarks(context, headAt, STREAK, STREAK_INK)
    drawMarks(context, headAt, STREAK_LIGHT, STREAK_LIGHT_INK)
  }
  if (now === 'kick' || now === 'settle') drawMarks(context, headAt, KICK, KICK_INK)
}
