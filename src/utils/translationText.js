/**
 * Whether a text of the site has a real translation in the current language.
 *
 * `t(key, fallback)` of ~components/contexts/LanguageContext returns the
 * dictionary's value of the key (the one with the app's prefix,
 * `WEBSITE_<KEY>`, else the bare key) and, only when the dictionary lacks it,
 * the fallback. The dictionary is the current language's, loaded from the API
 * (`translations().asDictionary()`); while it loads (`state.loading`: at boot
 * and on every language change) it is empty or still the previous language's.
 *
 * So a text is real when: the language is loaded, the dictionary has the key
 * (asked with NO_TRANSLATION as the fallback: t returns it back only when the
 * key is missing, whatever its prefix), and its value is a non-empty string
 * that is neither the key itself nor filler copy ("Lorem ipsum…", which the
 * API dictionaries of existing sites may still store for some keys in every
 * language; the catalog has real texts since 2026-10-17).
 */

/** The fallback to pass to t() to learn that the dictionary lacks the key. */
export const NO_TRANSLATION = Symbol('no translation')

// Filler copy as the catalog and the API store it: Latin, and the
// transliterations the catalog's languages use (Arabic, Cyrillic, Greek).
const FILLER = [
  /^lorem\s*ipsum/i,
  /^لوريم\s*[إا]يبسوم/,
  /^лорем\s*ипсум/i,
  /^λορεμ\s*ιψουμ/i
]

// The filler the catalog (i18n/translations.json) stored, in its 12
// languages, for the chat's quick messages (CUSTOMER_MESSAGE_1…4), and that
// API dictionaries may still hold: known filler, whatever the patterns above
// say
export const CATALOG_FILLER = new Set([1, 2, 3, 4].flatMap((n) => [
  `Lorem ipsum ${n}`,
  `Lorem ipsum${n}`,
  `Lorem Ipsum ${n}`,
  `لوريم إيبسوم ${n}`
]))

/** Whether `text` is filler copy ("Lorem ipsum 1", "Lorem ipsum1", "لوريم إيبسوم 1"…). */
export const isFillerText = (text) => {
  if (typeof text !== 'string') return false
  const normalized = text.normalize('NFKC').trim()
  return CATALOG_FILLER.has(normalized) || FILLER.some((pattern) => pattern.test(normalized))
}

/**
 * The text of `value` (what `t(key, NO_TRANSLATION)` returned) when it is a
 * real translation of the loaded language, else null.
 *
 * @param {object} languageState the state of useLanguage() (`loading`)
 * @param {*} value `t(key, NO_TRANSLATION)`
 * @param {string} [key] the key asked, so a value that is the key itself
 *   (bare or prefixed) does not count
 */
export const translatedText = (languageState, value, key) => {
  if (!languageState || languageState.loading) return null
  if (value === NO_TRANSLATION || typeof value !== 'string') return null
  const text = value.trim()
  if (!text || isFillerText(text)) return null
  if (key && (text === key || text.endsWith(`_${key}`)) && /^[A-Z0-9_]+$/.test(text)) return null
  return text
}
