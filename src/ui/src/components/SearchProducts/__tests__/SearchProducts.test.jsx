import React from 'react'

import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { SearchProducts } from '../index'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

vi.mock('~ui/src/components/BusinessProductsList', () => ({
  BusinessProductsList: ({ handleClearSearch }) => <button type='button' onClick={() => handleClearSearch('')}>Clear filters</button>
}))

describe('SearchProducts', () => {
  it('renders search UI and cancel closes', () => {
    const onClose = vi.fn()
    const { getByText, getByRole, queryByRole } = renderWithProviders(
      <SearchProducts
        onClose={onClose}
        searchValue=''
        handleChangeSearch={vi.fn()}
        business={{ id: 1, categories: [], lazy_load_products_recommended: false }}
        featuredProducts={false}
        categorySelected={{ id: null }}
      />
    )
    expect(getByRole('textbox', { name: 'Search Products' })).toHaveAttribute('placeholder', 'Search Products')
    expect(queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
    fireEvent.click(getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows products list when search has value', () => {
    const { getByRole } = renderWithProviders(
      <SearchProducts
        onClose={vi.fn()}
        searchValue='pizza'
        handleChangeSearch={vi.fn()}
        business={{ id: 1, categories: [{ id: 1, name: 'Mains', rank: 1 }], lazy_load_products_recommended: false }}
        featuredProducts={false}
        categorySelected={{ id: null }}
      />
    )
    expect(getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it.each([false, true])('repeats the same key after clearing filters (deferred: %s)', (lazyLoad) => {
    const search = vi.fn()
    const Fixture = () => {
      const [value, setValue] = React.useState('')
      return <SearchProducts
        searchValue={value}
        handleChangeSearch={(next) => { search(next); setValue(next) }}
        business={{ id: 1, categories: [], lazy_load_products_recommended: lazyLoad }}
      />
    }
    const { getByRole } = renderWithProviders(<Fixture />)
    const field = getByRole('textbox', { name: 'Search Products' })
    vi.useFakeTimers()
    try {
      const type = () => {
        fireEvent.input(field, { inputType: 'insertText', target: { value: 'z' } })
        if (lazyLoad) act(() => vi.advanceTimersByTime(750))
      }
      type()
      const clear = getByRole('button', { name: 'Clear filters' })
      clear.focus()
      fireEvent.click(clear)
      expect(field).toHaveFocus()
      expect(field).toHaveValue('')
      type()
      expect(search.mock.calls).toEqual([['z'], [''], ['z']])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('SearchProducts — the logo without one', () => {
  const themeNamed = (name) => themeWithValues((values) => ({ ...values, site: { ...values.site, name }, images: { ...values.images, logotype: '', isotype: '' } }))
  const renderSearch = (theme) => renderWithProviders(
    <SearchProducts
      onClose={vi.fn()}
      searchValue=''
      handleChangeSearch={vi.fn()}
      business={{ id: 1, categories: [], lazy_load_products_recommended: false }}
      featuredProducts={false}
      categorySelected={{ id: null }}
    />,
    { theme }
  )

  it('without a logo, shows the site\'s own name as text, never an image', () => {
    const { getByRole } = renderSearch(themeNamed('Wegoo'))
    const search = within(getByRole('dialog', { name: 'Search Products' }))
    expect(search.queryByAltText('Logo')).not.toBeInTheDocument()
    expect(search.getByTitle('Wegoo')).toHaveTextContent('Wegoo')
  })

  it('without a logo nor an own name ("My Site"), shows no logo box at all', () => {
    const { getByRole } = renderSearch(themeNamed('My Site'))
    const search = within(getByRole('dialog', { name: 'Search Products' }))
    expect(search.queryByAltText('Logo')).not.toBeInTheDocument()
    expect(search.queryByTitle('My Site')).not.toBeInTheDocument()
  })
})
