import { useTranslation } from 'react-i18next'
import styles from './PrivacyPage.module.css'

/** Bump when the policy text changes; shown as "Last updated". */
const UPDATED = new Date(2026, 9, 19)

const SECTIONS = [
  'summary',
  'mic',
  'storage',
  'account',
  'hosting',
  'children',
  'changes',
  'contact',
] as const

/**
 * The privacy policy for the website and the Android app (Google Play links to it, as the app
 * uses the microphone). Static text, no URL settings.
 */
export function PrivacyPage() {
  const { t, i18n } = useTranslation()
  const date = UPDATED.toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <article className={styles.page}>
      <h1 className={styles.title}>{t('privacy.title')}</h1>
      <p className={styles.updated}>{t('privacy.updated', { date })}</p>
      <p>{t('privacy.intro')}</p>
      {SECTIONS.map((section) => (
        <section key={section}>
          <h2>{t(`privacy.${section}Title`)}</h2>
          <p>{t(`privacy.${section}`)}</p>
        </section>
      ))}
    </article>
  )
}
