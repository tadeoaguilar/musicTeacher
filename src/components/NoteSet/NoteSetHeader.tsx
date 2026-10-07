import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './NoteSet.module.css'

type HeaderProps = {
  title: string
  description: string
  /** Note names, already formatted for the locale; the first is the root. */
  notes: string[]
  /** Interval labels, already formatted; the first is the root. */
  intervals: string[]
}

/** The page title for a scale or chord, with its notes and formula as chips. */
export function NoteSetHeader({ title, description, notes, intervals }: HeaderProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const chips = (items: string[]) =>
    items.map((item, i) => (
      <span key={item} className={i === 0 ? `${styles.chip} ${styles.rootChip}` : styles.chip}>
        {item}
      </span>
    ))

  return (
    <section className={styles.header} aria-labelledby={titleId}>
      <h1 id={titleId} className={styles.title}>
        {title}
      </h1>
      <p className={styles.description}>{description}</p>
      <dl className={styles.facts}>
        <div>
          <dt>{t('scales.notes')}</dt>
          <dd className={styles.chips}>{chips(notes)}</dd>
        </div>
        <div>
          <dt>{t('scales.formula')}</dt>
          <dd className={styles.chips}>{chips(intervals)}</dd>
        </div>
      </dl>
    </section>
  )
}

type LegendProps = {
  intro: string
  /** What the highlighted fingering is, e.g. "One-octave fingering". */
  pathLabel: string
}

/** Explains the fretboard markers: root, starting note and suggested fingering. */
export function NeckLegend({ intro, pathLabel }: LegendProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.legendRow}>
      <p className={styles.intro}>{intro}</p>
      <ul className={styles.legend}>
        <li>
          <span className={`${styles.swatch} ${styles.swatchRoot}`} aria-hidden />
          {t('scales.legend.root')}
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.swatchStart}`} aria-hidden />
          {t('scales.legend.start')}
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.swatchPath}`} aria-hidden />
          {pathLabel}
        </li>
      </ul>
    </div>
  )
}
