import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../../ui/src/styles/__tests__/themeTestUtils'
import { marketplaceSections } from '../../marketplace'
import { POPULAR_STORES_MAX, POPULAR_STORES_PARAMS } from '..'

const PopularStores = marketplaceSections.popular_stores

const orderState = vi.hoisted(() => ({ current: { options: { type: 1 }, carts: {} } }))
const configState = vi.hoisted(() => ({
  current: { configs: { location_default_latitude: { value: '40.7' }, location_default_longitude: { value: '-74' } } }
}))
const emit = vi.hoisted(() => vi.fn())

vi.mock('~components/contexts/OrderContext', () => ({ useOrder: () => [orderState.current] }))
vi.mock('~components/contexts/ConfigContext', () => ({ useConfig: () => [configState.current] }))
vi.mock('~components/contexts/EventContext', () => ({ useEvent: () => [{ emit }] }))
vi.mock('~components/contexts/WebsocketContext', () => ({ useWebsocket: () => null }))
// the SDK's base, as the controllers read it (the shared mock of setupTests wraps it in an array)
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{ root: 'https://api.ordering.test', appId: 'marketplace-test', appInternalName: 'website' }]
}))
vi.mock('~components/contexts/OrderingThemeContext', () => ({ useOrderingTheme: () => [{}] }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))

const fullWebsite = themeWithValues((values) => {
  values.site.experience = 'full_website'
  return values
})

// A store as GET /businesses answers it with the params of the section
const store = (id, name) => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s/g, '-'),
  logo: `https://cdn.test/${id}-logo.png`,
  header: `https://cdn.test/${id}-header.jpg`,
  open: true,
  enabled: true,
  featured: true,
  timezone: 'America/New_York',
  today: { enabled: true, lapses: [{ open: { hour: 9, minute: 0 }, close: { hour: 22, minute: 0 } }] },
  delivery_time: '0:30',
  pickup_time: '0:15',
  delivery_price: 2.5,
  distance: 1.2,
  reviews: { total: 4.7 },
  types: [{ id: 1, name: 'Food' }]
})
const stores = [store(1, 'Casa Verde'), store(2, 'Noodle Bar'), store(3, 'La Panaderia')]
const answer = (result, extra = {}) => vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ error: false, result, pagination: { current_page: 1, total_pages: 1, total: result.length, page_size: 8 }, ...extra }) }))
const requested = (call = 0) => new URL(global.fetch.mock.calls[call][0])

const page = () => renderWithProviders(<PopularStores />, { theme: fullWebsite })

describe('PopularStores (landing section)', () => {
  const realFetch = global.fetch
  beforeEach(() => {
    emit.mockClear()
    orderState.current = { options: { type: 1, address: { address: '350 5th Ave', location: { lat: 4.5, lng: -74.1 } } }, carts: {} }
    configState.current = { configs: { location_default_latitude: { value: '40.7' }, location_default_longitude: { value: '-74' } } }
    global.fetch = answer(stores)
  })
  afterEach(() => {
    global.fetch = realFetch
  })

  it('asks for the featured stores with explicit params, a page of 8 and the address\'s location', async () => {
    const { findByText } = page()
    await findByText('Casa Verde')
    const url = requested()
    expect(url.pathname).toBe('/businesses')
    expect(url.searchParams.get('params')).toBe(POPULAR_STORES_PARAMS.join(','))
    expect(POPULAR_STORES_PARAMS).toEqual(expect.arrayContaining(['id', 'name', 'slug', 'header', 'logo', 'delivery_time', 'pickup_time', 'reviews', 'featured', 'enabled']))
    expect(JSON.parse(url.searchParams.get('where')).conditions).toContainEqual({ attribute: 'featured', value: true })
    expect(url.searchParams.get('page_size')).toBe(String(POPULAR_STORES_MAX))
    expect(POPULAR_STORES_MAX).toBe(8)
    expect(JSON.parse(url.searchParams.get('location'))).toEqual({ lat: 4.5, lng: -74.1 })
    expect(url.searchParams.get('order_type_id')).toBe('1')
  })

  it('shows each store\'s card: name as a link to the store, time and rating, under an h2', async () => {
    const { findByText, getByRole, getAllByRole, container } = page()
    await findByText('Casa Verde')
    expect(getByRole('heading', { level: 2, name: 'Popular near you' })).toBeInTheDocument()
    expect(container.querySelector('section')).toHaveAttribute('id', 'landing-popular_stores')
    expect(container.querySelector('h1')).toBeNull()
    expect(getByRole('link', { name: 'Casa Verde' })).toHaveAttribute('href', '/store/casa-verde')
    expect(getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Casa Verde', 'Noodle Bar', 'La Panaderia'])
    expect(container).toHaveTextContent('0:30')
    expect(container).toHaveTextContent('4.7')
  })

  it('opening a card goes to the store as the listing does', async () => {
    const { findByRole } = page()
    fireEvent.click(await findByRole('link', { name: 'Noodle Bar' }))
    expect(emit).toHaveBeenCalledWith('go_to_page', { page: 'business', params: { business_slug: 'noodle-bar' } })
  })

  it('"See all" is a real link to the menu (/order)', async () => {
    const { findByText, getByRole, container } = page()
    await findByText('Casa Verde')
    const seeAll = getByRole('link', { name: 'See all' })
    expect(seeAll.tagName).toBe('A')
    expect(seeAll).toHaveAttribute('href', '/order')
    expect(container.querySelector('a[href="/order"]')).toBe(seeAll)
  })

  it('shows no more than 8 stores', async () => {
    global.fetch = answer(Array.from({ length: 10 }, (_, i) => store(i + 1, `Store ${i + 1}`)))
    const { findByText, getAllByRole } = page()
    await findByText('Store 1')
    expect(getAllByRole('heading', { level: 3 })).toHaveLength(8)
  })

  it('without an address it asks near the project\'s default location', async () => {
    orderState.current = { options: { type: 1 }, carts: {} }
    const { findByText } = page()
    await findByText('Casa Verde')
    expect(JSON.parse(requested().searchParams.get('location'))).toEqual({ lat: 40.7, lng: -74 })
  })

  it('with no valid location at all it asks for nothing and shows nothing', async () => {
    orderState.current = { options: { type: 1 }, carts: {} }
    configState.current = { configs: {} }
    const { container } = page()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(global.fetch).not.toHaveBeenCalled()
    expect(container).toBeEmptyDOMElement()
  })

  it('a skeleton in the final layout while it loads, with no heading yet', () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const { getAllByTestId, queryByRole, container } = page()
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0)
    expect(queryByRole('heading')).toBeNull()
    expect(container.querySelector('section')).toHaveAttribute('aria-busy', 'true')
  })

  it('an error: the message and a Retry that asks again', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({ json: () => Promise.resolve({ error: true, result: ['Server error'] }) }))
      .mockImplementation(answer(stores))
    const { findByRole, findByText, queryByRole } = page()
    expect(await findByRole('heading', { name: 'We couldn\'t load the stores' })).toBeInTheDocument()
    expect(queryByRole('link', { name: 'See all' })).toBeNull()
    fireEvent.click(await findByRole('button', { name: 'Retry' }))
    expect(await findByText('Casa Verde')).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(requested(1).searchParams.get('params')).toBe(POPULAR_STORES_PARAMS.join(','))
  })

  it('a request that fails to answer is an error too', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('offline')))
    const { findByRole } = page()
    expect(await findByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('0 stores: no section', async () => {
    global.fetch = answer([])
    const { container } = page()
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    await waitFor(() => expect(container.querySelector('section')).toBeNull())
    expect(container).toBeEmptyDOMElement()
  })
})
