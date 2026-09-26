import { LOGICAL_HEIGHT, LOGICAL_WIDTH, SQUARE_HEIGHT, type Point } from './board.ts'
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
