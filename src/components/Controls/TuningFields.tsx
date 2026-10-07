import { useTranslation } from 'react-i18next'
import { formatNote, type Locale } from '../../theory/notes'
import {
  STRING_COUNTS,
  defaultTuningFor,
  getTuning,
  tuningsFor,
  type StringCount,
} from '../../theory/tunings'
import { Segmented, Select } from './fields'

type Props = {
  tuning: string
  locale: Locale
  onChange: (tuning: string) => void
}

/** String count and tuning pickers, shared by every section that knows about the bass's strings. */
export function TuningFields({ tuning, locale, onChange }: Props) {
  const { t } = useTranslation()
  const stringCount = getTuning(tuning)!.strings.length as StringCount
  const tuningLabel = (strings: string[]) => strings.map((s) => formatNote(s, locale)).join(' ')

  return (
    <>
      <Segmented
        label={t('controls.strings')}
        value={stringCount}
        options={STRING_COUNTS.map((n) => ({ value: n, label: n }))}
        onChange={(n) => onChange(defaultTuningFor(n).id)}
      />
      <Select
        label={t('controls.tuning')}
        value={tuning}
        options={tuningsFor(stringCount).map((tu) => ({
          value: tu.id,
          label: `${t(`controls.tunings.${tu.nameKey}`)} (${tuningLabel(tu.strings)})`,
        }))}
        onChange={onChange}
      />
    </>
  )
}
