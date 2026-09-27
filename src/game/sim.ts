import { occupantAt, plantIn, startingOccupants, type Occupant, type Point, type Square } from './board.ts'
import { fallSun, isResting, isSpent, spendLife, spawnSun, sunUnderPoint } from './sun.ts'
import type { SunToken } from './sun.ts'
import { seededRandom, type Random } from './random.ts'
import { FIRST_SUN_DELAY, STARTING_SUN, SUN_INTERVAL } from './balance.ts'
import { LEVEL_PLANTS, PLANTS, type PlantName } from './plants.ts'

/**
 * The seed used when nobody chooses one. Fixed, so that a check written
 * against the default start is the same check every time.
 */
export const DEFAULT_SEED = 101010

/**
 * The Shovel: a tool rather than a plant, which clears a plant out of a Square
 * and gives no Sun back.
 */
export const SHOVEL = 'shovel'

/**
 * What the player has chosen from the Seed Bank and is about to use on the next
 * Square.
 *
 * It is game state rather than view state for the same reason the selected
 * Square is: it decides what the next command does, so two clicks that look
 * alike on screen are not the same command.
 */
export type Choice = PlantName | typeof SHOVEL

/**
 * One Seed Packet in the Seed Bank: a plant the level allows, what it costs, and
 * how much of its Recharge is left.
 *
 * The countdown is in the state rather than worked out from the clock, so that
 * the Seed Bank and the rules can never disagree about whether a packet is
 * ready, and so that a Recharge cannot be skipped by a change of seed.
 */
export interface SeedPacket {
  readonly name: PlantName
  readonly cost: number
  /** Steps of Recharge left. Zero means the packet can be chosen. */
  readonly stepsUntilReady: number
}

export interface GameState {
  readonly tick: number
  readonly selected: Square | null
  /** The Sun the player is holding. Only collecting Sun ever adds to it. */
  readonly sun: number
  /** The Sun on the lawn right now, falling or lying. */
  readonly tokens: readonly SunToken[]
  readonly random: Random
  /** Steps until the next Sun falls from the sky. */
  readonly stepsUntilSun: number
  /** The name the next piece of Sun will be given. */
  readonly nextSunId: number
  /** The Seed Bank: the plants this level allows, and each one's Recharge. */
  readonly seedBank: readonly SeedPacket[]
  /** Everything standing on the lawn: the plants, and the Lawn Mowers. */
  readonly occupants: readonly Occupant[]
  /** The Seed Packet or Shovel chosen and waiting for a Square. */
  readonly chosen: Choice | null
}

export type Command =
  | {
      readonly kind: 'select'
      readonly square: Square | null
    }
  | {
      readonly kind: 'collect'
      readonly point: Point
    }
  | {
      readonly kind: 'choose'
      readonly choice: Choice
    }
  | {
      readonly kind: 'place'
      readonly square: Square
    }
  | {
      readonly kind: 'shovel'
      readonly square: Square
    }
  | {
      readonly kind: 'advance'
    }

export function initialGameState(seed: number = DEFAULT_SEED): GameState {
  return {
    tick: 0,
    selected: null,
    sun: STARTING_SUN,
    tokens: [],
    random: seededRandom(seed),
    stepsUntilSun: FIRST_SUN_DELAY,
    nextSunId: 1,
    seedBank: LEVEL_PLANTS.map((name) => ({
      name,
      cost: PLANTS[name].sunCost,
      stepsUntilReady: 0,
    })),
    occupants: startingOccupants(),
    chosen: null,
  }
}

export function apply(state: GameState, command: Command): GameState {
  switch (command.kind) {
    case 'select':
      return { ...state, selected: command.square }
    case 'collect':
      return collect(state, command.point)
    case 'choose':
      return choose(state, command.choice)
    case 'place':
      return place(state, command.square)
    case 'shovel':
      return shovel(state, command.square)
    case 'advance':
      return advance(state)
  }
}

/**
 * Holds a Seed Packet ready for the next Square.
 *
 * A packet that is still Recharging, and a plant this level does not allow, are
 * both choices that never happened: the game is left exactly as it was, so a
 * refused click cannot be told apart from a click that was never made.
 */
function choose(state: GameState, choice: Choice): GameState {
  if (choice === SHOVEL) {
    return { ...state, chosen: SHOVEL }
  }

  const packet = state.seedBank.find((candidate) => candidate.name === choice)

  if (packet === undefined || packet.stepsUntilReady > 0) {
    return { ...state }
  }

  return { ...state, chosen: choice }
}

/**
 * Clears a plant out of a Square with the Shovel.
 *
 * No Sun comes back, which is the whole point of the Shovel: it rescues a Row
 * from a plant planted in the wrong place, and it is not a way to move money
 * around. It clears plants and nothing else, so it cannot be used to dig up a
 * Lawn Mower and throw away a Row's last defence.
 */
function shovel(state: GameState, square: Square): GameState {
  if (state.chosen !== SHOVEL) {
    return { ...state }
  }

  const plant = plantIn(state.occupants, square)

  if (plant === undefined) {
    return { ...state }
  }

  return {
    ...state,
    chosen: null,
    occupants: state.occupants.filter((occupant) => occupant !== plant),
  }
}

/** Puts the chosen plant into a Square and pays for it. */
function place(state: GameState, square: Square): GameState {
  const name = state.chosen
  const packet =
    name === null ? undefined : state.seedBank.find((candidate) => candidate.name === name)

  if (name === null || name === SHOVEL || packet === undefined) {
    return { ...state }
  }

  // A Square holds one plant. A Square that already has one refuses the plant
  // and takes no Sun, and the packet stays chosen so the refusal costs the
  // player nothing at all - not the Sun, and not their choice.
  if (occupantAt(state.occupants, square) !== null) {
    return { ...state }
  }

  // Sun is only ever spent on a plant that is actually planted. Being short is a
  // refusal in exactly the same shape as a Square being taken, so that a
  // misclick and a broke player both keep their packet and lose nothing.
  if (state.sun < packet.cost) {
    return { ...state }
  }

  return {
    ...state,
    sun: state.sun - packet.cost,
    chosen: null,
    occupants: [...state.occupants, { kind: 'plant', square, name }],
    seedBank: startRecharge(state.seedBank, name),
  }
}

/**
 * Sets a packet's Recharge going. The packet stays in the Seed Bank throughout,
 * greyed out rather than gone, because seeing what you cannot afford yet is how
 * a player plans.
 */
function startRecharge(bank: readonly SeedPacket[], name: PlantName): readonly SeedPacket[] {
  return bank.map((packet) =>
    packet.name === name ? { ...packet, stepsUntilReady: PLANTS[name].recharge } : packet,
  )
}

function collect(state: GameState, point: Point): GameState {
  const token = sunUnderPoint(state.tokens, point)

  if (token === null) {
    return { ...state }
  }

  return {
    ...state,
    sun: state.sun + token.amount,
    tokens: state.tokens.filter((candidate) => candidate !== token),
  }
}

/**
 * One step of play. Sun that has landed spends a step of life; Sun still in the
 * air falls instead, and a Sun landing on this step does not start losing life
 * until the next one, so the whole of its life is spent on the lawn.
 */
function advance(state: GameState): GameState {
  const living = state.tokens
    .map((token) => (isResting(token) ? spendLife(token) : fallSun(token)))
    .filter((token) => !isSpent(token))

  // Recharge is spent in the same step as everything else, so a packet is ready
  // on the step its Recharge runs out and not a step later.
  const seedBank = state.seedBank.map((packet) => ({
    ...packet,
    stepsUntilReady: Math.max(0, packet.stepsUntilReady - 1),
  }))

  if (state.stepsUntilSun > 1) {
    return {
      ...state,
      tick: state.tick + 1,
      tokens: living,
      stepsUntilSun: state.stepsUntilSun - 1,
      seedBank,
    }
  }

  const spawn = spawnSun(state.nextSunId, state.random)

  return {
    ...state,
    tick: state.tick + 1,
    random: spawn.random,
    tokens: [...living, spawn.token],
    stepsUntilSun: SUN_INTERVAL,
    nextSunId: state.nextSunId + 1,
    seedBank,
  }
}
