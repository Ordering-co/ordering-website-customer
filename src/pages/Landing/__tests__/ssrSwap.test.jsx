import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../ui/src/styles/__tests__/themeTestUtils'
import { LandingPage } from '../index'
import { removeLandingSsr, takeLandingSeed } from '../ssrSwap'
import { seedLanding } from '../useFranchiseStores'

const seenWhileRendering = []
vi.mock('../sections/oneStore', () => ({
  default: { hero: () => { seenWhileRendering.push(!!document.getElementById('landing-ssr')); return <div>hero</div> } }
}))
vi.mock('../sections/marketplace', () => ({ default: {} }))
vi.mock('../sections/franchise', () => ({ default: {} }))
vi.mock('~components/contexts/ApiContext', () => ({ useApi: () => [{ root: 'https://api.ordering.test/v400/en/demo' }] }))
vi.mock('../useFranchiseStores', () => ({ seedLanding: vi.fn() }))

const theme = () => themeWithValues((values) => {
  values.site.mode = 'single_store'
  values.site.business_slug = 'casa-lupita'
  return values
})

// what the Worker leaves before #root (worker/landingSsr.js)
const putServerMarkup = () => {
  document.body.insertAdjacentHTML('afterbegin', '<style id="landing-ssr-style">#root{display:none}</style><div id="landing-ssr"><h1>server</h1></div>')
}

afterEach(() => {
  vi.mocked(seedLanding).mockClear()
  seenWhileRendering.length = 0
  document.getElementById('landing-ssr')?.remove()
  document.getElementById('landing-ssr-style')?.remove()
  delete window.__LANDING__
})

describe('the landing\'s swap with the server render', () => {
  it('mounting LandingPage takes the server markup and its style out', () => {
    putServerMarkup()
    const { container } = renderWithProviders(<LandingPage />, { theme: theme() })
    expect(container.querySelector('main')).not.toBeNull()
    expect(document.getElementById('landing-ssr')).toBeNull()
    expect(document.getElementById('landing-ssr-style')).toBeNull()
  })

  it('the sections render with the server markup still on the page: it goes in the layout effect, same frame', () => {
    putServerMarkup()
    renderWithProviders(<LandingPage />, { theme: theme() })
    expect(seenWhileRendering).toEqual([true])
    expect(document.getElementById('landing-ssr')).toBeNull()
  })

  it('without the markup (a plain page, a visit that did not get it) nothing fails', () => {
    expect(() => renderWithProviders(<LandingPage />, { theme: theme() })).not.toThrow()
    expect(() => removeLandingSsr()).not.toThrow()
  })

  it('the Worker\'s data seeds the hook\'s cache before the sections render, once', () => {
    window.__LANDING__ = { business: { id: 5 }, featured: null }
    const { rerender } = renderWithProviders(<LandingPage />, { theme: theme() })
    expect(seedLanding).toHaveBeenCalledTimes(1)
    // the theme goes in whole: seedLanding resolves the store (or the franchise) from it
    expect(seedLanding).toHaveBeenCalledWith('https://api.ordering.test/v400/en/demo', expect.objectContaining({ values: expect.objectContaining({ site: expect.objectContaining({ business_slug: 'casa-lupita' }) }) }), { business: { id: 5 }, featured: null })
    expect(window.__LANDING__).toBeUndefined()
    rerender(<LandingPage />)
    expect(seedLanding).toHaveBeenCalledTimes(1)
  })

  it('without the Worker\'s data nothing is seeded', () => {
    renderWithProviders(<LandingPage />, { theme: theme() })
    expect(seedLanding).not.toHaveBeenCalled()
  })

  it('takeLandingSeed reads window.__LANDING__ once and deletes it', () => {
    window.__LANDING__ = { business: { id: 5 } }
    expect(takeLandingSeed()).toEqual({ business: { id: 5 } })
    expect(window.__LANDING__).toBeUndefined()
    expect(takeLandingSeed()).toBeNull()
  })
})
