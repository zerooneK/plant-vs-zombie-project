import { STEPS_PER_SECOND } from './sim.ts'

const STEP_MILLISECONDS = 1000 / STEPS_PER_SECOND

/**
 * If a frame took far longer than usual - a tab in the background, a long
 * pause - we would otherwise owe thousands of steps and spend seconds
 * catching up. Anything beyond this is dropped, so the game falls behind the
 * clock rather than freezing.
 */
const MAX_STEPS_PER_FRAME = 5

/**
 * Drives the rules at a fixed rate, independent of the display.
 *
 * `onStep` is called once per whole step owed, so the same number of steps
 * happen on a fast machine as on a slow one. `onFrame` is called once per
 * animation frame for drawing, and may run more or fewer times than `onStep`.
 * Returns a function that stops the loop.
 */
export function startLoop(onStep: () => void, onFrame: () => void): () => void {
  let frameId = 0
  let previous = performance.now()
  let owed = 0

  const frame = (now: number) => {
    owed += now - previous
    previous = now

    if (owed > STEP_MILLISECONDS * MAX_STEPS_PER_FRAME) {
      owed = STEP_MILLISECONDS * MAX_STEPS_PER_FRAME
    }
    while (owed >= STEP_MILLISECONDS) {
      owed -= STEP_MILLISECONDS
      onStep()
    }

    onFrame()
    frameId = requestAnimationFrame(frame)
  }

  frameId = requestAnimationFrame(frame)

  return () => cancelAnimationFrame(frameId)
}
