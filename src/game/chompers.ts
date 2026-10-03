import { plantBeingEaten, type Zombie } from './zombies.ts'
import { PLANTS } from './plants.ts'
import type { Occupant } from './board.ts'

/**
 * What one step of every Chomper on the lawn did.
 *
 * Both halves of the lawn come back, for the reason `mines.ts` and `bombs.ts` each
 * give: a Chomper changes the Zombies on the lawn as well as the Chomper itself, so
 * one step of play hands both back rather than being two that have to be kept in step.
 */
export interface ChomperStep {
  readonly zombies: readonly Zombie[]
  readonly occupants: readonly Occupant[]
}

/**
 * One step of every Chomper on the lawn: each spends a step of the chew it is working
 * through, and one that is not chewing and has a Zombie standing in it takes that
 * Zombie off the lawn.
 *
 * **This is the first rule in the game that a plant spends afterwards.** A Potato Mine
 * arms and then fires and is gone; a Cherry Bomb fires and is gone; a Chomper fires and
 * *stays*, and what it spends doing is the next forty-two seconds. That is why this
 * file has a countdown on the plant at all, and it is why the countdown is the whole
 * of the plant rather than one of its numbers: what a Chomper does to a Zombie is not a
 * choice - it removes the first one that reaches it, exactly as a mine does - so the
 * only thing about it a designer could choose differently is how long it is then out
 * of action.
 *
 * **The chew is spent before the plant is asked whether it can eat, and that order is
 * the rule.** A Chomper that ate on the same step its chew ran out would be chewing
 * for forty-one steps rather than forty-two, and every check about the boundary would
 * move with it. Spending first means a Chomper that is chewing on the last step of its
 * chew spends it, is at zero, and eats on the *next* step - which is the same reading
 * `stepsUntilArmed` gives a mine (one step before the delay is up the mine is one step
 * from armed) and the same one `stepsUntilBite` gives a Zombie chewing on a plant.
 *
 * **A Chomper that is chewing is still a plant, and still food.** Nothing here exempts
 * it: the rule for a plant in a Zombie's way is that a Zombie stops and eats it, and
 * that is `walkAndEat`'s rule and it does not read this file at all. So a Zombie that
 * walks into a chewing Chomper stops and eats it, and a Zombie that walks into a
 * Chomper that has just finished a chew is eaten instead. Which of those two happens
 * is the whole of the plant, and the only thing that decides it is one number.
 *
 * **"The first Zombie" is the first in the list, and the list is in the order the lawn
 * hands it over** - the same rule as the mine's, and the same reason. Two Zombies can
 * reach one Chomper on the same step; `find` takes one, the Chomper starts chewing,
 * and the other walks on. A Chomper that took both would be a Chomper that could eat
 * twice at once, which is the one thing the chew exists to prevent.
 *
 * **Where this runs in `advance` is load-bearing, and it is after `walkAndEat`.** A
 * Chomper eats a Zombie that has *reached* it, so it can only be asked once the Zombies
 * have taken their step and are standing where they have got to - the same argument
 * that puts `detonateMines` there. It is before `detonateMines` because a mine needs a
 * Zombie that is still standing to be spent on, and a Chomper that has just eaten one
 * has taken it off the lawn rather than leaving it for a mine in the same Square to
 * find. Asking the Chompers after the mines would let a Zombie be eaten by a mine and
 * then chewed by a Chomper that was standing on it.
 */
export function devourWithChompers(
  zombies: readonly Zombie[],
  occupants: readonly Occupant[],
): ChomperStep {
  const taken = new Set<Zombie>()

  const onTheLawn = occupants.map((occupant) => {
    // A plant that does not devour is left exactly as it was, so a Peashooter is
    // never made to chew and there is one place in the rules that knows what a
    // Chomper is.
    if (occupant.kind !== 'plant') {
      return occupant
    }

    const devouring = PLANTS[occupant.name].devouring
    if (devouring === null) {
      return occupant
    }

    // The chew is spent before the plant is asked whether it can eat - see the note on
    // the order above. A countdown that still has steps left is spent on them and the
    // Chomper is left as it was, which is what a Chomper is for the whole of the next
    // forty-two seconds after eating: standing in a Row, unable to touch what is walking
    // down it, and being eaten for its trouble.
    if (occupant.stepsUntilChewed > 1) {
      return { ...occupant, stepsUntilChewed: occupant.stepsUntilChewed - 1 }
    }

    // `plantBeingEaten` is the question `walkAndEat` asked a moment ago to find out
    // what this Zombie is chewing on, asked of the same lawn - so a Chomper and the
    // Zombie standing on it cannot disagree about whether it has been reached. That is
    // the whole of why it is asked that way and not worked out again from a place along
    // a Row, and it is the arrangement ADR 0009 records for the mine.
    const reached = zombies.find((zombie) => plantBeingEaten(zombie, occupants) === occupant)

    if (reached === undefined) {
      return { ...occupant, stepsUntilChewed: 0 }
    }

    taken.add(reached)

    // **The Chomper that has eaten is the one put in the lawn, not the one that was in
    // it when the step began** - so the whole chew is remembered, and what the drawing
    // reads is the Chomper the rules are chewing. Remembering the other would leave the
    // plant at zero for one step, so it would be drawn ready and able to eat on the
    // step after it had eaten, which is the boundary this plant is about.
    //
    // **And the lawn is handed straight back.** Nothing is filtered out of it here, and
    // that is the whole difference from `mines.ts` and `bombs.ts`: both of those put the
    // spent plant in a set and filter it out, because both of those plants *are* spent.
    // A Chomper has not been spent - it is standing in its Square for the rest of the
    // level, chewing. Filtering it out here was a copy of the two files above pasted
    // into a case it does not fit, and it took the Chomper off the lawn on the step it
    // ate: every claim in the first check of this file passed anyway, because the Zombie
    // was gone and a check that only asks about the Zombie cannot tell a Chomper from a
    // Chomper that has been eaten itself.
    return { ...occupant, stepsUntilChewed: devouring.chew }
  })

  // Every Chomper's question is asked of `occupants` - the lawn as the step found it -
  // and matched against its own identity, so nothing one Chomper does can change what
  // another is asked. Two Chompers in two Rows eating on the same step are two meals,
  // because they are two separate questions and not a question about when the answers
  // are applied.
  return {
    zombies: zombies.filter((zombie) => !taken.has(zombie)),
    occupants: onTheLawn,
  }
}
