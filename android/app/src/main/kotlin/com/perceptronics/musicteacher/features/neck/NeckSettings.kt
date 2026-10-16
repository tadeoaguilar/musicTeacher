package com.perceptronics.musicteacher.features.neck

import com.perceptronics.musicteacher.core.theory.Direction
import com.perceptronics.musicteacher.core.theory.FRET_COUNTS
import com.perceptronics.musicteacher.core.theory.getTuning

// Port of src/app/neckSettings.ts.

/** What fretboard markers show: note names or intervals from the root. */
enum class LabelMode(val id: String) { NOTE("note"), INTERVAL("interval") }

/** How the neck is drawn; shared by every section that shows a fretboard. */
data class NeckSettings(
    val tuning: String = "4-standard",
    val frets: Int = 24,
    val labels: LabelMode = LabelMode.NOTE,
    val leftHanded: Boolean = false,
)

/** How a scale or arpeggio is played back. */
data class PlaybackSettings(val bpm: Int = 90, val direction: Direction = Direction.UP, val loop: Boolean = false)

const val BPM_MIN = 40
const val BPM_MAX = 220

private val DEFAULT_NECK = NeckSettings()
private val DEFAULT_PLAYBACK = PlaybackSettings()

/** Reads the neck settings, ignoring anything invalid. */
fun neckFromParams(p: Params): NeckSettings {
    var s = DEFAULT_NECK
    p["tuning"]?.let { if (getTuning(it) != null) s = s.copy(tuning = it) }
    p["frets"]?.toIntOrNull()?.let { if (it in FRET_COUNTS) s = s.copy(frets = it) }
    LabelMode.entries.find { it.id == p["labels"] }?.let { s = s.copy(labels = it) }
    if (p["lefty"] == "1") s = s.copy(leftHanded = true)
    return s
}

/** Reads the playback settings, ignoring anything invalid. */
fun playbackFromParams(p: Params): PlaybackSettings {
    var s = DEFAULT_PLAYBACK
    // Number.isInteger(Number(x)) on the web, so "120.0" counts too.
    p["bpm"]?.trim()?.toDoubleOrNull()?.let {
        if (it % 1.0 == 0.0 && it >= BPM_MIN && it <= BPM_MAX) s = s.copy(bpm = it.toInt())
    }
    Direction.entries.find { it.id == p["dir"] }?.let { s = s.copy(direction = it) }
    if (p["loop"] == "1") s = s.copy(loop = true)
    return s
}

/** Adds neck and playback settings, leaving out defaults to keep the string short. */
fun Params.putNeck(neck: NeckSettings, playback: PlaybackSettings): Params {
    if (neck.tuning != DEFAULT_NECK.tuning) this["tuning"] = neck.tuning
    if (neck.frets != DEFAULT_NECK.frets) this["frets"] = neck.frets.toString()
    if (neck.labels != DEFAULT_NECK.labels) this["labels"] = neck.labels.id
    if (neck.leftHanded) this["lefty"] = "1"
    if (playback.bpm != DEFAULT_PLAYBACK.bpm) this["bpm"] = playback.bpm.toString()
    if (playback.direction != DEFAULT_PLAYBACK.direction) this["dir"] = playback.direction.id
    if (playback.loop) this["loop"] = "1"
    return this
}
