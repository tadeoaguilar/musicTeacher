import { useTranslation } from 'react-i18next'
import type { ArpeggioSettings } from '../../features/arpeggios/arpeggioState'
import { CHORD_IDS, getChord, isChordId } from '../../theory/chords'
import type { Locale } from '../../theory/notes'
import { OCTAVES } from '../../theory/sequence'
import { Segmented, Select } from './fields'
import { KeyField, NeckFields } from './NeckFields'
import styles from './Controls.module.css'

type Props = {
  settings: ArpeggioSettings
  locale: Locale
  onChange: (patch: Partial<ArpeggioSettings>) => void
}

export function ArpeggioControls({ settings, locale, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <div className={styles.panel}>
      <KeyField value={settings.key} locale={locale} onChange={(key) => onChange({ key })} />
      <div className={styles.row}>
        <Select
          label={t('controls.chord')}
          value={settings.chord}
          options={CHORD_IDS.map((id) => ({
            value: id,
            label: t(`arpeggios.names.${id}`),
            group: t(`arpeggios.groups.${getChord(id).group}`),
          }))}
          onChange={(chord) => isChordId(chord) && onChange({ chord })}
        />
        <Segmented
          label={t('controls.octaves')}
          value={settings.octaves}
          options={OCTAVES.map((n) => ({ value: n, label: n }))}
          onChange={(octaves) => onChange({ octaves })}
        />
        <NeckFields settings={settings} locale={locale} onChange={onChange} />
      </div>
    </div>
  )
}
