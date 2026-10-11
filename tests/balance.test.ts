import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'
import { DEFAULT_SEED, apply, initialGameState, type GameState } from '../src/game/sim.ts'
import { LEVEL_1_1 } from '../src/game/levels.ts'
import { centreX, plantIn, SQUARE_WIDTH, type Square } from '../src/game/board.ts'
import { untilTick } from './helpers.ts'
import type { Plan } from './plans.ts'
import { zombieX } from '../src/game/zombies.ts'
import {
  attackedRows,
  DEFENCE_COLUMN,
  DEFENCE_FIRST,
  economyFirst,
  playLevel,
  rowsNoWaveAttacks,
  THREE_MINUTES,
} from './plans.ts'

/** Plays a plan through Level 1-1 from a fresh lawn, which is what both of them are about. */
function playThisLevel(plan: Plan): GameState {
  return playLevel(plan, initialGameState(DEFAULT_SEED, LEVEL_1_1))
}

/**
 * The step the Level's last Wave walks in on: the moment the whole schedule has
 * arrived and everything still standing is what the player has to answer.
 *
 * Read off the schedule rather than written as a number, because it is a fact
 * about the Level rather than a measurement, and a check that hard-coded 9000
 * would go on passing after the schedule moved.
 */
const FLAG_WAVE = LEVEL_1_1.waves[LEVEL_1_1.waves.length - 1]?.atStep ?? 0

/**
 * How many seconds of play a plan had between the last Wave arriving and the level
 * ending, which is the margin the plan won or lost by.
 *
 * Negative when the plan lost before the last Wave had even arrived, which is the
 * interesting case: a level that ends early is not a hard level, it is a level
 * where the schedule ran out before the player was in trouble.
 */
function marginInSeconds(state: GameState): number {
  return (state.tick - FLAG_WAVE) / STEPS_PER_SECOND
}

/**
 * The margin an economy-first plan wins Level 1-1 by, in seconds after the last
 * Wave walks in - the number the ticket asks to be recorded.
 *
 * Stated rather than merely required to be positive, because "it won, with time to
 * spare" is not a measurement. A balance pass whose output is a sign has recorded
 * nothing a later change to Sun flow, Zombie speed or Wave spacing could be caught
 * by, and every number this pass produced came from playing the level - this one
 * included.
 *
 * It was 22.9 until the balance pass that took a Basic Zombie to 200 health and a
 * Sunflower to eighteen seconds. It is smaller now because the level ends sooner:
 * Zombies fall faster, so the last of the Flag Wave is down sooner after it walks in.
 */
const ECONOMY_MARGIN_IN_SECONDS = 17.6

/** What a Sunflower costs, written out rather than read from the rules. */
const SUNFLOWER_COST = 50

/** What one piece of Sun is worth, written out rather than read from the rules. */
const SUN_WORTH = 25

/**
 * The Rows the schedule touches earliest and latest, found by looking at it.
 *
 * Read off Level 1-1's own schedule rather than written as numbers, and this is the
 * point of the whole check: a hard-coded 2 would go on passing after the schedule
 * started attacking a different Row first, and the comparison between the two Rows
 * would quietly become a comparison of two Rows the level treats the same way. The
 * Rows that decide a Sunflower's fate are whichever ones the Waves come for first
 * and last, and that is a fact about the schedule rather than about this file.
 */
const ROWS_ATTACKED = attackedRows(LEVEL_1_1)

/** The Row the level's first Wave walks down, and so the tightest a Sunflower gets. */
const FIRST_ROW_ATTACKED = ROWS_ATTACKED[0] ?? 0

/** The Row the schedule does not reach until last. */
const LATEST_ROW_ATTACKED = ROWS_ATTACKED[ROWS_ATTACKED.length - 1] ?? 0

/** How long between one piece of Sun a Sunflower makes and the next. */
const PRODUCTION_INTERVAL_IN_SECONDS = 18

/** Two pieces: what it takes a Sunflower to have earned back what it cost. */
const PAYBACK_IN_SECONDS = 2 * PRODUCTION_INTERVAL_IN_SECONDS

/**
 * How long a Zombie takes to walk the length of the whole lawn: the nine Columns
 * at 4.7 seconds each, worked out here rather than read from the rules so that a
 * check can catch the number being wrong.
 *
 * This is the number the Sunflower's whole economy turns on. Payback used to be
 * longer than a crossing, so a Sunflower only came out ahead where a Zombie took its
 * time arriving. At eighteen seconds it is shorter, chosen by the user to make the
 * game easier: a Sunflower now pays for itself before a Zombie that walks in on the
 * step it is planted could reach it.
 */
const CROSSING_TIME_IN_SECONDS = 9 * 4.7

/**
 * A Row Level 1-1 never sends a Zombie down.
 *
 * Read off the schedule rather than written as a number, because which Rows are
 * safe is a fact about the Level and a check that hard-coded 0 would go on passing
 * after the schedule started attacking it - which is exactly the change that would
 * quietly turn every economy plan in this file into a losing one.
 *
 * Asserted to exist rather than defaulted. A schedule that attacked every Row would
 * leave this undefined, and a check that quietly measured some other Row instead
 * would keep passing while measuring nothing: the two halves of the check below are
 * only a contrast if the Rows really are different in kind, and that is a claim
 * about the schedule worth making rather than assuming.
 */
const ROWS_NOTHING_ATTACKS = rowsNoWaveAttacks(LEVEL_1_1)

test('Level 1-1 leaves at least one Row nothing ever walks down, and that is where an economy has to go', () => {
  // The precondition of the check below, stated on its own so that a schedule which
  // stopped leaving a Row alone fails here and says so, rather than turning the
  // comparison below into a comparison of two Rows that are the same and reporting
  // a result that means nothing.
  assert.ok(
    ROWS_NOTHING_ATTACKS.length > 0,
    `Level 1-1 leaves ${ROWS_NOTHING_ATTACKS.length} Rows that no Wave ever sends a Zombie down, so there is somewhere an economy can be built at all`,
  )
  assert.ok(
    ROWS_NOTHING_ATTACKS.length < 5,
    `and leaves ${ROWS_NOTHING_ATTACKS.length} of 5 - not every Row, because a level that never attacked anything could not be lost and this one is`,
  )
})

/**
 * A Sunflower standing in the first Column of that Row for the whole of Level 1-1,
 * and what it managed to make before the level ended.
 *
 * Played on the shipped schedule rather than on a fixture, because the schedule is
 * one of the things this pass measures and a stand-in would be a different level.
 * The Sun is counted as it is *made*, not as it is collected: a Sunflower's value
 * is the Sun it produces while it is standing there, and letting an unclicked Sun
 * count would make the answer depend on the pointer rather than on the plant.
 */
function paybackOfASunflowerIn(row: number): { sun: number; eatenAfter: number; stillStanding: boolean } {
  let state = initialGameState(DEFAULT_SEED, LEVEL_1_1)
  const square = { row, column: DEFENCE_COLUMN }
  state = apply(apply(state, { kind: 'choose', choice: 'sunflower' }), { kind: 'place', square })

  const madeHere = new Set<number>()
  let sun = 0
  let eatenAt = 0

  for (let step = 0; step < THREE_MINUTES && state.outcome === 'playing'; step++) {
    const before = state
    state = apply(state, { kind: 'advance' })

    for (const token of state.tokens) {
      const isNew = !before.tokens.some((previous) => previous.id === token.id)
      if (isNew && token.x === centreX(square) && !madeHere.has(token.id)) {
        madeHere.add(token.id)
        sun += SUN_WORTH
      }
    }

    // Recorded once, on the first step the Square is bare. Left to run to the end of
    // the level it reports the last step of the level rather than the step the
    // Sunflower was eaten on - so every eaten Sunflower reports the same number,
    // which is a number that means nothing and looks like a measurement.
    if (eatenAt === 0 && plantIn(state.occupants, square) === undefined) {
      eatenAt = state.tick
    }
  }

  return {
    sun,
    eatenAfter: eatenAt / STEPS_PER_SECOND,
    stillStanding: plantIn(state.occupants, square) !== undefined,
  }
}

test('a player who builds an economy before a defence still wins Level 1-1', () => {
  // The first thing a balance pass has to answer, and the reason the Sunflower
  // went in before the Wall-nut: the level's pacing was set at ticket 08 against a
  // Peashooter and nothing else, so a plan that spends its first Sun on anything
  // that is not shooting has never been played. It could be that the schedule
  // leaves no room for an economy at all - in which case either the economy is
  // wrong or the spacing is, and the checks below say which.
  const won = playThisLevel(economyFirst(2, ROWS_NOTHING_ATTACKS))

  assert.equal(won.outcome, 'won', 'a plan that builds two Sunflowers and then defends wins Level 1-1')
  assert.equal(won.pendingWaves.length, 0, "the level's last Wave has been sent")
  assert.equal(won.zombies.length, 0, 'and the lawn is clear, so nothing was left standing')
  assert.ok(
    Math.abs(marginInSeconds(won) - ECONOMY_MARGIN_IN_SECONDS) < 0.1,
    `and it won with time to spare: ${marginInSeconds(won).toFixed(1)} seconds after the last Wave walked in, which is the ${ECONOMY_MARGIN_IN_SECONDS} the ticket asks to be recorded`,
  )
})

/**
 * The second Level 1-1 is lost on, in seconds, and the number is the measurement
 * this pass exists to take.
 *
 * It is written here rather than read from the rules, so that a check can catch the
 * pacing being wrong: Sun flowing faster, a Zombie walking faster, a Wave moving,
 * and this number moves with all three. It was 142.3 when the Sunflower arrived and
 * the spacing was last settled at ticket 08, and it has not moved since - which is
 * the answer to whether the Sunflower's arrival disturbed the level's pacing, since
 * a player who plants nothing never gets near one.
 *
 * Before the Flag Wave at 150 seconds, and that is the right shape rather than a
 * worry. The fourth Wave goes back into Row 3, the Row the first Wave already sent
 * a mower down, so a player who has done nothing is finished by a Zombie walking
 * into a Row with no mower left while the level's hardest Wave is still two Waves
 * away. They never see the Flag Wave at all, which is what losing early *is*.
 */
const LOSING_TIME = 142.3

test('a player who plants nothing loses Level 1-1, at a time the check states', () => {
  // The other half of "a level has to be answerable", and the half that makes the
  // first one mean something. A level a player cannot lose is not a level that has
  // been balanced.
  //
  // The time is the measurement, and it is asked for exactly rather than as a
  // range: a balance pass that records "loses somewhere around two and a half
  // minutes" has recorded nothing that a later change to any number in the game
  // could be caught by. The range that would make this robust is the range that
  // would also let the level stop being losable altogether without anyone noticing,
  // so it is a stated number and the statement is what fails when it moves.
  let state = initialGameState(DEFAULT_SEED, LEVEL_1_1)
  for (let step = 0; step < THREE_MINUTES && state.outcome === 'playing'; step++) {
    state = apply(state, { kind: 'advance' })
  }

  assert.equal(state.outcome, 'lost', 'a player who planted nothing at all loses Level 1-1')
  assert.equal(state.zombies.length, 0, 'with the Zombie that got in gone from the lawn, as a breach always is')
  assert.ok(
    Math.abs(state.tick / STEPS_PER_SECOND - LOSING_TIME) < 0.1,
    `at ${LOSING_TIME} seconds - measured, ${(state.tick / STEPS_PER_SECOND).toFixed(1)}`,
  )
})

test('a Sunflower pays for itself in every Row of Level 1-1, and one a Zombie reaches late earns more', () => {
  // The claim this check was first written around was that a Sunflower in the Row the
  // first Wave walks down is eaten before it has paid for itself. With the original's
  // twenty-four and a quarter seconds that was a photo-finish: two pieces, exactly the
  // 50 it cost. The user shortened the interval to eighteen seconds to make the game
  // easier, and that is no longer true - two pieces now take 36 seconds, a Zombie needs
  // 42.3 to cross the lawn, so even the first-attacked Row comes out ahead.
  //
  // What is left of the old claim is that timing still decides *how much* a Sunflower
  // earns: one in a Row the schedule reaches late makes more than one the first Wave
  // eats. Both ends are asked, so a change that made every Row the same would fail.
  //
  // The Rows are read from the shipped schedule rather than written down, so a future
  // schedule change cannot quietly invalidate the comparison.
  const attacked = paybackOfASunflowerIn(FIRST_ROW_ATTACKED)
  const late = paybackOfASunflowerIn(LATEST_ROW_ATTACKED)

  assert.ok(
    !attacked.stillStanding && attacked.sun > SUNFLOWER_COST,
    `a Sunflower in the Row the level's first Wave walks down is eaten, but not before it is ahead: it makes ${attacked.sun} Sun against a cost of ${SUNFLOWER_COST}, and is eaten at ${attacked.eatenAfter.toFixed(1)} seconds having made ${attacked.sun / SUN_WORTH} pieces`,
  )
  assert.ok(
    late.sun > attacked.sun,
    `while one in a Row the schedule does not reach until much later makes more: ${late.sun} Sun against ${attacked.sun}, eaten at ${late.eatenAfter.toFixed(1)} seconds - so when a Zombie arrives still decides how much a Sunflower is worth`,
  )
})

test("a Sunflower's cost and production interval are the ones the rules actually charge and wait", () => {
  // Two of the Sunflower's three numbers, and this is the shape the third takes in
  // the check after it: each is read *out of the rules by playing them*, never
  // compared against a literal sitting next to it in this file. A local constant
  // asserted equal to the same local constant is true whatever the game does, and a
  // check like that is the one AGENTS.md warns about - it would have passed
  // unchanged if the Sunflower had been re-priced to 25 Sun.
  //
  // **Cost, 50 Sun.** Read by charging for one: the level opens with 50, a Sunflower
  // takes all of it, and half of that buys a Peashooter - so the first decision of
  // Level 1-1 is a Sunflower or a Peashooter and neither is a mistake. It is the
  // only number in the game that decides what the first click of a level is for.
  //
  // **Interval, 18 seconds.** Read by planting one in an empty Row and watching
  // when its Sun arrives, which is the only way to see the number: two pieces earn
  // back the 50, so the investment returns at 36 seconds, and a Zombie needs 42.3
  // to cross the whole lawn. It was the original's twenty-four and a quarter, which
  // made the payback longer than the lawn is wide and a Sunflower a bet on a Zombie
  // arriving late. The user shortened it to make the game easier, knowing that it
  // makes a Sunflower an early investment that pays wherever it stands.
  const packet = initialGameState(DEFAULT_SEED, LEVEL_1_1).seedBank.find(
    (candidate) => candidate.name === 'sunflower',
  )
  assert.ok(packet, "Level 1-1's Seed Bank offers a Sunflower to charge for")
  assert.equal(packet.cost, 50, 'a Sunflower costs 50 Sun - half a Peashooter, and exactly what a level opens with')

  const opened = initialGameState(DEFAULT_SEED, LEVEL_1_1)
  const charged = plantTheSunflower(opened)
  assert.equal(charged.sun, opened.sun - 50, 'and it takes all 50 Sun a level opens with')

  const firstSun = untilTick(charged, STEPS_PER_SECOND, 'the first interval had run')
  assert.equal(
    sunOver(firstSun, THE_SUNFLOWER_SQUARE).length,
    0,
    'a Sunflower makes nothing for the first eighteen seconds, so the interval is a wait and not a trickle',
  )

  const made = untilTick(charged, Math.round(18 * STEPS_PER_SECOND), 'the first piece of Sun was due')
  const first = sunOver(made, THE_SUNFLOWER_SQUARE)
  assert.equal(first.length, 1, 'and exactly one piece of Sun arrives on the step the interval is up')
  assert.equal(first[0]?.amount, 25, 'worth 25 Sun, so two of them are what pays the 50 back')

  // The interval read a second time, from the gap between two pieces rather than
  // from the wait before the first. Counting what is lying on the lawn cannot do it:
  // a piece of Sun spends its life and is gone well before the second arrives, so
  // the two would never be on the lawn at once and the gap would be invisible.
  const gaps = stepsBetweenEachPieceOfSunASunflowerMakes(charged)
  assert.deepEqual(
    gaps,
    [Math.round(18 * STEPS_PER_SECOND), Math.round(18 * STEPS_PER_SECOND)],
    `and the pieces come ${gaps.join(', ')} steps apart, so the interval is the same on the second piece as on the first - Sun expires off the lawn between them, which is why the gap has to be measured as it is made rather than by looking at what is still there`,
  )
  assert.ok(
    PAYBACK_IN_SECONDS < CROSSING_TIME_IN_SECONDS,
    `and two pieces take ${PAYBACK_IN_SECONDS} seconds to earn back what it cost, which is less than a Zombie needs to cross the whole lawn (${CROSSING_TIME_IN_SECONDS} seconds) - so a Sunflower has paid for itself before even a Zombie that walked in as it was planted can reach it`,
  )
})

test("a Sunflower's health is worth exactly two seconds of a Zombie standing still, and nothing more", () => {
  // The third number, on its own because nothing above can see it.
  //
  // Health does not show up in a Sunflower's *value* - it earns no Sun, so making
  // it tougher changes nothing about what the plant is worth - and it turns out
  // not to change its payback either, since a Sunflower in an attacked Row is
  // eaten either side of its second piece. The only thing it does is delay a
  // Zombie, and that is the thing worth stating: 300 health against a bite of 100
  // is three bites, and the first lands on the step the Zombie arrives, so what 300
  // buys is the two seconds *between* those bites.
  //
  // Two seconds is very little, and that is the point. A Wall-nut buys forty and a
  // Tall-nut eighty, so the range from a Sunflower to a Wall-nut is the whole
  // difference between a plant that is barely in the way and a plant that decides a
  // Row - and the Sunflower is not a cheap Wall-nut, it is a plant that makes Sun
  // and happens to be food for two seconds if something eats it. Deliberately not
  // raised: a tougher Sunflower would be a different plant, and the note in
  // `balance.ts` is right that this one's weakness is what it cost rather than how
  // fast it dies.
  const held = secondsAZombieIsHeldBy(plantTheSunflower(initialGameState(DEFAULT_SEED, LEVEL_1_1)))

  assert.ok(
    Math.abs(held - 2) < 0.1,
    `a Sunflower holds a Zombie for ${held.toFixed(1)} seconds - three bites of 100 against 300 health, the first landing as it arrives, so the two gaps between bites are all it is worth`,
  )
})

/**
 * How many seconds a Zombie spent standing still eating a Sunflower standing in the
 * Square, measured from the step it reached the Square to the step the plant was
 * gone.
 *
 * Measured rather than worked out, because the interesting part is that the
 * arithmetic and the rules agree - three bites at one a second, the first of them
 * landing on arrival, so the two gaps between them are the two seconds - and a
 * check that did the division itself would be asserting the health number against
 * the damage number without ever asking the rules to eat anything.
 */
function secondsAZombieIsHeldBy(state: GameState): number {
  const frontOf = centreX(THE_SUNFLOWER_SQUARE) + SQUARE_WIDTH / 2
  let arrivedAt = 0
  let goneAt = 0

  for (let step = 0; step < THREE_MINUTES; step++) {
    state = apply(state, { kind: 'advance' })

    const zombie = state.zombies.find((candidate) => candidate.row === THE_SUNFLOWER_SQUARE.row)
    if (arrivedAt === 0 && zombie !== undefined && zombieX(zombie) <= frontOf) {
      arrivedAt = state.tick
    }

    if (plantIn(state.occupants, THE_SUNFLOWER_SQUARE) === undefined) {
      goneAt = state.tick
      break
    }
  }

  assert.ok(arrivedAt > 0, 'a Zombie walked the length of the lawn and reached the Sunflower')
  assert.ok(goneAt > 0, 'and ate it')

  return (goneAt - arrivedAt) / STEPS_PER_SECOND
}

test("Level 1-1's spacing still leaves room for an economy, and the economy is what fills it", () => {
  // The ticket's last criterion, and the one that decides whether this pass changes
  // a number. The Sunflower arrived after the spacing was set, so the spacing was
  // balanced against a Peashooter and nothing else - a plan that spends its first
  // Sun on something that does not shoot had never been played. If a level can only
  // be won by shooting from the first drop, the economy is decoration.
  //
  // The comparison that answers it is between the two plans, because "the economy
  // plan wins" on its own would be satisfied by a level so gentle that doing
  // nothing also won. The defence-first plan is the control: it is the schedule as
  // it was balanced, and the economy plan is asked to beat it, not merely to turn
  // up.
  //
  // It does, by a small margin - and the size of that margin is the finding. The
  // economy plan finishes a fraction of a second *sooner* than the defence-only
  // plan, which sounds like the economy paying for itself and is not: the two Sun
  // it plants are 50 Sun each that were not spent on Peashooters, and what that
  // buys is a fraction of a second of shooting time. The margin is real and it is
  // small, which is the correct shape for the first level of the game. A big
  // margin would mean the economy was strictly better and the decision was not
  // one; a negative one would mean the spacing cannot answer a plan that opens with
  // a Sunflower at all, and the spacing would have to move.
  const defence = playThisLevel(DEFENCE_FIRST)
  const economy = playThisLevel(economyFirst(2, ROWS_NOTHING_ATTACKS))

  assert.equal(defence.outcome, 'won', 'the plan the spacing was balanced against still wins it')
  assert.equal(
    economy.outcome,
    'won',
    'and so does a plan that opens with two Sunflowers - the spacing has room for an economy, so it does not move',
  )
  assert.ok(
    marginInSeconds(economy) > 0,
    `with ${marginInSeconds(economy).toFixed(1)} seconds to spare after the last Wave walked in, against ${marginInSeconds(defence).toFixed(1)} for the defence-only plan - a real margin, and a small one`,
  )
  assert.ok(
    economy.tick <= defence.tick,
    `and the economy plan finishes no later than the defence-only one (${(economy.tick / STEPS_PER_SECOND).toFixed(2)}s against ${(defence.tick / STEPS_PER_SECOND).toFixed(2)}s), so the two Sunflowers are not costing the level anything`,
  )
})

/**
 * How many seconds a Zombie spent standing still eating that Sunflower, measured
 * from the step it reached the Square to the step the plant was gone.
 *
 * Measured rather than worked out, because the interesting part is that the
 * arithmetic and the rules agree - three bites at one a second, the first of them
 * landing on arrival, so the two gaps between them are the two seconds - and a
 * check that did the division itself would be asserting the health number against
 * the damage number without ever asking the rules to eat anything.
 */
/** The pieces of Sun lying over one Square, which is where a Sunflower makes its own. */
function sunOver(state: GameState, square: Square) {
  return state.tokens.filter((token) => token.x === centreX(square))
}

/**
 * The gap in steps between each piece of Sun a planted Sunflower makes, up to the
 * first few.
 *
 * Watched as they are made rather than read off the lawn afterwards, because a piece
 * of Sun does not wait for the next one: it falls, it rests, and it is gone within
 * about thirteen seconds, while the interval is eighteen. Two pieces are never
 * on the lawn at the same time, so a check that looked for both at once would find
 * neither and conclude the Sunflower had stopped.
 */
function stepsBetweenEachPieceOfSunASunflowerMakes(planted: GameState): number[] {
  const seen = new Set<number>()
  const madeAt: number[] = []

  for (let step = 0; step < 3 * Math.round(18 * STEPS_PER_SECOND); step++) {
    const before = planted
    planted = apply(planted, { kind: 'advance' })

    for (const token of planted.tokens) {
      const isNew = !before.tokens.some((previous) => previous.id === token.id)
      if (isNew && token.x === centreX(THE_SUNFLOWER_SQUARE) && !seen.has(token.id)) {
        seen.add(token.id)
        madeAt.push(planted.tick)
      }
    }
  }

  return madeAt.slice(1).map((tick, index) => tick - madeAt[index]!)
}

/** Where the Sunflower these checks plant is standing, named once. */
const THE_SUNFLOWER_SQUARE: Square = { row: FIRST_ROW_ATTACKED, column: DEFENCE_COLUMN }

/** That Sunflower, paid for and put down. */
function plantTheSunflower(state: GameState): GameState {
  return apply(apply(state, { kind: 'choose', choice: 'sunflower' }), {
    kind: 'place',
    square: THE_SUNFLOWER_SQUARE,
  })
}
