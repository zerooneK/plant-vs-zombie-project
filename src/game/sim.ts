import { occupantAt, plantIn, startingOccupants, type Occupant, type Point, type Square } from './board.ts'
import { fallSun, isResting, isSpent, spendLife, spawnSun, sunFrom, sunUnderPoint } from './sun.ts'
import type { SunToken } from './sun.ts'
import { seededRandom, type Random } from './random.ts'
import { FIRST_SUN_DELAY, FLAG_WAVE_WARNING, STARTING_SUN, SUN_INTERVAL } from './balance.ts'
import { PLANTS, type PlantName } from './plants.ts'
import { LEVEL_1_1, waveZombies, type Level, type Wave } from './levels.ts'
import { removeExhausted, walkAndEat, type Zombie } from './zombies.ts'
import { runMowers } from './mowers.ts'
import { detonateMines } from './mines.ts'
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
  readonly stepsUntilSkySun: number
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
        // A plant that makes Sun starts a whole interval from being planted. A
        // countdown of zero would mean it makes Sun on the step it goes in, and
        // the Sun a plant makes is the slowest thing in the game - starting it
        // at the beginning of its own interval would take that away.
        stepsUntilSun: PLANTS[name].producing?.interval ?? 0,
        // A plant that arms itself starts a whole delay from being planted, and
        // for the same reason: a countdown already spent would be a mine that is
        // armed before it has been planted, and the whole of the plant is that it
        // is not ready yet. A plant that does not arm is left at zero, which is
        // "armed" and is nothing, because nothing reads it.
        stepsUntilArmed: PLANTS[name].arming?.delay ?? 0,
      },
    ],
    seedBank: startRecharge(state.seedBank, name),
  }
}

/**
 * One step of the Sun that plants make, asked of each plant on the lawn.
 *
 * It runs on the plants standing at the *end* of the step, not the ones standing
 * at the start, and that is the rule rather than a detail: a Sunflower makes Sun
 * while it is on the lawn. A Zombie that finishes eating one this step has taken
 * it off the lawn before this runs, so a plant that was due and was eaten makes
 * nothing at all — the Sun it would have made is part of what was lost, and is
 * lost the same way the Peashooter that died mid-shot is lost.
 *
 * Every plant is asked the same single question, is it due, and answers it from
 * its own countdown. A plant that makes no Sun is left exactly as it was, so
 * there is one place that knows about production and it is this one.
 */
function stepProduction(
  occupants: readonly Occupant[],
  firstId: number,
): { occupants: readonly Occupant[]; tokens: readonly SunToken[]; nextId: number } {
  let nextId = firstId
  const made: SunToken[] = []

  const stepped = occupants.map((occupant) => {
    if (occupant.kind !== 'plant') {
      return occupant
    }

    const producing = PLANTS[occupant.name].producing
    if (producing === null) {
      return occupant
    }

    if (occupant.stepsUntilSun > 1) {
      return { ...occupant, stepsUntilSun: occupant.stepsUntilSun - 1 }
    }

    made.push(sunFrom(occupant.square, nextId, producing.amount))
    nextId += 1

    return { ...occupant, stepsUntilSun: producing.interval }
  })

  return { occupants: stepped, tokens: made, nextId }
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
  const eating = walkAndEat(state.zombies, state.occupants)
  const mown = runMowers(eating.zombies, eating.occupants)

  // Mines go after the Zombies have walked and after the mowers, and for the same
  // reason the mowers do: a mine is set off by a Zombie *arriving* at it, so it can
  // only be asked once the Zombies have taken their step and are standing where they
  // have got to. A mine reached while it is still asleep is not spared the bite it
  // would get from any other plant - it is a plant in a Zombie's way, and the rule
  // for that is that the Zombie eats it.
  //
  // It comes after the mowers so that a Row a mower has just cleared holds no Zombie
  // for a mine to be spent on, and before the peas fly so that a pea aimed at a Zombie
  // a mine has just taken finds nothing and crosses the lawn and goes - which is what
  // a pea whose Zombie died any other way already does.
  const mined = detonateMines(mown.zombies, mown.occupants)

  // A Zombie that walked off the left edge of the board has got in, and the level
  // is lost there and then. It is read off the Zombies' own step rather than found
  // again here, because the question "did a Zombie get in?" and the question "did
  // a Zombie arrive at a mower?" are the same walk seen from two places: a Row
  // with a mower is answered by the mower and a Row without one by this.
  const breached = eating.breached.size > 0

  // Peas travel, and only then do plants fire. Both are one step behind their own
  // arrival for the same reason: a pea leaves a plant and starts moving on the
  // step after that, and a Peashooter shoots at the Zombies already walking rather
  // than at one still standing at the edge of the board.
  const landing = flyRight(state.shots, mined.zombies)
  // A Zombie with nothing left of it leaves before anything can shoot at it, so
  // that a Peashooter never fires at a corpse standing on the lawn. It leaves
  // after eating rather than before, so that a Zombie killed by a pea on the same
  // step it bit still got that bite in - everything a Zombie does on a step happens,
  // and then the dead are cleared.
  const standing = removeExhausted(landing.zombies)
  const fired = fireFromPlants(mined.occupants, standing, landing.shots, state.nextShotId)

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
  const onTheLawn = [...standing, ...sent.zombies]
  const outcome: Outcome = breached
    ? 'lost'
    : sent.pendingWaves.length === 0 && onTheLawn.length === 0
      ? 'won'
      : 'playing'


  // Sun that plants make is made last of all, on the plants still standing when
  // everything else in the step has happened. That is the whole of its rule: a
  // Sunflower makes Sun while it is on the lawn.
  const sky = stepSun(state)
  const grown = stepProduction(fired.occupants, sky.nextSunId)

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
    shots: fired.shots,
    nextShotId: fired.nextShotId,
    occupants: grown.occupants,
    outcome,
    flagWaveWarning,
  }
}

/** What one step of play does to the Sun on the lawn. */
interface SunStep {
  readonly random: Random
  readonly tokens: readonly SunToken[]
  readonly stepsUntilSkySun: number
  readonly nextSunId: number
}

/** One step of Sun: what is still on the lawn, and when the next piece falls. */
function stepSun(state: GameState): SunStep {
  const living = state.tokens
    .map((token) => (isResting(token) ? spendLife(token) : fallSun(token)))
    .filter((token) => !isSpent(token))

  if (state.stepsUntilSkySun > 1) {
    return {
      random: state.random,
      tokens: living,
      stepsUntilSkySun: state.stepsUntilSkySun - 1,
      nextSunId: state.nextSunId,
    }
  }

  const spawn = spawnSun(state.nextSunId, state.random)

  return {
    random: spawn.random,
    tokens: [...living, spawn.token],
    stepsUntilSkySun: SUN_INTERVAL,
    nextSunId: state.nextSunId + 1,
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
