import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Navigate, Outlet, useLocation, useParams } from 'react-router'
import { LOCALES, isLocale } from '../i18n'
import styles from './Layout.module.css'

const LANGUAGE_NAMES = { en: 'English', es: 'Español' }

/** Shell for every /:lang route: header, navigation for current and future sections, language switch. */
export function Layout() {
  const { lang } = useParams()
  const { t, i18n } = useTranslation()
  const location = useLocation()

  useEffect(() => {
    if (isLocale(lang)) {
      void i18n.changeLanguage(lang)
      document.documentElement.lang = lang
    }
  }, [lang, i18n])

  if (!isLocale(lang)) return <Navigate to="/" replace />

  const switchTo = (target: string) => location.pathname.replace(/^\/[^/]+/, `/${target}`) + location.search

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to={`/${lang}/scales`} className={styles.brand}>
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
            <rect x="2" y="9" width="20" height="6" rx="1.5" fill="var(--wood-center)" />
            {[7, 12, 17].map((x) => (
              <line key={x} x1={x} x2={x} y1="9" y2="15" stroke="var(--fret-wire)" strokeWidth="1" />
            ))}
            <circle cx="9.5" cy="12" r="2.2" fill="var(--root)" />
          </svg>
          <span>
            <strong>{t('app.title')}</strong>
            <small>{t('app.tagline')}</small>
          </span>
        </Link>

        <nav className={styles.nav}>
          <NavLink
            to={`/${lang}/scales`}
            className={({ isActive }) => (isActive ? styles.activeLink : undefined)}
          >
            {t('app.nav.scales')}
          </NavLink>
        </nav>

        <div className={styles.languages} role="group" aria-label={t('app.language')}>
          {LOCALES.map((l) => (
            <Link
              key={l}
              to={switchTo(l)}
              className={l === lang ? styles.activeLang : undefined}
              aria-current={l === lang ? 'true' : undefined}
              lang={l}
              aria-label={LANGUAGE_NAMES[l]}
              title={LANGUAGE_NAMES[l]}
            >
              {l.toUpperCase()}
            </Link>
          ))}
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
