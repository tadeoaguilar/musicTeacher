import { useTranslation } from 'react-i18next'
import { IN_TUNE_CENTS } from '../../pitch/tuner'
import { formatNote, parseNote, type Locale } from '../../theory/notes'
import styles from './Tuner.module.css'

type Props = {
  /** The note being heard, spelled with an octave ("A1"), or null for none. */
  note: { name: string; cents: number; hz: number } | null
  listening: boolean
  locale: Locale
}

const CX = 160
const CY = 170
const RADIUS = 140
/** ±50 cents spans ±60° of arc. */
const DEGREES_PER_CENT = 60 / 50

/** Where a cents value sits on a circle of radius r around the needle's hub. */
const polar = (cents: number, r: number) => {
  const a = (cents * DEGREES_PER_CENT * Math.PI) / 180
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) }
}

const zoneStart = polar(-IN_TUNE_CENTS, RADIUS)
const zoneEnd = polar(IN_TUNE_CENTS, RADIUS)
/** The arc around 0 cents that counts as in tune. */
const zonePath = `M${zoneStart.x},${zoneStart.y} A${RADIUS},${RADIUS} 0 0 1 ${zoneEnd.x},${zoneEnd.y}`

/** A needle gauge from 50 cents flat to 50 cents sharp, with the note's name below it. */
export function TunerMeter({ note, listening, locale }: Props) {
  const { t } = useTranslation()
  const cents = note ? Math.round(note.cents) : 0
  const inTune = note !== null && Math.abs(note.cents) <= IN_TUNE_CENTS
  const parsed = note ? parseNote(note.name) : undefined
  const display = note ? formatNote(note.name, locale) : '—'

  const status = !note
    ? t(listening ? 'tuner.listening' : 'tuner.idle')
    : inTune
      ? t('tuner.inTune')
      : t(cents < 0 ? 'tuner.flat' : 'tuner.sharp', { cents: Math.abs(cents) })

  return (
    <div className={inTune ? `${styles.meter} ${styles.inTune}` : styles.meter}>
      <svg
        className={styles.gauge}
        viewBox="0 0 320 186"
        role="img"
        aria-label={note ? `${display}${parsed?.octave ?? ''}, ${status}` : status}
      >
        <path className={styles.zone} d={zonePath} />
        {Array.from({ length: 11 }, (_, i) => {
          const c = -50 + i * 10
          const inner = polar(c, RADIUS - (c === 0 ? 22 : 12))
          const outer = polar(c, RADIUS + 6)
          return (
            <line
              key={c}
              className={c === 0 ? `${styles.tick} ${styles.centerTick}` : styles.tick}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
            />
          )
        })}
        <text className={styles.gaugeLabel} x={polar(-50, RADIUS + 20).x} y="70" aria-hidden>
          ♭
        </text>
        <text className={styles.gaugeLabel} x={polar(50, RADIUS + 20).x} y="70" aria-hidden>
          ♯
        </text>
        <g
          className={note ? styles.needle : `${styles.needle} ${styles.needleIdle}`}
          style={{ transform: `rotate(${cents * DEGREES_PER_CENT}deg)` }}
        >
          <line x1={CX} y1={CY} x2={CX} y2={CY - RADIUS + 8} />
        </g>
        <circle className={styles.hub} cx={CX} cy={CY} r="7" />
      </svg>

      <div className={styles.readout} aria-hidden>
        <span className={styles.noteName}>
          {display}
          {parsed?.octave !== undefined && <sub>{parsed.octave}</sub>}
        </span>
        <span className={styles.status}>{status}</span>
        <span className={styles.hz}>{note ? `${note.hz.toFixed(1)} Hz` : ' '}</span>
      </div>
    </div>
  )
}
