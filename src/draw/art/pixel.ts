import type { BoardLayout } from '../layout.ts'

/**
 * Pixel-art characters, drawn from a picture written out as letters.
 *
 * Each character is a 48 x 48 grid of letters, one per cell, and a table
 * saying which colour each letter is. `.` is an empty cell. A character file
 * holds only its own grid, colours and faces; everything that is the same for
 * all of them - repainting cells for a face, flashing red when bitten, turning
 * letters into a picture, keeping each picture once built, and placing it on
 * its Square at the one size every character shares - lives here.
 *
 * Written out as letters rather than kept as image files, so a face can
 * repaint single cells and the game still opens from `file://`.
 */

/** Cells across and down every character grid. */
export const SIZE = 48

/** Rows of letters, `SIZE` long, `SIZE` of them. */
export type Grid = readonly string[]

/** Which colour each letter is. */
export type Ink = Readonly<Record<string, string>>

/** One cell to repaint: [row, column, letter]. */
export type Cell = readonly [row: number, column: number, ink: string]

/** A box of cells, as [first row, last row, first column, last column]. */
export type Box = readonly [top: number, bottom: number, left: number, right: number]

/** A grid being changed, one cell at a time. */
export type Canvas = string[][]

/** Where the drawing actually is inside its grid. */
export interface Drawn {
  readonly left: number
  readonly right: number
  readonly bottom: number
}

/** The first and last inked column, and the last inked row, of a grid. */
export function drawnPart(grid: Grid): Drawn {
  let left = SIZE
  let right = -1
  let bottom = -1
  grid.forEach((line, row) => {
    for (let column = 0; column < line.length; column++) {
      if (line[column] === '.') continue
      left = Math.min(left, column)
      right = Math.max(right, column)
      bottom = row
    }
  })
  return { left, right, bottom }
}

/** A changeable copy of a grid. */
export function copy(grid: Grid): Canvas {
  return grid.map((line) => [...line])
}

/** Repaints the given cells; any that fall outside the grid are skipped. */
export function paint(canvas: Canvas, cells: readonly Cell[]): void {
  for (const [row, column, ink] of cells) {
    const line = canvas[row]
    if (line !== undefined && column >= 0 && column < SIZE) line[column] = ink
  }
}

/**
 * Repaints, inside the boxes, only cells of the given letters, as `fill`.
 * Used to clear eyes and a mouth before another face is drawn. Only those
 * letters are touched, not everything in the box: a box that reaches a cheek
 * would otherwise punch a hole in it.
 */
export function wipe(canvas: Canvas, boxes: readonly Box[], letters: ReadonlySet<string>, fill: string): void {
  for (const [top, bottom, left, right] of boxes) {
    for (let row = top; row <= bottom; row++) {
      for (let column = left; column <= right; column++) {
        const line = canvas[row]
        if (line !== undefined && letters.has(line[column] ?? '')) line[column] = fill
      }
    }
  }
}

/** The red a character flashes when a Zombie bites it. */
const FLASH = [255, 48, 48] as const
/** How far towards that red a fresh bite takes every colour; the rest still shows. */
const FLASH_MOST = 0.6
/** Strengths a flash is drawn at, so only a few pictures of each face are built. */
const FLASH_LEVELS = 4

/**
 * A flash of strength 0 to 1 as a whole level from 0 to `FLASH_LEVELS`, for
 * keying pictures: 0 is no flash at all.
 */
export function flashLevel(flash: number): number {
  return Math.ceil(Math.max(0, Math.min(1, flash)) * FLASH_LEVELS)
}

function towardsFlash(colour: string, level: number): string {
  if (level <= 0 || !/^#[0-9a-f]{6}$/i.test(colour)) return colour
  const t = (level / FLASH_LEVELS) * FLASH_MOST
  const channels = [1, 3, 5].map((at, i) => {
    const from = parseInt(colour.slice(at, at + 2), 16)
    return Math.round(from + ((FLASH[i] ?? from) - from) * t)
  })
  return `rgb(${channels.join(', ')})`
}

/**
 * Turns a finished grid into a picture, one canvas pixel per cell. `flash` is
 * a level from `flashLevel`: every colour is pulled towards red by it, so a
 * bitten character flashes red and fades back as the level drops. Letters in
 * `unflashed` (sparkles round a character, not the character) keep their colour.
 */
export function render(
  canvas: Canvas,
  ink: Ink,
  flash = 0,
  unflashed: ReadonlySet<string> = new Set(),
): HTMLCanvasElement {
  const picture = document.createElement('canvas')
  picture.width = SIZE
  picture.height = SIZE
  const context = picture.getContext('2d')
  if (context !== null) {
    canvas.forEach((line, row) => {
      line.forEach((letter, column) => {
        const colour = ink[letter]
        if (colour !== undefined) {
          context.fillStyle = unflashed.has(letter) ? colour : towardsFlash(colour, flash)
          context.fillRect(column, row, 1, 1)
        }
      })
    })
  }
  return picture
}

/**
 * Keeps every picture once it is built, by key, so a lawn full of one plant
 * costs one image copy each per frame.
 */
export function pictures(build: (key: string) => HTMLCanvasElement): (key: string) => HTMLCanvasElement {
  const kept = new Map<string, HTMLCanvasElement>()
  return (key) => {
    let found = kept.get(key)
    if (found === undefined) {
      found = build(key)
      kept.set(key, found)
    }
    return found
  }
}

/** Where a character's picture goes on screen, and how big one cell is. */
export interface Placement {
  readonly cell: number
  readonly left: number
  readonly top: number
  readonly size: number
}

/**
 * Cells across one Square. Every character is drawn at this one size, so one
 * cell - and the outline, which is one cell thick - is the same on all of
 * them. A character 36 cells wide fills about 0.85 of its Square.
 */
const CELLS_PER_SQUARE = 42

/** How big one cell is on screen. */
export function cellSize(board: BoardLayout): number {
  return board.squareWidth / CELLS_PER_SQUARE
}

/** Where on screen a character's feet stand: just above its Square's bottom edge. */
function ground(board: BoardLayout, centre: { x: number; y: number }): number {
  return centre.y + board.squareHeight * 0.47
}

/**
 * How far below the middle of its Square a given row of a character's grid
 * is drawn, before any bob. For lining things up with the drawing, such as
 * where a pea leaves a snout.
 */
export function rowDrop(board: BoardLayout, drawn: Drawn, row: number): number {
  return board.squareHeight * 0.47 - (drawn.bottom + 1 - (row + 0.5)) * cellSize(board)
}

/**
 * Places a character on its Square, by its drawn part rather than the empty
 * margin round it: centred across the Square, standing on its ground line.
 * `dx` and `dy` shift it by whole cells, for bobbing and shuddering.
 */
export function place(
  board: BoardLayout,
  centre: { x: number; y: number },
  drawn: Drawn,
  dx = 0,
  dy = 0,
): Placement {
  const cell = cellSize(board)
  const middle = (drawn.left + drawn.right + 1) / 2
  return {
    cell,
    left: Math.round(centre.x - middle * cell + dx * cell),
    top: Math.round(ground(board, centre) - (drawn.bottom + 1) * cell + dy * cell),
    size: Math.round(cell * SIZE),
  }
}

/** Draws a picture where it was placed, with no smoothing, so the pixels stay sharp. */
export function blit(context: CanvasRenderingContext2D, picture: HTMLCanvasElement, at: Placement): void {
  context.save()
  context.imageSmoothingEnabled = false
  context.drawImage(picture, at.left, at.top, at.size, at.size)
  context.restore()
}
