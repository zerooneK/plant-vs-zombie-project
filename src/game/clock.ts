/** The game advances this many steps a second, whatever the display is doing. */
export const STEPS_PER_SECOND = 60

/**
 * If a frame took far longer than usual - a tab in the background, a long
 * pause - we would otherwise owe thousands of steps and spend seconds
 * catching up. Anything beyond this many steps is dropped, so the game falls
 * behind the clock rather than freezing.
 */
export const MAX_CATCH_UP_STEPS = 5

export interface Clock {
  /** Milliseconds of play time so far. */
  readonly elapsed: number
  /** Whole steps owed so far. */
  readonly steps: number
}

export function startClock(): Clock {
  return { elapsed: 0, steps: 0 }
}

/**
 * Adds elapsed milliseconds and reports how many whole steps are now owed.
 *
 * Steps are counted from the running total rather than from a leftover
 * remainder, because a remainder of "one 60th of a second" cannot be held
 * exactly in floating point: 1000/60 rounds up, so a second of play would
 * come to 59 steps and then some, and the game would run slow forever.
 *
 * Pure arithmetic. The caller supplies the elapsed milliseconds, which is
 * what keeps the browser's clock out of the rules.
 */
export function advanceClock(clock: Clock, elapsed: number): Clock {
  const earned = Math.ceil(
    ((clock.steps + MAX_CATCH_UP_STEPS) * 1000) / STEPS_PER_SECOND,
  )
  const total = Math.min(clock.elapsed + Math.max(0, elapsed), earned)

  return {
    elapsed: total,
    steps: Math.floor((total * STEPS_PER_SECOND) / 1000),
  }
}
