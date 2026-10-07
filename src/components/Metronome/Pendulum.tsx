import type { Ref } from 'react'
import styles from './Metronome.module.css'

/**
 * A classic metronome arm. The parent rotates `armRef` directly every animation
 * frame (no React re-render), so the swing stays smooth.
 */
export function Pendulum({ armRef }: { armRef: Ref<SVGGElement> }) {
  return (
    <svg className={styles.pendulum} viewBox="0 0 200 150" aria-hidden>
      <path className={styles.pendulumBody} d="M70 140 L130 140 L112 20 L88 20 Z" />
      <path className={styles.pendulumScale} d="M60 128 A 85 85 0 0 1 140 128" />
      <g ref={armRef} className={styles.pendulumArmGroup}>
        <line className={styles.pendulumArm} x1="100" y1="132" x2="100" y2="22" />
        <rect className={styles.pendulumWeight} x="90" y="52" width="20" height="16" rx="3" />
      </g>
      <circle className={styles.pendulumPivot} cx="100" cy="132" r="5" />
    </svg>
  )
}
