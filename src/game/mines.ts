import { plantBeingEaten, type Zombie } from './zombies.ts'
import { PLANTS } from './plants.ts'
import type { Occupant } from './board.ts'

/**
 * What one step of every mine on the lawn did.
 *
 * Both halves of the lawn come back, because a mine takes a Zombie off it as well as
 * itself: the same shape as `walkAndEat` and `flyRight`, where what a step does to
 * the Zombies and what it does to the plants are one step rather than two that have
 * to be kept in step with each other.
 */
export interface MineStep {
  readonly zombies: readonly Zombie[]
  readonly occupants: readonly Occupant[]
}

/**
 * One step of every mine on the lawn: each spends a step of the delay it is waiting
 * out, and one that is armed and has a Zombie standing in it takes that Zombie off the
 * lawn and leaves the lawn itself.
 *
 * A plant that does not arm is left exactly as it was, so a Peashooter is never made
 * to wait out a delay it does not have and there is one place in the rules that knows
 * what a mine is.
 *
 * **"A Zombie that reaches it" is asked with the same question the Zombie's own step
 * asked.** `plantBeingEaten` is the function `walkAndEat` uses to find what a Zombie
 * is chewing on, and it is asked here of the same lawn, so a mine and the Zombie
 * standing on it cannot disagree about whether it has been reached. That is the whole
 * reason it is asked that way rather than worked out again from a place along a Row:
 * two answers to one question is how a mine ends up firing at a Zombie that is still
 * three Columns away, and nothing notices because nothing is watching.
 *
 * Asking it of the lawn also settles a case for free that would otherwise need a rule
 * of its own. A mine that was being eaten and had its last bite taken off it this
 * step is not on the lawn any more, so there is nothing for it to fire at and it does
 * not fire - a mine reached one step before it armed destroys nothing, which is the
 * answer and not an accident.
 *
 * **"The first Zombie" is the first in the list, and the list is in the order the
 * lawn hands it over.** That is all that is decided when two Zombies reach one mine
 * on the same step: one of them is destroyed and the other walks on, because a mine
 * is spent on the one it was spent on. Not the nearer Zombie and not the one that
 * got there first, because at that point they have both got there at once, and
 * choosing between them would be a rule about the order of a list rather than about
 * the lawn.
 *
 * **A Zombie a mine takes is gone, not wounded.** There is no damage number here and
 * no room for one, which is the same answer a Lawn Mower gives and for the same
 * reason: what a mine does is remove a Zombie from the lawn rather than take a
 * quantity off it. A number would make the plant's strength something that can turn
 * out to be too small, and whether a mine is too small for a Conehead is a question
 * `docs/plan.md` has not answered - it is ticket 16's, and it is not answered here by
 * accident.
 */
export function detonateMines(zombies: readonly Zombie[], occupants: readonly Occupant[]): MineStep {
  const taken = new Set<Zombie>()
  const fired = new Set<Occupant>()

  const onTheLawn = occupants.map((occupant) => {
    if (occupant.kind !== 'plant' || PLANTS[occupant.name].arming === null) {
      return occupant
    }

    // A countdown that still has steps left is spent on them and the mine is left as
    // it was, which is what a mine is for the fifteen seconds after it is planted - and
    // the fifteen seconds are the plant, so this is the rule rather than a pause before
    // it. A countdown at one becomes zero *on this step* and the mine is armed from here
    // on: a timer that armed a step after its delay was up would be a mine that was late
    // for exactly as long as it took to notice, and "fifteen seconds" would be fifteen
    // seconds and a bit.
    if (occupant.stepsUntilArmed > 1) {
      return { ...occupant, stepsUntilArmed: occupant.stepsUntilArmed - 1 }
    }

    // `find` is the whole of "the first Zombie", and not a detail of it. Two Zombies can
    // reach one mine on the same step, and the question is which of them it takes: `find`
    // hands back one of them and the mine is spent, so the other walks on. There is
    // nothing to choose between them and nothing to choose *by* - they have both got
    // there at once, and the nearest one and the first one are not answers to a question
    // this board can ask.
    const reached = zombies.find((zombie) => plantBeingEaten(zombie, occupants) === occupant)

    if (reached === undefined) {
      return { ...occupant, stepsUntilArmed: 0 }
    }

    taken.add(reached)

    // The mine that has fired is the one put in the lawn, not the one that was in it
    // when the step began - so the spent one is what is remembered, and what is later
    // taken off the lawn. Remembering the other would leave the mine standing in a
    // Square it had just blown up in, and the Zombie's own removal would still be
    // right: a mine that destroyed a Zombie and then carried on being a mine is not a
    // one-shot, and the Square it stands in is a Square nothing can be planted in.
    const spent = { ...occupant, stepsUntilArmed: 0 }
    fired.add(spent)

    return spent
  })

  // A mine that has fired is not standing in its Square any more, and the Square is
  // bare grass for whatever goes in next.
  //
  // Asked of `onTheLawn` in one go rather than spliced out as each mine fires, because the
  // two are the same answer here: every mine's question is asked of `occupants` - the lawn
  // as the step found it - and matched against its own identity, so nothing a mine does
  // can change what another mine is asked. Two Zombies reaching two different mines in one
  // step are two detonations because they are two separate questions, not because of when
  // the answers are applied.
  //
  // (The check that two mines in two Rows both fire on the same step exists anyway, and is
  // worth having - but what it holds is the *behaviour*, and the earlier version of this
  // comment claimed it was holding the order of these two lines, which it could not be.)
  return {
    zombies: zombies.filter((zombie) => !taken.has(zombie)),
    occupants: onTheLawn.filter((occupant) => !fired.has(occupant)),
  }
}
