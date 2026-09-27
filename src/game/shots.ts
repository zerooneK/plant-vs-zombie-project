import { centreX, LOGICAL_WIDTH, SQUARE_WIDTH, type Occupant, type Row, type Square } from './board.ts'
import { SHOT_STEPS_PER_COLUMN } from './balance.ts'
import { PLANTS } from './plants.ts'
import { nearestAheadOf, takeDamage, zombieX, type Zombie } from './zombies.ts'

/**
 * One pea in flight.
 *
 * A pea is a point in a Row rather than a thing in a Square: it crosses Columns
 * on the way to a Zombie, and is spent where it arrives.
 */
export interface Shot {
  /** Names this pea, so that two peas from one plant can be told apart. */
  readonly id: number
  readonly row: Row
  /** How far along its Row the pea is, in board units from the left edge. */
  readonly x: number
  /**
   * The Zombie this pea was aimed at.
   *
   * Aimed rather than merely heading down the Row, because a pea hits the Zombie
   * it was fired at and no other: a Zombie that walks into its path afterwards is
   * not what the plant meant, and a pea does not change its mind in flight.
   */
  readonly targetId: number
  /**
   * What this pea does to a Zombie that it reaches.
   *
   * Carried by the pea rather than looked up from the plant, because what a pea
   * does is settled when it is fired and cannot be changed in flight - which is
   * what lets the Repeater's two peas be told apart and the Snow Pea's pea
   * behave differently later on.
   */
  readonly damage: number
}

/** What one step of the peas on the lawn did. */
export interface ShotStep {
  /** The peas still in flight; the ones that landed are spent. */
  readonly shots: readonly Shot[]
  /** The Zombies, with a Zombie's health taken off where a pea arrived. */
  readonly zombies: readonly Zombie[]
}

/** How far a pea travels in one step, in board units. */
export const SHOT_MOVE_PER_STEP = SQUARE_WIDTH / SHOT_STEPS_PER_COLUMN

/** A pea leaving a plant, on its way to a particular Zombie. */
export function fireShot(id: number, square: Square, target: Zombie, damage: number): Shot {
  return { id, row: square.row, x: centreX(square), targetId: target.id, damage }
}

/**
 * One step of every pea on the lawn: each travels right, and a pea that has
 * reached the Zombie it was aimed at hits it and is spent.
 *
 * A pea lands by arriving at its target's place, not by touching whatever is
 * under it. That is the whole of "only the Zombie it was aimed at": a pea whose
 * target has already gone carries on past a Zombie that happens to be walking
 * into its path, and a pea only ever names a Zombie in its own Row, so it cannot
 * cross into another one however the Rows are lined up.
 */
export function flyRight(shots: readonly Shot[], zombies: readonly Zombie[]): ShotStep {
  const damage = new Map<number, number>()

  const flying = shots
    .map((shot) => ({ ...shot, x: shot.x + SHOT_MOVE_PER_STEP }))
    .filter((shot) => {
      // A pea past the far edge of the board has left the lawn. It happens when
      // the Zombie it was aimed at was killed by something else: the pea carries
      // on, crosses the lawn and goes, rather than being drawn for ever.
      if (shot.x >= LOGICAL_WIDTH) {
        return false
      }
      const target = zombies.find((zombie) => zombie.id === shot.targetId && zombie.row === shot.row)
      if (target === undefined || shot.x < zombieX(target)) {
        return true
      }
      damage.set(target.id, (damage.get(target.id) ?? 0) + shot.damage)
      return false
    })

  const wounded = zombies.map((zombie) => {
    const taken = damage.get(zombie.id)
    return taken === undefined ? zombie : takeDamage(zombie, taken)
  })

  return { shots: flying, zombies: wounded }
}

/**
 * Every plant that is ready to shoot and has a Zombie in front of it does.
 *
 * A plant's countdown runs whether or not there is anything to shoot, so a
 * Peashooter keeps its rhythm rather than firing the instant a Zombie appears.
 * A countdown that has run out sits at zero, though, so a plant that has been
 * ready and waiting fires the moment there is a target - which is what a plant
 * waiting with nothing to shoot is doing anyway.
 */
export function fireFromPlants(
  occupants: readonly Occupant[],
  zombies: readonly Zombie[],
  shots: readonly Shot[],
  firstShotId: number,
): { shots: readonly Shot[]; occupants: readonly Occupant[]; nextShotId: number } {
  let flying = shots
  let nextId = firstShotId

  const onTheLawn = occupants.map((occupant) => {
    if (occupant.kind !== 'plant') {
      return occupant
    }

    const shooting = PLANTS[occupant.name].shooting
    if (shooting === null) {
      return occupant
    }

    const readyIn = Math.max(0, occupant.stepsUntilShot - 1)
    if (readyIn > 0) {
      return { ...occupant, stepsUntilShot: readyIn }
    }

    const from = centreX(occupant.square)
    const target = nearestAheadOf(zombies, occupant.square.row, from)
    if (target === undefined) {
      return { ...occupant, stepsUntilShot: readyIn }
    }

    flying = [...flying, fireShot(nextId, occupant.square, target, shooting.damage)]
    nextId += 1

    return { ...occupant, stepsUntilShot: shooting.fireInterval }
  })

  return { shots: flying, occupants: onTheLawn, nextShotId: nextId }
}
