import assert from 'node:assert/strict'
import { STEPS_PER_SECOND } from '../src/game/clock.ts'
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
