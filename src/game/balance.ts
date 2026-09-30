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
 * What a Sunflower costs to plant. Believed to be the original's 50, which is
 * exactly what a level begins with. That is not a coincidence to be tuned away:
 * it means the first decision of a level is whether to plant one of these
 * straight away or to save for a Peashooter, and that decision is the economy
 * arriving before anything else does.
 */
export const SUNFLOWER_SUN_COST = 50

/**
 * How long between one Sun a Sunflower makes and the next. Believed to be the
 * original's twenty-four and a quarter seconds, which is a whole number of
 * steps at sixty a second, so the first Sun a planted Sunflower makes lands on
 * a step rather than somewhere between two of them.
 *
 * Twenty-five Sun every twenty-four seconds is a slower rate than the sky's
 * twenty-five every ten, so one Sunflower is a *worse* deal than doing nothing
 * and waiting. It pays because you plant several and they run at once, and
 * seeing that is the game.
 *
 * Confirmed at ticket 11 by playing rather than by reading, and confirmed for a
 * sharper reason than the one above. Two pieces pay a Sunflower back at 48.5
 * seconds, and a Zombie crosses the whole lawn in 42.3 - **the payback time is
 * longer than the lawn is wide**. So what a Sunflower earns is decided by how long
 * before a Zombie reaches it, not by which Row it is in: measured across Level 1-1,
 * the Row the first Wave reaches at twenty-five seconds breaks even exactly and the
 * Rows reached later all come out ahead. The interval is not a rate to be tuned but
 * the thing that makes timing a decision, and shortening it would take that away.
 */
export const SUNFLOWER_PRODUCE_INTERVAL = 24.25 * STEPS_PER_SECOND

/**
 * What one piece of Sun a Sunflower makes is worth. Believed to be the
 * original's 25, the same as Sun from the sky.
 *
 * The same number as the sky's, held separately anyway. Sun from the sky and Sun
 * a plant makes are the same resource and are deliberately not two resources, but
 * they are not the same *source*, and a change to what a falling piece is worth
 * should not silently change what a Sunflower is worth.
 */
export const SUNFLOWER_SUN_AMOUNT = 25

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

/**
 * Steps a Zombie takes to walk across one Column. From memory, about 4.7
 * seconds, which is most of the time a player has to notice one coming and do
 * something about it.
 *
 * Rounded to a whole step, because 4.7 seconds is not one at sixty a second. A
 * Zombie a fraction of a step out of place is nothing anyone could see, whereas
 * a Recharge or a Wave that ends between two steps is.
 */
export const ZOMBIE_STEPS_PER_COLUMN = Math.round(4.7 * STEPS_PER_SECOND)

/**
 * Steps between one pea leaving a Peashooter and the next. From memory, about
 * 1.4 seconds, which is slow enough that one Peashooter is worth planting and
 * fast enough that a Row held by one is not simply overrun.
 */
export const PEASHOOTER_FIRE_INTERVAL = Math.round(1.4 * STEPS_PER_SECOND)

/**
 * Steps a pea takes to cross one Column. From memory, about a third of a second,
 * so a pea is a thing you watch rather than a thing you miss.
 */
export const SHOT_STEPS_PER_COLUMN = Math.round(0.3 * STEPS_PER_SECOND)

/** What one pea does to a Zombie. From memory, 20. */
export const PEA_DAMAGE = 20

/**
 * How much health a Basic Zombie has. From memory, 270, which is the number
 * that makes a lone Peashooter a real answer rather than a fast one: thirteen
 * peas to fell one, and thirteen peas is about twenty seconds of standing and
 * firing while the Zombie spends thirty-five of them walking.
 */
export const BASIC_ZOMBIE_HEALTH = 270

/**
 * How much health a Peashooter is planted with. From memory, 300, which is three
 * bites.
 *
 * A plant is food rather than scenery, and this is the number that says how
 * long it is food for. Three bites is the reason a Peashooter is not also a
 * wall: standing in front of a Zombie is not a plan, and the original's answer is
 * that you shoot from behind something that buys time.
 */
export const PEASHOOTER_HEALTH = 300

/**
 * How much health a Sunflower is planted with. Believed to be the original's
 * 300 — the same as a Peashooter's, and deliberately so.
 *
 * The spec asks for a Sunflower that is cheap and weak, and it is tempting to
 * read "weak" as a smaller number than a Peashooter's. It is not what makes a
 * Sunflower weak. Nothing about 50 Sun of investment and a Sun not yet made
 * survives a Zombie arriving, and that is the punishment: losing one costs a
 * plant and the Sun it would have made, which is the whole reason to plant
 * them where nothing can reach. A Sunflower's weakness is what it cost, not how
 * fast it dies, and a smaller number would only make it a worse plant without
 * making it a more interesting decision.
 *
 * Settled by playing in ticket 11, and it did not move - but the pass found the
 * number is load-bearing in a way the note above did not say. Health does not
 * change what a Sunflower is worth: it earns no Sun, so making it tougher changes
 * nothing about its value and nothing about its payback either, since a Sunflower
 * in an attacked Row is eaten either side of its second piece. All 300 buys is
 * the two seconds between three bites. A Wall-nut buys forty and a Tall-nut
 * eighty, and that range is the whole difference between a plant that is barely in
 * the way and one that decides a Row.
 */
export const SUNFLOWER_HEALTH = 300

/**
 * How long the Sunflower's Seed Packet takes to Recharge before it can be
 * chosen again. Believed to be the original's seven and a half seconds, the
 * same as the Peashooter's.
 *
 * The same as a Peashooter on purpose. A Sunflower's Sun is worth a quarter of
 * what a Peashooter's is, so a Recharge shared with the Peashooter is what stops
 * a bank of Sunflowers being a thing you can spend every step on — which is
 * where the interesting decision is: the more Sun you have already made, the
 * more you want another, and the less often you can have one.
 */
export const SUNFLOWER_RECHARGE = 7.5 * STEPS_PER_SECOND

/**
 * The three shooter variants: what they cost, and the two numbers that are their
 * own rather than the Peashooter's.
 *
 * Every number in this block is from memory and **none of it has been played**.
 * That is a real difference from everything above, and it is the reason the
 * comments here are shorter than the ones they sit among. The Sunflower's numbers
 * were confirmed at ticket 11 by playing Level 1-1 and watching what the plant did
 * in it; these three have never been in a Level a player can play, because the only
 * Level that offers them is the test bed, and a test bed is somewhere to look at a
 * plant rather than somewhere to balance one. So a Snow Pea at 175 and a Repeater
 * at 200 are the original's numbers as best they are remembered, and nothing has yet
 * asked whether they are *these* numbers.
 *
 * That is not a reason to guess better. It is a reason to know which numbers are
 * load-bearing before a Level offers any of them, and the honest place to find out
 * is a balance pass on a Level that sells these plants - which is a later ticket,
 * because the only Level there is offers a Peashooter and a Sunflower, and adding
 * a packet to it would change what that Level asks of a player.
 */

/** What a Snow Pea costs to plant. Believed to be the original's 175. */
export const SNOW_PEA_SUN_COST = 175

/**
 * How long a Snow Pea's shot leaves a Zombie slowed for, and how much slower it
 * walks while it lasts. Both from memory: the original's is about ten seconds, and
 * the slowed Zombie walks at half speed.
 *
 * Half rather than some other fraction because a fraction that is not a half cannot
 * be counted in whole steps. A Zombie is a tally of steps walked, and a slow that
 * made it walk four fifths of a step would either drift or need a step it did not
 * take; half is the only slowdown that is exact in whole and half steps together,
 * which is what keeps a slowed Zombie's place on the lawn identical on a fast
 * machine and a slow one.
 */
export const SNOW_PEA_SLOW_STEPS = 10 * STEPS_PER_SECOND
export const SLOWED_WALK_FRACTION = 0.5

/** What a Repeater costs to plant. Believed to be the original's 200. */
export const REPEATER_SUN_COST = 200

/**
 * What a Puff-shroom costs to plant. Believed to be the original's nothing at all.
 *
 * The only plant in the game that is free, and the reason that is a decision rather
 * than an oversight is the reach it buys: a plant that costs nothing and shoots as
 * far as a Peashooter would be strictly better than every other plant in the game,
 * since a player could fill every Square of every Row with them and never be short
 * of anything. Being free is only interesting against a limit.
 */
export const PUFF_SHROOM_SUN_COST = 0

/**
 * How far a Puff-shroom's shot goes, in Columns from the plant. Believed to be the
 * original's three, and the least certain of this plant's numbers along with its reach
 * being a Columns figure at all rather than something read off the original.
 *
 * Short enough to be a plant for what is walking in front of it rather than one for
 * the whole Row, which is the limit that makes it free. A Zombie has to be within
 * three Columns of the puff to be hit by it, and a Zombie on the far side of the
 * lawn is a thing a Peashooter answers and this does not.
 */
export const PUFF_SHROOM_REACH = 3

/**
 * How much health each of the three variants is planted with, and how long their
 * Seed Packets take to Recharge.
 *
 * The Peashooter's own numbers rather than copies of them, because the original's
 * four shooters are all 300 health and all Recharge in seven and a half seconds, as
 * best they are remembered, and there is no reading in which a Snow Pea is a tougher
 * or a quicker plant than the Peashooter beside it. Marked as remembered rather than
 * asserted, because nothing in this project can support it: the original's plant
 * statistics are not in here to be read, and a number written down without its marker
 * reads as a number somebody checked. One name for each, so that a check can say what a
 * Puff-shroom costs without the number being written out twice and able to drift -
 * which is the same reason the Tall-nut's cost is the Wall-nut's.
 *
 * The consequence worth knowing: what separates these three from a Peashooter is
 * *only* what they do differently, and none of it is that they are sturdier or
 * faster to get back. A Snow Pea standing where a Peashooter would be standing is
 * eaten in exactly three bites.
 */
export const SNOW_PEA_HEALTH = PEASHOOTER_HEALTH
export const SNOW_PEA_RECHARGE = PEASHOOTER_RECHARGE
export const REPEATER_HEALTH = PEASHOOTER_HEALTH
export const REPEATER_RECHARGE = PEASHOOTER_RECHARGE
export const PUFF_SHROOM_HEALTH = PEASHOOTER_HEALTH
export const PUFF_SHROOM_RECHARGE = PEASHOOTER_RECHARGE

/**
 * What a Wall-nut costs to plant. Believed to be the original's 50 - the same as a
 * Sunflower, and the same as a Tall-nut.
 *
 * 50 Sun for something that does nothing but stand there is the cheapest way to
 * spend Sun in the game, and that is what makes it a real decision rather than an
 * obvious one: the same 50 buys a Peashooter, which shoots, or a Sunflower, which
 * makes Sun. What it will not buy is a defence that can be walked past, so the
 * plant behind the nut is still the thing that wins the Row.
 */
export const WALL_NUT_SUN_COST = 50

/**
 * How much health a Wall-nut is planted with. Believed to be the original's 4000.
 *
 * Bites are 100 and come one a second, so this is forty seconds of a Zombie
 * standing still and chewing. Compare a Peashooter's 300, which is three bites
 * and three seconds: a Peashooter in a Zombie's way is barely an inconvenience,
 * and a Wall-nut in a Zombie's way is the longest thing in the game that is not a
 * Zombie's health. That difference is the whole of what the plant is for - it
 * buys time for whatever is shooting from behind it - and it is a bigger number
 * rather than a slower Zombie, so it costs the attacker nothing to have to wait
 * it out.
 */
export const WALL_NUT_HEALTH = 4000

/**
 * How long the Wall-nut's Seed Packet takes to Recharge. Believed to be the
 * original's thirty seconds, and the slowest in the game.
 *
 * Half a second is not a whole number of steps at sixty a second, so the Recharge
 * runs out between two steps and 1800 is the first step on which the packet can be
 * chosen again. It is a long wait, and deliberately so: a nut that Recharged in
 * seven and a half seconds could be lined across a Row faster than a Zombie could
 * walk it, which would make it a wall across the whole Row rather than a plant
 * placed where it is needed. A slow Recharge is what makes the first one on a Row
 * a decision.
 */
export const WALL_NUT_RECHARGE = 30 * STEPS_PER_SECOND

/**
 * How much health a Tall-nut is planted with. Believed to be the original's 8000 -
 * exactly twice a Wall-nut's, and the least certain number on this page.
 *
 * Twice as much health for exactly the same 50 Sun is not a question of
 * arithmetic but of placement, and it is what the plant exists to be: a Wall-nut
 * is a thing you put in front of what is shooting, and a Tall-nut is a thing you
 * put in front of the Wall-nut when one Wall-nut was not enough. Eighty seconds
 * of chewing rather than forty buys a Row twice as long, and a Row that is going
 * to lose anyway is a Row that lost after a minute and a half of being held rather
 * than after forty seconds of it.
 */
export const TALL_NUT_HEALTH = 8000

/**
 * What a Tall-nut costs to plant, and how long its Seed Packet Recharges.
 *
 * Both the Wall-nut's own numbers rather than copies, because they are the same
 * numbers and there is no reading in which the Tall-nut is a cheaper or a
 * quicker plant. One name for each, so that a check can say what a Tall-nut costs
 * without the number being written out twice and able to drift.
 */
export const TALL_NUT_SUN_COST = WALL_NUT_SUN_COST
export const TALL_NUT_RECHARGE = WALL_NUT_RECHARGE

/**
 * What a Potato Mine costs to plant. Believed to be the original's 25 - the
 * cheapest thing in the game that is not free, and the same as a Puff-shroom is
 * not: those two are the two ends of it, one that costs nothing and shoots three
 * Columns, the other that costs 25 and kills one Zombie outright.
 *
 * Cheapest, and the most expensive thing to use badly, which is the same
 * statement from the other side. 25 Sun is a quarter of a Peashooter, so a player
 * can put four or five mines down before they have paid for the shooter that
 * covers the rest of the Row, and each of them is a Square a Zombie cannot walk
 * through for the fifteen seconds it takes to arm.
 */
export const POTATO_MINE_SUN_COST = 25

/**
 * How long a Potato Mine takes to arm itself after it is planted, from planting
 * until it is ready. Believed to be the original's fifteen seconds.
 *
 * This is the whole of what the plant is, and it is why the number is a delay
 * rather than a cost. A mine is the one plant in the game that does not help from
 * the moment it goes in, so where it is planted has to be decided *before* the
 * Zombie that will set it off: fifteen seconds is a quarter of the forty-two a
 * Zombie spends crossing the whole lawn, and a player who plants one as the first
 * thing they do has put it in a Row a Zombie can reach before it is ready.
 *
 * Fifteen seconds is also what stops the mine being strictly worse than a
 * Peashooter. A mine that armed at once would destroy a Zombie for 25 Sun, which is
 * a third of what a Peashooter costs and needs no Row in front of it; the delay is
 * what it is traded for.
 */
export const POTATO_MINE_ARMING_DELAY = 15 * STEPS_PER_SECOND

/**
 * How much health a Potato Mine is planted with, and how long its Seed Packet
 * takes to Recharge.
 *
 * The Peashooter's health and the Wall-nut's Recharge, and both from memory like
 * everything else on this plant - 300 in the original like most of them, and a
 * Recharge of thirty seconds, which is the slowest in the game along with the
 * Wall-nut's and for a related reason: both are plants you put down once and
 * count on, rather than one you put down repeatedly.
 *
 * The health matters more than it looks. A mine that has not armed yet is a plant
 * standing in a Zombie's way, and the rule for a plant in a Zombie's way is that
 * it gets eaten - so a Zombie that reaches a mine early eats it in three bites
 * and takes it off the lawn having destroyed nothing. That is the punishment for
 * planting a mine in the wrong place, and it costs the mine all of its health and
 * the player all of their 25 Sun.
 */
export const POTATO_MINE_HEALTH = PEASHOOTER_HEALTH
export const POTATO_MINE_RECHARGE = WALL_NUT_RECHARGE

/**
 * What one bite takes off a plant. From memory, 100.
 *
 * The same bite on every plant, so that health is comparable across the roster:
 * the Wall-nut's much larger number is what makes it worth its cost, and it is
 * a bigger number rather than a slower Zombie.
 */
export const ZOMBIE_BITE_DAMAGE = 100

/**
 * Steps between one bite and the next. From memory, about a second.
 *
 * Exactly one second, which is a whole number of steps at sixty a second, so a
 * plant's health falls on steps and not somewhere between two of them. The bite
 * lands on the step a Zombie reaches the plant, so the cadence is the same
 * throughout: a bite, a second of chewing, a bite.
 */
export const ZOMBIE_BITE_INTERVAL = STEPS_PER_SECOND

/**
 * How far ahead of itself the game says the Flag Wave is coming.
 *
 * Not the original's number, and not claimed to be. The original raises a flag and
 * puts a message up some seconds ahead of its huge wave; how many is not something
 * this project can hold with confidence, so it is marked here rather than
 * borrowed.
 *
 * Ten seconds is long enough that a player can stop, look at the lawn and decide
 * what to do about it - which is the whole of what an announcement is for - and
 * short enough that it is still news rather than a reminder of something already
 * known.
 */
export const FLAG_WAVE_WARNING = 10 * STEPS_PER_SECOND

/**
 * How much harder a Zombie's health counts for in a Flag Wave, as a multiple.
 *
 * Not the original's number, and the rule is not the original's either. The
 * original's Flag Wave is not made of tougher Zombies at all: it is a great many
 * ordinary ones with a Flag Zombie walking at the front of them, and that is the
 * whole of what it is. A Wave that is only more of the same, though, is not
 * something a player can see coming and get ready for - and getting ready is the
 * whole of what the announcement is for. So this project's Flag Wave is both more
 * and harder, and this is the half of that which is ours rather than copied.
 *
 * One and a quarter. A Zombie in the Flag Wave takes seventeen peas to fell rather
 * than fourteen.
 *
 * That number was one and a half when this was first written, on the argument that
 * a third more health was a third more climax. Playing the level said otherwise. A
 * Peashooter in the first Column there is to plant in - one to the right of the
 * mowers - is reached by a Zombie in about thirty-three seconds, and a Peashooter
 * fires every one and four tenths of a second: so one and a half health is
 * twenty-nine seconds of shooting against the thirty-three a Zombie spends getting
 * there, a margin of three and a half seconds. Three and a half seconds is not a
 * margin, it is a coin toss, and a first playthrough of Level 1-1 lost on it -
 * losing a Row's mower to a Flag Wave Zombie that a Peashooter standing in the right
 * Square could not finish in time. The error was comparing thirty-three against the
 * forty-two a Zombie spends crossing the *whole* lawn, which is the distance to a
 * Peashooter in the last Column and not the one in the first.
 *
 * One and a quarter is seventeen peas against thirty-three seconds: nine seconds to
 * spare, which is a Peashooter placed a little late rather than a Peashooter
 * standing in exactly the right place at exactly the right moment. Two of them in
 * one Row is still a problem rather than a certainty, which is what the Flag Wave is
 * for - the pressure comes from three of them arriving in three Rows at once, which
 * is the original's Flag Wave, rather than from each one being nearly unkillable,
 * which is not.
 */
export const FLAG_WAVE_TOUGHNESS = 1.25
