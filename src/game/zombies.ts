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
  BUCKETHEAD_ARMOUR,
  CONEHEAD_ARMOUR,
  SLOWED_WALK_FRACTION,
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
export type ZombieName = 'basic' | 'flag' | 'conehead' | 'buckethead'

/** One kind of Zombie, as the rules know it. */
export interface ZombieKind {
  readonly name: ZombieName
  /** How much a pea has to take off before it stops. */
  readonly health: number
  /**
   * How much armour takes hits before health is damaged. Zero for unarmoured
   * Zombies.
   */
  readonly armour: number
}

export const BASIC_ZOMBIE: ZombieKind = {
  name: 'basic',
  health: BASIC_ZOMBIE_HEALTH,
  armour: 0,
}

/**
 * A Flag Zombie: a Basic Zombie carrying a flag.
 *
 * In the roster as a name of its own, because carrying the flag is the whole of
 * what it is, and a player who has been told a Flag Wave is coming looks for the
 * flag rather than for a tougher Zombie. Deliberately the health of an ordinary
 * Zombie and not a number of its own: a flag is something a Zombie is holding, not
 * a kind of armour, and the Flag Wave is what is harder rather than its
 * standard-bearer. A Wave can make it tougher, as the Flag Wave does to everything
 * it sends, but the roster does not.
 */
export const FLAG_ZOMBIE: ZombieKind = {
  name: 'flag',
  health: BASIC_ZOMBIE_HEALTH,
  armour: 0,
}

/**
 * A Conehead Zombie: a Basic Zombie wearing a traffic cone as armour.
 *
 * The cone absorbs hits before the Zombie's body takes damage. When destroyed,
 * the cone comes off and the Zombie beneath is finished like any other.
 */
export const CONEHEAD_ZOMBIE: ZombieKind = {
  name: 'conehead',
  health: BASIC_ZOMBIE_HEALTH,
  armour: CONEHEAD_ARMOUR,
}

/**
 * A Buckethead Zombie: a Basic Zombie wearing a metal bucket as armour.
 *
 * The bucket provides heavy protection, absorbing 1100 damage (fifty-five peas)
 * before coming off, leaving an ordinary Zombie underneath.
 */
export const BUCKETHEAD_ZOMBIE: ZombieKind = {
  name: 'buckethead',
  health: BASIC_ZOMBIE_HEALTH,
  armour: BUCKETHEAD_ARMOUR,
}

/**
 * Every Zombie the game knows, looked up by name.
 *
 * Keyed by name for the same reason the plants are: the roster is data, so the
 * next Zombie is an entry here rather than another branch in the rules.
 */
export const ZOMBIES: Readonly<Record<ZombieName, ZombieKind>> = {
  basic: BASIC_ZOMBIE,
  flag: FLAG_ZOMBIE,
  conehead: CONEHEAD_ZOMBIE,
  buckethead: BUCKETHEAD_ZOMBIE,
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
   * What is left of its armour. Zero when unarmoured or once armour is destroyed.
   * Hits damage armour before health.
   */
  readonly armour: number
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
  /**
   * Steps of slowness still to run out on this Zombie. Zero means it walks at its
   * usual speed.
   *
   * A countdown on the Zombie rather than a flag or a speed for the same reason a
   * bite is a countdown: the lawn and the rules read the same number, and a slow
   * cannot be a step out of step with what is causing it.
   *
   * It is on the Zombie and not on whatever slowed it, which is what makes a slow
   * outlast its cause - dig the Snow Pea up and the Zombie it had slowed is still
   * walking slowly for what is left of the ten seconds, and then is not. That is
   * the rule rather than a detail: a slow is something that happened *to* a Zombie,
   * and undoing the plant does not undo the Zombie's legs.
   */
  readonly stepsSlowed: number
}

/**
 * A Zombie standing at the right edge of a Row, which is where Zombies come in.
 *
 * How much health it walks in with is given rather than looked up from its name,
 * because what a Zombie is worth is a fact about the Wave that sent it and not
 * only about what it is: the same Zombie is worth more in a Flag Wave than in any
 * other, and the Wave is where that is decided. Looked up from the name here, the
 * roster would be the only place a Zombie's health could come from, and the Flag
 * Wave would have to be a different roster rather than the same Zombies in a
 * different Wave.
 */
export function zombieAtEdge(
  id: number,
  name: ZombieName,
  row: Row,
  health: number,
  armour: number,
): Zombie {
  return { id, name, row, walked: 0, health, armour, stepsUntilBite: 0, stepsSlowed: 0 }
}

/**
 * A Zombie with that much damage taken off it.
 *
 * Armour absorbs damage before health is touched. When damage exceeds what is
 * left of the armour, the remaining damage carries over directly to health.
 * Discarding excess damage would mean a pea that destroys one remaining point
 * of armour vanishes the remaining nineteen into thin air, which would make
 * breaking armour an artificial damage sink rather than the protective layer
 * it is designed to be.
 */
export function takeDamage(zombie: Zombie, damage: number): Zombie {
  const damageToArmour = Math.min(zombie.armour, damage)
  const damageToHealth = damage - damageToArmour

  return {
    ...zombie,
    armour: zombie.armour - damageToArmour,
    health: zombie.health - damageToHealth,
  }
}

/**
 * A Zombie with that many steps of slowness on it.
 *
 * The longer of the two rather than the newer, so that a second Snow Pea pea
 * landing on a Zombie that is already slowed cannot *undo* the slowness it was
 * already under. A slow is a floor and not a setting: being slowed again for ten
 * seconds leaves a Zombie no less slowed than it was, and never less.
 */
export function takeSlow(zombie: Zombie, steps: number): Zombie {
  return { ...zombie, stepsSlowed: Math.max(zombie.stepsSlowed, steps) }
}

/**
 * The Zombies still on the lawn: one with nothing left of it is taken off.
 *
 * A Zombie is exhausted when both its body health and its armour are gone.
 * Checking both rather than health alone ensures an armoured enemy cannot be
 * cleared while armour remains, and matches the spec's rule that finishing
 * an armoured Zombie is a two-stage act. Zero and below rather than below zero,
 * so that the pea which finishes a Zombie removes it outright instead of
 * leaving one standing there at minus ten for the plants to go on shooting.
 */
export function removeExhausted(zombies: readonly Zombie[]): readonly Zombie[] {
  return zombies.filter((zombie) => zombie.health > 0 || zombie.armour > 0)
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
 *
 * It also reports which Rows were walked off the end of, because a Zombie leaving
 * the board is something that happened on the lawn rather than something the
 * rules decided about it, and what it means for the level is not this function's
 * to say.
 */
export interface ZombieStep {
  readonly zombies: readonly Zombie[]
  readonly occupants: readonly Occupant[]
  /** The Rows a Zombie walked off the left edge of the board in this step. */
  readonly breached: ReadonlySet<Row>
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
 * level. A Zombie that gets past the left edge of such a Row is recorded as
 * breaching it, and `sim.ts` ends the level from that: this step is about the
 * Zombie having walked off the lawn, not about what the loss means, so that the
 * mower's rule stays the mower's rule and the level's is the level's.
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
  const breached = new Set<Row>()

  const after = zombies.map((zombie) => {
    // A slow runs down on every step, whatever the Zombie is doing. A Zombie being
    // slowed while it is already eating something is not walking any slower, but it
    // is still coming back to full speed while it chews - and a countdown that only
    // ran while a Zombie happened to be walking would be a slow that could be kept
    // off for ever by standing in front of a Wall-nut.
    const slowed: Zombie = { ...zombie, stepsSlowed: Math.max(0, zombie.stepsSlowed - 1) }
    // Whether *this* step was a slowed one, taken before the countdown is spent:
    // the last step of a slow is still a slow step, so a Zombie that is slowed for
    // one step walks half a step and then walks properly.
    const wasSlowed = zombie.stepsSlowed > 0

    // **Where a Zombie has got to is asked before it walks, not after.** What is
    // standing in the Square it is already in is the first question of its step, and
    // the answer is either "I am chewing, so I do not move" or "nothing, so I walk".
    //
    // Asking afterwards, and then handing back the place it was standing at before the
    // step so that it would stay put, looked equivalent and was not. It left a Zombie
    // that had arrived standing in the Square *before* its plant's, so the plant it was
    // chewing on was not the plant `plantBeingEaten` found for it afterwards. Nothing
    // said so, because a Zombie that has arrived does not move on the next step either
    // - so every check that asked where it stopped passed, and asked a position that
    // was a quarter of a Column to the right of where the picture and the rules both
    // said it was.
    //
    // Two things ask that second question, and both were getting the wrong answer. The
    // drawing asks whether a Zombie is eating before it draws the Zombie reaching out,
    // so every Zombie in this project has been drawn standing beside the plant it was
    // eating with its arms down. A Potato Mine asks it to decide whether it has been
    // reached, so a mine whose Zombie was a Square to its right never fired - which is
    // how a mine came to be impossible to build. The fix is the order of two lines,
    // and the order is the whole of the rule: **a Zombie is somewhere because it walked
    // there, and a Zombie that is chewing is somewhere it walked to.**
    const here = plantBeingEaten(zombie, occupants)
    if (here !== undefined) {
      // Chewing, so it does not walk. Its place is the place it walked to and the slow
      // still counts down on it, so the only two things that change are the bite
      // countdown and the slow.
      const chewing: Zombie = { ...slowed, walked: zombie.walked }
      const readyIn = Math.max(0, slowed.stepsUntilBite - 1)

      if (readyIn > 0) {
        return { ...chewing, stepsUntilBite: readyIn }
      }

      bites.set(here, (bites.get(here) ?? 0) + ZOMBIE_BITE_DAMAGE)

      return { ...chewing, stepsUntilBite: ZOMBIE_BITE_INTERVAL }
    }

    // Nothing to eat where it is, so it takes a step. A slow shortens the step rather
    // than making the Zombie skip one: skipping is the obvious way to slow something
    // down and it cannot express a fraction - a Zombie that took a whole step every
    // other step is walking at half speed exactly, and one slowed to anything else
    // would either have to skip a step it did not have or drift. Half a step is a
    // number the tally can hold, which is the whole reason `walked` is a tally of steps
    // and not a place.
    const walked = { ...slowed, walked: slowed.walked + (wasSlowed ? SLOWED_WALK_FRACTION : 1) }

    // Past the left edge of the board is off the board, and a Row that had a mower
    // never gets a Zombie this far: the mower is set off on the mower Square, one
    // Column in, so the only way to be here is a Row that has already spent its
    // mower. Recorded rather than acted on, because a Zombie's step is about
    // walking and eating and being gone from the lawn, and what a walk-off means
    // for the level is `sim.ts`'s business.
    if (zombieX(walked) < 0) {
      breached.add(zombie.row)
      return null
    }

    // The step has landed it in a plant's Square, so this is the step it arrives on and
    // the step it bites on. It stops here - the Square it is standing in is the
    // plant's, and walking on would be walking into it - and every step after this one
    // is the *first* branch, which is how it stays here without remembering that it
    // arrived: a Zombie chewing is one that is standing in a plant's Square, and that
    // is worked out from the lawn rather than remembered.
    const arrived = plantBeingEaten(walked, occupants)
    if (arrived === undefined) {
      return { ...walked, stepsUntilBite: 0 }
    }

    bites.set(arrived, (bites.get(arrived) ?? 0) + ZOMBIE_BITE_DAMAGE)

    return { ...walked, stepsUntilBite: ZOMBIE_BITE_INTERVAL }
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

  return { zombies: after.filter((zombie) => zombie !== null), occupants: bitten, breached }
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
