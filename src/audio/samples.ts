import { noteMidi } from '../theory/notes'

/**
 * MIDI number of a sample file such as ".../As1.mp3" (A#1 → 34). File names use
 * `s` for sharp because `#` is awkward in paths. Undefined for anything else.
 */
export function sampleMidi(path: string): number | undefined {
  const match = /(?:^|\/)([A-G])(s?)(-?\d)\.mp3$/.exec(path)
  if (!match) return undefined
  return noteMidi(match[1] + (match[2] ? '#' : '') + match[3])
}

/** Maps file paths to URLs keyed by MIDI number, the form `Tone.Sampler` takes. */
export function sampleUrls(files: Record<string, string>): Record<number, string> {
  const urls: Record<number, string> = {}
  for (const [path, url] of Object.entries(files)) {
    const midi = sampleMidi(path)
    if (midi !== undefined) urls[midi] = url
  }
  return urls
}

/** The recorded bass, made by `npm run samples`. Vite hashes the file names, so browsers cache them. */
export const BASS_SAMPLES = sampleUrls(
  import.meta.glob<string>('../assets/samples/bass/*.mp3', { query: '?url', import: 'default', eager: true }),
)
