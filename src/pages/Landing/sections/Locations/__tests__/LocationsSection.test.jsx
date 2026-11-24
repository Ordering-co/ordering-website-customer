import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../../ui/src/styles/__tests__/themeTestUtils'
import { resetFranchiseStoresCache } from '../../../useFranchiseStores'
import { franchiseFetch, franchiseStores } from '../../../__tests__/landingFixtures'
import { LocationsSection } from '../index'

vi.mock('~components/contexts/ApiContext', async () => {
  const { api } = await import('../../../__tests__/landingFixtures')
  return { useApi: () => [api] }
})

// the map's keys and the clock format come from the site's configs; the site's store path from its settings
const state = vi.hoisted(() => ({ configs: {}, site: { business_url_template: '/store/:business_slug' } }))
vi.mock('~components/contexts/ConfigContext', () => ({ useConfig: () => [state] }))
vi.mock('~components/contexts/SiteContext', () => ({ useSite: () => [{ site: state.site }] }))

const theme = themeWithValues((values) => {
  values.site = { ...values.site, mode: 'franchise', experience: 'full_website', franchise_id: 7 }
})
// where the router is, to see a click navigate
const Where = () => <Route path='*' render={({ location }) => <output data-testid='where'>{location.pathname}</output>} />
const draw = () => renderWithProviders(<><LocationsSection /><Where /></>, { theme })

// 18:00 UTC: 12:00 in Houston (open, until 9 pm), 03:00 the next day in Tokyo (closed, opens at 7 am)
const NOW = new Date('2026-11-18T18:00:00Z')

describe('LocationsSection', () => {
  beforeEach(() => {
    resetFranchiseStoresCache()
    state.configs = { dates_general_format: { value: 'YYYY-MM-DD hh:mm a' } }
    state.site = { business_url_template: '/store/:business_slug' }
    global.fetch = franchiseFetch()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('is the section with its title and subtitle, a card per store under an h3, and no h1', async () => {
    const { container } = draw()
    const heading = await screen.findByRole('heading', { level: 2, name: 'Our locations' })
    const section = container.querySelector('section#landing-locations')
    expect(section).toHaveAttribute('aria-labelledby', heading.id)
    expect(within(section).getByText('Pick the one closest to you.')).toBeInTheDocument()
    expect(within(section).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Downtown', 'Tomball', 'Katy'])
    expect(within(section).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('1 Main St, Houston, TX')).toBeInTheDocument()
    expect(container.querySelector('h1')).toBeNull()
  })

  it('says whether each store is open in its own time zone, from its schedule; none without one', async () => {
    draw()
    const cards = (await screen.findAllByRole('listitem')).map((card) => card.textContent)
    expect(cards[0]).toMatch(/Open · until 09:00 pm/)
    expect(cards[2]).toMatch(/Closed · opens 07:00 am/)
    // Tomball has no schedule: only the address
    expect(cards[1]).not.toMatch(/Open|Closed|opens|until/)
    // the API says Katy is closed and Downtown open; the clock decides, so a store the API calls open is
    // closed outside its hours
    vi.setSystemTime(new Date('2026-11-18T09:00:00Z')) // 03:00 in Houston
    resetFranchiseStoresCache()
    global.fetch = franchiseFetch()
    const again = draw()
    await waitFor(() => expect(within(again.container).getAllByRole('listitem')[0]).toHaveTextContent(/Closed · opens 07:00 am/))
  })

  it('the button is a link to the store: Order here when open or without schedule, Preorder when closed', async () => {
    draw()
    const order = await screen.findByRole('link', { name: 'Order here Downtown' })
    expect(order).toHaveAttribute('href', '/store/downtown')
    expect(screen.getByRole('link', { name: 'Order here Tomball' })).toHaveAttribute('href', '/store/casa-lupita')
    expect(screen.getByRole('link', { name: 'Preorder Katy' })).toHaveAttribute('href', '/store/katy')
    expect(screen.queryByRole('link', { name: /Order here Katy/ })).toBeNull()
  })

  it('a paused store (API open false) with an open schedule reads Closed and offers Preorder', async () => {
    global.fetch = franchiseFetch({ stores: franchiseStores.map((store) => (store.id === 2 ? { ...store, open: false } : store)) })
    draw()
    const cards = (await screen.findAllByRole('listitem')).map((card) => card.textContent)
    expect(cards[0]).toMatch(/Closed/)
    expect(cards[0]).not.toMatch(/Open|opens|until/)
    expect(screen.getByRole('link', { name: 'Preorder Downtown' })).toHaveAttribute('href', '/store/downtown')
  })

  it('the link follows the site\'s store URL template', async () => {
    state.site = { business_url_template: '/:business_slug' }
    draw()
    expect(await screen.findByRole('link', { name: 'Order here Downtown' })).toHaveAttribute('href', '/downtown')
  })

  it('a store whose slug is `order` goes to /store/order: with the short template /order is the menu', async () => {
    state.site = { business_url_template: '/:business_slug' }
    global.fetch = franchiseFetch({ stores: franchiseStores.map((store) => (store.id === 2 ? { ...store, slug: 'order' } : store)) })
    draw()
    expect(await screen.findByRole('link', { name: 'Order here Downtown' })).toHaveAttribute('href', '/store/order')
    expect(screen.getByRole('link', { name: 'Preorder Katy' })).toHaveAttribute('href', '/katy')
  })

  it('a plain click goes to the store inside the app; a click for a new tab is the browser\'s', async () => {
    draw()
    const link = await screen.findByRole('link', { name: 'Preorder Katy' })
    // what the app left of the click (jsdom cannot navigate: the spy stops it after looking)
    const left = []
    const spy = (event) => { left.push(event.defaultPrevented); event.preventDefault() }
    document.addEventListener('click', spy)
    fireEvent.click(link, { ctrlKey: true })
    expect(screen.getByTestId('where')).toHaveTextContent('/')
    fireEvent.click(link)
    document.removeEventListener('click', spy)
    expect(left).toEqual([false, true]) // the second one the SPA took
    expect(screen.getByTestId('where')).toHaveTextContent('/store/katy')
  })

  it('draws one map with every store that has a point, as a lazy image', async () => {
    state.configs = { ...state.configs, google_maps_api_key: { value: 'g-key' } }
    draw()
    const map = await screen.findByAltText('Map of our locations')
    expect(map).toHaveAttribute('loading', 'lazy')
    const src = map.getAttribute('src')
    expect(src).toContain('maps.googleapis.com/maps/api/staticmap')
    expect(src).not.toContain('center=')
    expect(['29.76,-95.37', '30.09,-95.62', '29.79,-95.82'].every((point) => src.includes(point))).toBe(true)
  })

  it('without a map key the map is gone and the cards stay; Mapbox alone draws its own', async () => {
    const first = draw()
    await screen.findByRole('link', { name: 'Order here Downtown' })
    expect(screen.queryByAltText('Map of our locations')).toBeNull()
    first.unmount()
    state.configs = { ...state.configs, map_box_token: { value: 'pk.test' } }
    draw()
    expect((await screen.findByAltText('Map of our locations')).getAttribute('src')).toContain('api.mapbox.com')
  })

  it('a failed read is a message with a retry that asks again', async () => {
    let attempts = 0
    global.fetch = franchiseFetch({ stores: () => (attempts++ === 0 ? new Error('boom') : franchiseStores) })
    draw()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("We couldn't load the stores")
    expect(screen.getByRole('heading', { level: 2, name: 'Our locations' })).toBeInTheDocument()
    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('link', { name: 'Order here Downtown' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a franchise with no stores draws nothing', async () => {
    global.fetch = franchiseFetch({ stores: [] })
    const { container } = draw()
    await waitFor(() => expect(container.querySelector('[aria-busy]')).toBeNull())
    expect(container.querySelector('section')).toBeNull()
  })

  it('loads as a skeleton in the final layout, with no title text to read', () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const { container } = draw()
    const skeleton = container.querySelector('section#landing-locations[aria-busy="true"]')
    expect(skeleton).not.toBeNull()
    expect(skeleton.querySelectorAll('[aria-hidden="true"] > div > div').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading')).toBeNull()
  })
})
