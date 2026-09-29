import assert from 'node:assert/strict'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'
import { BOARD_ROWS, occupantAt, type Row, type Square } from '../src/game/board.ts'
import { apply, type GameState } from '../src/game/sim.ts'
import { zombieX } from '../src/game/zombies.ts'

/**
 * Ways of playing a Level, written the way a person plays rather than the way the
 * rules are arranged.
 *
 * A check that wants to know whether a Level can be won has to actually play it,
 * and playing it means deciding what to do every step: which Seed Packet to choose
 * and which Square to put it in. Those decisions are the thing being measured, so
 * they live here, in one place and under one name, rather than being written out
 * again in each file that wants to play a level.
 *
 * Which is the point of the module. Two files each with their own version of "the
 * obvious plan" would drift apart by a Row here and a Column there, and then a
 * number measured by one and a number asserted by the other would be about two
 * different games. One definition, used by both.
 *
 * Nothing here is clever and none of it is a good player. These are the plans a
 * first-time player uses: everything in one place, shooting right, never moving a
 * plant once it is down. A plan that only a player who already knows the level can
 * finish is not a plan anybody can measure a Level with.
 */

/**
 * The back of the lawn: the first Column to the right of the Lawn Mowers.
 *
 * A plant here has the whole lawn in front of it, which is where a defending
 * player puts one. A Peashooter kills a Flag Wave Zombie in about twenty seconds
 * of shooting, and a Zombie spends about forty-two crossing the whole board, so a
 * Peashooter at the back has time to finish one off - while the same Peashooter a
 * few Columns further forward is reached before it can, and is eaten. Where a
 * player puts their plants is the single biggest thing about whether they win.
 */
export const DEFENCE_COLUMN = 1

/**
 * The Column in front of the defence, and where a Sunflower goes.
 *
 * One Column to the right of the Peashooters rather than behind them, because a
 * Sunflower behind a Peashooter is in the way of the one plant that is shooting.
 * In front of it, a Sunflower is a second thing a Zombie has to get through, and
 * the Peashooter is already firing by the time it reaches the Sunflower.
 */
export const ECONOMY_COLUMN = 2

/**
 * The middle Row, and the first Row of a lawn to be worth a Peashooter.
 *
 * A guess, like any other opening move: with nothing walking on the lawn there is
 * nothing to react to, and the middle of the lawn is where Zombies come from.
 */
export const MIDDLE_ROW = 2

/** Every Row of the board, from the top. */
const ROWS: readonly Row[] = Array.from({ length: BOARD_ROWS }, (_, row) => row)

/**
 * The Rows a Level's schedule sends a Zombie down at all, earliest Wave first.
 *
 * Ordered by when they are first attacked rather than by Row number, because the
 * order a Level reaches its Rows in is what decides how long a plant standing in
 * one has to earn its keep - and the first and last of them are the two ends of
 * that range, which is the comparison worth being able to make.
 */
export function attackedRows(level: { waves: readonly { atStep: number; zombies: readonly { row: Row }[] }[] }): Row[] {
  const inOrderOfArrival: Row[] = []

  for (const wave of [...level.waves].sort((first, second) => first.atStep - second.atStep)) {
    for (const zombie of wave.zombies) {
      if (!inOrderOfArrival.includes(zombie.row)) {
        inOrderOfArrival.push(zombie.row)
      }
    }
  }

  return inOrderOfArrival
}

/** The Rows a Level's schedule never sends a Zombie down. */
export function rowsNoWaveAttacks(level: { waves: readonly { zombies: readonly { row: Row }[] }[] }): Row[] {
  const attacked = new Set(level.waves.flatMap((wave) => wave.zombies.map((zombie) => zombie.row)))

  return ROWS.filter((row) => !attacked.has(row))
}

/**
 * Collects every piece of Sun lying on the lawn.
 *
 * Sun that is not collected is not spent, so a player who does not click the Sun
 * does not plant anything - so a plan that plays a level has to click it, or it is
 * playing a game where the player never acts at all and is only ever testing what
 * happens to somebody who loses every exchange.
 */
export function takeEverySunOnTheLawn(state: GameState): GameState {
  let current = state
  for (const token of state.tokens) {
    current = apply(current, { kind: 'collect', point: { x: token.x, y: token.y } })
  }
  return current
}

/** A Peashooter or a Sunflower in that Square, if there is room for one and Sun to pay. */
function plant(state: GameState, name: 'peashooter' | 'sunflower', square: Square): GameState {
  if (occupantAt(state.occupants, square) !== null) {
    return state
  }
  const packet = state.seedBank.find((candidate) => candidate.name === name)
  if (packet === undefined || packet.stepsUntilReady > 0 || state.sun < packet.cost) {
    return state
  }

  return apply(apply(state, { kind: 'choose', choice: name }), { kind: 'place', square })
}

/**
 * The Row of the Zombie nearest the left of the lawn, among Rows with nothing
 * standing in this Column.
 */
function rowMostInNeed(state: GameState, column: number): Row | null {
  let mostUrgent: Row | null = null
  let nearest = Number.POSITIVE_INFINITY

  for (const zombie of state.zombies) {
    if (occupantAt(state.occupants, { row: zombie.row, column }) !== null) {
      continue
    }
    if (zombieX(zombie) < nearest) {
      nearest = zombieX(zombie)
      mostUrgent = zombie.row
    }
  }

  return mostUrgent
}

/** The first of these Rows with nothing standing in that Column, or null. */
function firstBareRow(state: GameState, column: number, order: readonly Row[]): Row | null {
  return order.find((row) => occupantAt(state.occupants, { row, column }) === null) ?? null
}

/** What the plans below are made of, named here so both say the same thing. */
export interface Plan {
  readonly decide: (state: GameState) => GameState
}

/**
 * How long a plan is given to finish a level before the check stops waiting.
 *
 * Three minutes, which is comfortably past the Flag Wave of the longest level
 * played so far and past the point at which a losing plan has already lost. Bounded
 * rather than open, because a plan that never ends is a plan that has stopped
 * playing: the lawn goes quiet and the clock keeps going, and a check that waited
 * for an ending which will never arrive would hang rather than fail.
 */
export const THREE_MINUTES = 3 * 60 * STEPS_PER_SECOND

/**
 * Plays a plan through a level, collecting every piece of Sun on the way, and hands
 * back the lawn it ended on.
 *
 * The driver lives here beside the plans rather than in either file that uses it,
 * because two copies of this loop is two places for the two plans to disagree about
 * what playing a level *is* - and a check that measures a number is only worth the
 * number if everything else about the run is fixed. The bound and the
 * collect-then-plant order are both part of the measurement, not incidental.
 */
export function playLevel(plan: Plan, start: GameState): GameState {
  let state = start

  for (let step = 0; step < THREE_MINUTES; step++) {
    if (state.outcome !== 'playing') {
      return state
    }
    state = apply(takeEverySunOnTheLawn(plan.decide(state)), { kind: 'advance' })
  }

  // Fails rather than returning a level still being played. A level that runs out
  // of the bound without ending is a plan that has stopped playing, and handing
  // that back as if it were a result would let a check about winning pass by
  // looking at a state that never got there - or one about losing report a timeout
  // as though the plan had been beaten.
  assert.fail(`the level was still being played after ${THREE_MINUTES / STEPS_PER_SECOND / 60} minutes`)
}

/**
 * The plan that builds a defence and nothing else: a Peashooter in every Row, at
 * the back, in the Row that most needs one first.
 *
 * It is the obvious plan. It does not save for anything and it puts Peashooters in
 * Rows that are never attacked at all, and it is here as the thing an economy plan
 * is measured against - a plan that plants a Sunflower is not better than this
 * unless it is measured against a real alternative rather than against doing
 * nothing.
 */
export const DEFENCE_FIRST: Plan = {
  decide: (state) => {
    const urgent = rowMostInNeed(state, DEFENCE_COLUMN)
    const row =
      urgent ??
      firstBareRow(state, DEFENCE_COLUMN, [
        MIDDLE_ROW,
        ...ROWS.filter((candidate) => candidate !== MIDDLE_ROW),
      ])

    return row === null ? state : plant(state, 'peashooter', { row, column: DEFENCE_COLUMN })
  },
}

/**
 * The plan that builds an economy first: Sunflowers before Peashooters, in the
 * Rows a Level's schedule never sends a Zombie down.
 *
 * The Rows are chosen from the schedule rather than guessed, and that is what makes
 * this a plan rather than a habit. A Sunflower's whole value is the Sun it makes
 * over the time it is standing there, so where it goes decides whether it is worth
 * anything at all - and the only place it is safe in every Level is a Row nothing
 * ever comes down. Planting Sunflowers in an attacked Row is not a slower version
 * of this plan; it is a different and much worse one, and the checks that measure
 * both are what say so.
 *
 * Sunflowers go in one Column in front of the Peashooters rather than behind them,
 * so a Peashooter is never crowded out of the back of its own Row, and a Zombie
 * heading for a Sunflower is walking into a Peashooter that is already firing.
 *
 * `howMany` is the number of Sunflowers to build before switching to Peashooters.
 * A plan that planted them without limit would not be an economy-first plan but a
 * refusal to defend, and the checks that ask what happens when a player over-invests
 * pass a number rather than leaving it out.
 */
export function economyFirst(howMany: number, safeRows: readonly Row[]): Plan {
  return {
    decide: (state) => {
      const urgent = rowMostInNeed(state, ECONOMY_COLUMN)
      if (urgent !== null) {
        return plant(state, 'peashooter', { row: urgent, column: ECONOMY_COLUMN })
      }

      const alreadyBuilt = ROWS.filter((row) => {
        const standing = occupantAt(state.occupants, { row, column: ECONOMY_COLUMN })

        return standing !== null && standing.kind === 'plant' && standing.name === 'sunflower'
      }).length
      if (alreadyBuilt < howMany) {
        const free = firstBareRow(state, ECONOMY_COLUMN, safeRows)
        if (free !== null) {
          return plant(state, 'sunflower', { row: free, column: ECONOMY_COLUMN })
        }
      }

      // Past `howMany` Sunflowers the plan is a defence plan, and it defends every
      // Row rather than only the safe ones - so the order it falls back through is
      // every Row, not the safe ones again. Asking for more Sunflowers than there
      // are safe Rows to put them in therefore buys exactly `howMany` and no more,
      // rather than quietly filling the whole back of the lawn with them.
      const row = firstBareRow(state, ECONOMY_COLUMN, ROWS)
      return row === null ? state : plant(state, 'peashooter', { row, column: ECONOMY_COLUMN })
    },
  }
}
