import { useTranslation } from 'react-i18next'
import type { Score } from '../../ear/progress'
import controls from '../../components/Controls/Controls.module.css'
import styles from './EarPage.module.css'

/** Score and streaks for this session, and the items missed most (already named). */
export function ScorePanel({ score, toPractice }: { score: Score; toPractice: string[] }) {
  const { t } = useTranslation()
  return (
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
  )
}
