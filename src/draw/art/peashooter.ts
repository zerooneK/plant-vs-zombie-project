import { PEASHOOTER_FIRE_INTERVAL } from '../../game/balance.ts'
import type { Planted } from '../../game/board.ts'
import type { BoardLayout } from '../layout.ts'
import { blit, copy, drawnPart, flashLevel, pictures, place, render, rowDrop } from './pixel.ts'
import type { Grid, Ink } from './pixel.ts'

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

/** Steps between one bob of the head and the next. */
const BOB_STEPS = 30
/** Steps after a shot during which the Peashooter sits back by a cell. */
const RECOIL_STEPS = 8

/**
 * The picture is the only face: being eaten shows as a shudder and a red
 * flash, not a different face, and never as a bite out of the head - a
 * Peashooter that is being eaten still fires, and a snout bitten away would
 * have peas coming out of nothing.
 */
const sprite = pictures((flash) => render(copy(FRONT), INK, Number(flash)))

/**
 * Whether the Peashooter has fired in the last few steps. The countdown is
 * set to the whole interval at the moment of a shot and runs down from there;
 * a plant that has not shot yet sits at zero, which is not a recoil.
 */
export function recoiling(plant: Planted): boolean {
  return plant.stepsUntilShot > PEASHOOTER_FIRE_INTERVAL - RECOIL_STEPS
}

/** How far below the middle of its Row a pea leaving the snout is drawn. */
export function muzzleDrop(board: BoardLayout): number {
  return rowDrop(board, DRAWN, MUZZLE_ROW)
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
  // A shot sets it back a cell, then it settles.
  const recoil = recoiling(plant) ? -1 : 0

  const at = place(board, centre, DRAWN, shake + recoil, bob)
  blit(context, sprite(String(flashLevel(flash))), at)
}
