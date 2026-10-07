import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Locale } from '../theory/notes'
import en from './en.json'
import es from './es.json'

export const LOCALES: Locale[] = ['en', 'es']

export function isLocale(value: string | undefined): value is Locale {
  return value === 'en' || value === 'es'
}

/** Language from the URL (/:lang/...), else the browser's, else English. */
export function detectLocale(): Locale {
  const fromPath = window.location.pathname.split('/')[1]
  if (isLocale(fromPath)) return fromPath
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en'
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: detectLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
