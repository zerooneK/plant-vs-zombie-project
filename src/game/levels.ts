import { STEPS_PER_SECOND } from './clock.ts'
import { FLAG_WAVE_TOUGHNESS } from './balance.ts'
import type { Row } from './board.ts'
import type { PlantName } from './plants.ts'
import { ZOMBIES, zombieAtEdge, type Zombie, type ZombieName } from './zombies.ts'

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
  /**
   * Set on the Level's last Wave, and on no other.
   *
   * `true` rather than a boolean, because there is no such thing as a Wave marked
   * as *not* being the Flag Wave: a Wave is the Flag Wave or it says nothing, and
   * a Level that wanted to write `false` would be writing down its own absence.
   * Which makes "is this the Flag Wave" a question the Wave answers about itself,
   * in the same way a Square answers what is standing in it.
   *
   * Marking the Wave is what makes the Flag Wave a fact about the level rather
   * than a position in a list. The last Wave of a Level *is* the Flag Wave, but a
   * rule that worked it out from "which Wave is last" would quietly change what
   * the last Wave means the moment a designer put a new one on the end.
   */
  readonly flagWave?: true
}

/**
 * The Zombies this Wave sends in, standing at the right edge of the Rows it named.
 *
 * The Wave knows what it puts on the lawn, rather than the step of play working it
 * out from the schedule: what a Wave sends is a fact about the Wave, in the same
 * way that what is standing in a Square is a fact about the Square. And the one
 * thing about them that is not in the Wave's own list is how tough they are, which
 * is the Flag Wave's business and is settled here rather than in the step that
 * advances the clock.
 *
 * A Flag Wave's Zombies are tougher than the same Zombies in any other Wave: a
 * factor on their health rather than a different roster, so that a Flag Wave is
 * *more* than an ordinary one rather than a different sort of thing. That is also
 * why the Flag Zombie is in the roster as a name with no health of its own - it is
 * an ordinary Zombie carrying a flag, and the Wave is what makes it hard.
 */
/** Scale a stat by Flag Wave toughness if this Wave is the Flag Wave. */
function scaleForWave(stat: number, wave: Wave): number {
  return wave.flagWave === true ? Math.round(stat * FLAG_WAVE_TOUGHNESS) : stat
}

export function waveZombies(wave: Wave, firstId: number): Zombie[] {
  return wave.zombies.map((entry, index) =>
    zombieAtEdge(
      firstId + index,
      entry.name,
      entry.row,
      scaleForWave(ZOMBIES[entry.name].health, wave),
      scaleForWave(ZOMBIES[entry.name].armour, wave),
    ),
  )
}

/** One day of play: what it lets you plant, and what it sends at you. */
export interface Level {
  readonly name: string
  /** The plants this Level's Seed Bank offers, in the order it shows them. */
  readonly plants: readonly PlantName[]
  readonly waves: readonly Wave[]
}

/**
 * Level 1-1: one plant, one Zombie at a time, and a Flag Wave at the end.
 *
 * The schedule is a stand-in rather than the original's. How many Zombies a Level
 * sends, in which Rows and how often is exactly the sort of thing being worked out
 * here rather than copied, so it is written plainly to be changed - and the first
 * playtest is where the numbers in it get judged. One has already happened, at
 * ticket 08, and it moved a number: the Flag Wave was half again as tough as it is
 * now, and playing the level lost on it. See `FLAG_WAVE_TOUGHNESS`.
 *
 * Three things about the shape of it, each of which is a rule about what a schedule
 * has to be rather than a preference:
 *
 * Nothing walks in before the player can have planted a Peashooter. A Level begins
 * with 50 Sun and one costs 100, so the first Zombie is set well past the point
 * where two pieces of Sun have been collected.
 *
 * The Waves are about forty seconds apart, which is how long the Sun takes to pay
 * for another Peashooter. A schedule denser than the economy cannot be answered is
 * not a hard level, it is a level where the answer does not exist, and the check
 * that plays this one with the obvious plan is what says so.
 *
 * The fourth Wave goes back into Row 3, the Row the first Wave was sent down, and
 * the first Wave is what spends that Row's mower. That pairing is what makes the
 * level losable: a Zombie getting in needs a Row with no mower left, and a schedule
 * that never sends a second Zombie into a Row the mower has already saved cannot be
 * lost however long it goes on. It is why a player who plants nothing is finished
 * at about 142 seconds rather than playing for ever.
 */
export const LEVEL_1_1: Level = {
  name: '1-1',
  plants: ['peashooter', 'sunflower'],
  waves: [
    { atStep: 25 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 2 }] },
    { atStep: 50 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 1 }] },
    { atStep: 80 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 3 }] },
    { atStep: 100 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 2 }] },
    {
      atStep: 150 * STEPS_PER_SECOND,
      flagWave: true,
      zombies: [
        { name: 'basic', row: 1 },
        { name: 'flag', row: 2 },
        { name: 'basic', row: 3 },
      ],
    },
  ],
}

/**
 * Level 1-2: introduces Cherry Bomb.
 *
 * Dense zombie clusters appear across multiple rows, giving the Cherry Bomb
 * its first tactical use for explosive clearing.
 */
export const LEVEL_1_2: Level = {
  name: '1-2',
  plants: ['peashooter', 'sunflower', 'cherry-bomb'],
  waves: [
    { atStep: 25 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 2 }] },
    { atStep: 50 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 1 }] },
    { atStep: 75 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 3 }] },
    {
      atStep: 100 * STEPS_PER_SECOND,
      zombies: [
        { name: 'basic', row: 2 },
        { name: 'basic', row: 1 },
      ],
    },
    { atStep: 125 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 3 }] },
    {
      atStep: 150 * STEPS_PER_SECOND,
      flagWave: true,
      zombies: [
        { name: 'flag', row: 2 },
        { name: 'basic', row: 1 },
        { name: 'basic', row: 3 },
      ],
    },
  ],
}

/**
 * Level 1-3: introduces Conehead Zombie and Wall-nut.
 *
 * Conehead zombies arrive with traffic cones on their heads, absorbing extra hits.
 * Wall-nuts provide defensive barriers to stall them while peashooters whittle them down.
 */
export const LEVEL_1_3: Level = {
  name: '1-3',
  plants: ['peashooter', 'sunflower', 'cherry-bomb', 'wall-nut'],
  waves: [
    { atStep: 25 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 2 }] },
    { atStep: 50 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 4 }] },
    { atStep: 75 * STEPS_PER_SECOND, zombies: [{ name: 'conehead', row: 2 }] },
    {
      atStep: 100 * STEPS_PER_SECOND,
      zombies: [
        { name: 'basic', row: 0 },
        { name: 'basic', row: 3 },
      ],
    },
    {
      atStep: 125 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 1 },
        { name: 'basic', row: 4 },
      ],
    },
    { atStep: 150 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 2 }] },
    {
      atStep: 180 * STEPS_PER_SECOND,
      flagWave: true,
      zombies: [
        { name: 'flag', row: 2 },
        { name: 'conehead', row: 3 },
        { name: 'basic', row: 0 },
        { name: 'basic', row: 1 },
      ],
    },
  ],
}

/**
 * Level 1-4: introduces Potato Mine.
 *
 * The Potato Mine offers a cheap 25 Sun early trap that arms over 15 seconds,
 * punishing early Coneheads and saving Sun for economy development.
 */
export const LEVEL_1_4: Level = {
  name: '1-4',
  plants: ['peashooter', 'sunflower', 'cherry-bomb', 'wall-nut', 'potato-mine'],
  waves: [
    { atStep: 25 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 3 }] },
    { atStep: 45 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 1 }] },
    { atStep: 70 * STEPS_PER_SECOND, zombies: [{ name: 'conehead', row: 3 }] },
    {
      atStep: 95 * STEPS_PER_SECOND,
      zombies: [
        { name: 'basic', row: 0 },
        { name: 'basic', row: 4 },
      ],
    },
    {
      atStep: 120 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 1 },
        { name: 'conehead', row: 2 },
      ],
    },
    {
      atStep: 145 * STEPS_PER_SECOND,
      zombies: [
        { name: 'basic', row: 3 },
        { name: 'basic', row: 0 },
      ],
    },
    {
      atStep: 180 * STEPS_PER_SECOND,
      flagWave: true,
      zombies: [
        { name: 'flag', row: 2 },
        { name: 'conehead', row: 1 },
        { name: 'conehead', row: 4 },
        { name: 'basic', row: 0 },
        { name: 'basic', row: 3 },
      ],
    },
  ],
}

/**
 * Level 1-5: introduces Snow Pea.
 *
 * Snow Peas shoot frozen peas that slow down zombies hit,
 * buying extra time to stop advancing Conehead Zombies.
 */
export const LEVEL_1_5: Level = {
  name: '1-5',
  plants: ['peashooter', 'sunflower', 'cherry-bomb', 'wall-nut', 'potato-mine', 'snow-pea'],
  waves: [
    { atStep: 25 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 0 }] },
    { atStep: 45 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 2 }] },
    { atStep: 65 * STEPS_PER_SECOND, zombies: [{ name: 'conehead', row: 4 }] },
    {
      atStep: 85 * STEPS_PER_SECOND,
      zombies: [
        { name: 'basic', row: 1 },
        { name: 'basic', row: 3 },
      ],
    },
    {
      atStep: 110 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 0 },
        { name: 'basic', row: 2 },
      ],
    },
    {
      atStep: 135 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 3 },
        { name: 'basic', row: 1 },
        { name: 'basic', row: 4 },
      ],
    },
    {
      atStep: 160 * STEPS_PER_SECOND,
      zombies: [
        { name: 'basic', row: 0 },
        { name: 'conehead', row: 2 },
      ],
    },
    {
      atStep: 190 * STEPS_PER_SECOND,
      flagWave: true,
      zombies: [
        { name: 'flag', row: 2 },
        { name: 'conehead', row: 0 },
        { name: 'conehead', row: 3 },
        { name: 'basic', row: 1 },
        { name: 'basic', row: 4 },
      ],
    },
  ],
}

/**
 * Level 1-6: introduces Pole Vaulting Zombie and Chomper.
 *
 * Pole Vaulting Zombies run at double speed and vault over the first plant in their path.
 * Chompers swallow approaching zombies in one bite, providing high-value single-target removal.
 */
export const LEVEL_1_6: Level = {
  name: '1-6',
  plants: [
    'peashooter',
    'sunflower',
    'cherry-bomb',
    'wall-nut',
    'potato-mine',
    'snow-pea',
    'chomper',
  ],
  waves: [
    { atStep: 25 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 1 }] },
    { atStep: 45 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 3 }] },
    { atStep: 65 * STEPS_PER_SECOND, zombies: [{ name: 'pole-vaulting', row: 2 }] },
    {
      atStep: 90 * STEPS_PER_SECOND,
      zombies: [
        { name: 'basic', row: 0 },
        { name: 'conehead', row: 4 },
      ],
    },
    {
      atStep: 115 * STEPS_PER_SECOND,
      zombies: [
        { name: 'pole-vaulting', row: 1 },
        { name: 'basic', row: 3 },
      ],
    },
    {
      atStep: 140 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 2 },
        { name: 'basic', row: 0 },
        { name: 'basic', row: 4 },
      ],
    },
    {
      atStep: 165 * STEPS_PER_SECOND,
      zombies: [
        { name: 'pole-vaulting', row: 3 },
        { name: 'conehead', row: 1 },
      ],
    },
    {
      atStep: 195 * STEPS_PER_SECOND,
      flagWave: true,
      zombies: [
        { name: 'flag', row: 2 },
        { name: 'pole-vaulting', row: 0 },
        { name: 'conehead', row: 4 },
        { name: 'basic', row: 1 },
        { name: 'basic', row: 3 },
      ],
    },
  ],
}

/**
 * Level 1-7: introduces Repeater.
 *
 * Repeaters fire two peas at a time, providing concentrated DPS needed to defeat
 * overlapping waves of Coneheads and fast Pole Vaulting Zombies.
 */
export const LEVEL_1_7: Level = {
  name: '1-7',
  plants: [
    'peashooter',
    'sunflower',
    'cherry-bomb',
    'wall-nut',
    'potato-mine',
    'snow-pea',
    'chomper',
    'repeater',
  ],
  waves: [
    { atStep: 25 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 4 }] },
    { atStep: 45 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 0 }] },
    { atStep: 65 * STEPS_PER_SECOND, zombies: [{ name: 'pole-vaulting', row: 3 }] },
    {
      atStep: 85 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 1 },
        { name: 'basic', row: 2 },
      ],
    },
    {
      atStep: 110 * STEPS_PER_SECOND,
      zombies: [
        { name: 'pole-vaulting', row: 0 },
        { name: 'conehead', row: 4 },
      ],
    },
    {
      atStep: 135 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 2 },
        { name: 'conehead', row: 3 },
        { name: 'basic', row: 1 },
      ],
    },
    {
      atStep: 160 * STEPS_PER_SECOND,
      zombies: [
        { name: 'pole-vaulting', row: 4 },
        { name: 'basic', row: 0 },
        { name: 'basic', row: 2 },
      ],
    },
    {
      atStep: 185 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 1 },
        { name: 'basic', row: 3 },
        { name: 'pole-vaulting', row: 2 },
      ],
    },
    {
      atStep: 215 * STEPS_PER_SECOND,
      flagWave: true,
      zombies: [
        { name: 'flag', row: 2 },
        { name: 'pole-vaulting', row: 1 },
        { name: 'conehead', row: 0 },
        { name: 'conehead', row: 3 },
        { name: 'basic', row: 4 },
      ],
    },
  ],
}

/**
 * Level 1-8: introduces Buckethead Zombie and Puff-shroom.
 *
 * Buckethead Zombies enter the field with heavy metal buckets (1100 armour),
 * shrugging off dozens of hits. Zero-cost Puff-shrooms provide instant emergency
 * stalling and frontline short-range damage.
 */
export const LEVEL_1_8: Level = {
  name: '1-8',
  plants: [
    'peashooter',
    'sunflower',
    'cherry-bomb',
    'wall-nut',
    'potato-mine',
    'snow-pea',
    'chomper',
    'repeater',
    'puff-shroom',
  ],
  waves: [
    { atStep: 25 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 2 }] },
    { atStep: 45 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 1 }] },
    { atStep: 65 * STEPS_PER_SECOND, zombies: [{ name: 'conehead', row: 3 }] },
    { atStep: 85 * STEPS_PER_SECOND, zombies: [{ name: 'buckethead', row: 2 }] },
    {
      atStep: 110 * STEPS_PER_SECOND,
      zombies: [
        { name: 'pole-vaulting', row: 4 },
        { name: 'basic', row: 0 },
      ],
    },
    {
      atStep: 135 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 1 },
        { name: 'conehead', row: 3 },
        { name: 'basic', row: 2 },
      ],
    },
    {
      atStep: 160 * STEPS_PER_SECOND,
      zombies: [
        { name: 'buckethead', row: 0 },
        { name: 'pole-vaulting', row: 2 },
      ],
    },
    {
      atStep: 185 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 4 },
        { name: 'basic', row: 1 },
        { name: 'basic', row: 3 },
      ],
    },
    {
      atStep: 220 * STEPS_PER_SECOND,
      flagWave: true,
      zombies: [
        { name: 'flag', row: 2 },
        { name: 'buckethead', row: 1 },
        { name: 'pole-vaulting', row: 3 },
        { name: 'conehead', row: 0 },
        { name: 'conehead', row: 4 },
      ],
    },
  ],
}

/**
 * Level 1-9: introduces Tall-nut.
 *
 * Tall-nuts provide an impassable defense: they cannot be vaulted over by Pole Vaulting
 * Zombies, forcing them to drop their pole and fight at the barrier.
 */
export const LEVEL_1_9: Level = {
  name: '1-9',
  plants: [
    'peashooter',
    'sunflower',
    'cherry-bomb',
    'wall-nut',
    'potato-mine',
    'snow-pea',
    'chomper',
    'repeater',
    'puff-shroom',
    'tall-nut',
  ],
  waves: [
    { atStep: 25 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 0 }] },
    { atStep: 45 * STEPS_PER_SECOND, zombies: [{ name: 'pole-vaulting', row: 2 }] },
    { atStep: 65 * STEPS_PER_SECOND, zombies: [{ name: 'conehead', row: 4 }] },
    {
      atStep: 85 * STEPS_PER_SECOND,
      zombies: [
        { name: 'buckethead', row: 1 },
        { name: 'basic', row: 3 },
      ],
    },
    {
      atStep: 110 * STEPS_PER_SECOND,
      zombies: [
        { name: 'pole-vaulting', row: 0 },
        { name: 'pole-vaulting', row: 3 },
      ],
    },
    {
      atStep: 135 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 2 },
        { name: 'buckethead', row: 4 },
      ],
    },
    {
      atStep: 160 * STEPS_PER_SECOND,
      zombies: [
        { name: 'pole-vaulting', row: 1 },
        { name: 'conehead', row: 0 },
        { name: 'basic', row: 3 },
      ],
    },
    {
      atStep: 185 * STEPS_PER_SECOND,
      zombies: [
        { name: 'buckethead', row: 2 },
        { name: 'conehead', row: 1 },
        { name: 'basic', row: 4 },
      ],
    },
    {
      atStep: 210 * STEPS_PER_SECOND,
      zombies: [
        { name: 'pole-vaulting', row: 4 },
        { name: 'basic', row: 0 },
        { name: 'conehead', row: 3 },
      ],
    },
    {
      atStep: 240 * STEPS_PER_SECOND,
      flagWave: true,
      zombies: [
        { name: 'flag', row: 2 },
        { name: 'buckethead', row: 0 },
        { name: 'buckethead', row: 3 },
        { name: 'pole-vaulting', row: 1 },
        { name: 'pole-vaulting', row: 4 },
      ],
    },
  ],
}

/**
 * Level 1-10: the tenth Level.
 *
 * All ten plants and all five zombie varieties appear together.
 */
export const LEVEL_1_10: Level = {
  name: '1-10',
  plants: [
    'peashooter',
    'sunflower',
    'cherry-bomb',
    'wall-nut',
    'potato-mine',
    'snow-pea',
    'chomper',
    'repeater',
    'puff-shroom',
    'tall-nut',
  ],
  waves: [
    { atStep: 25 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 2 }] },
    {
      atStep: 45 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 1 },
        { name: 'basic', row: 3 },
      ],
    },
    {
      atStep: 65 * STEPS_PER_SECOND,
      zombies: [
        { name: 'pole-vaulting', row: 0 },
        { name: 'pole-vaulting', row: 4 },
      ],
    },
    {
      atStep: 85 * STEPS_PER_SECOND,
      zombies: [
        { name: 'buckethead', row: 2 },
        { name: 'basic', row: 1 },
      ],
    },
    {
      atStep: 110 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 0 },
        { name: 'conehead', row: 3 },
        { name: 'basic', row: 4 },
      ],
    },
    {
      atStep: 135 * STEPS_PER_SECOND,
      zombies: [
        { name: 'buckethead', row: 1 },
        { name: 'pole-vaulting', row: 2 },
        { name: 'conehead', row: 4 },
      ],
    },
    {
      atStep: 160 * STEPS_PER_SECOND,
      zombies: [
        { name: 'pole-vaulting', row: 0 },
        { name: 'buckethead', row: 3 },
        { name: 'basic', row: 2 },
      ],
    },
    {
      atStep: 185 * STEPS_PER_SECOND,
      zombies: [
        { name: 'conehead', row: 1 },
        { name: 'conehead', row: 2 },
        { name: 'buckethead', row: 4 },
        { name: 'pole-vaulting', row: 3 },
      ],
    },
    {
      atStep: 210 * STEPS_PER_SECOND,
      zombies: [
        { name: 'buckethead', row: 0 },
        { name: 'conehead', row: 2 },
        { name: 'pole-vaulting', row: 4 },
        { name: 'basic', row: 1 },
        { name: 'basic', row: 3 },
      ],
    },
    {
      atStep: 250 * STEPS_PER_SECOND,
      flagWave: true,
      zombies: [
        { name: 'flag', row: 2 },
        { name: 'buckethead', row: 1 },
        { name: 'buckethead', row: 4 },
        { name: 'pole-vaulting', row: 0 },
        { name: 'pole-vaulting', row: 3 },
        { name: 'conehead', row: 2 },
      ],
    },
  ],
}

/**
 * The test bed: a Level that offers every plant the game has, and is not a Level
 * anybody plays.
 *
 * It exists because Level 1-1 offers a Peashooter and a Sunflower and nothing
 * else, and is not going to offer more: a Wall-nut in the first level would
 * change what that level is, and the balance pass coming next is meant to measure
 * Level 1-1 as it is rather than as it would be with a fourth packet in the bank.
 * See `docs/adr/0006-a-test-bed-for-plants-level-1-1-does-not-offer.md`.
 *
 * So the plants that no Level offers still have to be reachable, and there are two
 * ways of reaching them: a check that builds the Level it needs, and a person who
 * wants to look at one. The first is what the checks do, and the second is this -
 * because "the drawing is right" is not an answer a check can give, and the whole
 * of the artwork so far has been plain shapes that a player would mistake for each
 * other if they were not distinguishable. Ten packets side by side, one Zombie in
 * every Row, and a second pair in Row 0 later on so a Row can actually be lost.
 *
 * The schedule is not balanced and does not claim to be. Nothing walks in for
 * forty-five seconds, which is as long as it takes a Zombie to cross the whole
 * lawn - so there is time to put a Row of something down and watch it happen,
 * which is the only reason to be here. After that, one Zombie in every Row, and
 * a second pair in Rows 1 and 2 later on so a Row can actually be lost.
 */
export const LEVEL_TEST: Level = {
  name: 'test-bed',
  plants: [
    'peashooter',
    'snow-pea',
    'repeater',
    'puff-shroom',
    'sunflower',
    'wall-nut',
    'tall-nut',
    'potato-mine',
    'cherry-bomb',
    'chomper',
  ],
  waves: [
    { atStep: 45 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 0 }] },
    { atStep: 48 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 1 }] },
    { atStep: 52 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 2 }] },
    { atStep: 56 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 3 }] },
    { atStep: 60 * STEPS_PER_SECOND, zombies: [{ name: 'basic', row: 4 }] },
    {
      atStep: 90 * STEPS_PER_SECOND,
      zombies: [
        { name: 'basic', row: 0 },
        { name: 'basic', row: 1 },
      ],
    },
  ],
}

/** Sequential order of the 10 Adventure levels. */
export const LEVEL_ORDER: readonly string[] = [
  LEVEL_1_1.name,
  LEVEL_1_2.name,
  LEVEL_1_3.name,
  LEVEL_1_4.name,
  LEVEL_1_5.name,
  LEVEL_1_6.name,
  LEVEL_1_7.name,
  LEVEL_1_8.name,
  LEVEL_1_9.name,
  LEVEL_1_10.name,
]

/**
 * Every Level, by the name a person would ask for it by.
 *
 * Level select is ticket 20 and this is not it: nothing here is unlocked, nothing
 * is chosen from a menu, and `LEVEL_1_1` is still what the game starts on. It
 * exists so that a Level can be asked for by name from outside the rules - which
 * is how the test bed is reached in a browser, given that a browser is told which
 * Level to play by a word in its address and not by a list of buttons.
 *
 * Keyed by name rather than listed, so that a Level cannot be added to the game
 * without being findable by the thing that hands the game its Level.
 */
export const LEVELS: Readonly<Record<string, Level>> = {
  [LEVEL_1_1.name]: LEVEL_1_1,
  [LEVEL_1_2.name]: LEVEL_1_2,
  [LEVEL_1_3.name]: LEVEL_1_3,
  [LEVEL_1_4.name]: LEVEL_1_4,
  [LEVEL_1_5.name]: LEVEL_1_5,
  [LEVEL_1_6.name]: LEVEL_1_6,
  [LEVEL_1_7.name]: LEVEL_1_7,
  [LEVEL_1_8.name]: LEVEL_1_8,
  [LEVEL_1_9.name]: LEVEL_1_9,
  [LEVEL_1_10.name]: LEVEL_1_10,
  [LEVEL_TEST.name]: LEVEL_TEST,
}

/**
 * The next Level in Adventure mode, or null if on Level 1-10 or an unrecognised level.
 */
export function nextLevel(levelName: string): Level | null {
  const index = LEVEL_ORDER.indexOf(levelName)
  if (index === -1 || index === LEVEL_ORDER.length - 1) {
    return null
  }
  const nextName = LEVEL_ORDER[index + 1]!
  return LEVELS[nextName] ?? null
}
