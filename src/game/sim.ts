import type { Point, Square } from './board.ts'
import { fallSun, isResting, isSpent, spendLife, spawnSun, sunUnderPoint } from './sun.ts'
import type { SunToken } from './sun.ts'
import { seededRandom, type Random } from './random.ts'
import { FIRST_SUN_DELAY, STARTING_SUN, SUN_INTERVAL } from './balance.ts'

/**
 * The seed used when nobody chooses one. Fixed, so that a check written
 * against the default start is the same check every time.
 */
export const DEFAULT_SEED = 101010

export interface GameState {
  readonly tick: number
  readonly selected: Square | null
  /** The Sun the player is holding. Only collecting Sun ever adds to it. */
  readonly sun: number
  /** The Sun on the lawn right now, falling or lying. */
  readonly tokens: readonly SunToken[]
  readonly random: Random
  /** Steps until the next Sun falls from the sky. */
  readonly stepsUntilSun: number
  /** The name the next piece of Sun will be given. */
  readonly nextSunId: number
}

export type Command =
  | {
      readonly kind: 'select'
      readonly square: Square | null
    }
  | {
      readonly kind: 'collect'
      readonly point: Point
    }
  | {
      readonly kind: 'advance'
    }

export function initialGameState(seed: number = DEFAULT_SEED): GameState {
  return {
    tick: 0,
    selected: null,
    sun: STARTING_SUN,
    tokens: [],
    random: seededRandom(seed),
    stepsUntilSun: FIRST_SUN_DELAY,
    nextSunId: 1,
  }
}

export function apply(state: GameState, command: Command): GameState {
  switch (command.kind) {
    case 'select':
      return { ...state, selected: command.square }
    case 'collect':
      return collect(state, command.point)
    case 'advance':
      return advance(state)
  }
}

function collect(state: GameState, point: Point): GameState {
  const token = sunUnderPoint(state.tokens, point)

  if (token === null) {
    return { ...state }
  }

  return {
    ...state,
    sun: state.sun + token.amount,
    tokens: state.tokens.filter((candidate) => candidate !== token),
  }
}

/**
 * One step of play. Sun that has landed spends a step of life; Sun still in the
 * air falls instead, and a Sun landing on this step does not start losing life
 * until the next one, so the whole of its life is spent on the lawn.
 */
function advance(state: GameState): GameState {
  const living = state.tokens
    .map((token) => (isResting(token) ? spendLife(token) : fallSun(token)))
    .filter((token) => !isSpent(token))

  if (state.stepsUntilSun > 1) {
    return {
      ...state,
      tick: state.tick + 1,
      tokens: living,
      stepsUntilSun: state.stepsUntilSun - 1,
    }
  }

  const spawn = spawnSun(state.nextSunId, state.random)

  return {
    ...state,
    tick: state.tick + 1,
    random: spawn.random,
    tokens: [...living, spawn.token],
    stepsUntilSun: SUN_INTERVAL,
    nextSunId: state.nextSunId + 1,
  }
}
