import type * as ToneLib from 'tone'
import { midiToFrequency } from '../theory/notes'
import type { AudioEngine, SequenceOptions } from './AudioEngine'
import { createBassSynth, loadTone, type BassSynth, type Tone } from './tone'

/** Plays scales with the shared synthesized bass. */
export class SynthEngine implements AudioEngine {
  private tone: Tone | undefined
  private synth: BassSynth | undefined
  private sequence: ToneLib.Sequence<number> | undefined
  private onNote: SequenceOptions['onNote'] | undefined
  /** Bumped by stop(), so a sequence still loading when Stop is pressed never starts. */
  private generation = 0

  private async ready(): Promise<{ Tone: Tone; synth: BassSynth }> {
    const Tone = (this.tone = await loadTone())
    this.synth ??= createBassSynth(Tone).toDestination()
    return { Tone, synth: this.synth }
  }

  async playNote(midi: number): Promise<void> {
    const { synth } = await this.ready()
    synth.triggerAttackRelease(midiToFrequency(midi), '8n')
  }

  async playSequence(midis: number[], { bpm, loop, onNote }: SequenceOptions): Promise<void> {
    this.stop()
    this.onNote = onNote
    const generation = this.generation
    const { Tone, synth } = await this.ready()
    if (generation !== this.generation) return

    const transport = Tone.getTransport()
    transport.bpm.value = bpm
    const indices = midis.map((_, i) => i)
    this.sequence = new Tone.Sequence<number>(
      (time, i) => {
        synth.triggerAttackRelease(midiToFrequency(midis[i]), '8n', time)
        Tone.getDraw().schedule(() => onNote(i), time)
        if (!loop && i === midis.length - 1) {
          transport.scheduleOnce(
            (t) => Tone.getDraw().schedule(() => this.stop(), t),
            time + Tone.Time('4n').toSeconds(),
          )
        }
      },
      indices,
      '4n',
    )
    this.sequence.loop = loop
    this.sequence.start(0)
    transport.start('+0.05')
  }

  setBpm(bpm: number): void {
    if (this.tone) this.tone.getTransport().bpm.value = bpm
  }

  stop(): void {
    this.generation++
    if (this.tone) {
      const transport = this.tone.getTransport()
      transport.stop()
      transport.cancel()
    }
    this.sequence?.dispose()
    this.sequence = undefined
    const onNote = this.onNote
    this.onNote = undefined
    onNote?.(null)
  }
}

export const audioEngine: AudioEngine = new SynthEngine()
