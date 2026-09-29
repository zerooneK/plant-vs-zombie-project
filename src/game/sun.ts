import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  SQUARE_HEIGHT,
  centreX,
  centreY,
  type Point,
  type Square,
} from './board.ts'
import { nextBetween, type Random } from './random.ts'
import {
  SUN_AMOUNT,
  SUN_FALL_PER_STEP,
  SUN_HIT_RADIUS,
  SUN_LIFETIME,
  SUN_RADIUS,
} from './balance.ts'

/** A new piece of Sun, and the random state left behind after placing it. */
export interface SunFall {
  readonly random: Random
  readonly token: SunToken
}

/**
 * One piece of Sun, falling towards the lawn or lying on it.
 *
 * Its place is a point in the board's own units, so it does not care how big
 * the window is.
 */
export interface SunToken {
  /** Names this piece of Sun, so that "the same Sun" can be talked about. */
  readonly id: number
  readonly x: number
  readonly y: number
  /** Where it comes to rest. Never above where it starts, so it only falls. */
  readonly restingY: number
  readonly amount: number
  /** Steps of life left once it has landed. Spent Sun is lost, not banked. */
  readonly life: number
}

/** Has this Sun finished falling and settled on the lawn? */
export function isResting(token: SunToken): boolean {
  return token.y >= token.restingY
}

/** One step of falling, stopping at the place it comes to rest. */
export function fallSun(token: SunToken): SunToken {
  return { ...token, y: Math.min(token.y + SUN_FALL_PER_STEP, token.restingY) }
}

/**
 * One step of waiting. Life is only spent once the Sun has landed, so a piece
 * of Sun that spends its whole life in the air still gets its full time on the
 * lawn rather than being lost on the way down.
 */
export function spendLife(token: SunToken): SunToken {
  return isResting(token) ? { ...token, life: token.life - 1 } : token
}

/** Has this Sun waited out its whole life on the lawn and been lost? */
export function isSpent(token: SunToken): boolean {
  return isResting(token) && token.life <= 0
}

/**
 * A new piece of Sun at the top of the lawn, on its way down to a resting
 * place chosen by the seed. The whole token stays inside the board, so Sun
 * never appears off in the margin where it could not be clicked.
 *
 * It always comes down at least one Row before settling. Letting it settle
 * close to where it started looked like a bug rather than like Sun falling,
 * because on some seeds it simply appeared in place and never moved.
 */
export function spawnSun(id: number, random: Random): SunFall {
  const across = nextBetween(random, SUN_RADIUS, LOGICAL_WIDTH - SUN_RADIUS)
  const down = nextBetween(across.random, SUN_RADIUS + SQUARE_HEIGHT, LOGICAL_HEIGHT - SUN_RADIUS)

  return {
    random: down.random,
    token: {
      id,
      x: across.value,
      y: SUN_RADIUS,
      restingY: down.value,
      amount: SUN_AMOUNT,
      life: SUN_LIFETIME,
    },
  }
}

/**
 * A piece of Sun made by a plant rather than fallen from the sky.
 *
 * It is asked for a Square and not for a point, because a plant's Sun is made
 * *at* the plant. That is the whole of the difference between the two sources,
 * and a Sun that appeared at a place the seed chose would be a second sky: the
 * player would have no way to tell the Sun they grew from the Sun they waited
 * for, and no way to aim for the one that was theirs.
 *
 * It falls like any other Sun, from where the plant is to the foot of its own
 * Square, and it comes to rest *inside* that Square rather than out on the
 * lawn. That is what makes the plant's Sun look like the plant's: the Sun ends
 * up where the player put the plant, so a row of Sunflowers is a row of places
 * the Sun appears, and a Sun that dropped to a random place on the lawn would
 * give back the one thing the two sources are meant not to share.
 */
export function sunFrom(square: Square, id: number, amount: number): SunToken {
  return {
    id,
    x: centreX(square),
    y: centreY(square),
    restingY: (square.row + 1) * SQUARE_HEIGHT - SUN_RADIUS,
    amount,
    life: SUN_LIFETIME,
  }
}

/**
 * The Sun lying under this point, or null when there is none - bare lawn, or
 * a click that landed just outside every piece of Sun.
 *
 * Where two Suns overlap, the one drawn on top is the one collected, which is
 * the one furthest along in the list because each new Sun is added to the end.
 */
export function sunUnderPoint(tokens: readonly SunToken[], point: Point): SunToken | null {
  let hit: SunToken | null = null

  for (const token of tokens) {
    const across = point.x - token.x
    const down = point.y - token.y

    if (across * across + down * down <= SUN_HIT_RADIUS * SUN_HIT_RADIUS) {
      hit = token
    }
  }

  return hit
}
