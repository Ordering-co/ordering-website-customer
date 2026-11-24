import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { resetStoreLandingCache } from '../../../useStoreLanding'
import { business, fullWebsiteTheme, landingFetch } from '../../../__tests__/landingFixtures'
import { ReviewsSection } from '../index'

vi.mock('~components/contexts/ApiContext', async () => {
  const { api } = await import('../../../__tests__/landingFixtures')
  return { useApi: () => [api] }
})

describe('ReviewsSection', () => {
  beforeEach(() => {
    resetStoreLandingCache()
    global.fetch = landingFetch()
  })

  it('shows the average, the count and three recent reviews by first name and initial', async () => {
    const { container } = renderWithProviders(<ReviewsSection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByRole('heading', { level: 2, name: 'What guests say' })).toBeInTheDocument()
    expect(screen.getByText('4.8')).toBeInTheDocument()
    expect(screen.getByText('212 reviews')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('Handmade tortillas and great salsa.')).toBeInTheDocument()
    expect(screen.getByText('Laura S.')).toBeInTheDocument()
    expect(screen.getByText('Daniel C.')).toBeInTheDocument()
    expect(screen.queryByText(/Smith|Cruz/)).toBeNull()
    expect(container.querySelector('img[src*="laura"]')).toBeNull()
    expect(container.querySelector('h1')).toBeNull()
  })

  it('a review without a name reads as a guest', async () => {
    global.fetch = landingFetch({ reviews: [{ id: 1, quality: 5, delivery: 5, service: 5, package: 5, comment: 'Great.', user: null }] })
    renderWithProviders(<ReviewsSection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByText('Guest')).toBeInTheDocument()
  })

  it('no reviews: nothing', async () => {
    global.fetch = landingFetch({ business: { ...business, reviews: { total: 0, reviews_count: 0, reviews: [] } } })
    const { container } = renderWithProviders(<ReviewsSection store={5} />, { theme: fullWebsiteTheme() })
    await waitFor(() => expect(container.querySelector('[aria-busy]')).toBeNull())
    expect(container).toBeEmptyDOMElement()
  })

  it('loads with a skeleton, and a failed read hides it', async () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const loading = renderWithProviders(<ReviewsSection store={5} />, { theme: fullWebsiteTheme() })
    expect(loading.container.querySelector('section[aria-busy="true"]')).not.toBeNull()
    loading.unmount()
    resetStoreLandingCache()
    global.fetch = landingFetch({ reviews: new Error('boom') })
    const failed = renderWithProviders(<ReviewsSection store={5} />, { theme: fullWebsiteTheme() })
    await waitFor(() => expect(failed.container.querySelector('[aria-busy]')).toBeNull())
    expect(failed.container).toBeEmptyDOMElement()
  })
})
