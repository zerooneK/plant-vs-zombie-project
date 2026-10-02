import { squareAtX, type Occupant, type Square } from './board.ts'
import { PLANTS, type Detonating } from './plants.ts'
import { zombieX, type Zombie } from './zombies.ts'

/**
 * What one step of every Cherry Bomb on the lawn did.
 *
 * Both halves of the lawn come back, for the same reason `mines.ts` gives: a bomb
 * takes Zombies off it as well as itself, and one step of play has to hand both
 * back rather than being two steps that have to be kept in step with each other.
 */
export interface BombStep {
  readonly zombies: readonly Zombie[]
  readonly occupants: readonly Occupant[]
}

/**
 * One step of every Cherry Bomb on the lawn: each takes the Zombies standing near it
 * off the lawn and leaves the lawn itself.
 *
 * **This is the second rule in the game that ends a plant's life in one step rather
 * than by a bite**, and it is the only one that does not need a countdown on the
 * plant to know when. A Potato Mine carries `stepsUntilArmed` and the rules read it;
 * a Cherry Bomb carries nothing, because it is spent on the step it goes down and the
 * rules are never asked whether it is ready. There is no question "has this bomb gone
 * off yet" in this file, and its absence is the design: a Cherry Bomb is not a plant
 * that becomes a bomb, it *is* one, the moment it is planted. `docs/adr/0010` has why
 * it could not have been an `arming` plant even with a delay of zero.
 *
 * **It is not one of the Zombies it clears, and it is not "the first" of anything.**
 * The whole of a blast is that it removes *every* Zombie in its area, not one chosen
 * among them: that is the difference between a Cherry Bomb and a Potato Mine, and it
 * is why this file has no `find` anywhere in it. A mine spends itself on one Zombie and
 * the rest walk on; a bomb spends itself on the whole area and everything in it goes.
 *
 * **A blast removes Zombies, not plants, and that is not an exception.** Nothing
 * anywhere in this game removes a plant except a bite and the Shovel - a mower takes
 * a Row of Zombies and leaves the plants in it standing, a mine takes one Zombie and
 * leaves the rest of the lawn alone. So a Cherry Bomb standing beside a Wall-nut
 * blows the Zombies off the lawn and the Wall-nut is still there afterwards, with
 * whatever health it had. This is what the original does, and it is also what falls
 * out of rules that were already here rather than out of a new rule saying so.
 *
 * Where this runs in `advance` is load-bearing, and it is *before* the Zombies walk,
 * which is the opposite of where the mines run. A mine is set off by a Zombie
 * *arriving* at it, so it can only be asked once the Zombies have taken their step
 * and are standing where they have got to. A bomb is not waiting for anything: it
 * goes off because it was planted, so it can be asked before the Zombies move, and
 * running it before `walkAndEat` is what makes a bomb thrown at a Zombie that is
 * about to arrive on a plant kill it rather than letting it take that bite first.
 */
export function detonateBombs(zombies: readonly Zombie[], occupants: readonly Occupant[]): BombStep {
  const taken = new Set<Zombie>()
  const fired = new Set<Occupant>()

  const onTheLawn = occupants.map((occupant) => {
    // A plant that does not detonate is left exactly as it was, so a Peashooter is
    // never made to blow itself up and there is one place in the rules that knows
    // what a Cherry Bomb is.
    if (occupant.kind !== 'plant') {
      return occupant
    }

    const blast = PLANTS[occupant.name].detonating
    if (blast === null) {
      return occupant
    }

    for (const zombie of zombies) {
      if (isInTheBlast(zombie, occupant.square, blast)) {
        taken.add(zombie)
      }
    }

    // The bomb that has fired is the one put in the lawn, not the one that was in it
    // when the step began - so the spent one is what is remembered, and what is later
    // taken off the lawn. Remembering the other would leave the bomb standing in a
    // Square it had just blown up in, and a Square nothing can then be planted in.
    const spent = { ...occupant, stepsUntilArmed: 0, stepsUntilShot: 0 }
    fired.add(spent)

    return spent
  })

  // A bomb that has fired is not standing in its Square any more, and the Square is
  // bare grass for whatever goes in next - the same answer as a mine, and for the
  // same reason.
  return {
    zombies: zombies.filter((zombie) => !taken.has(zombie)),
    occupants: onTheLawn.filter((occupant) => !fired.has(occupant)),
  }
}

/**
 * Whether this Zombie is standing inside a blast centred on this Square.
 *
 * **Asked of the Zombie's place with `squareAtX` - the same question `walkAndEat`
 * and the drawing both ask**, rather than a distance worked out again from a Zombie
 * and a plant. It is the same arrangement as the mine: the lawn is read in one place,
 * in board units, and everybody reads it the same way, so what the rules think a
 * Zombie's Column is and what the picture thinks it is cannot come apart.
 *
 * Note what this asks and does not ask. It asks whether the Zombie is *standing in* a
 * Square the blast covers, and not how close it is to the bomb: a Zombie is not in a
 * Square, it is somewhere along a Row between Squares, so the question of whether an
 * explosion reaches it has to be answered by which Square it is currently in rather
 * than by a distance from a point. That is also why the blast is expressed in Rows
 * and Columns rather than in board units - see `CHERRY_BOMB_BLAST_ROWS`.
 */
function isInTheBlast(zombie: Zombie, centre: Square, blast: Detonating): boolean {
  const square = squareAtX(zombie.row, zombieX(zombie))

  if (square === null) {
    return false
  }

  return (
    Math.abs(square.row - centre.row) <= blast.rows &&
    Math.abs(square.column - centre.column) <= blast.columns
  )
}