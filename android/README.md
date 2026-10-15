# Bassically (Android)

The native Android version of Music Teacher: Kotlin, Jetpack Compose and, from phase 3, the Oboe audio library. The plan, phases and decisions are in [`docs/ANDROID.md`](../docs/ANDROID.md).

- App ID: `com.perceptronics.musicteacher` · store name: **Bassically**
- minSdk 26 (Android 8), target/compile SDK 37

## Modules

| Module  | What                                                                            | Web counterpart                                         |
| ------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `core`  | Pure Kotlin (JVM): music theory, rhythm, ear training, pitch detection          | `src/theory`, `src/rhythm`, `src/ear`, `src/pitch`      |
| `audio` | Android library: the `AudioEngine` interface, and later the Oboe engine and mic | `src/audio`                                             |
| `app`   | Compose UI: shell, theme, sections, strings                                     | `src/components`, `src/features`, `src/app`, `src/i18n` |

The strings are the web app's `src/i18n/en.json` and `es.json`, copied into the app's assets at build time (`buildSrc/.../CopyWebStrings.kt`) and read by `i18n/Strings.kt` the way i18next reads them. Add strings there, in both files, never in Android resources (only the store name `app_name` lives in `res/values/strings.xml`).

## Commands

Use Android Studio's bundled JDK, or any JDK 17+:

```sh
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew test             # unit tests (core + app)
./gradlew ktlintCheck lint # style and Android lint (ktlintFormat fixes style)
./gradlew assembleDebug    # app/build/outputs/apk/debug/app-debug.apk
./gradlew installDebug     # build and install on the connected phone (USB debugging on)
```

CI runs `ktlintCheck test lint assembleDebug` and attaches the debug APK to each run (`bassically-debug-apk`).

## Notes

- Kotlin comments nest: `/*` inside a comment (e.g. a glob like `src/i18n/*.json`) opens a second comment and silently swallows the rest of the file.
- Comments in XML resources can't contain `--`.
