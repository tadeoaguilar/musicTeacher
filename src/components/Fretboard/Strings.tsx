import type { Locale } from '../../theory/notes'
import { formatNote } from '../../theory/notes'
import type { Layout } from './geometry'
import styles from './Fretboard.module.css'

type Props = { layout: Layout; fretCount: number; openNotes: string[]; locale: Locale }

/** Strings drawn thicker toward the low end, with their open-note names. */
export function Strings({ layout, fretCount, openNotes, locale }: Props) {
  const { x, stringY, fretWireX, stringLabelX } = layout
  const start = x(stringLabelX + 16)
  const end = x(fretWireX(fretCount))

  return (
    <g>
      {openNotes.map((note, i) => {
        const y = stringY(i)
        return (
          <g key={i}>
            <line
              className={styles.string}
              x1={start}
              x2={end}
              y1={y}
              y2={y}
              strokeWidth={1.2 + (openNotes.length - 1 - i) * 0.55}
            />
            <text className={styles.stringLabel} x={x(stringLabelX)} y={y} aria-hidden>
              {formatNote(note, locale)}
            </text>
          </g>
        )
      })}
    </g>
  )
}
