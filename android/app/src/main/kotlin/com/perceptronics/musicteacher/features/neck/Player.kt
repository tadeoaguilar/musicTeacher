package com.perceptronics.musicteacher.features.neck

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.edit
import com.perceptronics.musicteacher.audio.BassEngine
import com.perceptronics.musicteacher.audio.SequenceOptions

/** Plays a scale or arpeggio on the recorded bass and tracks which note is sounding. */
class Player {
    /** Index into the play sequence of the note heard right now. */
    var activeIndex by mutableStateOf<Int?>(null)
        private set
    var isPlaying by mutableStateOf(false)
        private set

    fun play(midis: List<Int>, playback: PlaybackSettings) {
        // playSequence stops any earlier run first, which reports "nothing playing".
        BassEngine.playSequence(
            midis,
            SequenceOptions(playback.bpm, playback.loop) { i ->
                activeIndex = i
                isPlaying = i != null
            },
        )
        isPlaying = midis.isNotEmpty()
    }

    fun stop() {
        if (isPlaying) BassEngine.stop()
    }

    /** Like the web: tempo changes live; any other change alters the notes, so playback stops. */
    fun onSettingsChange(notesChanged: Boolean, bpm: Int) {
        if (!isPlaying) return
        if (notesChanged) stop() else BassEngine.setBpm(bpm)
    }
}

/**
 * Each section's settings, kept between launches as its web query string
 * ("key=C&scale=major"): the same codec the web uses for its URLs.
 */
class SavedSettings(context: Context) {
    private val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)

    fun load(section: String): Params = Params.parse(prefs.getString(section, null) ?: "")

    fun save(section: String, params: Params) {
        prefs.edit { putString(section, params.toString()) }
    }
}
