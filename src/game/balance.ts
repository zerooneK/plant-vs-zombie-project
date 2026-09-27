/**
 * Every number a designer would tune, in one place.
 *
 * A number is marked as the original's when it is held with confidence, and
 * marked as from memory when it is a guess, so that nobody trusts a value
 * more than it deserves. The first playtest is a balance pass, and these are
 * the numbers it is a balance pass over.
 */
import { STEPS_PER_SECOND } from './clock.ts'

/** The Sun a level begins with. Believed to be the original's 50. */
export const STARTING_SUN = 50

/** What one piece of Sun is worth when collected. Believed to be the original's 25. */
export const SUN_AMOUNT = 25

/**
 * How long before the first Sun of a level falls, so that a player who opens
 * the game has something to do straight away instead of staring at a lawn.
 */
export const FIRST_SUN_DELAY = 5 * STEPS_PER_SECOND

/** How often Sun falls from the sky. Believed to be roughly the original's ten seconds. */
export const SUN_INTERVAL = 10 * STEPS_PER_SECOND

/**
 * How far a falling Sun drops each step, in board units. Slow on purpose: Sun
 * is something the player has to hit with the pointer, and at four units a
 * step it travelled further in a tenth of a second than its own radius, so a
 * click aimed at Sun you could plainly see missed it. At this rate it crosses
 * the lawn in about five seconds.
 *
 * From memory, and now corrected by being played rather than by being read.
 */
export const SUN_FALL_PER_STEP = 1.5

/**
 * How long a landed Sun waits on the lawn before it is lost. From memory,
 * nearer eight seconds than this.
 *
 * A piece of Sun is therefore on the lawn for its fall plus this, which is
 * longer than the gap between drops - so two pieces can be on the lawn at
 * once, as they are in the original. They do not pile up without limit,
 * because each one is gone within about thirteen seconds.
 */
export const SUN_LIFETIME = 7 * STEPS_PER_SECOND

/**
 * Half the width of a Sun token, as it is drawn.
 */
export const SUN_RADIUS = 18

/**
 * How close a click has to be to count as clicking Sun: a little larger than
 * the Sun is drawn. A falling Sun is a moving target, and a player aiming at
 * one should not miss because it moved while the pointer was on its way, so
 * the target given is slightly kinder than the target shown.
 */
export const SUN_HIT_RADIUS = SUN_RADIUS * 1.4

/** What a Peashooter costs to plant. Believed to be the original's 100. */
export const PEASHOOTER_SUN_COST = 100

/**
 * How long the Peashooter's Seed Packet takes to Recharge before it can be
 * chosen again. Believed to be the original's seven and a half seconds, which
 * is what makes it the plant to ration: a cheap plant is also a plant you have
 * to wait for.
 *
 * Half a second is a whole number of steps at sixty a second, so the Recharge
 * ends on a step rather than somewhere between two of them.
 */
export const PEASHOOTER_RECHARGE = 7.5 * STEPS_PER_SECOND
