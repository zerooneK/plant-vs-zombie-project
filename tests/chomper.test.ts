import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'
import { apply, initialGameState, type GameState } from '../src/game/sim.ts'
import { BOARD_COLUMNS, plantIn, type Square } from '../src/game/board.ts'
import type { Level, Wave } from '../src/game/levels.ts'
import { levelOffering, oneZombieIn } from './helpers.ts'

/**
 * What a Chomper costs to plant, written out here rather than read from the rules,
 * because the point of a check is to catch the number being wrong.
 *
 * Believed to be the original's 150 - the same as a Cherry Bomb, and the two are the
 * same price for the same reason: each is 150 Sun that has already been spent by the
 * time the picture of it appears. A Cherry Bomb spends all of it at once and is gone;
 * a Chomper spends all of it and then spends the next forty-two seconds being unable
 * to do the one thing it was bought for.
 */
const CHOMPER_COST = 150

/**
 * Where the checks below stand their Chomper, and how long a Zombie takes to get
 * there.
 *
 * The seventh Column, the same Column the Potato Mine's checks stand their mine in
 * and for a related reason: a Zombie crosses one Column in about four and a half
 * seconds, so the Column a plant is planted in decides how much warning a check
 * has. These checks want two very different amounts of warning - one wants a Zombie
 * arriving almost at once, and another wants one arriving after a Chomper has
 * chewed, spat and chewed again - and the seventh is far enough up the lawn for a
 * check to send a Zombie walking in on step 1 that is still standing in the Chomper's
 * Square on step 284, and still further from the middle of the lawn than anything
 * else on the board.
 *
 * Measured rather than worked out, for the reason the Potato Mine's file gives: a
 * check that guesses when a Zombie will arrive is a check that fails for the wrong
 * reason, and one that waits for a thing it can watch is a check that says what it
 * means.
 */
const CHOMPER_SQUARE: Square = { row: 0, column: 7 }

/**
 * Steps from planting until a Zombie walking in on the planting step is standing in this
 * Chomper's Square.
 *
 * **Measured, and it is two more than the walk looks like it should be.** A Zombie is
 * in Column 7 - the Chomper's Column - once it has walked 282 steps, which is the
 * arithmetic of a Zombie's own speed and the width of a Column and nothing else. Two
 * steps come out of that before the Zombie is standing in the Square rather than merely
 * a step from it: one for `sendDueWaves`, which puts a Zombie on the lawn from the step
 * *after* the one its Wave names, so a Zombie sent in on the planting step has walked
 * nothing at all on that step; and one because a Zombie still walking on the step it
 * reaches a Square does not stop in it until the step after.
 *
 * **Nothing is ever observed standing in a Chomper's Square, and that is the whole of
 * the step before the one above.** The Zombie is seen in Column 8 on step 283 and gone
 * on step 284, and the checks below are written around that rather than in spite of it:
 * there is no state in which the check can look at a Zombie that has arrived at a
 * Chomper and has not been eaten, because arriving and being eaten happen inside the
 * same step. `THE_FIRST_BITE` is that visible step.
 *
 * Getting this wrong is not a rounding error. A fixture a step the other way puts the
 * Zombie in Column 8 - `squareAtX` puts a Zombie standing exactly on a Column's boundary
 * in the Column to its right, and x = 640 is the boundary - so it never arrives at all
 * and walks on to the Row's Lawn Mower, taking the Chomper with it if it is slow enough.
 * That is how every Zombie in the game is asked where it is, and the Potato Mine's
 * checks depend on the same boundary.
 */
const STEPS_TO_THE_CHOMPER = 284

/**
 * Steps from planting until the Chomper eats - one step before a Zombie is standing in
 * its Square, and the only step at which the Zombie can be seen at all.
 *
 * **The two numbers differ by one and every check in this file needs to know which of
 * them it is asking about.** A Zombie that reaches a Square is standing in it on the
 * next step, because a Zombie still walking on the step it arrives walks straight on -
 * so `THE_FIRST_BITE` is the arrival and `STEPS_TO_THE_CHOMPER` is the first step at
 * which anything on the lawn can see it there. A check that stops one step late finds
 * the Zombie already eaten and is reading a lawn with nothing on it, which fails as a
 * *premise* rather than as an assertion: the numbers it then reads are real, and none of
 * them are about a Chomper.
 *
 * Named rather than written as `STEPS_TO_THE_CHOMPER - 1` at each use, because the
 * difference between the two is the whole of what a check in this file is looking at, and
 * a `- 1` at a call site reads as arithmetic rather than as the question being asked.
 */
const THE_FIRST_BITE = STEPS_TO_THE_CHOMPER - 1

/**
 * Steps from planting until the Chomper eats, from a Zombie that walked in on the planting
 * step - and the one number in this file that is worked out rather than measured.
 *
 * It cannot be timed relative to planting for a Zombie that walks in later, and this is
 * why. `withAChomperIn` schedules every Wave at `plantedOn + arrival - 285 + 1`, which is
 * only right for a Zombie that walks in on the planting step; a Zombie scheduled for a
 * later arrival is walked in earlier, and has therefore walked *less* than `arrival` by
 * the time the level reaches it. The two errors are the same size - one is exactly the
 * sendDueWaves step, and one is the whole of the difference - and they are added
 * together, so a fixture that is a step out on the first is two steps out on the third.
 *
 * So the later Zombies are not timed relative to planting at all. They are walked in from
 * the right-hand edge and told which Column to stop in, which is the arithmetic
 * `stepsToReach` gives and the reason the Cherry Bomb's file has it: a Zombie from the
 * edge needs `stepsToReach` steps to be standing in a Column, and that does not depend
 * on anything else on the lawn.
 *
 * **Two Zombies for this check, and both walked in from the edge** - one aimed at the
 * Column before the Chomper's and one at the Chomper's own Column. They are 282 steps
 * apart, which is one Column of walk, so the nearer one arrives a Column before the
 * other - far enough that the second one to arrive is not standing in the Square when the
 * first one is eaten, and the Chomper is never asked the same question twice.
 */
const STEPS_PER_COLUMN = Math.round(4.7 * STEPS_PER_SECOND)

/** Steps from the right-hand edge of the lawn to the middle of a given Column. */
function stepsToReach(column: number): number {
  const columnsToWalk = BOARD_COLUMNS - 1 - column

  return columnsToWalk * STEPS_PER_COLUMN + STEPS_PER_COLUMN / 2
}

/**
 * A level offering a Chomper and nothing else.
 *
 * A Chomper is all the check gets to put on the lawn, which is not tidiness: a second
 * plant is a second thing that could have done whatever the Zombie did, and a check
 * about what a Chomper does cannot also be a check about what else on the lawn does.
 */
function aLevelWith(...waves: Wave[]): Level {
  return levelOffering(['chomper'], ...waves)
}

/** A Zombie walking into the Chomper's Row on the given step, and no other Zombie at all. */
const A_WAVE_ON = (atStep: number) => oneZombieIn(CHOMPER_SQUARE.row, atStep)

/**
 * The Zombie that keeps the level playing, in the Row *below* the Chomper's.
 *
 * **In another Row, and that is the whole of it.** A keep-alive in the Chomper's own Row
 * walks the whole length of the lawn, and the Chomper's Square is somewhere along that walk
 * - so it stops in it, eats the Chomper, and a check about what a Chomper does is a check
 * about a Chomper that is being eaten. Check four found it that way: with the keep-alive in
 * Row 0 the Chomper was at 100 health when the chew ran out, having been bitten twice by a
 * Zombie no check in this file had any interest in. Row 1 is walked the whole time and
 * nothing in it is ever touched.
 */
const A_WAVE_KEEP_ALIVE = (atStep: number) => oneZombieIn(CHOMPER_SQUARE.row + 1, atStep)

/**
 * How long a Zombie spends walking the whole lawn, used to keep a level playing.
 *
 * Long enough that nothing this file does can reach the far end of it, so the
 * keep-alive Zombie is still walking in every check here - which is the point of it.
 */
const THE_ENTIRE_LAWN = 9 * Math.round(4.7 * STEPS_PER_SECOND) + STEPS_PER_SECOND

/**
 * A Chomper standing in `CHOMPER_SQUARE`, paid for out of Sun that has fallen, with a
 * Zombie sent in so that it is standing in the Chomper's Square the given number of
 * steps after the plant went in.
 *
 * **The Sun is waited for first, and that is forced by the plant's cost.** A Chomper is
 * 150 and a level begins with 50, so every check here starts by collecting until there
 * is enough - exactly as `withSunToPlant` in `helpers.ts` is for the Peashooter's 100.
 * A check that tried to plant on the 50 a level starts with would be refused for being
 * broke rather than for the reason it is about, and would pass whether or not the rule
 * worked. That is not hypothetical: the first version of this fixture did it, and the
 * failure it produced - `the Chomper was planted`, with `undefined` - reads like a bug
 * in the rules and is really a check that never got as far as them.
 *
 * **And the Sun is waited for on a level with nothing on it**, because a Zombie sent in
 * before the money is there has crossed most of the lawn by the time it is. The Waves
 * below are all scheduled from the tick the Chomper went in on, which is the only tick
 * this fixture knows once the Sun has been collected; a Wave timed from the start of
 * the level instead would be scheduled in its own past.
 *
 * `arriving` is *how long after the plant* each Zombie should be standing in the
 * Chomper's Square, rather than a step of the level, because that is the question a
 * check is asking - "what has this Chomper done by the time a Zombie has walked this
 * far" - and it is what `STEPS_TO_THE_CHOMPER` is for. One Wave per Zombie, because
 * two Zombies walking in together need two Waves and a check that wanted them together
 * says so by passing the same number twice.
 */
/**
 * A level, with the Sun already collected and the Chomper already planted in its Square.
 *
 * Both halves are asserted, and both matter: a plant quietly refused for want of Sun
 * leaves every claim in this file passing against a lawn with nothing on it. That is not
 * hypothetical - the first version of this fixture planted on the 50 a level starts with,
 * and the failure it produced reads like a bug in the rules and is really a check that
 * never got as far as them.
 *
 * The keep-alive Zombie is here for the reason `aLevelWith` gives: a Level with no Waves
 * left at all is won on its first step, and a won Level refuses every command there is.
 */
function aChomperInTheGround(): GameState {
  let state = initialGameState(101, aLevelWith(A_WAVE_KEEP_ALIVE(THE_ENTIRE_LAWN)))

  for (let step = 0; step < 2 * 60 * STEPS_PER_SECOND && state.sun < CHOMPER_COST; step++) {
    state = apply(state, { kind: 'advance' })
    const token = state.tokens[state.tokens.length - 1]
    if (token !== undefined) {
      state = apply(state, { kind: 'collect', point: { x: token.x, y: token.y } })
    }
  }
  assert.ok(
    state.sun >= CHOMPER_COST,
    `only ${state.sun} Sun fell in two minutes, not the ${CHOMPER_COST} the Chomper needs`,
  )

  state = apply(apply(state, { kind: 'choose', choice: 'chomper' }), {
    kind: 'place',
    square: CHOMPER_SQUARE,
  })
  assert.equal(
    plantAt(state)?.name,
    'chomper',
    'the Chomper was planted, so every claim below is about a lawn that has one on it',
  )

  return state
}

/**
 * Plays a Chomper-in-the-ground on for `waiting` steps with `waves` added to the level.
 *
 * **A wave's `atStep` is the level's own step and nothing is added to it.** A caller that
 * means "this Zombie walks in five seconds after the plant" has to work that out itself,
 * because only the caller knows the planting tick - and a helper that added the planting
 * tick to an `atStep` the caller had already measured from it would put the Wave thousands
 * of steps too late. That is not hypothetical: a version of this helper did exactly that,
 * and the check using it passed against a lawn where the second Zombie was still standing
 * in Column 3 when the Chomper finished chewing.
 *
 * There was a second helper that took the Waves and built the lawn itself, and it is gone
 * because the one check that needs Waves of its own - the one whose second Zombie walks in
 * long after the plant went in - is also the one that needs the tick to schedule them, so
 * it cannot use a helper that hides it.
 *
 * `state` is the lawn the Waves are timed against, so a caller that needs the planting tick
 * to schedule its own Waves passes the very state it read that tick from, rather than
 * building a second lawn - two Sun-waits produce two ticks, and a Wave timed against one
 * and played on the other is a Zombie that arrives seconds early.
 */
function onALawnWith(state: GameState, waiting: number, waves: readonly Wave[]): GameState {
  return afterSteps(
    {
      ...state,
      pendingWaves: [...waves, A_WAVE_KEEP_ALIVE(state.tick + THE_ENTIRE_LAWN)],
    },
    waiting,
  )
}

/**
 * As `withWavesIn`, naming each Zombie by the step it should be standing in the Chomper's
 * Square, counted from the step the plant went in.
 *
 * This is the way the first three checks time their Zombies, and it is the right way for
 * *them* because they all send their Zombies walking in on the planting step - which is
 * the only Zombie whose arrival can be named as "so many steps after the plant" without
 * measuring its walk as well. It is the wrong way for a Zombie that walks in later, and
 * check four uses `withWavesIn` for that reason.
 */
function withAChomperIn(waiting: number, ...arriving: number[]): GameState {
  const state = aChomperInTheGround()

  return onALawnWith(
    state,
    waiting,
    arriving.map((after) => A_WAVE_ON(state.tick + after - STEPS_TO_THE_CHOMPER + 1)),
  )
}

/** The plant standing in the Chomper's Square, or undefined when it is bare lawn. */
function plantAt(state: GameState) {
  return plantIn(state.occupants, CHOMPER_SQUARE)
}

/**
 * Plays the game forward by a number of steps, which is the only way time passes.
 *
 * Bounded, and saying what went wrong when it runs out - the same contract as
 * `untilTick` in `helpers.ts` and as the Potato Mine's and Cherry Bomb's own files
 * use, for the same reason. An unbounded loop in a check is a check that hangs
 * rather than fails, and a hanging check in a suite says nothing at all about what
 * it was for.
 */
function afterSteps(state: GameState, steps: number): GameState {
  let current = state
  for (let step = 0; step < steps; step++) {
    current = apply(current, { kind: 'advance' })
  }

  assert.ok(
    current.tick === state.tick + steps,
    `the game advanced ${current.tick - state.tick} steps rather than the ${steps} asked for - a level that has ended stops moving`,
  )

  return current
}

test('a Chomper destroys the Zombie it reaches, in a single bite', () => {
  // The first half of the plant, and the whole of what "a Chomper eats a Zombie" means:
  // the Zombie it reaches is gone from the lawn, not wounded. A Zombie is 200 health and
  // a Peashooter takes ten peas to fell one; this is one bite, so there is no damage
  // number on a Chomper and nothing on it that a Conehead's armour could ever turn out to
  // be too small for. That is the same answer a Potato Mine and a Cherry Bomb give, for
  // the same reason.
  //
  // **One step before the arrival, and not on it, and the reason is worth holding on
  // to.** A Zombie is never seen standing in a Chomper's Square in the state that comes
  // back from a step, because the step it arrives in is the step it is eaten on: it walks
  // into the Square, `walkAndEat` finds the Chomper there and bites it, and
  // `devourWithChompers` asks the same question a moment later and finds the same Zombie
  // still standing there - both happen inside one step, and the state that step returns
  // has the Zombie gone from it.
  //
  // So what this check can hold is the step *before*: the Zombie one Column short of the
  // Chomper, at full health, with nothing having touched it. That is the claim that the
  // Chomper does not eat early, and it is the only one of the two that is visible - a
  // check written to look at the arrival step itself finds the Zombie already gone and
  // concludes nothing about whether it arrived or was eaten on the way.
  const planted = withAChomperIn(THE_FIRST_BITE, STEPS_TO_THE_CHOMPER)

  assert.equal(planted.zombies.length, 1, 'the Zombie is on the lawn and walking')
  assert.equal(
    planted.zombies[0]?.health,
    200,
    'at full health and a Column short of the Chomper, so nothing has eaten it yet',
  )
  assert.equal(
    plantAt(planted)?.stepsUntilChewed,
    0,
    'and the Chomper has not eaten anything, so it is not chewing',
  )

  const after = afterSteps(planted, 1)

  assert.equal(
    after.zombies.filter((zombie) => zombie.row === CHOMPER_SQUARE.row).length,
    0,
    'the Zombie the Chomper reached is gone from the lawn rather than wounded',
  )
  assert.ok(plantAt(after), 'and the Chomper is still standing, having eaten rather than gone off')
})

test('a Chomper cannot eat for forty-two seconds after it has eaten', () => {
  // The whole of the plant, and the reason the check above is worth having at all: a
  // Chomper that could eat whenever a Zombie reached it would be a plant that removes
  // one Zombie per arrival for ever, which is strictly better than a Peashooter at the
  // same price and would be the first thing anyone planted. The chew is what stops that,
  // and it is the only number about this plant that is a designer's to choose.
  //
  // **Forty-two seconds, and it is very nearly the time a Zombie spends crossing the
  // whole lawn.** That is the plant: it eats one Zombie and then stands there unable to
  // touch anything for as long as a Zombie takes to walk from one side of the board to
  // the other. A Row held by one Chomper and nothing else is a Row that can answer
  // exactly one Zombie, and the second walks straight past a plant that cannot reach it.
  // What that buys is a plant that is unbeatable in the right place and useless in the
  // wrong one.
  //
  // Two Zombies, the first timed to be eaten and the second to arrive part way through
  // the chew. The second is the claim: a Chomper that ate the first one is chewing, and
  // a chewing Chomper does not eat. Forty-two seconds is about nine Columns of Zombie's
  // walk, so the second has to walk most of the lawn to get there - which is the point,
  // and the reason it cannot be sent in a moment sooner.
  //
  // **Five seconds in, well inside the forty-two and far enough from either end that the
  // check is not about a boundary it could drift onto.** The first Zombie is eaten on the
  // step it arrives and the chew is set to the whole forty-two there, so the second is
  // asked about at the Chomper's `CHEW - 1 - 5 seconds` - which is what the assertion
  // below says, and is the whole of "the chew is counting down".
  const CHEW_SECONDS = 42
  const CHEW = CHEW_SECONDS * STEPS_PER_SECOND
  const FIVE_SECONDS = 5 * STEPS_PER_SECOND

  // Stopped `FIVE_SECONDS` after the first bite, so both Zombies' arrivals have happened
  // and the second one is still short of the Chomper - the check then steps it in.
  const planted = withAChomperIn(
    STEPS_TO_THE_CHOMPER + FIVE_SECONDS,
    STEPS_TO_THE_CHOMPER,
    STEPS_TO_THE_CHOMPER + FIVE_SECONDS,
  )

  // Eaten, and now chewing: the whole chew, set on the step it ate, so a Chomper drawn
  // chewing and a Chomper the rules say is chewing are one fact rather than two.
  //
  // **Exactly forty-two seconds less the five that have gone.** The chew is set to the
  // whole chew on the step a Chomper eats, and the eat and the setting are the same step -
  // `devourWithChompers` sets the plant's new state and the dead Zombie in the same pass,
  // so there is no step in which one has happened and the other has not.
  //
  // So the arithmetic is `CHEW - FIVE_SECONDS` and not `CHEW - 1 - FIVE_SECONDS`, and the
  // first two versions of this check were both wrong about that by a step. The reason to
  // write the subtraction out like this rather than as a bare `CHEW` is that a check
  // asserting the countdown's *starting* value is a check about one number, while this
  // one is also a check that the countdown is *running* - that five seconds of chewing
  // actually happened - and the two are only the same check if the numbers are said.
  assert.equal(
    plantAt(planted)?.stepsUntilChewed,
    CHEW - FIVE_SECONDS,
    'the Chomper has chewed for five of the forty-two seconds, so thirty-seven are left to run',
  )
  assert.equal(
    planted.zombies.filter((zombie) => zombie.row === CHOMPER_SQUARE.row).length,
    1,
    'and only the second Zombie is left, five seconds short of where the Chomper is',
  )

  // The step it reaches the Chomper, which is the claim itself. The second Zombie has
  // walked the rest of the way and is standing in the Square of a Chomper that is
  // chewing - and it is still on the lawn afterwards, at full health.
  const reached = afterSteps(planted, FIVE_SECONDS)
  const stillThere = reached.zombies.find((zombie) => zombie.row === CHOMPER_SQUARE.row)
  assert.ok(
    stillThere,
    'a Zombie that reached a chewing Chomper is still on the lawn: it was not eaten',
  )
  assert.equal(stillThere.health, 200, 'at full health, so nothing touched it')
})

test('a Zombie that reaches a Chomper mid-chew eats it, and the Chomper is gone', () => {
  // What the chew costs the plant, and the punishment the whole lockout creates.
  //
  // Not an extra rule, but the rule that is already here: a Chomper is a Plant, and the
  // rule for a plant in a Zombie's way is that the Zombie stops and eats it - which is
  // `walkAndEat`'s rule and does not read the Chomper file at all. So a Chomper being
  // chewed is *food*, and a Chomper that has just eaten and is now standing there unable
  // to eat anything is a plant that is being eaten for forty-two seconds doing nothing.
  //
  // Which is the trap in the plant, and the rules deliberately do not prevent it. A
  // Chomper left alone in a Row is a Chomper being eaten: three hundred health and a
  // hundred a bite is three bites, so a player watching their 150 Sun die in about two
  // and a half seconds learns something the price did not say. The chew is what makes
  // that likely rather than unlucky - a Chomper that finished chewing in five seconds
  // would usually get another meal first.
  //
  // The same fixture as the check above, from the same point - five seconds into the
  // chew, with the second Zombie standing in the Chomper's Square and about to arrive in
  // it. Both checks read one state and then step, so neither is holding up the other.
  const planted = withAChomperIn(
    STEPS_TO_THE_CHOMPER + 5 * STEPS_PER_SECOND,
    STEPS_TO_THE_CHOMPER,
    STEPS_TO_THE_CHOMPER + 5 * STEPS_PER_SECOND,
  )

  assert.equal(
    plantAt(planted)?.health,
    100,
    'the Chomper has been bitten twice and has one bite left before it is gone: 300 health and a bite is 100',
  )

  // A bite a second and the Chomper is 300 health, so three bites and the Square is bare
  // grass. Four seconds is one bite after that - the same margin the Potato Mine's file
  // uses, and for the same reason: a check on the exact step the plant died could not
  // tell a dead plant from one with no health left.
  const eaten = afterSteps(planted, 4 * STEPS_PER_SECOND)

  assert.equal(
    plantAt(eaten),
    undefined,
    'the Chomper is gone from its Square, eaten by the Zombie that reached it while it was chewing',
  )
  const survivor = eaten.zombies.find((zombie) => zombie.row === CHOMPER_SQUARE.row)
  assert.ok(survivor, 'and that Zombie is still on the lawn')
  assert.equal(survivor.health, 200, 'unharmed by a Chomper that was busy chewing')
})

test('a Chomper eats again once the chew has finished', () => {
  // The other side of the lockout, and without it the plant is a mistake rather than a
  // decision: a Chomper that ate one Zombie and then stood in its Square doing nothing for
  // the rest of the level would be 150 Sun that removed exactly one Zombie, which no
  // player would ever choose twice.
  //
  // **Two Zombies for this check and not three**, and the reason is a rule rather than
  // tidiness. A Zombie that reaches a chewing Chomper bites it on the step it arrives, so
  // a Chomper cannot decline a Zombie for the whole chew and then eat the next one - by
  // the time the chew is over, any Zombie that arrived during it has eaten the plant
  // three times over. Check three is that; check two is a Zombie arriving on the step
  // the chew begins, before it can bite. So there is no arrangement of Zombies that gets
  // one Chomper to *skip* one and then take another, and a check written to try is a
  // check written about a lawn that cannot exist.
  //
  // Which leaves the shape this check does have: one Zombie eaten, the chew running down
  // with nothing arriving, and then a second Zombie walking into a Chomper that is ready
  // for it. The chew is long enough - forty-two seconds is a little over eight Columns of
  // Zombie's walk - that the second has nearly to cross the whole board to give this
  // Chomper a second chance, and that is the plant.
  const CHEW = 42 * STEPS_PER_SECOND
  // How long after the chew runs out the second Zombie is eaten. Measured, because the
  // second Zombie walks in from the right-hand edge - a schedule `stepsToReach` times from
  // the edge, not from the plant - so the gap between the chew ending and the second bite is
  // not a number this fixture can work out without repeating the whole walk.
  //
  // **Twenty seconds, not the seventy-nine steps the first measurement gave**, because
  // seventy-nine put the second Zombie in the Chomper's Square on the very step the chew
  // ran out, and a Zombie that arrives on that step bites before the Chomper is ready to
  // eat - so the Chomper was at 100 health when the check looked, one bite short of where
  // it should be, and the check could not tell a Chomper being nibbled from a Chomper
  // waiting. A margin of a fifth of a chew makes the two unambiguously different.
  const EATEN_AFTER = 20 * STEPS_PER_SECOND
  /**
   * Steps from the chew running out to the step the second Zombie is eaten.
   *
   * **Measured, and it is not `EATEN_AFTER + 1`.** The second Zombie is scheduled by
   * `stepsToReach` to be *standing in* the Chomper's Square `EATEN_AFTER + 1` steps after
   * the chew runs out, and the half Column inside `stepsToReach` means it arrives early
   * enough to be eating 141 steps before that - a half Column of walk, which is what the
   * `STEPS_PER_COLUMN / 2` in that helper is. So the bite is `EATEN_AFTER + 2 - 141`.
   *
   * Measured rather than left to that arithmetic because the check below *is* about this
   * number: a bound of "within the walk" let a Chomper whose chew never ends pass, since
   * such a Chomper never bites at all and a loose bound is satisfied by not finding one.
   */
  const STEPS_TO_THE_SECOND_BITE = EATEN_AFTER + 1 - STEPS_PER_COLUMN / 2

  // The first Zombie, timed as the checks above time it. Then the second, scheduled so
  // that it walks `PAST` steps after the chew has run out: `stepsToReach` is how long a
  // Zombie from the right-hand edge takes to reach the Chomper's Column, and the chew ends
  // on the step after the first bite.
  //
  // **Both steps are measured from the planting tick**, so both are added to it here rather
  // than in the helper - `withWavesIn` takes a Wave's `atStep` as the level's own step and
  // adds nothing, and the planting tick is the only thing the caller knows. That split is
  // the reason there are two helpers rather than one: the first three checks can say "so
  // many steps after the plant" because every Zombie they send walks in on the planting
  // step, and this one cannot, because its second Zombie walks in seconds later and has to
  // be walked the whole way as well.
  // The first Zombie, timed as the checks above time it. The second is walked in from the
  // right-hand edge and scheduled so that it stands in the Chomper's Column
  // `EATEN_AFTER + 1` steps after the chew runs out - the extra step being the one a
  // Zombie that reaches a Square takes to be standing in it, the same margin as
  // `THE_FIRST_BITE`.
  //
  // Its Wave is a long way from the plant's own step because a Zombie from the edge is
  // already walking by the time the Sun is out: `withWavesIn` adds nothing to an atStep, so
  // this one has to be the level's own step, and the planting tick is some thousands of
  // steps past step 0 by the time a Chomper can be afforded.
  const lawn = aChomperInTheGround()
  const tick = lawn.tick
  const planted = onALawnWith(
    lawn,
    STEPS_TO_THE_CHOMPER + CHEW - 1,
    [
      A_WAVE_ON(tick + 1),
      A_WAVE_ON(
        tick + STEPS_TO_THE_CHOMPER + CHEW + EATEN_AFTER + 1 - stepsToReach(CHOMPER_SQUARE.column),
      ),
    ],
  )

  assert.ok(plantAt(planted), 'the Chomper is still standing, having eaten the first Zombie')
  assert.equal(
    plantAt(planted)?.stepsUntilChewed,
    1,
    'one step of chew left, so it cannot eat again yet',
  )
  // The second Zombie has walked in but not arrived - it is four or five Columns short. The
  // Chomper is at 200 rather than 300 because the first Zombie got a bite off it on the very
  // step it was eaten, and both happen in that one step: `walkAndEat` bites the plant a
  // Zombie has reached, and `devourWithChompers` takes that same Zombie off the lawn a
  // moment later. So a Chomper that eats something standing in its Square has already been
  // bitten once by it, which is not a rule about the Chomper but what "a Zombie that walks
  // into a plant stops there" means.
  assert.equal(
    plantAt(planted)?.health,
    200,
    'and the Chomper is at 200 health: the first Zombie bit it on the same step it was eaten, and the second has not arrived',
  )

  // **The boundary, which is a claim of its own: on the step the chew runs out the Chomper
  // is not yet ready, and it is ready on the step after.** The chew is spent before the
  // plant is asked whether it can eat, so a Chomper whose chew reaches zero *during* a step
  // eats on the following one - the same reading every other countdown in this game gives,
  // and the same one that makes the two off-by-one mutations below detectable.
  //
  // Checked as both halves rather than as the number alone, because "zero" and "not yet
  // ready to eat" are different claims and a Chomper whose chew is spent *after* it is
  // asked - one step eager - reads zero at exactly the wrong moment to tell them apart.
  const oneStepEarly = afterSteps(planted, 1)
  assert.equal(
    plantAt(oneStepEarly)?.stepsUntilChewed,
    0,
    'the chew has run out to zero on this step',
  )
  const ready = afterSteps(oneStepEarly, 1)
  assert.equal(
    plantAt(ready)?.stepsUntilChewed,
    0,
    'and it stays at zero, so it is ready to eat from here',
  )

  // And the second Zombie walks into a Chomper that is waiting for it, and is eaten - which
  // is the same bite as the first, from the same rule, on a plant that has already done it
  // once.
  // The second bite. Read one step at a time rather than in a single jump, because how many
  // steps separate the bite and this reading is a fact about a Zombie walking a half Column
  // to its Square and is not worth deriving in the check - so it is *found*: the step the
  // Chomper's chew is at its highest after the chew ran out is the bite, and the number of
  // steps between that and here is what the assertion below works in.
  let at = ready
  let stepsSinceTheBite = 0
  while ((plantAt(at)?.stepsUntilChewed ?? 0) === 0) {
    at = afterSteps(at, 1)
    stepsSinceTheBite += 1

    // The loop is bounded *inside itself* as well as by the assertion below, and that is
    // the whole of what it is for. Without this, a Chomper whose chew never reaches zero -
    // because the chew is added to rather than set, so it is added to forever - simply walks
    // this loop to the end of its bound and stops, and every claim below it is then about a
    // Chomper that has not eaten anything. Both of those rules passed all four checks in
    // this file until this bound was here.
    //
    // So: the walk ends at the step the fixture put the second Zombie in the Chomper's
    // Square, plus the one the bite takes after it, and if the chew has not risen by then
    // the Chomper did not eat again - which is this check's entire subject.
    assert.ok(
      stepsSinceTheBite <= STEPS_TO_THE_SECOND_BITE,
      `the Chomper never ate again: its chew was still running ${stepsSinceTheBite} steps after the chew should have run out`,
    )
  }
  // Found rather than assumed: the chew must be at its highest on the bite's own step, and
  // at most `EATEN_AFTER + 2` steps later, or the loop has walked past the whole point of
  // the check.
  //
  // **The whole chew, not `CHEW - 1`** - the bite and the setting of the chew are the same
  // step, not two steps, so a Chomper that has just eaten reads a full chew on that step and
  // only starts counting down on the one after. That is the same reading every other
  // countdown in this game gives at the moment it is set, and it is why the check below can
  // be exact: there is no half-step in it to fall through.
  assert.equal(
    plantAt(at)?.stepsUntilChewed,
    CHEW,
    'the bite sets the whole chew on the step it happens, rather than one step short of it',
  )
  //
  // **Exact, because "within the walk" was not enough.** The first version of this was
  // `<= EATEN_AFTER + 2`, and that is satisfied by a loop which never finds a bite at all -
  // which is exactly what a Chomper whose chew is *added to* rather than *set* does: its
  // chew never reaches zero, so the loop walks to the end of its bound and stops there, and
  // every assertion below it is about a Chomper that has not eaten. That mutation passed
  // all four checks in this file. The bound is now the step the fixture puts the second
  // Zombie in the Chomper's Square, and one step for the bite that follows.
  assert.equal(
    stepsSinceTheBite,
    STEPS_TO_THE_SECOND_BITE,
    `and the bite happened on the step the second Zombie reached the Chomper, ${stepsSinceTheBite} steps after the chew ran out`,
  )

  const secondMeal = at

  // Counted in the Chomper's Row, not on the whole lawn: the keep-alive is in the Row below
  // and is still walking, and a check that said "nothing is left" would be a claim about the
  // fixture's keep-alive as much as about the Chomper. This is the same point the Potato
  // Mine's two-Zombies check makes about which Zombie is left rather than how many.
  assert.equal(
    secondMeal.zombies.filter((zombie) => zombie.row === CHOMPER_SQUARE.row).length,
    0,
    'the second Zombie reached a ready Chomper and was eaten by it, so its Row is clear',
  )
  // **The chew is a whole chew, and this is the assertion that says so.** Not "is chewing",
  // and not "has more than a little chew left": a Chomper that ate one Zombie and could
  // never eat another for the rest of the level passed all four checks in this file when
  // this was only `> 0` - because a chew that never ends is still chewing, and every one of
  // those checks was satisfied by a plant that was stuck.
  //
  // So it is pinned to the boundary from both sides: the chew has begun again - the number
  // is far above zero and far below the whole chew, since this reading is taken some steps
  // after the bite - and that is only true of a chew that was *set*, not one that was
  // added to. The exact value is not asserted, because how many steps have run since the
  // bite is the fixture's step count rather than a fact about the plant; what is asserted
  // is that the chew is running and is a fresh one rather than a long one.
  // **Exactly `CHEW - 1`, less the steps that have run since the bite - and the whole of
  // this assertion is that it is exact.** Every weaker version of it passed against a rule
  // that never lets a Chomper eat twice: `> 0` is satisfied by a chew that never ends, and
  // "somewhere between 0 and a whole chew" is satisfied by a chew twice as long. A Chomper
  // that ate one Zombie and then stood in its Square for the rest of the level passed all
  // four checks in this file under either, which is the shape of a check that confirms the
  // code rather than catching it.
  //
  // The chew is set to the whole chew on the bite step, so it reads `CHEW - 1` there and one
  // less for each step after. This reading is taken `AWAIT` steps after the bite - measured
  // once and written down, because it is a fact about how far apart the fixture put two
  // things rather than about the plant.
  // And it is a *counting-down* chew rather than one that has stopped - which is the other
  // half of "eats again", and the half a Chomper that set the chew once and left it would
  // get wrong. One step on, the whole chew is one less: a chew that is not running is a
  // plant that will never eat again, and it would read the same as a fresh one on the very
  // step it was set.
  const afterThat = afterSteps(at, 1)
  assert.equal(
    plantAt(afterThat)?.stepsUntilChewed,
    CHEW - 1,
    'and on the next step the chew is a step shorter, so it is counting down rather than sitting at its start',
  )
})

test('a Zombie reaching a Chomper on the very step its chew runs out is eaten by it', () => {
  // The boundary of the two rules, and the only place they meet. A Chomper that finished
  // chewing on step N is ready on step N, so a Zombie standing in its Square on that step is
  // eaten rather than left to bite it - and a Chomper that finished chewing *one step early*
  // would eat a Zombie that arrived on the step before, and this would be a plant that
  // takes its next bite while a Zombie is still walking towards it.
  //
  // **Three mutations of the chew that every other check in this file passes.** The chew is
  // a countdown, and a countdown can be three different lengths without any of them being
  // noticed by a check that only watches it on its way down: it can be added to whatever was
  // left rather than set, so a Chomper that had already chewed adds another whole chew on
  // top of it; it can be spent one step late, so the plant is asked whether it can eat before
  // the countdown is spent and answers "no" on the step it runs out; and it can be spent
  // *after* the question is asked, which moves the boundary the other way.
  //
  // All three of those leave a chew that counts down, that is forty-two seconds long, and
  // that a Chomper comes out of - so the only check that can tell them apart is one about the
  // *step* the chew runs out on, and about a Zombie standing there at the time. Which is
  // this one.
  //
  // The Zombie is walked in from the right-hand edge and timed so that it is eaten on the
  // step the chew ends - one step before it would be eaten if the chew were a step long or a
  // step short. The check reads all three steps around the boundary, because the claim is
  // about which side of it each step falls on.
  const CHEW = 42 * STEPS_PER_SECOND

  // Eaten on the step the chew runs out: `stepsToReach` back from that step's arrival.
  const theStepTheChewEnds = STEPS_TO_THE_CHOMPER + CHEW
  const lawn = aChomperInTheGround()
  const tick = lawn.tick
  const planted = onALawnWith(
    lawn,
    theStepTheChewEnds - 2,
    [
      A_WAVE_ON(tick + 1),
      // **Walked in so that it is eaten on the step the chew runs out, and no sooner.**
      // `STEPS_TO_THE_CHOMPER` steps back from that step, which is what a Zombie needs to be
      // standing in the Chomper's Column from the right-hand edge - the same walk the first
      // Zombie is timed by, which is what lets this check put two Zombies on either side of
      // one boundary.
      //
      // Measured, because `stepsToReach` is *not* the right number here and using it killed
      // the Chomper three bites before the boundary: that helper measures to the middle of a
      // Column, which is a quarter of a Column past where a Zombie has to be standing to be
      // *in* the Square, so the Wave went in early and the Zombie spent the whole chew
      // eating the plant this check is about.
      A_WAVE_ON(tick + theStepTheChewEnds - STEPS_TO_THE_CHOMPER),
    ],
  )

  // One step before the boundary: the chew is one step from running out and the Zombie is on
  // the lawn, standing in the Square of a Chomper that cannot eat yet. So this really is the
  // boundary and not a coincidence - the Zombie is *there*, a step early.
  const justBefore = afterSteps(planted, 1)
  assert.equal(
    plantAt(justBefore)?.stepsUntilChewed,
    1,
    'one step before the chew runs out, the Chomper is one step from being able to eat',
  )
  assert.equal(
    justBefore.zombies.filter((zombie) => zombie.row === CHOMPER_SQUARE.row).length,
    1,
    'and the Zombie is on the lawn, already standing in the Square of a Chomper that cannot eat it yet',
  )
  // At 100 health, not 300 or 200: the second Zombie has been reaching the Chomper for two
  // bites by the boundary. Not a detail - a Chomper at full health here would mean the Zombie
  // had only just arrived, and then it would be eaten on the step *after* the boundary and
  // this check would be about the wrong step entirely.
  assert.equal(
    plantAt(justBefore)?.health,
    100,
    'and the Chomper is down to its last bite: the second Zombie has been reaching it for two bites',
  )

  // The boundary itself. The chew has run out on this step, and the Zombie standing in the
  // Square on this step is gone - which is the claim: a Chomper is ready on the step its chew
  // runs out, and not one step later.
  const theStepItEnds = afterSteps(justBefore, 1)
  assert.equal(
    plantAt(theStepItEnds)?.stepsUntilChewed,
    CHEW,
    'the chew ran out and a fresh whole one began on that same step, which is what made the Zombie edible',
  )
  assert.equal(
    theStepItEnds.zombies.filter((zombie) => zombie.row === CHOMPER_SQUARE.row).length,
    0,
    'and on that same step the Zombie standing in the Chomper’s Square is eaten by it',
  )

  // And the chew is a fresh one from that step, not a leftover: which is what makes the two
  // halves above one claim rather than two. A chew that had been added to rather than set
  // would also read zero here - and would then have left a Chomper that could not eat for
  // another forty-two seconds, which is the failure this whole check exists to catch.
  assert.equal(
    plantAt(afterSteps(theStepItEnds, 1))?.stepsUntilChewed,
    CHEW - 1,
    'and the next step the chew is a whole chew shorter, so this was a fresh one',
  )
})
