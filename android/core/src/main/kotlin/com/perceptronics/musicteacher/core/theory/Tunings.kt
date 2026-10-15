package com.perceptronics.musicteacher.core.theory

// Port of src/theory/tunings.ts.

data class Tuning(
    val id: String,
    /** i18n key suffix for the tuning name. */
    val nameKey: String,
    /** Open string notes, lowest string first. */
    val strings: List<String>,
)

val TUNINGS = listOf(
    Tuning("4-standard", "standard", listOf("E1", "A1", "D2", "G2")),
    Tuning("4-drop-d", "dropD", listOf("D1", "A1", "D2", "G2")),
    Tuning("4-half-down", "halfDown", listOf("Eb1", "Ab1", "Db2", "Gb2")),
    Tuning("4-d-standard", "wholeDown", listOf("D1", "G1", "C2", "F2")),
    Tuning("5-standard", "standard", listOf("B0", "E1", "A1", "D2", "G2")),
    Tuning("5-high-c", "highC", listOf("E1", "A1", "D2", "G2", "C3")),
    Tuning("5-drop-a", "dropA", listOf("A0", "E1", "A1", "D2", "G2")),
    Tuning("5-half-down", "halfDown", listOf("Bb0", "Eb1", "Ab1", "Db2", "Gb2")),
    Tuning("6-standard", "standard", listOf("B0", "E1", "A1", "D2", "G2", "C3")),
    Tuning("6-half-down", "halfDown", listOf("Bb0", "Eb1", "Ab1", "Db2", "Gb2", "B2")),
)

val STRING_COUNTS = listOf(4, 5, 6)
val FRET_COUNTS = listOf(20, 21, 22, 24)

fun getTuning(id: String): Tuning? = TUNINGS.find { it.id == id }

fun tuningsFor(count: Int): List<Tuning> = TUNINGS.filter { it.strings.size == count }

fun defaultTuningFor(count: Int): Tuning = tuningsFor(count).first()
