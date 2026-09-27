import { occupantAt, plantIn, startingOccupants, type Occupant, type Point, type Square } from './board.ts'
import { fallSun, isResting, isSpent, spendLife, spawnSun, sunUnderPoint } from './sun.ts'
import type { SunToken } from './sun.ts'
import { seededRandom, type Random } from './random.ts'
import { FIRST_SUN_DELAY, STARTING_SUN, SUN_INTERVAL } from './balance.ts'
import { PLANTS, type PlantName } from './plants.ts'
import { LEVEL_1_1, type Level, type Wave } from './levels.ts'
import { removeExhausted, walkAndEat, zombieAtEdge, type Zombie } from './zombies.ts'
import { fireFromPlants, flyRight, type Shot } from './shots.ts'

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
  /** Every Zombie on the lawn, walking leftwards along their own Rows. */
  readonly zombies: readonly Zombie[]
  /** The Zombies this level has left to send in, nearest time first. */
  readonly pendingWaves: readonly Wave[]
  /** The name the next Zombie to walk in will be given. */
  readonly nextZombieId: number
  /** Every pea in flight, heading for the Zombie each one was aimed at. */
  readonly shots: readonly Shot[]
  /** The name the next pea to be fired will be given. */
  readonly nextShotId: number
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

/**
 * A game ready to play, on the given Level.
 *
 * The Level is a parameter because which plants are on offer and what walks in
 * are part of that Level's design, not of the game: `LEVEL_1_1` is the default
 * because it is the only Level there is, and a check asks for its own so that
 * it gets the Zombies it needs and no others.
 */
export function initialGameState(
  seed: number = DEFAULT_SEED,
  level: Level = LEVEL_1_1,
): GameState {
  return {
    tick: 0,
    selected: null,
    sun: STARTING_SUN,
    tokens: [],
    random: seededRandom(seed),
    stepsUntilSun: FIRST_SUN_DELAY,
    nextSunId: 1,
    seedBank: level.plants.map((name) => ({
      name,
      cost: PLANTS[name].sunCost,
      stepsUntilReady: 0,
    })),
    occupants: startingOccupants(),
    chosen: null,
    zombies: [],
    pendingWaves: level.waves,
    nextZombieId: 1,
    shots: [],
    nextShotId: 1,
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
    // A plant is planted whole, so it starts with all the health it has - and a
    // plant that shoots is ready the moment it is planted, so it fires on its
    // next step if there is something to shoot, rather than sitting out a whole
    // firing interval first.
    occupants: [
      ...state.occupants,
      {
        kind: 'plant',
        square,
        name,
        health: PLANTS[name].health,
        stepsUntilShot: 0,
      },
    ],
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
  const tick = state.tick + 1

  // Recharge is spent in the same step as everything else, so a packet is ready
  // on the step its Recharge runs out and not a step later.
  const seedBank = state.seedBank.map((packet) => ({
    ...packet,
    stepsUntilReady: Math.max(0, packet.stepsUntilReady - 1),
  }))

  // A Wave whose step has come walks its Zombies in at the right of the board,
  // and is then spent: what is left in pendingWaves is what is still to come.
  const sent = sendDueWaves(state.pendingWaves, tick, state.nextZombieId)

  // A Zombie walks on the step after it arrives, so it spends one step standing
  // at the right edge of the board. Which is the place Zombies come in, so a
  // Zombie is briefly seen arriving rather than always already having taken a
  // step.
  //
  // A Zombie with a plant in the Square it is standing in stops there and eats,
  // which is why this is the one Zombie's step that hands the lawn back as well:
  // a plant it ate this step is not standing there any more, and the plants that
  // fire below have to be the ones that are still there.
  //
  // Peas travel, and only then do plants fire. Both are one step behind their own
  // arrival for the same reason: a pea leaves a plant and starts moving on the
  // step after that, and a Peashooter shoots at the Zombies already walking rather
  // than at one still standing at the edge of the board.
  const eating = walkAndEat(state.zombies, state.occupants)
  const landing = flyRight(state.shots, eating.zombies)
  // A Zombie with nothing left of it leaves before anything can shoot at it, so
  // that a Peashooter never fires at a corpse standing on the lawn. It leaves
  // after eating rather than before, so a Zombie killed by a pea on the same step
  // it bit still got that bite in - everything a Zombie does on a step happens,
  // and then the dead are cleared.
  const standing = removeExhausted(landing.zombies)
  const fired = fireFromPlants(eating.occupants, standing, landing.shots, state.nextShotId)

  return {
    ...state,
    tick,
    ...stepSun(state),
    seedBank,
    pendingWaves: sent.pendingWaves,
    zombies: [...standing, ...sent.zombies],
    nextZombieId: sent.nextZombieId,
    shots: fired.shots,
    nextShotId: fired.nextShotId,
    occupants: fired.occupants,
  }
}

/** What one step of play does to the Sun on the lawn. */
interface SunStep {
  readonly random: Random
  readonly tokens: readonly SunToken[]
  readonly stepsUntilSun: number
  readonly nextSunId: number
}

/** One step of Sun: what is still on the lawn, and when the next piece falls. */
function stepSun(state: GameState): SunStep {
  const living = state.tokens
    .map((token) => (isResting(token) ? spendLife(token) : fallSun(token)))
    .filter((token) => !isSpent(token))

  if (state.stepsUntilSun > 1) {
    return {
      random: state.random,
      tokens: living,
      stepsUntilSun: state.stepsUntilSun - 1,
      nextSunId: state.nextSunId,
    }
  }

  const spawn = spawnSun(state.nextSunId, state.random)

  return {
    random: spawn.random,
    tokens: [...living, spawn.token],
    stepsUntilSun: SUN_INTERVAL,
    nextSunId: state.nextSunId + 1,
  }
}

/**
 * The Zombies a level's schedule walks in on this step, and the Waves still to
 * come.
 *
 * A Wave is spent as it is sent, so the Waves left waiting are the answer to
 * "is there anything still to come?" - which is the beginning of how a Level
 * will be won, and is not decided here.
 */
function sendDueWaves(
  pending: readonly Wave[],
  tick: number,
  firstId: number,
): { pendingWaves: readonly Wave[]; zombies: readonly Zombie[]; nextZombieId: number } {
  const zombies: Zombie[] = []
  let nextId = firstId

  for (const wave of pending) {
    if (wave.atStep > tick) {
      continue
    }
    for (const entry of wave.zombies) {
      zombies.push(zombieAtEdge(nextId, entry.name, entry.row))
      nextId += 1
    }
  }

  return { pendingWaves: pending.filter((wave) => wave.atStep > tick), zombies, nextZombieId: nextId }
}
