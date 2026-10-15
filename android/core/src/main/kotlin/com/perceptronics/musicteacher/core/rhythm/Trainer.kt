package com.perceptronics.musicteacher.core.rhythm

import kotlin.math.abs
import kotlin.math.min
import kotlin.math.sign

// Port of src/rhythm/trainer.ts.

data class SpeedTrainer(val target: Int, val step: Int, val every: Int)

data class GapTrainer(val play: Int, val mute: Int)

data class TrainerSettings(val bpm: Int, val countIn: Boolean, val speed: SpeedTrainer?, val gap: GapTrainer?)

data class BarPlan(
    val bpm: Int,
    /** Silent bar of the gap trainer: visuals continue, sound stops. */
    val muted: Boolean,
    val countIn: Boolean,
    /** Bars until the speed trainer changes tempo; null when it has reached the target or is off. */
    val barsToNextStep: Int?,
)

/** What a bar should do, given its index from the start (the count-in, if on, is bar 0). */
fun barPlan(barIndex: Int, settings: TrainerSettings): BarPlan {
    val (bpm, countIn, speed, gap) = settings
    if (countIn && barIndex == 0) return BarPlan(bpm, muted = false, countIn = true, barsToNextStep = null)
    val bar = barIndex - if (countIn) 1 else 0

    var current = bpm
    var barsToNextStep: Int? = null
    if (speed != null && speed.step > 0 && speed.every > 0) {
        val distance = abs(speed.target - bpm)
        val travelled = min(distance, (bar / speed.every) * speed.step)
        current = bpm + (speed.target - bpm).sign * travelled
        if (travelled < distance) barsToNextStep = speed.every - (bar % speed.every)
    }

    val muted = gap != null && gap.play > 0 && gap.mute > 0 && bar % (gap.play + gap.mute) >= gap.play
    return BarPlan(current, muted, countIn = false, barsToNextStep = barsToNextStep)
}
