export type Random = () => number

/** Mulberry32: a small seeded generator, so tests can replay the same questions. */
export function createRandom(seed = Math.floor(Math.random() * 2 ** 32)): Random {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32
  }
}

/** Picks an item with probability proportional to its weight. */
export function pickWeighted<T>(items: T[], weight: (item: T) => number, random: Random): T {
  const weights = items.map(weight)
  let r = random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r < 0) return items[i]
  }
  return items[items.length - 1]
}
