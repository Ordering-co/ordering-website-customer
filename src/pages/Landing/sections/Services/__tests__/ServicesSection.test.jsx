import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { resetStoreLandingCache } from '../../../useStoreLanding'
import { business, fullWebsiteTheme, landingFetch } from '../../../__tests__/landingFixtures'
import { ServicesSection } from '../index'

vi.mock('~components/contexts/ApiContext', async () => {
  const { api } = await import('../../../__tests__/landingFixtures')
  return { useApi: () => [api] }
})

describe('ServicesSection', () => {
  beforeEach(() => {
    resetStoreLandingCache()
    global.fetch = landingFetch()
  })

  it('lists the services that are on, with their times', async () => {
    const { container } = renderWithProviders(<ServicesSection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByRole('heading', { level: 2, name: 'How you can enjoy us' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Delivery' })).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Pickup' })).toBeInTheDocument()
    expect(screen.getByText('15 min')).toBeInTheDocument()
    expect(screen.queryByText('Eat in')).toBeNull()
    expect(container.querySelector('h1')).toBeNull()
  })

  it('dine in appears when a menu serves it', async () => {
    global.fetch = landingFetch({ menus: [{ id: 1, delivery: false, pickup: false, eatin: true, enabled: true }] })
    renderWithProviders(<ServicesSection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByRole('heading', { level: 3, name: 'Eat in' })).toBeInTheDocument()
    expect(screen.queryByText('Delivery')).toBeNull()
  })

  it('a service without time shows no time', async () => {
    global.fetch = landingFetch({ business: { ...business, delivery_time: '00:00', pickup_time: null } })
    renderWithProviders(<ServicesSection store={5} />, { theme: fullWebsiteTheme() })
    await screen.findByText('Delivery')
    expect(screen.queryByText(/min$/)).toBeNull()
  })

  it('none on (or only disabled menus): nothing', async () => {
    global.fetch = landingFetch({ menus: [{ id: 1, delivery: true, pickup: true, eatin: true, enabled: false }] })
    const { container } = renderWithProviders(<ServicesSection store={5} />, { theme: fullWebsiteTheme() })
    await waitFor(() => expect(container.querySelector('[aria-busy]')).toBeNull())
    expect(container).toBeEmptyDOMElement()
  })

  it('loads with a skeleton, and a failed read hides it', async () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const loading = renderWithProviders(<ServicesSection store={5} />, { theme: fullWebsiteTheme() })
    expect(loading.container.querySelector('section[aria-busy="true"]')).not.toBeNull()
    loading.unmount()
    resetStoreLandingCache()
    global.fetch = landingFetch({ menus: new Error('boom') })
    const failed = renderWithProviders(<ServicesSection store={5} />, { theme: fullWebsiteTheme() })
    await waitFor(() => expect(failed.container.querySelector('[aria-busy]')).toBeNull())
    expect(failed.container).toBeEmptyDOMElement()
  })
})
