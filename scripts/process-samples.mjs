// Turns the raw bass recordings in recordings/bass/*.wav into the small MP3s the
// web app plays (src/assets/samples/bass/) and the WAVs the Android app plays
// (android/audio/src/main/assets/samples/bass/). Run with `npm run samples`; needs ffmpeg.
//
// For each note: mix to mono, trim the leading silence, cut to 3 s with a 0.5 s
// fade-out, bring every note to the same loudness, encode 44.1 kHz 128 kbps MP3
// and 44.1 kHz 16-bit WAV (no decoder needed, and no MP3 start-up delay to throw off timing).

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const INPUT = 'recordings/bass'
const OUTPUT = 'src/assets/samples/bass'
const ANDROID_OUTPUT = 'android/audio/src/main/assets/samples/bass'
/** One note every 3 semitones, E1–G3 (4-string); B0 and D1 extend it for 5-string basses. */
const REQUIRED = ['E1', 'G1', 'As1', 'Cs2', 'E2', 'G2', 'As2', 'Cs3', 'E3', 'G3']
const OPTIONAL = ['B0', 'D1']
const TARGET_LUFS = -18
const MAX_PEAK_DB = -1
const LENGTH = 3
const FADE = 0.5
/** Below this the file is treated as silent (ffmpeg reports -70 LUFS for silence). */
const SILENT_LUFS = -60

function fail(message) {
  console.error(`\n✗ ${message}`)
  process.exit(1)
}

function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8' })
  if (result.error) fail('ffmpeg not found. Install it (MacPorts: `sudo port install ffmpeg`) and try again.')
  if (result.status !== 0) fail(`ffmpeg failed:\n${result.stderr.split('\n').slice(-8).join('\n')}`)
  return result.stderr
}

/** Mono, leading silence trimmed (keeping 5 ms before the pluck), cut to LENGTH seconds. */
const shape = `aformat=channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.005,atrim=0:${LENGTH}`

function measure(file) {
  const log = ffmpeg(['-i', file, '-af', `${shape},ebur128=peak=sample`, '-f', 'null', '-'])
  const summary = log.slice(log.lastIndexOf('Summary:'))
  const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1])
  const peak = Number(/Peak:\s+(-?[\d.]+|-inf) dBFS/.exec(summary)?.[1].replace('-inf', '-Infinity'))
  return { lufs, peak }
}

if (!existsSync(INPUT)) fail(`No ${INPUT}/ folder. Put the recordings there (see docs/ROADMAP.md).`)
const wavs = readdirSync(INPUT).filter((f) => f.toLowerCase().endsWith('.wav'))
const names = wavs.map((f) => f.slice(0, -4))

const unknown = names.filter((n) => !REQUIRED.includes(n) && !OPTIONAL.includes(n))
if (unknown.length)
  fail(`Unexpected file names: ${unknown.join(', ')}. Expected ${[...REQUIRED, ...OPTIONAL].join(', ')}.`)
const missing = REQUIRED.filter((n) => !names.includes(n))
if (missing.length) fail(`Missing recordings: ${missing.map((n) => `${n}.wav`).join(', ')}`)

for (const dir of [OUTPUT, ANDROID_OUTPUT]) {
  mkdirSync(dir, { recursive: true })
  for (const old of readdirSync(dir)) rmSync(join(dir, old))
}

for (const name of [...OPTIONAL, ...REQUIRED].filter((n) => names.includes(n))) {
  const input = join(INPUT, `${name}.wav`)
  const { lufs, peak } = measure(input)
  if (!(lufs > SILENT_LUFS)) fail(`${name}.wav is silent or nearly silent (${lufs} LUFS).`)
  // Same loudness for every note, but never louder than MAX_PEAK_DB at the peak.
  const gain = Math.min(TARGET_LUFS - lufs, MAX_PEAK_DB - peak)
  const filters = `${shape},volume=${gain.toFixed(2)}dB,afade=t=out:st=${LENGTH - FADE}:d=${FADE}`
  const encode = (codec, output) =>
    ffmpeg(['-i', input, '-af', filters, '-ar', '44100', ...codec, '-map_metadata', '-1', '-y', output])
  encode(['-c:a', 'libmp3lame', '-b:a', '128k'], join(OUTPUT, `${name}.mp3`))
  encode(['-c:a', 'pcm_s16le', '-bitexact'], join(ANDROID_OUTPUT, `${name}.wav`))
  console.log(
    `✓ ${name.padEnd(4)} ${lufs.toFixed(1)} LUFS → gain ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB`,
  )
}
console.log(`\nWrote ${OUTPUT}/ and ${ANDROID_OUTPUT}/`)
