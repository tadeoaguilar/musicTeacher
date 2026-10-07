# Roadmap

Plans for the next three features: **Arpeggios**, **Real bass samples** and **Ear Training**. Scales, Metronome and Tuner are already shipped.

Each feature gets its own branch and pull request and follows the "Adding a new section" checklist in [`CLAUDE.md`](../CLAUDE.md):

- pure logic with unit tests;
- URL settings through `useUrlSync`;
- English and Spanish strings;
- an e2e spec;
- README and `CLAUDE.md` updates.

## Order

| #   | Feature                                   | Depends on                    | Size                        |
| --- | ----------------------------------------- | ----------------------------- | --------------------------- |
| 1   | ✅ [Arpeggios](#1-arpeggios)              | nothing; mostly reuses Scales | M                           |
| 2   | [Real bass samples](#2-real-bass-samples) | your recordings               | M + a recording session     |
| 3   | [Ear Training](#3-ear-training)           | benefits from 1 and 2         | L (3 PRs, one per exercise) |

The recording for step 2 can happen while step 1 is being built. Ear training comes last because it benefits from both: a realistic tone trains the ear better, and the exercises reuse the fretboard and the tuner's pitch detection.

---

## 1. Arpeggios

> **Status:** implemented, except the diatonic-arpeggios stretch goal.

**Route:** `/:lang/arpeggios`.

**What it does:** shows the chord tones of any chord across the neck and plays them as a 1- or 2-octave arpeggio in one hand position. It works the same way as the Scales page.

### Theory

Arpeggios need the same note spelling as scales, so `resolveScale` gets generalized instead of duplicated.

- **`src/theory/scales.ts`**:
  - Generalize `resolveScale(key, scaleId)` into `resolveNoteSet(key, formula)`, where a formula is `{ semitones, degrees }`.
  - `degrees` are letter steps from the root. That keeps spelling correct for chords:
    - Cdim7 = C E♭ G♭ B♭♭
    - F#7 = F# A# C# E
    - in the B♭/A♯ key, m7♭5 is spelled A♯ C♯ E G♯, because the fewest-accidentals rule avoids B♭m7♭5's F♭
  - Scales use degrees `0–6`, so their behavior doesn't change. **The existing scale tests must pass unchanged.**
  - `intervalLabels` labels each tone by its degree instead of its index, so a 7th chord reads R 3 5 ♭7.
  - The tonic choice that needs the fewest accidentals (D♭ vs C#) carries over as is.
  - Chord IDs: `dom7` and `maj6` rather than `7` and `6`, because JavaScript orders numeric-looking keys first.
- **New `src/theory/chords.ts`**:

  | id     | semitones | degrees |
  | ------ | --------- | ------- |
  | `maj`  | 0 4 7     | 0 2 4   |
  | `min`  | 0 3 7     | 0 2 4   |
  | `dim`  | 0 3 6     | 0 2 4   |
  | `aug`  | 0 4 8     | 0 2 4   |
  | `sus4` | 0 5 7     | 0 3 4   |
  | `maj7` | 0 4 7 11  | 0 2 4 6 |
  | `dom7` | 0 4 7 10  | 0 2 4 6 |
  | `m7`   | 0 3 7 10  | 0 2 4 6 |
  | `m7b5` | 0 3 6 10  | 0 2 4 6 |
  | `dim7` | 0 3 6 9   | 0 2 4 6 |
  | `maj6` | 0 4 7 9   | 0 2 4 5 |
  | `m6`   | 0 3 7 9   | 0 2 4 5 |

  It exports `CHORD_IDS` and `isChordId`, following `SCALE_IDS` and `isScaleId`.

- **`src/theory/fretboard.ts`**: `getFretboardNotes` takes a resolved note set instead of a `ScaleId`. Scales passes `resolveNoteSet(key, SCALES[scale])`.
- **`src/theory/sequence.ts`**: `buildPlaySequence` gets an `octaves: 1 | 2` option, because bassists usually practice arpeggios over two octaves. It keeps the same rule: closest fret to the start, preferring a string change over a slide.

### Feature

- `src/features/arpeggios/`:
  - `ArpeggiosPage.tsx`;
  - `arpeggioState.ts`, a store plus URL codec;
  - `arpeggioState.test.ts`.
- **Reuses:**
  - `Fretboard`, `Transport` and `TuningFields`;
  - the layout of `ScaleControls`, with a chord-type `Select` in place of the scale one;
  - `audioEngine.playSequence`.
- **Header:** the chord symbol (G7, B♭m7♭5), the notes as chips, and the formula (R 3 5 ♭7).
- **URL params:** `key chord tuning frets labels lefty bpm dir loop oct`.

### Stretch: diatonic arpeggios

- Pick a key and scale, then step through its 7 chords (I–vii°), each shown on the neck.
- Add a "See arpeggios" link from the Scales page that opens it with the same key and scale.

### Tests

- **Unit:**
  - spelling for every chord type in a sharp key (E, F#) and a flat key (B♭, D♭);
  - all scale tests unchanged;
  - the fretboard marks only chord tones;
  - 2-octave sequences stay in one position;
  - URL round-trip and fallback to defaults.
- **E2E:**
  - `/en/arpeggios?key=G&chord=dom7` shows "G7" and marks only G B D F;
  - switching to Spanish shows "Sol7".

---

## 2. Real bass samples

**Goal:** replace the synthesized tone with recordings of **your own bass** everywhere a bass note sounds:

- Scales and Arpeggios playback and fret taps;
- Metronome grooves;
- Tuner reference tones;
- Ear Training.

### Recording guide

- **Signal:** plug into an audio interface (DI) if you have one; it gives the cleanest result. Otherwise use a mic about 20 cm from the neck pickup in a quiet room.
- **Format:** WAV, 48 kHz, 24-bit, mono.
- **Playing:**
  - fingerstyle at medium strength, the way you normally play;
  - mute the strings you aren't playing;
  - let each note ring for about **3 seconds**;
  - leave a second of silence before the note.
- **Notes:** one every 3 semitones covers the whole range. The sampler shifts each recording up to ±1.5 semitones to fill the gaps, which you won't hear.

  | File      | Note | Where on a 4-string |
  | --------- | ---- | ------------------- |
  | `E1.wav`  | E1   | E string open       |
  | `G1.wav`  | G1   | E string, fret 3    |
  | `As1.wav` | A#1  | A string, fret 1    |
  | `Cs2.wav` | C#2  | A string, fret 4    |
  | `E2.wav`  | E2   | D string, fret 2    |
  | `G2.wav`  | G2   | G string open       |
  | `As2.wav` | A#2  | G string, fret 3    |
  | `Cs3.wav` | C#3  | G string, fret 6    |
  | `E3.wav`  | E3   | G string, fret 9    |
  | `G3.wav`  | G3   | G string, fret 12   |

  `s` means sharp, because `#` is awkward in file names. For 5-string coverage, also record `B0.wav` (open B) and `D1.wav`.

- Put the files in `recordings/bass/`. That folder will be added to `.gitignore`, since the raw WAVs are large.

### Processing script

- `scripts/process-samples.mjs`, run with `npm run samples`, calls ffmpeg (install it with `brew install ffmpeg`). For each WAV it:
  1. trims the leading silence;
  2. normalizes the loudness so all notes play at the same level;
  3. cuts to 3 s with a 0.5 s fade-out;
  4. encodes mono 44.1 kHz MP3 at 128 kbps, which every browser can decode, Safari included.
- Output goes to `src/assets/samples/bass/`. Ten files come to about 500 KB in total. These processed files are committed.
- The script fails clearly if a note is missing or a file is silent.

### Engine

- **New `src/audio/SamplerEngine.ts`** implements the existing `AudioEngine` interface (`src/audio/AudioEngine.ts`) with a `Tone.Sampler`.
  - Sample URLs come from `import.meta.glob('../assets/samples/bass/*.mp3', { query: '?url', eager: true })`. Vite gives them hashed file names, so browsers cache them forever.
  - Samples load lazily on the first play, like Tone.js itself (`loadTone()` in `src/audio/tone.ts`).
  - `playNote(midi, { a4, duration })` keeps working. The sampler accepts frequencies, so `midiToFrequency(midi, a4)` still applies A4 calibration.
- **`audioEngine`** (exported from `src/audio/SynthEngine.ts`) becomes the sampler engine. It falls back to the synth if the samples fail to load.
- **One shared bass voice:** replace `createBassSynth(Tone)` in `src/audio/tone.ts` with `loadBassVoice(Tone)`, which returns the sampler, or the synth as a fallback. `MetronomeEngine` (`this.bass = createBassSynth(Tone)…`) then gets the recorded bass for grooves without other changes. Both voices have `triggerAttackRelease(frequency, duration, time, velocity)`.
- **Optional:** a "Sound: recorded / synth" switch stored in `localStorage`. It's a personal preference, not part of a shared link.

### Tests

- **Unit:** the sample map covers E1–G3 (B0 with 5-string samples) with no gap over 3 semitones, and every file name parses to a note.
- **E2E:** playing a scale requests the `.mp3` samples and logs no console errors. Tests can't hear the sound, so check the network requests instead.

---

## 3. Ear Training

**Route:** `/:lang/ear`, with three exercises shown as tabs. Each exercise can ship as its own pull request.

### Shared logic (`src/ear/`, pure and unit-tested)

- **Question generators** use a seeded random number generator, so a `?seed=` URL param makes e2e tests deterministic.
- **Scoring:** correct, wrong, streak and best streak.
- **Weighted repetition:** items you miss come back more often.
- **Levels** limit the pool:

  | Level | Find the note             | Intervals              | Play it back                |
  | ----- | ------------------------- | ---------------------- | --------------------------- |
  | 1     | natural notes, frets 0–5  | P4, P5, P8             | single notes                |
  | 2     | all notes, frets 0–12     | + m3, M3, m6, M6       | 3-note phrases from a scale |
  | 3     | all notes, the whole neck | all, including tritone | 4-note phrases              |

- **Stats:** per-note and per-interval accuracy, kept in `localStorage` (per device). The page shows your weakest items.
- **URL:** exercise, level, tuning and fret range, so a teacher can share a drill as a link.

### Exercise 1: Find the note on the neck

> **Status:** implemented. Differences from this plan:
>
> - The note's name is shown by default ("Show the note's name" can be turned off for pure ear practice). With only the sound, the exercise would need perfect pitch.
> - The right note in another octave counts as correct, with feedback on which way the octave was off.
> - E2E tests read the asked note from the page, so there is no `?seed=` param.

- The app plays a note; you tap where it is on the fretboard.
- **Any position with the same pitch is correct.** E2 is right on the E string fret 12, the A string fret 7, or the D string fret 2.
- After you answer, every correct position lights up, so you learn all the places a note lives.
- **`Fretboard` changes** (`src/components/Fretboard/Fretboard.tsx`):
  - Every fret cell can already be clicked, but the cells are `aria-hidden`. Make them real buttons with labels ("A string, fret 5") so the quiz works with a keyboard and screen readers.
  - Add an `onFretTap(string, fret)` prop.
  - Add a `marks` prop for correct and wrong positions.
  - Allow hiding note labels, since showing them would give away the answer.

### Exercise 2: Name the interval

- The app plays two notes, ascending, descending or together; you pick the interval from answer buttons (m2 … P8).
- A **Replay** button repeats the notes. You can also replay the root alone.
- After you answer, the interval's **shape on the fretboard** appears. Bassists remember intervals as shapes (a 5th is one string up, two frets over).
- Interval names are translated: "Major third" / "Tercera mayor".

### Exercise 3: Play it back on your bass

- The app plays a note (level 1) or a short phrase (levels 2–3); you play it back on your bass.
- **Detection reuses the tuner:**
  - `micInput` (`src/audio/MicInput.ts`);
  - `createSmoother` and `readNote` (`src/pitch/tuner.ts`).
  - A note counts once it holds steady on the target for about 300 ms.
- **The app must not hear itself:** detection is paused while the prompt plays, plus 200 ms of tail. The page recommends headphones.
- **Options:** exact octave, or any octave. Any-octave is the default, so playing the phrase an octave up still counts.
- Progress dots show how far into the phrase you are. On a wrong note, the app shows what it heard ("You played F, expected G").
- **Prompts:** single notes in your range, or phrases from a scale built with `resolveScale` and the playable range of your tuning.

### Tests

- **Unit:**
  - generators always stay inside the level's range, tuning and frets;
  - the same seed gives the same questions;
  - weighting favors missed items;
  - interval math, including descending intervals;
  - the "stable for 300 ms" matcher.
- **E2E**, one per exercise, each with `?seed=`:
  - find-the-note: tap a correct position, then a wrong one;
  - interval: answer correctly and wrongly;
  - play-it-back: uses the oscillator microphone stub from `e2e/tuner.spec.ts`, moved to `e2e/helpers/fakeMicrophone.ts`.

---

## Cross-cutting

- **Navigation:** six sections is a lot for a phone header. Tabs already move to their own scrollable row on small screens. Consider grouping them into "Practice" (Scales, Arpeggios, Ear Training) and "Tools" (Metronome, Tuner).
- **Bundle size:** the main JavaScript is about 420 KB today, with Tone.js loaded separately. If the new sections push it up, lazy-load each section's route.
- **Docs:** each pull request updates the README feature list and the `CLAUDE.md` architecture, URL params and patterns.

## Open questions

- [ ] Recording gear: an audio interface (DI) or a microphone?
- [ ] Record B0 and D1 for 5-string players?
- [ ] Which ear-training exercise ships first? Suggested: find the note, then intervals, then play-it-back.
- [ ] Ship diatonic arpeggios with Arpeggios, or later?
