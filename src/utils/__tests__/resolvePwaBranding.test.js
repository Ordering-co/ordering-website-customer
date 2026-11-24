import { describe, expect, it } from 'vitest'

import { ownAppBranding, ownSiteName, resolvePwaBranding } from '../resolvePwaBranding'
import { themeWithValues } from '../../ui/src/styles/__tests__/themeTestUtils'

const tenantTheme = themeWithValues((values) => {
  values.tokens.color.primary = '#0f766e'
  values.tokens.color.background = '#ffffff'
  values.site.name = 'Wegoo'
  values.site.description = 'Servicios a domicilio'
  values.images.logotype = 'https://cdn.example.com/wegoo-logo.png'
  values.images.favicon = 'https://cdn.example.com/wegoo-favicon.png'
})

describe('resolvePwaBranding', () => {
  it('prefers the site settings name and description, the language, and the tenant icons', () => {
    const branding = resolvePwaBranding({
      theme: tenantTheme,
      site: { name: 'Site fallback', description: 'Site description' },
      settings: { app_name: 'OrderingPlus' },
      languageCode: 'es',
      hostname: 'wegoo.es'
    })

    expect(branding.name).toBe('Wegoo')
    expect(branding.description).toBe('Servicios a domicilio')
    expect(branding.lang).toBe('es')
    expect(branding.themeColor).toBe('#0f766e')
    expect(branding.backgroundColor).toBe('#ffffff')
    expect(branding.icons[0].src).toBe('https://cdn.example.com/wegoo-favicon.png')
    expect(branding.icons[1].src).toBe('https://cdn.example.com/wegoo-logo.png')
  })

  it('falls back to the site when the site settings are empty, and to no icon (white label, nothing configured)', () => {
    const branding = resolvePwaBranding({
      theme: themeWithValues(),
      site: { name: 'Wegoo Site', description: '' },
      settings: { app_name: 'OrderingPlus' },
      languageCode: 'es',
      hostname: 'wegoo.es'
    })

    expect(branding.name).toBe('Wegoo Site')
    expect(branding.description).toBe('')
    expect(branding.icons).toEqual([])
  })

  it('uses site.logo for the tab icon when no custom favicon exists', () => {
    const branding = resolvePwaBranding({
      theme: themeWithValues(),
      site: { logo: 'https://cdn.example.com/site-logo.png' },
      hostname: 'wegoo.es'
    })

    expect(branding.icons[0].src).toBe('https://cdn.example.com/site-logo.png')
  })

  it('keeps a custom favicon ahead of site.logo', () => {
    const branding = resolvePwaBranding({
      theme: tenantTheme,
      site: { logo: 'https://cdn.example.com/site-logo.png' },
      hostname: 'wegoo.es'
    })

    expect(branding.icons[0].src).toBe('https://cdn.example.com/wegoo-favicon.png')
  })

  it('uses "My Site" when no tenant or site name exists, never the app_name', () => {
    const branding = resolvePwaBranding({
      theme: themeWithValues(),
      settings: { app_name: 'OrderingPlus' },
      languageCode: 'en',
      hostname: 'localhost'
    })

    expect(branding.name).toBe('My Site')
  })

  describe('app icon (images.app_icon)', () => {
    const APP_ICON = 'https://cdn.test/app-icon.png'
    const withAppIcon = () => themeWithValues((values) => ({ ...values, images: { ...values.images, app_icon: APP_ICON } }))

    it('it is every icon of the installed app, maskable included, and the iOS icon', () => {
      const branding = resolvePwaBranding({ theme: withAppIcon(), hostname: 'wegoo.es' })
      expect(branding.icons).toEqual([
        { src: APP_ICON, sizes: '192x192' },
        { src: APP_ICON, sizes: '512x512' },
        { src: APP_ICON, sizes: '512x512', purpose: 'maskable' }
      ])
      expect(branding.appleTouchIcon).toBe(APP_ICON)
    })

    it('without it, the isotype: the installed app\'s icons (not the maskable one) and the iOS icon', () => {
      const ISOTYPE = 'https://cdn.test/isotype.png'
      const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, app_icon: '', isotype: ISOTYPE } }))
      const branding = resolvePwaBranding({ theme, hostname: 'wegoo.es' })
      expect(branding.icons).toEqual([
        { src: ISOTYPE, sizes: '192x192' },
        { src: ISOTYPE, sizes: '512x512' }
      ])
      expect(branding.appleTouchIcon).toBe(ISOTYPE)
    })

    it('without either, on a white-label host with nothing configured: no icon at all, not an empty src', () => {
      const branding = resolvePwaBranding({ theme: themeWithValues(), hostname: 'wegoo.es' })
      expect(branding.icons).toEqual([])
      expect(branding.appleTouchIcon).toBeNull()
    })

    it('without either, but with a configured favicon and logo: the favicon and the logo', () => {
      const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, favicon: 'https://cdn.test/favicon.png', logotype: 'https://cdn.test/logo.png' } }))
      const branding = resolvePwaBranding({ theme, hostname: 'wegoo.es' })
      expect(branding.icons).toEqual([
        { src: 'https://cdn.test/favicon.png', sizes: '192x192', type: 'image/png' },
        { src: 'https://cdn.test/logo.png', sizes: '512x512', type: 'image/png' }
      ])
      expect(branding.appleTouchIcon).toBeNull()
    })

    it('the iOS icon is always a PNG: the CDN\'s 180×180 one, never an SVG isotype', () => {
      const CDN = 'https://res.cloudinary.com/acme/image/upload'
      const appIcon = themeWithValues((values) => ({ ...values, images: { ...values.images, app_icon: `${CDN}/f_auto/v1/app.webp` } }))
      expect(resolvePwaBranding({ theme: appIcon, hostname: 'wegoo.es' }).appleTouchIcon).toBe(`${CDN}/w_180,h_180,c_fill,f_png/v1/app.webp`)
      const svgIsotype = themeWithValues((values) => ({ ...values, images: { ...values.images, app_icon: '', isotype: `${CDN}/v1/iso.svg` } }))
      expect(resolvePwaBranding({ theme: svgIsotype, hostname: 'wegoo.es' }).appleTouchIcon).toBeNull()
    })

    it('the favicon\'s and the logo\'s manifest icons carry the type of their file, or none', () => {
      const theme = themeWithValues((values) => ({
        ...values,
        images: { ...values.images, favicon: 'https://cdn.test/favicon.svg', isotype: '', logotype: 'https://cdn.test/logo.webp' }
      }))
      const branding = resolvePwaBranding({ theme, hostname: 'wegoo.es' })
      expect(branding.icons[0]).toEqual({ src: 'https://cdn.test/favicon.svg', sizes: '192x192', type: 'image/svg+xml' })
      expect(branding.icons[1]).toEqual({ src: 'https://cdn.test/logo.webp', sizes: '512x512' })
    })
  })
})

describe('ownSiteName', () => {
  it("the theme's own name", () => {
    const theme = themeWithValues((values) => { values.site.name = 'Wegoo'; return values })
    expect(ownSiteName({ theme, site: {} })).toBe('Wegoo')
  })

  it("falls back to the site's own name (the API's) when the theme has none", () => {
    expect(ownSiteName({ theme: themeWithValues(), site: { name: 'Site name' } })).toBe('Site name')
  })

  it('\'\' without either (never "My Site")', () => {
    expect(ownSiteName({ theme: themeWithValues(), site: {} })).toBe('')
  })
})

describe('ownAppBranding', () => {
  const ICON = 'https://cdn.test/app-icon.png'
  const withOwnBranding = () => themeWithValues((values) => ({
    ...values,
    site: { ...values.site, name: 'Wegoo' },
    images: { ...values.images, app_icon: ICON }
  }))

  it('the site\'s own name and app icon, when both exist', () => {
    expect(ownAppBranding({ theme: withOwnBranding(), site: {} })).toEqual({ name: 'Wegoo', icon: ICON })
  })

  it('falls back to site.name (the API\'s) when the theme has none', () => {
    const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, app_icon: ICON } }))
    expect(ownAppBranding({ theme, site: { name: 'Site name' } })).toEqual({ name: 'Site name', icon: ICON })
  })

  it('null without a name (never "My Site")', () => {
    const theme = themeWithValues((values) => ({ ...values, images: { ...values.images, app_icon: ICON } }))
    expect(ownAppBranding({ theme, site: {} })).toBeNull()
  })

  it('null without an app icon (not the isotype\'s placeholder, not the favicon/logo)', () => {
    expect(ownAppBranding({ theme: themeWithValues((values) => ({ ...values, site: { ...values.site, name: 'Wegoo' } })), site: {} })).toBeNull()
  })

  it('null without either', () => {
    expect(ownAppBranding({ theme: themeWithValues(), site: {} })).toBeNull()
  })
})

describe('ownSiteName', () => {
  const named = (name) => themeWithValues((values) => ({ ...values, site: { ...values.site, name } }))

  it('is the site\'s own name', () => {
    expect(ownSiteName({ theme: named('Wegoo'), site: {} })).toBe('Wegoo')
    expect(ownSiteName({ theme: named(''), site: { name: 'Nabe & Don' } })).toBe('Nabe & Don')
  })

  it('is empty without a name, or with the "My Site" placeholder (theme or site)', () => {
    expect(ownSiteName({ theme: named(''), site: {} })).toBe('')
    expect(ownSiteName({ theme: named('My Site'), site: {} })).toBe('')
    expect(ownSiteName({ theme: named(''), site: { name: ' My Site ' } })).toBe('')
  })
})
