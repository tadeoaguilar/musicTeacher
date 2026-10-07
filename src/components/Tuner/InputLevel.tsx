import { useTranslation } from 'react-i18next'
import styles from './Tuner.module.css'

/** The bar spans −70 dBFS (a quiet room) to −10 dBFS (a hard pluck close to the mic). */
const FLOOR_DB = -70
const RANGE_DB = 60

type Props = {
  /** RMS level, 0–1. */
  level: number
}

/** Shows how loud the microphone hears the bass, so a weak signal is easy to spot. */
export function InputLevel({ level }: Props) {
  const { t } = useTranslation()
  const db = 20 * Math.log10(Math.max(level, 1e-6))
  const percent = Math.round(Math.min(100, Math.max(0, ((db - FLOOR_DB) / RANGE_DB) * 100)))
  return (
    <div className={styles.level}>
      <div
        className={styles.levelTrack}
        role="meter"
        aria-label={t('tuner.level')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className={styles.levelBar} style={{ width: `${percent}%` }} />
      </div>
      <span className={styles.levelLabel}>{t('tuner.level')}</span>
      <p className={styles.levelHint}>{t('tuner.levelHint')}</p>
    </div>
  )
}
