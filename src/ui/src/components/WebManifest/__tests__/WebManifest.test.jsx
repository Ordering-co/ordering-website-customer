import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

import { applyWebManifestLink } from '../../../../../utils/applyWebManifestLink'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { WebManifest } from '../index'

vi.mock('../../../../../utils/applyWebManifestLink', () => ({
  applyWebManifestLink: vi.fn(() => vi.fn())
}))

// The site's name and description (site.name, site.description)
const withSite = (mutate = (values) => values) => themeWithValues((values) => {
  values.site.name = 'Wegoo'
  values.site.description = 'Servicios a domicilio'
  return mutate(values)
})
const theme = withSite()

describe('WebManifest', () => {
  it('applies the tenant manifest when branding is ready', () => {
    render(
      <WebManifest
        ready
        theme={theme}
        site={{ name: 'Fallback' }}
        languageCode='es'
        hostname='wegoo.es'
      />
    )

    expect(applyWebManifestLink).toHaveBeenCalledTimes(1)
    const [manifest, options] = applyWebManifestLink.mock.calls[0]
    expect(manifest.name).toBe('Wegoo')
    expect(manifest.description).toBe('Servicios a domicilio')
    expect(manifest.lang).toBe('es')
    expect(manifest.start_url).toBe(`${window.location.origin}/`)
    expect(manifest.scope).toBe(`${window.location.origin}/`)
    // no app icon on this theme: not the site's own branding yet
    expect(options.title).toBeUndefined()
  })

  it('reapplies the manifest when the app language changes', () => {
    const { rerender } = render(
      <WebManifest
        ready
        theme={theme}
        site={{ name: 'Wegoo' }}
        languageCode='en'
        hostname='wegoo.es'
      />
    )

    applyWebManifestLink.mockClear()
    rerender(
      <WebManifest
        ready
        theme={theme}
        site={{ name: 'Wegoo' }}
        languageCode='es'
        hostname='wegoo.es'
      />
    )

    expect(applyWebManifestLink).toHaveBeenCalledTimes(1)
    expect(applyWebManifestLink.mock.calls[0][0].lang).toBe('es')
  })

  it('names the app "My Site" without a theme or site name, never the app_name', () => {
    applyWebManifestLink.mockClear()
    render(<WebManifest ready theme={themeWithValues()} site={{}} languageCode='en' hostname='shop.example.com' />)
    expect(applyWebManifestLink.mock.calls[0][0].name).toBe('My Site')
  })

  it('does not apply a manifest while branding is still loading', () => {
    applyWebManifestLink.mockClear()
    render(
      <WebManifest
        ready={false}
        theme={theme}
        languageCode='es'
      />
    )

    expect(applyWebManifestLink).not.toHaveBeenCalled()
  })

  it('with an app icon: the manifest icons and the iOS home-screen icon are it', () => {
    applyWebManifestLink.mockClear()
    const APP_ICON = 'https://cdn.test/app-icon.png'
    const themed = withSite((values) => ({ ...values, images: { ...values.images, app_icon: APP_ICON } }))
    const { unmount } = render(<WebManifest ready theme={themed} site={{}} languageCode='es' hostname='wegoo.es' />)
    const [manifest, options] = applyWebManifestLink.mock.calls[0]
    expect(manifest.icons.map((icon) => icon.src)).toEqual([APP_ICON, APP_ICON, APP_ICON])
    // own name + own icon: the iOS home-screen title is the site's own name
    expect(options.title).toBe('Wegoo')
    const touchIcon = document.head.querySelector('link[rel="apple-touch-icon"]')
    expect(touchIcon).toHaveAttribute('href', APP_ICON)
    unmount()
    expect(document.head.querySelector('link[rel="apple-touch-icon"]')).toBeNull()
  })
})
