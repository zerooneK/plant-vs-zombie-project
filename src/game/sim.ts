import {
  occupantAt,
  plantIn,
  startingOccupants,
  type Occupant,
  type Point,
  type Row,
  type Square,
} from './board.ts'
import { collectSun, stepSun, type SunToken } from './sun.ts'
import { seededRandom, type Random } from './random.ts'
import { FIRST_SUN_DELAY, FLAG_WAVE_WARNING, STARTING_SUN } from './balance.ts'
import {
  PLANTS,
  createPlanted,
  producePlantSun,
  resolveContactPlantActions,
  resolveInstantPlantActions,
  type PlantName,
} from './plants.ts'
import { LEVEL_1_1, waveZombies, type Level, type Wave } from './levels.ts'
import { walkAndEat, type Zombie } from './zombies.ts'
import { runMowers } from './mowers.ts'
import { resolveCombat, type Shot } from './shots.ts'

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
  readonly stepsUntilSkySun: number
  /** The name the next piece of Sun will be given. */
  readonly nextSunId: number
  /** The Seed Bank: the plants this level allows, and each one's Recharge. */
  readonly seedBank: readonly SeedPacket[]
  /** Everything standing on the lawn: the plants, and the Lawn Mowers. */
  readonly occupants: readonly Occupant[]
  /** The Rows that have spent their Lawn Mower, in sorted order. */
  readonly spentMowers: readonly Row[]
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
  /**
   * How the level has ended, or that it has not.
   *
   * A fact about the level rather than about any one thing on the lawn, which is
   * why it is here and not worked out from the Zombies each step: a level is over
   * for good, and a thing that can be un-over is not the end of anything.
   *
   * `playing` on a fresh lawn, and a check that wants an ended level has to end
   * one.
   */
  readonly outcome: Outcome
  /**
   * Whether the game has said that the Flag Wave is coming.
   *
   * Held in the state rather than worked out by the interface, because how far
   * ahead of itself the Flag Wave is announced is a rule about the level's
   * schedule and a number in `balance.ts` - not a matter of how much the
   * interface feels like saying. The interface is told whether it is on or not,
   * in the same way it is told whether the level has been lost.
   */
  readonly flagWaveWarning: boolean
}

/**
 * The three things that can be true of a level: it is being played, it has been
 * won, or it has been lost.
 *
 * One field rather than a boolean for each ending, because the two endings are
 * not independent and the arithmetic of a single step can reach both at once: a
 * Zombie that gets in is gone from the lawn, and a lawn with no Zombies left and
 * no Waves still to come is the definition of a win. Two booleans would let a
 * level be won and lost on the same step and leave the rules to decide which of
 * the two a player is looking at; one field with three values cannot hold that
 * state, because there is nowhere in it to put the contradiction.
 *
 * Which ending it is, is `advance`'s to say, from the same step that caused it.
 */
export type Outcome = 'playing' | 'won' | 'lost'

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
    stepsUntilSkySun: FIRST_SUN_DELAY,
    nextSunId: 1,
    seedBank: level.plants.map((name) => ({
      name,
      cost: PLANTS[name].sunCost,
      stepsUntilReady: 0,
    })),
    occupants: startingOccupants(),
    spentMowers: [],
    chosen: null,
    zombies: [],
    pendingWaves: level.waves,
    nextZombieId: 1,
    shots: [],
    nextShotId: 1,
    outcome: 'playing',
    flagWaveWarning: isFlagWaveComing(level.waves, 0),
  }
}

export function apply(state: GameState, command: Command): GameState {
  // A level that is over is not a level that is played, and that is true of every
  // command there is, `advance` included.
  //
  // Refusing the tick as well as the plants is what stops the level rather than
  // slowing it: nothing moves, no more Sun falls, no Recharge runs down, and the
  // state a player is left looking at is the state the level ended on. Letting
  // `advance` through would leave an ended level quietly going on with no one
  // playing it - the Zombies still walking, Sun still landing - which is a worse
  // thing to show a player than a stopped board.
  //
  // Won and lost are refused the same way and for the same reason. A level that
  // has been won is as finished as one that has been lost, and a won board that
  // kept going would be a lawn still being defended with nothing left to defend.
  //
  // Playing again is a fresh game rather than an un-freezing of this one, because
  // there is nothing to go back to: a level that has ended ended on the lawn as it
  // stands.
  if (state.outcome !== 'playing') {
    return { ...state }
  }

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
    // A plant is planted whole, initialized via the Plant module factory so
    // countdown invariants (firing, producing, arming, chewing) remain encapsulated.
    occupants: [
      ...state.occupants,
      createPlanted(name, square),
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
  const result = collectSun(state.tokens, point)

  if (result.collected === 0) {
    return { ...state }
  }

  return {
    ...state,
    sun: state.sun + result.collected,
    tokens: result.tokens,
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

  // The Flag Wave is announced before it arrives, and the announcement stops when
  // it does. Asked of the Waves still to come, so that the Wave walking in this
  // step is not announced on top of itself: the Flag Wave's announcement and the
  // Flag Wave are the same event seen from two steps apart, and a banner that
  // outlived the thing it was announcing would be the game's last act on screen.
  //
  // A consequence of asking it this way is that a Level whose Flag Wave fell
  // inside the first ten seconds of play could not announce it, because by the
  // first step the Wave is already walking in. That is a property of a schedule
  // rather than a gap in the rule, and the answer to it is to move the Wave later.
  const flagWaveWarning = isFlagWaveComing(sent.pendingWaves, tick)

  // A Zombie walks on the step after it arrives, so it spends one step standing
  // at the right edge of the board. Which is the place Zombies come in, so a
  // Zombie is briefly seen arriving rather than always already having taken a
  // step.
  //
  // Instant plant actions (e.g. Cherry Bomb detonating) occur before Zombies move.
  // A bomb put down in front of an approaching Zombie kills it before it can bite;
  // asking it after the Zombies walked would be saving a Row one bite too late.
  const instant = resolveInstantPlantActions(state.zombies, state.occupants)

  // A Zombie with a plant in the Square it is standing in stops there and eats,
  // which is why this is the one Zombie's step that hands the lawn back as well:
  // a plant it ate this step is not standing there any more, and the plants that
  // fire below have to be the ones that are still there.
  //
  // A Zombie reaching the left edge of a Row sets off that Row's Lawn Mower, and
  // the mower takes the whole Row off the lawn. It comes after the Zombies walk,
  // because a mower is set off by a Zombie arriving at it rather than by the clock,
  // and before the peas land, because a Peashooter has nothing left to shoot at in
  // a Row the mower has just cleared - a pea whose Zombie was mown carries on
  // across the lawn and goes, as it does for any other Zombie that stops being
  // there.
  const eating = walkAndEat(instant.zombies, instant.occupants)
  const mown = runMowers(eating.zombies, eating.occupants, state.spentMowers)

  // Contact plant actions (armed Potato Mines detonating upon arrival, and ready
  // Chompers devouring reached Zombies) resolve after Zombies have walked and
  // mowers have run, clearing reachable enemies and advancing countdowns.
  const contact = resolveContactPlantActions(mown.zombies, mown.occupants)

  // A Zombie that walked off the left edge of the board has got in, and the level
  // is lost there and then. It is read off the Zombies' own step rather than found
  // again here, because the question "did a Zombie get in?" and the question "did
  // a Zombie arrive at a mower?" are the same walk seen from two places: a Row
  // with a mower is answered by the mower and a Row without one by this.
  const breached = eating.breached.size > 0

  // Combat: in-flight peas advance and deal damage, exhausted casualties leave
  // the lawn, and readied plants fire at remaining survivors ahead of them.
  const combat = resolveCombat({
    shots: state.shots,
    zombies: contact.zombies,
    occupants: contact.occupants,
    nextShotId: state.nextShotId,
  })

  // Won and lost are read off this one step as well, and from the same two
  // questions: what is still on the lawn, and what is still to come. Clearing the
  // field is what ends a level, so both are asked of the Zombies and the Waves
  // rather than kept as anything of their own, and both are asked *after*
  // everything else in the step has happened - a Zombie that walked off the left
  // edge is not on the lawn, and a level must never be won by the very act of
  // losing it.
  //
  // The lawn is put together once and used both for the state and for the ending,
  // so that the ending cannot be worked out from a different list of Zombies than
  // the one the player is looking at. The Wave that walked in this step is on that
  // list, which is what stops a Level being won on the step its last Wave arrives:
  // an empty lawn one step before a Zombie walks onto it is a lawn waiting, not a
  // level finished.
  //
  // A Level with no Waves at all is therefore won on its first step, which is true
  // rather than surprising - a level with nothing to send has nothing left to send,
  // and a lawn with nothing on it is clear.
  const onTheLawn = [...combat.zombies, ...sent.zombies]
  const outcome: Outcome = breached
    ? 'lost'
    : sent.pendingWaves.length === 0 && onTheLawn.length === 0
      ? 'won'
      : 'playing'


  // Sun that plants make is made last of all, on the plants still standing when
  // everything else in the step has happened. That is the whole of its rule: a
  // Sunflower makes Sun while it is on the lawn.
  const sky = stepSun(state)
  const grown = producePlantSun(combat.occupants, sky.nextSunId)

  return {
    ...state,
    tick,
    ...sky,
    tokens: [...sky.tokens, ...grown.tokens],
    nextSunId: grown.nextId,
    seedBank,
    pendingWaves: sent.pendingWaves,
    zombies: onTheLawn,
    nextZombieId: sent.nextZombieId,
    shots: combat.shots,
    nextShotId: combat.nextShotId,
    occupants: grown.occupants,
    spentMowers: mown.spentMowers,
    outcome,
    flagWaveWarning,
  }
}

/**
 * Whether the Flag Wave is close enough to have been announced.
 *
 * A question about the Waves still to come rather than about the Level's whole
 * schedule, so that a Flag Wave that has already walked in is not announced: the
 * announcement is for the Wave's approach, not for the Wave.
 */
function isFlagWaveComing(pending: readonly Wave[], tick: number): boolean {
  return pending.some(
    (wave) => wave.flagWave === true && wave.atStep - tick <= FLAG_WAVE_WARNING,
  )
}

/**
 * The Zombies a level's schedule walks in on this step, and the Waves still to
 * come.
 *
 * A Wave is spent as it is sent, so the Waves left waiting are the answer to
 * "is there anything still to come?" - which is how a Level is won, decided by
 * `advance` from the Waves left and the Zombies standing.
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
    const sent = waveZombies(wave, nextId)
    zombies.push(...sent)
    nextId += sent.length
  }

  return { pendingWaves: pending.filter((wave) => wave.atStep > tick), zombies, nextZombieId: nextId }
}
