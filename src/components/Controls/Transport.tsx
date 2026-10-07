import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { BPM_MAX, BPM_MIN } from '../../features/scales/scaleState'
import { DIRECTIONS, type Direction } from '../../theory/sequence'
import { Segmented, Toggle } from './fields'
import styles from './Controls.module.css'

type Props = {
  isPlaying: boolean
  bpm: number
  direction: Direction
  loop: boolean
  onPlay: () => void
  onStop: () => void
  onChange: (patch: { bpm?: number; direction?: Direction; loop?: boolean }) => void
}

export function Transport({ isPlaying, bpm, direction, loop, onPlay, onStop, onChange }: Props) {
  const { t } = useTranslation()
  const tempoId = useId()

  return (
    <div className={`${styles.panel} ${styles.transport}`}>
      <button
        type="button"
        className={isPlaying ? `${styles.play} ${styles.playing}` : styles.play}
        onClick={isPlaying ? onStop : onPlay}
      >
        <span aria-hidden>{isPlaying ? '■' : '▶'}</span>
        {isPlaying ? t('player.stop') : t('player.play')}
      </button>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={tempoId}>
          {t('player.tempo')} · <output>{t('player.bpm', { bpm })}</output>
        </label>
        <input
          id={tempoId}
          className={styles.range}
          type="range"
          min={BPM_MIN}
          max={BPM_MAX}
          step={1}
          value={bpm}
          onChange={(e) => onChange({ bpm: Number(e.target.value) })}
        />
      </div>

      <Segmented
        label={t('player.direction')}
        value={direction}
        options={DIRECTIONS.map((d) => ({ value: d, label: t(`player.${d}`) }))}
        onChange={(d) => onChange({ direction: d })}
      />
      <Toggle label={t('player.loop')} checked={loop} onChange={(l) => onChange({ loop: l })} />
      <p className={styles.hint}>{t('player.hint')}</p>
    </div>
  )
}
