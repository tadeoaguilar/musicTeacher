import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { useUrlSync } from '../../app/useUrlSync'
import { audioEngine } from '../../audio/SynthEngine'
import { ArpeggioControls } from '../../components/Controls/ArpeggioControls'
import { Transport } from '../../components/Controls/Transport'
import { Fretboard } from '../../components/Fretboard/Fretboard'
import { NeckLegend, NoteSetHeader } from '../../components/NoteSet/NoteSetHeader'
import { isLocale } from '../../i18n'
import { getChord } from '../../theory/chords'
import { getFretboardNotes, positionKey } from '../../theory/fretboard'
import { formatInterval, formatNote } from '../../theory/notes'
import { resolveNoteSet } from '../../theory/scales'
import { buildPlaySequence } from '../../theory/sequence'
import { getTuning } from '../../theory/tunings'
import {
  arpeggioFromParams,
  arpeggioToParams,
  pickArpeggio,
  useArpeggioStore,
  type ArpeggioSettings,
} from './arpeggioState'
import styles from './ArpeggiosPage.module.css'

export function ArpeggiosPage() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const locale = isLocale(lang) ? lang : 'en'
  const settings = useUrlSync(useArpeggioStore, {
    pick: pickArpeggio,
    fromParams: arpeggioFromParams,
    toParams: arpeggioToParams,
  })
  const { activeIndex, isPlaying, set, setPlayback } = useArpeggioStore(
    useShallow(({ activeIndex, isPlaying, set, setPlayback }) => ({
      activeIndex,
      isPlaying,
      set,
      setPlayback,
    })),
  )
  const { key, chord, octaves, frets, direction, loop, bpm } = settings
  const tuning = getTuning(settings.tuning)!

  const resolved = useMemo(() => resolveNoteSet(key, getChord(chord)), [key, chord])
  const notes = useMemo(() => getFretboardNotes(tuning, frets, resolved), [tuning, frets, resolved])
  const sequence = useMemo(
    () => buildPlaySequence(notes, direction, loop, octaves),
    [notes, direction, loop, octaves],
  )
  const path = useMemo(
    () => new Set(buildPlaySequence(notes, 'up', false, octaves).map(positionKey)),
    [notes, octaves],
  )
  const active = activeIndex !== null && sequence[activeIndex] ? positionKey(sequence[activeIndex]) : null

  useEffect(() => () => audioEngine.stop(), [])

  const play = () => {
    setPlayback({ isPlaying: true })
    void audioEngine.playSequence(
      sequence.map((n) => n.midi),
      { bpm, loop, onNote: (i) => setPlayback({ activeIndex: i, isPlaying: i !== null }) },
    )
  }

  const change = (patch: Partial<ArpeggioSettings>) => {
    set(patch)
    if (!isPlaying) return
    // Tempo can change live; anything else changes the notes, so stop.
    if (patch.bpm !== undefined) audioEngine.setBpm(patch.bpm)
    if (Object.keys(patch).some((k) => k !== 'bpm')) audioEngine.stop()
  }

  // Chord symbols read the same in every language, apart from the root: G7 / Sol7.
  const title = formatNote(resolved.tonic, locale) + formatInterval(getChord(chord).symbol)

  return (
    <div className={styles.page}>
      <NoteSetHeader
        title={title}
        description={`${t(`arpeggios.names.${chord}`)}. ${t(`arpeggios.descriptions.${chord}`)}`}
        notes={resolved.notes.map((n) => formatNote(n, locale))}
        intervals={resolved.intervals.map(formatInterval)}
      />
      <NeckLegend
        intro={t('arpeggios.intro')}
        pathLabel={t(octaves === 2 ? 'arpeggios.pathTwo' : 'arpeggios.pathOne')}
      />

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
        playLabel={t('arpeggios.play')}
        onPlay={play}
        onStop={() => audioEngine.stop()}
        onChange={change}
      />

      <ArpeggioControls settings={settings} locale={locale} onChange={change} />
    </div>
  )
}
