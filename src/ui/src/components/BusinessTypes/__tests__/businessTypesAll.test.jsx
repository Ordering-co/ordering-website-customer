import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessTypes } from '../index'

const controller = vi.hoisted(() => ({ props: null, selected: null, onChange: null }))

// The controller drops its "All" type with hideAllCategory, as the real one
vi.mock('~components/components/BusinessTypeFilter', () => ({
  BusinessTypeFilter: ({ UIComponent, ...rest }) => {
    controller.props = rest
    const types = [
      ...(rest.hideAllCategory ? [] : [{ id: null, name: 'All', enabled: true }]),
      { id: 2, name: 'Groceries', enabled: true },
      { id: 3, name: 'Pharmacy', enabled: true }
    ]
    return (
      <UIComponent
        {...rest}
        typesState={{ loading: false, error: null, types }}
        currentTypeSelected={controller.selected}
        handleChangeBusinessType={controller.onChange}
      />
    )
  }
}))

// visibility.business_listing.categories.all off
const hideAll = () => themeWithValues((values) => {
  values.visibility['business_listing.categories.all'] = false
  return values
})

describe('BusinessTypes: the "All" type (visibility.business_listing.categories.all)', () => {
  beforeEach(() => {
    controller.selected = null
    controller.onChange = vi.fn()
  })

  it('complete theme: hidden by the theme, the listing\'s categories have no "All"', () => {
    const view = renderWithProviders(<BusinessTypes />, { theme: hideAll() })
    expect(controller.props.hideAllCategory).toBe(true)
    expect(view.queryByText('All')).toBeNull()
    expect(view.getByText('Groceries')).toBeInTheDocument()
  })

  it('complete theme: without "All" the selected type is a toggle (picking it again shows all)', () => {
    controller.selected = 2
    const view = renderWithProviders(<BusinessTypes />, { theme: hideAll() })
    fireEvent.click(view.getByText('Groceries'))
    expect(controller.onChange).toHaveBeenCalledWith(null)
    fireEvent.click(view.getByText('Pharmacy'))
    expect(controller.onChange).toHaveBeenLastCalledWith(3)
  })

  it('complete theme: shown by default', () => {
    const view = renderWithProviders(<BusinessTypes />, { theme: themeWithValues() })
    expect(controller.props.hideAllCategory).toBe(false)
    expect(view.getByText('All')).toBeInTheDocument()
  })

  it('complete theme: the chips\' row keeps room only for the focus ring, and takes no place when empty', () => {
    const theme = themeWithValues()
    const view = renderWithProviders(<BusinessTypes />, { theme })
    const row = view.container.querySelector('#container')
    const css = cssFor(row).replace(/\s+/g, '')
    const { width } = theme.values.tokens.focus_ring
    const reach = theme.values.tokens.border[width] + theme.values.tokens.space[theme.values.tokens.focus_ring.offset]
    expect(css).toContain(`margin:-${reach}px;padding:${reach}px;width:calc(100%+${2 * reach}px)`)
    expect(css).toContain(':empty{display:none;}')
  })
})
