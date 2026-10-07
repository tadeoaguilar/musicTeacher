import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { useUrlSync } from '../../app/useUrlSync'
import { metronomeEngine, type EngineSettings } from '../../audio/MetronomeEngine'
import { BeatLights } from '../../components/Metronome/BeatLights'
import { RhythmControls, TrainerControls } from '../../components/Metronome/MetronomeControls'
import { Pendulum } from '../../components/Metronome/Pendulum'
import { RhythmStaff } from '../../components/Metronome/RhythmStaff'
import { isLocale } from '../../i18n'
import { cycleAccent } from '../../rhythm/bar'
import { getMeter } from '../../rhythm/meters'
import { layoutRhythm, type RhythmLayout } from '../../rhythm/notation'
import { findPattern, subdivisionPattern } from '../../rhythm/patterns'
import { BPM_MAX, BPM_MIN, tapTempo } from '../../rhythm/tapTempo'
import { noteChroma } from '../../theory/notes'
import {
  metronomeFromParams,
  metronomeToParams,
  pickMetronome,
  useMetronomeStore,
  withMeter,
  type MetronomeSettings,
} from './metronomeState'
import controls from '../../components/Controls/Controls.module.css'
import styles from './MetronomePage.module.css'

/** What the UI shows about the moment being heard. */
type Playhead = {
  bar: number
  beat: number
  step: number
  note: number | undefined
  countIn: boolean
  muted: boolean
  bpm: number
  barsToNextStep: number | undefined
}

const SWING_ARC = 28 // degrees either side

/** Bass notes sit in the bass's low register: B0 up to A#1. */
const rootMidi = (root: string) => 23 + ((noteChroma(root) - 11 + 12) % 12)

function toEngine(s: MetronomeSettings): EngineSettings {
  return {
    meter: s.meter,
    sub: s.sub,
    swing: s.swing / 100,
    accents: s.accents,
    pattern: findPattern(s.meter, s.pattern),
    bpm: s.bpm,
    countIn: s.countIn,
    speed: s.speedOn ? s.speed : undefined,
    gap: s.gapOn ? s.gap : undefined,
    rootMidi: rootMidi(s.root),
    click: s.click,
    bass: s.bass,
  }
}

/** Index of the note or rest at a point in the bar. */
function noteAt(layout: RhythmLayout, tick: number): number | undefined {
  return layout.glyphs.findLast((g) => g.start <= tick)?.index
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(target.tagName)

export function MetronomePage() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const locale = isLocale(lang) ? lang : 'en'
  const settings = useUrlSync(useMetronomeStore, {
    pick: pickMetronome,
    fromParams: metronomeFromParams,
    toParams: metronomeToParams,
  })
  const { isRunning, set, setRunning } = useMetronomeStore(
    useShallow((s) => ({ isRunning: s.isRunning, set: s.set, setRunning: s.setRunning })),
  )
  const meter = getMeter(settings.meter)
  const pattern = findPattern(settings.meter, settings.pattern)
  const layout = useMemo(
    () => layoutRhythm(pattern ?? subdivisionPattern(settings.meter, settings.sub), settings.meter),
    [pattern, settings.meter, settings.sub],
  )

  // The engine and animation loop read the latest values through refs, without restarting.
  const engineSettings = useRef(toEngine(settings))
  const layoutRef = useRef(layout)
  useEffect(() => {
    engineSettings.current = toEngine(settings)
    layoutRef.current = layout
    metronomeEngine.setVolumes(settings)
  }, [settings, layout])

  const start = () => {
    setRunning(true)
    void metronomeEngine.start(() => engineSettings.current)
  }
  const stop = () => {
    metronomeEngine.stop()
    setRunning(false)
  }
  const toggle = () => (useMetronomeStore.getState().isRunning ? stop() : start())

  useEffect(
    () => () => {
      metronomeEngine.stop()
      useMetronomeStore.getState().setRunning(false)
    },
    [],
  )

  // Animation: rotate the pendulum every frame; re-render only when the beat, step or note changes.
  const armRef = useRef<SVGGElement>(null)
  const [latestPlayhead, setPlayhead] = useState<Playhead>()
  // A stale playhead from the last run is ignored once stopped.
  const playhead = isRunning ? latestPlayhead : undefined
  useEffect(() => {
    const arm = armRef.current
    if (!isRunning) {
      arm?.style.setProperty('transform', 'rotate(0deg)')
      return
    }
    let frame = 0
    let last = ''
    const loop = () => {
      const pos = metronomeEngine.getPosition()
      if (pos) {
        const s = engineSettings.current
        const l = layoutRef.current
        const globalBeat = pos.bar * pos.beats + pos.beat
        arm?.style.setProperty(
          'transform',
          `rotate(${SWING_ARC * Math.cos(Math.PI * (globalBeat + pos.progress))}deg)`,
        )
        const next: Playhead = {
          bar: pos.bar,
          beat: pos.beat,
          step: pos.plan.countIn ? 0 : Math.floor(pos.progress * s.sub),
          note: pos.plan.countIn ? undefined : noteAt(l, (pos.beat + pos.progress) * l.beatTicks),
          countIn: pos.plan.countIn,
          muted: pos.plan.muted,
          bpm: s.speed ? pos.plan.bpm : s.bpm,
          barsToNextStep: pos.plan.barsToNextStep,
        }
        const key = JSON.stringify(next)
        if (key !== last) {
          last = key
          setPlayhead(next)
        }
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [isRunning])

  // Keep phones awake while practicing.
  useEffect(() => {
    if (!isRunning || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    navigator.wakeLock
      .request('screen')
      .then((l) => (lock = l))
      .catch(() => {})
    return () => void lock?.release()
  }, [isRunning])

  const taps = useRef<number[]>([])
  const tap = () => {
    const result = tapTempo(taps.current, performance.now())
    taps.current = result.taps
    if (result.bpm) set({ bpm: result.bpm })
  }
  const nudge = (delta: number) =>
    set({ bpm: Math.min(BPM_MAX, Math.max(BPM_MIN, useMetronomeStore.getState().bpm + delta)) })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ') toggle()
      else if (e.key === 't' || e.key === 'T') tap()
      else if (e.key === 'ArrowUp') nudge(e.shiftKey ? 5 : 1)
      else if (e.key === 'ArrowDown') nudge(e.shiftKey ? -5 : -1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const change = (patch: Partial<MetronomeSettings>) => set(patch)
  const changeMeter = (m: MetronomeSettings['meter']) =>
    set(withMeter(pickMetronome(useMetronomeStore.getState()), m))

  const status = playhead?.countIn
    ? t('metronome.countingIn')
    : playhead?.muted
      ? t('metronome.silentBar')
      : playhead
        ? t('metronome.bar', { bar: playhead.bar + 1 - (settings.countIn ? 1 : 0) })
        : undefined
  const trainerStatus =
    playhead && settings.speedOn && !playhead.countIn
      ? `${t('metronome.nowPlaying', { bpm: playhead.bpm })} · ${
          playhead.barsToNextStep
            ? t('metronome.nextStep', { count: playhead.barsToNextStep })
            : t('metronome.reachedTarget')
        }`
      : undefined
  const patternName = pattern ? t(`metronome.patterns.${pattern.id}`) : t('metronome.none')

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>{t('metronome.title')}</h1>
        <p className={styles.description}>{t('metronome.description')}</p>
      </header>

      <section className={`${controls.panel} ${styles.stage}`} aria-label={t('metronome.title')}>
        <div className={styles.tempo}>
          <div className={styles.bpmRow}>
            <button
              type="button"
              className={styles.nudge}
              onClick={() => nudge(-1)}
              aria-label={t('metronome.slower')}
            >
              −
            </button>
            <div className={styles.bpm}>
              <output aria-live="polite">{settings.bpm}</output>
              <span>BPM</span>
            </div>
            <button
              type="button"
              className={styles.nudge}
              onClick={() => nudge(1)}
              aria-label={t('metronome.faster')}
            >
              +
            </button>
          </div>
          <input
            className={styles.bpmSlider}
            type="range"
            min={BPM_MIN}
            max={BPM_MAX}
            value={settings.bpm}
            aria-label={t('metronome.tempo')}
            onChange={(e) => set({ bpm: Number(e.target.value) })}
          />
          <div className={styles.buttons}>
            <button
              type="button"
              className={isRunning ? `${controls.play} ${controls.playing}` : controls.play}
              onClick={toggle}
            >
              <span aria-hidden>{isRunning ? '■' : '▶'}</span>
              {isRunning ? t('metronome.stop') : t('metronome.start')}
            </button>
            <button type="button" className={styles.tap} onClick={tap}>
              {t('metronome.tap')}
            </button>
          </div>
        </div>

        <div className={styles.visual}>
          <Pendulum armRef={armRef} />
          <BeatLights
            accents={settings.accents}
            sub={playhead?.countIn ? 1 : settings.sub}
            beat={playhead?.beat}
            step={playhead?.step}
            countIn={!!playhead?.countIn}
            onCycle={(i) => set({ accents: settings.accents.map((a, j) => (j === i ? cycleAccent(a) : a)) })}
          />
          <p className={styles.status} aria-live="polite">
            {status}
            {trainerStatus && <strong> · {trainerStatus}</strong>}
          </p>
          <p className={styles.help}>{t('metronome.accentsHelp')}</p>
          <p className={`${styles.help} ${styles.shortcuts}`}>{t('metronome.shortcuts')}</p>
        </div>
      </section>

      <section className={`${controls.panel} ${styles.notation}`}>
        <RhythmStaff
          layout={layout}
          meter={settings.meter}
          active={playhead?.muted ? undefined : playhead?.note}
          label={t('metronome.notationLabel', { pattern: patternName, meter: meter.id })}
        />
      </section>

      <RhythmControls settings={settings} locale={locale} onChange={change} onMeter={changeMeter} />
      <TrainerControls settings={settings} onChange={change} />
    </div>
  )
}
