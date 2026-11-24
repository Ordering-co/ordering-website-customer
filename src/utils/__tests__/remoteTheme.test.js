import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import themeSchema from '../../theme.compiled.json'
import {
  THEME_SCHEMA_VERSION,
  buildSiteThemeUrl,
  extractSiteTheme,
  fetchSiteTheme,
  useSiteThemeFallback
} from '../remoteTheme'

const SITE_THEME = { version: 2, complete: false, values: { tokens: {} } }
const V1 = { my_products: {} }

describe('remoteTheme helpers', () => {
  it('asks GET theme for version 2 of this product', () => {
    expect(buildSiteThemeUrl('http://localhost:8080/v400/en/development/'))
      .toBe(`http://localhost:8080/v400/en/development/theme?theme_version=2&product_type=marketplace_website&theme_schema_version=${THEME_SCHEMA_VERSION}`)
    // the schema this build is made for
    expect(THEME_SCHEMA_VERSION).toBe(themeSchema.version)
  })

  it('extracts the envelope from result or result.values', () => {
    expect(extractSiteTheme({ error: false, result: SITE_THEME })).toBe(SITE_THEME)
    expect(extractSiteTheme({ error: false, result: { values: SITE_THEME } })).toBe(SITE_THEME)
    expect(extractSiteTheme({ error: false, result: { values: V1 } })).toBeNull()
    expect(extractSiteTheme({ error: true, result: SITE_THEME })).toBeNull()
    expect(extractSiteTheme(null)).toBeNull()
  })

  it('fetchSiteTheme sends X-App-X and returns null on a failed response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: false, result: SITE_THEME }) })
    await expect(fetchSiteTheme({ root: 'http://api', appId: 'web', fetchImpl })).resolves.toBe(SITE_THEME)
    expect(fetchImpl).toHaveBeenCalledWith(
      `http://api/theme?theme_version=2&product_type=marketplace_website&theme_schema_version=${THEME_SCHEMA_VERSION}`,
      { method: 'GET', headers: { 'X-App-X': 'web' } }
    )
    const failing = vi.fn().mockResolvedValue({ ok: false })
    await expect(fetchSiteTheme({ root: 'http://api', appId: 'web', fetchImpl: failing })).resolves.toBeNull()
  })

  it('fetchSiteTheme returns null (never rejects) on a body that is not JSON or a network error', async () => {
    const badJson = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.reject(new SyntaxError('Unexpected token')) })
    await expect(fetchSiteTheme({ root: 'https://api/v400/en/p', appId: 'web', fetchImpl: badJson })).resolves.toBeNull()
    const offline = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(fetchSiteTheme({ root: 'https://api/v400/en/p', appId: 'web', fetchImpl: offline })).resolves.toBeNull()
    const serverError = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    await expect(fetchSiteTheme({ root: 'https://api/v400/en/p', appId: 'web', fetchImpl: serverError })).resolves.toBeNull()
  })

  it('extractSiteTheme returns null for a result that is not an envelope', () => {
    expect(extractSiteTheme({ result: 'oops' })).toBeNull()
    expect(extractSiteTheme({ result: { version: 2, values: null } })).toBeNull()
    expect(extractSiteTheme({ result: { version: 2, values: [] } })).toBeNull()
    expect(extractSiteTheme('oops')).toBeNull()
  })
})

describe('useSiteThemeFallback', () => {
  const base = { root: 'http://api', appId: 'web', project: 'development' }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches v2 when the context holds a v1 theme, which it ignores', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ error: false, result: SITE_THEME }) })
    const { result } = renderHook(() => useSiteThemeFallback({ ...base, contextTheme: V1, contextLoading: false }))
    expect(result.current).toEqual({ theme: null, loading: true })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.theme).toBe(SITE_THEME)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('fetches v2 when the context has no theme', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ error: false, result: SITE_THEME }) })
    const { result } = renderHook(() => useSiteThemeFallback({ ...base, contextTheme: null, contextLoading: false }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.theme).toBe(SITE_THEME)
  })

  it('gives no theme (the defaults) when the API still answers v1', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ error: false, result: { values: V1 } }) })
    const { result } = renderHook(() => useSiteThemeFallback({ ...base, contextTheme: V1, contextLoading: false }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.theme).toBeNull()
  })

  it('gives no theme (the defaults) when the request throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useSiteThemeFallback({ ...base, contextTheme: V1, contextLoading: false }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.theme).toBeNull()
  })

  it('does not fetch when the context has v2 or is loading, nor without root or project', () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const themed = renderHook(() => useSiteThemeFallback({ ...base, contextTheme: SITE_THEME, contextLoading: false }))
    expect(themed.result.current).toEqual({ theme: SITE_THEME, loading: false })
    const loading = renderHook(() => useSiteThemeFallback({ ...base, contextTheme: V1, contextLoading: true }))
    expect(loading.result.current).toEqual({ theme: null, loading: false })
    const noRoot = renderHook(() => useSiteThemeFallback({ ...base, root: null, contextTheme: V1, contextLoading: false }))
    expect(noRoot.result.current).toEqual({ theme: null, loading: false })
    expect(spy).not.toHaveBeenCalled()
  })
})
