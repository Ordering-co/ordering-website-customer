import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PREVIEW_STORAGE_KEY,
  captureStorePreviewToken,
  detectStorePrivate,
  getStorePreviewToken,
  isApiUrl,
  isStorePrivate,
  resetStorePreview,
  subscribeStorePrivate
} from '../storePreview'

describe('storePreview', () => {
  beforeEach(() => {
    resetStorePreview()
    window.localStorage.clear()
    window.history.replaceState(null, '', '/')
  })
  afterEach(() => vi.restoreAllMocks())

  describe('captureStorePreviewToken', () => {
    it('keeps ?preview in memory and localStorage and takes it off the URL, leaving the rest', () => {
      window.history.replaceState({ k: 1 }, '', '/store/x?a=1&preview=tok.en_-1&b=2#frag')

      expect(captureStorePreviewToken()).toBe('tok.en_-1')
      expect(window.location.pathname + window.location.search + window.location.hash).toBe('/store/x?a=1&b=2#frag')
      expect(window.history.state).toEqual({ k: 1 })
      expect(window.localStorage.getItem(PREVIEW_STORAGE_KEY)).toBe('tok.en_-1')
      window.localStorage.clear()
      expect(getStorePreviewToken()).toBe('tok.en_-1')
    })

    it('uses the stored token when the URL has none', () => {
      window.localStorage.setItem(PREVIEW_STORAGE_KEY, 'stored')
      expect(captureStorePreviewToken()).toBe('stored')
    })

    it('takes an empty ?preview off the URL without storing anything', () => {
      window.history.replaceState(null, '', '/?preview=')
      expect(captureStorePreviewToken()).toBeNull()
      expect(window.location.search).toBe('')
      expect(window.localStorage.getItem(PREVIEW_STORAGE_KEY)).toBeNull()
    })

    it('still works in memory when the storage is blocked', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
      window.history.replaceState(null, '', '/?preview=abc')

      expect(captureStorePreviewToken()).toBe('abc')
      expect(window.location.search).toBe('')
      expect(getStorePreviewToken()).toBe('abc')
    })

    it('is null without a token anywhere, even with the storage blocked', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
      expect(captureStorePreviewToken()).toBeNull()
    })
  })

  describe('isApiUrl', () => {
    const API = 'https://api.example.com/'
    it('matches the API origin only', () => {
      expect(isApiUrl('https://api.example.com/v400/en/p/business', API)).toBe(true)
      expect(isApiUrl('https://ipapi.co/json/', API)).toBe(false)
      expect(isApiUrl('https://api.example.com.evil.test/x', API)).toBe(false)
      expect(isApiUrl('http://api.example.com/x', API)).toBe(false)
      expect(isApiUrl('/relative', API)).toBe(false)
      expect(isApiUrl(undefined, API)).toBe(false)
      expect(isApiUrl('https://api.example.com/x', undefined)).toBe(false)
    })
  })

  describe('detectStorePrivate', () => {
    it('flags the store on 403 STORE_PRIVATE and tells the subscribers once', () => {
      const listener = vi.fn()
      subscribeStorePrivate(listener)

      detectStorePrivate(403, '{"error":true,"result":["STORE_PRIVATE"]}')
      detectStorePrivate(403, '{"error":true,"result":["STORE_PRIVATE"]}')

      expect(isStorePrivate()).toBe(true)
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it.each([
      [403, '{"error":true,"result":["FORBIDDEN"]}'],
      [200, '{"result":["STORE_PRIVATE"]}'],
      [401, '{"result":["STORE_PRIVATE"]}'],
      [403, null],
      [403, undefined]
    ])('ignores status %s with body %s', (status, body) => {
      detectStorePrivate(status, body)
      expect(isStorePrivate()).toBe(false)
    })
  })
})
