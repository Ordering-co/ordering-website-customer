import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues, cssFor } from '../../../styles/__tests__/themeTestUtils'
import { SearchComponent } from '../SearchComponent'

// The store header's search button and sort (visibility business.header.search
// and business.header.sort)

vi.mock('~ui/src/design-system/components/Select', () => ({ Select: () => <div data-testid='sort' /> }))

const renderSearch = (theme) => renderWithProviders(
  <SearchComponent setOpenSearchProducts={vi.fn()} sortByOptions={[]} />,
  { theme }
)
const searchButton = (view) => view.container.querySelector('[data-doc-control="business-product-search-open"]')
const hide = (...keys) => themeWithValues((values) => {
  keys.forEach((key) => { values.visibility[key] = false })
  return values
})

describe('store header: the product search button (business.header.search)', () => {
  it('shown by default, a named button', () => {
    const view = renderSearch(themeWithValues())
    expect(searchButton(view)).toHaveAttribute('aria-label', 'Search Products')
    expect(view.getByTestId('sort')).toBeInTheDocument()
  })

  it('the key hides it; the sort stays', () => {
    const view = renderSearch(hide('business.header.search'))
    expect(searchButton(view)).toBeNull()
    expect(view.getByTestId('sort')).toBeInTheDocument()
  })

  it('without search nor sort nothing is drawn', () => {
    const view = renderSearch(hide('business.header.search', 'business.header.sort'))
    expect(view.container.querySelector('#search-component')).toBeNull()
  })

  // The lupa is BsSearch, centered in its own viewBox: no nudge of its ink.
  it('does not offset the lupa ink', () => {
    const view = renderSearch(themeWithValues())
    expect(cssFor(searchButton(view))).not.toContain('svg path{')
  })
})
