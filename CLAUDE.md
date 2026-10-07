# CLAUDE.md

Guidance for Claude Code (and any contributor) working in this repository. `README.md` is the user-facing overview; this file covers how the code is organized and the conventions to follow.

## Project

**Music Teacher** — a static single-page web app for bass players, in English and Spanish. Sections today:

- **Scales** (`/:lang/scales`): SVG bass fretboard showing every note of a scale, with synthesized playback.
- **Metronome** (`/:lang/metronome`): meters, subdivisions, swing, accents, rhythm patterns in notation played by the bass, speed/gap trainers, tap tempo, count-in.

Planned sections (see the comment in `src/app/router.tsx`): arpeggios, grooves, lessons, ear training.

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
```

**Before considering work done**, run what CI runs (`.github/workflows/ci.yml`):
`npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:e2e`

## Architecture

```
src/
  theory/      Pure TS music theory: notes, spelling, scales/modes, tunings, fretboard, play sequences
  rhythm/      Pure TS rhythm: meters (TICKS_PER_QUARTER = 48), patterns, bar timing, swing, trainers, tap tempo, notation layout
  audio/       Tone.js engines (lazy-loaded): SynthEngine (scales), MetronomeEngine, worker ticker
  components/  Presentational UI: Fretboard (hand-written SVG), Controls, Metronome widgets
  features/    One folder per section: <Section>Page.tsx + <section>State.ts (Zustand store + URL codec) + tests
  i18n/        en.json / es.json + i18next setup, locale detection
  app/         Router (/:lang/<section>), Layout (header, nav, language switch), useUrlSync
e2e/           Playwright specs, one per section (desktop + Pixel 7 projects)
```

### Layering rules

- `theory/` and `rhythm/` are **pure**: no React, no Tone.js, no DOM. All musical logic goes here and gets unit tests.
- `audio/` depends on `theory/`/`rhythm/` but never on React. Engines are module singletons (`audioEngine`, `metronomeEngine`).
- `components/` take props; they don't read stores or the URL.
- `features/<section>/` wires stores, URL, audio and components together.

### Key patterns

- **All on-screen settings live in the URL.** Each section's state file exports `DEFAULT_*`, `*FromParams` (validates and ignores bad input, falls back to defaults), `*ToParams` (omits defaults to keep URLs short), a Zustand store, and a `pick*` selector. The page calls `useUrlSync(store, { pick, fromParams, toParams })` from `src/app/useUrlSync.ts`. Changing URL param names breaks shared links — avoid it.
  - Scales params: `key scale tuning frets labels lefty bpm dir loop`
  - Metronome params: `ts bpm sub swing acc pat root click bass count sp gap`
- **Tone.js is lazy-loaded** through `loadTone()` in `src/audio/tone.ts` (it's most of the bundle) and must be first called from a user gesture. Import it only as `import type * as ToneLib from 'tone'` elsewhere. The bass voice is shared via `createBassSynth()`.
- **Metronome timing**: `ticker.worker.ts` posts a tick every 25 ms (workers aren't throttled in background tabs); `MetronomeEngine` schedules sounds ~150 ms ahead on the audio clock. Keep scheduling on the audio clock, not `setTimeout`.
- **Swappable audio**: `AudioEngine` interface in `src/audio/AudioEngine.ts`. For real bass samples, add a `SamplerEngine` implementing it and export it as `audioEngine`.
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
- Accessibility: e2e tests select by role/label (`getByRole`, `getByLabel`), so keep controls labelled.

## Git & deploy

- `main` is the default branch; work on `feature/<name>` branches and merge via PR (CI must pass).
- Static deploy of `dist/` to Vercel (`vercel.json`) or Cloudflare Pages (`public/_redirects`); both rewrite all routes to `index.html`.
- `dist/`, `test-results/`, `playwright-report/` are build output and are git-ignored.
