import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'
import { SHOVEL, apply, initialGameState, type GameState } from '../src/game/sim.ts'
import { centreX, plantIn, SQUARE_WIDTH, type Square } from '../src/game/board.ts'
import { LEVEL_TEST } from '../src/game/levels.ts'
import { zombieX, type Zombie } from '../src/game/zombies.ts'
import { createPlanted, type PlantName } from '../src/game/plants.ts'
import { resolveCombat, type Shot } from '../src/game/shots.ts'
import { levelOffering, oneZombieIn, untilTick, withSunToPlant } from './helpers.ts'

/**
 * The four shooters, and what each one costs to plant.
 *
 * Written out rather than read from the rules, because the point of a check is to
 * catch the number being wrong: reading `balance.ts` would pass whatever that file
 * happened to say - which is how two of the Sunflower's three numbers went
 * unchecked until ticket 11.
 *
 * Only the four shooters, and not the whole roster. What the test bed offers is
 * `tests/planting.test.ts`'s claim to make and is written there, once; a list of every
 * plant held in two files is a list whose every number has to be changed in two files.
 * What is left here is the part that is about shooting: that these four, and not the
 * other plants, are the ones a player chooses between when the question is which plant
 * goes in this Row.
 */
/** The four shooters, named as a type so a check about a shot cannot be handed a nut. */
type ShooterName = 'peashooter' | 'snow-pea' | 'repeater' | 'puff-shroom'

const SHOOTER_COSTS: Record<ShooterName, number> = {
  peashooter: 100,
  'snow-pea': 175,
  repeater: 200,
  'puff-shroom': 0,
}

/**
 * The test bed is the only place a player can reach the three shooter variants, so
 * what it offers is a claim of its own and not a consequence of the plants existing.
 *
 * It is not enough for a Snow Pea to be in the game: a Seed Bank that had quietly
 * lost one would still let every other check in this file pass, because they each
 * build the Level they need for themselves. This is the check that says a person can
 * reach all four, and the cost each packet shows is the number a player reads
 * before deciding what to plant.
 */
test('the test bed offers all four shooters, and each packet shows what it costs', () => {
  const bed = initialGameState(1, LEVEL_TEST)

  for (const [name, cost] of Object.entries(SHOOTER_COSTS)) {
    assert.ok(
      bed.seedBank.some((packet) => packet.name === name),
      `the test bed offers a ${name}`,
    )
    assert.equal(
      bed.seedBank.find((packet) => packet.name === name)?.cost,
      cost,
      `a ${name} packet for ${cost} Sun`,
    )
  }
})

/** What one pea does to a Zombie's health, and what a Basic Zombie walks in with. */
const PEA_DAMAGE = 20
const BASIC_HEALTH = 200

/**
 * Where the checks below stand their shooters, and which Row they watch.
 *
 * The first Column that takes a plant, and the middle Row. The Column decides how
 * long the check spends waiting: a Zombie has to walk from the right of the lawn to
 * the plant, and then a pea has to cross the rest of it, so a plant in the last
 * Column is reached in a moment and a plant in the first is reached at the end of
 * the level. The middle is the same trade every other shooting check in this project
 * has made.
 */
const SHOOTER_SQUARE: Square = { row: 2, column: 1 }
const ROW = SHOOTER_SQUARE.row

/**
 * When the Zombie walks in.
 *
 * Late, and for a reason that has nothing to do with any plant's behaviour. Nothing
 * here can be planted until the Sun for it has been collected - a level opens with
 * 50 - and the most expensive pair of plants in this file is a Snow Pea and a
 * Peashooter at 275 between them, which is nine pieces off the sky, one every ten
 * seconds, so about ninety seconds of play. A Zombie that arrived sooner would be
 * standing in the Square a plant is about to go into, and every check here would
 * quietly become about a plant planted behind a Zombie rather than about shooting.
 *
 * So this is the slowest planting in the file plus a margin, and it is a step count
 * rather than a deadline: nothing in the rules waits for anything, and a check that
 * had to guess when a wave would come would be a check about the wave.
 */
const WAVE_AT = 100 * STEPS_PER_SECOND

/**
 * How long a check may play on waiting for a shot to land.
 *
 * The Wave, plus a minute of play. A minute is far longer than a pea needs to cross
 * the whole lawn - a pea crosses a Column in a third of a second and the lawn is
 * nine Columns wide - so this is not a tight bound that a change to the shot's speed
 * could quietly break, and it is long enough that a check is never what decides when
 * it gives up. Every check in this file that waits for a pea to land uses it, so the
 * waiting is the same everywhere.
 */
const PATIENCE = WAVE_AT + 60 * STEPS_PER_SECOND

/** A Level offering the named plants and sending one Zombie down the Row above. */
function oneZombieComing(...plants: PlantName[]) {
  return levelOffering(plants, oneZombieIn(ROW, WAVE_AT))
}

/**
 * The named plant standing in the middle of the lawn, with the Sun to pay for it
 * gathered first, and nothing else on the board.
 */
function withShooterIn(name: ShooterName, square: Square = SHOOTER_SQUARE): GameState {
  const started = withSunToPlant(initialGameState(101, oneZombieComing(name)), SHOOTER_COSTS[name])
  const planted = apply(apply(started, { kind: 'choose', choice: name }), { kind: 'place', square })

  assert.ok(planted.occupants.length > started.occupants.length, `the ${name} was planted`)

  return planted
}

/**
 * One shooter in one Row and one Zombie walking into that Row, once for each entry.
 *
 * Every plant in the same Column and every Zombie arriving on the same step, which
 * is what makes two of these comparable at all: the Zombies have walked the same
 * number of steps, the peas cross the same number of Columns, and the only thing
 * that differs between two Rows is what is standing in them. A check that compares
 * two plants without that is comparing two accidents.
 */
function oneShooterPerRow(...rowsAndPlants: readonly [number, ShooterName][]): GameState {
  const started = withSunToPlant(
    initialGameState(
      101,
      levelOffering(
        [...new Set(rowsAndPlants.map(([, plant]) => plant))],
        {
          atStep: WAVE_AT,
          zombies: rowsAndPlants.map(([row]) => ({ name: 'basic' as const, row })),
        },
      ),
    ),
    rowsAndPlants.reduce((total, [, plant]) => total + SHOOTER_COSTS[plant], 0),
  )

  return rowsAndPlants.reduce(
    (state, [row, plant]) =>
      apply(apply(state, { kind: 'choose', choice: plant }), {
        kind: 'place',
        square: { row, column: SHOOTER_SQUARE.column },
      }),
    started,
  )
}

/** The Zombie walking along a Row, and a complaint if there is not exactly one. */
function zombieIn(state: GameState, row: number) {
  const inRow = state.zombies.filter((zombie) => zombie.row === row)
  assert.equal(inRow.length, 1, `expected one Zombie in Row ${row}, found ${inRow.length}`)
  const zombie = inRow[0]
  assert.ok(zombie, `the Zombie in Row ${row}`)
  return zombie
}

/** The one Zombie on the lawn, and a complaint if there is not exactly one. */
function theZombie(state: GameState) {
  assert.equal(state.zombies.length, 1, `expected one Zombie, found ${state.zombies.length}`)
  const zombie = state.zombies[0]
  assert.ok(zombie, 'the Zombie')
  return zombie
}

/** Plays the rules on until the game looks like this, or gives up naming what it waited for. */
function until(state: GameState, satisfied: (state: GameState) => boolean, what: string): GameState {
  let current = state
  for (let step = 0; step < PATIENCE; step++) {
    if (satisfied(current)) {
      return current
    }
    current = apply(current, { kind: 'advance' })
  }
  return assert.fail(`the game never got there: ${what}`) as never
}

/**
 * A Repeater fires two peas in one shot, and both of them land.
 *
 * Two claims in one check, because they are the same claim: a Repeater that fired
 * two peas and could only hit with one of them would be a Peashooter that fires
 * twice for nothing. So this watches the peas *leaving* - two of them, on one step,
 * because a Repeater that fired them a second apart would be firing twice as often
 * rather than firing twice as much - and then watches what the Zombie actually
 * loses.
 *
 * The damage is the part that matters, and it is measured rather than assumed: the
 * check steps along watching the Zombie's health and takes the first drop it sees. A
 * first drop of forty is both peas landing on the same Zombie. A first drop of
 * twenty would be one pea landing and the other missing, and this check would fail
 * on it - which is the whole difference between a Repeater and a wasted packet.
 */
test('a Repeater fires two peas in one shot, and both of them hit the same Zombie', () => {
  const planted = withShooterIn('repeater')
  const arrived = untilTick(planted, WAVE_AT, 'the Zombie walked in')

  // The shot, on the first step the Repeater has anything to shoot at.
  const fired = apply(arrived, { kind: 'advance' })
  assert.equal(fired.shots.length, 2, 'two peas leave the Repeater on the step it fires')

  // What the Zombie loses, watched from the shot onwards: the first fall in its
  // health, and every step's worth of it on the way there. A level with a Wave
  // already spent and a Zombie on the lawn is still being played, so there is
  // something to watch.
  let state = fired
  let before = theZombie(fired).health
  let firstDrop = 0

  for (let step = 0; step < PATIENCE; step++) {
    state = apply(state, { kind: 'advance' })
    const now = theZombie(state).health

    if (now < before) {
      firstDrop = before - now
      break
    }
    before = now
  }

  assert.equal(before, BASIC_HEALTH, 'the Zombie walked in with its full 200 health')
  assert.equal(firstDrop, 2 * PEA_DAMAGE, 'and lost forty to the first pair of peas, not twenty')
})

/**
 * A Puff-shroom is free, which is the whole of it - and free in the only sense
 * that matters to a player: it goes down with no Sun at all in hand.
 *
 * Not "cheap" and not "cheap for a shooter". A level opens with 50 and a Sunflower
 * takes exactly 50, so this spends everything first and plants the Puff-shroom on a
 * lawn with nothing left in it. That is the situation the plant exists for: a
 * player who is broke and has nothing they can afford still has one packet to play,
 * and if the answer were "it costs a little" this check would not be able to tell
 * the difference.
 */
test('a Puff-shroom is planted for nothing, even with no Sun at all', () => {
  const broke = initialGameState(101, levelOffering(['sunflower', 'puff-shroom']))

  const spent = apply(apply(broke, { kind: 'choose', choice: 'sunflower' }), {
    kind: 'place',
    square: { row: 0, column: 1 },
  })
  assert.equal(spent.sun, 0, 'a level opens with 50 Sun and a Sunflower takes all of it')

  const free = apply(apply(spent, { kind: 'choose', choice: 'puff-shroom' }), {
    kind: 'place',
    square: { row: 1, column: 1 },
  })

  assert.ok(
    free.occupants.some((occupant) => occupant.kind === 'plant' && occupant.name === 'puff-shroom'),
    'a Puff-shroom still goes down on a lawn with no Sun in it',
  )
  assert.equal(free.sun, 0, 'and it costs the player nothing to have done it')
})

/**
 * A Puff-shroom's puff is spent three Columns from the plant, and a Peashooter's pea
 * crosses the whole lawn.
 *
 * Measured by watching where each shot actually stops, which is the only way to pin
 * the number rather than bound it. A first version of this check asked how far the
 * *Zombie* was when the shot reached it, and answered "between two and three Columns"
 * — which caught a Puff-shroom given the whole lawn and one given a single Column, and
 * would have passed just as happily on two and a quarter or three and a tenth. It had
 * the shot and the Zombie closing on each other, so the distance a Zombie was standing
 * at when a shot landed was a mixture of the reach and how fast the Zombie was walking.
 *
 * A puff is spent because it ran out, with no Zombie involved at all, so where it stops
 * *is* the reach. This watches the puff travel and records the last place it is still
 * on the lawn, and works the limit back out of that: the puff is gone one step before
 * three Columns and no earlier, which puts the reach at three Columns to within the
 * distance a puff covers in a single step — about a twentieth of a Column, rather than
 * the half a Column the old check could not get inside of.
 *
 * The Peashooter is the same measurement on the same Row, and is what says the
 * difference is three Columns rather than a puff that stops early for some other reason.
 */
test('a Puff-shroom shoots three Columns, where a Peashooter crosses the whole lawn', () => {
  const THREE_COLUMNS = 3
  const row = SHOOTER_SQUARE.row

  /** Where a shot fired by the named plant stops, in Columns out from the plant. */
  const stopsAfter = (plant: ShooterName) => {
    const level = levelOffering([plant], oneZombieIn(row, WAVE_AT))
    const started = withSunToPlant(initialGameState(101, level), SHOOTER_COSTS[plant])
    const square = { row, column: SHOOTER_SQUARE.column }
    const planted = apply(apply(started, { kind: 'choose', choice: plant }), { kind: 'place', square })

    // A shot is only fired when there is something to shoot at, so the Row's Zombie
    // has to be on the lawn first. The shot is then taken on the next step the plant
    // fires rather than the step after the wait, because a shooter spends most of its
    // time not firing.
    const arrived = until(planted, (state) => state.zombies.length > 0, `the ${plant} had a Zombie to shoot at`)
    let watching = arrived
    let fired = apply(watching, { kind: 'advance' })
    for (let step = 0; step < PATIENCE && fired.shots.every((pea) => pea.row !== row); step++) {
      watching = fired
      fired = apply(watching, { kind: 'advance' })
    }

    const shot = fired.shots.filter((pea) => pea.row === row)
    assert.equal(shot.length, 1, `the ${plant} put out one shot to follow`)

    // Every place along the Row that the shot was still visible at, which is the shot's
    // whole flight. Watched rather than worked out, so the step it moves in a step is
    // the shot's own and not a number this check has to keep in step with the rules.
    const visited: number[] = []
    let playing = fired
    for (let step = 0; step < PATIENCE && playing.shots.some((pea) => shot.some((one) => one.id === pea.id)); step++) {
      const alive = playing.shots.find((pea) => shot.some((one) => one.id === pea.id))
      if (alive !== undefined) {
        visited.push(alive.x)
      }
      playing = apply(playing, { kind: 'advance' })
    }

    assert.ok(visited.length > 2, `the ${plant} shot was watched along its way (${visited.length} places)`)
    const first = visited[0]
    const second = visited[1]
    const last = visited[visited.length - 1]
    assert.ok(first !== undefined && second !== undefined && last !== undefined, 'and had a start, a step and an end')

    return { last, step: second - first, from: centreX(square) }
  }

  const puff = stopsAfter('puff-shroom')
  const three = THREE_COLUMNS * SQUARE_WIDTH
  // How far out from the plant the puff was last seen, which is a distance; the
  // `last` it is measured from is a place on the lawn and the two are not the same
  // number, which is an easy mistake to make and a quiet one.
  const puffOut = puff.last - puff.from

  // Gone *by* three Columns, and not a step before it. Both edges: the first is the
  // limit, and the second says the limit is three rather than three-and-a-fraction,
  // which is the same kind of gap a "no further than" on its own would leave.
  assert.ok(
    puffOut < three,
    `the puff was gone by three Columns (it was last seen at ${(puffOut / SQUARE_WIDTH).toFixed(2)} Columns out)`,
  )
  assert.ok(
    puffOut >= three - puff.step,
    `and not a whole step before it, so the limit is three Columns rather than three less something (it was last seen at ${(puffOut / SQUARE_WIDTH).toFixed(2)} Columns out, and a step is ${(puff.step / SQUARE_WIDTH).toFixed(3)} of a Column)`,
  )

  const pea = stopsAfter('peashooter')
  assert.ok(
    pea.last > puff.last + 3 * SQUARE_WIDTH,
    `while a Peashooter's pea in the very same place was still on the lawn three Columns further on (${((pea.last - pea.from) / SQUARE_WIDTH).toFixed(1)} Columns out against the puff's ${((puff.last - puff.from) / SQUARE_WIDTH).toFixed(1)})`,
  )
})

/**
 * A slowed Zombie walks at half the speed of a Zombie that is not slowed.
 *
 * Two Rows, a Snow Pea in one and a Peashooter in the other, in the same Column,
 * with a Zombie walking into each of them on the same step. Both peas do the same
 * twenty damage, so the two Zombies are being hurt at the same rate and are
 * identical in every respect except what the slow does to how fast they cover the
 * ground - which is the claim.
 *
 * Half, and not merely "less". "A slowed Zombie walks more slowly" would pass on a
 * Zombie that had stopped dead, and on one that had slowed by a fiftieth, and a
 * plant whose whole value is the seconds it buys everything behind it has to be
 * worth a number of seconds rather than some. So the number is stated here, in the
 * check, and the distance each Zombie covers over twenty seconds is compared
 * against the other.
 */
test('a slowed Zombie walks at half the speed of one that is not slowed', () => {
  const planted = oneShooterPerRow([SHOOTER_SQUARE.row, 'snow-pea'], [SHOOTER_SQUARE.row + 1, 'peashooter'])
  const arrived = untilTick(planted, WAVE_AT, 'both Zombies walked in')

  // Watched until the Snow Pea's pea has actually landed, because a Zombie that
  // is not yet slowed would measure as walking at full speed and the check would
  // pass by comparing two unslowed Zombies.
  const hit = until(
    arrived,
    (state) => zombieIn(state, SHOOTER_SQUARE.row).health < BASIC_HEALTH,
    "the Snow Pea's pea landed on the Zombie in its Row",
  )

  // Both Zombies hit on the same step, by the same twenty damage, because the two
  // plants are in the same Column and their peas cross at the same speed. So the
  // two are identical in every respect except the slow, which is what makes the
  // distances below comparable at all - and it is worth saying so rather than
  // assuming, because a comparison of two Zombies hurt at different rates would
  // measure the hurt.
  for (const row of [SHOOTER_SQUARE.row, SHOOTER_SQUARE.row + 1]) {
    assert.equal(
      zombieIn(hit, row).health,
      BASIC_HEALTH - PEA_DAMAGE,
      `the Zombie in Row ${row} has taken one pea and no more`,
    )
  }

  const before = {
    slowed: zombieX(zombieIn(hit, SHOOTER_SQUARE.row)),
    whole: zombieX(zombieIn(hit, SHOOTER_SQUARE.row + 1)),
  }
  // Ten seconds of walking, which is the longest window that is safe: a Zombie
  // walks into the first Column of the lawn in about thirty-eight seconds, so ten
  // keeps it well clear of the plant, and both peas are doing twenty damage every
  // one and four tenths of a second, so ten peas fell a Zombie in about fourteen
  // and this has to finish before that or the level ends underneath the check.
  // Asserted rather than assumed, for the same reason.
  const later = untilTick(hit, hit.tick + 10 * STEPS_PER_SECOND, 'ten seconds of walking')
  assert.equal(
    later.outcome,
    'playing',
    'and the level was still being played throughout, so both Zombies were still walking',
  )
  const covered = {
    slowed: before.slowed - zombieX(zombieIn(later, SHOOTER_SQUARE.row)),
    whole: before.whole - zombieX(zombieIn(later, SHOOTER_SQUARE.row + 1)),
  }

  assert.ok(covered.whole > 0, `the unslowed Zombie was still walking (${covered.whole.toFixed(1)} units)`)
  assert.ok(
    Math.abs(covered.slowed / covered.whole - 0.5) < 0.01,
    `the slowed Zombie covered ${covered.slowed.toFixed(1)} units against the other's ${covered.whole.toFixed(1)} - half of it, not less`,
  )
})

/**
 * A slowed Zombie goes back to walking at full speed when the slow is over, and
 * stays slowed until it is.
 *
 * The hard half of this is making the slow *end*, because a Snow Pea re-slows its
 * Zombie every one and four tenths of a second for as long as it can see one: a
 * Zombie under a Snow Pea is slowed for ever, so a check that waits for the slow to
 * lapse would wait for ever too. So the Snow Pea is dug up with the Shovel, which is
 * a thing a player does, and which leaves the Zombie with up to ten seconds of slow
 * still to run out.
 *
 * That is the shape of the claim being checked, and it is worth being exact about
 * it. Removing the plant does not take the slowness off the Zombie: the slow was
 * something that happened to the Zombie's legs, not something the plant was holding
 * on to. So the Zombie is *still* walking at half speed for a few seconds after the
 * Snow Pea is gone, and then is not - and a check that only looked at the end of it
 * would pass just as happily on a slow that ended the instant its plant was dug up.
 * Both halves are therefore measured: still slow straight after, full speed later.
 *
 * The Peashooter's Row is the control throughout, and it is a control that never
 * needed slowing: it is what an unslowed Zombie covers in the same number of steps.
 */
test('a slowed Zombie is still slowed after its Snow Pea is dug up, and then walks at full speed', () => {
  const row = SHOOTER_SQUARE.row
  const control = row + 1
  const planted = oneShooterPerRow([row, 'snow-pea'], [control, 'peashooter'])
  const arrived = untilTick(planted, WAVE_AT, 'both Zombies walked in')
  const slowed = until(
    arrived,
    (state) => zombieIn(state, row).health < BASIC_HEALTH,
    "the Snow Pea's pea landed",
  )

  // The Snow Pea dug up with the Shovel, leaving the Zombie with the rest of its
  // slow to run out. The control's Peashooter is dug up too: left shooting, it fells
  // its 200-health Zombie in fourteen seconds, before the slow has run out and the
  // two can be compared. Its Zombie was never slowed, which is all a control needs.
  const snowPeaDug = apply(apply(slowed, { kind: 'choose', choice: SHOVEL }), {
    kind: 'shovel',
    square: { row, column: SHOOTER_SQUARE.column },
  })
  const dug = apply(apply(snowPeaDug, { kind: 'choose', choice: SHOVEL }), {
    kind: 'shovel',
    square: { row: control, column: SHOOTER_SQUARE.column },
  })
  assert.ok(
    !dug.occupants.some(
      (occupant) => occupant.kind === 'plant' && occupant.square.row === row,
    ),
    'the Snow Pea is gone',
  )
  assert.ok(
    !dug.occupants.some(
      (occupant) => occupant.kind === 'plant' && occupant.square.row === control,
    ),
    "and so is the control's Peashooter, so the control's Zombie is still there to compare with",
  )

  // How fast each Zombie walks over the next few seconds: the two plants are gone
  // or standing still in the way, and neither Zombie has reached a plant yet, so the
  // only thing either of them is doing is walking.
  const walkedOver = (from: GameState, seconds: number) => {
    const start = { slowed: zombieX(zombieIn(from, row)), whole: zombieX(zombieIn(from, control)) }
    const to = untilTick(from, from.tick + seconds * STEPS_PER_SECOND, `${seconds} seconds of walking`)
    return {
      slowed: start.slowed - zombieX(zombieIn(to, row)),
      whole: start.whole - zombieX(zombieIn(to, control)),
    }
  }

  const straightAfter = walkedOver(dug, 3)
  assert.ok(
    straightAfter.slowed < straightAfter.whole * 0.75,
    `the Zombie is still walking slowly three seconds after the Snow Pea was dug up (${straightAfter.slowed.toFixed(1)} against the control's ${straightAfter.whole.toFixed(1)})`,
  )

  // A second at a time until the Zombie is walking at the control's speed. The slow
  // is refreshed every one and four tenths of a second, so what is left of it when
  // the plant goes is anywhere between eight and a half seconds and ten; a second
  // at a time finds the change without this check having to say which second it
  // lands on, which is a fact about the numbers rather than about the rules.
  let cursor = dug
  for (let second = 0; second < 13; second++) {
    const covered = walkedOver(cursor, 1)
    if (Math.abs(covered.slowed / covered.whole - 1) < 0.05) {
      break
    }
    cursor = untilTick(cursor, cursor.tick + STEPS_PER_SECOND, `${second + 1} seconds on`)
  }

  // Two seconds at the end rather than one, because "this second it happened to
  // match" is a thinner thing to believe than "over two seconds it walked like a
  // Zombie that was never slowed".
  const full = walkedOver(cursor, 2)
  assert.ok(
    Math.abs(full.slowed / full.whole - 1) < 0.05,
    `and by then it walks at the same speed as a Zombie that was never slowed (${full.slowed.toFixed(1)} against ${full.whole.toFixed(1)})`,
  )
})

/** How long a Snow Pea leaves a Zombie walking slowly, which this file states. */
const SLOW_SECONDS = 10

/**
 * How far apart the three Zombies in a Row walk in, in seconds.
 *
 * Two seconds, which is about four tenths of a Column - far enough that the pea
 * passing the first has gone on to the second before the second is hit, and close
 * enough that a pea is still in the air when the next Zombie walks in. Both halves
 * of that matter, and the second especially: a Zombie that arrives after the peas
 * have crossed the lawn cannot be hit by any of them, whatever the plant shoots.
 *
 * It was three until a Basic Zombie went down to 200 health. A Repeater fells one
 * in five shots, about seven seconds, and at three seconds apart the first was down
 * before the third had walked in, so there was never a line of three to shoot through.
 */
const STAGGER = 2

/**
 * One plant in one Row, and three Zombies walking into that Row `STAGGER` seconds apart.
 *
 * The single-plant version of the fixture below, for the check that gives each
 * shooter a level of its own. They cannot share one: the four of them together would
 * be 475 Sun, which is seventeen pieces off the sky and longer than any check in this
 * project is willing to wait for.
 */
function oneShooterThreeZombiesIn(row: number, plant: ShooterName, column: number): GameState {
  const started = withSunToPlant(
    initialGameState(
      101,
      levelOffering(
        [plant],
        ...[0, 1, 2].map((n) => ({
          atStep: WAVE_AT + n * STAGGER * STEPS_PER_SECOND,
          zombies: [{ name: 'basic' as const, row }],
        })),
      ),
    ),
    SHOOTER_COSTS[plant],
  )

  return apply(apply(started, { kind: 'choose', choice: plant }), {
    kind: 'place',
    square: { row, column },
  })
}

/**
 * Where a shooter stands for the checks below, in each of the two situations they
 * ask about.
 *
 * Both choices are about giving every shooter the *same* situation, because the whole
 * of a comparison between four plants is that only the plants differ.
 *
 * `NEAR` is the seventh Column, where every Zombie walking into the Row is within a
 * Puff-shroom's three Columns. A shot spends about two and three quarter seconds
 * crossing the lawn, so by the time the first three Zombies have walked in, a plant
 * in the first Column is a very long way from any of them - far enough that a
 * Puff-shroom's three Columns have nothing at all to reach, and a check that put it
 * in that table would report zero whatever its reach was set to, and so say nothing.
 *
 * `FAR` is the first Column that takes a plant, which puts the Zombies well out of a
 * Puff-shroom's reach and the other three within a plain pea's. The two tables
 * between them hold every shooter on both axes: near, they say which of them passes
 * through what it reaches and which slows it; far, they say which of them can reach a
 * Zombie across the lawn at all.
 */
const NEAR_SHOOTER: Square = { row: 3, column: 6 }
const FAR_SHOOTER: Square = { row: 3, column: 1 }

/**
 * What one single shot from a shooter did: how many Zombies it reached, and what it
 * left each of them.
 *
 * The one shot is a real constraint rather than tidiness. A Snow Pea that merely
 * aimed at the nearest Zombie like anything else still ends up hitting all three of a
 * Row over a few seconds - the ones it hits are slowed and fall behind, so the next
 * becomes the nearest and is aimed at in turn - and any check that watched a level
 * rather than a shot would report that as a pea passing through everything. It is a
 * different mechanism, and it stops working the moment a Row's Zombies are spread
 * out instead of queueing up: a pea that has to re-aim between Zombies cannot hit
 * Zombies that walk in together.
 */
function oneShotDid(plant: ShooterName, square: Square): { reached: number; slowed: number[] } {
  const row = square.row
  const planted = oneShooterThreeZombiesIn(row, plant, square.column)

  // Waited for: all three Zombies walking into the Row, so that the shot being
  // counted has a line of them to reach through. A plant fires the moment there is
  // one Zombie in its Row, and that is before the second and third have walked in -
  // so this wait is not about having a target, it is about having a line, and the
  // line is the thing being tested.
  const allIn = until(
    planted,
    (state) => state.zombies.filter((zombie) => zombie.row === row).length === 3,
    `three Zombies walked into the ${plant} Row together`,
  )

  // On to the step the plant actually shoots, which is not the next step: a shooter
  // fires every one and four tenths of a second, so it spends most steps not firing,
  // and the step a third Zombie walks in is usually one of those.
  let watching = allIn
  let fired = apply(watching, { kind: 'advance' })
  for (let step = 0; step < PATIENCE && fired.shots.every((pea) => pea.row !== row); step++) {
    watching = fired
    fired = apply(watching, { kind: 'advance' })
  }

  // The shot: every pea that plant put out on that step, and only that step's. A
  // Repeater puts out two and both belong to the one shot being counted.
  const shot = fired.shots.filter((pea) => pea.row === row)
  assert.ok(shot.length > 0, `the ${plant} fired a shot`)

  const lastSeen = new Map(
    fired.zombies
      .filter((zombie) => zombie.row === row)
      .map((zombie) => [zombie.id, zombie.health]),
  )
  const hit = new Map<number, number>()
  let playing = fired

  for (
    let step = 0;
    step < PATIENCE && playing.shots.some((pea) => shot.some((one) => one.id === pea.id));
    step++
  ) {
    playing = apply(playing, { kind: 'advance' })
    for (const zombie of playing.zombies) {
      if (zombie.row !== row) {
        continue
      }
      const before = lastSeen.get(zombie.id)
      if (before !== undefined && zombie.health < before) {
        hit.set(zombie.id, zombie.stepsSlowed)
      }
      lastSeen.set(zombie.id, zombie.health)
    }
  }

  assert.ok(
    !playing.shots.some((pea) => shot.some((one) => one.id === pea.id)),
    `the ${plant} shot did leave the lawn rather than being watched for ever`,
  )

  return { reached: hit.size, slowed: [...hit.values()] }
}

/**
 * One shot from each shooter reaches the number of Zombies that shooter should, and
 * no more.
 *
 * This is the check that says the three variants are each the Peashooter with *one*
 * change, and it is the one place that claim is held rather than merely written down.
 * Every shooter gets its own level with the same three Zombies walking into the same
 * Row, and is asked what one shot of its own reached.
 *
 * Two thirds of the table is a Peashooter reaching one Zombie's worth of Row, and the
 * two entries that are not are the whole point:
 *
 * **The Repeater is one, not two.** Its two peas are both aimed at the same nearest
 * Zombie, so a shot lands twice as much damage on one Zombie rather than reaching
 * two. A check counting projectiles would call that a plant that shoots at two
 * things, which it is not; what makes it stronger is the damage, which is a
 * different claim about a different thing. It is in this table so that a Repeater
 * quietly given a Snow Pea's reach would be caught here - it would reach all three,
 * and this says one.
 *
 * **The Puff-shroom is one, and not because it is short of Zombies.** Its three
 * Columns are covered by the reach check of its own; what this holds is that a shot
 * that reaches a Zombie stops there, exactly as a Peashooter's does. Given a Snow
 * Pea's reach it would reach three, and this says one.
 */
test('one shot from each shooter reaches as many Zombies as that shooter should, and no more', () => {
  const reaches: readonly [ShooterName, number][] = [
    ['peashooter', 1],
    ['repeater', 1],
    ['snow-pea', 3],
    ['puff-shroom', 1],
  ]

  for (const [plant, expected] of reaches) {
    const { reached } = oneShotDid(plant, NEAR_SHOOTER)
    assert.equal(reached, expected, `one ${plant} shot reached ${reached} of the three Zombies`)
  }
})

/**
 * A shot only reaches as far as the lawn does, except a Puff-shroom's - which is the
 * other half of the table above, asked from the far end of the lawn.
 *
 * The same four shooters and the same three Zombies, with every shooter standing in
 * the first Column instead of the seventh, so the Zombies are about five Columns
 * away rather than about one. That single change is the whole of what separates the
 * two tables, and it says two things at once.
 *
 * **The plain three still reach.** A Peashooter, a Repeater and a Snow Pea all hit a
 * Zombie across most of the lawn, because a pea that is only spent on something close
 * by is not a Peashooter. This is the axis nothing else in this file holds: a Repeater
 * given a Puff-shroom's three Columns would reach a Zombie this far away perfectly
 * well, and would pass every check above, because close up it behaves exactly like a
 * Peashooter.
 *
 * **The Puff-shroom reaches nothing.** Zero, and it is in the table rather than
 * omitted: this is the reach check of its own seen from far enough away for the
 * difference to be a number. A check that only ever asked a Puff-shroom about a Zombie
 * in front of it would pass just as happily on a Puff-shroom that shot the length of
 * the lawn, having never asked it about anything else.
 */
test('a shot reaches a Zombie across the lawn, except a Puff-shroom\'s', () => {
  const reaches: readonly [ShooterName, number][] = [
    ['peashooter', 1],
    ['repeater', 1],
    ['snow-pea', 3],
    ['puff-shroom', 0],
  ]

  for (const [plant, expected] of reaches) {
    const { reached } = oneShotDid(plant, FAR_SHOOTER)
    assert.equal(
      reached,
      expected,
      `a ${plant} shot from the far end of the lawn reached ${reached} of the three Zombies`,
    )
  }
})

/**
 * One shot from each shooter leaves the Zombies it reaches slowed only if it is a
 * Snow Pea's.
 *
 * The other half of the claim above, and separate from it because it is a different
 * question about the same shot: *which* Zombies a shot reaches is one thing, and what
 * it leaves on them is another. A pea that reached everything and slowed nothing would
 * satisfy the check above and fail this one.
 *
 * Every shooter but one is here to be zero, and that is what makes the table worth
 * having. A Snow Pea's slow is a deliberate part of the roster, and the sort of thing
 * that gets copied into the next plant by accident - and there is no reason at all
 * for a Repeater's two peas or a Puff-shroom's puff to slow anything, so "not
 * slowed" is a thing each of them has to earn.
 */
test('one shot from each shooter leaves the Zombies it reaches slowed only if it is a Snow Pea', () => {
  const slows: readonly [ShooterName, number[]][] = [
    ['peashooter', [0]],
    ['repeater', [0]],
    ['snow-pea', [SLOW_SECONDS * STEPS_PER_SECOND, SLOW_SECONDS * STEPS_PER_SECOND, SLOW_SECONDS * STEPS_PER_SECOND]],
    ['puff-shroom', [0]],
  ]

  for (const [plant, expected] of slows) {
    const { slowed } = oneShotDid(plant, NEAR_SHOOTER)
    assert.deepEqual(
      slowed,
      expected,
      `a ${plant} shot left the Zombies it reached slowed by ${JSON.stringify(slowed)}`,
    )
  }
})

/**
 * All four shooters are food for three bites and Recharge for the same seven and a
 * half seconds, because none of that is what makes one of them a different plant.
 *
 * The claim in `balance.ts` is that the original's four shooters are all 300 health
 * and all Recharge in the same time, so that what separates these three from a
 * Peashooter is *only* what they do with a shot. That is a claim about the roster, and
 * it was the one part of the roster with nothing holding it up: a Snow Pea quietly
 * given a Wall-nut's health, or a Repeater given a two-second Recharge, would have
 * passed every other check in this file, because nothing else looks at either number.
 *
 * Both numbers are read out of the rules rather than asserted beside a literal, which
 * is what makes this a check and not a copy of the roster:
 *
 * **Health is counted in bites.** A Zombie takes 100 off a plant a second, so a
 * plant's health is how many seconds it is food for, and counting the bites until a
 * Square is bare is counting them from the other end. Three bites is a Peashooter's
 * and a Sunflower's and a Wall-nut's is forty, so the number is the difference between
 * a plant that is barely in the way and one that decides a Row.
 *
 * **Recharge is counted in steps from a packet that has just been used.** A packet
 * that is still Recharging cannot be chosen, so the step it can be chosen again on is
 * observable without reading a countdown, and seven and a half seconds is 450 of them.
 */
test('all four shooters are food for three bites and Recharge for seven and a half seconds', () => {
  const THREE_BITES = 3
  // Seven and a half seconds at sixty steps to the second. Half a second is a whole
  // number of steps, so the Recharge ends on a step rather than between two of them -
  // and it is 450, which is not a round number and is the kind of thing worth
  // writing down rather than dividing in one's head. (The Wall-nut's is 1800, being
  // thirty seconds, and having the two confused is how this line was wrong first.)
  const SEVEN_AND_A_HALF_SECONDS = 450
  const row = SHOOTER_SQUARE.row
  // The last Column, so the Row's Zombie is standing on the plant almost at once
  // rather than after a walk across the lawn: this check is about how long a plant
  // lasts and how long its packet takes, and not about how far away anything is.
  const square: Square = { row, column: 9 }

  for (const plant of ['peashooter', 'snow-pea', 'repeater', 'puff-shroom'] as const) {
    const level = levelOffering([plant], oneZombieIn(row, WAVE_AT))
    const started = withSunToPlant(initialGameState(101, level), SHOOTER_COSTS[plant])
    let planted = apply(apply(started, { kind: 'choose', choice: plant }), { kind: 'place', square })

    // The plant is down and its packet is on Recharge, and the Recharge is held by
    // what a player can do with it rather than by a number in the state: a packet
    // that has not come up yet cannot be chosen.
    assert.notEqual(
      apply(planted, { kind: 'choose', choice: plant }).chosen,
      plant,
      `the ${plant} packet is not ready the moment it is used`,
    )

    // Watched out for by playing rather than by reading, so that the step the packet
    // comes up on is the step the rules say it does.
    let waited = 0
    while (
      waited < SEVEN_AND_A_HALF_SECONDS &&
      apply(planted, { kind: 'choose', choice: plant }).chosen !== plant
    ) {
      planted = apply(planted, { kind: 'advance' })
      waited += 1
    }
    assert.equal(
      waited,
      SEVEN_AND_A_HALF_SECONDS,
      `and the ${plant} packet is ready again on the step its seven and a half seconds are up`,
    )
    assert.equal(
      apply(planted, { kind: 'choose', choice: plant }).chosen,
      plant,
      `so a ${plant} packet can be chosen again then`,
    )

    // And the bites: a fresh plant in the same place, and a Zombie walking into it.
    //
    // Counted by watching the health fall rather than by reading a number, because a
    // plant's health is how many bites it is food for and counting them from the
    // other end is the same measurement. The last bite needs saying: it takes the
    // last of the health and the plant is off the lawn in the same step, so it never
    // appears at zero. Counting only the falls that are visible would give two bites
    // for a plant that is food for three, which is the sort of off-by-one that a
    // check written to agree with the code would have kept.
    const fresh = apply(
      apply(withSunToPlant(initialGameState(101, level), SHOOTER_COSTS[plant]), {
        kind: 'choose',
        choice: plant,
      }),
      { kind: 'place', square },
    )

    let bites = 0
    let lastHealth = 0
    let walking = fresh

    for (let step = 0; step < PATIENCE; step++) {
      walking = apply(walking, { kind: 'advance' })
      const plantHere = plantIn(walking.occupants, square)

      if (plantHere === undefined) {
        // The bite that finished it, and only counted because a Zombie was seen
        // eating it first - so a plant removed some other way is not mistaken for
        // one that was eaten.
        if (bites > 0) {
          bites += 1
        }
        break
      }
      if (plantHere.health < lastHealth) {
        bites += 1
      }
      lastHealth = plantHere.health
    }

    assert.equal(
      plantIn(walking.occupants, square),
      undefined,
      `the ${plant} was eaten right through, so the bites above were all of them`,
    )

    assert.equal(bites, THREE_BITES, `a ${plant} was food for exactly three bites`)
  }
})

/**
 * A pea whose Zombie is killed by something else leaves the lawn rather than
 * crossing it for the rest of the level.
 *
 * The pea is aimed at one particular Zombie, so it keeps going when that Zombie stops
 * being there — which happens whenever two things are shooting at the same Zombie and
 * one of them gets there first. So this puts a Peashooter and a Repeater in one Row,
 * both aimed at the same Zombie, and watches for the step that Zombie dies on. There
 * are peas in the air behind the one that killed it, and those are the orphans: peas
 * with nothing left to hit, travelling the width of the lawn to no purpose.
 *
 * **Two shooters rather than one**, because one shooter cannot produce the case at
 * all: its peas all leave on the same step and all land on the same step, so there is
 * never one in the air behind the one that fells the Zombie. It takes two things
 * shooting at one Zombie to leave a pea with nowhere to go.
 *
 * The rule was fixed at ticket 10 and had no check behind it, which is the same shape
 * of gap as the health and Recharge the review found in this ticket: a fix with
 * nothing holding it up, which is a fix that can be undone.
 */
test('a pea whose Zombie is killed by something else leaves the lawn', () => {
  const row = SHOOTER_SQUARE.row
  // A second Wave a long way off, and it is load-bearing rather than scenery: a level
  // with nothing left to send is *won* the moment its last Zombie dies, and a won
  // level stops moving. The orphan pea would then be frozen on the lawn for ever and
  // there would be nothing to watch - which is the rule doing its job, and not the
  // thing being checked here.
  const level = levelOffering(
    ['peashooter', 'repeater'],
    oneZombieIn(row, WAVE_AT),
    oneZombieIn(row, WAVE_AT + 60 * STEPS_PER_SECOND),
  )
  const started = withSunToPlant(initialGameState(101, level), SHOOTER_COSTS.peashooter + SHOOTER_COSTS.repeater)
  const peashooter = apply(apply(started, { kind: 'choose', choice: 'peashooter' }), {
    kind: 'place',
    square: { row, column: 2 },
  })
  const planted = apply(apply(peashooter, { kind: 'choose', choice: 'repeater' }), {
    kind: 'place',
    square: { row, column: 1 },
  })

  // Watched for the step the Zombie goes, and what was in the air on it.
  const arr = until(planted, (state) => state.zombies.length === 1, 'the Zombie walked in')
  let playing = arr
  let orphans = 0

  for (let step = 0; step < PATIENCE; step++) {
    const before = playing
    playing = apply(playing, { kind: 'advance' })
    if (before.zombies.length === 1 && playing.zombies.length === 0) {
      orphans = playing.shots.length
      break
    }
  }

  assert.equal(playing.zombies.length, 0, 'the Zombie was killed between the two shooters')
  assert.ok(orphans > 0, `and left ${orphans} pea(s) in the air with nothing left to hit`)

  // A pea crosses the whole lawn in about two and three quarter seconds, so anything
  // still in the air after five of them is a pea that is not going anywhere.
  const cleared = untilTick(playing, playing.tick + 5 * STEPS_PER_SECOND, 'five seconds later')
  assert.equal(cleared.shots.length, 0, 'and five seconds later the lawn is clear of them')
  assert.equal(cleared.zombies.length, 0, 'with nothing left on it to shoot at either')
})

test('resolveCombat advances flying shots, applies damage, and purges casualties in one step', () => {
  const zombie: Zombie = {
    id: 1,
    name: 'basic',
    row: 1,
    walked: 100,
    health: 20,
    armour: 0,
    stepsUntilBite: 0,
    stepsSlowed: 0,
    hasPole: false,
  }
  const x = zombieX(zombie)
  const shot: Shot = {
    id: 1,
    row: 1,
    x: x - 1,
    targetId: zombie.id,
    damage: 20,
    slowSteps: 0,
    passesThrough: false,
    reachX: 1000,
  }

  const result = resolveCombat({
    shots: [shot],
    zombies: [zombie],
    occupants: [],
    nextShotId: 2,
  })

  assert.equal(result.zombies.length, 0, 'exhausted zombie is purged from the lawn')
  assert.equal(result.shots.length, 0, 'spent non-piercing pea leaves the lawn')
})

test('resolveCombat triggers plant firing only at surviving targets ahead and increments nextShotId', () => {
  const plant = {
    ...createPlanted('peashooter', { row: 1, column: 1 }),
    stepsUntilShot: 0,
  }
  const zombie: Zombie = {
    id: 2,
    name: 'basic',
    row: 1,
    walked: 100,
    health: 200,
    armour: 0,
    stepsUntilBite: 0,
    stepsSlowed: 0,
    hasPole: false,
  }

  const result = resolveCombat({
    shots: [],
    zombies: [zombie],
    occupants: [plant],
    nextShotId: 10,
  })

  assert.equal(result.shots.length, 1, 'fires one shot at the zombie')
  assert.equal(result.shots[0]?.id, 10)
  assert.equal(result.shots[0]?.targetId, 2)
  assert.equal(result.nextShotId, 11)
  assert.equal(result.zombies.length, 1)
})

test('resolveCombat does not fire at a zombie killed by a projectile in the same step', () => {
  const plant = {
    ...createPlanted('peashooter', { row: 1, column: 1 }),
    stepsUntilShot: 0,
  }
  const zombie: Zombie = {
    id: 3,
    name: 'basic',
    row: 1,
    walked: 100,
    health: 20,
    armour: 0,
    stepsUntilBite: 0,
    stepsSlowed: 0,
    hasPole: false,
  }
  const x = zombieX(zombie)
  const incomingShot: Shot = {
    id: 1,
    row: 1,
    x: x - 1,
    targetId: zombie.id,
    damage: 20,
    slowSteps: 0,
    passesThrough: false,
    reachX: 1000,
  }

  const result = resolveCombat({
    shots: [incomingShot],
    zombies: [zombie],
    occupants: [plant],
    nextShotId: 5,
  })

  assert.equal(result.zombies.length, 0, 'zombie dies from incoming shot')
  assert.equal(result.shots.length, 0, 'incoming shot spent, and plant does NOT fire at dead corpse')
  assert.equal(result.nextShotId, 5, 'nextShotId remains unchanged because no new shot was fired')
})

