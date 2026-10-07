import type * as ToneLib from 'tone'
import { buildBar, type BarEvent, type BarSettings } from '../rhythm/bar'
import { getMeter } from '../rhythm/meters'
import { barPlan, type BarPlan, type TrainerSettings } from '../rhythm/trainer'
import { midiToFrequency } from '../theory/notes'
import { createBassSynth, loadTone, type BassSynth, type Tone } from './tone'

export type EngineSettings = BarSettings &
  TrainerSettings & {
    rootMidi: number
    /** Volumes, 0–100. */
    click: number
    bass: number
  }

export type Position = {
  bar: number
  beat: number
  /** 0–1 through the current beat. */
  progress: number
  beats: number
  plan: BarPlan
}

type ScheduledBeat = Omit<Position, 'progress'> & { start: number; duration: number }

/** How far ahead (seconds) sounds are scheduled on the audio clock. */
const LOOKAHEAD = 0.15

const CLICKS = {
  accent: { freq: 1760, velocity: 1 },
  normal: { freq: 1175, velocity: 0.75 },
  sub: { freq: 880, velocity: 0.4 },
}

/** 0–100 slider → gain, on a curve that sounds even. */
const gainOf = (volume: number) => (volume / 100) ** 2

/**
 * Sample-accurate metronome: a worker timer wakes the scheduler every 25 ms,
 * which queues the next beats on the audio clock. Settings are read beat by
 * beat, so tempo, accents and patterns can change while it runs.
 */
export class MetronomeEngine {
  private Tone: Tone | undefined
  private click: ToneLib.Synth | undefined
  private bass: BassSynth | undefined
  private clickGain: ToneLib.Gain | undefined
  private bassGain: ToneLib.Gain | undefined
  private worker: Worker | undefined
  private getSettings: (() => EngineSettings) | undefined
  private generation = 0

  private nextBeatTime = 0
  private bar = 0
  private beat = 0
  private plan: BarPlan | undefined
  private scheduled: ScheduledBeat[] = []

  async start(getSettings: () => EngineSettings): Promise<void> {
    this.stop()
    const generation = this.generation
    const Tone = (this.Tone = await loadTone())
    if (generation !== this.generation) return

    if (!this.click) {
      this.clickGain = new Tone.Gain().toDestination()
      this.bassGain = new Tone.Gain().toDestination()
      this.click = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.02 },
      }).connect(this.clickGain)
      this.bass = createBassSynth(Tone).connect(this.bassGain)
      this.worker = new Worker(new URL('./ticker.worker.ts', import.meta.url), { type: 'module' })
      this.worker.onmessage = () => this.schedule()
    }

    this.getSettings = getSettings
    this.setVolumes(getSettings())
    this.nextBeatTime = Tone.getContext().currentTime + 0.1
    this.bar = 0
    this.beat = 0
    this.scheduled = []
    this.schedule()
    this.worker!.postMessage('start')
  }

  stop(): void {
    this.generation++
    this.worker?.postMessage('stop')
    this.getSettings = undefined
    this.scheduled = []
    this.bass?.releaseAll()
  }

  setVolumes({ click, bass }: { click: number; bass: number }): void {
    this.clickGain?.gain.rampTo(gainOf(click), 0.05)
    this.bassGain?.gain.rampTo(gainOf(bass), 0.05)
  }

  /** Where playback is right now, as heard (output latency included); undefined when stopped. */
  getPosition(): Position | undefined {
    if (!this.Tone || !this.scheduled.length) return undefined
    const context = this.Tone.getContext()
    const raw = context.rawContext as Partial<AudioContext>
    const heard = context.currentTime - (raw.outputLatency ?? 0) - (raw.baseLatency ?? 0)
    const current = this.scheduled.findLast((b) => b.start <= heard)
    if (!current) return undefined
    const { start, duration, ...rest } = current
    return { ...rest, progress: Math.min(1, (heard - start) / duration) }
  }

  private schedule(): void {
    const settings = this.getSettings?.()
    if (!settings || !this.Tone) return
    const now = this.Tone.getContext().currentTime

    while (this.nextBeatTime < now + LOOKAHEAD) {
      const meter = getMeter(settings.meter)
      if (this.beat >= meter.beats) {
        this.beat = 0
        this.bar++
      }
      if (this.beat === 0 || !this.plan) this.plan = barPlan(this.bar, settings)
      const plan = this.plan
      // The speed trainer owns the tempo; otherwise tempo changes apply from the next beat.
      const bpm = settings.speed ? plan.bpm : settings.bpm
      const secondsPerBeat = 60 / bpm

      if (!plan.muted) {
        const events: BarEvent[] = plan.countIn
          ? [{ kind: this.beat === 0 ? 'accent' : 'normal', at: this.beat, beat: this.beat }]
          : buildBar(settings).filter((e) => e.at >= this.beat && e.at < this.beat + 1)
        for (const e of events) {
          this.play(e, this.nextBeatTime + (e.at - this.beat) * secondsPerBeat, secondsPerBeat, settings)
        }
      }

      this.scheduled.push({
        bar: this.bar,
        beat: this.beat,
        beats: meter.beats,
        plan,
        start: this.nextBeatTime,
        duration: secondsPerBeat,
      })
      this.scheduled = this.scheduled.filter((b) => b.start > now - 4)
      this.nextBeatTime += secondsPerBeat
      this.beat++
    }
  }

  private play(e: BarEvent, time: number, secondsPerBeat: number, settings: EngineSettings): void {
    if (e.kind === 'bass') {
      const length = Math.max(0.06, e.duration * secondsPerBeat * 0.9)
      this.bass?.triggerAttackRelease(midiToFrequency(settings.rootMidi), length, time, 0.9)
      return
    }
    const { freq, velocity } = CLICKS[e.kind]
    this.click?.triggerAttackRelease(freq, 0.03, time, velocity)
  }
}

export const metronomeEngine = new MetronomeEngine()
