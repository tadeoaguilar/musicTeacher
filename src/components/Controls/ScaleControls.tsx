import { useTranslation } from 'react-i18next'
import type { ScaleSettings } from '../../features/scales/scaleState'
import { formatNote, type Locale } from '../../theory/notes'
import { KEY_IDS, SCALE_IDS, isScaleId, keySpellings } from '../../theory/scales'
import {
  FRET_COUNTS,
  STRING_COUNTS,
  defaultTuningFor,
  getTuning,
  tuningsFor,
  type StringCount,
} from '../../theory/tunings'
import { Segmented, Select, Toggle } from './fields'
import styles from './Controls.module.css'

type Props = {
  settings: ScaleSettings
  locale: Locale
  onChange: (patch: Partial<ScaleSettings>) => void
}

export function ScaleControls({ settings, locale, onChange }: Props) {
  const { t } = useTranslation()
  const tuning = getTuning(settings.tuning)!
  const stringCount = tuning.strings.length as StringCount
  const tuningLabel = (strings: string[]) => strings.map((s) => formatNote(s, locale)).join(' ')

  return (
    <div className={styles.panel}>
      <Segmented
        label={t('controls.key')}
        value={settings.key}
        wrap
        options={KEY_IDS.map((key) => ({
          value: key,
          label: keySpellings(key)
            .map((n) => formatNote(n, locale))
            .join('/'),
        }))}
        onChange={(key) => onChange({ key })}
      />

      <div className={styles.row}>
        <Select
          label={t('controls.scale')}
          value={settings.scale}
          options={SCALE_IDS.map((id) => ({ value: id, label: t(`scales.names.${id}`) }))}
          onChange={(scale) => isScaleId(scale) && onChange({ scale })}
        />
        <Segmented
          label={t('controls.strings')}
          value={stringCount}
          options={STRING_COUNTS.map((n) => ({ value: n, label: n }))}
          onChange={(n) => onChange({ tuning: defaultTuningFor(n).id })}
        />
        <Select
          label={t('controls.tuning')}
          value={settings.tuning}
          options={tuningsFor(stringCount).map((tu) => ({
            value: tu.id,
            label: `${t(`controls.tunings.${tu.nameKey}`)} (${tuningLabel(tu.strings)})`,
          }))}
          onChange={(id) => onChange({ tuning: id })}
        />
        <Segmented
          label={t('controls.frets')}
          value={settings.frets}
          options={FRET_COUNTS.map((n) => ({ value: n, label: n }))}
          onChange={(frets) => onChange({ frets })}
        />
        <Segmented
          label={t('controls.labels')}
          value={settings.labels}
          options={[
            { value: 'note', label: t('controls.labelNote') },
            { value: 'interval', label: t('controls.labelInterval') },
          ]}
          onChange={(labels) => onChange({ labels })}
        />
        <Toggle
          label={t('controls.leftHanded')}
          checked={settings.leftHanded}
          onChange={(leftHanded) => onChange({ leftHanded })}
        />
      </div>
    </div>
  )
}
