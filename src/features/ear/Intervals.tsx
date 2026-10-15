import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { audioEngine } from '../../audio/BassEngine'
import { Fretboard, type FretMark } from '../../components/Fretboard/Fretboard'
import { pitchClassOf, type Position } from '../../ear/findNote'
import {
  DEGREE_LABELS,
  INTERVAL_MAX_FRET,
  firstOf,
  highOf,
  intervalsFor,
  nextIntervalQuestion,
  positionNear,
  semitonesOf,
  shapeOf,
  type IntervalId,
  type IntervalOptions,
  type IntervalQuestion,
} from '../../ear/intervals'
import { EMPTY_SCORE, addToScore, weakest } from '../../ear/progress'
import { createRandom } from '../../ear/random'
import { formatInterval, formatNote, type Locale } from '../../theory/notes'
import { keySpellings } from '../../theory/scales'
import { getTuning } from '../../theory/tunings'
import type { EarSettings } from './earState'
import { ScorePanel } from './ScorePanel'
import { useItemStats } from './useItemStats'
import controls from '../../components/Controls/Controls.module.css'
import styles from './EarPage.module.css'

/** Seconds between the two notes of a melodic interval. */
const GAP = 0.9

function play(q: IntervalQuestion) {
  const low = q.low
  const high = highOf(q)
  if (q.direction === 'together') {
    void audioEngine.playNote(low, { duration: 1.6 })
    void audioEngine.playNote(high, { duration: 1.6 })
    return
  }
  const [first, second] = q.direction === 'up' ? [low, high] : [high, low]
  void audioEngine.playNote(first, { duration: 1 })
  void audioEngine.playNote(second, { duration: 1.3, delay: GAP })
}

/** Exercise 2: the app plays two notes; name the interval, then see its shape on the neck. */
export function Intervals({ settings, locale }: { settings: EarSettings; locale: Locale }) {
  const { t } = useTranslation()
  const tuning = getTuning(settings.tuning)!
  const options: IntervalOptions = {
    tuning,
    frets: settings.frets,
    level: settings.level,
    play: settings.play,
  }
  const maxFret = Math.min(settings.frets, INTERVAL_MAX_FRET)

  const [random] = useState(() => createRandom())
  const [stats, record] = useItemStats('ear.intervals')
  const [question, setQuestion] = useState(() => nextIntervalQuestion(options, random, stats))
  const [answer, setAnswer] = useState<IntervalId | null>(null)
  const [score, setScore] = useState(EMPTY_SCORE)

  const ask = (andPlay: boolean) => {
    const q = nextIntervalQuestion(options, random, stats, question)
    setQuestion(q)
    setAnswer(null)
    if (andPlay) play(q)
  }

  // A different level, neck or direction changes what can be asked: ask again.
  const pool = `${settings.level}|${settings.tuning}|${settings.frets}|${settings.play}`
  const [askedFor, setAskedFor] = useState(pool)
  if (askedFor !== pool) {
    setAskedFor(pool)
    ask(false)
  }

  const nextButton = useRef<HTMLButtonElement>(null)
  // After answering, Next is the only thing to do: focus it, so Enter moves on.
  useEffect(() => {
    if (answer) nextButton.current?.focus()
  }, [answer])

  const choose = (id: IntervalId) => {
    if (answer) return
    const correct = id === question.interval
    setAnswer(id)
    setScore((s) => addToScore(s, correct))
    record(question.interval, correct)
  }

  const nameOf = (id: IntervalId) => t(`ear.intervals.names.${id}`)
  const noteOf = (midi: number) => formatNote(keySpellings(pitchClassOf(midi))[0], locale)
  const correct = answer === question.interval

  const shape = shapeOf(question.low, highOf(question), tuning, maxFret)
  const wrongAt: Position | undefined =
    answer && !correct && shape
      ? positionNear(question.low + semitonesOf(answer), shape.low, tuning, maxFret)
      : undefined
  const marks: FretMark[] =
    answer && shape
      ? [
          {
            ...shape.low,
            kind: 'root',
            label: noteOf(question.low),
            ariaLabel: t('ear.intervals.marks.low', { note: noteOf(question.low), fret: shape.low.fret }),
          },
          {
            ...shape.high,
            kind: 'target',
            label: formatInterval(DEGREE_LABELS[question.interval]),
            ariaLabel: t('ear.intervals.marks.high', {
              interval: nameOf(question.interval),
              note: noteOf(highOf(question)),
              fret: shape.high.fret,
            }),
          },
          ...(wrongAt
            ? [
                {
                  ...wrongAt,
                  kind: 'wrong' as const,
                  label: formatInterval(DEGREE_LABELS[answer]),
                  ariaLabel: t('ear.intervals.marks.wrong', { interval: nameOf(answer), fret: wrongAt.fret }),
                },
              ]
            : []),
        ]
      : []

  return (
    <>
      <section className={`${controls.panel} ${styles.prompt}`} aria-labelledby="ear-exercise">
        <div className={styles.question}>
          <h2 id="ear-exercise" className={styles.exercise}>
            {t('ear.intervals.title')}
          </h2>
          <p className={styles.noteName}>{answer ? nameOf(question.interval) : '?'}</p>
          <p className={styles.instruction}>
            {t('ear.intervals.prompt', { direction: t(`ear.intervals.direction.${question.direction}`) })}
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.hear} onClick={() => play(question)}>
            <span aria-hidden>▶</span> {t('ear.hear')}
          </button>
          <button
            type="button"
            className={styles.hear}
            onClick={() => void audioEngine.playNote(firstOf(question), { duration: 1 })}
          >
            {t('ear.intervals.hearFirst')}
          </button>
          {answer && (
            <button ref={nextButton} type="button" className={controls.play} onClick={() => ask(true)}>
              {t('ear.intervals.next')}
            </button>
          )}
        </div>
        <div className={styles.answers} role="group" aria-label={t('ear.intervals.answers')}>
          {intervalsFor(settings.level).map((id) => {
            const state = !answer
              ? ''
              : id === question.interval
                ? styles.answerRight
                : id === answer
                  ? styles.answerWrong
                  : ''
            return (
              <button
                key={id}
                type="button"
                className={`${styles.answer} ${state}`}
                disabled={!!answer}
                onClick={() => choose(id)}
              >
                {nameOf(id)}
              </button>
            )
          })}
        </div>
        <p
          className={answer ? `${styles.feedback} ${correct ? styles.exact : styles.wrong}` : styles.feedback}
          role="status"
          aria-live="polite"
        >
          {answer &&
            (correct
              ? t('ear.intervals.correct', { interval: nameOf(question.interval) })
              : t('ear.intervals.wrong', { answer: nameOf(answer), interval: nameOf(question.interval) }))}
        </p>
      </section>

      <Fretboard
        tuning={tuning}
        fretCount={settings.frets}
        notes={[]}
        labels="note"
        leftHanded={settings.leftHanded}
        locale={locale}
        path={new Set()}
        active={null}
        title={t('ear.intervals.fretboard')}
        onPlay={(midi) => void audioEngine.playNote(midi)}
        marks={marks}
      />

      {answer && (
        <ul className={styles.legend}>
          <li>
            <span className={`${styles.swatch} ${styles.swatchRoot}`} aria-hidden />
            {t('ear.intervals.legend.low')}
          </li>
          <li>
            <span className={`${styles.swatch} ${styles.swatchTarget}`} aria-hidden />
            {t('ear.intervals.legend.high')}
          </li>
          {wrongAt && (
            <li>
              <span className={`${styles.swatch} ${styles.swatchWrong}`} aria-hidden />
              {t('ear.legend.wrong')}
            </li>
          )}
        </ul>
      )}

      <ScorePanel score={score} toPractice={weakest(stats).map((id) => nameOf(id as IntervalId))} />
    </>
  )
}
