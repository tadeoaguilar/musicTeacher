package com.perceptronics.musicteacher.core.theory

import kotlin.math.log2
import kotlin.math.pow

// Port of src/theory/notes.ts. Keep the two in step: the parity fixtures check they agree.

enum class Locale { EN, ES }

/** The seven letters, in order. */
val LETTERS = listOf('C', 'D', 'E', 'F', 'G', 'A', 'B')

val LETTER_CHROMA = mapOf('C' to 0, 'D' to 2, 'E' to 4, 'F' to 5, 'G' to 7, 'A' to 9, 'B' to 11)

data class ParsedNote(val letter: Char, val acc: String, val octave: Int?)

private val NOTE = Regex("^([A-G])(#{1,2}|b{1,2})?(-?\\d+)?$")

/** Parses "Bb", "F#2", "Ebb1". Returns null for anything else. */
fun parseNote(name: String): ParsedNote? {
    val match = NOTE.matchEntire(name) ?: return null
    val (letter, acc, octave) = match.destructured
    return ParsedNote(letter[0], acc, octave.ifEmpty { null }?.toInt())
}

private fun accidentalOffset(acc: String): Int = if (acc.startsWith('#')) acc.length else -acc.length

/** Pitch class 0-11 (C = 0). */
fun noteChroma(name: String): Int {
    val n = parseNote(name) ?: throw IllegalArgumentException("Invalid note: $name")
    return (LETTER_CHROMA.getValue(n.letter) + accidentalOffset(n.acc) + 12).mod(12)
}

/** MIDI number of a note with octave, e.g. "E1" → 28. */
fun noteMidi(name: String): Int {
    val n = parseNote(name)
    require(n?.octave != null) { "Invalid note with octave: $name" }
    return (n.octave!! + 1) * 12 + LETTER_CHROMA.getValue(n.letter) + accidentalOffset(n.acc)
}

/** The accidental needed to raise/lower a letter to a pitch class, e.g. ('B', 10) → "Bb". */
fun spell(letter: Char, chroma: Int): String {
    val diff = ((chroma - LETTER_CHROMA.getValue(letter)) % 12 + 18) % 12 - 6
    return letter + if (diff > 0) "#".repeat(diff) else "b".repeat(-diff)
}

private val SOLFEGE = mapOf('C' to "Do", 'D' to "Re", 'E' to "Mi", 'F' to "Fa", 'G' to "Sol", 'A' to "La", 'B' to "Si")

private fun prettyAccidentals(acc: String) = acc.replace('#', '♯').replace('b', '♭')

/** "Bb" → "B♭" (en) or "Si♭" (es). Octave numbers are dropped. */
fun formatNote(name: String, locale: Locale): String {
    val n = parseNote(name) ?: return name
    val letter = if (locale == Locale.ES) SOLFEGE.getValue(n.letter) else n.letter.toString()
    return letter + prettyAccidentals(n.acc)
}

/** Interval labels use the same pretty accidentals: "b3" → "♭3". */
fun formatInterval(label: String): String = prettyAccidentals(label)

/** `a4` is the reference pitch in Hz (concert pitch is 440). */
fun midiToFrequency(midi: Int, a4: Double = 440.0): Double = a4 * 2.0.pow((midi - 69) / 12.0)

/** Fractional MIDI number, e.g. 55 Hz → 33 (A1); 56 Hz → ~33.31. */
fun frequencyToMidi(hz: Double, a4: Double = 440.0): Double = 69 + 12 * log2(hz / a4)
