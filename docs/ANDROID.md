# Android app

The plan for a native Android version of Music Teacher, agreed on 2026-10-15.

> **Status:** Phase 0 (this document). Next: Phase 1, the skeleton, once the app ID is chosen.

## Why

Music Teacher is a React web app for bass players with five sections: Scales, Arpeggios, Ear Training (Find the note and Name the interval), Metronome and Tuner. It plays recorded bass samples and works in English and Spanish. You want the same app as a **fully native Android app (Kotlin)**, published on the **Google Play Store**, and tested on your Android phone.

Native means nothing from the web UI is reused directly. What carries over:

- **The logic:** about 1,250 lines of pure TypeScript in `src/theory`, `src/rhythm`, `src/ear` and `src/pitch`, with about 850 lines of tests. It gets ported line by line to Kotlin.
- **The data:** bass samples, strings, chord and scale tables, and rhythm patterns.
- **The design:** same sections, same settings, same behavior.

Native audio is the main payoff. Android's low-latency audio is more precise than the browser for the metronome and the tuner.

**Outcome:** an Android app with the same features as the web app, built and tested in phases, ending in a Play Store release.

## Decisions (recommended)

| Topic            | Choice                                                                                                                                                                        | Why                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Language / UI    | Kotlin 2 + **Jetpack Compose** (Material 3)                                                                                                                                   | Google's current standard; the fretboard, notation and tuner meter are drawn on a `Canvas`, like the web's hand-written SVG |
| Min / target SDK | minSdk 26 (Android 8), target the latest SDK Play requires (36/37 is installed)                                                                                               | Covers about 97% of devices; Play requires a recent target                                                                  |
| Audio            | **Oboe** (Google's C++ low-latency library) through a small JNI bridge                                                                                                        | Sample-accurate metronome, low tap-to-sound latency, and an unprocessed microphone for the tuner                            |
| Repo             | A new **`android/` folder in this repo**                                                                                                                                      | Shares the samples, strings and test fixtures with the web; one CI and one roadmap                                          |
| Modules          | `:core` (pure Kotlin/JVM: theory, rhythm, ear, pitch), `:audio` (Android library + C++), `:app` (Compose UI)                                                                  | Same layering as the web: `core` = `theory/rhythm/ear/pitch`, `audio` = `audio/`, `app` = `components/features/app`         |
| Navigation       | Bottom navigation bar with the 5 sections                                                                                                                                     | Also fixes the phone tab-overflow issue the web has                                                                         |
| State            | One `ViewModel` + `StateFlow` per section; settings saved with **DataStore**                                                                                                  | Replaces "settings in the URL": the app remembers your last settings per section                                            |
| Settings codec   | Keep the web URL param names (`key scale tuning frets…`)                                                                                                                      | Enables Android App Links later: a shared web link opens the same view in the app                                           |
| Strings          | Reuse `src/i18n/en.json` / `es.json`, copied into the app's assets at build time, with a small Kotlin `t(key, args)` (with `{{x}}` interpolation and `_one`/`_other` plurals) | One source of truth for both apps; Spanish uses Do Re Mi                                                                    |
| Language         | Follows the phone's language, with an in-app EN/ES switch (Android per-app language)                                                                                          | Same as the web                                                                                                             |
| Analytics / ads  | None                                                                                                                                                                          | Keeps the Play "Data safety" form simple: no data collected                                                                 |

## Architecture

```
android/
  settings.gradle.kts, gradle/libs.versions.toml, gradlew
  core/    pure Kotlin (JVM): theory/, rhythm/, ear/, pitch/ + JUnit tests (incl. web-parity fixtures)
  audio/   Android library: C++ Oboe engine (sampler, click, mic) + Kotlin API (BassEngine, MetronomeEngine, MicInput)
  app/     Compose UI: ui/fretboard, ui/controls, ui/metronome, ui/tuner; features/<section>/(Screen + ViewModel + Settings); i18n
```

Mapping from the web code (port these, don't redesign them):

- `src/theory/*`, including `resolveNoteSet`, `spell`, `formatNote`, `getFretboardNotes` and `buildPlaySequence`, goes to `core/theory`.
- `src/rhythm/*`, including meters (`TICKS_PER_QUARTER = 48`), patterns, `barPlan`, `buildBar`, swing, trainers, tap tempo and the notation layout, goes to `core/rhythm`.
- `src/ear/*`, including `createRandom` (Mulberry32), `pickWeighted`, `progress.ts`, `findNote.ts` and `intervals.ts` (`shapeOf`, `positionNear`), goes to `core/ear`.
- `src/pitch/*`, including YIN, downsampling, `readNote`, `matchString` and `createSmoother`, goes to `core/pitch`. **The constants stay identical:** gate 0.0003, the `maxAperiodicity` fallback, 27–500 Hz, an 8192-sample window, about 12 kHz downsampling, and 3 readings before a note shows (see `CLAUDE.md`).
- `AudioEngine` (`src/audio/AudioEngine.ts`), `BassEngine.ts`, `MetronomeEngine.ts` and `MicInput.ts` become the Kotlin API in `:audio`.
- Each section's `<section>State.ts` codec becomes a `Settings` data class with `fromParams` / `toParams`, using the same param names and defaults.

### Audio engine (`:audio`)

- **Sampler:**
  - Loads the 10 bass samples as 16-bit WAV from assets.
  - Plays each note from the nearest sample, shifted at most 1.5 semitones (rate 2^(n/12), interpolated).
  - Has a pool of about 8 voices, a 0.3 s release, and A4 calibration through the frequency.
  - **Samples:** `scripts/process-samples.mjs` also writes WAV files to `android/app/src/main/assets/samples/bass/`. WAV is simple to load and avoids the MP3 encoder delay, which matters for timing.
- **Click voice:** the triangle-wave click, synthesized in C++ with the accent, normal and silent levels from `MetronomeEngine.ts`.
- **Metronome scheduling** follows the web design:
  - A Kotlin scheduler thread runs the ported `barPlan`/`buildBar` about 150 ms ahead.
  - It pushes timestamped events (audio frame positions) into a lock-free queue.
  - The Oboe callback renders them sample-accurately.
  - The beat lights and pendulum use Oboe's output timestamps, like the web's `getPosition()` with `outputLatency`.
- **Microphone:**
  - An Oboe input stream with the `Unprocessed` input preset, falling back to `VoiceRecognition`. That turns off automatic gain, noise suppression and echo cancellation, matching the web's settings.
  - Frames feed the ported YIN detector every 50 ms.
- **Background playback:** the screen stays on during the metronome. A foreground "media playback" service with a notification keeps the metronome running when the app is in the background (Phase 4b).

## Phases (each one is a `feature/android-<name>` branch → PR → CI → you test on your phone → merge)

0. **Plan in the repo:** save this plan as `docs/ANDROID.md` and link it from the roadmap and `CLAUDE.md`.
1. **Skeleton:**
   - Gradle project in `android/`, with the version catalog, Compose, the 3 modules, ktlint and Android lint.
   - The app icon (from `public/favicon.svg`), the bottom bar with 5 empty screens, the strings loader and the EN/ES switch.
   - A CI job (`./gradlew test lint assembleDebug`).
   - _Deliverable:_ an installable debug app on your phone.
2. **Core port:**
   - `theory`, `rhythm`, `ear` and `pitch` in Kotlin, with every existing Vitest case ported to JUnit.
   - **Parity fixtures:** a script runs the TypeScript code and writes JSON (spelling of every key and scale or chord, fretboard notes, play sequences, bar plans, question sequences for fixed seeds, YIN results on synthetic tones). The Kotlin tests must match it exactly, so the two apps can't drift apart.
3. **Audio engine:**
   - The Oboe sampler and click voice, plus `playNote` / `playSequence` / `stop`.
   - WAV output added to `npm run samples`.
   - A test screen to check tap-to-sound latency on your phone.
4. **Scales + Arpeggios:**
   - A `Fretboard` composable with tap to play, note or interval labels, left-handed mode, frets 20/21/22/24 and 4/5/6 strings.
   - Key and scale/chord controls, the note set header, and playback that highlights each note in time with the audio.
5. **Metronome:**
   - Meters, subdivisions, swing, accents (tap a beat light to change it), patterns in notation played by the bass, the speed and gap trainers, tap tempo, count-in and the pendulum.
   - 5b: background playback service and notification controls.
6. **Tuner:**
   - The microphone permission flow, the meter (nearest note, cents, Hz), matching the string, reference tones and A4 calibration from 432 to 446 Hz.
7. **Ear Training:**
   - Find the note and Name the interval as tabs.
   - Quiz-mode fretboard: each cell is announced by TalkBack ("A string, fret 5").
   - Per-device stats (DataStore) and weighted practice.
   - _Play it back_ (web exercise 3) gets built on both platforms afterwards.
8. **Polish:**
   - TalkBack and font scaling, dark mode, tablets and landscape, performance.
   - Android App Links, so web URLs open in the app (optional; needs a file on the website).
9. **Release:**
   - Release signing, an App Bundle (.aab) and a privacy policy page on the website (`/privacy`, needed because of the microphone).
   - Store listing texts in EN and ES, screenshots, the content rating and the Data safety form.
   - Then internal testing → **closed testing (12 testers, 14 days)** → production.

Rough effort: one or two working sessions per phase, about 12–16 in total. Google's 14-day closed test comes on top, so start the Play Console account early (see below).

**Going forward:** each new feature, starting with Ear Training exercise 3, has to be built twice, once for the web and once for Android. The parity fixtures keep the logic identical; only the UI is written twice.

## What's needed from you

**Now:**

1. **An Android phone ready for development:**
   - Settings → About phone → tap _Build number_ 7 times.
   - Developer options → turn on **USB debugging**.
   - Keep a USB cable handy. (Wireless debugging also works.)
2. **Android Studio** is installed, and the SDK is there (platform 37, build tools 36). Open it once to update and accept the licenses, and install **NDK** and **CMake** from SDK Manager → SDK Tools. Oboe needs them. I can also do this from the command line with your OK.
3. **Decisions:**
   - The **app ID** (permanent, e.g. `com.tadeoaguilar.musicteacher`).
   - The **store name** ("Music Teacher" is generic; something like "Music Teacher: Bass" stands out more).
   - Free, with no ads (assumed).

**Start early (it takes days):**

4. **Google Play Console developer account:**
   - $25 one-time at play.google.com/console.
   - Identity verification with a government ID, plus verifying your Android phone in the Play Console app.
5. **12 testers** (Google accounts: friends, students, bandmates) who opt in to the closed test and keep the app installed **for 14 days in a row**. This is required for new personal accounts before production.

**During the work:**

6. Test each phase's build on your phone with your bass: audio timing, the tuner and the samples.
7. Approve the privacy policy text (I'll draft it: microphone audio is processed on the device and never stored or sent).

**At release:**

8. **Upload key:** I'll generate a keystore that stays out of git. You keep the file and its passwords in a password manager, because losing it complicates updates. Play App Signing holds the real signing key.
9. Store assets. I can produce these, but you approve them: a 512×512 icon, a 1024×500 feature graphic, at least 2 phone screenshots, and short and full descriptions in EN and ES.
10. Answer the content-rating questionnaire in the Play Console. I'll give you the answers: no violence and no user content, so it should come out as "Everyone".

## Verification

- **Unit tests:** `./gradlew :core:test` runs all the ported tests plus the parity fixtures generated from the TypeScript code. They run in CI on every PR alongside the web checks.
- **UI tests:** instrumented Compose tests per section, mirroring `e2e/*.spec.ts`: a section loads with saved settings; the main interaction works (tap a fret, answer a quiz, start and stop the metronome); the language switches to Spanish. Tuner tests feed a synthetic tone into `MicInput`, like the web's oscillator stub.
- **On your phone, with your bass, per phase:**
  - Metronome steady at 40 and 220 BPM, including in the background.
  - Tuner readings match the web tuner on the same strings, including an unplugged bass.
  - Samples sound like your recording.
  - Note highlighting stays in sync with the audio.
- **Before release:** the Play Console pre-launch report (automatic tests on real devices) and Android vitals during the closed test.

## Risks

- **Audio latency varies by phone.** Oboe handles most of it. We measure it on your phone in Phase 3 and compensate the visuals with output timestamps.
- **Two codebases to maintain.** Mitigated by the parity fixtures and by keeping the logic a one-to-one port.
- **Release timing is set by Google:** account verification plus the 14-day closed test. Starting the account now hides most of that wait behind the development work.
