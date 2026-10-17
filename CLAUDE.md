# CLAUDE.md

Guidance for Claude Code (and any contributor) working in this repository. `README.md` is the user-facing overview; this file covers how the code is organized and the conventions to follow.

## Project

**Music Teacher** — a static single-page web app for bass players, in English and Spanish. Sections today:

- **Scales** (`/:lang/scales`): SVG bass fretboard showing every note of a scale, with synthesized playback.
- **Arpeggios** (`/:lang/arpeggios`): chord tones of 12 chord types across the neck, 1- or 2-octave arpeggio playback in one position.
- **Ear Training** (`/:lang/ear`): tabs for exercise 1, "Find the note" (tap where a named, played note is), and exercise 2, "Name the interval" (two notes up/down/together; pick the interval, then see its shape on the neck). 3 levels each; weighted practice of missed items. Play-it-back is next (see the roadmap).
- **Metronome** (`/:lang/metronome`): meters, subdivisions, swing, accents, rhythm patterns in notation played by the bass, speed/gap trainers, tap tempo, count-in.
- **Tuner** (`/:lang/tuner`): microphone pitch detection showing the nearest note, cents off and the matching string for the chosen tuning; reference tones; A4 calibration.
- **Privacy policy** (`/:lang/privacy`, linked in the footer): static text for the website and the Android app; Google Play links to it. Update it (and `UPDATED` in `PrivacyPage.tsx`) whenever data handling changes, e.g. before adding analytics or an online feature.

Planned sections (see the comment in `src/app/router.tsx`): grooves, lessons. **[`docs/ANDROID.md`](docs/ANDROID.md) is the plan for the native Android app (Kotlin, Compose, Oboe) in `android/`; read it before touching Android work.** **[`docs/MONETIZATION.md`](docs/MONETIZATION.md) is the plan for Bassically Pro (accounts, billing, feature management, admin portal): today's features stay free; read it before adding any of those.** **[`docs/ROADMAP.md`](docs/ROADMAP.md) has the agreed plan for real bass samples (recorded by the user) and the remaining Ear Training exercises. Read it before starting either.**

## Stack

React 19 · TypeScript 6 · Vite 8 · React Router 8 · Zustand 5 · i18next / react-i18next · Tone.js 15 · Vitest 5 (jsdom) · Playwright · oxlint · Prettier. Node 24 (same as CI).

## Commands

```sh
npm install
npm run dev            # http://localhost:5173
npm test               # Vitest unit tests (src/**/*.test.ts[x])
npm run test:e2e       # Playwright; builds + previews on :4173. Run `npx playwright install chromium` once
npm run lint           # oxlint
npm run format         # prettier --write (format:check in CI)
npm run typecheck      # tsc -b
npm run build          # tsc -b && vite build → dist/
npm run samples        # recordings/bass/*.wav → web MP3s + Android WAVs (needs ffmpeg)
npm run android:fixtures # web results the Kotlin port is tested against (android/core/src/test/resources)
```

**Before considering work done**, run what CI runs (`.github/workflows/ci.yml`):
`npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:e2e`

## Architecture

```
src/
  theory/      Pure TS music theory: notes, spelling, scales/modes, tunings, fretboard, play sequences
  rhythm/      Pure TS rhythm: meters (TICKS_PER_QUARTER = 48), patterns, bar timing, swing, trainers, tap tempo, notation layout
  ear/         Pure TS ear training: seeded RNG (`createRandom`), question generators (`findNote.ts`, `intervals.ts` incl. `shapeOf`), score/streak and per-item stats with weighted repetition (`progress.ts`)
  pitch/       Pure TS pitch: YIN detection + downsampling, readNote/matchString, reading smoother
  audio/       Tone.js engines (lazy-loaded): BassEngine (scales, notes, reference tones), MetronomeEngine, worker ticker; bass sample map (`samples.ts`); MicInput (plain Web Audio)
  components/  Presentational UI: Fretboard (hand-written SVG), Controls (incl. shared TuningFields), Metronome and Tuner widgets
  features/    One folder per section: <Section>Page.tsx + <section>State.ts (Zustand store + URL codec) + tests
  i18n/        en.json / es.json + i18next setup, locale detection
  app/         Router (/:lang/<section>), Layout (header, nav, language switch), useUrlSync
e2e/           Playwright specs, one per section (desktop + Pixel 7 projects)
```

### Layering rules

- `theory/`, `rhythm/`, `pitch/` and `ear/` are **pure**: no React, no Tone.js, no DOM. All musical logic goes here and gets unit tests.
- **They are also ported line by line to Kotlin** for the Android app (`android/core`). After changing any of them, run `npm run android:fixtures` and update the Kotlin port until `./gradlew :core:test` passes: CI regenerates the fixtures and fails if they're stale (see `android/README.md`).
- `audio/` depends on `theory/`/`rhythm/` but never on React. Engines are module singletons (`audioEngine`, `metronomeEngine`).
- `components/` take props; they don't read stores or the URL.
- `features/<section>/` wires stores, URL, audio and components together.

### Key patterns

- **All on-screen settings live in the URL.** Each section's state file exports `DEFAULT_*`, `*FromParams` (validates and ignores bad input, falls back to defaults), `*ToParams` (omits defaults to keep URLs short), a Zustand store, and a `pick*` selector. The page calls `useUrlSync(store, { pick, fromParams, toParams })` from `src/app/useUrlSync.ts`. Changing URL param names breaks shared links — avoid it.
  - Scales params: `key scale tuning frets labels lefty bpm dir loop`
  - Arpeggios params: `key chord oct tuning frets labels lefty bpm dir loop`
  - The shared neck and playback params (`tuning frets labels lefty bpm dir loop`) are parsed by `neckFromParams` / `neckToParams` in `src/app/neckSettings.ts`; reuse them for any new fretboard section.
  - Metronome params: `ts bpm sub swing acc pat root click bass count sp gap`
  - Tuner params: `tuning a4`
  - Ear params: `ex level name play tuning frets lefty` (`ex=interval` opens exercise 2; no `ex` means Find the note, so old links still work)
- **Tone.js is lazy-loaded** through `loadTone()` in `src/audio/tone.ts` (it's most of the bundle) and must be first called from a user gesture. Import it only as `import type * as ToneLib from 'tone'` elsewhere. Every bass note goes through `loadBassVoice()` (also in `tone.ts`).
- **Metronome timing**: `ticker.worker.ts` posts a tick every 25 ms (workers aren't throttled in background tabs); `MetronomeEngine` schedules sounds ~150 ms ahead on the audio clock. Keep scheduling on the audio clock, not `setTimeout`.
- **Fretboard quiz mode**: pass `onFretTap` to `Fretboard` and every fret cell becomes a labelled, keyboard-reachable button ("A string, fret 5") that reports the tap instead of playing it; `marks` draws `target` / `octave` / `wrong` answers. Without `onFretTap` the cells stay `aria-hidden` (Scales/Arpeggios shouldn't get 100 extra tab stops). Per-device stats use `useItemStats` (`src/features/ear/`), which wraps `localStorage` in try/catch, under one key per exercise (`ear.findNote`, `ear.intervals`). Each exercise is its own component (`FindNote.tsx`, `Intervals.tsx`) under the tabbed `EarPage`, sharing `ScorePanel`. Interval notes are scheduled with `playNote(midi, { delay })`, on the audio clock.
- **Tuner pipeline**: `MicInput` (`src/audio/MicInput.ts`) opens the mic with echo cancellation, noise suppression and auto gain **off** (they filter out bass), reads an 8192-sample `AnalyserNode` window every 50 ms, downsamples to ~12 kHz and runs YIN (`src/pitch/detect.ts`, 27–500 Hz). The page smooths readings (`createSmoother`) and maps them with `readNote(hz, a4)` / `matchString`. Detection is tuned for quiet, noisy input (an unplugged bass on a laptop mic): a very low RMS gate (0.0003) and a fallback that accepts the clearest dip when noise keeps it above the YIN threshold (`maxAperiodicity`). Room noise and hum are rejected by periodicity, not by the gate, so don't raise the gate to fix false notes. The smoother needs 3 readings before showing a note. Don't swap YIN for FFT peak-picking: low strings have weak fundamentals and FFT reports the wrong octave. The tuner deliberately doesn't load Tone.js; reference tones go through `audioEngine.playNote(midi, { a4, duration })`.
- **Recorded bass**: `loadBassVoice(Tone)` returns a `Tone.Sampler` over the committed MP3s in `src/assets/samples/bass/` (found with `import.meta.glob` in `src/audio/samples.ts`, keyed by MIDI number), or `createBassSynth()` if they fail to load. The decoded buffers are shared, so `BassEngine` and `MetronomeEngine` fetch them once. Samples are one every 3 semitones (E1–G3; optional B0, D1), named with `s` for sharp (`As1.mp3`); a unit test fails if there's a gap over 3. Regenerate them from `recordings/bass/*.wav` (git-ignored) with `npm run samples` (`scripts/process-samples.mjs`: mono, trim leading silence, 3 s with 0.5 s fade, −18 LUFS, 128 kbps MP3). `AudioEngine` (`src/audio/AudioEngine.ts`) is the interface the pages use.
- **Scales and chords share one model**: a `NoteSetFormula` (`semitones` + letter-step `degrees`) resolved by `resolveNoteSet(key, formula)` in `src/theory/scales.ts` (`resolveScale` wraps it; chord formulas live in `src/theory/chords.ts`). `getFretboardNotes` and `buildPlaySequence` work on any resolved `NoteSet`. Shared UI: `KeyField`/`NeckFields` (`src/components/Controls/NeckFields.tsx`) and `NoteSetHeader`/`NeckLegend` (`src/components/NoteSet/`).
- **Note spelling is musical**, not just chromatic (F major has Bb, not A#). Use `resolveScale`, `spell`, `formatNote(name, locale)` — never hand-build note names. Spanish uses Do Re Mi.
- **Styling**: CSS Modules per component (`*.module.css`). Colors are CSS custom properties in `src/index.css` with a `prefers-color-scheme: dark` variant — use the tokens, don't hardcode colors.

## Adding a new section (checklist)

1. `src/features/<name>/` with `<Name>Page.tsx`, `<name>State.ts` (store + URL codec), `<name>State.test.ts`.
2. Pure logic in `theory/`, `rhythm/`, or a new pure folder, with unit tests.
3. Route in `src/app/router.tsx`; add the id to `SECTIONS` in `src/app/Layout.tsx`.
4. Strings under a new top-level key **in both** `src/i18n/en.json` and `src/i18n/es.json`, plus `app.nav.<name>`.
5. `e2e/<name>.spec.ts` covering load-from-URL and the main interaction.
6. Update the README's feature list.

## Conventions

- Prettier: no semicolons, single quotes, print width 110.
- TypeScript strict-ish: `noUnusedLocals/Parameters`, `verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no enums/namespaces/parameter properties).
- Prefer `as const` arrays + type guards (`isKeyId`, `isMeterId`, `isLocale`) over enums.
- Short JSDoc comments on exported functions/types explaining _why_; keep the existing sparse comment style.
- Every user-visible string goes through `t()`; never ship English-only text.
- e2e tests that need the microphone stub `navigator.mediaDevices.getUserMedia` with an oscillator stream via `page.addInitScript` (see `e2e/tuner.spec.ts`). Chromium's `--use-fake-device-for-media-stream` hangs on macOS waiting for OS mic permission.
- Accessibility: e2e tests select by role/label (`getByRole`, `getByLabel`), so keep controls labelled.

## Git & deploy

- `main` is the default branch; work on `feature/<name>` branches and merge via PR (CI must pass).
- Static deploy of `dist/` to Vercel (`vercel.json`) or Cloudflare Pages (`public/_redirects`); both rewrite all routes to `index.html`.
- `dist/`, `test-results/`, `playwright-report/` are build output and are git-ignored.
