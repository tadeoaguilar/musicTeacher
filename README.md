# Music Teacher

A web app for bass players, in English and Spanish. Every setting lives in the URL, so any view can be shared as a link.

## Scales

An interactive bass fretboard that shows every note of a scale across the neck. It highlights the root and where to start, and plays the scale with audio.

- 4, 5 and 6-string basses, alternate tunings, 20/21/22/24 frets, left-handed view
- Major, natural minor and the 7 modes, with note spelling that is correct for each key
- Note names or interval labels; English (C D E) and Spanish (Do Re Mi)
- Synthesized bass playback with tempo, direction and loop; tap any fret to hear it

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

## Roadmap

Next up: Arpeggios, real bass samples and Ear Training. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Commands

```sh
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests (Vitest)
npm run test:e2e     # browser tests (Playwright; run `npx playwright install chromium` once)
npm run lint && npm run typecheck && npm run format:check
npm run build        # static site in dist/
```

## Architecture

```
src/
  theory/      pure TypeScript music theory (no React, no audio), fully unit-tested
  rhythm/      pure TypeScript rhythm: meters, patterns, bar timing, trainers, notation layout
  pitch/       pure TypeScript pitch detection (YIN), note reading and smoothing for the tuner
  audio/       Tone.js (lazy-loaded on first click): scale player and metronome engine; microphone input
  components/  Fretboard (hand-written SVG), Controls, Metronome and Tuner widgets
  features/    one folder per site section (scales/, metronome/, tuner/)
  i18n/        en/es UI strings (react-i18next)
  app/         router (/:lang/<section>) and layout
```

To use real bass samples later, add a `SamplerEngine` that implements `AudioEngine` and export it as `audioEngine`.

## Deploy

This is a static single-page app: deploy `dist/` to Vercel (`vercel.json`) or Cloudflare Pages (`public/_redirects`). Both files send every route to `index.html`. CI is in `.github/workflows/ci.yml`.
