package com.perceptronics.musicteacher.features.metronome

import com.perceptronics.musicteacher.audio.EngineSettings
import com.perceptronics.musicteacher.core.rhythm.Accent
import com.perceptronics.musicteacher.core.rhythm.BPM_MAX
import com.perceptronics.musicteacher.core.rhythm.BPM_MIN
import com.perceptronics.musicteacher.core.rhythm.BarSettings
import com.perceptronics.musicteacher.core.rhythm.GapTrainer
import com.perceptronics.musicteacher.core.rhythm.SpeedTrainer
import com.perceptronics.musicteacher.core.rhythm.TrainerSettings
import com.perceptronics.musicteacher.core.rhythm.defaultAccents
import com.perceptronics.musicteacher.core.rhythm.findPattern
import com.perceptronics.musicteacher.core.rhythm.getMeter
import com.perceptronics.musicteacher.core.rhythm.isMeterId
import com.perceptronics.musicteacher.core.rhythm.subdivisionsFor
import com.perceptronics.musicteacher.core.theory.isKeyId
import com.perceptronics.musicteacher.core.theory.noteChroma
import com.perceptronics.musicteacher.features.neck.Params

// Port of src/features/metronome/metronomeState.ts.

data class MetronomeSettings(
    val meter: String = "4/4",
    val bpm: Int = 80,
    val sub: Int = 1,
    /** 0–100 %. */
    val swing: Int = 0,
    val accents: List<Accent> = defaultAccents(4),
    /** Pattern id for the bass, or "none" for clicks only. */
    val pattern: String = "none",
    /** Pitch class the bass plays, in the low register (B0–A#1). */
    val root: String = "E",
    /** Volumes, 0–100. */
    val click: Int = 80,
    val bass: Int = 70,
    val countIn: Boolean = false,
    val speedOn: Boolean = false,
    val speed: SpeedTrainer = SpeedTrainer(target = 120, step = 5, every = 4),
    val gapOn: Boolean = false,
    val gap: GapTrainer = GapTrainer(play = 2, mute = 2),
) {
    /** Changing the meter resets everything that depends on its beats. */
    fun withMeter(meter: String): MetronomeSettings {
        val m = getMeter(meter)
        return copy(
            meter = meter,
            accents = defaultAccents(m.beats),
            sub = if (sub in subdivisionsFor(m)) sub else 1,
            pattern = if (findPattern(meter, pattern) != null) pattern else "none",
        )
    }

    fun toParams(): Params {
        val d = DEFAULT
        val p = Params()
        p["ts"] = meter
        p["bpm"] = bpm.toString()
        if (sub != d.sub) p["sub"] = sub.toString()
        if (swing != d.swing) p["swing"] = swing.toString()
        val acc = accents.joinToString("") { it.name }
        if (acc != defaultAccents(accents.size).joinToString("") { it.name }) p["acc"] = acc
        if (pattern != d.pattern) p["pat"] = pattern
        if (root != d.root) p["root"] = root
        if (click != d.click) p["click"] = click.toString()
        if (bass != d.bass) p["bass"] = bass.toString()
        if (countIn) p["count"] = "1"
        if (speedOn) p["sp"] = "${speed.target}-${speed.step}-${speed.every}"
        if (gapOn) p["gap"] = "${gap.play}-${gap.mute}"
        return p
    }

    /** What the audio engine reads, beat by beat. */
    fun toEngine() = EngineSettings(
        bar = BarSettings(meter, sub, swing / 100.0, accents, findPattern(meter, pattern)),
        trainer = TrainerSettings(bpm, countIn, if (speedOn) speed else null, if (gapOn) gap else null),
        rootMidi = rootMidi(root),
        click = click,
        bass = bass,
    )

    companion object {
        val DEFAULT = MetronomeSettings()

        fun fromParams(p: Params): MetronomeSettings {
            val ts = p["ts"] ?: ""
            var s = DEFAULT.withMeter(if (isMeterId(ts)) ts else DEFAULT.meter)
            val meter = getMeter(s.meter)

            intIn(p["bpm"], BPM_MIN, BPM_MAX)?.let { s = s.copy(bpm = it) }
            jsNumber(p["sub"] ?: "")?.let { sub ->
                if (sub in
                    subdivisionsFor(meter).map(Int::toDouble)
                ) {
                    s = s.copy(sub = sub.toInt())
                }
            }
            intIn(p["swing"], 0, 100)?.let { s = s.copy(swing = it) }
            val acc = p["acc"] ?: ""
            if (acc.length == meter.beats &&
                ACCENTS.matches(acc)
            ) {
                s = s.copy(accents = acc.map { Accent.valueOf(it.toString()) })
            }
            val pattern = p["pat"] ?: ""
            if (findPattern(s.meter, pattern) != null) s = s.copy(pattern = pattern)
            val root = p["root"] ?: ""
            if (isKeyId(root)) s = s.copy(root = root)
            intIn(p["click"], 0, 100)?.let { s = s.copy(click = it) }
            intIn(p["bass"], 0, 100)?.let { s = s.copy(bass = it) }
            s = s.copy(countIn = p["count"] == "1")

            val sp = (p["sp"] ?: "").split('-')
            val target = intIn(sp.getOrNull(0), BPM_MIN, BPM_MAX)
            val step = intIn(sp.getOrNull(1), 1, 50)
            val every = intIn(sp.getOrNull(2), 1, 32)
            if (target != null && step != null &&
                every != null
            ) {
                s = s.copy(speedOn = true, speed = SpeedTrainer(target, step, every))
            }

            val gap = (p["gap"] ?: "").split('-')
            val play = intIn(gap.getOrNull(0), 1, 16)
            val mute = intIn(gap.getOrNull(1), 1, 16)
            if (play != null && mute != null) s = s.copy(gapOn = true, gap = GapTrainer(play, mute))
            return s
        }
    }
}

private val ACCENTS = Regex("^[ANS]+$")

/** JavaScript's Number(): blank is 0, anything unparsable is NaN (null here). */
private fun jsNumber(value: String): Double? = if (value.isBlank()) 0.0 else value.trim().toDoubleOrNull()

/** An integer within [min, max], read the way the web reads it; null otherwise. */
private fun intIn(value: String?, min: Int, max: Int): Int? {
    val n = jsNumber(value ?: return null) ?: return null
    return if (n % 1.0 == 0.0 && n >= min && n <= max) n.toInt() else null
}

/** Bass notes sit in the bass's low register: B0 up to A#1. */
fun rootMidi(root: String) = 23 + ((noteChroma(root) - 11 + 12) % 12)
