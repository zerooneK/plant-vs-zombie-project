import { LEVEL_ORDER } from './levels.ts'

/**
 * Saved progress across Adventure mode.
 *
 * Tracks which levels have been completed and the best recorded completion
 * time (in seconds) for each completed level.
 */
export interface Progress {
  readonly completed: readonly string[]
  readonly bestTimes: Readonly<Record<string, number>>
}

/**
 * Progress for a player opening the game for the first time.
 * Only Level 1-1 is unlocked.
 */
export const INITIAL_PROGRESS: Progress = {
  completed: [],
  bestTimes: {},
}

/**
 * Whether a Level can be played under the current progress.
 *
 * Level 1-1 is always unlocked. Any completed level is always unlocked and replayable.
 * Each subsequent level in Adventure mode unlocks as soon as its preceding level has been completed.
 */
export function isLevelUnlocked(progress: Progress, levelName: string): boolean {
  if (levelName === '1-1' || progress.completed.includes(levelName)) {
    return true
  }
  const index = LEVEL_ORDER.indexOf(levelName)
  if (index <= 0) {
    return false
  }
  const previousLevel = LEVEL_ORDER[index - 1]
  return previousLevel !== undefined && progress.completed.includes(previousLevel)
}


/**
 * All Adventure mode levels currently unlocked, in sequential order.
 */
export function unlockedLevels(progress: Progress): readonly string[] {
  return LEVEL_ORDER.filter((level) => isLevelUnlocked(progress, level))
}

/**
 * Record that a level has been won.
 *
 * Adds the level to completed levels without duplicates, which unlocks the next
 * level in Adventure mode.
 */
export function recordWin(
  progress: Progress,
  levelName: string,
  elapsedSeconds?: number,
): Progress {
  const completed = progress.completed.includes(levelName)
    ? progress.completed
    : [...progress.completed, levelName]

  const bestTimes = { ...progress.bestTimes }
  if (elapsedSeconds !== undefined) {
    const existing = bestTimes[levelName]
    if (existing === undefined || elapsedSeconds < existing) {
      bestTimes[levelName] = elapsedSeconds
    }
  }

  return {
    completed,
    bestTimes,
  }
}

/**
 * Serialize progress into a JSON string suitable for browser localStorage.
 */
export function serializeProgress(progress: Progress): string {
  return JSON.stringify(progress)
}

/**
 * Deserialize progress from a stored JSON string.
 *
 * Gracefully handles null, empty, or corrupted data by falling back to INITIAL_PROGRESS,
 * ensuring malformed storage never crashes the game.
 */
export function deserializeProgress(raw: string | null | undefined): Progress {
  if (!raw) {
    return INITIAL_PROGRESS
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) {
      return INITIAL_PROGRESS
    }

    const candidate = parsed as Partial<Progress>
    const completed = Array.isArray(candidate.completed)
      ? candidate.completed.filter((item): item is string => typeof item === 'string')
      : []

    const bestTimes: Record<string, number> = {}
    if (typeof candidate.bestTimes === 'object' && candidate.bestTimes !== null) {
      for (const [key, value] of Object.entries(candidate.bestTimes)) {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          bestTimes[key] = value
        }
      }
    }

    return {
      completed,
      bestTimes,
    }
  } catch {
    return INITIAL_PROGRESS
  }
}



