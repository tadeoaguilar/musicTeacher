import { useTranslation } from 'react-i18next'
import type { NeckSettings } from '../../app/neckSettings'
import { formatNote, type Locale } from '../../theory/notes'
import { KEY_IDS, keySpellings, type KeyId } from '../../theory/scales'
import { FRET_COUNTS } from '../../theory/tunings'
import { Segmented, Toggle } from './fields'
import { TuningFields } from './TuningFields'

type KeyFieldProps = {
  value: KeyId
  locale: Locale
  onChange: (key: KeyId) => void
}

/** The 12 keys, each showing its enharmonic spellings (C♯/D♭). */
export function KeyField({ value, locale, onChange }: KeyFieldProps) {
  const { t } = useTranslation()
  return (
    <Segmented
      label={t('controls.key')}
      value={value}
      wrap
      options={KEY_IDS.map((key) => ({
        value: key,
        label: keySpellings(key)
          .map((n) => formatNote(n, locale))
          .join('/'),
      }))}
      onChange={onChange}
    />
  )
}

type NeckFieldsProps = {
  settings: NeckSettings
  locale: Locale
  onChange: (patch: Partial<NeckSettings>) => void
}

/** Strings, tuning, frets, labels and handedness: how the fretboard is drawn. */
export function NeckFields({ settings, locale, onChange }: NeckFieldsProps) {
  const { t } = useTranslation()
  return (
    <>
      <TuningFields tuning={settings.tuning} locale={locale} onChange={(tuning) => onChange({ tuning })} />
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
    </>
  )
}
