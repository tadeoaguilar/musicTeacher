import { useTranslation } from 'react-i18next'
import type { Accent } from '../../rhythm/bar'
import styles from './Metronome.module.css'

type Props = {
  accents: Accent[]
  sub: number
  /** Beat and subdivision step sounding now, if running. */
  beat: number | undefined
  step: number | undefined
  countIn: boolean
  onCycle: (beat: number) => void
}

const ACCENT_CLASS: Record<Accent, string> = { A: styles.accent, N: styles.normal, S: styles.silent }
const ACCENT_KEY: Record<Accent, string> = { A: 'accent', N: 'normal', S: 'silent' }

/** One light per beat (tap to cycle accent → normal → silent) with small lights for subdivisions. */
export function BeatLights({ accents, sub, beat, step, countIn, onCycle }: Props) {
  const { t } = useTranslation()
  return (
    <ol className={countIn ? `${styles.lights} ${styles.countIn}` : styles.lights}>
      {accents.map((accent, i) => {
        const active = beat === i
        return (
          <li key={i} className={styles.beatCell}>
            <button
              type="button"
              className={[styles.light, ACCENT_CLASS[accent], active && step === 0 && styles.on]
                .filter(Boolean)
                .join(' ')}
              aria-label={t('metronome.beatLabel', {
                beat: i + 1,
                state: t(`metronome.${ACCENT_KEY[accent]}`),
              })}
              title={t('metronome.cycleHint')}
              onClick={() => onCycle(i)}
            >
              {i + 1}
            </button>
            {sub > 1 && (
              <span className={styles.subLights} aria-hidden>
                {Array.from({ length: sub }, (_, k) => (
                  <span
                    key={k}
                    className={active && step === k ? `${styles.subLight} ${styles.on}` : styles.subLight}
                  />
                ))}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
