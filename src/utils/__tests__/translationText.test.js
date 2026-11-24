import { describe, expect, it } from 'vitest'
import translations from '../../../i18n/translations.json'
import { CATALOG_FILLER, NO_TRANSLATION, isFillerText, translatedText } from '../translationText'

// The t() of ~components/contexts/LanguageContext, over a dictionary: the
// prefixed key, else the bare key, else the fallback
const makeT = (dictionary, appInternalName = 'website') => (key, fallback = null) => {
  let originalKey = key
  if (appInternalName !== null) {
    const prefix = `${appInternalName.toUpperCase()}_`
    if (!key.startsWith(prefix)) key = `${prefix}${key}`
    else originalKey = key.substring(prefix.length)
  }
  return dictionary?.[key] ?? dictionary?.[originalKey] ?? fallback ?? key
}

const loaded = { loading: false }

describe('isFillerText', () => {
  it.each(['Lorem ipsum 1', 'Lorem ipsum1', 'Lorem Ipsum 3', '  lorem  ipsum dolor', 'لوريم إيبسوم 1', 'لوريم ايبسوم 2', 'Лорем ипсум 1', 'Λορεμ ιψουμ 1'])('%s is filler', (text) => {
    expect(isFillerText(text)).toBe(true)
  })

  it.each(['On my way', 'Llego en 5 minutos', 'Ipsum lorem', 'Hello lorem ipsum', '', null, undefined, 3])('%s is not', (text) => {
    expect(isFillerText(text)).toBe(false)
  })

  it('the catalog stores real texts for the quick messages in every locale (no filler)', () => {
    ;['CUSTOMER_MESSAGE_1', 'CUSTOMER_MESSAGE_2', 'CUSTOMER_MESSAGE_3', 'CUSTOMER_MESSAGE_4'].forEach((key) => {
      Object.entries(translations[key]).forEach(([locale, text]) => {
        expect(CATALOG_FILLER.has(text), `${key} ${locale}`).toBe(false)
        expect(isFillerText(text), `${key} ${locale}`).toBe(false)
      })
    })
  })
})

describe('translatedText', () => {
  const KEY = 'CUSTOMER_MESSAGE_1'

  it('the translation of the loaded language (bare or prefixed key), trimmed', () => {
    expect(translatedText(loaded, makeT({ CUSTOMER_MESSAGE_1: ' On my way ' })(KEY, NO_TRANSLATION), KEY)).toBe('On my way')
    expect(translatedText(loaded, makeT({ WEBSITE_CUSTOMER_MESSAGE_1: 'Ya voy' })(KEY, NO_TRANSLATION), KEY)).toBe('Ya voy')
    // the prefixed one wins, as in t()
    expect(translatedText(loaded, makeT({ WEBSITE_CUSTOMER_MESSAGE_1: 'Ya voy', CUSTOMER_MESSAGE_1: 'On my way' })(KEY, NO_TRANSLATION), KEY)).toBe('Ya voy')
    // without the app's prefix
    expect(translatedText(loaded, makeT({ CUSTOMER_MESSAGE_1: 'On my way' }, null)(KEY, NO_TRANSLATION), KEY)).toBe('On my way')
  })

  it('null when the dictionary lacks the key (t returns the sentinel)', () => {
    expect(translatedText(loaded, makeT({ OTHER: 'x' })(KEY, NO_TRANSLATION), KEY)).toBeNull()
    expect(translatedText(loaded, makeT({})(KEY, NO_TRANSLATION), KEY)).toBeNull()
    // a key stored as null counts as missing (t's ??)
    expect(translatedText(loaded, makeT({ CUSTOMER_MESSAGE_1: null })(KEY, NO_TRANSLATION), KEY)).toBeNull()
  })

  it('null while the language loads, even if a dictionary (the previous one) has it', () => {
    const t = makeT({ CUSTOMER_MESSAGE_1: 'On my way' })
    expect(translatedText({ loading: true }, t(KEY, NO_TRANSLATION), KEY)).toBeNull()
  })

  it('null when the stored translation is filler copy', () => {
    ;['Lorem ipsum 1', 'Lorem ipsum1', 'لوريم إيبسوم 1'].forEach((text) => {
      expect(translatedText(loaded, makeT({ WEBSITE_CUSTOMER_MESSAGE_1: text })(KEY, NO_TRANSLATION), KEY)).toBeNull()
    })
  })

  it('null when it is empty, blank, the key itself or not a string', () => {
    ;['', '   ', 'CUSTOMER_MESSAGE_1', 'WEBSITE_CUSTOMER_MESSAGE_1', 12, { text: 'x' }].forEach((value) => {
      expect(translatedText(loaded, makeT({ CUSTOMER_MESSAGE_1: value })(KEY, NO_TRANSLATION), KEY)).toBeNull()
    })
  })

  it('null without a language provider (useLanguage\'s default t returns the fallback)', () => {
    const defaultT = (key, fallback = null) => fallback || key
    expect(translatedText({}, defaultT(KEY, NO_TRANSLATION), KEY)).toBeNull()
    expect(translatedText(undefined, 'On my way', KEY)).toBeNull()
  })
})
