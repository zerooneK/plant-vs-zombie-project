import { LOGICAL_WIDTH, SQUARE_WIDTH, type Row } from './board.ts'
import { BASIC_ZOMBIE_HEALTH, ZOMBIE_STEPS_PER_COLUMN } from './balance.ts'

/**
 * The name a Zombie is known by in the rules.
 *
 * A name rather than a class or a flag, for the same reason plants are names:
 * the roster is meant to be data, so the next Zombie is an entry rather than
 * another branch in the rules.
 */
export type ZombieName = 'basic'

/** One kind of Zombie, as the rules know it. */
export interface ZombieKind {
  readonly name: ZombieName
  /** How much a pea has to take off before it stops. */
  readonly health: number
}

export const BASIC_ZOMBIE: ZombieKind = {
  name: 'basic',
  health: BASIC_ZOMBIE_HEALTH,
}

/**
 * Every Zombie the game knows, looked up by name.
 *
 * Keyed by name for the same reason the plants are: the roster is data, so the
 * next Zombie is an entry here rather than another branch in the rules.
 */
export const ZOMBIES: Readonly<Record<ZombieName, ZombieKind>> = {
  basic: BASIC_ZOMBIE,
}

/**
 * One Zombie, on the board, at a place of its own choosing.
 *
 * A Zombie is not in a Square. It walks along a Row between Squares, so what it
 * has is a Row and how far along that Row it is - never a Column, which is the
 * difference between something that occupies a Square and something that
 * travels across nine of them.
 */
export interface Zombie {
  /** Names this Zombie, so that a pea can say which one it was aimed at. */
  readonly id: number
  readonly name: ZombieName
  readonly row: Row
  /**
   * Steps it has walked since it appeared.
   *
   * The count rather than a place, so that where it is can never drift: a
   * position worked out from a tally is the same on every machine and the same
   * on every step, where one subtracted a fraction at a time is neither.
   */
  readonly walked: number
  /** What is left of it. At zero it is taken off the lawn. */
  readonly health: number
}

/** A Zombie standing at the right edge of a Row, which is where Zombies come in. */
export function zombieAtEdge(id: number, name: ZombieName, row: Row): Zombie {
  return { id, name, row, walked: 0, health: ZOMBIES[name].health }
}

/** A Zombie with that much damage taken off it. */
export function takeDamage(zombie: Zombie, damage: number): Zombie {
  return { ...zombie, health: zombie.health - damage }
}

/**
 * The Zombies still on the lawn: one with nothing left of it is taken off.
 *
 * Zero and below rather than below zero, so that the pea which finishes a Zombie
 * removes it outright instead of leaving one standing there at minus ten for
 * the plants to go on shooting.
 */
export function removeExhausted(zombies: readonly Zombie[]): readonly Zombie[] {
  return zombies.filter((zombie) => zombie.health > 0)
}

/** How far every Zombie walks in one step, in board units. */
export const ZOMBIE_MOVE_PER_STEP = SQUARE_WIDTH / ZOMBIE_STEPS_PER_COLUMN

/**
 * How far along its Row a Zombie is, in board units, measured from the left
 * edge of the board.
 *
 * The steps walked are multiplied by the width of a Column before they are
 * divided by the steps in a Column, so a Zombie that has walked a whole number
 * of Columns is exactly that many Columns across rather than nearly. In between
 * the answer is rounded, which is the most anyone could tell.
 */
export function zombieX(zombie: Zombie): number {
  return LOGICAL_WIDTH - (zombie.walked * SQUARE_WIDTH) / ZOMBIE_STEPS_PER_COLUMN
}

/**
 * One step of every Zombie on the board: each walks on to the left, and one that
 * has walked past the left edge leaves the board.
 *
 * Leaving the board is not what happens in the original. There, a Zombie reaching
 * the left of a Row sets off that Row's Lawn Mower, and a Row whose mower has
 * already gone is the end of the level. Neither is built yet, so until they are,
 * a Zombie that gets past the left edge simply leaves - rather than standing off
 * the side of the screen for ever, where no player can see it and the state
 * grows all level.
 *
 * A Zombie at the very left edge has not left yet: it is still on the board, at
 * the place the Lawn Mower rule will want to find it.
 */
export function walkLeft(zombies: readonly Zombie[]): readonly Zombie[] {
  return zombies
    .map((zombie) => ({ ...zombie, walked: zombie.walked + 1 }))
    .filter((zombie) => zombieX(zombie) >= 0)
}

/**
 * The closest Zombie in a Row that has not yet walked past this point along it,
 * or undefined when the Row holds nothing to shoot at.
 *
 * "Not yet past" is what makes it a target rather than merely the nearest
 * Zombie. Plants shoot right, as they do in the original, so a Zombie that has
 * already gone by is behind a Peashooter and not in front of it.
 */
export function nearestAheadOf(
  zombies: readonly Zombie[],
  row: Row,
  x: number,
): Zombie | undefined {
  let nearest: Zombie | undefined

  for (const zombie of zombies) {
    if (zombie.row !== row || zombieX(zombie) < x) {
      continue
    }
    if (nearest === undefined || zombieX(zombie) < zombieX(nearest)) {
      nearest = zombie
    }
  }

  return nearest
}
