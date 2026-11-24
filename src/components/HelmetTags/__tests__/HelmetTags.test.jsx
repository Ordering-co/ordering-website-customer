import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { HelmetTags } from '../index'
import helmetData from '../../../helmetdata.json'
import { resolveSeoDescription } from '../../../utils/seoDescription'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'

const mockSeo = vi.hoisted(() => ({ site: {} }))

vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{
    configs: {
      powered_by_ordering_module: { value: true }
    }
  }]
}))
vi.mock('~components/contexts/SiteContext', () => ({
  useSite: () => [{ site: mockSeo.site }, {}]
}))
vi.mock('../../../contexts/CookieConsentContext', () => ({
  useCookieConsent: () => ({ hasConsented: true })
}))

const descriptionMeta = () => document.querySelector('meta[name="description"]')
const ogDescriptionMeta = () => document.querySelector('meta[property="og:description"]')
const descriptionMetas = () => document.querySelectorAll('meta[name="description"]')
const ogDescriptionMetas = () => document.querySelectorAll('meta[property="og:description"]')
const nextHelmetCommit = () => act(() => new Promise(resolve => window.requestAnimationFrame(() => resolve())))

describe('HelmetTags', () => {
  const theme = themeWithValues((values) => {
    values.site.name = 'Test Marketplace'
    values.site.description = 'Test description'
    values.site.third_party_code.head = '<script>window.__thirdParty = true</script>'
    return values
  })

  const themeWithoutDescription = themeWithValues((values) => {
    values.site.name = 'Test Marketplace'
    values.site.description = ''
    return values
  })

  const themeWithoutSettings = themeWithValues((values) => {
    values.site.name = ''
    values.site.description = ''
    return values
  })

  afterEach(() => {
    delete window.__SEO__
    mockSeo.site = {}
    window.history.replaceState({}, '', '/')
    document.head.innerHTML = ''
  })

  it('renders page title and description when theme is ready', async () => {
    renderWithProviders(
      <HelmetTags page='home' />,
      { theme }
    )
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Test description')
    })
    expect(document.title).toContain('Home')
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Test description')
  })

  it('emits no placeholder keywords, canonical nor vendor credit', async () => {
    renderWithProviders(
      <HelmetTags page='home' />,
      { theme }
    )
    await waitFor(() => {
      expect(document.title).toContain('Home')
      expect(descriptionMeta()?.getAttribute('content')).toBe('Test description')
    })
    expect(document.querySelector('meta[name="keywords"]')).toBeNull()
    expect(document.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.title).not.toMatch(/powered by|ordering/i)
  })

  it('renders the page\'s own keywords', async () => {
    renderWithProviders(
      <HelmetTags page='tracking_home' />,
      { theme }
    )
    await waitFor(() => {
      expect(document.querySelector('meta[name="keywords"]')?.getAttribute('content')).toBe('order, tracking, delivery')
    })
  })

  it('honors robots and canonicalUrl props', async () => {
    renderWithProviders(
      <HelmetTags page='home' robots='noindex' canonicalUrl='https://example.com/home' />,
      { theme }
    )
    await waitFor(() => {
      expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex')
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://example.com/home')
    })
  })

  it('prefers the theme description over the API site description', async () => {
    mockSeo.site = { description: 'Site context description' }
    renderWithProviders(
      <HelmetTags page='home' />,
      { theme }
    )
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Test description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Test description')
  })

  it('falls back to the API site description when the theme has none', async () => {
    mockSeo.site = { description: 'Site context description' }
    renderWithProviders(
      <HelmetTags page='home' />,
      { theme: themeWithoutDescription }
    )
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Site context description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Site context description')
  })

  it('falls back to the theme description when the API site has none', async () => {
    renderWithProviders(
      <HelmetTags page='home' />,
      { theme }
    )
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Test description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Test description')
  })

  it('renders no description at all when nothing valid is configured', async () => {
    renderWithProviders(
      <HelmetTags page='home' />,
      { theme: themeWithoutDescription }
    )
    await waitFor(() => {
      expect(document.title).toContain('Home')
    })
    await nextHelmetCommit()
    expect(descriptionMetas()).toHaveLength(0)
    expect(ogDescriptionMetas()).toHaveLength(0)
  })

  it('renders no description when every source is blank or a template', async () => {
    mockSeo.site = { description: 'Food marketplace by OrderingPlus.' }
    window.__SEO__ = {
      title: null,
      description: 'Food marketplace by ordering.inc',
      ogDescription: 'a dummy description about this page',
      pathname: '/'
    }
    renderWithProviders(
      <HelmetTags page='home' helmetMetaTags={{ description: '   ' }} />,
      { theme: themeWithoutDescription }
    )
    await waitFor(() => {
      expect(document.title).toContain('Home')
    })
    await nextHelmetCommit()
    expect(descriptionMetas()).toHaveLength(0)
    expect(ogDescriptionMetas()).toHaveLength(0)
  })

  it('emits no description nor robots for a root mount', async () => {
    mockSeo.site = { description: 'Site context description' }
    renderWithProviders(
      <HelmetTags />,
      { theme }
    )
    await nextHelmetCommit()
    expect(descriptionMetas()).toHaveLength(0)
    expect(ogDescriptionMetas()).toHaveLength(0)
    expect(document.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('does not let an injected template override configured or page descriptions', async () => {
    window.__SEO__ = {
      title: null,
      description: 'Food marketplace by ordering.inc',
      ogDescription: 'Food marketplace by ordering.inc.',
      pathname: '/'
    }
    const { rerender } = renderWithProviders(
      <HelmetTags page='home' />,
      { theme }
    )
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Test description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Test description')

    rerender(<HelmetTags page='home' helmetMetaTags={{ description: 'Page prop description' }} />)

    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Page prop description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Page prop description')
    expect(descriptionMetas()).toHaveLength(1)
    expect(ogDescriptionMetas()).toHaveLength(1)
  })

  it('falls through blank and template injected descriptions to the configured site value', async () => {
    mockSeo.site = { description: 'Real site description' }
    window.__SEO__ = {
      title: null,
      description: 'Food marketplace by ordering.inc',
      ogDescription: 'a dummy description about this page',
      pathname: '/'
    }
    renderWithProviders(
      <HelmetTags page='home' helmetMetaTags={{ description: '   ' }} />,
      { theme: themeWithoutDescription }
    )
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Real site description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Real site description')
  })

  it('renders worker-injected descriptions while the theme is not ready', async () => {
    window.__SEO__ = {
      title: null,
      description: 'Worker general description',
      ogDescription: 'Worker general OG description',
      pathname: '/'
    }
    renderWithProviders(
      <HelmetTags page='home' />,
      { theme: themeWithoutSettings }
    )
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Worker general description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Worker general OG description')
    expect(document.title).toBe('')
  })

  it('renders the configured description on a page of a site without a name', async () => {
    const themeWithoutName = themeWithValues((values) => {
      values.site.name = ''
      values.site.description = 'Nameless description'
      return values
    })
    renderWithProviders(<HelmetTags page='home' />, { theme: themeWithoutName })
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Nameless description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Nameless description')
    expect(document.title).toBe('')
  })

  it('renders no description on a page before the theme is ready when nothing is configured', async () => {
    renderWithProviders(<HelmetTags page='home' />, { theme: themeWithoutSettings })
    await nextHelmetCommit()
    expect(descriptionMetas()).toHaveLength(0)
    expect(ogDescriptionMetas()).toHaveLength(0)
  })

  it('applies a props description to both description tags', async () => {
    renderWithProviders(
      <HelmetTags page='home' helmetMetaTags={{ description: 'Prop description' }} />,
      { theme }
    )
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Prop description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Prop description')
  })

  it('adopts worker-managed description tags instead of duplicating them', async () => {
    document.head.insertAdjacentHTML(
      'beforeend',
      '<meta name="description" content="Worker description" data-react-helmet="true">' +
      '<meta property="og:description" content="Worker OG description" data-react-helmet="true">'
    )

    const { rerender } = renderWithProviders(
      <HelmetTags page='home' helmetMetaTags={{ description: 'React description' }} />,
      { theme: themeWithoutDescription }
    )

    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('React description')
    })
    expect(descriptionMetas()).toHaveLength(1)
    expect(ogDescriptionMetas()).toHaveLength(1)
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('React description')

    rerender(<HelmetTags page='home' />)

    await waitFor(() => {
      expect(descriptionMetas()).toHaveLength(0)
    })
    expect(ogDescriptionMetas()).toHaveLength(0)
  })

  it('adds the configured description once the site loads', async () => {
    const { rerender } = renderWithProviders(
      <HelmetTags page='home' />,
      { theme: themeWithoutSettings }
    )
    await nextHelmetCommit()
    expect(descriptionMetas()).toHaveLength(0)

    mockSeo.site = { description: 'Loaded site description' }
    rerender(<HelmetTags page='home' />)

    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Loaded site description')
    })
    expect(descriptionMetas()).toHaveLength(1)
    expect(ogDescriptionMetas()).toHaveLength(1)
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Loaded site description')
  })

  it('removes the description when a custom one is removed and nothing else is configured', async () => {
    const { rerender } = renderWithProviders(
      <HelmetTags page='home' helmetMetaTags={{ description: 'Custom description' }} />,
      { theme: themeWithoutDescription }
    )
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Custom description')
    })

    rerender(<HelmetTags page='home' />)

    await waitFor(() => {
      expect(descriptionMetas()).toHaveLength(0)
    })
    expect(ogDescriptionMetas()).toHaveLength(0)
  })

  it('preserves worker-injected page metadata during hydration', async () => {
    window.history.replaceState({}, '', '/pages/about-us')
    window.__SEO__ = {
      title: 'Test Marketplace - CMS page title',
      description: 'CMS page description',
      ogDescription: 'CMS page OG description',
      pathname: '/pages/about-us'
    }

    renderWithProviders(
      <HelmetTags page='pages' />,
      { theme }
    )

    await waitFor(() => {
      expect(document.title).toContain('CMS page title')
    })
    expect(document.title.match(/Test Marketplace/g)).toHaveLength(1)
    expect(descriptionMeta()?.getAttribute('content')).toBe('CMS page description')
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('CMS page OG description')
  })

  it('ignores worker metadata after client-side navigation', async () => {
    window.history.replaceState({}, '', '/pages/another-page')
    window.__SEO__ = {
      title: 'Previous CMS title',
      description: 'Previous CMS description',
      ogDescription: 'Previous CMS OG description',
      pathname: '/pages/about-us'
    }

    renderWithProviders(
      <HelmetTags page='pages' />,
      { theme }
    )

    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Test description')
    })
    expect(document.title).not.toContain('Previous CMS title')
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Test description')
  })

  it('prioritizes loaded page metadata over site defaults', async () => {
    renderWithProviders(
      <HelmetTags
        page='pages'
        helmetMetaTags={{
          title: 'Loaded CMS title',
          description: 'Loaded CMS description'
        }}
      />,
      { theme }
    )

    await waitFor(() => {
      expect(document.title).toContain('Loaded CMS title')
    })
    expect(descriptionMeta()?.getAttribute('content')).toBe('Loaded CMS description')
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Loaded CMS description')
  })

  it.each([
    ['pages', '/pages/about-us'],
    ['business', '/store/synthetic-store']
  ])(
    'preserves a distinct injected OG description when %s meta loads without one',
    async (page, pathname) => {
      window.history.replaceState({}, '', pathname)
      window.__SEO__ = {
        title: null,
        description: 'Worker normal description',
        ogDescription: 'Worker distinct OG description',
        pathname
      }

      const { rerender } = renderWithProviders(
        <HelmetTags page={page} />,
        { theme }
      )
      await waitFor(() => {
        expect(descriptionMeta()?.getAttribute('content')).toBe('Worker normal description')
      })
      expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Worker distinct OG description')

      rerender(
        <HelmetTags page={page} helmetMetaTags={{ title: 'Loaded page title', description: 'Loaded normal description' }} />
      )
      await waitFor(() => {
        expect(descriptionMeta()?.getAttribute('content')).toBe('Loaded normal description')
      })
      expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Worker distinct OG description')
      expect(descriptionMetas()).toHaveLength(1)
      expect(ogDescriptionMetas()).toHaveLength(1)

      rerender(
        <HelmetTags page={page} helmetMetaTags={{ title: 'Loaded page title', description: 'Second normal update' }} />
      )
      await waitFor(() => {
        expect(descriptionMeta()?.getAttribute('content')).toBe('Second normal update')
      })
      expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Worker distinct OG description')
      expect(descriptionMetas()).toHaveLength(1)
      expect(ogDescriptionMetas()).toHaveLength(1)
    }
  )

  it('lets an explicit page ogDescription prop win over the injected OG', async () => {
    window.__SEO__ = {
      title: null,
      description: 'Worker normal description',
      ogDescription: 'Worker distinct OG description',
      pathname: '/'
    }
    renderWithProviders(
      <HelmetTags
        page='home'
        helmetMetaTags={{ description: 'Loaded normal', ogDescription: 'Explicit page OG' }}
      />,
      { theme }
    )
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Loaded normal')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Explicit page OG')
    expect(descriptionMetas()).toHaveLength(1)
    expect(ogDescriptionMetas()).toHaveLength(1)
  })

  it.each([undefined, '   ', 'Food marketplace by ordering.inc', 'a dummy description about this page'])(
    'keeps the injected OG when the explicit page ogDescription is %j',
    async (explicitOg) => {
      window.__SEO__ = {
        title: null,
        description: 'Worker normal description',
        ogDescription: 'Worker distinct OG description',
        pathname: '/'
      }
      renderWithProviders(
        <HelmetTags
          page='home'
          helmetMetaTags={{ description: 'Loaded normal', ogDescription: explicitOg }}
        />,
        { theme }
      )
      await waitFor(() => {
        expect(descriptionMeta()?.getAttribute('content')).toBe('Loaded normal')
      })
      expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Worker distinct OG description')
    }
  )

  it.each([undefined, '   ', 'Food marketplace by ordering.inc', 'a dummy description about this page'])(
    'falls back to the effective normal description when the injected OG is %j',
    async (injectedOg) => {
      window.__SEO__ = {
        title: null,
        description: 'Worker normal description',
        ogDescription: injectedOg,
        pathname: '/'
      }
      renderWithProviders(
        <HelmetTags page='home' helmetMetaTags={{ description: 'Loaded normal' }} />,
        { theme }
      )
      await waitFor(() => {
        expect(descriptionMeta()?.getAttribute('content')).toBe('Loaded normal')
      })
      expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Loaded normal')
    }
  )

  it('drops a stale injected OG after client-side navigation', async () => {
    window.history.replaceState({}, '', '/pages/another-page')
    window.__SEO__ = {
      title: 'Previous title',
      description: 'Previous normal description',
      ogDescription: 'Previous distinct OG description',
      pathname: '/pages/about-us'
    }

    const { rerender } = renderWithProviders(
      <HelmetTags page='pages' />,
      { theme }
    )
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Test description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Test description')

    rerender(<HelmetTags page='pages' helmetMetaTags={{ description: 'Next normal description' }} />)

    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Next normal description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Next normal description')
    expect(descriptionMetas()).toHaveLength(1)
    expect(ogDescriptionMetas()).toHaveLength(1)
  })

  it('lets a page-level HelmetTags override the mounted root defaults', async () => {
    mockSeo.site = { description: 'Root site description' }
    const { rerender } = renderWithProviders(
      <>
        <HelmetTags />
        <HelmetTags page='pages' helmetMetaTags={{ description: 'Page description' }} />
      </>,
      { theme }
    )

    await waitFor(() => {
      expect(descriptionMetas()).toHaveLength(1)
      expect(descriptionMeta()?.getAttribute('content')).toBe('Page description')
    })
    expect(ogDescriptionMetas()).toHaveLength(1)
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Page description')

    rerender(
      <>
        <HelmetTags />
        <HelmetTags page='pages' helmetMetaTags={{ description: 'Updated page description' }} />
      </>
    )

    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Updated page description')
    })
    expect(descriptionMetas()).toHaveLength(1)
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Updated page description')
  })

  it('keeps page descriptions when a root instance mounts late at an earlier JSX position', async () => {
    mockSeo.site = { description: 'Site fallback' }
    window.history.replaceState({}, '', '/store/probe')
    window.__SEO__ = {
      title: null,
      description: 'Previous home description',
      ogDescription: 'Previous home OG',
      pathname: '/'
    }
    const Screen = ({ showRoot }) => (
      <>
        {showRoot && <HelmetTags key='root' />}
        <HelmetTags key='page' page='business' helmetMetaTags={{ description: 'Business description' }} />
      </>
    )
    const { rerender } = renderWithProviders(<Screen showRoot={false} />, { theme })
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Business description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Business description')

    rerender(<Screen showRoot />)
    await nextHelmetCommit()
    expect(descriptionMeta()?.getAttribute('content')).toBe('Business description')
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Business description')
    expect(descriptionMetas()).toHaveLength(1)
    expect(ogDescriptionMetas()).toHaveLength(1)
  })

  it('page descriptions win when the page instance mounts after the root', async () => {
    mockSeo.site = { description: 'Site fallback' }
    const Screen = ({ showPage }) => (
      <>
        <HelmetTags key='root' />
        {showPage && (
          <HelmetTags
            key='page'
            page='business'
            helmetMetaTags={{ description: 'Business description', ogDescription: 'Business OG' }}
          />
        )}
      </>
    )
    const { rerender } = renderWithProviders(<Screen showPage={false} />, { theme })
    await nextHelmetCommit()
    expect(descriptionMetas()).toHaveLength(0)
    expect(ogDescriptionMetas()).toHaveLength(0)

    rerender(<Screen showPage />)
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Business description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Business OG')
    expect(descriptionMetas()).toHaveLength(1)
    expect(ogDescriptionMetas()).toHaveLength(1)
  })

  it('root cannot displace explicit page descriptions backed by matching injected data', async () => {
    mockSeo.site = { description: 'Site fallback' }
    window.history.replaceState({}, '', '/store/probe')
    window.__SEO__ = {
      title: null,
      description: 'Worker normal description',
      ogDescription: 'Worker distinct OG description',
      pathname: '/store/probe'
    }
    const Screen = ({ showRoot }) => (
      <>
        {showRoot && <HelmetTags key='root' />}
        <HelmetTags
          key='page'
          page='business'
          helmetMetaTags={{ description: 'Business description', ogDescription: 'Business OG' }}
        />
      </>
    )
    const { rerender } = renderWithProviders(<Screen showRoot={false} />, { theme })
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Business description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Business OG')

    rerender(<Screen showRoot />)
    await nextHelmetCommit()
    expect(descriptionMeta()?.getAttribute('content')).toBe('Business description')
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Business OG')
    expect(descriptionMetas()).toHaveLength(1)
    expect(ogDescriptionMetas()).toHaveLength(1)
  })

  it('keeps the page\'s robots when the root instance mounts late', async () => {
    const Screen = ({ showRoot }) => (
      <>
        {showRoot && <HelmetTags key='root' />}
        <HelmetTags key='page' page='tracking_home' />
      </>
    )
    const { rerender } = renderWithProviders(<Screen showRoot={false} />, { theme })
    await waitFor(() => {
      expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
    })

    rerender(<Screen showRoot />)
    await nextHelmetCommit()
    expect(document.querySelectorAll('meta[name="robots"]')).toHaveLength(1)
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
  })

  it('restores the real route description for tracking_home when nothing else is configured', async () => {
    renderWithProviders(<HelmetTags page='tracking_home' />, { theme: themeWithoutDescription })
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe(helmetData.tracking_home.description)
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe(helmetData.tracking_home.description)
    expect(descriptionMetas()).toHaveLength(1)
    expect(ogDescriptionMetas()).toHaveLength(1)
  })

  it('has no template route descriptions', () => {
    for (const entry of Object.values(helmetData)) {
      if (entry.description === undefined) continue
      expect(resolveSeoDescription(entry.description)).toBe(entry.description)
    }
  })

  it('keeps configured and API descriptions ahead of the route default', async () => {
    mockSeo.site = { description: 'Site configured description' }
    const { rerender } = renderWithProviders(
      <HelmetTags page='tracking_home' />,
      { theme: themeWithoutDescription }
    )
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('Site configured description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('Site configured description')

    window.__SEO__ = {
      title: null,
      description: 'API description',
      ogDescription: 'API OG description',
      pathname: '/'
    }
    rerender(<HelmetTags page='tracking_home' />)
    await waitFor(() => {
      expect(descriptionMeta()?.getAttribute('content')).toBe('API description')
    })
    expect(ogDescriptionMeta()?.getAttribute('content')).toBe('API OG description')
  })
})
