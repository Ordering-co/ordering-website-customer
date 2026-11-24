import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../ui/src/styles/__tests__/themeTestUtils'
import { pageSections } from '../../../utils/themePages'
import { LandingPage, MODE_SECTIONS } from '../index'

// The map of the one-store type is the contract's example: a component per key, no props.
// (its real sections have their own tests)
vi.mock('../sections/oneStore', () => {
  const part = (key) => () => <div data-part={key}>{key}</div>
  return { default: { Header: part('Header'), Footer: part('Footer'), hero: part('hero'), about: part('about'), visit: part('visit') } }
})
// The marketplace's map brings its Header and no Footer (the app's footer stays under it).
vi.mock('../sections/marketplace', () => {
  const part = (key) => () => <div data-part={key}>{key}</div>
  return { default: { Header: part('Header'), hero: part('hero'), categories: part('categories'), app: part('app'), partner: part('partner') } }
})

// A franchise's map: its header and footer, and the sections of its main store (no services or visit).
vi.mock('../sections/franchise', () => {
  const part = (key) => () => <div data-part={key}>{key}</div>
  return { default: { Header: part('Header'), Footer: part('Footer'), hero: part('hero'), about: part('about'), app: part('app') } }
})

const parts = (container) => Array.from(container.querySelectorAll('[data-part]')).map((el) => el.getAttribute('data-part'))

const landingTheme = (mode, sections) => themeWithValues((values) => {
  values.site.mode = mode
  if (sections) values.pages.landing = { footer: null, sections: sections.map(([key, visible]) => ({ key, visible })) }
  return values
})

describe('LandingPage (pages.landing)', () => {
  it('a type with a map: its header, the sections the map has in the theme\'s order, its footer', () => {
    const { container } = renderWithProviders(<LandingPage />, { theme: landingTheme('single_store') })
    const visibleKeys = pageSections({}, 'landing').filter((s) => s.visible).map((s) => s.key)
    expect(parts(container)).toEqual(['Header', ...visibleKeys.filter((key) => ['hero', 'about', 'visit'].includes(key)), 'Footer'])
    expect(parts(container)[1]).toBe('hero')
  })

  it('the header comes before <main> and the footer after it', () => {
    const { container } = renderWithProviders(<LandingPage />, { theme: landingTheme('single_store') })
    const main = container.querySelector('main')
    expect(main.compareDocumentPosition(container.querySelector('[data-part=Header]')) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    expect(main.compareDocumentPosition(container.querySelector('[data-part=Footer]')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(main.querySelector('[data-part=Header], [data-part=Footer]')).toBeNull()
  })

  it('the theme\'s order and hidden sections; a section the map lacks paints nothing, no empty box', () => {
    const theme = landingTheme('single_store', [['hero', true], ['visit', true], ['about', false], ['featured', true], ['gallery', true]])
    const { container } = renderWithProviders(<LandingPage />, { theme })
    expect(parts(container)).toEqual(['Header', 'hero', 'visit', 'Footer'])
    expect(container.querySelectorAll('section')).toHaveLength(0)
  })

  it('a marketplace: its own map, with its header and the app section, and no footer of its own', () => {
    const theme = landingTheme('marketplace', [['hero', true], ['about', true], ['categories', true], ['app', true], ['partner', false]])
    const { container } = renderWithProviders(<LandingPage />, { theme })
    expect(parts(container)).toEqual(['Header', 'hero', 'categories', 'app'])
  })

  it('a franchise: its own map, with its header and footer', () => {
    const theme = landingTheme('franchise', [['hero', true], ['services', true], ['about', true], ['visit', true], ['app', true]])
    const { container } = renderWithProviders(<LandingPage />, { theme })
    expect(parts(container)).toEqual(['Header', 'hero', 'about', 'app', 'Footer'])
  })

  it('a type without a map: an empty <main>, no header or footer', () => {
    const franchise = MODE_SECTIONS.franchise
    delete MODE_SECTIONS.franchise
    try {
      const { container } = renderWithProviders(<LandingPage />, { theme: landingTheme('franchise') })
      expect(container.querySelector('main')).not.toBeNull()
      expect(container.querySelector('main').children).toHaveLength(0)
      expect(parts(container)).toEqual([])
    } finally {
      MODE_SECTIONS.franchise = franchise
    }
  })
})
