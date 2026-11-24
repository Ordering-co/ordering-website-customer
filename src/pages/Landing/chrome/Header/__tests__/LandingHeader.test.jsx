import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from 'react-router-dom'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../../../ui/src/styles/__tests__/themeTestUtils'
import { useStoreLanding } from '../../../useStoreLanding'
import { LandingHeader } from '../index'

// The network is the hook's; the theme, the sections and the sheet are real.
vi.mock('../../../useStoreLanding', async (importOriginal) => ({ ...(await importOriginal()), useStoreLanding: vi.fn() }))

const resource = (data) => ({ data, loading: false, error: null, retry: () => {} })
const BUSINESS = {
  id: 7,
  name: 'Casa Lupita',
  logo: 'https://cdn.example.com/lupita.png',
  about: 'Tacos since 1998',
  address: '14277 Kuykendahl Rd',
  gallery: [{ file: 'https://cdn.example.com/1.jpg' }],
  reviews: { reviews_count: 0, total: 0 }
}
const landing = (business = BUSINESS, extra = {}) => ({ business: resource(business), featured: resource(null), services: resource(null), reviews: resource(null), ...extra })
const fullWebsite = (mutate) => themeWithValues((values) => {
  values.site.experience = 'full_website'
  mutate?.(values)
})
const draw = (theme = fullWebsite()) => renderWithProviders(<LandingHeader store='casa-lupita' />, { theme })
const navLinks = () => within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link').map((link) => link.textContent)

beforeEach(() => useStoreLanding.mockReturnValue(landing()))

describe('LandingHeader', () => {
  it('asks for the store it is given, and only for what its links read: the business, and reviews when shown', () => {
    draw()
    expect(useStoreLanding).toHaveBeenLastCalledWith('casa-lupita', ['business', 'reviews'])
    draw(fullWebsite((values) => {
      values.pages.landing = { footer: null, sections: [{ key: 'hero', visible: true }, { key: 'reviews', visible: false }] }
    }))
    expect(useStoreLanding).toHaveBeenLastCalledWith('casa-lupita', ['business'])
  })

  it('is the page\'s header: a banner that stays on top, with the logo named by the store', () => {
    const { container } = draw()
    const header = screen.getByRole('banner')
    expect(cssFor(header).replace(/\s/g, '')).toContain('position:sticky')
    expect(container.querySelector('img')).toHaveAttribute('src', BUSINESS.logo)
    expect(screen.getByRole('img', { name: 'Casa Lupita' })).toBeInTheDocument()
  })

  it('without a logo it shows the name; while the store loads, the site\'s name', () => {
    useStoreLanding.mockReturnValue(landing({ ...BUSINESS, logo: null }))
    draw()
    expect(screen.getByText('Casa Lupita')).toBeInTheDocument()
  })

  it('links only to the visible sections that have data, after Menu', () => {
    draw()
    // about, gallery and visit have data here; reviews has none
    expect(navLinks()).toEqual(['Menu', 'Our story', 'Gallery', 'Visit us'])
    expect(screen.getByRole('link', { name: 'Our story' })).toHaveAttribute('href', '#landing-about')
    expect(screen.getByRole('link', { name: 'Visit us' })).toHaveAttribute('href', '#landing-visit')
  })

  it('adds Reviews when the store has reviews', () => {
    useStoreLanding.mockReturnValue(landing(BUSINESS, { reviews: resource({ average: 4.8, count: 12, recent: [] }) }))
    draw()
    expect(navLinks()).toContain('Reviews')
    expect(screen.getByRole('link', { name: 'Reviews' })).toHaveAttribute('href', '#landing-reviews')
  })

  it('leaves out a section the theme hides, even with data', () => {
    draw(fullWebsite((values) => {
      values.pages.landing = { footer: null, sections: [{ key: 'hero', visible: true }, { key: 'about', visible: true }, { key: 'gallery', visible: false }] }
    }))
    expect(navLinks()).toEqual(['Menu', 'Our story', 'Visit us'])
  })

  it('only Menu and Order now while the store has not arrived', () => {
    useStoreLanding.mockReturnValue(landing(null))
    draw()
    expect(navLinks()).toEqual(['Menu'])
    expect(screen.getByRole('link', { name: 'Order now' })).toBeInTheDocument()
  })

  describe('for a site with several stores: brandName, sectionKeys, extraAnchors', () => {
    const drawWith = (props, theme = fullWebsite()) => renderWithProviders(<LandingHeader store='casa-lupita' {...props} />, { theme })

    it('brandName names the logo and stands in for a missing one, instead of the store\'s name', () => {
      const { container } = drawWith({ brandName: 'Taco Group' })
      expect(container.querySelector('img')).toHaveAttribute('alt', 'Taco Group')
      useStoreLanding.mockReturnValue(landing({ ...BUSINESS, logo: null }))
      drawWith({ brandName: 'Taco Group' })
      expect(screen.getByText('Taco Group')).toBeInTheDocument()
    })

    it('sectionKeys leaves out the links of the sections the page does not paint', () => {
      drawWith({ sectionKeys: ['about', 'gallery'] })
      expect(navLinks()).toEqual(['Menu', 'Our story', 'Gallery'])
    })

    it('an extra link needs no data, goes where the theme puts that section, and is also in the phone\'s sheet', async () => {
      useStoreLanding.mockReturnValue(landing(null))
      drawWith({ sectionKeys: ['about'], extraAnchors: { locations: 'Our locations' } })
      expect(navLinks()).toEqual(['Menu', 'Our locations'])
      expect(screen.getByRole('link', { name: 'Our locations' })).toHaveAttribute('href', '#landing-locations')
      fireEvent.click(screen.getByRole('button', { name: 'Menu', hidden: true }))
      const sheet = await screen.findByRole('dialog')
      expect(within(sheet).getAllByRole('link').map((link) => link.textContent)).toEqual(['Menu', 'Our locations'])
    })

    it('an extra link of a section the theme hides is not shown', () => {
      drawWith({ extraAnchors: { locations: 'Our locations' } }, fullWebsite((values) => {
        values.pages.landing = { footer: null, sections: [{ key: 'hero', visible: true }, { key: 'locations', visible: false }] }
      }))
      expect(navLinks()).not.toContain('Our locations')
    })
  })

  it('Menu and Order now go to the menu: /order with a full website, / otherwise', () => {
    draw()
    expect(screen.getByRole('link', { name: 'Order now' })).toHaveAttribute('href', '/order')
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Menu' })).toHaveAttribute('href', '/order')
  })

  it('a plain click goes to the menu inside the app, with no page load', () => {
    renderWithProviders(<><LandingHeader store='casa-lupita' /><Route render={({ location }) => <output>{location.pathname}</output>} /></>, { theme: fullWebsite() })
    expect(screen.getByRole('status')).toHaveTextContent('/')
    expect(fireEvent.click(screen.getByRole('link', { name: 'Order now' }))).toBe(false)
    expect(screen.getByRole('status')).toHaveTextContent('/order')
  })

  it('a section link scrolls to it without touching the history', () => {
    const target = document.createElement('section')
    target.id = 'landing-about'
    target.scrollIntoView = vi.fn()
    document.body.append(target)
    draw()
    expect(fireEvent.click(screen.getByRole('link', { name: 'Our story' }))).toBe(false)
    expect(target.scrollIntoView).toHaveBeenCalledTimes(1)
    target.remove()
  })

  describe('on a phone: the menu button and its sheet', () => {
    const openMenu = () => {
      const button = screen.getByRole('button', { name: 'Menu', hidden: true })
      fireEvent.click(button)
      return button
    }

    it('the button opens a sheet with the same links', async () => {
      draw()
      openMenu()
      const sheet = await screen.findByRole('dialog')
      expect(within(sheet).getAllByRole('link').map((link) => link.textContent)).toEqual(['Menu', 'Our story', 'Gallery', 'Visit us'])
    })

    it('Escape closes it and the focus returns to the button', async () => {
      draw()
      const button = openMenu()
      const sheet = await screen.findByRole('dialog')
      fireEvent.keyDown(sheet, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(button).toHaveFocus()
    })

    it('the close button closes it', async () => {
      draw()
      openMenu()
      const sheet = await screen.findByRole('dialog')
      fireEvent.click(within(sheet).getByRole('button', { name: /close/i }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    })

    it('a modified click on a link of the sheet is left to the browser: no scroll, the sheet stays', async () => {
      const target = document.createElement('section')
      target.id = 'landing-gallery'
      target.scrollIntoView = vi.fn()
      document.body.append(target)
      draw()
      openMenu()
      const sheet = await screen.findByRole('dialog')
      expect(fireEvent.click(within(sheet).getByRole('link', { name: 'Gallery' }), { ctrlKey: true })).toBe(true)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(target.scrollIntoView).not.toHaveBeenCalled()
      target.remove()
    })

    it('a link of the sheet closes it and then scrolls to its section', async () => {
      const target = document.createElement('section')
      target.id = 'landing-gallery'
      target.scrollIntoView = vi.fn()
      document.body.append(target)
      draw()
      openMenu()
      const sheet = await screen.findByRole('dialog')
      fireEvent.click(within(sheet).getByRole('link', { name: 'Gallery' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      await waitFor(() => expect(target.scrollIntoView).toHaveBeenCalledTimes(1))
      target.remove()
    })
  })
})
