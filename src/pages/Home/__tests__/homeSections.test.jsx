import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../ui/src/styles/__tests__/themeTestUtils'
import { HomePage } from '../index'

const push = vi.fn()
const changeType = vi.fn()
const mockPagesGet = vi.fn()

let sessionState = { auth: false }
let configState = {
  configs: {
    order_types_allowed: { value: '1|2|3' },
    custom_order_enabled: { value: '0' }
  }
}
let orderState = {
  options: {
    type: 1,
    address: { location: { lat: 40.7, lng: -74.0 } }
  }
}

vi.mock('../../config', () => ({
  default: { use_kiosk: false }
}))
vi.mock('../../../components/HelmetTags', () => ({
  HelmetTags: ({ page }) => <div data-testid='helmet-tags' data-page={page} />
}))
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{
    pages: vi.fn(() => ({ get: mockPagesGet }))
  }]
}))
vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{ language: { code: 'en' } }]
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: sessionState.auth }]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [configState]
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [orderState, { changeType }]
}))
vi.mock('~ui/src/components/HomeHero', () => ({
  HomeHero: ({ onFindBusiness, urlLocation }) => (
    <div data-testid='home-hero'>
      <button type='button' onClick={onFindBusiness}>find-business</button>
      <span data-testid='url-location'>{urlLocation ? 'has-location' : 'no-location'}</span>
    </div>
  )
}))
vi.mock('~ui/src/components/PageBanner', () => ({
  PageBanner: ({ position }) => <div data-testid='page-banner' data-position={position} />
}))
vi.mock('~ui/src/components/CustomOrderBanner', () => ({
  CustomOrderBanner: ({ onCustomOrderClick }) => (
    <button type='button' data-testid='custom-order-banner' onClick={onCustomOrderClick}>
      custom-order
    </button>
  )
}))
vi.mock('~ui/src/components/CustomOrderModal', () => ({
  CustomOrderModal: ({ open }) => (
    open ? <div data-testid='custom-order-modal'>open</div> : null
  )
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useHistory: () => ({ push }),
    useLocation: () => ({ search: '?city=New+York&lat=40.7&lng=-74.0' })
  }
})

// The home's main sections in the order of the page (hero, custom order
// banner, content, promo banners)
const ids = (container) => Array.from(container.querySelectorAll('[data-testid="home-hero"], [data-testid="custom-order-banner"], [data-testid="home-content"], [data-testid="page-banner"]'))
  .map((el) => el.getAttribute('data-testid'))

const homeTheme = (sections) => {
  const theme = themeWithValues((values) => {
    values.pages.home = { footer: null, sections: sections.map(([key, visible]) => ({ key, visible })) }
    values.site.home_html = '<p data-testid="home-content">Theme home content</p>'
    return values
  })
  return theme
}

describe('home sections (pages.home)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionState = { auth: true }
    configState = { configs: { order_types_allowed: { value: '1' }, custom_order_enabled: { value: '1' } } }
    orderState = { options: { type: 1, address: { location: { lat: 1, lng: 2 } } } }
    mockPagesGet.mockResolvedValue({ content: { error: true, result: null } })
  })

  it('the hero first, the rest in the theme\'s order', async () => {
    const theme = homeTheme([['hero', true], ['login_account', true], ['promo_banners', true], ['content', true], ['custom_order_banner', true]])
    const { container } = renderWithProviders(<HomePage />, { theme })
    await waitFor(() => expect(container.querySelector('[data-testid="home-content"]')).not.toBeNull())
    expect(ids(container)).toEqual(['home-hero', 'page-banner', 'home-content', 'custom-order-banner'])
  })

  it('the custom order banner, the content and the promo banners can be hidden', async () => {
    const theme = homeTheme([['hero', true], ['login_account', true], ['custom_order_banner', false], ['content', false], ['promo_banners', false]])
    const { container } = renderWithProviders(<HomePage />, { theme })
    await waitFor(() => expect(mockPagesGet).toHaveBeenCalled())
    expect(ids(container)).toEqual(['home-hero'])
  })
})
