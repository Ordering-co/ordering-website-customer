import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { landingSectionsWithData, resetStoreLandingCache, seedStoreLanding, useStoreLanding } from '../useStoreLanding'
import { api, business, landingFetch, products, reviews as reviewsList, urlsOf } from './landingFixtures'

vi.mock('~components/contexts/ApiContext', async () => {
  const { api } = await import('./landingFixtures')
  return { useApi: () => [api] }
})

const settled = async (result) => {
  await waitFor(() => {
    const { business: b, featured, services, reviews } = result.current
    expect([b, featured, services, reviews].some((resource) => resource.loading)).toBe(false)
  })
}

describe('useStoreLanding', () => {
  beforeEach(() => {
    resetStoreLandingCache()
    global.fetch = landingFetch()
  })

  it('without a store everything is idle and nothing is requested', () => {
    for (const store of [null, undefined, '']) {
      const { result } = renderHook(() => useStoreLanding(store))
      for (const resource of ['business', 'featured', 'services', 'reviews']) {
        expect(result.current[resource]).toMatchObject({ data: null, loading: false, error: null })
        expect(typeof result.current[resource].retry).toBe('function')
      }
    }
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('loads the four resources in the contract shape, with explicit params', async () => {
    const { result } = renderHook(() => useStoreLanding('casa-lupita'))
    expect(result.current.business.loading).toBe(true)
    expect(result.current.featured.loading).toBe(true) // waits for the business id
    await settled(result)

    expect(result.current.business.data).toMatchObject({ id: 5, name: 'Casa Lupita' })
    expect(result.current.featured.data).toEqual([
      { id: 1, name: 'Birria Tacos', price: 14.99, image: 'https://img.test/p1.jpg', slug: 'birria', category_id: 3 },
      { id: 3, name: 'Horchata', price: 4.5, image: null, slug: 'horchata', category_id: 4 }
    ])
    expect(result.current.services.data).toEqual({
      delivery: { enabled: true, time: 30 },
      pickup: { enabled: true, time: 15 },
      eatin: { enabled: false }
    })
    expect(result.current.reviews.data).toMatchObject({ average: 4.8, count: 212 })

    const [businessUrl] = urlsOf(global.fetch, 'casa-lupita')
    expect(businessUrl).toContain('/business/casa-lupita?params=id,name,slug,logo,header,description,about,address')
    expect(businessUrl).toContain('timezone')
    expect(urlsOf(global.fetch, '/menus')[0]).toContain('/business/5/menus?params=delivery,pickup,eatin,enabled')
    expect(urlsOf(global.fetch, '/products')[0]).toContain('/business/5/products?type=1&params=')
    expect(urlsOf(global.fetch, '/reviews')[0]).toContain('orderBy=-created_at&page=1&page_size=20')
    expect(global.fetch.mock.calls[0][1].headers['X-App-X']).toBe('marketplace-test')
  })

  it('callers with the same store share one request per resource, also when they mount later', async () => {
    const Probe = () => {
      const { business: b } = useStoreLanding(5)
      return <p>{b.data ? b.data.name : 'loading'}</p>
    }
    const view = render(<><Probe /><Probe /><Probe /></>)
    await waitFor(() => expect(screen.getAllByText('Casa Lupita')).toHaveLength(3))
    view.rerender(<><Probe /><Probe /><Probe /><Probe /></>)
    expect(screen.getAllByText('Casa Lupita')).toHaveLength(4)
    expect(urlsOf(global.fetch, '/business/5')).toHaveLength(1)
    await waitFor(() => expect(urlsOf(global.fetch, '/menus')).toHaveLength(1))
    expect(urlsOf(global.fetch, '/products')).toHaveLength(1)
    expect(urlsOf(global.fetch, '/reviews')).toHaveLength(1)
  })

  it('a failed read keeps its error until retry() asks again', async () => {
    let attempts = 0
    global.fetch = landingFetch({ business: () => (attempts++ === 0 ? new Error('boom') : business) })
    const { result } = renderHook(() => useStoreLanding('casa-lupita'))
    await waitFor(() => expect(result.current.business.error).toBeInstanceOf(Error))
    expect(result.current.business.error.message).toBe('boom')
    // the dependents stay idle, not loading, while the business is in error
    expect(result.current.featured).toMatchObject({ data: null, loading: false, error: null })
    expect(urlsOf(global.fetch, 'casa-lupita')).toHaveLength(1)

    act(() => result.current.business.retry())
    await settled(result)
    expect(result.current.business.data.id).toBe(5)
    expect(result.current.business.error).toBeNull()
    expect(urlsOf(global.fetch, 'casa-lupita')).toHaveLength(2)
  })

  it('a network failure is an error too, and a section\'s read failing leaves the others', async () => {
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('/menus')) throw new TypeError('offline')
      return landingFetch()(url)
    })
    const { result } = renderHook(() => useStoreLanding(5))
    await waitFor(() => expect(result.current.services.error).toBeInstanceOf(Error))
    await waitFor(() => expect(result.current.featured.data).toHaveLength(2))
    expect(result.current.business.data.id).toBe(5)
  })

  it('reviews: three of 4-5 stars with a comment, and nothing of the reviewer but "Name L."', async () => {
    const { result } = renderHook(() => useStoreLanding(5))
    await settled(result)
    const { recent } = result.current.reviews.data
    expect(recent.map((review) => review.author)).toEqual(['Laura S.', 'Daniel C.', 'Ana'])
    expect(recent).toHaveLength(3) // the 2-star, the blank comment and the fourth good one are left out
    for (const review of recent) {
      expect(Object.keys(review).sort()).toEqual(['author', 'comment', 'createdAt', 'id', 'rating'])
    }
    const everything = JSON.stringify(result.current.reviews)
    for (const secret of ['Smith', 'Cruz', 'lastname', 'photo', 'email', 'laura@example.com', 'user_id', 'img.test/laura']) {
      expect(everything).not.toContain(secret)
    }
  })

  it('reviews: a store without reviews is not asked for them', async () => {
    global.fetch = landingFetch({ business: { ...business, reviews: { total: 0, reviews_count: 0, reviews: [] } } })
    const { result } = renderHook(() => useStoreLanding(5))
    await settled(result)
    expect(result.current.reviews.data).toEqual({ average: 0, count: 0, recent: [] })
    expect(urlsOf(global.fetch, '/reviews')).toHaveLength(0)
  })

  it('featured: a store with no menu open for delivery is asked for pickup, then dine in', async () => {
    global.fetch = landingFetch({ products: (url) => (url.includes('type=1') ? [] : products) })
    const { result } = renderHook(() => useStoreLanding(5))
    await settled(result)
    expect(result.current.featured.data).toHaveLength(2)
    expect(urlsOf(global.fetch, '/products').map((url) => url.match(/type=(\d)/)[1])).toEqual(['1', '2'])
  })

  it('featured: shows at most eight', async () => {
    global.fetch = landingFetch({ products: Array.from({ length: 12 }, (_, index) => ({ id: index + 1, name: `Dish ${index}`, price: 1, featured: true })) })
    const { result } = renderHook(() => useStoreLanding(5))
    await settled(result)
    expect(result.current.featured.data).toHaveLength(8)
  })

  it('only the resources the caller names are requested (the business always)', async () => {
    const { result } = renderHook(() => useStoreLanding(5, ['featured']))
    await waitFor(() => expect(result.current.featured.data).toHaveLength(2))
    expect(result.current.services).toMatchObject({ data: null, loading: false })
    expect(result.current.reviews).toMatchObject({ data: null, loading: false })
    expect(urlsOf(global.fetch, '/menus')).toHaveLength(0)
    expect(urlsOf(global.fetch, '/reviews')).toHaveLength(0)
  })

  it('featured: an order type that fails is skipped like an empty one; an error only when all fail', async () => {
    global.fetch = landingFetch({ products: (url) => (url.includes('type=3') ? products : new Error('no menu')) })
    const { result } = renderHook(() => useStoreLanding(5))
    await settled(result)
    expect(result.current.featured.data).toHaveLength(2)
    expect(result.current.featured.error).toBeNull()
    expect(urlsOf(global.fetch, '/products')).toHaveLength(3)

    resetStoreLandingCache()
    global.fetch = landingFetch({ products: new Error('down') })
    const failing = renderHook(() => useStoreLanding(5))
    await settled(failing.result)
    expect(failing.result.current.featured.error.message).toBe('down')
    expect(urlsOf(global.fetch, '/products')).toHaveLength(3)
  })

  it('reviews: the rating averages only the criteria with a grade', async () => {
    const list = [{ ...reviewsList[0], id: 11, quality: 4, delivery: 0, service: 4, package: 4, comment: 'No delivery, still good.' }]
    global.fetch = landingFetch({ reviews: list })
    const { result } = renderHook(() => useStoreLanding(5))
    await settled(result)
    expect(result.current.reviews.data.recent).toHaveLength(1) // 4, not (4 + 0 + 4 + 4) / 4 = 3
    expect(result.current.reviews.data.recent[0].rating).toBe(4)
  })

  describe('the cache does not outlive an error or its TTL', () => {
    it('a caller that mounts after an error asks again; one that stays does not', async () => {
      let attempts = 0
      global.fetch = landingFetch({ business: () => (attempts++ === 0 ? new Error('boom') : business) })
      const first = renderHook(() => useStoreLanding(5))
      await waitFor(() => expect(first.result.current.business.error).toBeInstanceOf(Error))
      expect(urlsOf(global.fetch, '/business/5')).toHaveLength(1)
      first.unmount()

      const second = renderHook(() => useStoreLanding(5))
      await waitFor(() => expect(second.result.current.business.data?.id).toBe(5))
      expect(second.result.current.business.error).toBeNull()
      expect(urlsOf(global.fetch, '/business/5')).toHaveLength(2)
    })

    it('data older than five minutes is asked again on mount, keeping the old one meanwhile; fresh data is not', async () => {
      const now = vi.spyOn(Date, 'now')
      try {
        now.mockReturnValue(1_000_000)
        const first = renderHook(() => useStoreLanding(5))
        await settled(first.result)
        first.unmount()

        now.mockReturnValue(1_000_000 + 4 * 60 * 1000)
        const fresh = renderHook(() => useStoreLanding(5))
        expect(fresh.result.current.business.data.id).toBe(5)
        fresh.unmount()
        expect(urlsOf(global.fetch, '/business/5')).toHaveLength(1)

        global.fetch = landingFetch({ business: { ...business, name: 'Casa Lupita 2' } })
        now.mockReturnValue(1_000_000 + 6 * 60 * 1000)
        const stale = renderHook(() => useStoreLanding(5))
        expect(stale.result.current.business).toMatchObject({ loading: false, data: { name: 'Casa Lupita' } })
        await waitFor(() => expect(stale.result.current.business.data.name).toBe('Casa Lupita 2'))
        expect(urlsOf(global.fetch, '/business/5')).toHaveLength(1)
      } finally {
        now.mockRestore()
      }
    })

    it('a store that changes asks for the new one and never shows the old one\'s data', async () => {
      global.fetch = landingFetch({ business: (url) => ({ ...business, id: url.includes('/business/9') ? 9 : 5, name: url.includes('/business/9') ? 'Nine' : 'Casa Lupita' }) })
      const { result, rerender } = renderHook(({ store }) => useStoreLanding(store), { initialProps: { store: 5 } })
      await settled(result)
      expect(result.current.business.data.name).toBe('Casa Lupita')

      rerender({ store: 9 })
      expect(result.current.business).toMatchObject({ data: null, loading: true })
      expect(result.current.featured.data).toBeNull()
      await settled(result)
      expect(result.current.business.data.name).toBe('Nine')
      expect(urlsOf(global.fetch, '/business/9')).toHaveLength(1)
      expect(urlsOf(global.fetch, '/products').every((url) => url.includes('/business/5/') || url.includes('/business/9/'))).toBe(true)
      expect(urlsOf(global.fetch, '/products').some((url) => url.includes('/business/9/'))).toBe(true)
    })

    it('unmounting with a request in flight warns nothing and the next caller gets the answer', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        let release
        global.fetch = landingFetch({ business: () => new Promise((resolve) => { release = () => resolve(business) }) })
        const first = renderHook(() => useStoreLanding(5))
        await waitFor(() => expect(release).toBeTypeOf('function'))
        first.unmount()
        await act(async () => { release(); await Promise.resolve() })
        expect(spy).not.toHaveBeenCalled()

        const second = renderHook(() => useStoreLanding(5))
        expect(second.result.current.business.data.id).toBe(5)
        expect(urlsOf(global.fetch, '/business/5')).toHaveLength(1)
      } finally {
        spy.mockRestore()
      }
    })
  })
})

describe('landingSectionsWithData', () => {
  const resource = (data) => ({ data, loading: false, error: null })
  const full = {
    business: resource(business),
    featured: resource([{ id: 1 }]),
    services: resource({ delivery: { enabled: true }, pickup: { enabled: false }, eatin: { enabled: false } }),
    reviews: resource({ average: 4.8, count: 212, recent: [] })
  }

  it('lists the sections with something to show', () => {
    expect([...landingSectionsWithData(full)].sort()).toEqual(['about', 'featured', 'gallery', 'hero', 'reviews', 'services', 'visit'])
  })

  it('leaves out the ones without data', () => {
    const empty = {
      business: resource({ ...business, about: '', description: '  ', gallery: [{ id: 2, video: 'v' }], address: '' }),
      featured: resource([]),
      services: resource({ delivery: { enabled: false }, pickup: { enabled: false }, eatin: { enabled: false } }),
      reviews: resource({ average: 0, count: 0, recent: [] })
    }
    expect([...landingSectionsWithData(empty)]).toEqual(['hero'])
  })

  it('is empty before the business arrives', () => {
    expect(landingSectionsWithData({ business: { data: null }, featured: resource([{ id: 1 }]) }).size).toBe(0)
    expect(landingSectionsWithData(undefined).size).toBe(0)
  })

  it('about falls back to the description', () => {
    const sections = landingSectionsWithData({ ...full, business: resource({ ...business, about: '' }) })
    expect(sections.has('about')).toBe(true)
  })
})

describe('seedStoreLanding (what the Worker or the server already read)', () => {
  const services = { delivery: { enabled: true, time: 30 }, pickup: { enabled: false, time: null }, eatin: { enabled: false } }
  const seeded = { business, featured: [{ id: 1, name: 'Birria Tacos' }], services, reviews: { average: 4.8, count: 212, recent: [] } }

  beforeEach(() => {
    resetStoreLandingCache()
    global.fetch = landingFetch()
  })

  it('the first render has the data and nothing loading; the data is seeded stale, so mounting refreshes it quietly', async () => {
    seedStoreLanding(api.root, 'casa-lupita', seeded)
    const { result } = renderHook(() => useStoreLanding('casa-lupita'))
    expect(result.current.business).toMatchObject({ data: business, loading: false, error: null })
    expect(result.current.featured.data).toEqual(seeded.featured)
    expect(result.current.services.data).toEqual(services)
    expect(result.current.reviews.data).toEqual(seeded.reviews)
    // the refresh is quiet: the seeded data never goes back to loading
    await waitFor(() => expect(urlsOf(global.fetch, '/business/casa-lupita').length).toBeGreaterThan(0))
    await waitFor(() => expect(urlsOf(global.fetch, '/products').length).toBeGreaterThan(0))
    expect(result.current.business.loading).toBe(false)
    expect(result.current.featured.loading).toBe(false)
    await settled(result)
    expect(result.current.featured.data.map((dish) => dish.name)).toEqual(['Birria Tacos', 'Horchata'])
  })

  it('a resource that is null or missing is not seeded: it loads as usual', async () => {
    seedStoreLanding(api.root, 'casa-lupita', { business, featured: null, services, reviews: undefined })
    const { result } = renderHook(() => useStoreLanding('casa-lupita'))
    expect(result.current.featured.loading).toBe(true)
    expect(result.current.reviews.loading).toBe(true)
    await settled(result)
    expect(urlsOf(global.fetch, '/products').length).toBeGreaterThan(0)
    expect(result.current.business.loading).toBe(false) // seeded: only refreshed quietly
  })

  it('it is keyed by the API root and the store: another store or root does not see it', () => {
    seedStoreLanding('https://other.test/v400/en/x', 'casa-lupita', seeded)
    seedStoreLanding(api.root, 'other-store', seeded)
    const { result } = renderHook(() => useStoreLanding('casa-lupita'))
    expect(result.current.business.loading).toBe(true)
  })

  it('a seed whose refresh fails keeps its data on screen', async () => {
    global.fetch = landingFetch({ business: new Error('down') })
    seedStoreLanding(api.root, 'casa-lupita', seeded)
    const { result } = renderHook(() => useStoreLanding('casa-lupita'))
    await waitFor(() => expect(urlsOf(global.fetch, '/business/casa-lupita').length).toBeGreaterThan(0))
    await act(async () => {})
    expect(result.current.business).toMatchObject({ data: business, loading: false, error: null })
  })

  it('it renders on the server: the hook has a server snapshot (without it renderToString throws)', () => {
    seedStoreLanding(api.root, 'casa-lupita', seeded)
    const Probe = () => <p>{useStoreLanding('casa-lupita').business.data?.name}</p>
    expect(renderToString(<Probe />)).toContain('Casa Lupita')
  })
})
