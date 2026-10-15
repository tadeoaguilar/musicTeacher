package com.perceptronics.musicteacher.core.ear

// Port of src/ear/random.ts.

/** A source of numbers in [0, 1), like Math.random. */
typealias Random = () -> Double

/**
 * Mulberry32: a small seeded generator, so tests can replay the same questions.
 * Bit-for-bit the same as the web's (Int arithmetic wraps like Math.imul).
 */
fun createRandom(seed: Long = kotlin.random.Random.nextLong(0, 1L shl 32)): Random {
    var a = seed.toInt()
    return {
        a += 0x6d2b79f5
        var t = a
        t = (t xor (t ushr 15)) * (t or 1)
        t = t xor (t + (t xor (t ushr 7)) * (t or 61))
        ((t xor (t ushr 14)).toLong() and 0xFFFFFFFFL).toDouble() / 4294967296.0
    }
}

/** Picks an item with probability proportional to its weight. */
fun <T> pickWeighted(items: List<T>, weight: (T) -> Double, random: Random): T {
    val weights = items.map(weight)
    var r = random() * weights.fold(0.0) { a, b -> a + b }
    for (i in items.indices) {
        r -= weights[i]
        if (r < 0) return items[i]
    }
    return items.last()
}
