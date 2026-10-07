import type { MeterId } from '../../rhythm/meters'
import type { Glyph, RhythmLayout } from '../../rhythm/notation'
import styles from './Metronome.module.css'

type Props = {
  layout: RhythmLayout
  meter: MeterId
  /** Index of the note or rest sounding now. */
  active: number | undefined
  label: string
}

const WIDTH = 760
const LEFT = 64
const RIGHT = 24
const PAD = 18
const LINE_Y = 84
const STEM = 38
const BEAM_Y = LINE_Y - STEM
const STEM_DX = 6.6

function Rest({ g, x }: { g: Glyph; x: number }) {
  const y = LINE_Y
  switch (g.value) {
    case 'whole':
      return <rect x={x - 8} y={y} width={16} height={7} />
    case 'half':
      return <rect x={x - 8} y={y - 7} width={16} height={7} />
    case 'quarter':
      return (
        <path
          className={styles.restStroke}
          d={`M${x - 3} ${y - 22} L${x + 4} ${y - 13} L${x - 3} ${y - 5} L${x + 4} ${y + 3} Q${x - 7} ${y} ${x} ${y + 13}`}
        />
      )
    default: {
      // Eighth rest: one hook; sixteenth rest: two.
      const hooks = g.value === 'sixteenth' ? [y - 12, y - 2] : [y - 10]
      return (
        <g>
          {hooks.map((hy) => (
            <g key={hy}>
              <circle cx={x - 3} cy={hy} r={3.2} />
              <path
                className={styles.restStroke}
                d={`M${x - 3} ${hy + 1} Q${x + 1} ${hy + 3} ${x + 5} ${hy - 3}`}
              />
            </g>
          ))}
          <path className={styles.restStroke} d={`M${x + 5} ${hooks[0] - 3} L${x - 1} ${y + 14}`} />
        </g>
      )
    }
  }
}

function Flag({ x, count }: { x: number; count: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const y = BEAM_Y + i * 8
        return (
          <path
            key={i}
            className={styles.flag}
            d={`M${x} ${y} C${x + 2} ${y + 8} ${x + 13} ${y + 10} ${x + 9} ${y + 24} C${x + 10} ${y + 14} ${x + 4} ${y + 11} ${x} ${y + 9} Z`}
          />
        )
      })}
    </g>
  )
}

/** Rhythm notation on a one-line percussion staff, spaced in proportion to time so it reads like it sounds. */
export function RhythmStaff({ layout, meter, active, label }: Props) {
  const { glyphs, beams, tuplets, barTicks, beatTicks } = layout
  const usable = WIDTH - LEFT - RIGHT - PAD * 2
  const xOf = (tick: number) => LEFT + PAD + (tick / barTicks) * usable
  const stemX = (i: number) => xOf(glyphs[i].start) + STEM_DX
  const [top, bottom] = meter.split('/')
  const beats = barTicks / beatTicks

  return (
    <svg className={styles.staff} viewBox={`0 0 ${WIDTH} 140`} role="img" aria-label={label}>
      <line className={styles.staffLine} x1={10} x2={WIDTH - 10} y1={LINE_Y} y2={LINE_Y} />
      <line className={styles.barLine} x1={WIDTH - 10} x2={WIDTH - 10} y1={LINE_Y - 22} y2={LINE_Y + 22} />
      <text className={styles.timeSig} x={32} y={LINE_Y - 4}>
        {top}
      </text>
      <text className={styles.timeSig} x={32} y={LINE_Y + 24}>
        {bottom}
      </text>

      {Array.from({ length: beats }, (_, b) => (
        <text key={b} className={styles.count} x={xOf(b * beatTicks)} y={132}>
          {b + 1}
        </text>
      ))}

      {glyphs.map((g) => {
        const x = xOf(g.start)
        const className = g.index === active ? `${styles.glyph} ${styles.glyphActive}` : styles.glyph
        if (g.rest) {
          return (
            <g key={g.index} className={className} data-rest>
              <Rest g={g} x={x} />
              {g.dotted && <circle cx={x + 12} cy={LINE_Y - 6} r={2.4} />}
            </g>
          )
        }
        const hollow = g.value === 'whole' || g.value === 'half'
        return (
          <g key={g.index} className={className} data-note>
            <ellipse
              className={hollow ? styles.hollow : undefined}
              cx={x}
              cy={LINE_Y}
              rx={7.6}
              ry={5.4}
              transform={`rotate(-20 ${x} ${LINE_Y})`}
            />
            {g.value !== 'whole' && (
              <line className={styles.stem} x1={x + STEM_DX} x2={x + STEM_DX} y1={LINE_Y - 2} y2={BEAM_Y} />
            )}
            {g.flagged && <Flag x={x + STEM_DX} count={g.value === 'sixteenth' ? 2 : 1} />}
            {g.dotted && <circle cx={x + 14} cy={LINE_Y - 3} r={2.4} />}
          </g>
        )
      })}

      {beams.map((beam) => {
        const first = beam.notes[0]
        const last = beam.notes.at(-1)!
        return (
          <g key={first} className={styles.beam}>
            <rect x={stemX(first) - 0.8} y={BEAM_Y} width={stemX(last) - stemX(first) + 1.6} height={5} />
            {beam.secondary.map(([a, b]) => (
              <rect key={a} x={stemX(a) - 0.8} y={BEAM_Y + 8} width={stemX(b) - stemX(a) + 1.6} height={5} />
            ))}
            {beam.stubs.map(({ index, dir }) => (
              <rect
                key={index}
                x={dir === 1 ? stemX(index) - 0.8 : stemX(index) - 10}
                y={BEAM_Y + 8}
                width={10.8}
                height={5}
              />
            ))}
          </g>
        )
      })}

      {tuplets.map(({ first, last, count }) => {
        const x1 = xOf(glyphs[first].start)
        const x2 = xOf(glyphs[last].start) + STEM_DX * 2
        const y = BEAM_Y - 12
        return (
          <g key={first} className={styles.tuplet}>
            <path d={`M${x1} ${y + 6} V${y} H${x2} V${y + 6}`} />
            <text x={(x1 + x2) / 2} y={y - 3}>
              {count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
