import { detectPitch, downsample, rms } from '../pitch/detect'
import { MAX_HZ, MIN_HZ } from '../pitch/tuner'

export type MicErrorReason = 'denied' | 'no-device' | 'unsupported'

export class MicError extends Error {
  readonly reason: MicErrorReason
  constructor(reason: MicErrorReason) {
    super(`Microphone unavailable: ${reason}`)
    this.reason = reason
  }
}

/** ~170 ms at 48 kHz: more than two periods of the lowest note, A0. */
const WINDOW = 8192
/** Bass pitch needs only a few kHz, so detection runs on ~12 kHz audio. */
const DETECT_RATE = 12000
const INTERVAL_MS = 50

export type MicFrame = {
  /** Detected pitch, or null when no clear note is ringing. */
  hz: number | null
  /** RMS input level, 0–1. */
  level: number
}

/**
 * Listens to the microphone and reports the input level and detected pitch
 * about 20 times a second. Uses plain Web Audio, so the tuner never
 * loads Tone.js.
 */
class MicInput {
  private stream: MediaStream | undefined
  private context: AudioContext | undefined
  private frame: number | undefined
  /** Bumped by stop(), so a start still waiting for permission never begins listening. */
  private generation = 0

  /** Resolves true once listening, or false if stop() was called while waiting for permission. */
  async start(onFrame: (frame: MicFrame) => void): Promise<boolean> {
    this.stop()
    const generation = this.generation
    if (!navigator.mediaDevices?.getUserMedia) throw new MicError('unsupported')

    let stream: MediaStream
    try {
      // Voice processing filters out low notes and fights sustained ones, so turn it all off.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
    } catch (e) {
      const name = e instanceof DOMException ? e.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') throw new MicError('denied')
      if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new MicError('no-device')
      throw new MicError('unsupported')
    }
    if (generation !== this.generation) {
      stream.getTracks().forEach((t) => t.stop())
      return false
    }

    const context = new AudioContext()
    this.stream = stream
    this.context = context
    await context.resume()
    if (generation !== this.generation) return false
    const analyser = context.createAnalyser()
    analyser.fftSize = WINDOW
    context.createMediaStreamSource(stream).connect(analyser)

    const samples = new Float32Array(WINDOW)
    const factor = Math.max(1, Math.round(context.sampleRate / DETECT_RATE))
    let last = 0
    const tick = (now: number) => {
      this.frame = requestAnimationFrame(tick)
      if (now - last < INTERVAL_MS) return
      last = now
      analyser.getFloatTimeDomainData(samples)
      const pitch = detectPitch(downsample(samples, factor), context.sampleRate / factor, {
        minHz: MIN_HZ,
        maxHz: MAX_HZ,
      })
      onFrame({ hz: pitch?.hz ?? null, level: rms(samples) })
    }
    this.frame = requestAnimationFrame(tick)
    return true
  }

  stop(): void {
    this.generation++
    if (this.frame !== undefined) cancelAnimationFrame(this.frame)
    this.frame = undefined
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = undefined
    void this.context?.close()
    this.context = undefined
  }
}

export const micInput = new MicInput()
