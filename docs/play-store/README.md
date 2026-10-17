# Google Play release kit

Everything needed to publish **Bassically** (`com.perceptronics.musicteacher`) on Google Play: the store texts in English and Spanish, the graphics, the answers for each Play Console form, and the release steps. Phase 9 of [`ANDROID.md`](../ANDROID.md).

## Files

| File                                                             | Use                                | Spec                               |
| ---------------------------------------------------------------- | ---------------------------------- | ---------------------------------- |
| `icon-512.png`                                                   | App icon                           | 512 × 512 PNG, no transparency     |
| `feature-graphic-en.png`, `feature-graphic-es.png`               | Feature graphic (one per language) | 1024 × 500 PNG                     |
| `screenshots/en/*.png`, `screenshots/es/*.png`                   | Phone screenshots                  | 1080 × 1920 (9:16)                 |
| `../../android/app/build/outputs/bundle/release/app-release.aab` | The upload                         | Built by `./gradlew bundleRelease` |

The graphics are rendered by `node scripts/play-graphics.mjs`. Screenshots are taken from the phone with `adb exec-out screencap` and cropped to 9:16 (status bar removed).

## Build the release

```sh
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew bundleRelease   # app/build/outputs/bundle/release/app-release.aab, signed with the upload key
```

- **Upload key:** `~/.bassically/upload-keystore.jks`, with its passwords in `~/.bassically/keystore.properties`. Both stay **out of git**. Back up the whole `~/.bassically` folder (for example as an attachment in your password manager). If it's lost, Play App Signing lets you request an upload key reset, which takes a few days.
- **Each update:** raise `versionCode` (and `versionName`) in `android/app/build.gradle.kts`. Play rejects a bundle whose `versionCode` it has already seen.
- Without `keystore.properties` (on CI, for example), release builds are unsigned and can't be uploaded.

## Store listing

**App name** (30 characters max): `Bassically`

### English (en-US, default)

**Short description** (80 max):

> Learn bass: scales, arpeggios, ear training, metronome and tuner in one app.

**Full description** (4000 max):

> Bassically is a practice companion for bass players, from your first scale to your daily warm-up.
>
> SCALES AND ARPEGGIOS
> • Every note of a scale or chord across the whole neck, spelled correctly (B♭, not A♯).
> • 12 keys, major and minor scales, all the modes, and 12 chord types in one or two octaves.
> • A suggested fingering in one position, and the note to start on.
> • Hear it played on a real recorded bass, in time, with each note lighting up as it sounds.
> • 4, 5 and 6 strings, alternate tunings, 20 to 24 frets, and a left-handed view.
>
> EAR TRAINING
> • Find the note: hear a note, then tap where it lives on the neck.
> • Name the interval: hear two notes and name the interval, then see its shape on the neck.
> • Three levels each. The notes and intervals you miss come back more often.
>
> METRONOME
> • Rock-steady timing with a low-latency audio engine.
> • Time signatures from 2/4 to 12/8, subdivisions, swing and accents.
> • Rhythm patterns in notation, played by the bass: Motown, funk, bossa, shuffle and more.
> • Speed trainer to build tempo step by step, and a gap trainer to test your inner clock.
> • Tap tempo and count-in.
>
> TUNER
> • Accurate tuning for low strings, even on an unplugged bass.
> • The matching string lights up, with reference tones and A4 calibration (432 to 446 Hz).
>
> In English and Spanish. No ads, no accounts, no tracking. The microphone is used only by the tuner, and the sound never leaves your phone.

### Spanish (es-419)

**Short description**:

> Aprende bajo: escalas, arpegios, oído, metrónomo y afinador en una sola app.

**Full description**:

> Bassically es un compañero de práctica para bajistas, desde tu primera escala hasta tu calentamiento diario.
>
> ESCALAS Y ARPEGIOS
> • Todas las notas de una escala o acorde en todo el mástil, bien escritas (Si♭, no La♯).
> • 12 tonalidades, escalas mayores y menores, todos los modos y 12 tipos de acorde en una o dos octavas.
> • Una digitación sugerida en una posición y la nota por la que empezar.
> • Escúchala tocada por un bajo real grabado, a tempo, con cada nota iluminándose al sonar.
> • 4, 5 y 6 cuerdas, afinaciones alternativas, de 20 a 24 trastes y vista para zurdos.
>
> ENTRENAMIENTO AUDITIVO
> • Encuentra la nota: escucha una nota y toca dónde está en el mástil.
> • Nombra el intervalo: escucha dos notas, nombra el intervalo y ve su forma en el mástil.
> • Tres niveles cada uno. Las notas e intervalos que fallas vuelven más a menudo.
>
> METRÓNOMO
> • Tempo firme como una roca, con un motor de audio de baja latencia.
> • Compases de 2/4 a 12/8, subdivisiones, swing y acentos.
> • Patrones rítmicos en partitura, tocados por el bajo: Motown, funk, bossa, shuffle y más.
> • Entrenador de velocidad para subir el tempo paso a paso, y entrenador de silencios para poner a prueba tu reloj interno.
> • Marcar tempo y cuenta previa.
>
> AFINADOR
> • Afinación precisa para cuerdas graves, incluso con el bajo desenchufado.
> • Se ilumina la cuerda correspondiente, con notas de referencia y calibración del La4 (432 a 446 Hz).
>
> En español e inglés. Sin anuncios, sin cuentas, sin rastreo. Solo el afinador usa el micrófono, y el sonido nunca sale de tu teléfono.

### Other listing fields

- **App category:** Music & Audio (alternative: Education).
- **Tags:** Music, Education, Musical instruments.
- **Contact email:** an address you're happy to publish (required, and the privacy policy points to it).
- **Website:** the site's address.
- **Privacy policy:** `https://<your domain>/en/privacy`.

## Play Console forms

### App content → Privacy policy

`https://<your domain>/en/privacy` (the Spanish page is at `/es/privacy`).

### App content → App access

**All functionality is available without any access restrictions.** (No login.)

### App content → Ads

**No, my app does not contain ads.**

### App content → Content rating (IARC questionnaire)

- **Category:** Reference, News, or Educational.
- Violence, fear, sexuality, profanity, drugs, alcohol, tobacco, gambling: **No** to all.
- Users can interact or exchange content: **No**. Shares the user's location: **No**. Digital purchases: **No**.
- Expected result: **Everyone / PEGI 3 / USK 0**.

### App content → Target audience and content

- **Age groups:** 13–15, 16–17, 18 and over.
- Choosing under-13 groups puts the app under the Families policy (extra requirements and review). The app is fine for children, but that program isn't needed for a first release; it can be added later.
- **Appeals to children:** No.

### App content → Data safety

- **Does your app collect or share any of the required user data types?** **No.**
- Why that's accurate: the microphone audio is processed only on the device, in real time, and never stored or sent. Google's definition doesn't count on-device-only processing as "collected". Settings and scores stay on the device, and there's no network code at all.
- Result: the listing shows **"No data collected"** and **"No data shared"**.

### App content → Government, financial, health, news apps

**No** to each.

### Permissions

The app only requests `RECORD_AUDIO` (a normal runtime permission, asked when you start the tuner). No declaration form is needed.

## Release steps

1. **Create the app:** Play Console → Create app. Name _Bassically_, default language _English (United States)_, _App_, _Free_. Accept the declarations.
2. **Fill in App content:** the forms above.
3. **Store listing:** the English texts and graphics; then _Manage translations_ → add _Spanish (Latin America, es-419)_ with the Spanish texts and graphics.
4. **Internal testing** (instant, up to 100 testers): Testing → Internal testing → Create release. Play App Signing is on by default; keep it. Upload `app-release.aab`, add yourself as a tester, install from the opt-in link, and check that everything works when installed from Play.
5. **Closed testing** (required for new personal developer accounts): create a closed track, add **at least 12 testers** (Google accounts, by email list or Google Group), share the opt-in link, and keep **12 or more opted in for 14 days in a row**.
6. **Apply for production:** after the 14 days, Play Console shows _Apply for production_. Answer the questions about the test. Approval usually takes a few days.
7. **Production:** create a production release with the same bundle (or a newer `versionCode`), choose countries, and roll out.
