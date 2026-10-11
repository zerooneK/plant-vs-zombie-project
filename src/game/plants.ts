import {
  BOARD_COLUMNS,
  squareAtX,
  type Occupant,
  type Planted,
  type Square,
} from './board.ts'
import { plantBeingEaten, zombieX, type Zombie } from './zombies.ts'
import { sunFrom, type SunToken } from './sun.ts'
import {
  CHERRY_BOMB_BLAST_COLUMNS,
  CHERRY_BOMB_BLAST_ROWS,
  CHERRY_BOMB_HEALTH,
  CHERRY_BOMB_RECHARGE,
  CHERRY_BOMB_SUN_COST,
  PEA_DAMAGE,
  PEASHOOTER_FIRE_INTERVAL,
  PEASHOOTER_HEALTH,
  PEASHOOTER_RECHARGE,
  PEASHOOTER_SUN_COST,
  POTATO_MINE_ARMING_DELAY,
  POTATO_MINE_HEALTH,
  POTATO_MINE_RECHARGE,
  POTATO_MINE_SUN_COST,
  CHOMPER_CHEW_STEPS,
  CHOMPER_HEALTH,
  CHOMPER_RECHARGE,
  CHOMPER_SUN_COST,
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
  | 'potato-mine'
  | 'cherry-bomb'
  | 'chomper'

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
  /** How this plant arms itself, or null for a plant that does not arm. */
  readonly arming: Arming | null
  /** What this plant does the moment it goes down, or null for a plant that does not. */
  readonly detonating: Detonating | null
  /** What this plant does when it reaches a Zombie, or null for a plant that never does. */
  readonly devouring: Devouring | null
}

/**
 * What a plant does to the Zombie it reaches, kept together for the same reason as
 * `Arming`, `Detonating`, `Shooting` and `Producing`: adding a plant that does this is
 * an edit to this, and not a new place in the rules.
 *
 * **The sixth kind of job a plant can have, and the only one described by how long it
 * afterwards cannot.** Shoot, make Sun, stand in the way, trap, go off, eat - and this
 * is the last of the six, which ADR 0010 said would be needed and declined to guess
 * at. `docs/adr/0011` is that argument.
 *
 * **One number, and it is a lockout rather than a delay, which is the whole of why this
 * could not be `Arming`.** What a plant that devours *does* is not a per-plant choice:
 * it takes the first Zombie that reaches it, removes that Zombie from the lawn, and
 * stays standing - the same answer a Potato Mine gives about the Zombie and the
 * opposite answer about the plant. So the only thing about a Chomper that is a fact
 * about *this* Chomper is how long it then spends chewing. There is nothing here about
 * when it becomes able to eat, because it is able to eat from the moment it is planted,
 * exactly as it is able to shoot the moment it is planted.
 *
 * And that is what makes it the opposite end of `Arming` rather than a smaller version
 * of it. `Arming` counts *down* to a moment: steps left before the plant can do its
 * thing, zero meaning ready. This counts *up* from a moment: steps left before it can do
 * its thing *again*, zero meaning spent. One field called `stepsUntilChewed`, holding
 * both, because a Chomper is the only plant in the game that has both readings in its
 * life and a Chomper that had two fields could have them disagree.
 */
export interface Devouring {
  /**
   * Steps after eating before this plant can eat again.
   *
   * A countdown rather than a chew time worked out from a clock, for the same reason
   * a Potato Mine's arming is one and a Peashooter's firing is one: the lawn, the Seed
   * Bank and the rules all read the same number and cannot disagree about whether the
   * plant is ready. A Chomper drawn chewing and a Chomper the rules say is chewing are
   * one fact rather than two, because they are read from one field.
   */
  readonly chew: number
}

/**
 * What a plant does the moment it is planted, kept together for the same reason as
 * `Arming`, `Shooting` and `Producing`: adding a plant that does this is an edit to
 * this, and not a new place in the rules.
 *
 * The fifth kind of job a plant can have, and the only one whose whole life is one
 * step. **Nothing about it is a choice left open per plant** - it takes the Zombies
 * standing near it off the lawn and leaves the lawn itself - so the only two things
 * about a Cherry Bomb that are facts about *this* bomb rather than about detonating
 * plants in general are how big the blast is and what it is worth.
 *
 * There is no delay in here, and the absence is the decision rather than an
 * oversight. `Arming` holds the one number that differs between arming plants,
 * which is how long they take to be ready; there is nothing equivalent here, because
 * a Cherry Bomb is not a plant that *becomes* a bomb. It is the whole of its rule
 * the moment it goes into the ground, which is what makes it a rescue rather than a
 * trap - a Potato Mine has to be planted before the Zombie arrives and a Cherry Bomb
 * is planted because the Zombie has already arrived. See `docs/adr/0010`.
 */
export interface Detonating {
  /** How many Rows above and below its own Square the blast reaches. */
  readonly rows: number
  /** How many Columns either side of its own Square the blast reaches. */
  readonly columns: number
}

/**
 * What a plant that arms itself does, kept together for the same reason as
 * `Shooting` and `Producing`: adding a plant that works like this is an edit to
 * this, and not a new place in the rules.
 *
 * One of the four kinds of job a plant can have - shoot, make Sun, stand in the way, or
 * trap - and named for the last of them.
 *
 * One number rather than four, because everything else about an arming plant is
 * what the word means. What an armed plant does is not a choice to be made per
 * plant - it takes the first Zombie that reaches it, destroys it, and is gone -
 * so the only thing about a Potato Mine that is a fact about *this* mine rather
 * than about arming plants in general is how long it takes to get there.
 *
 * A plant that blocks a Row has no description here at all, and that is deliberate
 * rather than an oversight: a Wall-nut has nothing to add to what `health` already says,
 * and its own entry says so. Arming earns a description because a trap has a delay and a
 * delay is not derivable from anything else about the plant - so this is the shape a plant
 * gets a description *for*, rather than the shape every plant gets one.
 */
export interface Arming {
  /**
   * Steps from being planted until this plant is armed.
   *
   * A countdown and not a firing time worked out from a clock, for the same
   * reason the Seed Bank's Recharge and a Sunflower's interval are: the lawn, the
   * Seed Bank and the rules then all read the same number and cannot disagree
   * about whether the plant is ready.
   */
  readonly delay: number
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
  arming: null,
  detonating: null,
  devouring: null,
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
  arming: null,
  detonating: null,
  devouring: null,
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
  arming: null,
  detonating: null,
  devouring: null,
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
  arming: null,
  detonating: null,
  devouring: null,
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
  arming: null,
  detonating: null,
  devouring: null,
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
  arming: null,
  detonating: null,
  devouring: null,
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
  arming: null,
  detonating: null,
  devouring: null,
}

/**
 * A Potato Mine: the first plant in the game that does nothing when it is planted,
 * and the first one whose whole job is about a Zombie that arrives rather than one
 * that is standing at a distance.
 *
 * The first kind of plant the roster had no way to describe. A Peashooter shoots
 * and a Sunflower makes Sun, and `shooting: null` and `producing: null` were the
 * whole of "does neither" - but a mine does neither *temporarily*, and then does
 * something that is neither, once, and is gone. A plant whose only property is
 * which of the two it is would have had to be able to change its mind, and the
 * roster is data: nothing in it changes after it is planted. So the third kind of
 * thing is a third field, and `arming` is the name of it.
 *
 * `arming` on its own is the whole rule rather than one number out of several,
 * because what an armed mine does is not a decision left open per plant: it takes
 * the first Zombie that reaches it, destroys it, and leaves the lawn. Fifteen
 * seconds is the only number in here that is about *this* mine.
 *
 * Which is what makes the delay the plant. A mine is the one thing a player can
 * put down that is worse the later they put it down in a Row a Zombie is already
 * walking down - and the reason is right here in the data: nothing fires, and
 * nothing blows up, until the countdown is spent. A mine with no delay would be a
 * third of a Peashooter's Sun for a dead Zombie, and the delay is what that is
 * traded for.
 *
 * It is food while it waits, too, and that is not an extra rule but the one
 * already here: a mine is a plant, and a Zombie that reaches a plant stops and
 * eats it. So a Zombie that arrives before the fifteen seconds are up spends the
 * delay chewing on a lump, and the player watches their 25 Sun and their Row's
 * only trap go in three bites without anything having happened.
 */
export const POTATO_MINE: Plant = {
  name: 'potato-mine',
  sunCost: POTATO_MINE_SUN_COST,
  recharge: POTATO_MINE_RECHARGE,
  health: POTATO_MINE_HEALTH,
  shooting: null,
  producing: null,
  arming: { delay: POTATO_MINE_ARMING_DELAY },
  detonating: null,
  devouring: null,
}

/**
 * A Cherry Bomb: the first plant in the game whose whole life is one step, and the
 * first one that does not answer a Zombie arriving but a Zombie that has already
 * arrived.
 *
 * **It is not an `arming` plant, and being told that early is what makes the shape
 * obvious.** A Potato Mine's delay is the whole of it: fifteen seconds of being a
 * lump in a Zombie's way, then it is ready. There is no number here for the delay,
 * because a Cherry Bomb is not a bomb that becomes a bomb - it is the whole of its
 * rule the moment it goes into the ground, which is what makes it the opposite of a
 * trap. A mine is planted *before* the Zombie arrives and is useless if it was too
 * early; a Cherry Bomb is planted *because* the Zombie has arrived and is too late
 * for the plant to save anything. `Arming` could not hold this plant even with a
 * delay of zero, because a zero delay would leave it standing on the lawn waiting
 * for something to set it off, and there is nothing that sets it off. `docs/adr/0010`
 * has the rest of why the two are not the same shape.
 *
 * **Two numbers, and they are the whole of this plant.** How far the blast reaches,
 * and what the packet costs - every other fact about it is the same as every other
 * plant's, and the roster holds them in the same place. A Cherry Bomb that cleared
 * one Zombie would be a second Potato Mine that does not need arming, and one that
 * cleared a whole Row would be a Lawn Mower that costs 150. What makes it neither is
 * the three-by-three: enough that a player can put it *into* a bad Row and get that
 * Row back, and small enough that the four Rows either side of it are still being
 * fought over when the picture comes.
 *
 * **It is not destroyed by its own blast, and that is not an exception.** The rule
 * everywhere else in this game is that a blast takes Zombies off the lawn: a mine
 * takes the one that reached it, a mower takes the whole Row. Nothing in the game
 * removes a *plant* except a bite and the Shovel, and this plant spends itself on
 * the step it goes down rather than needing to be taken off the lawn - so there is
 * no question of whether it survives its own explosion, only of when it is spent.
 * See `resolveInstantPlantActions` below.
 */
export const CHERRY_BOMB: Plant = {
  name: 'cherry-bomb',
  sunCost: CHERRY_BOMB_SUN_COST,
  recharge: CHERRY_BOMB_RECHARGE,
  health: CHERRY_BOMB_HEALTH,
  shooting: null,
  producing: null,
  arming: null,
  detonating: { rows: CHERRY_BOMB_BLAST_ROWS, columns: CHERRY_BOMB_BLAST_COLUMNS },
  devouring: null,
}

/**
 * A Chomper: the first plant in the game that stays on the lawn after doing its
 * damage, and the first whose whole point is what it is doing *instead* of it.
 *
 * **It is not an `arming` plant, and being told that early is what makes the shape
 * obvious.** A Potato Mine's fifteen seconds is a wait before it can do anything, and
 * a Chomper's forty-two is a wait after it has already done everything. A Chomper is
 * ready the moment it is planted - it eats the first Zombie that reaches it, and the
 * next one after that, and the next - and what stops it is having just eaten. Zero
 * here means ready, exactly as zero means ready for a mine, and the number counts the
 * other way: `Arming` counts down towards a moment this plant has already passed,
 * and `Devouring` counts up from a moment it is about to reach. `docs/adr/0011` has
 * why that is a sixth description rather than a second reading of the fourth.
 *
 * **It is not a `shooting` plant either, which is the other half of why this is a
 * field of its own.** A Peashooter's shot leaves the plant and travels; a Chomper's
 * bite takes the Zombie *off the lawn*, whole, with no damage number on it - and that
 * is the same answer a Potato Mine and a Cherry Bomb both give, for the same reason. A
 * Chomper is the third plant in the game that removes a Zombie rather than damaging
 * one, and so the first one whose "damage" is not a question about whether the plant
 * was strong enough. There is nothing here for a Conehead's armour to turn out to be
 * too small for, which is the same question ticket 16 has still to answer for the
 * other two and which is left open here for the same reason.
 *
 * **And it is not a `detonating` plant, because it takes one Zombie and not an area.**
 * A Cherry Bomb clears three-by-three and leaves; a Chomper clears exactly what is
 * standing in its own Square and stays to be asked again. The two differ in every
 * direction that matters - how many Zombies, what happens to the plant afterwards, and
 * whether it can act twice - and a description holding "an area" could not tell them
 * apart without also holding a rule about what happens next.
 *
 * **The chew is the plant, and it is the reason a Chomper is a plant for the end of a
 * Row rather than one for the middle of it.** Forty-two seconds is very nearly the
 * time a Zombie spends crossing the whole lawn: a Chomper eats one Zombie and then
 * stands there unable to eat anything for as long as a Zombie takes to walk the board.
 * So a Row held by one Chomper and nothing else is a Row that can answer exactly one
 * Zombie, and the second walks straight past a plant that cannot touch it. What that
 * buys is a plant that is unbeatable in the right place - it removes a Zombie the
 * moment it arrives, in a Row that is already lost - and worthless in the wrong one.
 */
export const CHOMPER: Plant = {
  name: 'chomper',
  sunCost: CHOMPER_SUN_COST,
  recharge: CHOMPER_RECHARGE,
  health: CHOMPER_HEALTH,
  shooting: null,
  producing: null,
  arming: null,
  detonating: null,
  devouring: { chew: CHOMPER_CHEW_STEPS },
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
  'potato-mine': POTATO_MINE,
  'cherry-bomb': CHERRY_BOMB,
  chomper: CHOMPER,
}

/**
 * Creates a new planted plant instance in the specified Square.
 *
 * Encapsulates the runtime countdown initialization so caller modules never
 * need to know which plants require arming delays, produce intervals, or
 * devouring locks.
 */
export function createPlanted(name: PlantName, square: Square): Planted {
  const plant = PLANTS[name]
  return {
    kind: 'plant',
    square,
    name,
    health: plant.health,
    stepsUntilShot: 0,
    stepsUntilSun: plant.producing?.interval ?? 0,
    stepsUntilArmed: plant.arming?.delay ?? 0,
    stepsUntilChewed: 0,
  }
}

/**
 * Result of resolving plant actions against the board: updated Zombies and
 * Occupants after detonations, devouring, or arming.
 */
export interface PlantActionResult {
  readonly zombies: readonly Zombie[]
  readonly occupants: readonly Occupant[]
}

/**
 * Whether this Zombie is standing inside a blast centred on this Square.
 */
function isInTheBlast(zombie: Zombie, centre: Square, blast: Detonating): boolean {
  const square = squareAtX(zombie.row, zombieX(zombie))

  if (square === null) {
    return false
  }

  return (
    Math.abs(square.row - centre.row) <= blast.rows &&
    Math.abs(square.column - centre.column) <= blast.columns
  )
}

/**
 * Resolves instant plant actions that trigger the moment they are planted,
 * before Zombies take their step (e.g. Cherry Bomb detonating).
 */
export function resolveInstantPlantActions(
  zombies: readonly Zombie[],
  occupants: readonly Occupant[],
): PlantActionResult {
  const taken = new Set<Zombie>()
  const fired = new Set<Occupant>()

  const onTheLawn = occupants.map((occupant) => {
    if (occupant.kind !== 'plant') {
      return occupant
    }

    const blast = PLANTS[occupant.name].detonating
    if (blast === null) {
      return occupant
    }

    for (const zombie of zombies) {
      if (isInTheBlast(zombie, occupant.square, blast)) {
        taken.add(zombie)
      }
    }

    const spent = { ...occupant, stepsUntilArmed: 0, stepsUntilShot: 0 }
    fired.add(spent)

    return spent
  })

  return {
    zombies: zombies.filter((zombie) => !taken.has(zombie)),
    occupants: onTheLawn.filter((occupant) => !fired.has(occupant)),
  }
}

/**
 * Resolves post-movement contact actions: Potato Mines arming/detonating on arrival,
 * followed by Chompers devouring reachable Zombies.
 */
export function resolveContactPlantActions(
  zombies: readonly Zombie[],
  occupants: readonly Occupant[],
): PlantActionResult {
  // 1. Resolve arming plants (Potato Mine)
  const takenByMines = new Set<Zombie>()
  const firedMines = new Set<Occupant>()

  const afterMines = occupants.map((occupant) => {
    if (occupant.kind !== 'plant' || PLANTS[occupant.name].arming === null) {
      return occupant
    }

    if (occupant.stepsUntilArmed > 1) {
      return { ...occupant, stepsUntilArmed: occupant.stepsUntilArmed - 1 }
    }

    const reached = zombies.find((zombie) => plantBeingEaten(zombie, occupants) === occupant)

    if (reached === undefined) {
      return { ...occupant, stepsUntilArmed: 0 }
    }

    takenByMines.add(reached)
    const spent = { ...occupant, stepsUntilArmed: 0 }
    firedMines.add(spent)

    return spent
  })

  const remainingZombies = zombies.filter((zombie) => !takenByMines.has(zombie))
  const remainingOccupants = afterMines.filter((occupant) => !firedMines.has(occupant))

  // 2. Resolve devouring plants (Chomper)
  const takenByChompers = new Set<Zombie>()

  const afterChompers = remainingOccupants.map((occupant) => {
    if (occupant.kind !== 'plant') {
      return occupant
    }

    const devouring = PLANTS[occupant.name].devouring
    if (devouring === null) {
      return occupant
    }

    if (occupant.stepsUntilChewed > 1) {
      return { ...occupant, stepsUntilChewed: occupant.stepsUntilChewed - 1 }
    }

    const reached = remainingZombies.find((zombie) => plantBeingEaten(zombie, remainingOccupants) === occupant)

    if (reached === undefined) {
      return { ...occupant, stepsUntilChewed: 0 }
    }

    takenByChompers.add(reached)
    return { ...occupant, stepsUntilChewed: devouring.chew }
  })

  return {
    zombies: remainingZombies.filter((zombie) => !takenByChompers.has(zombie)),
    occupants: afterChompers,
  }
}

/**
 * Result of one step of plant Sun production.
 */
export interface PlantSunResult {
  readonly occupants: readonly Occupant[]
  readonly tokens: readonly SunToken[]
  readonly nextId: number
}

/**
 * Advances Sun-producing plants (e.g. Sunflower), generating Sun tokens when intervals mature.
 */
export function producePlantSun(
  occupants: readonly Occupant[],
  firstId: number,
): PlantSunResult {
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

