import { STEPS_PER_SECOND } from './clock.ts'
import type { Row } from './board.ts'
import type { PlantName } from './plants.ts'
import type { ZombieName } from './zombies.ts'

/** One Zombie a Wave sends in, and the Row of the board it appears in. */
export interface WaveZombie {
  readonly name: ZombieName
  readonly row: Row
}

/**
 * A scheduled group of Zombies, appearing at the right of the board together.
 *
 * A Wave is a time and a group rather than one Zombie, because that is what the
 * schedule means: a level is a list of Waves, and each of them decides which
 * Rows are under attack when.
 */
export interface Wave {
  /**
   * The step of play this Wave appears on. The first step of a Level is step 1,
   * so a Wave at step 1 walks in as the level opens.
   */
  readonly atStep: number
  readonly zombies: readonly WaveZombie[]
}

/** One day of play: what it lets you plant, and what it sends at you. */
export interface Level {
  readonly name: string
  /** The plants this Level's Seed Bank offers, in the order it shows them. */
  readonly plants: readonly PlantName[]
  readonly waves: readonly Wave[]
}

/**
 * Level 1-1: one plant, and one Zombie at a time.
 *
 * The schedule is a stand-in rather than the original's. How many Zombies a
 * Level sends, in which Rows and how often is exactly the sort of thing being
 * worked out here rather than copied, so it is written plainly to be changed -
 * and the first playtest is where the numbers in it get judged.
 *
 * Nothing walks in before the player can have planted a Peashooter: a Level
 * begins with 50 Sun and one costs 100, so the first Zombie's step is set well
 * past the point where two pieces of Sun have been collected.
 */
export const LEVEL_1_1: Level = {
  name: '1-1',
  plants: ['peashooter'],
  waves: [
    { atStep: 25 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 2 }] },
    { atStep: 50 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 2 }] },
    { atStep: 75 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 1 }] },
    { atStep: 100 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 3 }] },
  ],
}
