import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import settings from '~/config'
import { PlatformThemeProvider, themeWithValues } from '../../../ui/src/styles/__tests__/themeTestUtils'
import { resolveMainStore, resetFranchiseStoresCache, seedFranchiseLanding, seedLanding, useFranchiseStores, useMainStore } from '../useFranchiseStores'
import { useStoreLanding } from '../useStoreLanding'
import { api, business, franchiseFetch, franchiseStores, urlsOf } from './landingFixtures'

vi.mock('~components/contexts/ApiContext', async () => {
  const { api } = await import('./landingFixtures')
  return { useApi: () => [api] }
})

const franchiseTheme = (mutate) => themeWithValues((values) => {
  values.site = { ...values.site, mode: 'franchise', experience: 'full_website', franchise_id: 7 }
  mutate?.(values.site)
})
const withTheme = (theme) => ({ children }) => <PlatformThemeProvider theme={theme}>{children}</PlatformThemeProvider>
const draw = (hook, theme = franchiseTheme()) => renderHook(hook, { wrapper: withTheme(theme) })
const storesUrls = () => urlsOf(global.fetch, '/businesses')

// the API's own envelope, with its pagination
const page = (result, pagination) => ({ error: false, result, ...(pagination ? { pagination } : {}) })
const manyStores = (from, count) => Array.from({ length: count }, (_, index) => ({ id: from + index, name: `Store ${from + index}` }))

describe('resolveMainStore', () => {
  it('is the store the site names, whether its id is a number or a text', () => {
    expect(resolveMainStore(5, franchiseStores)).toBe(franchiseStores[1])
    expect(resolveMainStore('9', franchiseStores)).toBe(franchiseStores[2])
  })

  it.each([[null], [undefined], ['']])('without a named store (%s) is the first one', (id) => {
    expect(resolveMainStore(id, franchiseStores)).toBe(franchiseStores[0])
  })

  it('when the named store is not one of the franchise\'s (deleted or no longer its) is the first one', () => {
    expect(resolveMainStore(404, franchiseStores)).toBe(franchiseStores[0])
  })

  it.each([[[]], [null], [undefined]])('without stores (%j) is null', (stores) => {
    expect(resolveMainStore(5, stores)).toBeNull()
  })
})

describe('useFranchiseStores', () => {
  beforeEach(() => {
    resetFranchiseStoresCache()
    global.fetch = franchiseFetch()
  })

  it('reads the franchise\'s stores with explicit params and the API\'s headers', async () => {
    const { result } = draw(() => useFranchiseStores())
    expect(result.current).toMatchObject({ data: null, loading: true, error: null })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual(franchiseStores)
    expect(storesUrls()).toEqual(['https://api.ordering.test/v400/en/demo/franchises/7/businesses?params=id,name,slug,address,location,schedule,timezone,logo,open&page=1&page_size=100'])
    expect(global.fetch.mock.calls[0][1].headers['X-App-X']).toBe('marketplace-test')
  })

  describe('the franchise id of the URL is an integer (a slug is a 404 in api-core)', () => {
    const idle = (result) => {
      expect(result.current).toMatchObject({ data: null, loading: false, error: null })
      expect(global.fetch).not.toHaveBeenCalled()
    }

    it('is the site\'s franchise_id, also as a text of digits', async () => {
      const { result } = draw(() => useFranchiseStores(), franchiseTheme((site) => { site.franchise_id = ' 12 ' }))
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(storesUrls()[0]).toContain('/franchises/12/businesses')
    })

    it('without franchise_id, the integer the worker put in the config (franchiseSlug) or in franchise_slug', async () => {
      const before = settings.franchiseSlug
      try {
        settings.franchiseSlug = '31'
        const config = draw(() => useFranchiseStores(), themeWithValues())
        await waitFor(() => expect(config.result.current.loading).toBe(false))
        expect(storesUrls()[0]).toContain('/franchises/31/businesses')
      } finally { settings.franchiseSlug = before }
      resetFranchiseStoresCache()
      const slug = draw(() => useFranchiseStores(), franchiseTheme((site) => { site.franchise_id = null; site.franchise_slug = '8' }))
      await waitFor(() => expect(slug.result.current.loading).toBe(false))
      expect(storesUrls()[1]).toContain('/franchises/8/businesses')
    })

    it.each([['a slug in franchise_id', { franchise_id: 'my-franchise' }], ['a slug in franchise_slug', { franchise_id: null, franchise_slug: 'my-franchise' }]])('%s: nothing is requested', (_name, site) => {
      const { result } = draw(() => useFranchiseStores(), franchiseTheme((values) => Object.assign(values, site)))
      idle(result)
    })
  })

  it('serves what the API answers: it does not filter on `enabled` (the endpoint already does)', async () => {
    global.fetch = franchiseFetch({ stores: [{ id: 1, name: 'A' }, { id: 2, name: 'B', enabled: false }] })
    const { result } = draw(() => useFranchiseStores())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data.map((store) => store.name)).toEqual(['A', 'B'])
  })

  it('a store that a shifting pagination repeats appears once, in its first place', async () => {
    global.fetch = vi.fn(async (url) => {
      const current = Number(new URL(url).searchParams.get('page'))
      const result = current === 1 ? manyStores(1, 100) : [...manyStores(100, 1), ...manyStores(101, 5)]
      return { ok: true, json: async () => page(result, { current_page: current, total_pages: 2 }) }
    })
    const { result } = draw(() => useFranchiseStores())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const ids = result.current.data.map((store) => store.id)
    expect(ids).toHaveLength(105)
    expect(new Set(ids).size).toBe(105)
  })

  it('a franchise with no stores reads [], not an error', async () => {
    global.fetch = franchiseFetch({ stores: [] })
    const { result } = draw(() => useFranchiseStores())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current).toMatchObject({ data: [], error: null })
  })

  it('a site without a franchise is idle and asks for nothing', () => {
    const { result } = draw(() => useFranchiseStores(), themeWithValues())
    expect(result.current).toMatchObject({ data: null, loading: false, error: null })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('walks the pages while the API says there are more (its pagination)', async () => {
    global.fetch = vi.fn(async (url) => {
      const current = Number(new URL(url).searchParams.get('page'))
      const result = current === 1 ? manyStores(1, 100) : manyStores(101, 30)
      return { ok: true, json: async () => page(result, { current_page: current, total_pages: 2 }) }
    })
    const { result } = draw(() => useFranchiseStores())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(130)
    expect(storesUrls().map((url) => new URL(url).searchParams.get('page'))).toEqual(['1', '2'])
  })

  it('without pagination, a full page asks for the next one and a short page stops', async () => {
    global.fetch = vi.fn(async (url) => {
      const current = Number(new URL(url).searchParams.get('page'))
      return { ok: true, json: async () => page(current === 1 ? manyStores(1, 100) : manyStores(101, 3)) }
    })
    const { result } = draw(() => useFranchiseStores())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(103)
    expect(storesUrls()).toHaveLength(2)
  })

  it('stops at 10 pages even if the API keeps answering full ones', async () => {
    global.fetch = vi.fn(async (url) => ({ ok: true, json: async () => page(manyStores(1 + 100 * Number(new URL(url).searchParams.get('page')), 100)) }))
    const { result } = draw(() => useFranchiseStores())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(storesUrls()).toHaveLength(10)
    expect(result.current.data).toHaveLength(1000)
  })

  it('a failed page is an error, and retry() asks again from the first page', async () => {
    let attempts = 0
    global.fetch = franchiseFetch({ stores: () => (attempts++ === 0 ? new Error('boom') : franchiseStores) })
    const { result } = draw(() => useFranchiseStores())
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))
    expect(result.current.error.message).toBe('boom')
    expect(result.current.data).toBeNull()
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.data).toEqual(franchiseStores))
    expect(result.current.error).toBeNull()
    expect(storesUrls()).toHaveLength(2)
  })

  it('callers share one request, also those that mount later', async () => {
    const { result } = draw(() => ({ a: useFranchiseStores(), b: useFranchiseStores() }))
    await waitFor(() => expect(result.current.a.data).not.toBeNull())
    expect(result.current.b.data).toBe(result.current.a.data)
    const later = draw(() => useFranchiseStores())
    expect(later.result.current.data).toEqual(franchiseStores)
    expect(storesUrls()).toHaveLength(1)
  })

  it('another franchise has its own cache entry', async () => {
    const first = draw(() => useFranchiseStores())
    await waitFor(() => expect(first.result.current.loading).toBe(false))
    const second = draw(() => useFranchiseStores(), franchiseTheme((site) => { site.franchise_id = 8 }))
    expect(second.result.current.loading).toBe(true)
    await waitFor(() => expect(second.result.current.loading).toBe(false))
    expect(storesUrls()).toHaveLength(2)
  })
})

describe('useMainStore', () => {
  beforeEach(() => {
    resetFranchiseStoresCache()
    global.fetch = franchiseFetch()
  })

  it('is the id of the store `site.main_store` names', async () => {
    const { result } = draw(() => useMainStore(), franchiseTheme((site) => { site.main_store = 9 }))
    expect(result.current).toMatchObject({ store: null, loading: true })
    await waitFor(() => expect(result.current.store).toBe(9))
    expect(result.current.loading).toBe(false)
  })

  it('falls to the first store when the site names none or one that is not the franchise\'s', async () => {
    const none = draw(() => useMainStore())
    await waitFor(() => expect(none.result.current.store).toBe(2))
    const gone = draw(() => useMainStore(), franchiseTheme((site) => { site.main_store = 404 }))
    expect(gone.result.current.store).toBe(2)
  })

  it('is null without stores, and carries the error and its retry when the read failed', async () => {
    global.fetch = franchiseFetch({ stores: [] })
    const empty = draw(() => useMainStore())
    await waitFor(() => expect(empty.result.current.loading).toBe(false))
    expect(empty.result.current).toMatchObject({ store: null, error: null })

    resetFranchiseStoresCache()
    global.fetch = franchiseFetch({ stores: new Error('down') })
    const failed = draw(() => useMainStore())
    await waitFor(() => expect(failed.result.current.error).toBeInstanceOf(Error))
    expect(failed.result.current.store).toBeNull()
    expect(typeof failed.result.current.retry).toBe('function')
  })
})

describe('seedLanding (what the Worker already read of a franchise)', () => {
  const seeded = { business, featured: [{ id: 1, name: 'Birria Tacos' }], services: { delivery: { enabled: true, time: 30 }, pickup: { enabled: false, time: null }, eatin: { enabled: false } }, reviews: { average: 4.8, count: 212, recent: [] } }
  const theme = franchiseTheme((site) => { site.main_store = 5 })
  // every render's view of the stores, the main store and its landing
  const watch = (watched = theme) => {
    const renders = []
    const view = draw(() => {
      const main = useMainStore()
      const state = { stores: useFranchiseStores(), main, landing: useStoreLanding(main.store) }
      renders.push(state)
      return state
    }, watched)
    return { ...view, renders }
  }

  beforeEach(() => {
    resetFranchiseStoresCache()
    global.fetch = franchiseFetch()
  })

  it('the first render has the stores, the main store and its landing: nothing loading, nothing asked; mounting refreshes quietly', async () => {
    seedLanding(api.root, theme, { ...seeded, franchiseStores })
    const { result, renders } = watch()

    expect(renders[0].stores).toMatchObject({ data: franchiseStores, loading: false, error: null })
    expect(renders[0].main).toMatchObject({ store: 5, loading: false })
    expect(renders[0].landing.business).toMatchObject({ data: business, loading: false })
    expect(renders[0].landing.featured.data).toEqual(seeded.featured)
    expect(renders[0].landing.reviews.data).toEqual(seeded.reviews)
    // seeded stale: the refresh on mount asks again, and the data never goes back to loading
    await waitFor(() => expect(storesUrls()).toHaveLength(1))
    await waitFor(() => expect(urlsOf(global.fetch, '/reviews').length).toBeGreaterThan(0))
    expect(renders.every(({ stores, landing }) => !stores.loading && !landing.business.loading)).toBe(true)
    expect(result.current.stores.data).toEqual(franchiseStores)
  })

  it('a business that is not the main store the client resolves is not seeded; the stores still are', () => {
    seedFranchiseLanding(api.root, theme, { ...seeded, business: { ...business, id: 99 }, franchiseStores })
    const { renders } = watch()
    expect(renders[0].stores).toMatchObject({ data: franchiseStores, loading: false })
    expect(renders[0].main.store).toBe(5)
    expect(renders[0].landing.business).toMatchObject({ data: null, loading: true })
  })

  it('without a main store named, the first store of the list is the one that takes the seed', () => {
    const first = franchiseTheme()
    seedFranchiseLanding(api.root, first, { ...seeded, business: { ...business, id: 2 }, franchiseStores })
    const { renders } = watch(first)
    expect(renders[0].main.store).toBe(2)
    expect(renders[0].landing.business).toMatchObject({ data: { id: 2 }, loading: false })
  })

  it('a site with no franchise id (or a slug) seeds nothing; a seed without a list of stores neither', () => {
    seedFranchiseLanding(api.root, franchiseTheme((site) => { site.franchise_id = 'my-franchise' }), { ...seeded, franchiseStores })
    seedFranchiseLanding(api.root, theme, { ...seeded, franchiseStores: null })
    const { renders } = watch()
    expect(renders[0].stores).toMatchObject({ data: null, loading: true })
  })

  it('one store: the seed is the store\'s, under the slug the theme names (no list of stores)', () => {
    const one = themeWithValues((values) => { values.site = { ...values.site, mode: 'single_store', experience: 'full_website', business_slug: 'casa-lupita' } })
    seedLanding(api.root, one, seeded)
    const { result } = draw(() => useStoreLanding('casa-lupita'), one)
    expect(result.current.business).toMatchObject({ data: business, loading: false })
    expect(result.current.featured.data).toEqual(seeded.featured)
  })
})
