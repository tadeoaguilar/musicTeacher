import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { FeatureId } from '../../access/access'
import { ProBadge } from './ProBadge'
import styles from './Pro.module.css'

type Props = {
  /** The Pro features to list. */
  features: FeatureId[]
  onClose: () => void
}

/**
 * What Bassically Pro includes. Billing isn't built yet (docs/MONETIZATION.md), so it says
 * "coming soon" instead of offering plans.
 */
export function Paywall({ features, onClose }: Props) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    // jsdom has no showModal; the dialog still renders there.
    if (dialog && !dialog.open && typeof dialog.showModal === 'function') dialog.showModal()
  }, [])

  return (
    <dialog ref={ref} className={styles.paywall} aria-labelledby={titleId} onClose={onClose}>
      <ProBadge />
      <h2 id={titleId} className={styles.paywallTitle}>
        {t('pro.title')}
      </h2>
      <p className={styles.teaserText}>{t('pro.intro')}</p>
      <ul className={styles.features}>
        {features.map((id) => (
          <li key={id}>
            <strong>{t(`pro.features.${id}.title`)}</strong>
            <span>{t(`pro.features.${id}.description`)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.soon}>{t('pro.comingSoon')}</p>
      <button type="button" className={styles.button} onClick={onClose}>
        {t('pro.close')}
      </button>
    </dialog>
  )
}
