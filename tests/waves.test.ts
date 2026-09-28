import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BOARD_ROWS, LOGICAL_WIDTH, occupantAt, type Row, type Square } from '../src/game/board.ts'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'
import { DEFAULT_SEED, apply, initialGameState, type GameState } from '../src/game/sim.ts'
import { LEVEL_1_1 } from '../src/game/levels.ts'
import { zombieX, type Zombie } from '../src/game/zombies.ts'
import {
  PEA_COST,
  ZOMBIE_STEPS_PER_COLUMN,
  levelWith,
  oneZombieIn,
  untilTheLevelEnds,
  untilTick,
} from './helpers.ts'

/** The Rows of a set of Zombies, in order, so a check can name them and be done. */
function rowsOf(zombies: readonly Zombie[]): Row[] {
  return zombies.map((zombie) => zombie.row).sort((a, b) => a - b)
}

const FIRST_WAVE = 1
const SECOND_WAVE = 200

/** When a level of one Wave sends it. */
const ONE_WAVE = 1

/** A Row to lose, the same one the Game Over checks spend. */
const ROW = 2

/**
 * A level with two Waves that are nothing like each other: the first puts a Zombie
 * in each of two Rows at once, the second puts a single Zombie in a third Row much
 * later on.
 *
 * Two Zombies in one Wave is the part worth checking, because a Wave that sent one
 * Zombie and dropped the rest of its list would look right on any level that only
 * ever sends one at a time - which is every level there was until this one. Two
 * Waves, far apart, is the part that catches a schedule being sent all at once or
 * all at the first Wave's time.
 */
function aTwoWaveLevel() {
  return levelWith(
    { atStep: FIRST_WAVE, zombies: [{ name: 'basic', row: 1 }, { name: 'basic', row: 3 }] },
    { atStep: SECOND_WAVE, zombies: [{ name: 'basic', row: 0 }] },
  )
}

test('a Wave sends its Zombies in at the right of the Rows it names, on its own step', () => {
  const start = initialGameState(DEFAULT_SEED, aTwoWaveLevel())

  assert.equal(start.zombies.length, 0, 'nothing is on the lawn before the first Wave is due')

  const first = untilTick(start, FIRST_WAVE, 'the first Wave was due')
  assert.deepEqual(
    rowsOf(first.zombies),
    [1, 3],
    'the first Wave has put a Zombie in each of the two Rows it named, and nowhere else',
  )
  for (const zombie of first.zombies) {
    assert.equal(
      zombieX(zombie),
      LOGICAL_WIDTH,
      `the Zombie in Row ${zombie.row + 1} is standing at the right edge of the board`,
    )
  }

  const beforeSecond = untilTick(first, SECOND_WAVE - 1, 'the second Wave was a step away')
  assert.deepEqual(
    rowsOf(beforeSecond.zombies),
    [1, 3],
    'the second Wave is not early: it has added no Zombie of its own',
  )
  assert.ok(
    zombieX(beforeSecond.zombies[0]!) < LOGICAL_WIDTH,
    'and the first two are still walking, rather than standing where they arrived',
  )

  const second = apply(beforeSecond, { kind: 'advance' })
  assert.deepEqual(
    rowsOf(second.zombies),
    [0, 1, 3],
    'the second Wave walks in on its own step, a whole three hundred seconds after the first',
  )
  const justArrived = second.zombies.find((zombie) => zombie.row === 0)
  assert.ok(justArrived, 'its Zombie is in the Row it named')
  assert.equal(
    zombieX(justArrived),
    LOGICAL_WIDTH,
    'and is at the right edge of the board, having not yet taken a step of walking',
  )
})

/** The step the Flag Wave of the level below walks in on. */
const FLAG_WAVE = 30 * STEPS_PER_SECOND

/**
 * How far ahead of itself the game says the Flag Wave is coming, written out
 * here rather than read from the rules, so that a check can catch the number
 * being wrong.
 */
const WARNING = 10 * STEPS_PER_SECOND

/**
 * An ordinary Wave, and then the Flag Wave half a level later.
 *
 * The gap is what makes the check about the announcement rather than about a
 * Wave arriving: a Flag Wave that had already walked in could not be announced
 * before it.
 */
function aLevelEndingInAFlagWave() {
  return levelWith(
    { atStep: FIRST_WAVE, zombies: [{ name: 'basic', row: 0 }] },
    {
      atStep: FLAG_WAVE,
      flagWave: true,
      zombies: [
        { name: 'basic', row: 1 },
        { name: 'flag', row: 2 },
      ],
    },
  )
}

/** The Zombie a Wave that is not the Flag Wave sends, and how tough it is. */
const BASIC_HEALTH = 270

/**
 * The health a Zombie in the Flag Wave walks in with: seventeen peas rather than
 * fourteen.
 *
 * Written out as the number rather than worked out from the ordinary Wave's, so
 * that a check can catch a Flag Wave that is no tougher than any other - which is
 * what a Flag Wave made only of more Zombies rather than harder ones would be, and
 * would pass every check about the flag. It was 405, and one and a half health, when
 * first written; see the note on `FLAG_WAVE_TOUGHNESS` for why playing the level
 * said otherwise.
 */
const FLAG_WAVE_HEALTH = 338

test('the Flag Wave is announced before it arrives', () => {
  const start = initialGameState(DEFAULT_SEED, aLevelEndingInAFlagWave())

  const early = untilTick(start, FLAG_WAVE - WARNING - 1, 'the Flag Wave was still a long way off')
  assert.equal(
    early.flagWaveWarning,
    false,
    'with the Flag Wave a long way off, nothing has been said about it',
  )

  const announced = untilTick(start, FLAG_WAVE - WARNING, 'the announcement was due')
  assert.equal(
    announced.flagWaveWarning,
    true,
    'the Flag Wave is announced ten seconds before it walks in',
  )

  const lastMoment = untilTick(announced, FLAG_WAVE - 1, 'the Flag Wave was a step away')
  assert.equal(
    lastMoment.flagWaveWarning,
    true,
    'and is still announced on the step before it comes',
  )
  assert.equal(
    lastMoment.zombies.length,
    1,
    'with only the ordinary Wave\'s Zombie on the lawn and nothing of the Flag Wave yet',
  )

  const arrived = apply(lastMoment, { kind: 'advance' })
  assert.equal(arrived.flagWaveWarning, false, 'and the announcement stops when the Flag Wave walks in')
  assert.equal(arrived.zombies.length, 3, 'which is on the lawn - two of its own - and the announcement with it')
})

test('every Zombie in the Flag Wave is tougher than in the other Waves, and a Flag Zombie is among them', () => {
  const start = initialGameState(DEFAULT_SEED, aLevelEndingInAFlagWave())

  const ordinary = untilTick(start, FIRST_WAVE, 'the ordinary Wave was due')
  const fromTheOrdinaryWave = ordinary.zombies[0]!
  assert.equal(
    fromTheOrdinaryWave.health,
    BASIC_HEALTH,
    'a Zombie from an ordinary Wave walks in with 270 health',
  )

  const flagged = untilTick(ordinary, FLAG_WAVE, 'the Flag Wave walked in')
  // The Rows are how the two are told apart: the ordinary Wave's Zombie is still
  // walking in the Row it named, and the Flag Wave put its own two in other Rows.
  const inTheFlagWave = flagged.zombies.filter((zombie) => zombie.row !== fromTheOrdinaryWave.row)
  assert.equal(inTheFlagWave.length, 2, 'the Flag Wave has put two Zombies of its own on the lawn')

  for (const zombie of inTheFlagWave) {
    assert.equal(
      zombie.health,
      FLAG_WAVE_HEALTH,
      `the Zombie it sent into Row ${zombie.row + 1} walks in with ${FLAG_WAVE_HEALTH} health, a quarter more than an ordinary Wave's`,
    )
  }

  assert.equal(
    inTheFlagWave.filter((zombie) => zombie.name === 'flag').length,
    1,
    'and one of the two is a Flag Zombie',
  )
  assert.equal(
    inTheFlagWave.filter((zombie) => zombie.name === 'basic').length,
    1,
    'while the other is an ordinary Zombie - the flag is among them, rather than all of them being flags',
  )
})

test("the Flag Wave is the last Wave of the Level, and the only one", () => {
  // A check about the schedule rather than about a game being played, and about
  // the one Level that ships rather than about a fixture. The Flag Wave is what
  // makes the end of a level an ending, and it is a Wave's own mark rather than
  // its position in a list - so a schedule whose last Wave was not marked, or
  // which had a Flag Wave in the middle of it, is a level whose ending is in the
  // wrong place.
  const waves = LEVEL_1_1.waves
  const flagged = waves.filter((wave) => wave.flagWave === true)

  assert.equal(flagged.length, 1, 'Level 1-1 has one Flag Wave, not a schedule with none or with two')
  assert.equal(
    flagged[0],
    waves[waves.length - 1],
    'and it is the last Wave of the Level, with ordinary Waves before it and nothing after it',
  )
})

/**
 * The step the lone Zombie of a one-Wave level reaches its Row's Lawn Mower on:
 * the eight Columns to cross, and then the one step that carries it onto the
 * mower's own Square.
 *
 * Worked out from the walk rather than read from the rules, as the mower and Game
 * Over checks work theirs out, so that a change to how fast a Zombie walks is
 * caught here rather than quietly absorbed.
 */
function stepTheZombieReachesItsMower(walkedInAtStep: number): number {
  return walkedInAtStep + 8 * ZOMBIE_STEPS_PER_COLUMN + 1
}

test('a Level is won when the last Wave has come and no Zombies remain', () => {
  // A level of one Wave and one Zombie, and nothing planted anywhere. It is the
  // smallest thing that can be won, and it is won by the mower rather than by a
  // player - which is the honest way to ask the win question, because it puts the
  // win somewhere the rules can be asked about it without a Peashooter, a Sun
  // total and a Recharge in the way.
  const start = initialGameState(DEFAULT_SEED, levelWith(oneZombieIn(2, ONE_WAVE)))

  assert.equal(
    start.outcome,
    'playing',
    'with the level\'s only Wave still to come, the level is being played',
  )

  const arrived = untilTick(start, ONE_WAVE, "the level's only Wave was due")
  assert.equal(arrived.pendingWaves.length, 0, 'the last Wave has come and none are left to come')
  assert.equal(arrived.zombies.length, 1, 'and its Zombie is on the lawn')
  assert.equal(
    arrived.outcome,
    'playing',
    'so the level is not yet won, because clearing the field is what ends it and the field is not clear',
  )

  const walking = untilTick(
    arrived,
    stepTheZombieReachesItsMower(ONE_WAVE) - 1,
    'the Zombie walked to the left of the lawn',
  )
  assert.equal(walking.zombies.length, 1, 'the Zombie is still on the lawn, one step short of its mower')
  assert.equal(walking.outcome, 'playing', 'and the level is still being played')

  const won = apply(walking, { kind: 'advance' })

  assert.equal(won.zombies.length, 0, 'the mower has cleared the Row and taken the Zombie with it')
  assert.equal(
    won.outcome,
    'won',
    'so with no Zombies on the lawn and no Waves left to come, the level is won',
  )
})

test('a Zombie getting in on the same step the last Wave is gone is a loss, not a win', () => {
  // The one step where both endings could be true, and the reason a level's fate is
  // one field with three values rather than a boolean for each of them.
  //
  // A Zombie that walks off the left edge of a spent Row is *gone from the lawn* on
  // the step it does it, and a lawn with no Zombies and no Waves left to come is
  // the definition of a win - so the arithmetic of this step reaches both endings
  // at once. Two booleans would hold both and leave the rules to decide which one
  // the player is looking at; one field cannot hold the contradiction, so something
  // has to be said about which ending it is.
  //
  // It is the loss. A Level is cleared by holding the lawn, and this is the lawn
  // not being held, on the very step the schedule runs out. Nothing about the last
  // Zombie getting in is a success.
  //
  // So the level is set up with the schedule finished and the lawn emptied, and one
  // Zombie still on it: two Zombies are mown by their own Rows' mowers, and a third
  // is sent into the first of those Rows *after* its mower has gone, so that it is
  // on the left edge of the board at the moment there is nothing left to play.
  const firstMownAt = stepTheZombieReachesItsMower(ONE_WAVE)
  const secondMownAt = firstMownAt + 1
  const lastWalksIn = firstMownAt + 2
  const breachesAt = lastWalksIn + 9 * ZOMBIE_STEPS_PER_COLUMN + 1

  const level = levelWith(
    oneZombieIn(ROW, ONE_WAVE),
    oneZombieIn(ROW + 1, ONE_WAVE + 1),
    oneZombieIn(ROW, lastWalksIn),
  )
  const start = initialGameState(DEFAULT_SEED, level)

  // Played in two goes rather than one, because a Zombie needs over eighty seconds
  // to walk a Row, spend its mower and walk off the board, and the helper gives up
  // rather than run for ever.
  const cleared = untilTick(start, secondMownAt, 'both mowers had run')
  assert.equal(cleared.zombies.length, 0, 'and the lawn is empty')
  assert.equal(cleared.pendingWaves.length, 1, 'with the last Wave of the level still to come')

  const oneLeft = untilTick(cleared, lastWalksIn, 'the last Zombie of the level walked in')
  assert.equal(oneLeft.zombies.length, 1, 'so the last Zombie is on the lawn')
  assert.equal(oneLeft.pendingWaves.length, 0, 'and there is nothing left to play')

  const onTheLine = untilTick(oneLeft, breachesAt - 1, 'the last Zombie reached the left of the board')
  assert.equal(
    onTheLine.outcome,
    'playing',
    'the level is still being played with one step left of it, and one Zombie on the lawn',
  )

  const lost = apply(onTheLine, { kind: 'advance' })

  assert.equal(lost.zombies.length, 0, 'the Zombie that got in is off the lawn')
  assert.equal(lost.pendingWaves.length, 0, 'and the schedule has run out, so the two endings do meet here')
  assert.equal(
    lost.outcome,
    'lost',
    'yet the level is lost and not won: a Zombie got in, and that is the ending',
  )
})

test('a won Level stops, as a lost one does', () => {
  // The other half of the win, and the half that is easy to leave out. A level
  // that has been won and a level that has been lost are both finished, and a
  // board that carried on after a win would be a lawn still being defended with
  // nothing left to defend - so the guard that stops a loss is asked to stop a win
  // too, rather than there being a guard for each.
  const won = untilTick(
    initialGameState(DEFAULT_SEED, levelWith(oneZombieIn(ROW, ONE_WAVE))),
    stepTheZombieReachesItsMower(ONE_WAVE),
    'the Zombie reached its mower, the Row was cleared and the level was won',
  )
  assert.equal(won.pendingWaves.length, 0, "the level's only Wave has come and none are left")
  assert.equal(won.outcome, 'won', 'so with the lawn clear the level is won')

  const planted = apply(apply(won, { kind: 'choose', choice: 'peashooter' }), {
    kind: 'place',
    square: { row: 0, column: 2 },
  })
  assert.deepEqual(planted, won, 'and a won level cannot be planted on')

  const after = apply(won, { kind: 'advance' })
  assert.equal(after.tick, won.tick, 'the clock does not move')
  assert.deepEqual(after, won, 'and a step of a level that has been won changes nothing at all')
})

test('a player who does nothing at all loses Level 1-1', () => {
  // Found by playing the level at ticket 07, and the reason this ticket had to fix
  // the schedule rather than only add a win to it. As it stood, Level 1-1 sent two
  // Zombies into one Row twenty-five seconds apart; the mower ran on the first and
  // cleared both, because a mower clears its whole Row; nothing was ever sent to
  // that Row again, and the other Rows got one Zombie each. So no Row was ever
  // breached twice, and a player who planted nothing played for ever against a lawn
  // that emptied and stayed empty.
  //
  // It is about the Level that ships rather than about a fixture, because a level
  // a player cannot lose is a level whose danger is not real. And it asks only that
  // the level can be lost - not that it is lost quickly, and not that it is a fair
  // fight, which is a judgement about numbers and belongs to whoever plays it.
  const lost = untilTheLevelEnds(
    initialGameState(DEFAULT_SEED, LEVEL_1_1),
    'a player who planted nothing was never in any danger',
  )

  assert.equal(lost.outcome, 'lost', 'doing nothing at all loses Level 1-1')
  assert.equal(
    lost.zombies.length,
    0,
    'with the Zombie that got in gone from the lawn, as a breach always is',
  )
})

/**
 * Where a defending player puts their Peashooters: the first Column to the right of
 * the mowers.
 *
 * The back of the lawn rather than the front, and not out of caution. A Peashooter
 * kills a Flag Wave Zombie in about thirty seconds of shooting and a Zombie spends
 * about forty-two walking the whole board, so a plant at the back has time to
 * finish one off - while the same plant a few Columns further forward is reached
 * before it can, and is eaten. Where a player puts their plants is the single
 * biggest thing about whether they win, so a check that plays the level has to
 * plant them where a player would.
 */
const DEFENCE_COLUMN = 1

/**
 * The middle Row, and the first Row of a lawn to be worth a Peashooter.
 *
 * A guess, like any other opening move: with nothing walking on the lawn there is
 * nothing to react to, and the middle of the lawn is where Zombies come from. It is
 * here rather than buried in the check because it is a decision about playing, not
 * about the level.
 */
const MIDDLE_ROW = 2

/**
 * Plays a level the way a player who has read the rules would: collect every piece
 * of Sun, and put a Peashooter at the back of the Row that most needs one as soon
 * as there is Sun for it.
 *
 * The Row that most needs one is the Row of the Zombie nearest the left of the lawn
 * among Rows with no Peashooter in them; and with nothing walking, the middle of the
 * lawn. It plants in the first Column to the right of the mowers and never moves a
 * plant, which is the plan a first-time player uses: everything in one place,
 * shooting right.
 *
 * It is not a good player and is not meant to be. It does not look at which Rows
 * are about to be attacked, it does not save for anything, and it plants in Rows
 * that are never attacked at all. It is the *obvious* plan, and the point of playing
 * the shipped schedule this way is that a schedule which only a player who already
 * knows the level can finish is not a schedule anyone can check.
 */
function playingDefensively(start: GameState): GameState {
  let state = start

  for (let step = 0; step < 20 * 60 * STEPS_PER_SECOND; step++) {
    if (state.outcome !== 'playing') {
      return state
    }
    state = takeEverySunOnTheLawn(state)
    const row = rowMostInNeedOfAPlant(state)
    if (row !== null) {
      state = plantInTheBackOf(state, { row, column: DEFENCE_COLUMN })
    }
    state = apply(state, { kind: 'advance' })
  }

  assert.fail('the level did not end in twenty minutes of a player planting Peashooters')
}

/** The Row of the Zombie nearest the left of the lawn, among Rows with no Peashooter. */
function rowMostInNeedOfAPlant(state: GameState): Row | null {
  let mostUrgent: Row | null = null
  let nearest = Number.POSITIVE_INFINITY

  for (const zombie of state.zombies) {
    if (!isBareAtTheBack(state, zombie.row) || zombieX(zombie) >= nearest) {
      continue
    }
    nearest = zombieX(zombie)
    mostUrgent = zombie.row
  }

  if (mostUrgent !== null) {
    return mostUrgent
  }
  if (isBareAtTheBack(state, MIDDLE_ROW)) {
    return MIDDLE_ROW
  }
  for (let row = 0; row < BOARD_ROWS; row++) {
    if (isBareAtTheBack(state, row)) {
      return row
    }
  }
  return null
}

function isBareAtTheBack(state: GameState, row: Row): boolean {
  return occupantAt(state.occupants, { row, column: DEFENCE_COLUMN }) === null
}

/**
 * Collects every piece of Sun lying on the lawn.
 *
 * Sun that is not collected is not spent, and a player who does not click the Sun
 * does not plant anything - so a check that plays a level has to click it, or it is
 * playing a game where the player never acts at all and is only ever testing what
 * happens to somebody who loses every exchange.
 */
function takeEverySunOnTheLawn(state: GameState): GameState {
  let current = state
  for (const token of state.tokens) {
    current = apply(current, { kind: 'collect', point: { x: token.x, y: token.y } })
  }
  return current
}

/** A Peashooter in that Square, if there is room for one and Sun to pay for it. */
function plantInTheBackOf(state: GameState, square: Square): GameState {
  if (occupantAt(state.occupants, square) !== null || state.sun < PEA_COST) {
    return state
  }
  const packet = state.seedBank.find((candidate) => candidate.name === 'peashooter')
  if (packet === undefined || packet.stepsUntilReady > 0) {
    return state
  }

  return apply(apply(state, { kind: 'choose', choice: 'peashooter' }), { kind: 'place', square })
}

test('Level 1-1 can be played from its first Zombie through to a win', () => {
  // The other half of "a player has to be able to lose it", and the half that was
  // missing before: a level that can be lost is not the same as a level that can
  // be finished. It is about the schedule that ships, played with the obvious plan,
  // because a schedule that only a player who knows the level can win is not a
  // schedule anyone can check.
  const won = playingDefensively(initialGameState(DEFAULT_SEED, LEVEL_1_1))

  assert.equal(won.pendingWaves.length, 0, "the level's last Wave has been sent")
  assert.equal(won.zombies.length, 0, 'and the lawn is clear of Zombies')
  assert.equal(
    won.outcome,
    'won',
    'so a player who plants a Peashooter in every Row wins Level 1-1',
  )
})
