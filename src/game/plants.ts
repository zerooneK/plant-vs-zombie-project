import { PEASHOOTER_RECHARGE, PEASHOOTER_SUN_COST } from './balance.ts'

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
}

export const PEASHOOTER: Plant = {
  name: 'peashooter',
  sunCost: PEASHOOTER_SUN_COST,
  recharge: PEASHOOTER_RECHARGE,
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

/**
 * The plants the level being played allows, in the order the Seed Bank shows
 * them.
 *
 * Which plants a level allows is part of that level's design, so this list
 * belongs to the Level rather than to the game. There is one level so far and
 * it allows one plant; `levels.ts` takes this over when the levels arrive.
 */
export const LEVEL_PLANTS: readonly PlantName[] = ['peashooter']
