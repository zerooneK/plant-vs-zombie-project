/**
 * A source of numbers fixed by a seed.
 *
 * The rules must give one definite result for one definite list of commands,
 * so they cannot ask the machine for a random number: the same play would come
 * out differently every time and no check could be trusted. So the seed is part
 * of the game state and the rules work the next number out from it themselves.
 *
 * Variety between playthroughs comes from the seed, which the interface is
 * free to choose. The rules stay pure, and a bug report that says "this seed,
 * these commands" can be replayed exactly.
 */
export interface Random {
  readonly seed: number
}

/** A number drawn from a `Random`, together with the state that follows it. */
export interface Sampled {
  readonly random: Random
  readonly value: number
}

export function seededRandom(seed: number): Random {
  return { seed: seed | 0 }
}

/**
 * The next number in the sequence, in the range zero up to but not including
 * one, together with the random state that follows it. Pure integer maths, so
 * it gives the same answer on every machine.
 */
export function nextNumber(random: Random): Sampled {
  const seed = (random.seed + 0x6d2b79f5) | 0
  let mixed = Math.imul(seed ^ (seed >>> 15), seed | 1)
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)

  return { random: { seed }, value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296 }
}

/** A number in the range `low` up to `high`, for placing something on the board. */
export function nextBetween(random: Random, low: number, high: number): Sampled {
  const next = nextNumber(random)
  return { random: next.random, value: low + next.value * (high - low) }
}
