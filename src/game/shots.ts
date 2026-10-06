import { centreX, LOGICAL_WIDTH, SQUARE_WIDTH, type Occupant, type Row, type Square } from './board.ts'
import { SHOT_STEPS_PER_COLUMN } from './balance.ts'
import { PLANTS, type ShotEffect } from './plants.ts'
import { nearestAheadOf, removeExhausted, takeDamage, takeSlow, zombieX, type Zombie } from './zombies.ts'

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
  /** Steps of slowness a Zombie this pea reaches is left with. Zero for none. */
  readonly slowSteps: number
  /**
   * Whether this pea passes through a Zombie it reaches rather than being spent on
   * the first one.
   */
  readonly passesThrough: boolean
  /**
   * How far along its Row this pea goes before it is spent, in board units.
   *
   * Worked out when the pea is fired rather than carried as a Column count, for
   * the same reason the damage above is carried rather than looked up: this is
   * what the pea is, and it cannot change while the pea is in the air. A pea
   * whose plant is dug up mid-flight still reaches as far as it was going to.
   */
  readonly reachX: number
}

/** State slice required to resolve one step of projectile combat. */
export interface CombatInput {
  readonly shots: readonly Shot[]
  readonly zombies: readonly Zombie[]
  readonly occupants: readonly Occupant[]
  readonly nextShotId: number
}

/** Result of resolving one step of projectile combat. */
export interface CombatResult {
  readonly shots: readonly Shot[]
  readonly zombies: readonly Zombie[]
  readonly occupants: readonly Occupant[]
  readonly nextShotId: number
}

/** What one step of the peas on the lawn did. */
interface ShotStep {
  /** The peas still in flight; the ones that landed are spent. */
  readonly shots: readonly Shot[]
  /** The Zombies, with a Zombie's health taken off where a pea arrived. */
  readonly zombies: readonly Zombie[]
}

/** How far a pea travels in one step, in board units. */
export const SHOT_MOVE_PER_STEP = SQUARE_WIDTH / SHOT_STEPS_PER_COLUMN

/**
 * Resolves one step of projectile combat:
 * 1. Peas in flight advance, collide with targets, and deal damage/slowness.
 * 2. Casualties (zero or negative health) are removed from the lawn.
 * 3. Readied plants target living survivors and discharge new shots.
 */
export function resolveCombat(input: CombatInput): CombatResult {
  const landing = flyRight(input.shots, input.zombies)
  const standing = removeExhausted(landing.zombies)
  const fired = fireFromPlants(input.occupants, standing, landing.shots, input.nextShotId)

  return {
    shots: fired.shots,
    zombies: standing,
    occupants: fired.occupants,
    nextShotId: fired.nextShotId,
  }
}

/**
 * A pea leaving a plant, on its way to a particular Zombie.
 *
 * The pea is built here from what the plant shoots, so the plant's own description
 * of its shot is turned into the travelling thing once and the flight never has to
 * ask what plant this came from.
 */
function fireShot(id: number, square: Square, target: Zombie, effect: ShotEffect): Shot {
  const x = centreX(square)

  return {
    id,
    row: square.row,
    x,
    targetId: target.id,
    damage: effect.damage,
    slowSteps: effect.slowSteps,
    passesThrough: effect.passesThrough,
    reachX: x + effect.reachIn * SQUARE_WIDTH,
  }
}

/**
 * One step of every pea on the lawn: each travels right, and lands on the Zombies
 * it has reached, and is spent unless it passes through what it meets.
 *
 * A plain pea lands by arriving at its target's place, not by touching whatever is
 * under it. That is the whole of "only the Zombie it was aimed at": a pea whose
 * target has already gone carries on past a Zombie that happens to be walking
 * into its path, and a pea only ever names a Zombie in its own Row, so it cannot
 * cross into another one however the Rows are lined up.
 *
 * The three shooter variants are this loop with one of three answers changed, and
 * each of them is a field on the pea rather than a branch in here: a pea that
 * passes through lands on every Zombie it has reached and carries on, and a pea
 * with a reach is spent when it has gone that far. A Peashooter's pea sets all
 * three the ordinary way and behaves exactly as it did before any of them existed,
 * which is the point of the Peashooter being the plain one.
 */
function flyRight(shots: readonly Shot[], zombies: readonly Zombie[]): ShotStep {
  const damage = new Map<number, number>()
  const slowed = new Map<number, number>()

  const flying = shots
    .map((shot) => ({ ...shot, x: shot.x + SHOT_MOVE_PER_STEP }))
    .filter((shot) => {
      // A pea past the far edge of the board has left the lawn. It happens when
      // the Zombie it was aimed at was killed by something else: the pea carries
      // on, crosses the lawn and goes, rather than being drawn for ever.
      if (shot.x >= LOGICAL_WIDTH) {
        return false
      }

      // A pea that runs out of reach goes the same way, and for the same reason:
      // it has nowhere further to go. Kept apart from the lawn above because they
      // are different answers - a pea that crossed the whole lawn was never going
      // to stop, whereas a Puff-shroom's pea was always going to stop and has
      // stopped. The plant that fired it is not asked which of the two this is;
      // the pea knows, because its reach came with it.
      if (shot.x >= shot.reachX) {
        return false
      }

      const hit = shot.passesThrough
        ? everyZombieItHasReached(shot, zombies)
        : theOneItWasAimedAt(shot, zombies)

      if (hit.length === 0) {
        return true
      }

      for (const zombie of hit) {
        damage.set(zombie.id, (damage.get(zombie.id) ?? 0) + shot.damage)
        if (shot.slowSteps > 0) {
          slowed.set(zombie.id, shot.slowSteps)
        }
      }

      return shot.passesThrough
    })

  // Damage and slowness are collected first and dealt out together, for the same
  // reason bites are in `walkAndEat`: two peas can reach one Zombie in the same step
  // and the Zombie has one amount of health and one slow between them. A pea that
  // found the Zombie already dead of the other's damage would find it already off
  // the lawn, and would quietly leave it un-slowed.
  const wounded = zombies.map((zombie) => {
    const taken = damage.get(zombie.id)
    const chilled = slowed.get(zombie.id)
    if (taken === undefined && chilled === undefined) {
      return zombie
    }

    const hurt = taken === undefined ? zombie : takeDamage(zombie, taken)

    return chilled === undefined ? hurt : takeSlow(hurt, chilled)
  })

  return { shots: flying, zombies: wounded }
}

/**
 * The one Zombie a pea was aimed at, if the pea has got there.
 *
 * Empty for a pea still short of its target, which is what keeps a pea flying, and
 * empty for one whose target is no longer on the lawn at all: a pea aimed at a
 * Zombie that something else has killed carries on down the Row and leaves, rather
 * than stopping on the spot where a Zombie used to be.
 */
function theOneItWasAimedAt(shot: Shot, zombies: readonly Zombie[]): readonly Zombie[] {
  const target = zombies.find((zombie) => zombie.id === shot.targetId && zombie.row === shot.row)

  return target !== undefined && shot.x >= zombieX(target) ? [target] : []
}

/**
 * Every Zombie in this pea's own Row that this pea swept over on this step.
 *
 * *Every* one rather than the first, which is the whole of what a Snow Pea's shot
 * is: a pea that goes through what it meets instead of stopping on it, so one of
 * them damages and slows a whole line of Zombies walking into it.
 *
 * Both edges of the pea matter, and the second one is the whole of the rule. A pea
 * moves right and a Zombie walks left, so they cross exactly once, and a Zombie is
 * hit on the step the pea comes level with it - neither before the pea has got there
 * nor after it has gone past. Testing only "the pea has reached it" would say a pea
 * hits a Zombie it has already walked past, and on every step for the rest of its
 * life, which would empty a Zombie in a fraction of the time its health says it
 * takes and would do it to a Zombie that had already gone by.
 *
 * The Zombie also has to be in this pea's own Row, so a pea level with a Zombie in
 * the Row above is as unaffected by it as any other pea is - the same rule as the
 * plain one, and the reason a Snow Pea cannot be a plant that slows the whole lawn
 * by accident.
 */
function everyZombieItHasReached(shot: Shot, zombies: readonly Zombie[]): readonly Zombie[] {
  const from = shot.x - SHOT_MOVE_PER_STEP

  return zombies.filter(
    (zombie) => zombie.row === shot.row && zombieX(zombie) <= shot.x && zombieX(zombie) >= from,
  )
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
function fireFromPlants(
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

    // A plant that fires more than one projectile fires them all in the same shot,
    // at the same target, and is then ready again on the same rhythm as a plant that
    // fires one. The alternative - a Repeater firing its second pea a firing
    // interval later - is not a plant that shoots twice as hard but one that shoots
    // twice as often, which is a different plant and a worse one: it would spend the
    // whole of the Peashooter's rhythm on half as much damage.
    for (let pea = 0; pea < shooting.projectiles; pea++) {
      flying = [...flying, fireShot(nextId, occupant.square, target, shooting.shot)]
      nextId += 1
    }

    return { ...occupant, stepsUntilShot: shooting.fireInterval }
  })

  return { shots: flying, occupants: onTheLawn, nextShotId: nextId }
}
