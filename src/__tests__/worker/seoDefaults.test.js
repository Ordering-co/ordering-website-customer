import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SEO_TITLE,
  buildSiteSeoFallback,
  getThemeSiteDescription,
  mergeSeoData
} from '../../../worker/seo.js'

const theme = (site) => ({ version: 2, values: { site } })
const meta = (seo, key) => seo.metas.find((m) => m.name === key || m.property === key)?.content

describe('worker SEO defaults (no vendor brand)', () => {
  it('the default title is "My Site"', () => {
    expect(DEFAULT_SEO_TITLE).toBe('My Site')
  })

  it('the title: the theme\'s site name, else the API site\'s, else "My Site"', () => {
    expect(buildSiteSeoFallback({ name: 'API Site' }, null, theme({ name: ' Theme Site ' })).title).toBe('Theme Site')
    expect(buildSiteSeoFallback({ name: 'API Site' }, null, theme({ name: '' })).title).toBe('API Site')
    expect(buildSiteSeoFallback({}, null, null).title).toBe('My Site')
  })

  it('the description: the theme\'s, else the API site\'s, else none at all', () => {
    const themed = buildSiteSeoFallback({ description: 'API text' }, null, theme({ description: 'Theme text' }))
    expect(meta(themed, 'description')).toBe('Theme text')
    expect(meta(themed, 'og:description')).toBe('Theme text')

    expect(meta(buildSiteSeoFallback({ description: 'API text' }, null, null), 'description')).toBe('API text')

    const none = buildSiteSeoFallback({}, 'https://shop.example.com/', null)
    expect(meta(none, 'description')).toBeUndefined()
    expect(meta(none, 'og:description')).toBeUndefined()
    expect(JSON.stringify(none)).not.toMatch(/ordering/i)
  })

  it('getThemeSiteDescription reads only a v2 theme\'s non-empty site.description', () => {
    expect(getThemeSiteDescription(theme({ description: '  Fresh food  ' }))).toBe('Fresh food')
    expect(getThemeSiteDescription(theme({ description: ' ' }))).toBeNull()
    expect(getThemeSiteDescription({ values: { site: { description: 'v1' } } })).toBeNull()
  })

  it('merged: the theme\'s site name wins on /seo/general, "My Site" without any', () => {
    const site = { name: 'API Site' }
    const themed = theme({ name: 'Theme Site' })
    const fallback = buildSiteSeoFallback(site, null, themed)
    expect(mergeSeoData({ title: { innerHtml: 'SEO title' } }, fallback, { preferSite: true, site, theme: themed }).title).toBe('Theme Site')
    expect(mergeSeoData({ title: { innerHtml: 'SEO title' } }, fallback, { preferSite: false, site, theme: themed }).title).toBe('SEO title')
    expect(mergeSeoData(null, buildSiteSeoFallback({}, null, null), { preferSite: true }).title).toBe('My Site')
  })
})
