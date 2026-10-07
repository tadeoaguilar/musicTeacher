import { useTranslation } from 'react-i18next'
import type { ScaleSettings } from '../../features/scales/scaleState'
import type { Locale } from '../../theory/notes'
import { SCALE_IDS, isScaleId } from '../../theory/scales'
import { Select } from './fields'
import { KeyField, NeckFields } from './NeckFields'
import styles from './Controls.module.css'

type Props = {
  settings: ScaleSettings
  locale: Locale
  onChange: (patch: Partial<ScaleSettings>) => void
}

export function ScaleControls({ settings, locale, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <div className={styles.panel}>
      <KeyField value={settings.key} locale={locale} onChange={(key) => onChange({ key })} />
      <div className={styles.row}>
        <Select
          label={t('controls.scale')}
          value={settings.scale}
          options={SCALE_IDS.map((id) => ({ value: id, label: t(`scales.names.${id}`) }))}
          onChange={(scale) => isScaleId(scale) && onChange({ scale })}
        />
        <NeckFields settings={settings} locale={locale} onChange={onChange} />
      </div>
    </div>
  )
}
