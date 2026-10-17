import { useTranslation } from 'react-i18next'
import type { FeatureId } from '../../access/access'
import { ProBadge } from './ProBadge'
import styles from './Pro.module.css'

type Props = {
  feature: FeatureId
  onLearnMore: () => void
}

/** A locked Pro feature on a page: what it is, and a button to the paywall. */
export function ProTeaser({ feature, onLearnMore }: Props) {
  const { t } = useTranslation()
  return (
    <section className={styles.teaser} aria-label={t(`pro.features.${feature}.title`)}>
      <div>
        <h2 className={styles.teaserTitle}>
          {t(`pro.features.${feature}.title`)} <ProBadge />
        </h2>
        <p className={styles.teaserText}>{t(`pro.features.${feature}.description`)}</p>
      </div>
      <button type="button" className={styles.button} onClick={onLearnMore}>
        {t('pro.learnMore')}
      </button>
    </section>
  )
}
