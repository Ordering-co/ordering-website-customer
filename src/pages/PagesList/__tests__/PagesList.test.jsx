import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { HelmetTags } from '../../../components/HelmetTags'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { PagesList } from '../index'

vi.mock('~ui/src/components/PagesList', () => ({
  PagesList: ({ routes }) => (
    <div data-testid='pages-list-ui' data-route-count={routes.length} />
  )
}))

const mockSeo = vi.hoisted(() => ({ site: {} }))
vi.mock('~components/contexts/SiteContext', () => ({ useSite: () => [{ site: mockSeo.site }, {}] }))

const theme = themeWithValues((values) => {
  values.site.name = 'Test Marketplace'
  values.site.description = ''
  return values
})

const seedManagedDescriptions = () => {
  document.head.insertAdjacentHTML(
    'beforeend',
    '<meta name="description" content="Worker normal" data-react-helmet="true">' +
    '<meta property="og:description" content="Worker OG" data-react-helmet="true">'
  )
}
const descMetas = () => document.querySelectorAll('meta[name="description"]')
const ogMetas = () => document.querySelectorAll('meta[property="og:description"]')
const nextHelmetCommit = () => act(() => new Promise(resolve => window.requestAnimationFrame(() => resolve())))

afterEach(() => {
  cleanup()
  delete window.__SEO__
  mockSeo.site = {}
  window.history.replaceState({}, '', '/')
  document.head.innerHTML = ''
})

describe('PagesList page', () => {
  it('passes default routes to pages list controller', () => {
    const { getByTestId } = renderWithProviders(<PagesList />)
    expect(getByTestId('pages-list-ui')).toHaveAttribute('data-route-count', '10')
  })
})

describe('PagesList route metadata ownership', () => {
  it.each(['together', 'root-mounted-late'])(
    'keeps worker descriptions on /pages regardless of root mount order (%s)',
    async (order) => {
      window.history.replaceState({}, '', '/pages')
      window.__SEO__ = {
        title: null,
        description: 'Worker normal',
        ogDescription: 'Worker OG',
        pathname: '/pages'
      }
      seedManagedDescriptions()

      const Screen = ({ showRoot }) => (
        <>
          {showRoot && <HelmetTags key='root' />}
          <PagesList key='page' />
        </>
      )
      const { rerender } = renderWithProviders(
        <Screen showRoot={order === 'together'} />,
        { theme }
      )
      await waitFor(() => {
        expect(document.title).toContain('Pages')
      })

      if (order === 'root-mounted-late') {
        rerender(<Screen showRoot />)
      }
      await nextHelmetCommit()

      expect(descMetas()).toHaveLength(1)
      expect(descMetas()[0].getAttribute('content')).toBe('Worker normal')
      expect(ogMetas()).toHaveLength(1)
      expect(ogMetas()[0].getAttribute('content')).toBe('Worker OG')
    }
  )

  it('uses the configured site description and emits none without one', async () => {
    window.history.replaceState({}, '', '/pages')
    mockSeo.site = { description: 'Site configured description' }
    const { rerender } = renderWithProviders(
      <>
        <HelmetTags />
        <PagesList />
      </>,
      { theme }
    )
    await waitFor(() => {
      expect(descMetas()[0]?.getAttribute('content')).toBe('Site configured description')
    })
    expect(ogMetas()[0].getAttribute('content')).toBe('Site configured description')

    mockSeo.site = {}
    rerender(
      <>
        <HelmetTags />
        <PagesList />
      </>
    )
    await waitFor(() => {
      expect(descMetas()).toHaveLength(0)
    })
    expect(ogMetas()).toHaveLength(0)
  })

  it('ignores stale injected metadata after navigation to /pages', async () => {
    mockSeo.site = { description: 'Site configured description' }
    window.history.replaceState({}, '', '/pages')
    window.__SEO__ = {
      title: null,
      description: 'Old home description',
      ogDescription: 'Old home OG',
      pathname: '/'
    }
    renderWithProviders(
      <>
        <HelmetTags />
        <PagesList />
      </>,
      { theme }
    )
    await waitFor(() => {
      expect(descMetas()[0]?.getAttribute('content')).toBe('Site configured description')
    })
    expect(ogMetas()[0].getAttribute('content')).toBe('Site configured description')
    expect(descMetas()).toHaveLength(1)
    expect(ogMetas()).toHaveLength(1)
  })
})

describe('PagesList page: route names', () => {
  it('are translated (t with English fallbacks)', async () => {
    vi.resetModules()
    vi.doMock('~components/contexts/LanguageContext', () => ({
      useLanguage: () => [{}, (key) => `t:${key}`]
    }))
    const captured = {}
    vi.doMock('~ui/src/components/PagesList', () => ({
      PagesList: ({ routes }) => { captured.routes = routes; return null }
    }))
    const { PagesList: Page } = await import('../index')
    renderWithProviders(<Page />)
    expect(captured.routes.map(r => r.name)).toEqual([
      't:HOME', 't:SIGN_UP', 't:LOGIN', 't:SIGN_IN', 't:FORGOT_PASSWORD',
      't:PROFILE', 't:MY_ORDERS', 't:SEARCH_BUSINESSES', 't:CHECKOUT', 't:PAGES'
    ])
    vi.doUnmock('~components/contexts/LanguageContext')
    vi.doUnmock('~ui/src/components/PagesList')
  })
})
