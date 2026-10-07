import { DOUBLE_INLAY_FRETS, INLAY_FRETS, type Layout } from './geometry'
import styles from './Fretboard.module.css'

type Props = { layout: Layout; fretCount: number; stringCount: number }

/** Wood, nut, fret wires, inlay dots and fret numbers. */
export function Neck({ layout, fretCount, stringCount }: Props) {
  const { x, fretWireX, neckTop, neckBottom, nutX, stringY } = layout
  const neckEnd = fretWireX(fretCount)
  const left = Math.min(x(nutX), x(neckEnd))
  // Inlays sit in the gaps between strings (gap g is between strings g and g + 1), never on a string.
  const gapY = (g: number) => (stringY(g) + stringY(g + 1)) / 2
  const singleY = gapY(Math.floor((stringCount - 2) / 2))
  const doubleOffset = stringCount > 5 ? 1 : 0
  const doubleY = [gapY(doubleOffset), gapY(stringCount - 2 - doubleOffset)]
  const frets = Array.from({ length: fretCount }, (_, i) => i + 1)
  const inlayX = (fret: number) => x((fretWireX(fret - 1) + fretWireX(fret)) / 2)

  return (
    <g>
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={styles.woodEdge} />
          <stop offset="0.5" className={styles.woodCenter} />
          <stop offset="1" className={styles.woodEdge} />
        </linearGradient>
      </defs>

      <rect
        className={styles.wood}
        x={left}
        y={neckTop}
        width={Math.abs(x(neckEnd) - x(nutX))}
        height={neckBottom - neckTop}
        fill="url(#wood)"
        rx={3}
      />

      {frets.map((fret) => {
        if (DOUBLE_INLAY_FRETS.includes(fret)) {
          return (
            <g key={`inlay-${fret}`}>
              {doubleY.map((y) => (
                <circle key={y} className={styles.inlay} cx={inlayX(fret)} cy={y} r={6} />
              ))}
            </g>
          )
        }
        if (INLAY_FRETS.includes(fret)) {
          return (
            <circle key={`inlay-${fret}`} className={styles.inlay} cx={inlayX(fret)} cy={singleY} r={6} />
          )
        }
        return null
      })}

      {frets.map((fret) => (
        <line
          key={`wire-${fret}`}
          className={styles.fretWire}
          x1={x(fretWireX(fret))}
          x2={x(fretWireX(fret))}
          y1={neckTop}
          y2={neckBottom}
        />
      ))}

      <rect
        className={styles.nut}
        x={x(nutX) - 4}
        y={neckTop - 2}
        width={8}
        height={neckBottom - neckTop + 4}
        rx={2}
      />

      {frets.map((fret) => (
        <text
          key={`num-${fret}`}
          className={
            INLAY_FRETS.includes(fret) || DOUBLE_INLAY_FRETS.includes(fret)
              ? `${styles.fretNumber} ${styles.fretNumberMarked}`
              : styles.fretNumber
          }
          x={inlayX(fret)}
          y={neckBottom + 19}
          aria-hidden
        >
          {fret}
        </text>
      ))}
    </g>
  )
}
