import { describe, expect, it, vi } from 'vitest'
import enUS from 'date-fns/locale/en-US'
import { DEFAULT_DATE_LOCALE, intlLocaleOf, languageOf, loadDateFnsLocale, loadedDateFnsLocale, weekdayWidthOf } from '../useDateFnsLocale'

// The locales are dynamic imports: one module per language, counted
const loads = vi.hoisted(() => ({ de: 0 }))
vi.mock('date-fns/locale/de', () => {
  loads.de++
  return { default: { code: 'de', localize: {} } }
})
vi.mock('date-fns/locale/it', () => {
  throw new Error('chunk failed to load')
})

describe('useDateFnsLocale helpers', () => {
  it('languageOf: the language of an API code', () => {
    expect(languageOf('es')).toBe('es')
    expect(languageOf('pt-BR')).toBe('pt')
    expect(languageOf(' PT_br ')).toBe('pt')
    expect(languageOf('')).toBeNull()
    expect(languageOf(null)).toBeNull()
  })

  it('intlLocaleOf: a BCP-47 tag for react-calendar, undefined when the code is none', () => {
    expect(intlLocaleOf('es')).toBe('es')
    expect(intlLocaleOf('pt_BR')).toBe('pt-BR')
    expect(intlLocaleOf('ar')).toBe('ar')
    expect(intlLocaleOf('not a tag!')).toBeUndefined()
    expect(intlLocaleOf(undefined)).toBeUndefined()
  })

  it('English and a language without a locale here: en-US, nothing loaded', async () => {
    expect(DEFAULT_DATE_LOCALE).toBe(enUS)
    expect(await loadDateFnsLocale('en')).toBe(enUS)
    expect(await loadDateFnsLocale('xx')).toBe(enUS)
    expect(await loadDateFnsLocale(undefined)).toBe(enUS)
  })

  it('a language: its locale, loaded once (a region of it too), then at hand', async () => {
    expect(loadedDateFnsLocale('de')).toBe(enUS)
    const locale = await loadDateFnsLocale('de')
    expect(locale.code).toBe('de')
    expect(await loadDateFnsLocale('de-AT')).toBe(locale)
    expect(loads.de).toBe(1)
    expect(loadedDateFnsLocale('de')).toBe(locale)
  })

  it('a locale that fails to load rejects (the hook then keeps English)', async () => {
    await expect(loadDateFnsLocale('it')).rejects.toThrow()
    expect(loadedDateFnsLocale('it')).toBe(enUS)
  })

  it('weekdayWidthOf: the width asked when its names fit a column, else the narrow ones', async () => {
    const actual = async (name) => {
      const mod = await vi.importActual(`date-fns/locale/${name}`)
      return mod.default?.localize ? mod.default : mod.default?.default
    }
    expect(weekdayWidthOf(enUS, 'abbreviated')).toBe('abbreviated')
    expect(weekdayWidthOf(enUS, 'short')).toBe('short')
    expect(weekdayWidthOf(await actual('es'), 'abbreviated')).toBe('abbreviated')
    expect(weekdayWidthOf(await actual('fr'), 'abbreviated')).toBe('abbreviated')
    // Arabic's are whole words ("أربعاء")
    expect(weekdayWidthOf(await actual('ar'), 'abbreviated')).toBe('narrow')
    expect(weekdayWidthOf(await actual('ar'), 'short')).toBe('narrow')
    expect(weekdayWidthOf(null, 'short')).toBe('short')
  })
})
