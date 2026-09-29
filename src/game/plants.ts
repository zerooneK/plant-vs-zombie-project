import {
  PEA_DAMAGE,
  PEASHOOTER_FIRE_INTERVAL,
  PEASHOOTER_HEALTH,
  PEASHOOTER_RECHARGE,
  PEASHOOTER_SUN_COST,
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
export type PlantName = 'peashooter' | 'sunflower' | 'wall-nut' | 'tall-nut'

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
 * What a plant that shoots does, kept together so that adding a plant that
 * shoots differently is an edit to this and not a new place in the rules.
 */
export interface Shooting {
  /** Steps between one pea leaving and the next. */
  readonly fireInterval: number
  /** What one of its peas does to a Zombie's health. */
  readonly damage: number
}

export const PEASHOOTER: Plant = {
  name: 'peashooter',
  sunCost: PEASHOOTER_SUN_COST,
  recharge: PEASHOOTER_RECHARGE,
  health: PEASHOOTER_HEALTH,
  shooting: { fireInterval: PEASHOOTER_FIRE_INTERVAL, damage: PEA_DAMAGE },
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
  sunflower: SUNFLOWER,
  'wall-nut': WALL_NUT,
  'tall-nut': TALL_NUT,
}
