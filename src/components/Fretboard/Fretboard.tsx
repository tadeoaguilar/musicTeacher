import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { FretNote } from '../../theory/fretboard'
import { openStringMidi, positionKey } from '../../theory/fretboard'
import { formatInterval, formatNote, type Locale } from '../../theory/notes'
import type { Tuning } from '../../theory/tunings'
import { createLayout } from './geometry'
import { Neck } from './Neck'
import { NoteMarker } from './NoteMarker'
import { Strings } from './Strings'
import styles from './Fretboard.module.css'

export type LabelMode = 'note' | 'interval'

/** A quiz marker: the answer, the same note in another octave, or a wrong tap. */
export type FretMark = {
  string: number
  fret: number
  kind: 'target' | 'octave' | 'wrong'
  label: string
  ariaLabel: string
}

type Props = {
  tuning: Tuning
  fretCount: number
  notes: FretNote[]
  labels: LabelMode
  leftHanded: boolean
  locale: Locale
  /** Positions ("string-fret") of the suggested fingering. */
  path: Set<string>
  /** Position ("string-fret") of the note sounding right now. */
  active: string | null
  title: string
  onPlay: (midi: number) => void
  /**
   * Quiz mode: every fret becomes a labelled, keyboard-reachable button that
   * reports the tap instead of playing it.
   */
  onFretTap?: (string: number, fret: number) => void
  marks?: FretMark[]
}

export function Fretboard({
  tuning,
  fretCount,
  notes,
  labels,
  leftHanded,
  locale,
  path,
  active,
  title,
  onPlay,
  onFretTap,
  marks = [],
}: Props) {
  const { t } = useTranslation()
  const layout = createLayout(tuning.strings.length, fretCount, leftHanded)
  const { x, fretWireX, stringY, noteX, width, height, nutX } = layout
  const openMidis = openStringMidi(tuning)
  const frets = Array.from({ length: fretCount + 1 }, (_, i) => i)
  const cellEdges = (fret: number): [number, number] =>
    fret === 0 ? [nutX - 46, nutX] : [fretWireX(fret - 1), fretWireX(fret)]

  return (
    <div className={styles.scroller}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${width} ${height}`}
        style={{ minWidth: Math.round(width * 0.8) }}
        role="group"
        aria-label={title}
      >
        <Neck layout={layout} fretCount={fretCount} stringCount={tuning.strings.length} />
        <Strings layout={layout} fretCount={fretCount} openNotes={tuning.strings} locale={locale} />

        {/* Any fret, in the scale or not, can be clicked to hear it (or, in a quiz, to answer). */}
        <g aria-hidden={onFretTap ? undefined : true}>
          {openMidis.map((openMidi, s) =>
            frets.map((fret) => {
              const [a, b] = cellEdges(fret).map(x)
              const tap = () => (onFretTap ? onFretTap(s, fret) : onPlay(openMidi + fret))
              const quiz = onFretTap && {
                role: 'button',
                tabIndex: 0,
                'aria-label': t('fretboard.cell', {
                  string: formatNote(tuning.strings[s], locale),
                  fret,
                }),
                onKeyDown: (e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    tap()
                  }
                },
              }
              return (
                <rect
                  key={`${s}-${fret}`}
                  className={styles.cell}
                  x={Math.min(a, b)}
                  y={stringY(s) - 22}
                  width={Math.abs(b - a)}
                  height={44}
                  onClick={tap}
                  {...quiz}
                />
              )
            }),
          )}
        </g>

        {notes.map((n) => {
          const interval = n.interval
          const intervalText = n.isRoot ? t('fretboard.root') : t('fretboard.degree', { degree: interval })
          const ariaLabel =
            t('fretboard.note', {
              note: formatNote(n.name, locale),
              interval: intervalText,
              string: formatNote(tuning.strings[n.string], locale),
              fret: n.fret,
            }) + (n.isStart ? `, ${t('fretboard.start')}` : '')
          return (
            <NoteMarker
              key={positionKey(n)}
              cx={x(noteX(n.fret))}
              cy={stringY(n.string)}
              label={labels === 'note' ? formatNote(n.name, locale) : formatInterval(interval)}
              ariaLabel={ariaLabel}
              isRoot={n.isRoot}
              isStart={n.isStart}
              inPath={path.has(positionKey(n))}
              isActive={active === positionKey(n)}
              onPlay={() => onPlay(n.midi)}
            />
          )
        })}

        {marks.map((m) => (
          <g
            key={`mark-${positionKey(m)}`}
            className={`${styles.mark} ${styles[m.kind]}`}
            role="img"
            aria-label={m.ariaLabel}
            data-mark={m.kind}
            transform={`translate(${x(noteX(m.fret))} ${stringY(m.string)})`}
          >
            <circle r={15} />
            <text className={styles.markerLabel} aria-hidden>
              {m.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
