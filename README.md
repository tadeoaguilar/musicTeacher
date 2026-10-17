# Music Teacher

A web app for bass players, in English and Spanish. Every setting lives in the URL, so any view can be shared as a link.

## Scales

An interactive bass fretboard that shows every note of a scale across the neck. It highlights the root and where to start, and plays the scale with audio.

- 4, 5 and 6-string basses, alternate tunings, 20/21/22/24 frets, left-handed view
- Major, natural minor and the 7 modes, with note spelling that is correct for each key
- Note names or interval labels; English (C D E) and Spanish (Do Re Mi)
- Playback with a recorded bass, with tempo, direction and loop; tap any fret to hear it

## Arpeggios

Every chord tone across the neck, played as a one- or two-octave arpeggio in one hand position.

- 12 chord types: triads (major, minor, diminished, augmented, sus4), 7th chords (maj7, 7, m7, m7♭5, °7) and 6th chords
- Correct spelling for every key (C°7 is C E♭ G♭ B♭♭); notes or interval labels
- Same neck options and playback as Scales

## Ear Training

Learn where every note lives on the neck.

- **Find the note**: the app names and plays a note; tap where it is on the neck. Afterwards every position of that note lights up, including other octaves
- Three levels (natural notes in the first 5 frets → all notes to fret 12 → the whole neck), or hide the name to find it by ear
- **Name the interval**: the app plays two notes (going up, going down, together, or a mix); pick the interval. Afterwards its shape lights up on the neck, next to your answer if it was wrong. Replay both notes or just the first
- Three levels for intervals too (4ths, 5ths and octaves → adds 3rds and 6ths → all intervals up to the octave)
- Score and streaks; notes and intervals you miss come up more often, and are remembered on your device
- One more exercise is planned: play it back on your bass

## Metronome

A metronome for learning rhythm.

- 2/4, 3/4, 4/4, 6/8, 9/8, 12/8; subdivisions from quarters to sixteenth triplets, with adjustable swing
- Tap a beat light to make it accented, normal or silent
- Rhythm patterns (reading basics and bass grooves such as Motown, funk, tumbao and bossa nova), shown in notation and played by the bass on a note you pick
- Speed trainer, gap (silent bars) trainer, tap tempo, count-in; a swinging pendulum
- The audio clock is scheduled from a Web Worker timer, so timing stays steady in background tabs

## Tuner

A chromatic tuner that listens through the microphone.

- Pick your bass (4, 5 or 6 strings) and tuning; the string you're playing lights up
- Shows the nearest note, how many cents flat or sharp, and the frequency
- Tap a string to hear its reference pitch; A4 calibration from 432 to 446 Hz
- Pitch detection (YIN) finds the right octave even on low B, where the fundamental is weak; audio never leaves the device

## Privacy

The privacy policy (`/:lang/privacy`, linked in the footer) covers the website and the Android app: no accounts, ads, analytics or tracking; the microphone is analyzed on the device and never recorded or sent. Google Play links to it.

## Roadmap

Next up: more Ear Training exercises. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Commands

```sh
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests (Vitest)
npm run test:e2e     # browser tests (Playwright; run `npx playwright install chromium` once)
npm run lint && npm run typecheck && npm run format:check
npm run build        # static site in dist/
npm run samples      # recordings/bass/*.wav → src/assets/samples/bass/*.mp3 (needs ffmpeg)
```

## Architecture

```
src/
  theory/      pure TypeScript music theory: notes, scales, chords, fretboard (no React, no audio), fully unit-tested
  ear/         pure TypeScript ear-training logic: seeded question generators (notes, intervals and their shapes), scoring, weighted practice
  rhythm/      pure TypeScript rhythm: meters, patterns, bar timing, trainers, notation layout
  pitch/       pure TypeScript pitch detection (YIN), note reading and smoothing for the tuner
  audio/       Tone.js (lazy-loaded on first click): bass player and metronome engine; microphone input
  components/  Fretboard (hand-written SVG), Controls, Metronome and Tuner widgets
  features/    one folder per site section (scales/, arpeggios/, ear/, metronome/, tuner/)
  i18n/        en/es UI strings (react-i18next)
  app/         router (/:lang/<section>) and layout
```

## Bass sound

Every bass note (Scales, Arpeggios, Ear Training, Metronome grooves, Tuner reference tones) plays a recording of a real bass, with the synth as a fallback if the samples can't load. There is one recording every 3 semitones from E1 to G3, and the sampler shifts each one up to 1.5 semitones to fill the gaps.

To re-record: put `E1.wav G1.wav As1.wav Cs2.wav E2.wav G2.wav As2.wav Cs3.wav E3.wav G3.wav` (`s` = sharp; optionally `B0.wav D1.wav` for 5-string) in `recordings/bass/` (git-ignored) and run `npm run samples`. It trims, evens out the loudness and encodes the MP3s, which are committed. See the recording guide in [docs/ROADMAP.md](docs/ROADMAP.md#recording-guide).

## Deploy

This is a static single-page app: deploy `dist/` to Vercel (`vercel.json`) or Cloudflare Pages (`public/_redirects`). Both files send every route to `index.html`. CI is in `.github/workflows/ci.yml`.
