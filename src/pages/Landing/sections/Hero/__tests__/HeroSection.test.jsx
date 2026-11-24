import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../../ui/src/styles/__tests__/themeTestUtils'
import { resetStoreLandingCache } from '../../../useStoreLanding'
import { business, fullWebsiteTheme, landingFetch } from '../../../__tests__/landingFixtures'
import { HeroSection } from '../index'

vi.mock('~components/contexts/ApiContext', async () => {
  const { api } = await import('../../../__tests__/landingFixtures')
  return { useApi: () => [api] }
})

const siteNamed = (name) => themeWithValues((values) => {
  values.site = { ...values.site, experience: 'full_website', name }
})

describe('HeroSection', () => {
  beforeEach(() => {
    resetStoreLandingCache()
    global.fetch = landingFetch()
  })

  it('shows the store: the page\'s only h1, its description, the photo and two real links to the menu', async () => {
    const { container } = renderWithProviders(<HeroSection store='casa-lupita' />, { theme: fullWebsiteTheme() })
    expect(await screen.findByRole('heading', { level: 1, name: 'Casa Lupita' })).toBeInTheDocument()
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByText('Street tacos and bold Mexican plates, made daily')).toBeInTheDocument()
    expect(container.querySelector('img[src="https://img.test/header.jpg"]')).toHaveAttribute('alt', '')
    expect(container.querySelector('section')).toHaveAttribute('aria-labelledby', 'landing-hero-title')
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Order now', 'See the menu'])
    links.forEach((link) => expect(link).toHaveAttribute('href', '/order'))
    expect(screen.getByText('Open now')).toBeInTheDocument()
  })

  it('a plain click goes to the menu inside the app; a modified one is left to the browser', async () => {
    renderWithProviders(<><HeroSection store={5} /><Route path='/order'>menu page</Route></>, { theme: fullWebsiteTheme() })
    const link = await screen.findByRole('link', { name: 'Order now' })
    // seen after the router's handler; stops jsdom from trying to follow the link
    let prevented
    const watch = (event) => { prevented = event.defaultPrevented; event.preventDefault() }
    document.addEventListener('click', watch)
    fireEvent.click(link, { ctrlKey: true })
    document.removeEventListener('click', watch)
    expect(prevented).toBe(false) // left to the browser
    expect(screen.queryByText('menu page')).toBeNull()
    expect(fireEvent.click(link)).toBe(false) // prevented: the router navigates
    expect(await screen.findByText('menu page')).toBeInTheDocument()
  })

  it('without the full website the menu is the site\'s home', async () => {
    renderWithProviders(<HeroSection store={5} />, { theme: themeWithValues() })
    expect(await screen.findByRole('link', { name: 'Order now' })).toHaveAttribute('href', '/')
  })

  it('a closed store says when it opens', async () => {
    global.fetch = landingFetch({ business: { ...business, open: false } })
    renderWithProviders(<HeroSection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByText(/^Closed/)).toBeInTheDocument()
    expect(screen.getByText(/Opens/)).toBeInTheDocument()
  })

  it('a store without a photo still has its title and no image', async () => {
    global.fetch = landingFetch({ business: { ...business, header: null, description: '' } })
    const { container } = renderWithProviders(<HeroSection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('loads with blocks in the hero\'s layout and the site\'s name as the h1, and nothing without a store', async () => {
    global.fetch = vi.fn(() => new Promise(() => {}))
    const { container, unmount } = renderWithProviders(<HeroSection store={5} />, { theme: siteNamed('Casa Site') })
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Casa Site' })).toBeInTheDocument()
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(3) // title, text and the buttons
    unmount()
    const none = renderWithProviders(<HeroSection store={null} />, { theme: fullWebsiteTheme() })
    expect(none.container).toBeEmptyDOMElement()
  })

  it('an error keeps the site\'s name as the h1, or becomes the h1 when the site has none', async () => {
    global.fetch = landingFetch({ business: new Error('boom') })
    const named = renderWithProviders(<HeroSection store={5} />, { theme: siteNamed('Casa Site') })
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load this restaurant.')
    expect(screen.getByRole('heading', { level: 1, name: 'Casa Site' })).toBeInTheDocument()
    named.unmount()

    resetStoreLandingCache()
    const anonymous = renderWithProviders(<HeroSection store={5} />, { theme: siteNamed('') })
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load this restaurant.')
    expect(screen.getByRole('heading', { level: 1, name: 'We could not load this restaurant.' })).toBeInTheDocument()
    expect(anonymous.container.querySelectorAll('h1')).toHaveLength(1)
  })

  it('an error says so and retries in place', async () => {
    let attempts = 0
    global.fetch = landingFetch({ business: () => (attempts++ === 0 ? new Error('boom') : business) })
    renderWithProviders(<HeroSection store={5} />, { theme: fullWebsiteTheme() })
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load this restaurant.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Casa Lupita' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  describe('while its site still looks for the store (loading / error / retry without a store)', () => {
    it('loading is the skeleton under the site\'s name; without loading or error it is nothing', () => {
      global.fetch = vi.fn()
      const { container, unmount } = renderWithProviders(<HeroSection store={null} loading />, { theme: siteNamed('Casa Site') })
      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
      expect(screen.getByRole('heading', { level: 1, name: 'Casa Site' })).toBeInTheDocument()
      unmount()
      expect(renderWithProviders(<HeroSection store={null} />, { theme: siteNamed('Casa Site') }).container).toBeEmptyDOMElement()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('an error is the error with the caller\'s retry, and wins over loading', () => {
      const retry = vi.fn()
      renderWithProviders(<HeroSection store={null} loading error={new Error('boom')} retry={retry} />, { theme: siteNamed('Casa Site') })
      expect(screen.getByRole('alert')).toHaveTextContent('We could not load this restaurant.')
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
      expect(retry).toHaveBeenCalledTimes(1)
    })

    it('a store given is read as always: these props are ignored', async () => {
      renderWithProviders(<HeroSection store={5} error={new Error('boom')} loading />, { theme: fullWebsiteTheme() })
      expect(await screen.findByRole('heading', { level: 1, name: 'Casa Lupita' })).toBeInTheDocument()
    })
  })
})
