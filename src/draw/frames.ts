import { advanceClock, startClock } from '../game/clock.ts'
import type { Clock } from '../game/clock.ts'

/**
 * Drives the rules at a fixed rate, independent of the display: the same
 * number of steps happen on a fast machine as on a slow one.
 *
 * This is the only part that knows about the browser's clock and frame
 * callback, which is why it lives outside `src/game/`. See the rule boundary
 * in AGENTS.md.
 */
export function startFrames(onStep: () => void, onFrame: () => void): () => void {
  let frameId = 0
  let previous = performance.now()
  let clock: Clock = startClock()

  const frame = (now: number) => {
    const alreadyTaken = clock.steps
    clock = advanceClock(clock, now - previous)

    for (let step = alreadyTaken; step < clock.steps; step++) {
      onStep()
    }

    onFrame()
    frameId = requestAnimationFrame(frame)
  }

  frameId = requestAnimationFrame(frame)

  return () => cancelAnimationFrame(frameId)
}
