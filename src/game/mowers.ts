import { hasLawnMower, squareAtX, type Occupant, type Row } from './board.ts'
import { zombieX, type Zombie } from './zombies.ts'

/**
 * What one step of the Lawn Mowers did.
 *
 * The same shape as a Zombie's step, and for the same reason: a mower changes two
 * things at once, the Zombies in its Row and the lawn it stood on, so one step of
 * play hands both back rather than being two that have to be kept in step.
 */
export interface MowerStep {
  readonly zombies: readonly Zombie[]
  readonly occupants: readonly Occupant[]
  readonly spentMowers: readonly Row[]
}

/**
 * One step of every Lawn Mower on the board: a mower a Zombie has reached runs,
 * and takes every Zombie in that Row off the lawn with it.
 *
 * A mower is set off by a Zombie *arriving at the Square it stands in*, asked of
 * the place rather than of a distance, so that the left edge of a Row is a place
 * on the board like any other. The same question the Zombie asked a moment ago to
 * find out whether there was a plant to eat answers this one, which is why a
 * mower arriving is a rule about Squares and not about how far a Zombie has
 * walked.
 *
 * It clears the whole Row, not the one Zombie that set it off, because that is
 * what makes the mower a rescue: a Row that has been broken twice over is saved
 * by the mower once, and a player watching four Zombies walk in to a row they
 * have already lost has been given the lawn back, not a reprieve on the front
 * Zombie.
 *
 * A spent mower is off the lawn, not marked on it. The mower's absence is the
 * whole of the record that it has run, so a Row's mower is the one question -
 * is there one standing there - that says whether the Row can still be saved, and
 * a mower that has run needs no state of its own to remember it. The same shape as
 * a plant that has been eaten and a Zombie that has been killed: gone from the
 * lawn rather than still standing on it with a number at zero.
 *
 * It does not drive across the lawn over time, and does not deal its damage out
 * as it goes. The Row is clear on the step the mower runs, which is what lets a
 * check ask whether a Row was saved without first asking how fast the mower
 * travels, and it is honest about the shape of the thing: a mower is not a
 * projectile, it is the Row's last defence going off all at once.
 */
export function runMowers(
  zombies: readonly Zombie[],
  occupants: readonly Occupant[],
  spentMowers: readonly Row[] = [],
): MowerStep {
  const running = rowsWithAMowerReached(zombies, occupants)

  if (running.size === 0) {
    return { zombies, occupants, spentMowers }
  }

  const updatedSpent = [...new Set([...spentMowers, ...running])].sort((a, b) => a - b)

  return {
    zombies: zombies.filter((zombie) => !running.has(zombie.row)),
    occupants: occupants.filter(
      (occupant) => occupant.kind !== 'lawnMower' || !running.has(occupant.square.row),
    ),
    spentMowers: updatedSpent,
  }
}

/**
 * The Rows whose mower has been reached this step.
 *
 * Asked by looking along every Zombie rather than along the mowers, because the
 * mowers are what is being found: two Zombies can reach two different Rows in one
 * step, and both rows are then saved, and the only question worth asking once per
 * Zombie is which Row it is in and whether that Row still has a mower standing.
 */
function rowsWithAMowerReached(
  zombies: readonly Zombie[],
  occupants: readonly Occupant[],
): ReadonlySet<Row> {
  const running = new Set<Row>()

  for (const zombie of zombies) {
    const square = squareAtX(zombie.row, zombieX(zombie))
    if (square === null) {
      continue
    }
    if (hasLawnMower(occupants, square)) {
      running.add(zombie.row)
    }
  }

  return running
}
