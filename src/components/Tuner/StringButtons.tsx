import { useTranslation } from 'react-i18next'
import { formatNote, parseNote, type Locale } from '../../theory/notes'
import type { Tuning } from '../../theory/tunings'
import styles from './Tuner.module.css'

type Props = {
  tuning: Tuning
  /** Index of the string being heard, if the note matches one. */
  active: number | undefined
  locale: Locale
  onPlay: (index: number) => void
}

/** One button per open string, lowest first: lights up when heard, plays its pitch when tapped. */
export function StringButtons({ tuning, active, locale, onPlay }: Props) {
  const { t } = useTranslation()
  const count = tuning.strings.length
  return (
    <div className={styles.strings} role="group" aria-label={t('tuner.strings')}>
      {tuning.strings.map((s, i) => {
        const name = formatNote(s, locale)
        const octave = parseNote(s)?.octave
        return (
          <button
            key={s}
            type="button"
            className={i === active ? `${styles.string} ${styles.stringActive}` : styles.string}
            data-active={i === active || undefined}
            aria-label={t('tuner.playString', { note: `${name}${octave}` })}
            title={t('tuner.playHint')}
            onClick={() => onPlay(i)}
          >
            <span className={styles.stringNote}>
              {name}
              <sub>{octave}</sub>
            </span>
            {/* Strings are numbered from the highest, as bassists count them. */}
            <span className={styles.stringNumber}>
              <span className={styles.stringWord}>{t('tuner.string')} </span>
              {count - i}
            </span>
          </button>
        )
      })}
    </div>
  )
}
