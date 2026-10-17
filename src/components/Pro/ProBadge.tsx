import { useTranslation } from 'react-i18next'
import styles from './Pro.module.css'

/** Marks something as part of Bassically Pro. */
export function ProBadge() {
  const { t } = useTranslation()
  return <span className={styles.badge}>{t('pro.badge')}</span>
}
