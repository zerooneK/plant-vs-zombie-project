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
export function waveZombies(wave: Wave, firstId: number): Zombie[] {
  return wave.zombies.map((entry, index) =>
    zombieAtEdge(firstId + index, entry.name, entry.row, healthInThisWave(entry.name, wave)),
  )
}

/** How much health a Zombie of that name walks in with, in that Wave. */
function healthInThisWave(name: ZombieName, wave: Wave): number {
  const health = ZOMBIES[name].health

  return wave.flagWave === true ? Math.round(health * FLAG_WAVE_TOUGHNESS) : health
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
 * other if they were not distinguishable. Nine packets side by side, one Zombie in
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
  [LEVEL_TEST.name]: LEVEL_TEST,
}
