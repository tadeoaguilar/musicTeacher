import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { useUrlSync } from '../../app/useUrlSync'
import { audioEngine } from '../../audio/SynthEngine'
import { Segmented, Toggle } from '../../components/Controls/fields'
import { TuningFields } from '../../components/Controls/TuningFields'
import { Fretboard, type FretMark } from '../../components/Fretboard/Fretboard'
import {
  LEVELS,
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
import { isLocale } from '../../i18n'
import { openStringMidi } from '../../theory/fretboard'
import { formatNote } from '../../theory/notes'
import { keySpellings, type KeyId } from '../../theory/scales'
import { FRET_COUNTS, getTuning } from '../../theory/tunings'
import { earFromParams, earToParams, pickEar, useEarStore, type EarSettings } from './earState'
import { useItemStats } from './useItemStats'
import controls from '../../components/Controls/Controls.module.css'
import styles from './EarPage.module.css'

type Answer = { position: Position; midi: number; verdict: Verdict }

const optionsFor = (s: EarSettings): FindNoteOptions => ({
  tuning: getTuning(s.tuning)!,
  frets: s.frets,
  level: s.level,
})

export function EarPage() {
  const { t } = useTranslation()
  const { lang } = useParams()
  const locale = isLocale(lang) ? lang : 'en'
  const settings = useUrlSync(useEarStore, {
    pick: pickEar,
    fromParams: earFromParams,
    toParams: earToParams,
  })
  const set = useEarStore((s) => s.set)
  const options = useMemo(() => optionsFor(settings), [settings])
  const { tuning } = options

  const [random] = useState(() => createRandom())
  const [stats, record] = useItemStats('ear.findNote')
  const [question, setQuestion] = useState(() => nextQuestion(options, random, stats))
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [score, setScore] = useState(EMPTY_SCORE)

  const nextButton = useRef<HTMLButtonElement>(null)

  useEffect(() => () => audioEngine.stop(), [])
  // After answering, Next is the only thing to do: focus it, so Enter moves on.
  useEffect(() => {
    if (answer) nextButton.current?.focus()
  }, [answer])

  /** "C♯/D♭" for a pitch class, in the page's language. */
  const nameOf = (pc: KeyId) =>
    keySpellings(pc)
      .map((n) => formatNote(n, locale))
      .join('/')

  const hear = () => void audioEngine.playNote(question.midi)

  const tap = (string: number, fret: number) => {
    const midi = openStringMidi(tuning)[string] + fret
    void audioEngine.playNote(midi)
    if (answer) return
    const verdict = judge(question, midi)
    setAnswer({ position: { string, fret }, midi, verdict })
    setScore((s) => addToScore(s, isCorrect(verdict)))
    record(question.pitchClass, isCorrect(verdict))
  }

  const ask = (opts: FindNoteOptions, play: boolean) => {
    const q = nextQuestion(opts, random, stats, question)
    setQuestion(q)
    setAnswer(null)
    if (play) void audioEngine.playNote(q.midi)
  }

  const change = (patch: Partial<EarSettings>) => {
    set(patch)
    // A different level or neck changes which notes can be asked.
    if ('level' in patch || 'tuning' in patch || 'frets' in patch)
      ask(optionsFor({ ...settings, ...patch }), false)
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
  const toPractice = weakest(stats).map((pc) => nameOf(pc as KeyId))

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>{t('ear.title')}</h1>
        <p className={styles.description}>{t('ear.description')}</p>
      </header>

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
          <button type="button" className={styles.hear} onClick={hear}>
            <span aria-hidden>▶</span> {t('ear.hear')}
          </button>
          {answer && (
            <button
              ref={nextButton}
              type="button"
              className={controls.play}
              onClick={() => ask(options, true)}
            >
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

      <section className={`${controls.panel} ${styles.progress}`} aria-label={t('ear.progress')}>
        <dl className={styles.score}>
          <div>
            <dt>{t('ear.score')}</dt>
            <dd>
              {score.right}/{score.total}
            </dd>
          </div>
          <div>
            <dt>{t('ear.streak')}</dt>
            <dd>{score.streak}</dd>
          </div>
          <div>
            <dt>{t('ear.best')}</dt>
            <dd>{score.best}</dd>
          </div>
        </dl>
        {toPractice.length > 0 && (
          <p className={styles.practice}>
            {t('ear.practiceMore')}: <strong>{toPractice.join(', ')}</strong>
          </p>
        )}
      </section>

      <div className={controls.panel}>
        <Segmented
          label={t('ear.level')}
          value={settings.level}
          wrap
          options={LEVELS.map((n) => ({ value: n, label: t(`ear.levels.${n}`) }))}
          onChange={(level) => change({ level })}
        />
        <div className={controls.row}>
          <TuningFields tuning={settings.tuning} locale={locale} onChange={(tuning) => change({ tuning })} />
          <Segmented
            label={t('controls.frets')}
            value={settings.frets}
            options={FRET_COUNTS.map((n) => ({ value: n, label: n }))}
            onChange={(frets) => change({ frets })}
          />
          <Toggle
            label={t('ear.showName')}
            checked={settings.showName}
            onChange={(showName) => change({ showName })}
          />
          <Toggle
            label={t('controls.leftHanded')}
            checked={settings.leftHanded}
            onChange={(leftHanded) => change({ leftHanded })}
          />
        </div>
      </div>
    </div>
  )
}
