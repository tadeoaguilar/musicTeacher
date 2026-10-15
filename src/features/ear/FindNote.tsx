import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { audioEngine } from '../../audio/BassEngine'
import { Fretboard, type FretMark } from '../../components/Fretboard/Fretboard'
import {
  isCorrect,
  judge,
  maxFretFor,
  nextQuestion,
  otherOctaves,
  pitchClassOf,
  positionsOf,
  type FindNoteOptions,
  type Position,
  type Verdict,
} from '../../ear/findNote'
import { EMPTY_SCORE, addToScore, weakest } from '../../ear/progress'
import { createRandom } from '../../ear/random'
import { openStringMidi } from '../../theory/fretboard'
import { formatNote, type Locale } from '../../theory/notes'
import { keySpellings, type KeyId } from '../../theory/scales'
import { getTuning } from '../../theory/tunings'
import type { EarSettings } from './earState'
import { ScorePanel } from './ScorePanel'
import { useItemStats } from './useItemStats'
import controls from '../../components/Controls/Controls.module.css'
import styles from './EarPage.module.css'

type Answer = { position: Position; midi: number; verdict: Verdict }

/** Exercise 1: the app names and plays a note; tap where it is on the neck. */
export function FindNote({ settings, locale }: { settings: EarSettings; locale: Locale }) {
  const { t } = useTranslation()
  const tuning = getTuning(settings.tuning)!
  const options: FindNoteOptions = { tuning, frets: settings.frets, level: settings.level }

  const [random] = useState(() => createRandom())
  const [stats, record] = useItemStats('ear.findNote')
  const [question, setQuestion] = useState(() => nextQuestion(options, random, stats))
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [score, setScore] = useState(EMPTY_SCORE)

  const ask = (play: boolean) => {
    const q = nextQuestion(options, random, stats, question)
    setQuestion(q)
    setAnswer(null)
    if (play) void audioEngine.playNote(q.midi)
  }

  // A different level or neck changes which notes can be asked: ask again.
  const pool = `${settings.level}|${settings.tuning}|${settings.frets}`
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

  /** "C♯/D♭" for a pitch class, in the page's language. */
  const nameOf = (pc: KeyId) =>
    keySpellings(pc)
      .map((n) => formatNote(n, locale))
      .join('/')

  const tap = (string: number, fret: number) => {
    const midi = openStringMidi(tuning)[string] + fret
    void audioEngine.playNote(midi)
    if (answer) return
    const verdict = judge(question, midi)
    setAnswer({ position: { string, fret }, midi, verdict })
    setScore((s) => addToScore(s, isCorrect(verdict)))
    record(question.pitchClass, isCorrect(verdict))
  }

  const noteName = nameOf(question.pitchClass)
  const marks: FretMark[] = answer
    ? [
        ...positionsOf(question.midi, tuning, settings.frets).map((p) => ({
          ...p,
          kind: 'target' as const,
          label: formatNote(keySpellings(question.pitchClass)[0], locale),
          ariaLabel: t('ear.marks.target', { note: noteName, fret: p.fret }),
        })),
        ...otherOctaves(question.midi, tuning, settings.frets).map((p) => ({
          ...p,
          kind: 'octave' as const,
          label: formatNote(keySpellings(question.pitchClass)[0], locale),
          ariaLabel: t('ear.marks.octave', { note: noteName, fret: p.fret }),
        })),
        ...(answer.verdict === 'wrong'
          ? [
              {
                ...answer.position,
                kind: 'wrong' as const,
                label: formatNote(keySpellings(pitchClassOf(answer.midi))[0], locale),
                ariaLabel: t('ear.marks.wrong', { note: nameOf(pitchClassOf(answer.midi)) }),
              },
            ]
          : []),
      ]
    : []

  const feedback =
    answer &&
    {
      exact: t('ear.exact'),
      higher: t('ear.tappedHigher'),
      lower: t('ear.tappedLower'),
      wrong: t('ear.wrong', { tapped: nameOf(pitchClassOf(answer.midi)), note: noteName }),
    }[answer.verdict]

  return (
    <>
      <section className={`${controls.panel} ${styles.prompt}`} aria-labelledby="ear-exercise">
        <div className={styles.question}>
          <h2 id="ear-exercise" className={styles.exercise}>
            {t('ear.findNote')}
          </h2>
          <p className={styles.noteName} aria-label={settings.showName ? noteName : t('ear.hiddenName')}>
            {settings.showName ? noteName : '?'}
          </p>
          <p className={styles.instruction}>
            {t(settings.showName ? 'ear.prompt' : 'ear.promptHidden', { max: maxFretFor(options) })}
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.hear}
            onClick={() => void audioEngine.playNote(question.midi)}
          >
            <span aria-hidden>▶</span> {t('ear.hear')}
          </button>
          {answer && (
            <button ref={nextButton} type="button" className={controls.play} onClick={() => ask(true)}>
              {t('ear.next')}
            </button>
          )}
        </div>
        <p
          className={answer ? `${styles.feedback} ${styles[answer.verdict]}` : styles.feedback}
          role="status"
          aria-live="polite"
        >
          {feedback}
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
        title={t('ear.fretboard')}
        onPlay={() => {}}
        onFretTap={tap}
        marks={marks}
      />

      {answer && (
        <ul className={styles.legend}>
          <li>
            <span className={`${styles.swatch} ${styles.swatchTarget}`} aria-hidden />
            {t('ear.legend.target')}
          </li>
          <li>
            <span className={`${styles.swatch} ${styles.swatchOctave}`} aria-hidden />
            {t('ear.legend.octave')}
          </li>
          {answer.verdict === 'wrong' && (
            <li>
              <span className={`${styles.swatch} ${styles.swatchWrong}`} aria-hidden />
              {t('ear.legend.wrong')}
            </li>
          )}
        </ul>
      )}

      <ScorePanel score={score} toPractice={weakest(stats).map((pc) => nameOf(pc as KeyId))} />
    </>
  )
}
