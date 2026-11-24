import React from 'react'
import { describe, expect, it } from 'vitest'
import marketplace, { marketplaceSections } from '../marketplace'
import { pageSections } from '../../../../utils/themePages'
import { renderWithProviders } from '../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../ui/src/styles/__tests__/themeTestUtils'

describe('marketplace sections of the landing page', () => {
  it('the default export is the map key -> component, the named one the same object', () => {
    expect(marketplaceSections).toBe(marketplace)
    expect(Object.keys(marketplace).sort()).toEqual(['Header', 'app', 'categories', 'how_it_works', 'hero', 'partner', 'popular_stores'].sort())
    Object.values(marketplace).forEach((Component) => expect(typeof Component).toBe('function'))
  })

  it('has no Footer (the app paints its own) and shares the app section of the one-store page', async () => {
    const { AppSection } = await import('../App')
    expect(marketplace.Footer).toBeUndefined()
    expect(marketplace.app).toBe(AppSection)
  })

  it('every key but Header is a section of pages.landing', () => {
    const keys = pageSections({}, 'landing').map((section) => section.key)
    Object.keys(marketplace).filter((key) => key !== 'Header').forEach((key) => expect(keys).toContain(key))
  })

  it('the static sections draw without props', () => {
    const { HowItWorks, Partner } = { HowItWorks: marketplace.how_it_works, Partner: marketplace.partner }
    const { container } = renderWithProviders(<><HowItWorks /><Partner /></>, { theme: themeWithValues() })
    expect(container.querySelectorAll('section')).toHaveLength(2)
  })
})
