import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { resetStoreLandingCache } from '../../../useStoreLanding'
import { fullWebsiteTheme, landingFetch } from '../../../__tests__/landingFixtures'
import { FeaturedSection } from '../index'

vi.mock('~components/contexts/ApiContext', async () => {
  const { api } = await import('../../../__tests__/landingFixtures')
  return { useApi: () => [api] }
})

describe('FeaturedSection', () => {
  beforeEach(() => {
    resetStoreLandingCache()
    global.fetch = landingFetch()
  })

  it('lists the featured dishes with photo and price, and links to the menu', async () => {
    const { container } = renderWithProviders(<FeaturedSection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByRole('heading', { level: 2, name: 'Featured' })).toBeInTheDocument()
    expect(container.querySelector('h1')).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('heading', { level: 3, name: 'Birria Tacos' })).toBeInTheDocument()
    expect(screen.getByText('$14.99')).toBeInTheDocument()
    expect(screen.getByAltText('Birria Tacos')).toHaveAttribute('loading', 'lazy')
    expect(screen.getByRole('link', { name: 'View menu' })).toHaveAttribute('href', '/order')
    expect(container.querySelector('section')).toHaveAttribute('id', 'landing-featured')
    expect(container.querySelector('section')).toHaveAttribute('aria-labelledby', 'landing-featured-title')
  })

  it('no featured dish: nothing, not even the title', async () => {
    global.fetch = landingFetch({ products: [{ id: 2, name: 'Plain Rice', price: 3, featured: false }] })
    const { container } = renderWithProviders(<FeaturedSection store={5} />, { theme: fullWebsiteTheme() })
    await waitFor(() => expect(container.querySelector('[aria-busy]')).toBeNull())
    expect(container).toBeEmptyDOMElement()
  })

  it('loads with a skeleton of the final layout', () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const { container } = renderWithProviders(<FeaturedSection store={5} />, { theme: fullWebsiteTheme() })
    expect(container.querySelector('section[aria-busy="true"]')).not.toBeNull()
    expect(container.querySelector('h2')).toBeNull()
  })

  it('a failed read hides the section', async () => {
    global.fetch = landingFetch({ products: new Error('boom') })
    const { container } = renderWithProviders(<FeaturedSection store={5} />, { theme: fullWebsiteTheme() })
    await waitFor(() => expect(container.querySelector('[aria-busy]')).toBeNull())
    expect(container).toBeEmptyDOMElement()
  })

  it('does not ask for what it does not show', async () => {
    renderWithProviders(<FeaturedSection store={5} />, { theme: fullWebsiteTheme() })
    await screen.findByText('Featured')
    expect(global.fetch.mock.calls.some(([url]) => String(url).includes('/reviews') || String(url).includes('/menus'))).toBe(false)
  })
})
