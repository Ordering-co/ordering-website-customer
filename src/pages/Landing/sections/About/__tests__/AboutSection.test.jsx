import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { resetStoreLandingCache } from '../../../useStoreLanding'
import { business, fullWebsiteTheme, landingFetch } from '../../../__tests__/landingFixtures'
import { AboutSection } from '../index'

vi.mock('~components/contexts/ApiContext', async () => {
  const { api } = await import('../../../__tests__/landingFixtures')
  return { useApi: () => [api] }
})

describe('AboutSection', () => {
  beforeEach(() => {
    resetStoreLandingCache()
    global.fetch = landingFetch()
  })

  it('tells the story with the first gallery photo and a way to order', async () => {
    const { container } = renderWithProviders(<AboutSection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByRole('heading', { level: 2, name: 'About Casa Lupita' })).toBeInTheDocument()
    expect(screen.getByText('Handmade corn tortillas and slow-cooked birria.')).toBeInTheDocument()
    expect(screen.getByText('Casual and welcoming.')).toBeInTheDocument()
    const photo = screen.getByRole('img')
    expect(photo).toHaveAttribute('src', 'https://img.test/g1.jpg')
    expect(photo).toHaveAttribute('alt', 'Casa Lupita')
    expect(photo).toHaveAttribute('loading', 'lazy')
    expect(screen.getByRole('link', { name: 'Order now' })).toHaveAttribute('href', '/order')
    expect(container.querySelector('h1')).toBeNull()
  })

  it('a store name with replacement patterns is shown as written', async () => {
    global.fetch = landingFetch({ business: { ...business, name: "Tom's $& $1 Grill" } })
    renderWithProviders(<AboutSection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByRole('heading', { level: 2, name: "About Tom's $& $1 Grill" })).toBeInTheDocument()
  })

  it('falls back to the description, and has no photo without a gallery', async () => {
    global.fetch = landingFetch({ business: { ...business, about: '', gallery: [] } })
    renderWithProviders(<AboutSection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByText('Street tacos and bold Mexican plates, made daily')).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('no text: nothing', async () => {
    global.fetch = landingFetch({ business: { ...business, about: null, description: '' } })
    const { container } = renderWithProviders(<AboutSection store={5} />, { theme: fullWebsiteTheme() })
    await waitFor(() => expect(container.querySelector('[aria-busy]')).toBeNull())
    expect(container).toBeEmptyDOMElement()
  })

  it('loads with a skeleton, and a failed read hides it', async () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const loading = renderWithProviders(<AboutSection store={5} />, { theme: fullWebsiteTheme() })
    expect(loading.container.querySelector('section[aria-busy="true"]')).not.toBeNull()
    loading.unmount()
    resetStoreLandingCache()
    global.fetch = landingFetch({ business: new Error('boom') })
    const failed = renderWithProviders(<AboutSection store={5} />, { theme: fullWebsiteTheme() })
    await waitFor(() => expect(failed.container.querySelector('[aria-busy]')).toBeNull())
    expect(failed.container).toBeEmptyDOMElement()
  })
})
