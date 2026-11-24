import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { resetStoreLandingCache } from '../../../useStoreLanding'
import { business, fullWebsiteTheme, landingFetch } from '../../../__tests__/landingFixtures'
import { GallerySection } from '../index'

vi.mock('~components/contexts/ApiContext', async () => {
  const { api } = await import('../../../__tests__/landingFixtures')
  return { useApi: () => [api] }
})

describe('GallerySection', () => {
  beforeEach(() => {
    resetStoreLandingCache()
    global.fetch = landingFetch()
  })

  it('shows the photos (not the videos), each with a useful alt and lazy', async () => {
    const { container } = renderWithProviders(<GallerySection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByRole('heading', { level: 2, name: 'Photos' })).toBeInTheDocument()
    const photos = screen.getAllByRole('img')
    expect(photos.map((img) => img.getAttribute('src'))).toEqual(['https://img.test/g1.jpg', 'https://img.test/g3.jpg'])
    expect(photos.map((img) => img.getAttribute('alt'))).toEqual(['Photo 1 of Casa Lupita', 'Photo 2 of Casa Lupita'])
    photos.forEach((img) => expect(img).toHaveAttribute('loading', 'lazy'))
    expect(container.querySelector('h1')).toBeNull()
  })

  it('a store name with replacement patterns is shown as written in the alt', async () => {
    global.fetch = landingFetch({ business: { ...business, name: 'Tom $& $1 Grill' } })
    renderWithProviders(<GallerySection store={5} />, { theme: fullWebsiteTheme() })
    expect((await screen.findAllByRole('img'))[0]).toHaveAttribute('alt', 'Photo 1 of Tom $& $1 Grill')
  })

  it('shows twelve at most', async () => {
    global.fetch = landingFetch({ business: { ...business, gallery: Array.from({ length: 20 }, (_, index) => ({ id: index, file: `https://img.test/${index}.jpg` })) } })
    renderWithProviders(<GallerySection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findAllByRole('img')).toHaveLength(12)
  })

  it('no photo (only videos): nothing', async () => {
    global.fetch = landingFetch({ business: { ...business, gallery: [{ id: 2, video: 'https://video.test/v.mp4' }] } })
    const { container } = renderWithProviders(<GallerySection store={5} />, { theme: fullWebsiteTheme() })
    await waitFor(() => expect(container.querySelector('[aria-busy]')).toBeNull())
    expect(container).toBeEmptyDOMElement()
  })

  it('loads with a skeleton, and a failed read hides it', async () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const loading = renderWithProviders(<GallerySection store={5} />, { theme: fullWebsiteTheme() })
    expect(loading.container.querySelector('section[aria-busy="true"]')).not.toBeNull()
    loading.unmount()
    resetStoreLandingCache()
    global.fetch = landingFetch({ business: new Error('boom') })
    const failed = renderWithProviders(<GallerySection store={5} />, { theme: fullWebsiteTheme() })
    await waitFor(() => expect(failed.container.querySelector('[aria-busy]')).toBeNull())
    expect(failed.container).toBeEmptyDOMElement()
  })
})
