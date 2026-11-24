import React from 'react'
import { describe, expect, it } from 'vitest'
import { useSite } from '~components/contexts/SiteContext'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { PageNotFound } from '../index'
import { themeWithValues, cssFor } from '../../../styles/__tests__/themeTestUtils'
import { getThemeCss } from '../../../../../utils/themeCss'

describe('PageNotFound UI', () => {
  it('renders page not found heading', () => {
    const { getByText } = renderWithProviders(<PageNotFound />)
    expect(getByText('PAGE NOT FOUND')).toBeInTheDocument()
  })

  it('links back to the marketplace home', () => {
    const { getByRole } = renderWithProviders(<PageNotFound />)
    expect(getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/')
  })

  it('links to the menu at /order on a full website', () => {
    const theme = themeWithValues(values => { values.site.experience = 'full_website' })
    const { getByRole } = renderWithProviders(<PageNotFound />, { theme })
    expect(getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/order')
  })

  it('links to the configured menu on a single-store site', () => {
    const theme = themeWithValues(values => {
      values.site.mode = 'single_store'
      values.site.business_slug = 'demo-store'
    })
    const { getByRole } = renderWithProviders(<PageNotFound />, { theme })
    expect(getByRole('link', { name: 'Go to menu' })).toHaveAttribute('href', '/store/demo-store')
  })

  it('a full website\'s store named `order` is at /store/order, not at the menu\'s /order', () => {
    const [{ site }] = useSite()
    const template = site.business_url_template
    site.business_url_template = '/:business_slug'
    try {
      const theme = themeWithValues(values => {
        values.site.mode = 'single_store'
        values.site.business_slug = 'order'
        values.site.experience = 'full_website'
      })
      expect(renderWithProviders(<PageNotFound />, { theme }).getByRole('link', { name: 'Go to menu' })).toHaveAttribute('href', '/store/order')
    } finally {
      site.business_url_template = template
    }
  })

  it('fills the screen under the header: the measured height, the theme\'s height as fallback (no fixed px)', () => {
    const theme = themeWithValues(values => { values.components.header.base.height = 72 })
    const { container } = renderWithProviders(<PageNotFound />, { theme })
    const css = cssFor(container.querySelector('[data-doc-section="global-page-not-found"]')).replace(/\s/g, '')
    expect(getThemeCss(theme, 'header').base.height).toBe('72px')
    expect(css).toContain('min-height:calc(100dvh-var(--header-height,72px))')
    expect(css).not.toMatch(/--header-height,(65|97)px/)
  })
})
