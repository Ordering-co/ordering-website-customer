import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { Footer } from '../index'

const pagesGet = vi.fn()

vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{
    pages: (slug) => ({ get: () => pagesGet(slug) })
  }]
}))

vi.mock('~components/contexts/LanguageContext', () => ({
  useLanguage: () => [{ language: { code: 'en' } }]
}))

const withFooterHtml = (html) => themeWithValues((values) => {
  values.site = { ...values.site, footer_html: html }
  return values
})

describe('Footer pages (one list request only; body/enabled read straight from it)', () => {
  beforeEach(() => {
    pagesGet.mockReset()
  })

  it('no footer pages: one request only; shows theme footer_html when present', async () => {
    pagesGet.mockImplementation((slug) => {
      if (slug === undefined) return Promise.resolve({ content: { error: false, result: [] } })
      throw new Error(`unexpected request for slug "${slug}"`)
    })

    const { container } = renderWithProviders(<Footer />, { theme: withFooterHtml('<p>Theme footer</p>') })

    await waitFor(() => {
      expect(container.textContent).toContain('Theme footer')
    })
    expect(pagesGet).toHaveBeenCalledTimes(1)
    expect(pagesGet).toHaveBeenCalledWith(undefined)
  })

  it('no footer pages and no theme content: renders nothing, one request only', async () => {
    pagesGet.mockImplementation((slug) => {
      if (slug === undefined) return Promise.resolve({ content: { error: false, result: [] } })
      throw new Error(`unexpected request for slug "${slug}"`)
    })

    const { container } = renderWithProviders(<Footer />)

    await waitFor(() => {
      expect(pagesGet).toHaveBeenCalledTimes(1)
    })
    expect(container.querySelector('[data-doc-section="localized-footer-content"]')).toBeNull()
  })

  it('footer_<lang> enabled with body (read from the list): shown, one request only', async () => {
    pagesGet.mockImplementation((slug) => {
      if (slug === undefined) {
        return Promise.resolve({
          content: {
            error: false,
            result: [
              { slug: 'footer_en', enabled: true, body: '<p>Lang footer</p>' },
              { slug: 'footer', enabled: true, body: '<p>Default footer</p>' }
            ]
          }
        })
      }
      throw new Error(`unexpected request for slug "${slug}"`)
    })

    const { container } = renderWithProviders(<Footer />)

    await waitFor(() => {
      expect(container.textContent).toContain('Lang footer')
    })
    expect(pagesGet).toHaveBeenCalledTimes(1)
  })

  it('footer_<lang> exists but disabled or bodyless: falls through to theme, then `footer`', async () => {
    pagesGet.mockImplementation((slug) => {
      if (slug === undefined) {
        return Promise.resolve({
          content: {
            error: false,
            result: [
              { slug: 'footer_en', enabled: false, body: '<p>Lang footer</p>' },
              { slug: 'footer', enabled: true, body: '<p>Default footer</p>' }
            ]
          }
        })
      }
      throw new Error(`unexpected request for slug "${slug}"`)
    })

    const { container } = renderWithProviders(<Footer />)

    await waitFor(() => {
      expect(container.textContent).toContain('Default footer')
    })
    expect(pagesGet).toHaveBeenCalledTimes(1)
  })

  it('only `footer` exists: shown when theme footer_html is empty, no `enabled` required (old behaviour), one request only', async () => {
    pagesGet.mockImplementation((slug) => {
      if (slug === undefined) {
        return Promise.resolve({ content: { error: false, result: [{ slug: 'footer', enabled: false, body: '<p>Default footer</p>' }] } })
      }
      throw new Error(`unexpected request for slug "${slug}"`)
    })

    const { container } = renderWithProviders(<Footer />)

    await waitFor(() => {
      expect(container.textContent).toContain('Default footer')
    })
    expect(pagesGet).toHaveBeenCalledTimes(1)
  })

  it('theme footer_html wins over `footer` when both exist: one request only', async () => {
    pagesGet.mockImplementation((slug) => {
      if (slug === undefined) {
        return Promise.resolve({ content: { error: false, result: [{ slug: 'footer', enabled: true, body: '<p>Default footer</p>' }] } })
      }
      throw new Error(`unexpected request for slug "${slug}"`)
    })

    const { container } = renderWithProviders(<Footer />, { theme: withFooterHtml('<p>Theme footer</p>') })

    await waitFor(() => {
      expect(container.textContent).toContain('Theme footer')
    })
    expect(pagesGet).toHaveBeenCalledTimes(1)
  })

  it('list error: sets the error state, one request only', async () => {
    pagesGet.mockImplementation((slug) => {
      if (slug === undefined) return Promise.resolve({ content: { error: true, result: ['boom'] } })
      throw new Error(`unexpected request for slug "${slug}"`)
    })

    const { container } = renderWithProviders(<Footer />)

    await waitFor(() => {
      expect(pagesGet).toHaveBeenCalledTimes(1)
    })
    expect(container.querySelector('[data-doc-section="localized-footer-content"]')).toBeNull()
  })

  it('bare: only the content, without the footer box (the marketing page paints its own)', async () => {
    pagesGet.mockImplementation(() => Promise.resolve({ content: { error: false, result: [] } }))
    const { container } = renderWithProviders(<Footer bare />, { theme: withFooterHtml('<p>Theme footer</p>') })
    await waitFor(() => expect(container.textContent).toContain('Theme footer'))
    expect(container.querySelector('footer')).toBeNull()
  })

  it('bare without content: nothing', async () => {
    pagesGet.mockImplementation(() => Promise.resolve({ content: { error: false, result: [] } }))
    const { container } = renderWithProviders(<Footer bare />, { theme: withFooterHtml('') })
    await waitFor(() => expect(pagesGet).toHaveBeenCalled())
    expect(container.innerHTML).toBe('')
  })
})
