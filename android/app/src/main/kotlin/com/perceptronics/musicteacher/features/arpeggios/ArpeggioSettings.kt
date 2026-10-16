package com.perceptronics.musicteacher.features.arpeggios

import com.perceptronics.musicteacher.core.theory.isChordId
import com.perceptronics.musicteacher.core.theory.isKeyId
import com.perceptronics.musicteacher.features.neck.NeckSettings
import com.perceptronics.musicteacher.features.neck.Params
import com.perceptronics.musicteacher.features.neck.PlaybackSettings
import com.perceptronics.musicteacher.features.neck.neckFromParams
import com.perceptronics.musicteacher.features.neck.playbackFromParams
import com.perceptronics.musicteacher.features.neck.putNeck

// Port of src/features/arpeggios/arpeggioState.ts.

data class ArpeggioSettings(
    val key: String = "C",
    val chord: String = "maj",
    val octaves: Int = 1,
    val neck: NeckSettings = NeckSettings(),
    val playback: PlaybackSettings = PlaybackSettings(),
) {
    fun toParams(): Params {
        val p = Params()
        p["key"] = key
        p["chord"] = chord
        if (octaves != 1) p["oct"] = octaves.toString()
        return p.putNeck(neck, playback)
    }

    companion object {
        /** Parses saved settings, ignoring anything invalid. */
        fun fromParams(p: Params) = ArpeggioSettings(
            key = p["key"]?.takeIf(::isKeyId) ?: "C",
            chord = p["chord"]?.takeIf(::isChordId) ?: "maj",
            octaves = if (p["oct"] == "2") 2 else 1,
            neck = neckFromParams(p),
            playback = playbackFromParams(p),
        )
    }
}
