import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { resetStoreLandingCache } from '../../../useStoreLanding'
import { business, fullWebsiteTheme, landingFetch } from '../../../__tests__/landingFixtures'
import { VisitSection } from '../index'

vi.mock('~components/contexts/ApiContext', async () => {
  const { api } = await import('../../../__tests__/landingFixtures')
  return { useApi: () => [api] }
})

// the real map-image helper (the setup mocks ~ui/utils)
vi.unmock('~ui/utils')

// the map's keys come from the site's configs
const configState = vi.hoisted(() => ({ configs: {} }))
vi.mock('~components/contexts/ConfigContext', () => ({ useConfig: () => [configState] }))

describe('VisitSection', () => {
  beforeEach(() => {
    resetStoreLandingCache()
    configState.configs = {}
    global.fetch = landingFetch()
  })

  it('shows the address, the phone, the hours and the ways to order and to get there', async () => {
    configState.configs = { google_maps_api_key: { value: 'g-key' } }
    const { container } = renderWithProviders(<VisitSection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByRole('heading', { level: 2, name: 'Visit us' })).toBeInTheDocument()
    expect(screen.getByText('14277 Kuykendahl Rd, Tomball, TX 77375')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '(281) 555-0142' })).toHaveAttribute('href', 'tel:2815550142')
    // every day has the same hours: one row
    expect(container.querySelectorAll('dt')).toHaveLength(1)
    expect(container.querySelector('dt').textContent).toBe('Mon - Sun')
    expect(container.querySelector('dd').textContent).toMatch(/\d.* - .*\d/)
    expect(screen.getByRole('link', { name: 'Order now' })).toHaveAttribute('href', '/order')
    const directions = screen.getByRole('link', { name: 'Get Directions' })
    expect(directions).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=30.09,-95.62')
    expect(directions).toHaveAttribute('target', '_blank')
    expect(directions.getAttribute('rel')).toContain('noopener')
    const map = screen.getByAltText('Location map')
    expect(map.getAttribute('src')).toContain('maps.googleapis.com/maps/api/staticmap')
    expect(map).toHaveAttribute('loading', 'lazy')
    expect(container.querySelector('h1')).toBeNull()
  })

  it('without a map key the rest stays, with no map', async () => {
    renderWithProviders(<VisitSection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByText('14277 Kuykendahl Rd, Tomball, TX 77375')).toBeInTheDocument()
    expect(screen.queryByAltText('Location map')).toBeNull()
    expect(screen.getByRole('link', { name: 'Get Directions' })).toBeInTheDocument()
  })

  it('with only a Mapbox token the map is its still image', async () => {
    configState.configs = { map_box_token: { value: 'pk.test' } }
    renderWithProviders(<VisitSection store={5} />, { theme: fullWebsiteTheme() })
    expect((await screen.findByAltText('Location map')).getAttribute('src')).toContain('api.mapbox.com')
  })

  it('a store without a point sends directions to its address; without a phone or schedule those rows are gone', async () => {
    global.fetch = landingFetch({ business: { ...business, location: null, phone: null, cellphone: null, schedule: [] } })
    const { container } = renderWithProviders(<VisitSection store={5} />, { theme: fullWebsiteTheme() })
    const directions = await screen.findByRole('link', { name: 'Get Directions' })
    expect(directions.getAttribute('href')).toBe(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(business.address)}`)
    expect(screen.queryByRole('link', { name: /555/ })).toBeNull()
    expect(container.querySelector('dl')).toBeNull()
  })

  it('no address: nothing', async () => {
    global.fetch = landingFetch({ business: { ...business, address: '' } })
    const { container } = renderWithProviders(<VisitSection store={5} />, { theme: fullWebsiteTheme() })
    await waitFor(() => expect(container.querySelector('[aria-busy]')).toBeNull())
    expect(container).toBeEmptyDOMElement()
  })

  it('loads with a skeleton, and a failed read hides it', async () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const loading = renderWithProviders(<VisitSection store={5} />, { theme: fullWebsiteTheme() })
    expect(loading.container.querySelector('section[aria-busy="true"]')).not.toBeNull()
    loading.unmount()
    resetStoreLandingCache()
    global.fetch = landingFetch({ business: new Error('boom') })
    const failed = renderWithProviders(<VisitSection store={5} />, { theme: fullWebsiteTheme() })
    await waitFor(() => expect(failed.container.querySelector('[aria-busy]')).toBeNull())
    expect(failed.container).toBeEmptyDOMElement()
  })
})
