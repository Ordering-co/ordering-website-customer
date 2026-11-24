import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../ui/src/styles/__tests__/themeTestUtils'
import { LandingPage } from '../../index'
import { resetFranchiseStoresCache } from '../../useFranchiseStores'
import { franchiseFetch, franchiseStores, urlsOf } from '../../__tests__/landingFixtures'
import franchise from '../franchise'

// The network is fetch's (the site's footer pages, which are not under test, answer nothing); the theme,
// the page and every section are real.
vi.mock('~components/contexts/ApiContext', async () => {
  const { api } = await import('../../__tests__/landingFixtures')
  const pages = () => ({ get: () => Promise.resolve({ content: { error: false, result: [] } }) })
  return { useApi: () => [{ ...api, pages }] }
})

const franchiseTheme = (mutate) => themeWithValues((values) => {
  values.site = { ...values.site, mode: 'franchise', experience: 'full_website', franchise_id: 7, name: 'Taco Group' }
  mutate?.(values)
})
const draw = (theme = franchiseTheme()) => renderWithProviders(<LandingPage />, { theme })
const nav = () => within(screen.getByRole('navigation', { name: 'Main' }))
const businessReads = () => urlsOf(global.fetch, '/business/2').concat(urlsOf(global.fetch, '/business/5'), urlsOf(global.fetch, '/business/9'))

describe('the franchise map', () => {
  beforeEach(() => {
    resetFranchiseStoresCache()
    global.fetch = franchiseFetch()
  })
  afterEach(() => vi.restoreAllMocks())

  it('has the sections of one store\'s story, the locations and the app, its header and footer; not services or visit', () => {
    expect(Object.keys(franchise).sort()).toEqual(['Footer', 'Header', 'about', 'app', 'featured', 'gallery', 'hero', 'locations', 'reviews'])
  })

  describe('locations', () => {
    const section = (container) => container.querySelector('#landing-locations')

    it('lists every store of the franchise, between the dishes and the story, with the way to order from each', async () => {
      const { container } = draw()
      const locations = await waitFor(() => {
        const element = section(container)
        expect(within(element).getByRole('heading', { level: 3, name: 'Katy' })).toBeInTheDocument()
        return element
      })
      expect(within(locations).getByRole('heading', { level: 2, name: 'Our locations' })).toBeInTheDocument()
      expect(within(locations).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Downtown', 'Tomball', 'Katy'])
      expect(within(locations).getByRole('link', { name: 'Order here Tomball' })).toHaveAttribute('href', '/store/casa-lupita')
      const order = [...container.querySelectorAll('[data-landing-section]')].map((element) => element.dataset.landingSection)
      expect(order.indexOf('featured')).toBeLessThan(order.indexOf('locations'))
      expect(order.indexOf('locations')).toBeLessThan(order.indexOf('about'))
      expect(urlsOf(global.fetch, '/businesses')).toHaveLength(1) // the stores are read once for the whole page
    })

    it('is what the header\'s "Our locations" link goes to', async () => {
      const { container } = draw()
      const link = await waitFor(() => nav().getByRole('link', { name: 'Our locations' }))
      await waitFor(() => expect(section(container)).not.toBeNull())
      expect(link).toHaveAttribute('href', `#${section(container).id}`)
    })

    it('is hidden when the theme hides it', async () => {
      const { container } = draw(franchiseTheme((values) => {
        values.pages.landing = { footer: null, sections: [{ key: 'hero', visible: true }, { key: 'locations', visible: false }, { key: 'about', visible: true }] }
      }))
      await screen.findByRole('heading', { level: 1, name: 'Downtown' })
      await waitFor(() => expect(container.querySelector('[aria-busy]')).toBeNull())
      expect(section(container)).toBeNull()
    })
  })

  it('the page shows the content of the main store the site names', async () => {
    const { container } = draw(franchiseTheme((values) => { values.site.main_store = 5 }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Tomball' })).toBeInTheDocument()
    expect(await screen.findByText('Birria Tacos')).toBeInTheDocument()
    expect(await screen.findByText(/Handmade corn tortillas/)).toBeInTheDocument()
    expect(await screen.findByText('Handmade tortillas and great salsa.')).toBeInTheDocument()
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(businessReads().every((url) => url.includes('/business/5'))).toBe(true)
    expect(urlsOf(global.fetch, '/businesses')).toHaveLength(1)
  })

  it('without a main store, or one that is not the franchise\'s, it is the first store of the list', async () => {
    draw()
    expect(await screen.findByRole('heading', { level: 1, name: 'Downtown' })).toBeInTheDocument()
    expect(businessReads().every((url) => url.includes('/business/2'))).toBe(true)
    expect(urlsOf(global.fetch, '/business/5')).toHaveLength(0)

    const gone = draw(franchiseTheme((values) => { values.site.main_store = 404 }))
    expect(await within(gone.container).findByRole('heading', { level: 1, name: 'Downtown' })).toBeInTheDocument()
  })

  it('never paints the sections of one store (services, visit), even when the theme shows them', async () => {
    const { container } = draw(franchiseTheme((values) => { values.site.main_store = 5 }))
    await screen.findByText('Handmade tortillas and great salsa.')
    await waitFor(() => expect(global.fetch.mock.calls.length).toBeGreaterThan(3))
    expect(container.querySelector('#landing-services, #landing-visit, [data-landing-section=services], [data-landing-section=visit]')).toBeNull()
    expect(urlsOf(global.fetch, '/menus')).toHaveLength(0) // services is the only reader of the menus
  })

  it('a franchise without stores paints no store section, with no error in the console', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = franchiseFetch({ stores: [] })
    const { container } = draw()
    await waitFor(() => expect(urlsOf(global.fetch, '/businesses')).toHaveLength(1))
    await waitFor(() => expect(container.querySelector('[aria-busy]')).toBeNull())
    expect(container.querySelector('main').children).toHaveLength(0)
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(urlsOf(global.fetch, '/business/')).toHaveLength(0)
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('a failed read of the stores is the hero\'s error, and Retry asks again', async () => {
    let attempts = 0
    global.fetch = franchiseFetch({ stores: () => (attempts++ === 0 ? new Error('boom') : franchiseStores) })
    const { container } = draw()
    const hero = () => within(container.querySelector('[data-landing-section=hero]'))
    expect(await hero().findByRole('alert')).toHaveTextContent('We could not load this restaurant.')
    expect(screen.getByRole('heading', { level: 1, name: 'Taco Group' })).toBeInTheDocument()
    // the locations show the same failure in their own place, with their own retry
    expect(within(container.querySelector('#landing-locations')).getByRole('alert')).toHaveTextContent("We couldn't load the stores")
    fireEvent.click(hero().getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Downtown' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(await within(container.querySelector('#landing-locations')).findByRole('heading', { level: 3, name: 'Katy' })).toBeInTheDocument()
  })

  it('while the stores load the hero is its skeleton, under the site\'s name', () => {
    const { container } = draw()
    expect(container.querySelector('[data-landing-section=hero]')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('heading', { level: 1, name: 'Taco Group' })).toBeInTheDocument()
  })

  describe('header', () => {
    it('is named by the site and wears the main store\'s logo', async () => {
      draw(franchiseTheme((values) => { values.site.main_store = 5 }))
      const logo = await within(screen.getByRole('banner')).findByRole('img', { name: 'Taco Group' })
      expect(logo).toHaveAttribute('src', 'https://img.test/logo.png')
      expect(within(screen.getByRole('banner')).queryByRole('img', { name: 'Tomball' })).toBeNull()
    })

    it('is named by the store when the site has no name', async () => {
      draw(franchiseTheme((values) => { values.site.name = '' }))
      expect(await within(screen.getByRole('banner')).findByRole('img', { name: 'Downtown' })).toBeInTheDocument()
    })

    it('links to the locations, the story, the gallery and the reviews, in the theme\'s order, never to visit or services', async () => {
      draw(franchiseTheme((values) => { values.site.main_store = 5 }))
      await waitFor(() => expect(nav().getAllByRole('link').map((link) => link.textContent)).toEqual(['Menu', 'Our locations', 'Our story', 'Gallery', 'Reviews']))
      expect(nav().getByRole('link', { name: 'Our locations' })).toHaveAttribute('href', '#landing-locations')
      expect(nav().queryByRole('link', { name: 'Visit us' })).toBeNull()
      expect(nav().queryByRole('link', { name: 'Services' })).toBeNull()
    })

    it('does not link to the locations when the theme hides that section', async () => {
      draw(franchiseTheme((values) => {
        values.site.main_store = 5
        values.pages.landing = { footer: null, sections: [{ key: 'hero', visible: true }, { key: 'about', visible: true }, { key: 'locations', visible: false }] }
      }))
      await waitFor(() => expect(nav().getByRole('link', { name: 'Our story' })).toBeInTheDocument())
      expect(nav().queryByRole('link', { name: 'Our locations' })).toBeNull()
    })
  })

  describe('header, "Our locations" with no stores to show', () => {
    it('is offered while the stores load', async () => {
      draw()
      expect(nav().getByRole('link', { name: 'Our locations' })).toHaveAttribute('href', '#landing-locations')
      await screen.findByRole('heading', { level: 1, name: 'Downtown' }) // let the read settle
    })

    it.each([
      ['has none', () => franchiseFetch({ stores: [] })],
      ['could not be read', () => franchiseFetch({ stores: new Error('down') })]
    ])('is not offered when the franchise %s (no section, no dead anchor)', async (_name, fetchOf) => {
      global.fetch = fetchOf()
      const { container } = draw()
      await waitFor(() => expect(urlsOf(global.fetch, '/businesses')).toHaveLength(1))
      await waitFor(() => expect(container.querySelector('[aria-busy]')).toBeNull())
      expect(nav().queryByRole('link', { name: 'Our locations' })).toBeNull()
      expect(container.querySelector('a[href="#landing-locations"]')).toBeNull()
    })
  })

  describe('footer', () => {
    it('lists the franchise\'s stores instead of one address', async () => {
      const { container } = draw()
      const footer = await waitFor(() => {
        const element = container.querySelector('[data-landing-chrome=footer]')
        expect(within(element).getByText('Katy')).toBeInTheDocument()
        return element
      })
      const list = within(footer).getByRole('heading', { name: 'Our locations' }).parentElement
      expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Downtown', 'Tomball', 'Katy'])
      expect(within(footer).queryByRole('heading', { name: 'Visit us' })).toBeNull()
      expect(within(footer).getByRole('img', { name: 'Taco Group' })).toBeInTheDocument()
    })

    it('a franchise of one store keeps that store\'s address and has no list', async () => {
      global.fetch = franchiseFetch({ stores: [franchiseStores[1]] })
      const { container } = draw()
      await screen.findByRole('heading', { level: 1, name: 'Tomball' })
      const footer = container.querySelector('[data-landing-chrome=footer]')
      await waitFor(() => expect(within(footer).getByRole('heading', { name: 'Visit us' })).toBeInTheDocument())
      expect(within(footer).queryByRole('heading', { name: 'Our locations' })).toBeNull()
    })
  })
})
