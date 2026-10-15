package com.perceptronics.musicteacher.core.pitch

import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

// Port of src/pitch/detect.ts. Number types follow the web exactly (Float32Array samples and
// difference buffer, double sums) so both apps report the same pitch for the same input.

data class Pitch(
    val hz: Double,
    /** 0–1: how periodic the signal is. Plucked strings read above ~0.85. */
    val clarity: Double,
)

data class DetectOptions(
    val minHz: Double,
    val maxHz: Double,
    /** YIN threshold: a dip under this is taken as the period straight away. */
    val threshold: Double = 0.15,
    /**
     * Noisy input (a quiet string, a laptop mic) may never dip under the
     * threshold; then the clearest dip is still accepted if it is under this.
     * Room noise and hum stay above it.
     */
    val maxAperiodicity: Double = 0.5,
    /** Below this RMS level the input is treated as silence. */
    val minRms: Double = 0.0003,
)

/**
 * YIN pitch detection (de Cheveigné & Kawahara, 2002). Low bass strings have
 * a weak fundamental and loud harmonics, so picking the biggest FFT peak
 * reports the wrong octave; YIN finds the period instead, which is robust to that.
 */
fun detectPitch(samples: FloatArray, sampleRate: Double, options: DetectOptions): Pitch? {
    // The gate is low on purpose: an unplugged bass heard by a laptop mic is very quiet.
    // The periodicity checks below are what reject noise.
    if (rms(samples) < options.minRms) return null

    val tauMin = max(2, floor(sampleRate / options.maxHz).toInt())
    val tauMax = min(ceil(sampleRate / options.minHz).toInt(), samples.size / 2)
    val size = samples.size - tauMax

    // Cumulative mean normalized difference: d'(τ) dips towards 0 at the period.
    val cmnd = FloatArray(tauMax + 2)
    cmnd[0] = 1f
    var runningSum = 0.0
    for (tau in 1..tauMax + 1) {
        var d = 0.0
        for (i in 0 until size) {
            // At tau = tauMax + 1 the web reads one sample past the end, which JavaScript turns into
            // NaN (so cmnd[tauMax + 1] is NaN and never wins a comparison). Kept as is for parity.
            val next = if (i + tau < samples.size) samples[i + tau].toDouble() else Double.NaN
            val delta = samples[i].toDouble() - next
            d += delta * delta
        }
        runningSum += d
        cmnd[tau] = if (runningSum == 0.0) 1f else ((d * tau) / runningSum).toFloat()
    }

    var clearest = Double.POSITIVE_INFINITY
    for (k in tauMin..tauMax) clearest = min(clearest, cmnd[k].toDouble())
    if (clearest >= options.maxAperiodicity) return null
    // Clean input: the first dip under the threshold. Noisy input: the first dip about
    // as deep as the clearest one. Either way the earliest wins, because later dips
    // are multiples of the period (an octave or more too low).
    val limit = if (clearest < options.threshold) options.threshold else clearest * 1.1 + 0.02
    var tau = tauMin
    while (tau <= tauMax && cmnd[tau] >= limit) tau++
    while (tau < tauMax && cmnd[tau + 1] < cmnd[tau]) tau++

    // Parabolic interpolation between samples, for accuracy finer than one sample.
    val a = cmnd[tau - 1].toDouble()
    val b = cmnd[tau].toDouble()
    val c = cmnd[tau + 1].toDouble()
    val curve = a - 2 * b + c
    val period = if (curve > 0) tau + (a - c) / (2 * curve) else tau.toDouble()

    return Pitch(sampleRate / period, max(0.0, 1 - b))
}

/** Root-mean-square level, 0–1. */
fun rms(samples: FloatArray): Double {
    var energy = 0.0
    for (s in samples) energy += s.toDouble() * s
    return sqrt(energy / samples.size)
}

/**
 * Averages each group of `factor` samples. Bass pitch needs only a few kHz of
 * bandwidth, so detecting on fewer samples makes YIN much cheaper.
 */
fun downsample(samples: FloatArray, factor: Int): FloatArray {
    if (factor <= 1) return samples
    return FloatArray(samples.size / factor) { i ->
        var sum = 0.0
        for (j in 0 until factor) sum += samples[i * factor + j]
        (sum / factor).toFloat()
    }
}
