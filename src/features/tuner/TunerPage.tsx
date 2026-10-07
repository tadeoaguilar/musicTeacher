import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { useUrlSync } from '../../app/useUrlSync'
import { audioEngine } from '../../audio/SynthEngine'
import { MicError, micInput } from '../../audio/MicInput'
import { Slider } from '../../components/Controls/fields'
import { TuningFields } from '../../components/Controls/TuningFields'
import { InputLevel } from '../../components/Tuner/InputLevel'
import { StringButtons } from '../../components/Tuner/StringButtons'
import { TunerMeter } from '../../components/Tuner/TunerMeter'
import { isLocale } from '../../i18n'
import { createSmoother, matchString, readNote } from '../../pitch/tuner'
import { noteMidi } from '../../theory/notes'
import { getTuning } from '../../theory/tunings'
import { A4_MAX, A4_MIN, pickTuner, tunerFromParams, tunerToParams, useTunerStore } from './tunerState'
import controls from '../../components/Controls/Controls.module.css'
import styles from './TunerPage.module.css'

/** How long a reference tone rings, in seconds. */
const REFERENCE_SECONDS = 2

export function TunerPage() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const locale = isLocale(lang) ? lang : 'en'

  const settings = useUrlSync(useTunerStore, {
    pick: pickTuner,
    fromParams: tunerFromParams,
    toParams: tunerToParams,
  })
  const { listening, hz, level, error, set, setLive } = useTunerStore(
    useShallow(({ listening, hz, level, error, set, setLive }) => ({
      listening,
      hz,
      level,
      error,
      set,
      setLive,
    })),
  )
  const tuning = getTuning(settings.tuning)!
  const smoother = useRef(createSmoother())

  // Release the microphone when leaving the section.
  useEffect(
    () => () => {
      micInput.stop()
      useTunerStore.getState().setLive({ listening: false, hz: null, level: 0 })
    },
    [],
  )

  const stop = () => {
    micInput.stop()
    smoother.current.reset()
    setLive({ listening: false, hz: null, level: 0 })
  }

  const start = async () => {
    setLive({ error: undefined })
    smoother.current.reset()
    try {
      const started = await micInput.start((frame) =>
        setLive({ hz: smoother.current.push(frame.hz), level: frame.level }),
      )
      setLive({ listening: started })
    } catch (e) {
      setLive({ error: e instanceof MicError ? e.reason : 'unsupported' })
    }
  }

  const reading = hz === null ? null : { ...readNote(hz, settings.a4), hz }
  const stringIndex = reading ? matchString(reading.midi, tuning) : undefined
  // A matching string keeps the tuning's own spelling (Eb1 on a half-step-down bass, not D#1).
  const note = reading && {
    ...reading,
    name: stringIndex === undefined ? reading.name : tuning.strings[stringIndex],
  }

  const playString = (i: number) =>
    void audioEngine.playNote(noteMidi(tuning.strings[i]), { a4: settings.a4, duration: REFERENCE_SECONDS })

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>{t('tuner.title')}</h1>
        <p className={styles.description}>{t('tuner.description')}</p>
      </header>

      <section className={`${controls.panel} ${styles.stage}`} aria-label={t('tuner.title')}>
        <TunerMeter note={note} listening={listening} locale={locale} />
        <StringButtons tuning={tuning} active={stringIndex} locale={locale} onPlay={playString} />

        <div className={styles.actions}>
          <button
            type="button"
            className={listening ? `${controls.play} ${controls.playing}` : controls.play}
            onClick={listening ? stop : () => void start()}
          >
            <span aria-hidden>{listening ? '■' : '🎤'}</span>
            {listening ? t('tuner.stop') : t('tuner.start')}
          </button>
          {listening && <InputLevel level={level} />}
          {error && (
            <p className={styles.error} role="alert">
              {t(`tuner.errors.${error}`)}
            </p>
          )}
          <p className={styles.hint}>{t('tuner.privacy')}</p>
        </div>
      </section>

      <div className={controls.panel}>
        <div className={controls.row}>
          <TuningFields tuning={settings.tuning} locale={locale} onChange={(tuning) => set({ tuning })} />
          <Slider
            label={t('tuner.a4')}
            display={`${settings.a4} Hz`}
            value={settings.a4}
            min={A4_MIN}
            max={A4_MAX}
            onChange={(a4) => set({ a4 })}
          />
        </div>
      </div>
    </div>
  )
}
