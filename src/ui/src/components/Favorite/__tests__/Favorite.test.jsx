import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { Favorite } from '../index'

vi.mock('~ui/src/components/FavoriteList', () => ({
  FavoriteList: ({ favoriteURL, location, hideDistance }) => <div data-testid='favorite-list' data-url={favoriteURL} data-location={String(location)} data-hide-distance={String(!!hideDistance)} />
}))

// the contexts are the setup's mocks, with the order's address and the project's
// configs a test can change
const contexts = vi.hoisted(() => ({ address: undefined, configs: {} }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 2, address: contexts.address }, carts: {} }, {}]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: contexts.configs }]
}))

describe('Favorite', () => {
  it('renders favorites title and tabs', () => {
    const { getByText, getByTestId } = renderWithProviders(<Favorite />)
    expect(getByText('My Favorites')).toBeInTheDocument()
    expect(getByText('Businesses')).toBeInTheDocument()
    expect(getByTestId('favorite-list')).toBeInTheDocument()
  })

  it('renders professionals tab when layout is appointments', () => {
    const theme = themeWithValues((values) => {
      values.tokens.layout.mode = 'appointments'
      return values
    })
    const { getByText, getByTestId } = renderWithProviders(<Favorite />, { theme })
    fireEvent.click(getByText('Professionals'))
    expect(getByTestId('favorite-list')).toBeInTheDocument()
    fireEvent.click(getByText('Products'))
    fireEvent.click(getByText('Orders'))
    expect(getByText('My Favorites')).toBeInTheDocument()
  })
})

// complete theme: a tab whose hearts the theme hides (business.header.favorite,
// product.favorite, orders.favorite) is left out
describe('Favorite: the tabs and the hearts of the theme', () => {
  const hiding = (...keys) => themeWithValues((values) => {
    keys.forEach((key) => { values.visibility[key] = false })
    return values
  })
  const tabs = (container) => Array.from(container.querySelectorAll('[data-doc-control="favorites-tab"]')).map((tab) => tab.textContent)

  it('complete theme with the schema defaults: the three tabs, businesses first', () => {
    const { container, getByTestId } = renderWithProviders(<Favorite />, { theme: themeWithValues() })
    expect(tabs(container)).toEqual(['Businesses', 'Products', 'Orders'])
    expect(getByTestId('favorite-list').dataset.url).toBe('favorite_businesses')
  })

  it('complete theme: without the store\'s heart, the listing cards\' hearts keep the businesses tab', () => {
    const { container, getByTestId } = renderWithProviders(<Favorite />, { theme: hiding('business.header.favorite') })
    expect(tabs(container)).toEqual(['Businesses', 'Products', 'Orders'])
    expect(getByTestId('favorite-list').dataset.url).toBe('favorite_businesses')
  })

  it('complete theme: without the listing cards\' hearts, the store\'s heart keeps the businesses tab', () => {
    const { container } = renderWithProviders(<Favorite />, { theme: hiding('business_card.favorite') })
    expect(tabs(container)).toEqual(['Businesses', 'Products', 'Orders'])
  })

  it('complete theme: without both business hearts, no businesses tab; the first one shown is selected', () => {
    const { container, getByTestId } = renderWithProviders(<Favorite />, { theme: hiding('business_card.favorite', 'business.header.favorite') })
    expect(tabs(container)).toEqual(['Products', 'Orders'])
    expect(getByTestId('favorite-list').dataset.url).toBe('favorite_products')
  })

  it('complete theme: product.favorite and orders.favorite leave out their tabs', () => {
    const { container } = renderWithProviders(<Favorite />, { theme: hiding('product.favorite', 'orders.favorite') })
    expect(tabs(container)).toEqual(['Businesses'])
  })

  it('complete theme: every heart hidden, no tabs and no list', () => {
    const { container, queryByTestId, getByText } = renderWithProviders(<Favorite />, { theme: hiding('business_card.favorite', 'business.header.favorite', 'product.favorite', 'orders.favorite') })
    expect(getByText('My Favorites')).toBeInTheDocument()
    expect(tabs(container)).toHaveLength(0)
    expect(queryByTestId('favorite-list')).toBeNull()
  })
})

// pages.favorites: its section tabs, the bar of tabs
describe('Favorite: the section tabs (pages.favorites)', () => {
  const withTabs = (visible) => themeWithValues((values) => {
    values.pages.favorites = { ...values.pages.favorites, sections: [{ key: 'tabs', visible }] }
    return values
  })

  it('shown by default; the theme hides the bar, the first tab\'s favorites stay', () => {
    const shown = renderWithProviders(<Favorite />, { theme: themeWithValues() })
    expect(shown.container.querySelector('[data-slot=tabs-navigation]')).not.toBeNull()
    shown.unmount()
    const { container, getByTestId, getByText } = renderWithProviders(<Favorite />, { theme: withTabs(false) })
    expect(container.querySelector('[data-slot=tabs-navigation]')).toBeNull()
    expect(container.querySelector('[data-doc-control="favorites-tab"]')).toBeNull()
    expect(getByText('My Favorites')).toBeInTheDocument()
    expect(getByTestId('favorite-list').dataset.url).toBe('favorite_businesses')
  })
})

// the businesses tab asks the API for distances from a location: the order's, else the project's
describe('Favorite: the location of the favorite businesses', () => {
  const projectDefault = { location_default_latitude: { value: '60' }, location_default_longitude: { value: '-95' } }
  const locationOf = () => renderWithProviders(<Favorite />).getByTestId('favorite-list').dataset.location

  it('Pickup without an address: the project\'s default location, never "undefined,undefined"', () => {
    contexts.address = undefined
    contexts.configs = projectDefault
    expect(locationOf()).toBe('60,-95')
  })

  it('an address with coordinates: its own', () => {
    contexts.address = { location: { lat: 4.5, lng: -74.1 } }
    contexts.configs = projectDefault
    expect(locationOf()).toBe('4.5,-74.1')
  })

  // implementation notesthe API answers 400 to a list of businesses without a location
  it('without an address or a default: still a location, and its distances are hidden', () => {
    contexts.address = { address: 'no coordinates' }
    contexts.configs = {}
    const { getByTestId } = renderWithProviders(<Favorite />)
    expect(getByTestId('favorite-list').dataset.location).toBe('0,0')
    expect(getByTestId('favorite-list').dataset.hideDistance).toBe('true')
  })

  it('with a real location its distances show', () => {
    contexts.address = undefined
    contexts.configs = projectDefault
    expect(renderWithProviders(<Favorite />).getByTestId('favorite-list').dataset.hideDistance).toBe('false')
  })
})
