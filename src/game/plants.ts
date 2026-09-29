import {
  BOARD_COLUMNS,
} from './board.ts'
import {
  PEA_DAMAGE,
  PEASHOOTER_FIRE_INTERVAL,
  PEASHOOTER_HEALTH,
  PEASHOOTER_RECHARGE,
  PEASHOOTER_SUN_COST,
  PUFF_SHROOM_HEALTH,
  PUFF_SHROOM_REACH,
  PUFF_SHROOM_RECHARGE,
  PUFF_SHROOM_SUN_COST,
  REPEATER_HEALTH,
  REPEATER_RECHARGE,
  REPEATER_SUN_COST,
  SNOW_PEA_HEALTH,
  SNOW_PEA_RECHARGE,
  SNOW_PEA_SLOW_STEPS,
  SNOW_PEA_SUN_COST,
  SUNFLOWER_HEALTH,
  SUNFLOWER_PRODUCE_INTERVAL,
  SUNFLOWER_RECHARGE,
  SUNFLOWER_SUN_AMOUNT,
  SUNFLOWER_SUN_COST,
  TALL_NUT_HEALTH,
  TALL_NUT_RECHARGE,
  TALL_NUT_SUN_COST,
  WALL_NUT_HEALTH,
  WALL_NUT_RECHARGE,
  WALL_NUT_SUN_COST,
} from './balance.ts'

/**
 * The name a plant is known by in the rules and on its Seed Packet.
 *
 * A name rather than a class or a flag, because the whole roster is meant to be
 * data: the next plant is an entry here, not another branch in the rules.
 *
 * `wall-nut` and `tall-nut` are two names rather than one name with a taller
 * number attached, because they are not the same plant at two sizes: a Tall-nut
 * is placed *in front of* a Wall-nut rather than instead of one, and a player
 * holding two packets of the same thing at different prices could not tell which
 * was which. They are the same price, so the Seed Bank has to name them apart.
 */
export type PlantName =
  | 'peashooter'
  | 'snow-pea'
  | 'repeater'
  | 'puff-shroom'
  | 'sunflower'
  | 'wall-nut'
  | 'tall-nut'

/** One plant, as the Seed Bank shows it and as the rules charge for it. */
export interface Plant {
  readonly name: PlantName
  /** Sun spent the moment the plant is placed. */
  readonly sunCost: number
  /** Steps before its Seed Packet can be chosen again. */
  readonly recharge: number
  /**
   * How much health this plant is planted with, and what a bite comes off.
   *
   * The health a plant is planted with, rather than a separate number per plant
   * to remember: a plant is planted whole, and how long it lasts is a property
   * of what it is. It is also the number the drawing fades a plant by, so the
   * picture and the rules cannot disagree about how much of it is left.
   */
  readonly health: number
  /** How this plant shoots, or null for a plant that never shoots. */
  readonly shooting: Shooting | null
  /** How this plant makes Sun, or null for a plant that makes none. */
  readonly producing: Producing | null
}

/**
 * What a plant that makes Sun does, kept together for the same reason as
 * `Shooting`: adding a plant that makes Sun differently is an edit to this, and
 * not a new place in the rules.
 */
export interface Producing {
  /** Steps between one piece of Sun leaving this plant and the next. */
  readonly interval: number
  /** What the Sun it makes is worth. */
  readonly amount: number
}

/**
 * What one plant that shoots does, kept together so that adding a plant that
 * shoots differently is an edit to this and not a new place in the rules.
 */
export interface Shooting {
  /** Steps between one shot leaving and the next. */
  readonly fireInterval: number
  /**
   * How many projectiles leave the plant in one shot.
   *
   * A number rather than a flag, because two is the only thing anybody has wanted
   * and a number says so without inventing a name for the case where it is three.
   */
  readonly projectiles: number
  /**
   * What one of this plant's projectiles does.
   *
   * A shot described once, here, and carried by each projectile as it flies - so
   * that what a pea does is settled when it is fired and cannot change in flight.
   */
  readonly shot: ShotEffect
}

/**
 * What one projectile does to the Zombies it reaches.
 *
 * Four facts rather than one, because the shooter variants differ in four different
 * ways and each of them is one field here. That is the whole of what "a Snow Pea is
 * a Peashooter with one thing changed" means in the rules: the variants are not
 * branches, they are four entries in this table that differ from the plain one.
 */
export interface ShotEffect {
  /** What a projectile does to a Zombie's health. */
  readonly damage: number
  /**
   * Steps of slowness left on a Zombie this projectile reaches, or zero for none.
   *
   * On the projectile rather than looked up from the plant, so that the slow is
   * part of the shot and not a property of whoever fired it.
   */
  readonly slowSteps: number
  /**
   * Whether this projectile passes through a Zombie it reaches rather than being
   * spent on the first one.
   *
   * Kept separate from `slowSteps` even though the only plant in the game with a
   * slow also has this. They are two different questions - what a projectile does
   * to a Zombie, and what it does to the Zombies behind that one - and a Snow Pea is
   * a plant that answers both yes. Coupling them would make the second question
   * unreachable, and a plant that slowed one Zombie without passing through would
   * then need a new rule rather than a false one.
   */
  readonly passesThrough: boolean
  /**
   * How far this projectile goes, in Columns from the plant.
   *
   * A distance in Columns because that is the unit the board is counted in and the
   * unit a player counts in; a pea that is spent three Columns out is a thing you
   * can see rather than a number in a file. `WHOLE_LAWN` for a projectile nothing
   * stops short.
   */
  readonly reachIn: number
}

/**
 * As far as a projectile goes when nothing stops it short: the width of the lawn.
 *
 * A named number rather than `Infinity` in the table below, so that a reach is
 * written in Columns everywhere - including the one that means "all of them" - and
 * so that a Range is a length a designer can change rather than a special case in
 * the rules.
 */
export const WHOLE_LAWN = BOARD_COLUMNS

/**
 * The plainest shot in the game: one pea, twenty damage, no slow, stopping on the
 * first Zombie it reaches and going the length of the lawn.
 *
 * Named once and shared by every shooter, so that a variant is a *copy with one
 * thing changed* rather than four fields written out four times. That is what makes
 * the claim "each of these behaves like the Peashooter with one change" true in the
 * data rather than only in a comment: reading the three entries below, the one line
 * that differs is the whole difference.
 */
const ONE_PEA: ShotEffect = {
  damage: PEA_DAMAGE,
  slowSteps: 0,
  passesThrough: false,
  reachIn: WHOLE_LAWN,
}

/** The rhythm every shooter in the game fires at, which is the Peashooter's. */
const SHOOTER_FIRE_INTERVAL = PEASHOOTER_FIRE_INTERVAL

export const PEASHOOTER: Plant = {
  name: 'peashooter',
  sunCost: PEASHOOTER_SUN_COST,
  recharge: PEASHOOTER_RECHARGE,
  health: PEASHOOTER_HEALTH,
  shooting: { fireInterval: SHOOTER_FIRE_INTERVAL, projectiles: 1, shot: ONE_PEA },
  producing: null,
}

/**
 * A Snow Pea: the plainest shot in the game, and the slowest Zombie walking in it.
 *
 * Two fields changed from `ONE_PEA` and no third, which is what the plant is: a pea
 * that damages a Zombie *and* leaves it walking at half speed, for as long as a
 * Snow Pea and not a Peashooter is what is shooting at it.
 *
 * The slow is the whole of the plant and the damage is close to nothing. A player
 * who wants a Zombie gone plants a Repeater; a player who wants a Row to still be
 * standing in half a minute's time plants one of these, and the value of it is not
 * the twenty damage a pea takes off but the seconds the slow buys everything behind
 * it. That is also why it does less harm than a Repeater for less Sun: a plant whose
 * job is to hold a Zombie still is a worse answer to "how do I kill this" and a
 * better one to "how do I keep it away for now".
 */
export const SNOW_PEA: Plant = {
  name: 'snow-pea',
  sunCost: SNOW_PEA_SUN_COST,
  recharge: SNOW_PEA_RECHARGE,
  health: SNOW_PEA_HEALTH,
  shooting: {
    fireInterval: SHOOTER_FIRE_INTERVAL,
    projectiles: 1,
    shot: { ...ONE_PEA, slowSteps: SNOW_PEA_SLOW_STEPS, passesThrough: true },
  },
  producing: null,
}

/**
 * A Repeater: the plainest shot in the game, fired twice.
 *
 * One number changed from `ONE_PEA` and nothing else, and that is deliberately the
 * dullest possible upgrade. It is not a stronger pea, a faster one, or one that
 * reaches further - it is the same pea, in the same rhythm, twice over, which makes
 * it the one plant in the game whose difference from a Peashooter is arithmetic: a
 * Repeater is worth exactly twice the damage of a Peashooter for 200 Sun, and a
 * player can do that sum without a balance pass having any say in it.
 */
export const REPEATER: Plant = {
  name: 'repeater',
  sunCost: REPEATER_SUN_COST,
  recharge: REPEATER_RECHARGE,
  health: REPEATER_HEALTH,
  shooting: { fireInterval: SHOOTER_FIRE_INTERVAL, projectiles: 2, shot: ONE_PEA },
  producing: null,
}

/**
 * A Puff-shroom: the plainest shot in the game, and the shortest reach of any plant.
 *
 * One number changed from `ONE_PEA`, and it is the one that makes the plant: a pea
 * that is spent three Columns from where it was fired, so the plant shoots at what
 * is walking past it and at nothing further off than that.
 *
 * Free, and worth reading next to the reach. A Puff-shroom is the only plant that
 * costs nothing, and it is not free because it is cheap - it is free because there
 * is a limit on it, and the limit is the shot. What a player gets for their nothing
 * is a plant that can go anywhere on the lawn and needs no saving up for, which is a
 * different kind of answer from a Peashooter's, and the three Columns is what stops
 * it from being a strictly better one. Take the reach away and this is the best
 * plant in the game, which is why the reach is the whole of its rule.
 */
export const PUFF_SHROOM: Plant = {
  name: 'puff-shroom',
  sunCost: PUFF_SHROOM_SUN_COST,
  recharge: PUFF_SHROOM_RECHARGE,
  health: PUFF_SHROOM_HEALTH,
  shooting: { fireInterval: SHOOTER_FIRE_INTERVAL, projectiles: 1, shot: { ...ONE_PEA, reachIn: PUFF_SHROOM_REACH } },
  producing: null,
}

/**
 * A Sunflower: a plant with no attack at all, whose whole job is to make Sun.
 *
 * `shooting: null` is the whole of "no attack", and it is why adding a plant
 * that does not shoot needed no new rule: the roster already had a way to say
 * that a plant is not a weapon, and the Wall-nut will use the same one.
 */
export const SUNFLOWER: Plant = {
  name: 'sunflower',
  sunCost: SUNFLOWER_SUN_COST,
  recharge: SUNFLOWER_RECHARGE,
  health: SUNFLOWER_HEALTH,
  shooting: null,
  producing: { interval: SUNFLOWER_PRODUCE_INTERVAL, amount: SUNFLOWER_SUN_AMOUNT },
}

/**
 * A Wall-nut: a plant with no attack and an enormous amount of health, whose
 * entire job is to be in the way.
 *
 * `shooting: null` is the whole of it, and adding it needed no new rule - which
 * is what the Sunflower's note above promised, and the reason this roster is a
 * table. There was already a way to say a plant is not a weapon; a Wall-nut is
 * food with a lot of it, and the rules already know how to eat food.
 */
export const WALL_NUT: Plant = {
  name: 'wall-nut',
  sunCost: WALL_NUT_SUN_COST,
  recharge: WALL_NUT_RECHARGE,
  health: WALL_NUT_HEALTH,
  shooting: null,
  producing: null,
}

/**
 * A Tall-nut: a Wall-nut with twice the health for the same Sun.
 *
 * A second entry rather than a flag on the Wall-nut, and that is the whole of
 * what makes it a different plant. It does not behave differently - it is eaten
 * by the same rule, in the same way, at the same rate, and it makes no Sun and
 * fires nothing - it simply has more of itself to be eaten. So there is no
 * behaviour here to write, and adding one would have been a rule about a size.
 */
export const TALL_NUT: Plant = {
  name: 'tall-nut',
  sunCost: TALL_NUT_SUN_COST,
  recharge: TALL_NUT_RECHARGE,
  health: TALL_NUT_HEALTH,
  shooting: null,
  producing: null,
}

/**
 * Every plant the game knows, looked up by name.
 *
 * Keyed by the name so that the rules can go from a chosen packet to its
 * numbers in one step, and so that adding a plant is one entry rather than a
 * new place to keep in step.
 */
export const PLANTS: Readonly<Record<PlantName, Plant>> = {
  peashooter: PEASHOOTER,
  'snow-pea': SNOW_PEA,
  repeater: REPEATER,
  'puff-shroom': PUFF_SHROOM,
  sunflower: SUNFLOWER,
  'wall-nut': WALL_NUT,
  'tall-nut': TALL_NUT,
}
