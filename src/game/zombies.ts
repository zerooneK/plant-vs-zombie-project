import {
  LOGICAL_WIDTH,
  SQUARE_WIDTH,
  plantIn,
  squareAtX,
  takeBite,
  type Occupant,
  type Planted,
  type Row,
} from './board.ts'
import {
  BASIC_ZOMBIE_HEALTH,
  ZOMBIE_BITE_DAMAGE,
  ZOMBIE_BITE_INTERVAL,
  ZOMBIE_STEPS_PER_COLUMN,
} from './balance.ts'

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
  /**
   * Steps until this Zombie bites again. Zero means it will bite on the next
   * step it has something to bite.
   *
   * A countdown rather than a bite time worked out from a clock, for the same
   * reason a Peashooter's firing countdown is one: the lawn and the rules then
   * read the same number, and a Zombie's chewing cannot be a step out of step
   * with what it is chewing. It sits at zero while a Zombie is walking, so a
   * Zombie bites the moment it reaches food rather than waiting out a chewing
   * cycle it was never eating through.
   */
  readonly stepsUntilBite: number
}

/** A Zombie standing at the right edge of a Row, which is where Zombies come in. */
export function zombieAtEdge(id: number, name: ZombieName, row: Row): Zombie {
  return { id, name, row, walked: 0, health: ZOMBIES[name].health, stepsUntilBite: 0 }
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
 * it is not a whole number of Columns and is left as it is, which is what lets
 * the rules ask which Square a Zombie is standing in and get the same answer as
 * the drawing: rounding it here would put Zombies in the wrong Square near a
 * boundary, and a Zombie that stopped at the wrong plant would be a bug nobody
 * would think to look for.
 */
export function zombieX(zombie: Zombie): number {
  return LOGICAL_WIDTH - (zombie.walked * SQUARE_WIDTH) / ZOMBIE_STEPS_PER_COLUMN
}

/**
 * The plant a Zombie is eating right now, or undefined when there is none.
 *
 * A question asked of the lawn rather than remembered by the Zombie, and it is
 * the same question the Zombie's own step asks - so a Zombie the rules say is
 * eating and a Zombie the drawing says is eating cannot come to different
 * answers. The drawing asks it so that a Zombie can be shown reaching for the
 * plant it is standing at, without the drawing working out the rule for itself.
 */
export function plantBeingEaten(
  zombie: Zombie,
  occupants: readonly Occupant[],
): Planted | undefined {
  const square = squareAtX(zombie.row, zombieX(zombie))

  return square === null ? undefined : plantIn(occupants, square)
}

/**
 * What one step of every Zombie on the board did.
 *
 * A Zombie's step changes two things at once, and has to report both: it moves,
 * and what it eats is a plant that is no longer standing there. Returning the
 * lawn as well as the Zombies is what lets a Zombie's step be one step rather
 * than two that have to be kept in step with each other.
 */
export interface ZombieStep {
  readonly zombies: readonly Zombie[]
  readonly occupants: readonly Occupant[]
}

/**
 * One step of every Zombie on the board: each walks on to the left and eats what
 * it walks into, and one that has walked past the left edge leaves the board.
 *
 * Whether a Zombie is eating is not held in the state but worked out, every
 * step, from the Square it is standing in. That is the whole of the rule, and
 * it is why there is no such thing as a Zombie part way through eating that
 * cannot see: ask a Zombie what it is doing and it looks at the lawn. A plant
 * dug up with the Shovel, or a plant another Zombie has just finished, is simply
 * not there any more, and the Zombie walking on is the same answer either way -
 * so there is no latch to clear and nothing to forget.
 *
 * It is also why the first bite lands on the step the Zombie reaches the plant
 * rather than the step after. Deciding what a Zombie is doing from the lawn, in
 * the step it gets there, needs nothing remembered, and so needs no step of
 * grace to let the arrival happen first. A Peashooter's countdown is the same
 * shape: it sits at zero while there is nothing to shoot, and fires the moment
 * there is something - so a Zombie's chewing clock is already at zero when it
 * arrives, and it bites.
 *
 * Two Zombies at one plant both bite it, because both are eating it. Nothing
 * reserves a plant for one Zombie: the rule is the same for every Zombie, and
 * the plant's health runs out sooner, not later.
 *
 * Leaving the board is not what happens in the original, and is not what happens
 * here any more. There, and here, a Zombie reaching the left of a Row sets off
 * that Row's Lawn Mower, which takes the whole Row off the lawn. So a Zombie
 * walking the length of a Row that still has a mower is stopped at the mower
 * Square and never gets further: the mower is found and set off by the mower's
 * own rule, one step later, and this step only has to leave the Zombie standing
 * on the mower Square for it to be found.
 *
 * A Row whose mower has already run is the other case, and is the end of the
 * level in the original. Game Over is not built yet, so until it is, a Zombie that
 * gets past the left edge of such a Row simply leaves - rather than standing off
 * the side of the screen for ever, where no player can see it and the state grows
 * all level.
 *
 * A Lawn Mower is not food. A Zombie walks into the Square a mower stands in and
 * does not eat it, because a mower is not a plant and there is nothing there to
 * eat - it sets the mower off, which is a different rule with a different answer,
 * and is kept in `mowers.ts` so that a Zombie's step is about walking and eating
 * and the mower's is about saving a Row.
 */
export function walkAndEat(
  zombies: readonly Zombie[],
  occupants: readonly Occupant[],
): ZombieStep {
  // Bites are collected first and dealt out afterwards, because two Zombies can
  // be at one plant in the same step and the plant has one amount of health left
  // between them. Taking each bite off the lawn as it happened would find the
  // plant already gone for the second Zombie, which would quietly make the
  // second bite a walk instead.
  const bites = new Map<Planted, number>()

  const after = zombies.map((zombie) => {
    const walked = { ...zombie, walked: zombie.walked + 1 }

    if (zombieX(walked) < 0) {
      return null
    }

    // The plant in the Square it has just walked into, asked the same way the
    // drawing asks it.
    const food = plantBeingEaten(walked, occupants)
    if (food === undefined) {
      return { ...walked, stepsUntilBite: 0 }
    }

    // It has reached the plant, so it stops where it is rather than taking
    // another step: the plant is in the Square it is standing in, and walking on
    // would be walking into it.
    const readyIn = Math.max(0, zombie.stepsUntilBite - 1)
    if (readyIn > 0) {
      return { ...zombie, stepsUntilBite: readyIn }
    }

    bites.set(food, (bites.get(food) ?? 0) + ZOMBIE_BITE_DAMAGE)

    return { ...zombie, stepsUntilBite: ZOMBIE_BITE_INTERVAL }
  })

  const bitten = occupants
    .map((occupant) => {
      if (occupant.kind !== 'plant') {
        return occupant
      }
      const damage = bites.get(occupant)

      return damage === undefined ? occupant : takeBite(occupant, damage)
    })
    .filter((occupant) => occupant.kind !== 'plant' || occupant.health > 0)

  return { zombies: after.filter((zombie) => zombie !== null), occupants: bitten }
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
