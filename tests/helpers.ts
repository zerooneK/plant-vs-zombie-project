import assert from 'node:assert/strict'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'
import { LEVEL_1_1, type Level, type Wave } from '../src/game/levels.ts'
import { apply, type GameState } from '../src/game/sim.ts'

/**
 * What a Peashooter costs, written out here rather than read from the rules.
 *
 * The point of a check is to catch the number being wrong, so the number has to
 * be stated in the check. Reading it from `balance.ts` would pass whatever that
 * file happened to say.
 */
export const PEA_COST = 100

/**
 * Steps a Zombie takes to walk across one Column, worked out here rather than
 * read from the rules.
 *
 * The point of a check is to catch the number being wrong, so the number has to
 * be stated in the check: reading it from the rules would pass whatever the
 * rules happened to say.
 */
export const ZOMBIE_STEPS_PER_COLUMN = Math.round(4.7 * STEPS_PER_SECOND)

/**
 * A level that sends in exactly the Zombies a check needs, and nothing else.
 *
 * Zombies come in on a level's schedule, so a check that wants a particular
 * number of Zombies in a particular Row has to say so, rather than take whatever
 * the level would send next.
 */
export function levelWith(...waves: Wave[]): Level {
  return { ...LEVEL_1_1, waves }
}

/** One Basic Zombie into a Row, walking in on the given step. */
export function oneZombieIn(row: number, atStep: number): Wave {
  return { atStep, zombies: [{ name: 'basic', row }] }
}

/**
 * Plays the rules on until the game has reached that step of play, naming what it
 * is waiting for, so that a check failing inside it reports which of the game's
 * promises was not kept rather than only that four thousand steps were not
 * enough.
 */
export function untilTick(state: GameState, tick: number, whatItIsWaitingFor: string): GameState {
  let current = state
  for (let step = 0; step < 4000; step++) {
    if (current.tick >= tick) {
      return current
    }
    current = apply(current, { kind: 'advance' })
  }
  assert.fail(`the game never got there in four thousand steps: ${whatItIsWaitingFor}`)
}

/**
 * Plays the rules on until the level has ended, and hands back the state it ended
 * on.
 *
 * Which way it ended is deliberately not asked about here: a check about losing
 * must not be able to pass by having won, and a check about winning must not be
 * able to pass by having lost. Each says so itself.
 *
 * The bound is a whole level's worth of play rather than a few thousand steps,
 * because what is being waited for here is a level finishing rather than a thing
 * happening, and the schedule that decides when a level finishes is exactly the
 * thing a check like this is about.
 */
export function untilTheLevelEnds(state: GameState, whatItIsWaitingFor: string): GameState {
  let current = state
  for (let step = 0; step < 20 * 60 * STEPS_PER_SECOND; step++) {
    if (current.outcome !== 'playing') {
      return current
    }
    current = apply(current, { kind: 'advance' })
  }
  assert.fail(`the level never ended in twenty minutes of play: ${whatItIsWaitingFor}`)
}

/**
 * Plays until there is enough Sun in hand to pay for a Peashooter, collecting
 * every piece that falls on the way.
 *
 * A level begins with 50 Sun and a Peashooter costs 100, exactly as in the
 * original, so nothing can be planted until Sun has been collected. Every
 * planting check has to start from here: a check that tried to plant on 50 Sun
 * would be refused for being broke rather than for the reason it is about, and
 * would pass whether or not the rule worked.
 */
export function withSunToPlant(start: GameState): GameState {
  let state = start
  for (let step = 0; step < 2 * 60 * STEPS_PER_SECOND; step++) {
    if (state.sun >= PEA_COST) {
      return state
    }
    state = apply(state, { kind: 'advance' })
    const token = state.tokens[state.tokens.length - 1]
    if (token !== undefined) {
      state = apply(state, { kind: 'collect', point: { x: token.x, y: token.y } })
    }
  }
  assert.fail(`only ${state.sun} Sun fell in two minutes, not enough to plant a Peashooter`)
}
