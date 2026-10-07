import type { KeyboardEvent } from 'react'
import styles from './Fretboard.module.css'

type Props = {
  cx: number
  cy: number
  label: string
  ariaLabel: string
  isRoot: boolean
  isStart: boolean
  /** Part of the suggested one-octave fingering. */
  inPath: boolean
  isActive: boolean
  onPlay: () => void
}

export function NoteMarker({ cx, cy, label, ariaLabel, isRoot, isStart, inPath, isActive, onPlay }: Props) {
  const className = [styles.marker, isRoot && styles.root, inPath && styles.inPath, isActive && styles.active]
    .filter(Boolean)
    .join(' ')

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPlay()
    }
  }

  return (
    <g
      className={className}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      data-root={isRoot || undefined}
      data-start={isStart || undefined}
      onClick={onPlay}
      onKeyDown={onKeyDown}
      transform={`translate(${cx} ${cy})`}
    >
      {isStart && <circle className={styles.startRing} r={21} />}
      {/* Generous invisible hit area for touch. */}
      <circle className={styles.hit} r={22} />
      <circle className={styles.dot} r={15} />
      <text className={styles.markerLabel} aria-hidden>
        {label}
      </text>
    </g>
  )
}
