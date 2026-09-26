import type { Square } from './board.ts'

export const STEPS_PER_SECOND = 60

export interface GameState {
  readonly tick: number
  readonly selected: Square | null
}

export type Command =
  | {
      readonly kind: 'select'
      readonly square: Square | null
    }
  | {
      readonly kind: 'advance'
    }

export function initialGameState(): GameState {
  return { tick: 0, selected: null }
}

export function apply(state: GameState, command: Command): GameState {
  switch (command.kind) {
    case 'select':
      return { ...state, selected: command.square }
    case 'advance':
      return { ...state, tick: state.tick + 1 }
  }
}
