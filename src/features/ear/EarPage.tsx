import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { useUrlSync } from '../../app/useUrlSync'
import { audioEngine } from '../../audio/BassEngine'
import { Segmented, Toggle } from '../../components/Controls/fields'
import { TuningFields } from '../../components/Controls/TuningFields'
import { LEVELS } from '../../ear/findNote'
import { PLAY_MODES } from '../../ear/intervals'
import { isLocale } from '../../i18n'
import { FRET_COUNTS } from '../../theory/tunings'
import { EXERCISES, earFromParams, earToParams, pickEar, useEarStore, type Exercise } from './earState'
import { FindNote } from './FindNote'
import { Intervals } from './Intervals'
import controls from '../../components/Controls/Controls.module.css'
import styles from './EarPage.module.css'

const TAB_LABELS: Record<Exercise, string> = { note: 'ear.findNote', interval: 'ear.intervals.title' }

export function EarPage() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const locale = isLocale(lang) ? lang : 'en'
  const settings = useUrlSync(useEarStore, {
    pick: pickEar,
    fromParams: earFromParams,
    toParams: earToParams,
  })
  const set = useEarStore((s) => s.set)
  const tabs = useRef<Partial<Record<Exercise, HTMLButtonElement | null>>>({})

  useEffect(() => () => audioEngine.stop(), [])

  /** Arrow keys move between tabs, as screen-reader users expect from a tab list. */
  const onTabKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    const i = EXERCISES.indexOf(settings.exercise)
    const exercise = EXERCISES[(i + step + EXERCISES.length) % EXERCISES.length]
    set({ exercise })
    tabs.current[exercise]?.focus()
  }

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>{t('ear.title')}</h1>
        <p className={styles.description}>{t('ear.description')}</p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label={t('ear.exercises')} onKeyDown={onTabKey}>
        {EXERCISES.map((exercise) => (
          <button
            key={exercise}
            ref={(el) => {
              tabs.current[exercise] = el
            }}
            type="button"
            role="tab"
            id={`ear-tab-${exercise}`}
            aria-selected={settings.exercise === exercise}
            aria-controls="ear-panel"
            tabIndex={settings.exercise === exercise ? 0 : -1}
            className={styles.tab}
            onClick={() => set({ exercise })}
          >
            {t(TAB_LABELS[exercise])}
          </button>
        ))}
      </div>

      <div
        id="ear-panel"
        role="tabpanel"
        aria-labelledby={`ear-tab-${settings.exercise}`}
        className={styles.page}
      >
        {settings.exercise === 'note' ? (
          <FindNote settings={settings} locale={locale} />
        ) : (
          <Intervals settings={settings} locale={locale} />
        )}
      </div>

      <div className={controls.panel}>
        <Segmented
          label={t('ear.level')}
          value={settings.level}
          wrap
          options={LEVELS.map((n) => ({
            value: n,
            label: t(settings.exercise === 'note' ? `ear.levels.${n}` : `ear.intervals.levels.${n}`),
          }))}
          onChange={(level) => set({ level })}
        />
        {settings.exercise === 'interval' && (
          <Segmented
            label={t('ear.intervals.play')}
            value={settings.play}
            wrap
            options={PLAY_MODES.map((mode) => ({ value: mode, label: t(`ear.intervals.playModes.${mode}`) }))}
            onChange={(play) => set({ play })}
          />
        )}
        <div className={controls.row}>
          <TuningFields tuning={settings.tuning} locale={locale} onChange={(tuning) => set({ tuning })} />
          <Segmented
            label={t('controls.frets')}
            value={settings.frets}
            options={FRET_COUNTS.map((n) => ({ value: n, label: n }))}
            onChange={(frets) => set({ frets })}
          />
          {settings.exercise === 'note' && (
            <Toggle
              label={t('ear.showName')}
              checked={settings.showName}
              onChange={(showName) => set({ showName })}
            />
          )}
          <Toggle
            label={t('controls.leftHanded')}
            checked={settings.leftHanded}
            onChange={(leftHanded) => set({ leftHanded })}
          />
        </div>
      </div>
    </div>
  )
}
