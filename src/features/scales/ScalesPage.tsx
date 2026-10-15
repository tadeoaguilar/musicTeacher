import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { audioEngine } from '../../audio/BassEngine'
import { ScaleControls } from '../../components/Controls/ScaleControls'
import { Transport } from '../../components/Controls/Transport'
import { Fretboard } from '../../components/Fretboard/Fretboard'
import { NeckLegend, NoteSetHeader } from '../../components/NoteSet/NoteSetHeader'
import { getFretboardNotes, positionKey } from '../../theory/fretboard'
import { isLocale } from '../../i18n'
import { formatInterval, formatNote } from '../../theory/notes'
import { resolveScale } from '../../theory/scales'
import { buildPlaySequence } from '../../theory/sequence'
import { getTuning } from '../../theory/tunings'
import { useUrlSync } from '../../app/useUrlSync'
import {
  pickSettings,
  settingsFromParams,
  settingsToParams,
  useScaleStore,
  type ScaleSettings,
} from './scaleState'
import styles from './ScalesPage.module.css'

export function ScalesPage() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const locale = isLocale(lang) ? lang : 'en'
  const settings = useUrlSync(useScaleStore, {
    pick: pickSettings,
    fromParams: settingsFromParams,
    toParams: settingsToParams,
  })
  const { activeIndex, isPlaying, set, setPlayback } = useScaleStore()
  const { key, scale, frets, direction, loop, bpm } = settings
  const tuning = getTuning(settings.tuning)!

  const resolved = useMemo(() => resolveScale(key, scale), [key, scale])
  const notes = useMemo(() => getFretboardNotes(tuning, frets, resolved), [tuning, frets, resolved])
  const sequence = useMemo(() => buildPlaySequence(notes, direction, loop), [notes, direction, loop])
  const path = useMemo(() => new Set(buildPlaySequence(notes, 'up').map(positionKey)), [notes])
  const active = activeIndex !== null && sequence[activeIndex] ? positionKey(sequence[activeIndex]) : null

  useEffect(() => () => audioEngine.stop(), [])

  const play = () => {
    setPlayback({ isPlaying: true })
    void audioEngine.playSequence(
      sequence.map((n) => n.midi),
      { bpm, loop, onNote: (i) => setPlayback({ activeIndex: i, isPlaying: i !== null }) },
    )
  }

  const change = (patch: Partial<ScaleSettings>) => {
    set(patch)
    if (!isPlaying) return
    // Tempo can change live; anything else changes the notes, so stop.
    if (patch.bpm !== undefined) audioEngine.setBpm(patch.bpm)
    if (Object.keys(patch).some((k) => k !== 'bpm')) audioEngine.stop()
  }

  const scaleName = t(`scales.names.${scale}`)
  const title = t('scales.heading', { key: formatNote(resolved.tonic, locale), scale: scaleName })

  return (
    <div className={styles.page}>
      <NoteSetHeader
        title={title}
        description={t(`scales.descriptions.${scale}`)}
        notes={resolved.notes.map((n) => formatNote(n, locale))}
        intervals={resolved.intervals.map(formatInterval)}
      />
      <NeckLegend intro={t('scales.intro')} pathLabel={t('scales.legend.path')} />

      <Fretboard
        tuning={tuning}
        fretCount={frets}
        notes={notes}
        labels={settings.labels}
        leftHanded={settings.leftHanded}
        locale={locale}
        path={path}
        active={active}
        title={t('fretboard.label', { scale: title, strings: tuning.strings.length })}
        onPlay={(midi) => void audioEngine.playNote(midi)}
      />

      <Transport
        isPlaying={isPlaying}
        bpm={bpm}
        direction={direction}
        loop={loop}
        onPlay={play}
        onStop={() => audioEngine.stop()}
        onChange={change}
      />

      <ScaleControls settings={settings} locale={locale} onChange={change} />
    </div>
  )
}
