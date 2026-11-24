import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderWithProviders, defaultTheme } from '../../../../../__tests__/helpers/testUtils'
import { BusinessTypes } from '../index'
import { cssFor, injectedCss } from '../../../styles/__tests__/themeTestUtils'
import { buildAppTheme } from '../../../../../utils/appTheme'
import { buildCompleteValues, buildLocalTheme, envelope } from '../../../../../utils/__tests__/fixtures/themeFixtures'

const buttonTheme = defaultTheme

const typesState = vi.hoisted(() => ({
  current: {
    loading: false,
    error: null,
    types: [
      { id: null, name: 'All', enabled: true },
      { id: 2, name: 'Groceries', enabled: true }
    ]
  }
}))

vi.mock('~components/components/BusinessTypeFilter', () => ({
  BusinessTypeFilter: ({ UIComponent, ...rest }) => (
    <UIComponent
      typesState={typesState.current}
      currentTypeSelected={null}
      handleChangeBusinessType={vi.fn()}
      {...rest}
    />
  )
}))

describe('BusinessTypes', () => {
  beforeEach(() => {
    typesState.current = {
      loading: false,
      error: null,
      types: [
        { id: null, name: 'All', enabled: true },
        { id: 2, name: 'Groceries', enabled: true }
      ]
    }
  })

  it('renders pill categories when types have no images', () => {
    const { getByText } = renderWithProviders(<BusinessTypes />, { theme: buttonTheme })
    expect(getByText('All')).toBeInTheDocument()
    expect(getByText('Groceries')).toBeInTheDocument()
  })

  it('T9: a tile\'s image is cropped square with cover, never stretched', () => {
    typesState.current = {
      loading: false,
      error: null,
      types: [{ id: 2, name: 'Groceries', enabled: true, image: '/groceries-wide.png' }]
    }
    const values = buildCompleteValues()
    values.components.business_types.base.layout = 'tiles'
    const theme = buildAppTheme(buildLocalTheme(), envelope(values))
    const { getByText } = renderWithProviders(<BusinessTypes />, { theme })
    const img = getByText('Groceries').closest('button').querySelector('img')
    const size = values.components.business_types.base.image_size
    expect(cssFor(img.closest('button').firstElementChild).replace(/\s+/g, '')).toContain(`.type-image{width:${size}px;height:${size}px;`)
    const box = img.closest('.type-image')
    const own = [...box.classList].find((name) => !name.includes('-sc-') && name !== 'type-image')
    const boxCss = injectedCss().split('}').filter((rule) => rule.includes(`.${own}`)).join('}').replace(/\s+/g, '')
    expect(boxCss).toMatch(/img\{display:block;width:100%;height:100%;object-fit:cover;/)
  })

  it('renders skeletons while loading', () => {
    typesState.current = { loading: true, error: null, types: [] }
    const { getAllByTestId } = renderWithProviders(<BusinessTypes />, { theme: buttonTheme })
    expect(getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('the pills are chips of the theme: the selected one in its selected state', () => {
    const values = buildCompleteValues()
    const theme = buildAppTheme(buildLocalTheme(), envelope(values))
    const { getByText } = renderWithProviders(<BusinessTypes />, { theme })
    const chip = values.components.chip
    const selected = getByText('All')
    const other = getByText('Groceries')
    expect(selected).toHaveAttribute('data-selected')
    expect(selected.style.getPropertyValue('--ui-chip-selected-background')).toBe(chip.variants.default.states.selected.background)
    expect(selected.style.getPropertyValue('--ui-chip-selected-color')).toBe(chip.variants.default.states.selected.color)
    expect(other).not.toHaveAttribute('data-selected')
    expect(other.style.getPropertyValue('--ui-chip-background')).toBe(chip.base.background)
    expect(other.style.getPropertyValue('--ui-chip-color')).toBe(chip.base.color)
    expect(chip.variants.default.states.selected.background).not.toBe(chip.base.background)
    expect(getByText('All').getAttribute('aria-pressed')).toBe('true')
  })
})
