import { describe, expect, it } from 'vitest'

import { buildPwaPromptCopy, isIosPwaPromptDevice, shouldShowIosPwaPrompt } from '../pwaPromptCopy'

describe('buildPwaPromptCopy', () => {
  it('uses translated strings from t()', () => {
    const t = (key, fallback) => ({
      PWA_ADD_TO_HOME_SCREEN: 'Añadir a la pantalla de inicio',
      PWA_ADD_TO_HOME_BODY: 'Este sitio tiene funciones de app.',
      PWA_SHARE_BUTTON: "1) Pulsa el botón 'Compartir'",
      PWA_ADD_HOME_BUTTON: "2) Pulsa 'Añadir a pantalla de inicio'",
      PWA_CLOSE_PROMPT: 'Cerrar'
    }[key] || fallback)

    expect(buildPwaPromptCopy(t)).toEqual({
      copyTitle: 'Añadir a la pantalla de inicio',
      copyBody: 'Este sitio tiene funciones de app.',
      copyShareButtonLabel: "1) Pulsa el botón 'Compartir'",
      copyAddHomeButtonLabel: "2) Pulsa 'Añadir a pantalla de inicio'",
      copyClosePrompt: 'Cerrar'
    })
  })

  it('falls back to English when the dictionary has no key', () => {
    const t = (_key, fallback) => fallback

    expect(buildPwaPromptCopy(t).copyClosePrompt).toBe('Close')
    expect(buildPwaPromptCopy(t).copyTitle).toBe('Add to Home Screen')
  })
})

describe('shouldShowIosPwaPrompt', () => {
  it('hides the prompt until branding and language are ready', () => {
    expect(shouldShowIosPwaPrompt({ ready: false, languageLoading: false, userAgent: 'iPhone' })).toBe(false)
    expect(shouldShowIosPwaPrompt({ ready: true, languageLoading: true, userAgent: 'iPhone' })).toBe(false)
  })

  it('hides the prompt on the other iOS browsers (no Safari Share button)', () => {
    ;['CriOS/120.0.0.0', 'FxiOS/120.0', 'EdgiOS/120.0.0.0'].forEach((browser) => {
      expect(shouldShowIosPwaPrompt({
        ready: true,
        languageLoading: false,
        userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ${browser} Mobile/15E148 Safari/604.1`
      })).toBe(false)
    })
  })

  it('shows the prompt on Safari iOS when ready', () => {
    expect(shouldShowIosPwaPrompt({
      ready: true,
      languageLoading: false,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    })).toBe(true)
  })
})

describe('isIosPwaPromptDevice (the library\'s device check)', () => {
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
  const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15'
  const storageWith = (value) => ({ getItem: () => value })

  it('iPhone / iPad / iPod user agents', () => {
    expect(isIosPwaPromptDevice({ userAgent: IPHONE, nav: {}, storage: null })).toBe(true)
    expect(isIosPwaPromptDevice({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)', nav: {}, storage: null })).toBe(true)
  })

  it('iPadOS (desktop user agent, touch Mac)', () => {
    expect(isIosPwaPromptDevice({ userAgent: MAC, nav: { platform: 'MacIntel', maxTouchPoints: 5 }, storage: null })).toBe(true)
    expect(isIosPwaPromptDevice({ userAgent: MAC, nav: { platform: 'MacIntel', maxTouchPoints: 0 }, storage: null })).toBe(false)
  })

  it('not when already installed (standalone) nor on other devices', () => {
    expect(isIosPwaPromptDevice({ userAgent: IPHONE, nav: { standalone: true }, storage: null })).toBe(false)
    expect(isIosPwaPromptDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 14)', nav: {}, storage: null })).toBe(false)
  })

  it('the library\'s stored verdict wins, a broken one is ignored', () => {
    expect(isIosPwaPromptDevice({ userAgent: MAC, nav: {}, storage: storageWith('{"isiOS":true,"visits":3}') })).toBe(true)
    expect(isIosPwaPromptDevice({ userAgent: IPHONE, nav: {}, storage: storageWith('{"isiOS":false,"visits":0}') })).toBe(false)
    expect(isIosPwaPromptDevice({ userAgent: IPHONE, nav: {}, storage: storageWith('{oops') })).toBe(true)
    expect(isIosPwaPromptDevice({ userAgent: IPHONE, nav: {}, storage: { getItem: () => { throw new Error('blocked') } } })).toBe(true)
  })
})
