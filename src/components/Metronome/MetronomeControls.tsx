import { useTranslation } from 'react-i18next'
import type { MetronomeSettings } from '../../features/metronome/metronomeState'
import { METER_IDS, canSwing, getMeter, subdivisionsFor, type Subdivision } from '../../rhythm/meters'
import { patternsFor } from '../../rhythm/patterns'
import { formatNote, type Locale } from '../../theory/notes'
import { KEY_IDS, isKeyId, keySpellings } from '../../theory/scales'
import { NumberField, Segmented, Select, Slider, Toggle } from '../Controls/fields'
import controls from '../Controls/Controls.module.css'
import styles from './Metronome.module.css'

type Props = {
  settings: MetronomeSettings
  locale: Locale
  onChange: (patch: Partial<MetronomeSettings>) => void
  onMeter: (meter: MetronomeSettings['meter']) => void
}

const SIMPLE_SUBS: Record<Subdivision, string> = {
  1: 'quarter',
  2: 'eighth',
  3: 'triplet',
  4: 'sixteenth',
  6: 'sixteenthTriplet',
}
const COMPOUND_SUBS: Partial<Record<Subdivision, string>> = {
  1: 'dottedQuarter',
  3: 'compoundEighth',
  6: 'compoundSixteenth',
}

export function RhythmControls({ settings, locale, onChange, onMeter }: Props) {
  const { t } = useTranslation()
  const meter = getMeter(settings.meter)
  const subNames = meter.compound ? COMPOUND_SUBS : SIMPLE_SUBS
  const swingable = canSwing(meter, settings.sub)

  return (
    <div className={controls.panel}>
      <div className={controls.row}>
        <Segmented
          label={t('metronome.meter')}
          value={settings.meter}
          options={METER_IDS.map((m) => ({ value: m, label: m }))}
          onChange={onMeter}
        />
        <Segmented
          label={t('metronome.subdivision')}
          value={settings.sub}
          options={subdivisionsFor(meter).map((s) => ({
            value: s,
            label: t(`metronome.subs.${subNames[s]}`),
          }))}
          onChange={(sub) => onChange({ sub })}
        />
        <Slider
          label={t('metronome.swing')}
          display={settings.swing === 0 || !swingable ? t('metronome.straight') : `${settings.swing} %`}
          value={settings.swing}
          min={0}
          max={100}
          disabled={!swingable}
          onChange={(swing) => onChange({ swing })}
        />
      </div>
      <div className={controls.row}>
        <Select
          label={t('metronome.pattern')}
          value={settings.pattern}
          options={[
            { value: 'none', label: t('metronome.none') },
            // The library lists basics before grooves, so groups come out contiguous.
            ...patternsFor(settings.meter).map((p) => ({
              value: p.id,
              label: t(`metronome.patterns.${p.id}`),
              group: t(`metronome.groups.${p.group}`),
            })),
          ]}
          onChange={(pattern) => onChange({ pattern })}
        />
        <Select
          label={t('metronome.root')}
          value={settings.root}
          options={KEY_IDS.map((k) => ({
            value: k,
            label: keySpellings(k)
              .map((n) => formatNote(n, locale))
              .join('/'),
          }))}
          onChange={(root) => isKeyId(root) && onChange({ root })}
        />
        <Slider
          label={t('metronome.clickVolume')}
          display={`${settings.click} %`}
          value={settings.click}
          min={0}
          max={100}
          onChange={(click) => onChange({ click })}
        />
        <Slider
          label={t('metronome.bassVolume')}
          display={`${settings.bass} %`}
          value={settings.bass}
          min={0}
          max={100}
          disabled={settings.pattern === 'none'}
          onChange={(bass) => onChange({ bass })}
        />
        <Toggle
          label={t('metronome.countIn')}
          checked={settings.countIn}
          onChange={(countIn) => onChange({ countIn })}
        />
      </div>
    </div>
  )
}

export function TrainerControls({ settings, onChange }: Omit<Props, 'onMeter' | 'locale'>) {
  const { t } = useTranslation()
  const { speed, gap } = settings
  return (
    <div className={styles.trainers}>
      <section className={styles.trainer}>
        <Toggle
          label={t('metronome.speedTrainer')}
          checked={settings.speedOn}
          onChange={(speedOn) => onChange({ speedOn })}
        />
        <p className={styles.help}>{t('metronome.speedHelp')}</p>
        <div className={controls.row}>
          <NumberField
            label={t('metronome.target')}
            value={speed.target}
            min={30}
            max={300}
            disabled={!settings.speedOn}
            onChange={(target) => onChange({ speed: { ...speed, target } })}
          />
          <NumberField
            label={t('metronome.step')}
            value={speed.step}
            min={1}
            max={50}
            disabled={!settings.speedOn}
            onChange={(step) => onChange({ speed: { ...speed, step } })}
          />
          <NumberField
            label={t('metronome.every')}
            value={speed.every}
            min={1}
            max={32}
            disabled={!settings.speedOn}
            onChange={(every) => onChange({ speed: { ...speed, every } })}
          />
        </div>
      </section>
      <section className={styles.trainer}>
        <Toggle
          label={t('metronome.gapTrainer')}
          checked={settings.gapOn}
          onChange={(gapOn) => onChange({ gapOn })}
        />
        <p className={styles.help}>{t('metronome.gapHelp')}</p>
        <div className={controls.row}>
          <NumberField
            label={t('metronome.play')}
            value={gap.play}
            min={1}
            max={16}
            disabled={!settings.gapOn}
            onChange={(play) => onChange({ gap: { ...gap, play } })}
          />
          <NumberField
            label={t('metronome.mute')}
            value={gap.mute}
            min={1}
            max={16}
            disabled={!settings.gapOn}
            onChange={(mute) => onChange({ gap: { ...gap, mute } })}
          />
        </div>
      </section>
    </div>
  )
}
