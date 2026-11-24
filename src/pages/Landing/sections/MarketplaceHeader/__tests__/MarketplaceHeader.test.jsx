import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../../ui/src/styles/__tests__/themeTestUtils'
import { marketplaceSections } from '../../marketplace'

const Header = marketplaceSections.Header

const session = vi.hoisted(() => ({ auth: false }))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: session.auth }, { login: vi.fn() }]
}))
const site = vi.hoisted(() => ({ current: {} }))
vi.mock('~components/contexts/SiteContext', () => ({ useSite: () => [{ site: site.current }] }))
// the dialog's own overlay is a loadable of the app; here it is drawn at once
vi.mock('~ui/src/components/Overlay/lazyOverlay', () => ({
  LazyDialog: ({ open, children }) => (open ? <div role='dialog'>{children}</div> : null)
}))

const theme = (mutate = () => {}) => themeWithValues((values) => {
  values.site.experience = 'full_website'
  mutate(values)
  return values
})
const withLandingSections = (sections) => (values) => {
  values.pages.landing = { footer: null, sections: sections.map(([key, visible]) => ({ key, visible })) }
}

describe('MarketplaceHeader (landing)', () => {
  beforeEach(() => {
    session.auth = false
    site.current = {}
  })

  it('a banner with a navigation labelled by its purpose', () => {
    const { container, getByRole } = renderWithProviders(<Header />, { theme: theme() })
    expect(container.querySelector('header')).not.toBeNull()
    expect(getByRole('navigation', { name: 'Page sections' })).toBeInTheDocument()
    expect(container.querySelector('h1')).toBeNull()
  })

  it('the site\'s logo, named by the site (else "Logo")', () => {
    const logo = (values) => { values.images.logotype = 'https://cdn.test/logo.png' }
    const { getByRole, unmount } = renderWithProviders(<Header />, { theme: theme(logo) })
    expect(getByRole('img', { name: 'Logo' })).toHaveAttribute('src', 'https://cdn.test/logo.png')
    unmount()

    site.current = { name: 'Casa Verde' }
    const named = renderWithProviders(<Header />, { theme: theme((values) => { logo(values); values.site.name = 'Casa Verde' }) })
    expect(named.getByRole('img', { name: 'Casa Verde' })).toHaveAttribute('src', 'https://cdn.test/logo.png')
  })

  it('without a logo, the site\'s name as text; without either, nothing to read', () => {
    const named = renderWithProviders(<Header />, { theme: theme((values) => { values.site.name = 'Casa Verde' }) })
    expect(named.queryByRole('img')).toBeNull()
    expect(named.getByText('Casa Verde')).toBeInTheDocument()
    named.unmount()

    const bare = renderWithProviders(<Header />, { theme: theme() })
    expect(bare.queryByRole('img')).toBeNull()
  })

  it('"Order now" is a real link to the menu: /order with Full Website', () => {
    const { getByRole, container } = renderWithProviders(<Header />, { theme: theme() })
    const order = getByRole('link', { name: 'Order now' })
    expect(order.tagName).toBe('A')
    expect(order).toHaveAttribute('href', '/order')
    expect(container.querySelector('a[href="/order"]')).toBe(order)
  })

  it('"Sign in" opens the login dialog and is gone with a session', () => {
    const guest = renderWithProviders(<Header />, { theme: theme() })
    expect(guest.queryByRole('dialog')).toBeNull()
    fireEvent.click(guest.getByRole('button', { name: 'Sign in' }))
    expect(guest.getByRole('dialog')).toBeInTheDocument()
    guest.unmount()

    session.auth = true
    const member = renderWithProviders(<Header />, { theme: theme() })
    expect(member.queryByRole('button', { name: 'Sign in' })).toBeNull()
    expect(member.getByRole('link', { name: 'Order now' })).toBeInTheDocument()
  })

  it('links to the sections that are on the page, by the anchor each one carries', () => {
    const { getByRole } = renderWithProviders(<Header />, { theme: theme() })
    expect(getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '#landing-how_it_works')
    expect(getByRole('link', { name: 'For restaurants' })).toHaveAttribute('href', '#landing-partner')
  })

  it('no link to a section the theme hides, nor to the partner one with a session', () => {
    const hidden = renderWithProviders(<Header />, {
      theme: theme(withLandingSections([['hero', true], ['how_it_works', false], ['partner', true]]))
    })
    expect(hidden.queryByRole('link', { name: 'How it works' })).toBeNull()
    expect(hidden.getByRole('link', { name: 'For restaurants' })).toBeInTheDocument()
    hidden.unmount()

    session.auth = true
    const member = renderWithProviders(<Header />, { theme: theme() })
    expect(member.queryByRole('link', { name: 'For restaurants' })).toBeNull()
    expect(member.getByRole('link', { name: 'How it works' })).toBeInTheDocument()
  })
})
