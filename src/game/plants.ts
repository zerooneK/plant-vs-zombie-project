import {
  PEA_DAMAGE,
  PEASHOOTER_FIRE_INTERVAL,
  PEASHOOTER_HEALTH,
  PEASHOOTER_RECHARGE,
  PEASHOOTER_SUN_COST,
} from './balance.ts'

/**
 * The name a plant is known by in the rules and on its Seed Packet.
 *
 * A name rather than a class or a flag, because the whole roster is meant to be
 * data: the next plant is an entry here, not another branch in the rules.
 */
export type PlantName = 'peashooter'

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
}
