export type Pitch = {
  hz: number
  /** 0–1: how periodic the signal is. Plucked strings read above ~0.85. */
  clarity: number
}

export type DetectOptions = {
  minHz: number
  maxHz: number
  /** YIN threshold: a dip under this is taken as the period straight away. */
  threshold?: number
  /**
   * Noisy input (a quiet string, a laptop mic) may never dip under the
   * threshold; then the clearest dip is still accepted if it is under this.
   * Room noise and hum stay above it.
   */
  maxAperiodicity?: number
  /** Below this RMS level the input is treated as silence. */
  minRms?: number
}

/**
 * YIN pitch detection (de Cheveigné & Kawahara, 2002). Low bass strings have
 * a weak fundamental and loud harmonics, so picking the biggest FFT peak
 * reports the wrong octave; YIN finds the period instead, which is robust to that.
 */
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
  { minHz, maxHz, threshold = 0.15, maxAperiodicity = 0.5, minRms = 0.0003 }: DetectOptions,
): Pitch | null {
  // The gate is low on purpose: an unplugged bass heard by a laptop mic is very quiet.
  // The periodicity checks below are what reject noise.
  if (rms(samples) < minRms) return null

  const tauMin = Math.max(2, Math.floor(sampleRate / maxHz))
  const tauMax = Math.min(Math.ceil(sampleRate / minHz), Math.floor(samples.length / 2))
  const size = samples.length - tauMax

  // Cumulative mean normalized difference: d'(τ) dips towards 0 at the period.
  const cmnd = new Float32Array(tauMax + 2)
  cmnd[0] = 1
  let runningSum = 0
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    let d = 0
    for (let i = 0; i < size; i++) {
      const delta = samples[i] - samples[i + tau]
      d += delta * delta
    }
    runningSum += d
    cmnd[tau] = runningSum === 0 ? 1 : (d * tau) / runningSum
  }

  let clearest = Infinity
  for (let k = tauMin; k <= tauMax; k++) clearest = Math.min(clearest, cmnd[k])
  if (clearest >= maxAperiodicity) return null
  // Clean input: the first dip under the threshold. Noisy input: the first dip about
  // as deep as the clearest one. Either way the earliest wins, because later dips
  // are multiples of the period (an octave or more too low).
  const limit = clearest < threshold ? threshold : clearest * 1.1 + 0.02
  let tau = tauMin
  while (tau <= tauMax && cmnd[tau] >= limit) tau++
  while (tau < tauMax && cmnd[tau + 1] < cmnd[tau]) tau++

  // Parabolic interpolation between samples, for accuracy finer than one sample.
  const [a, b, c] = [cmnd[tau - 1], cmnd[tau], cmnd[tau + 1]]
  const curve = a - 2 * b + c
  const period = curve > 0 ? tau + (a - c) / (2 * curve) : tau

  return { hz: sampleRate / period, clarity: Math.max(0, 1 - b) }
}

/** Root-mean-square level, 0–1. */
export function rms(samples: Float32Array): number {
  let energy = 0
  for (const s of samples) energy += s * s
  return Math.sqrt(energy / samples.length)
}

/**
 * Averages each group of `factor` samples. Bass pitch needs only a few kHz of
 * bandwidth, so detecting on fewer samples makes YIN much cheaper.
 */
export function downsample(samples: Float32Array, factor: number): Float32Array {
  if (factor <= 1) return samples
  const out = new Float32Array(Math.floor(samples.length / factor))
  for (let i = 0; i < out.length; i++) {
    let sum = 0
    for (let j = 0; j < factor; j++) sum += samples[i * factor + j]
    out[i] = sum / factor
  }
  return out
}
