import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'
import { apply, initialGameState, type GameState } from '../src/game/sim.ts'
import { BOARD_COLUMNS, plantIn, type Square } from '../src/game/board.ts'
import type { Level, Wave } from '../src/game/levels.ts'
import { levelOffering, oneZombieIn } from './helpers.ts'

/**
 * What a Cherry Bomb costs to plant, written out here rather than read from the
 * rules, because the point of a check is to catch the number being wrong.
 */
const BOMB_COST = 150

/**
 * How wide the Cherry Bomb's blast reaches, in Rows above and below and in Columns
 * either side of it.
 *
 * One Row and one Column, so the blast is a three-by-three patch of the lawn: its
 * own Square and the eight Squares touching it. Stated as a reach and *used*, rather
 * than written into each Square in a check as a literal - the tests below name a
 * Square by working out where it is in relation to the blast, so that when this
 * number is wrong the tests that should fail are the ones that do rather than every
 * Square in them being individually wrong in the same way.
 */
const BLAST_ROWS = 1
const BLAST_COLUMNS = 1

/**
 * The middle of the lawn, where a Cherry Bomb stands in the checks below.
 *
 * Row 2, Column 4. Both are a choice rather than a default. A bomb three Rows
 * wide and three Columns wide is only fully on a five-by-nine lawn if it is in the
 * middle *of* it: planted at the edge, its blast hangs off the board and is smaller
 * than its own rule says, and the checks below would be checking a bomb that had
 * lost a Row to the edge of the world. A bomb in the middle has three whole Rows
 * above and below it and four whole Columns either side, so every direction has
 * somewhere to go.
 *
 * The second plant is the Square above and to the left - diagonally touching, and
 * the furthest Square from the bomb that is still inside the blast. So the tests
 * can name the corner of the blast and know it is in it.
 */
const BOMB_SQUARE: Square = { row: 2, column: 4 }

/**
 * How many steps a Zombie takes to walk the whole lawn, and the Column it is walking
 * in after that many.
 *
 * `ZOMBIE_STEPS_PER_COLUMN` is the one number in this file taken from the rules rather
 * than restated, and that is deliberate and is the exception to the rule this project
 * otherwise follows without fail. It is not a number *this file is about*: the Cherry
 * Bomb's cost, its blast size and its Recharge are all restated below, and each of
 * those is broken in turn to watch it fail. This one is a measuring stick - "walk far
 * enough to be a whole Row away", "keep a level playing" - and no check here claims
 * what it is. Written down here instead, it would drift from the rules and the drift
 * would show up as a Zombie not quite as far away as a check wanted, which is a failure
 * with a cause rather than a change that looks deliberate.
 */
const ZOMBIE_STEPS_PER_COLUMN = Math.round(4.7 * STEPS_PER_SECOND)

/** How long a Zombie takes to walk off the whole board, used to keep a level playing. */
const THE_ENTIRE_LAWN = BOARD_COLUMNS * ZOMBIE_STEPS_PER_COLUMN + STEPS_PER_SECOND

/**
 * A level offering only a Cherry Bomb, with one Zombie walking the whole lawn from a
 * step the caller picks.
 *
 * The keep-alive Zombie is the reason a level can be empty without being won, and it is
 * also the reason the level is built here rather than by the caller: every level in
 * this file has to offer the bomb and nothing else - a second plant would be a second
 * thing that could have stood in the blast's way, and a check about what a Cherry Bomb
 * clears cannot also be a check about what else on the lawn survives - and every one
 * of them has to still be *playing* when the bomb goes off.
 *
 * The step is measured from the start of the level, which is the only step this file
 * knows at the time the level is built: the Sun is collected on one level and the
 * Zombies arrive on another, and the second is built from the tick the first reached.
 */
function aLevelOfferingABomb(keepAliveAt: number): Level {
  return levelOffering(['cherry-bomb'], oneZombieIn(0, keepAliveAt))
}

/**
 * How many steps a Zombie has to walk, once it has walked in, to be standing in the
 * middle of a given Column.
 *
 * **This is a count of steps walked, not a step of the level.** A Zombie walks in at the
 * right-hand edge of the board - x = 720 - and loses one Column of ground per
 * `ZOMBIE_STEPS_PER_COLUMN` steps, so the number of steps it has to take to be in the
 * middle of Column 4 is a quarter of the lawn and a bit. A fixture that scheduled a Wave
 * at *that* step rather than *that many steps after* the Wave would put the Zombie on the
 * right edge of the board, which is not in any Square at all - which is exactly what the
 * first two versions of this fixture did, in two different ways.
 *
 * The half Column is what keeps it off a boundary. A Zombie standing *on* a Column
 * boundary after a whole number of Columns is a Zombie the rules and the drawing could
 * disagree about, and the blast is three Columns wide, so a Zombie on the wrong side of
 * one is either caught or not on no more grounds than anyone intended.
 */
function stepsToReach(square: Square): number {
  const columnsToWalk = BOARD_COLUMNS - 1 - square.column

  return columnsToWalk * ZOMBIE_STEPS_PER_COLUMN + ZOMBIE_STEPS_PER_COLUMN / 2
}

/**
 * The Square a given number of Rows and Columns away from the bomb, and whether
 * that is inside the blast or one Square outside it.
 *
 * So that a check says *how far away* a Zombie is rather than writing a Square out,
 * which is the difference between a check about the edge of a blast and a check
 * about whatever Square somebody typed. One Square out in any direction is the first
 * thing a three-by-three blast does not reach.
 */
function squareAwayFrom(rows: number, columns: number): Square {
  return {
    row: BOMB_SQUARE.row + rows,
    column: BOMB_SQUARE.column + columns,
  }
}

/** The same, in Zombies: one basic Zombie walking into the given Square's Row. */
function aZombieIn(square: Square) {
  return { name: 'basic' as const, row: square.row }
}

/**
 * The Waves that send one basic Zombie into each of these Squares, walking in far
 * enough ahead of `from` that each is standing in the Square asked for.
 *
 * **The step is worked out from the Zombie's own walk, so it cannot be a step out of
 * date with where the Zombie actually is.** The Potato Mine's file works its fixture the
 * same way for the same reason, and there it took a number that had been measured rather
 * than calculated; here it is calculated, because the Column a Zombie is standing in is
 * arithmetic and there is nothing to measure it with.
 *
 * `from` is the step the Zombies start from rather than the step the level starts from,
 * and that is not tidiness either - see `withABombIn`, which waits for Sun before it
 * sends anything at all and would otherwise schedule every Wave in its own past.
 *
 * **The Wave goes in one step early, and that is the whole of the half Column.** A
 * Zombie is standing in the right edge of the board on the step it walks in and only
 * takes its first step on the one after, so a Wave at exactly `from + stepsToReach`
 * leaves it one step short of where it was asked to be - at the right-hand edge still,
 * which is not in any Square at all and is therefore not in any blast. One step early
 * and the half Column in `stepsToReach` lands it in the middle of the Column rather than
 * on the boundary at its near end.
 *
 * One Wave per Square, because two Squares in different Columns need different numbers of
 * steps to be standing in and one Wave has one step. Zombies going for the same Column
 * walk in together on the same step, which is what lets a check put two of them in one
 * Row.
 */
/**
 * The Waves that send one basic Zombie into each of these Squares, all timed so that
 * every one of them is standing in the Square it was asked for on one and the same
 * step - the step the bomb goes down on.
 *
 * **Timed backwards from that one step, which is the whole of it and the only thing
 * that works.** A Zombie's `walked` count is the number of steps it has taken since it
 * walked in, so a Zombie that appears on step W has walked `T - W` steps by step T. To
 * have it standing in the middle of a Column that takes `stepsToReach` steps to reach,
 * the Wave has to go in at `T - stepsToReach` - which is a different Wave for every
 * Column, and is the reason this returns a list rather than one Wave.
 *
 * Every version of this fixture before this one got the timing wrong, and every wrong
 * version had the same shape: **a Zombie for a nearer Column walks in earlier and is
 * still walking when the bomb goes off.** Forward from a common start - give every
 * Zombie the longest walk, or schedule each from the step it should arrive - leaves the
 * Zombies somewhere between where they should be and where they would have been, and the
 * blast is only three Columns wide, so a Zombie one Column out is outside it and every
 * claim about what the bomb clears is quietly about a different lawn.
 *
 * And `T - stepsToReach` has to be a step in the *future*, so `T` is one more than the
 * longest walk. A Zombie going to the farthest Column a check uses walks in on the step
 * the fixture is about to advance to and takes its first step on the next; without that
 * one step of room the nearest Zombie in the lawn walks in on the last step and has
 * taken none.
 */
function wavesFor(from: number, stoppingAt: number, ...squares: Square[]): Wave[] {
  return squares.map((square) => ({
    atStep: from + stoppingAt - stepsToReach(square),
    zombies: [aZombieIn(square)],
  }))
}

/**
 * A Cherry Bomb standing in `BOMB_SQUARE`, paid for out of Sun that has fallen, with
 * the given Zombies standing in the given Squares.
 *
 * **A Cherry Bomb costs 150 and a level begins with 50, so every check here waits for
 * Sun before it can plant at all.** That is a real difference from every other plant in
 * this project and it shapes the whole file: the Potato Mine is 25 and goes down on the
 * first click, and its checks can put a Zombie on the lawn at a step they write down.
 * Waiting twenty-five seconds for the fourth piece of Sun is not tidiness to be arranged
 * away - it is what the plant costs, and a check that pretended otherwise would be
 * testing a level that hands out free money.
 *
 * So the Sun is waited for *first*, on a level with nothing else on it, and only then
 * are the Zombies sent in - and they are sent in far enough ahead to walk to where they
 * were asked to stand, with the bomb planted **on the step the last of them arrives**.
 * That is what makes "one step later" the blast, and a check that planted the bomb at
 * some other moment would be checking a plant that went off when the fixture felt like
 * it rather than when the rules say.
 *
 * The order matters more than it looks, and it is not tidiness:
 *
 * - The Sun is collected on a level where **no Zombie is walking in**, because
 *   anything sent in at step 0 would have crossed the whole lawn and be halfway down
 *   it by the time enough money had fallen. The first version of this fixture sent
 *   them in on step 0: by the time the bomb went down all four were in Column 1, well
 *   outside the blast, and every claim about what it clears passed against a bomb that
 *   had found nothing.
 * - The Zombies walk in **before** the bomb is planted, because the rules read the
 *   Zombies they are given and a Wave that has not arrived is not on the lawn to be
 *   blown up. Sending them in after the plant went in is a bomb that cleared an empty
 *   lawn, which is the other version of the same mistake.
 *
 * And the Sun is asserted before the plant goes in rather than after: a bomb quietly
 * refused for want of Sun would leave every other claim in this file passing against a
 * lawn with no bomb on it, which is the failure this project has already had once -
 * the two-mines check at ticket 13, which planted both on the same step and went on to
 * check a Row that had no mine in it.
 */
function withABombIn(zombies: readonly Square[] = []): GameState {
  // A level with nothing in it at all is *won* on its first step and refuses every
  // command, so the Sun cannot be collected on one. A single Zombie walking in after
  // the whole lawn is the cheapest thing that keeps the level playing while it waits.
  let state = initialGameState(101, aLevelOfferingABomb(THE_ENTIRE_LAWN))

  for (let step = 0; step < 2 * 60 * STEPS_PER_SECOND && state.sun < BOMB_COST; step++) {
    state = apply(state, { kind: 'advance' })
    const token = state.tokens[state.tokens.length - 1]
    if (token !== undefined) {
      state = apply(state, { kind: 'collect', point: { x: token.x, y: token.y } })
    }
  }
  assert.ok(
    state.sun >= BOMB_COST,
    `only ${state.sun} Sun fell in two minutes, not the ${BOMB_COST} the bomb needs`,
  )

  if (zombies.length === 0) {
    return plantABombIn(state)
  }

  // Each Zombie is sent in early, the rules walk it to the Square it was asked for, and
  // the bomb is planted the moment the last of them is standing there. Every step here
  // is measured from *this* tick rather than from the start of the level, which is the
  // whole of the first version's failure: the fixture waited twenty-five seconds for Sun
  // and then scheduled the Zombies at absolute steps 705 and 1833, both of which were
  // already in the past, so they walked in on step 2101 and the bomb went down on an
  // empty lawn.
  //
  // The walking is the longest number of steps in the file - a quarter of the lawn to
  // Column 4 - and it is the rules' own walking rather than a Zombie's place written
  // into the state by hand, so a check here is a thing a real level could have produced
  // and not a Zombie's position the fixture wished for.
  const now = state.tick
  // One more step than the longest walk, so the last Zombie to appear gets a step to
  // take - see `wavesFor`, which is where all of this is argued out.
  const walkAcross = Math.max(...zombies.map((square) => stepsToReach(square))) + 1

  state = {
    ...state,
    pendingWaves: [...wavesFor(now, walkAcross, ...zombies), oneZombieIn(0, now + THE_ENTIRE_LAWN)],
  }
  state = afterSteps(state, walkAcross)

  for (const square of zombies) {
    assert.ok(
      state.zombies.some((zombie) => zombie.row === square.row),
      `no Zombie walked into Row ${square.row}, so the blast could not be said to have cleared one`,
    )
  }

  return plantABombIn(state)
}

/** The bomb itself: chosen and planted into `BOMB_SQUARE`, and asserted to be there. */
function plantABombIn(state: GameState): GameState {
  const planted = apply(
    apply(state, { kind: 'choose', choice: 'cherry-bomb' }),
    { kind: 'place', square: BOMB_SQUARE },
  )
  assert.equal(
    plantIn(planted.occupants, BOMB_SQUARE)?.name,
    'cherry-bomb',
    'the Cherry Bomb was planted, so every claim below is about a lawn that has one on it',
  )

  return planted
}

/** The plant standing in a Square, or undefined when it is bare lawn. */
function plantAt(state: GameState, square: Square) {
  return plantIn(state.occupants, square)
}

/**
 * Plays the game forward by a number of steps, which is the only way time passes.
 *
 * Bounded, and saying what went wrong when it runs out - the same contract as
 * `untilTick` in `helpers.ts` and as the Potato Mine's own file uses, for the same
 * reason. An unbounded loop in a check is a check that hangs rather than fails, and a
 * hanging check in a suite says nothing at all about what it was for.
 *
 * And it fails if the level stopped, which is a real failure rather than an
 * inconvenience: a Level with no Waves left at all is won on its first step, and a
 * won Level refuses even the step command - so a check that ran on past the end of
 * its level would be making claims about a lawn that had not moved.
 */
function afterSteps(state: GameState, steps: number): GameState {
  let current = state
  for (let step = 0; step < steps; step++) {
    current = apply(current, { kind: 'advance' })
  }

  assert.equal(
    current.tick,
    state.tick + steps,
    'the game advanced a different number of steps than were asked for - a level that has ended stops moving',
  )

  return current
}

/** How many of the Zombies on the lawn are walking in the given Row. */
function zombiesIn(state: GameState, row: number): number {
  return state.zombies.filter((zombie) => zombie.row === row).length
}

/** Every Zombie on the lawn, as `[row, health]` pairs, so a check can name them. */
function onTheLawn(state: GameState): [number, number][] {
  return state.zombies.map((zombie) => [zombie.row, zombie.health])
}

test('a Cherry Bomb clears the Zombies in a small area around the Square it is planted in', () => {
  // A Zombie in the bomb's own Square, one a Square above, one a Square below, and
  // one diagonally off the far corner - all four inside a three-by-three blast. Four
  // rather than one because "an area" is the whole claim: a bomb that cleared its own
  // Square and nothing else would pass a check that only ever put a Zombie there.
  //
  // Two of the four are in the bomb's Column and two are not, so `wavesFor` has to time
  // them differently to have them standing in their Squares on the same step - which is
  // what makes this check worth having on top of the next one. It is also the shape the
  // next check cannot express, because that one only uses the bomb's own Column.
  const planted = withABombIn([
    BOMB_SQUARE,
    squareAwayFrom(-BLAST_ROWS, 0),
    squareAwayFrom(BLAST_ROWS, 0),
    squareAwayFrom(-BLAST_ROWS, -BLAST_COLUMNS),
  ])

  const after = apply(planted, { kind: 'advance' })

  assert.equal(
    after.zombies.length,
    0,
    'every Zombie standing in the blast is gone from the lawn, right where it stood',
  )
})

test('a Cherry Bomb clears Zombies in the Rows above and below as well as its own', () => {
  // The shape of the blast, said one Row at a time, because "a small area" is a
  // claim about *which* Squares and the Rows are half of it.
  //
  // Nine Zombies - the whole three-by-three patch, corner to corner - all standing in
  // their Squares on the one step the bomb goes down, so nothing here is about a bomb
  // that reaches further the longer it waits. Every Square in the blast is named by how
  // far it is from the bomb, so a blast that grew by a Row would leave three of these
  // Zombies standing and the assertions below would say so.
  const inside = [-BLAST_ROWS, 0, BLAST_ROWS].flatMap((rows) =>
    [-BLAST_COLUMNS, 0, BLAST_COLUMNS].map((columns) => squareAwayFrom(rows, columns)),
  )
  assert.equal(inside.length, 9, 'three by three Squares, all of them named rather than written out')
  const planted = withABombIn(inside)

  const after = apply(planted, { kind: 'advance' })

  assert.equal(
    zombiesIn(after, BOMB_SQUARE.row - BLAST_ROWS),
    0,
    'the Row above the bomb is clear, its edge Squares included',
  )
  assert.equal(zombiesIn(after, BOMB_SQUARE.row), 0, 'and the bomb’s own Row is clear')
  assert.equal(
    zombiesIn(after, BOMB_SQUARE.row + BLAST_ROWS),
    0,
    'and the Row below the bomb is clear, its edge Squares included',
  )
})

test('Zombies two Rows away, or two Columns away, are outside the blast and survive it', () => {
  // The other side of "a small area", and the half a check cannot hold by counting
  // Zombies. Four Zombies walk in - one two Rows above, one two Rows below, one two
  // Columns to the right, one two Columns to the left - and all four are exactly one
  // Square outside a three-by-three blast.
  //
  // Said as "which Zombies are left" rather than "how many", and that is the whole
  // point. "Four Zombies are left" is satisfied by a bomb that cleared the whole
  // lawn and by one that cleared nothing at all, and a check that cannot tell those
  // apart holds nothing about the rule. The four are named by how far off the bomb
  // they were, so the answer says which of the four survived rather than only how many.
  //
  // One Square *out* rather than one in, because one in is the last Square inside -
  // so this is the first Square the blast does not reach, in each of four directions,
  // and a blast that grew by one would clear every one of them.
  const planted = withABombIn([
    squareAwayFrom(-(BLAST_ROWS + 1), 0),
    squareAwayFrom(BLAST_ROWS + 1, 0),
    squareAwayFrom(0, BLAST_COLUMNS + 1),
    squareAwayFrom(0, -(BLAST_COLUMNS + 1)),
  ])

  const after = apply(planted, { kind: 'advance' })

  assert.deepEqual(
    onTheLawn(after).sort((a, b) => a[0] - b[0]),
    [
      [0, 200],
      [2, 200],
      [2, 200],
      [4, 200],
    ],
    'exactly the four one Square outside the blast are left, two in the bomb’s own Row and one in each of the Rows beyond',
  )
})

test('a Cherry Bomb leaves the lawn as it goes off, and never fires again', () => {
  // The one-shot half of the plant. A bomb that kept standing in its Square after
  // clearing the Zombies around it would be a Square nothing else can ever be
  // planted in, and a plant that fires a second time would be a second Cherry Bomb
  // for free.
  const planted = withABombIn([squareAwayFrom(0, BLAST_COLUMNS + 1)])

  const after = apply(planted, { kind: 'advance' })

  assert.equal(plantAt(after, BOMB_SQUARE), undefined, 'the bomb is gone from its Square, spent')
  assert.equal(
    after.occupants.filter((occupant) => occupant.kind === 'plant').length,
    0,
    'and nothing is standing on the lawn in its place, least of all a second bomb',
  )
})

test('a Cherry Bomb at the edge of the lawn clears the Zombies it can reach and no more', () => {
  // The corner of the board, where a three-by-three blast hangs off it.
  //
  // Every other check here plants the bomb in the middle *on purpose* - `BOMB_SQUARE`
  // says why - and that choice means nothing in this file would notice a blast that
  // hung off the edge of the world and cleared a whole three-by-three regardless. That
  // is not a hypothetical shape: a Cherry Bomb is the plant a player puts in a Row they
  // are losing, and a Row is as likely to be Row 1 or Row 5 as the middle one, so the
  // edge is where a player will actually use it.
  //
  // Three Zombies, all in the bomb's own Column and in three different Rows: the bomb's
  // own Row 0, the Row below it, and Row 2 - which is `BLAST_ROWS` further out and so the
  // first Row the blast cannot reach. That is the whole of "at the edge" that matters:
  // a bomb in Row 0 has no Row above it, so its blast is a patch two Rows tall rather than
  // three, and a bomb that hung off the top of the board instead would look like a
  // three-Row blast and clear Zombies it has no business clearing.
  //
  // **All in one Column, and that is forced by the fixture rather than chosen.** The
  // edge Column is the last one, so a Zombie going there has only half a Column's walk in
  // it - and `wavesFor` times every Zombie from the *same* step, so one going to a nearer
  // Column would arrive early and walk on past by the time the bomb went off. Two rounds
  // of this check had all four Zombies in the bomb's own Square for exactly that reason,
  // which reads as "the blast cleared everything" and is really "they never moved".
  const edge = { row: 0, column: BOARD_COLUMNS - 1 }
  const below = { row: 1, column: edge.column }
  const outOfReach = { row: BLAST_ROWS + 1, column: edge.column }

  let state = initialGameState(101, aLevelOfferingABomb(THE_ENTIRE_LAWN))
  for (let step = 0; step < 2 * 60 * STEPS_PER_SECOND && state.sun < BOMB_COST; step++) {
    state = apply(state, { kind: 'advance' })
    const token = state.tokens[state.tokens.length - 1]
    if (token !== undefined) {
      state = apply(state, { kind: 'collect', point: { x: token.x, y: token.y } })
    }
  }
  assert.ok(state.sun >= BOMB_COST, `only ${state.sun} Sun fell, not the ${BOMB_COST} the bomb needs`)

  const now = state.tick
  const walkToTheEdge = stepsToReach(edge) + 1
  state = {
    ...state,
    pendingWaves: [
      ...wavesFor(now, walkToTheEdge, edge, below, outOfReach),
      oneZombieIn(0, now + THE_ENTIRE_LAWN),
    ],
  }
  state = afterSteps(state, walkToTheEdge)

  state = apply(apply(state, { kind: 'choose', choice: 'cherry-bomb' }), {
    kind: 'place',
    square: edge,
  })
  assert.ok(plantAt(state, edge), 'the bomb is planted in the corner Square')

  const after = apply(state, { kind: 'advance' })

  assert.deepEqual(
    onTheLawn(after).sort((a, b) => a[0] - b[0]),
    [[BLAST_ROWS + 1, 200]],
    'only the Zombie in the Row beyond the blast is left: the bomb’s own Row and the Row below it were both inside it',
  )
})

test('a Cherry Bomb takes Zombies off the lawn and leaves the plants standing in them', () => {
  // The blast removes Zombies and not plants, which is not a special case but the only
  // rule there is. Nothing in this game takes a plant off the lawn except a bite and
  // the Shovel: a Lawn Mower clears a whole Row of Zombies and every plant in that Row
  // is still standing afterwards, and a Potato Mine takes the one Zombie that reached it
  // and the lawn is otherwise untouched. So a bomb blown up beside a plant leaves that
  // plant exactly as it was.
  //
  // A check because it is the reading a future instance would most easily get wrong.
  // "Clears an area" is a phrase that could as easily mean "leaves nothing standing
  // there", and that version would take a player's whole Row of Peashooters with it -
  // so it needs something behind it, and until this check existed nothing did: breaking
  // the rule so that the blast also removed every plant passed all five of the other
  // checks in this file, because not one of them had a second plant on the lawn.
  const wallNut = squareAwayFrom(0, -BLAST_COLUMNS)
  const level = levelOffering(
    ['cherry-bomb', 'wall-nut'],
    oneZombieIn(0, THE_ENTIRE_LAWN),
  )

  // Wait for enough Sun for the bomb and for the nut beside it, collecting as we go -
  // the same contract as `withABombIn`, and for the same reason: a plant that was
  // quietly refused for want of Sun would leave this check passing against a lawn with
  // nothing in it.
  let state = initialGameState(101, level)
  for (let step = 0; step < 2 * 60 * STEPS_PER_SECOND && state.sun < BOMB_COST + 50; step++) {
    state = apply(state, { kind: 'advance' })
    const token = state.tokens[state.tokens.length - 1]
    if (token !== undefined) {
      state = apply(state, { kind: 'collect', point: { x: token.x, y: token.y } })
    }
  }
  assert.ok(state.sun >= BOMB_COST + 50, `only ${state.sun} Sun fell, not enough for a bomb and a nut`)

  state = apply(apply(state, { kind: 'choose', choice: 'wall-nut' }), {
    kind: 'place',
    square: wallNut,
  })
  assert.ok(plantAt(state, wallNut), 'the Wall-nut is standing next to where the bomb will go')

  // A Zombie in the nut's own Square, so it is standing in the blast *and* has a plant
  // under it - the case where "the blast removes Zombies" and "the blast removes
  // things" come apart most sharply. It is timed and walked by the same
  // `wavesFor` as every other check here, so it is standing *in* the Square rather
  // than still at the edge of the board when the bomb goes down.
  const now = state.tick
  const row = wallNut.row
  const walkToTheNut = stepsToReach(wallNut) + 1
  state = {
    ...state,
    pendingWaves: [
      ...wavesFor(now, walkToTheNut, wallNut),
      oneZombieIn(0, now + THE_ENTIRE_LAWN),
    ],
  }
  state = afterSteps(state, walkToTheNut)
  assert.ok(
    state.zombies.some((zombie) => zombie.row === row),
    'a Zombie is standing in the nut’s Square',
  )

  state = apply(apply(state, { kind: 'choose', choice: 'cherry-bomb' }), {
    kind: 'place',
    square: BOMB_SQUARE,
  })
  const after = apply(state, { kind: 'advance' })

  assert.equal(
    after.zombies.filter((zombie) => zombie.row === row).length,
    0,
    'and the Zombie standing on the nut is gone from the lawn',
  )
  assert.equal(
    plantAt(after, wallNut)?.name,
    'wall-nut',
    'while the Wall-nut it was standing on is still there, undamaged',
  )
})

test('a Cherry Bomb spends its Sun whether or not anything was in range', () => {
  // The half of the plant a designer would argue about, and the one that decides
  // whether it is a bomb or a trap. A Cherry Bomb is paid for when it is *planted*,
  // the same as every other plant, so 150 Sun has gone whether or not there was
  // anything to clear. That is what stops it being a free thing to hold in reserve
  // and fire later: there is no later, and the Sun is spent on the click.
  //
  // The level here sends in nothing at all, and - the reason the check can say
  // "nothing at all" rather than "nothing nearby" - the fixture keeps a Zombie in a
  // far Row walking the whole lawn, so the level is still playing after the bomb has
  // gone off. A level with no Waves left is *won* on its first step and refuses every
  // command, so a check that blew up on a finished lawn would be reading a clock that
  // had stopped.
  const planted = withABombIn()

  assert.equal(planted.zombies.length, 0, 'nothing at all on the lawn to clear')

  // The Sun is spent by the *planting*, not by the blast, so the check that it is
  // spent is a check about the state the fixture hands back - the bomb is already in
  // the ground by then. Asserting against a later state would be asking what is left
  // after the Sun has gone, which is nothing, and would pass for any Sun at all.
  assert.ok(
    planted.sun <= 50,
    `the bomb is already planted, so the 150 Sun is already gone (${planted.sun} left)`,
  )

  const after = apply(planted, { kind: 'advance' })

  assert.equal(
    after.sun,
    planted.sun,
    'and a step later there is nothing more to spend: the bomb went off on the Sun it was planted with',
  )
  assert.equal(plantAt(after, BOMB_SQUARE), undefined, 'while the bomb itself is spent')
})