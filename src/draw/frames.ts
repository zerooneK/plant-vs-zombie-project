import { advanceFrames, startClock } from '../game/clock.ts'
import type { Clock } from '../game/clock.ts'

/**
 * Drives the rules at a fixed rate, independent of the display: the same
 * number of steps happen on a fast machine as on a slow one.
 *
 * This is the only part that knows about the browser's clock and frame
 * callback, which is why it lives outside `src/game/`. All it does is hand two
 * frame times to `advanceFrames` and run however many steps come back, so the
 * part that could get the arithmetic wrong is in the rules and is checked.
 * See the rule boundary in AGENTS.md.
 */
export function startFrames(onStep: () => void, onFrame: () => void): () => void {
  let frameId = 0
  let clock: Clock = startClock()
  let previous = performance.now()

  const frame = (now: number) => {
    const advanced = advanceFrames(clock, previous, now)
    clock = advanced.clock
    previous = advanced.previous

    for (let step = 0; step < advanced.steps; step++) {
      onStep()
    }

    onFrame()
    frameId = requestAnimationFrame(frame)
  }

  frameId = requestAnimationFrame(frame)

  return () => cancelAnimationFrame(frameId)
}
