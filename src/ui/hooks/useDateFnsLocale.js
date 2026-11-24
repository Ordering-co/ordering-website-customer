import { useEffect, useState } from 'react'
import enUS from 'date-fns/locale/en-US'
import { useLanguage } from '~components/contexts/LanguageContext'

/**
 * The date-fns (v2) locale of the site's language, for the calendars' month
 * and weekday names (react-date-range's `locale`, the preorder calendar's
 * labels).
 *
 * Only the locale of the current language is loaded, on demand: one chunk per
 * language (implementation notesno locale in the entry chunk, never all of them). Until it
 * loads, and for a language without one here, English (en-US).
 *
 * The languages are the catalog's (i18n/config.json: en + supportedLocales).
 */
const LOADERS = {
  es: () => import('date-fns/locale/es'),
  fr: () => import('date-fns/locale/fr'),
  it: () => import('date-fns/locale/it'),
  de: () => import('date-fns/locale/de'),
  pt: () => import('date-fns/locale/pt'),
  da: () => import('date-fns/locale/da'),
  nl: () => import('date-fns/locale/nl'),
  ar: () => import('date-fns/locale/ar'),
  el: () => import('date-fns/locale/el'),
  bg: () => import('date-fns/locale/bg'),
  tr: () => import('date-fns/locale/tr')
}

export const DEFAULT_DATE_LOCALE = enUS

// The locales loaded, by language (a calendar opened again has it at once)
const loaded = new Map()

/** The language of a code of the API ('es', 'pt-BR', 'pt_BR' → 'es', 'pt'). */
export const languageOf = (code) => {
  if (!code || typeof code !== 'string') return null
  return code.trim().toLowerCase().split(/[-_]/)[0] || null
}

/**
 * A code of the API as a BCP-47 tag for Intl (react-calendar's `locale`):
 * 'pt_BR' → 'pt-BR'; undefined when it is none (the calendar's default).
 */
export const intlLocaleOf = (code) => {
  if (!code || typeof code !== 'string') return undefined
  try {
    return Intl.getCanonicalLocales(code.trim().replace(/_/g, '-'))[0]
  } catch {
    return undefined
  }
}

// The locale of a module (the ESM default, or the CommonJS export)
const localeOf = (mod) => {
  const value = mod?.default ?? mod
  return value?.localize ? value : value?.default
}

/** The locale of `code` once loaded (en-US for a language without one). */
export const loadDateFnsLocale = async (code) => {
  const language = languageOf(code)
  const loader = LOADERS[language]
  if (!loader) return DEFAULT_DATE_LOCALE
  if (loaded.has(language)) return loaded.get(language)
  const locale = localeOf(await loader()) || DEFAULT_DATE_LOCALE
  loaded.set(language, locale)
  return locale
}

/** The locale already loaded of `code`, else en-US (no load). */
export const loadedDateFnsLocale = (code) => loaded.get(languageOf(code)) || DEFAULT_DATE_LOCALE

// The longest weekday name that fits a calendar's column ("lun.", "Mo.")
const MAX_WEEKDAY_LENGTH = 4

/**
 * The width of the weekday names of a calendar: `width` ('abbreviated',
 * 'short') when all of them fit a column, else 'narrow' (Arabic's
 * abbreviated ones are whole words: "أربعاء" → "ر").
 */
export const weekdayWidthOf = (locale, width) => {
  const day = locale?.localize?.day
  if (!day) return width
  const fits = [0, 1, 2, 3, 4, 5, 6].every((d) => String(day(d, { width }) || '').length <= MAX_WEEKDAY_LENGTH)
  return fits ? width : 'narrow'
}

/**
 * The date-fns locale of the site's current language: en-US until it loads
 * (and if it fails to), then the language's; it follows a change of language.
 */
export const useDateFnsLocale = () => {
  const [languageState] = useLanguage()
  const code = languageState?.language?.code
  const [locale, setLocale] = useState(() => loadedDateFnsLocale(code))

  useEffect(() => {
    const language = languageOf(code)
    setLocale(loadedDateFnsLocale(code))
    // English, or a language without a locale here, or one already loaded
    if (!LOADERS[language] || loaded.has(language)) return
    let active = true
    loadDateFnsLocale(code)
      .then((next) => { if (active) setLocale(next) })
      .catch(() => { if (active) setLocale(DEFAULT_DATE_LOCALE) })
    return () => { active = false }
  }, [code])

  return locale
}
