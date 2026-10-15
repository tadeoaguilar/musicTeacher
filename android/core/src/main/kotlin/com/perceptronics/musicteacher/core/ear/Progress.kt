package com.perceptronics.musicteacher.core.ear

// Port of src/ear/progress.ts.

/** Answers so far in this session. */
data class Score(val right: Int = 0, val total: Int = 0, val streak: Int = 0, val best: Int = 0)

val EMPTY_SCORE = Score()

fun addToScore(score: Score, correct: Boolean): Score {
    val streak = if (correct) score.streak + 1 else 0
    return Score(
        right = score.right + if (correct) 1 else 0,
        total = score.total + 1,
        streak = streak,
        best = maxOf(score.best, streak),
    )
}

data class Counts(val right: Int, val wrong: Int)

/** Right and wrong answers per item (a note, an interval…), kept across sessions. Insertion-ordered. */
typealias ItemStats = Map<String, Counts>

fun recordAnswer(stats: ItemStats, item: String, correct: Boolean): ItemStats {
    val (right, wrong) = stats[item] ?: Counts(0, 0)
    return LinkedHashMap(stats).apply {
        put(item, if (correct) Counts(right + 1, wrong) else Counts(right, wrong + 1))
    }
}

/**
 * How often an item should come up: 2.5 for a new item, rising towards 4 for
 * items you keep missing and falling towards 1 for items you always get right.
 */
fun weightOf(stats: ItemStats, item: String): Double {
    val (right, wrong) = stats[item] ?: Counts(0, 0)
    return 1 + (3.0 * (wrong + 1)) / (right + wrong + 2)
}

/** The items missed most often (by share of wrong answers), worst first. */
fun weakest(stats: ItemStats, count: Int = 3): List<String> = stats.entries
    .filter { it.value.wrong > 0 }
    .sortedWith(
        compareByDescending<Map.Entry<String, Counts>> { it.value.wrong.toDouble() / (it.value.right + it.value.wrong) }
            .thenByDescending { it.value.wrong },
    )
    .take(count)
    .map { it.key }
