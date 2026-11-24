import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../../styles/__tests__/themeTestUtils'
import { BusinessProductsCategories } from '../index'

vi.mock('~ui/src/components/AccordionDropdown', () => ({
  AccordionDropdown: ({ item, isOpen }) => (
    <div data-testid='accordion' data-open={isOpen}>{item.name}</div>
  )
}))
vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))

const handlerClickCategory = vi.hoisted(() => vi.fn())

vi.mock('~components/components/BusinessProductsCategories', () => ({
  BusinessProductsCategories: ({ UIComponent, ...rest }) => (
    <UIComponent
      categories={[
        { id: 1, name: 'Aisles', subcategories: [{ id: 2, name: 'Snacks', subcategories: [{ id: 3, name: 'Chips' }] }] },
        { id: 4, name: 'Drinks' }
      ]}
      categorySelected={{ id: 1, name: 'Aisles' }}
      handlerClickCategory={handlerClickCategory}
      setCategoryClicked={vi.fn()}
      openCategories={[]}
      isSkeleton={false}
      {...rest}
    />
  )
}))

describe('BusinessProductsCategories groceries layout', () => {
  it('renders grocery accordion category', () => {
    const { getByTestId } = renderWithProviders(<BusinessProductsCategories />)
    expect(getByTestId('accordion')).toHaveTextContent('Aisles')
  })

  it('popover: a parent is entered (title, back, All, its children), level by level', () => {
    const { getByText, getByLabelText, queryByText } = renderWithProviders(
      <BusinessProductsCategories isPopover />, { theme: themeWithValues() }
    )
    expect(queryByText('Snacks')).toBeNull()
    fireEvent.click(getByText('Aisles'))
    expect(getByText('Aisles')).toBeInTheDocument() // the title
    expect(getByText('All')).toBeInTheDocument()
    expect(getByText('Snacks')).toBeInTheDocument()
    expect(queryByText('Drinks')).toBeNull()
    expect(handlerClickCategory).not.toHaveBeenCalled()
    fireEvent.click(getByText('Snacks'))
    expect(getByText('Chips')).toBeInTheDocument()
    fireEvent.click(getByLabelText('Back'))
    expect(getByText('Snacks')).toBeInTheDocument()
    // All selects the parent
    fireEvent.click(getByText('All'))
    expect(handlerClickCategory).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it('a top category with subcategories has the line below the others have; the last one, the box\'s border', () => {
    const { getByTestId } = renderWithProviders(<BusinessProductsCategories />, { theme: themeWithValues() })
    expect(getByTestId('accordion').parentElement).toHaveClass('accordion', 'level-1')
  })

  it('beside the products, fixed under the business name bar once that one is fixed', async () => {
    const bar = document.createElement('div')
    bar.id = 'business_name_bar'
    bar.getBoundingClientRect = () => ({ top: 0, bottom: 71, height: 71 })
    document.body.appendChild(bar)
    const { container } = renderWithProviders(<BusinessProductsCategories />, { theme: themeWithValues() })
    const list = container.querySelector('.category-lists')
    expect(list.style.getPropertyValue('--categories-sticky-top')).toBe('0px')
    await act(async () => { bar.classList.add('fixed-name') })
    expect(list.style.getPropertyValue('--categories-sticky-top')).toBe('71px')
    await act(async () => { bar.classList.remove('fixed-name') })
    expect(list.style.getPropertyValue('--categories-sticky-top')).toBe('0px')
    bar.remove()
  })

  // the header's row on the page (headerVisibleBottom reads it): 56 tall, pegged on top
  const withHeader = () => {
    const header = document.createElement('div')
    header.setAttribute('data-app-header', '')
    Object.defineProperty(header, 'offsetHeight', { configurable: true, get: () => 56 })
    header.getBoundingClientRect = () => ({ top: 0, bottom: 56, height: 56 })
    document.body.appendChild(header)
    return header
  }

  it('beside the products, fixed under the sticky header (the lower of it and the fixed name bar), kiosk included', async () => {
    const header = withHeader()
    const bar = document.createElement('div')
    bar.id = 'business_name_bar'
    bar.getBoundingClientRect = () => ({ top: 56, bottom: 127, height: 71 })
    document.body.appendChild(bar)
    const { container } = renderWithProviders(<BusinessProductsCategories />, { theme: themeWithValues() })
    const list = container.querySelector('.category-lists')
    expect(list.style.getPropertyValue('--categories-sticky-top')).toBe('56px')
    await act(async () => { bar.classList.add('fixed-name') })
    expect(list.style.getPropertyValue('--categories-sticky-top')).toBe('127px')
    const kiosk = renderWithProviders(<BusinessProductsCategories useKioskApp />, { theme: themeWithValues() })
    expect(kiosk.container.querySelector('.category-lists').style.getPropertyValue('--categories-sticky-top')).toBe('56px')
    // a revealing header goes: its event places them again
    header.setAttribute('data-scroll-state', 'hidden')
    await act(async () => { window.dispatchEvent(new Event('header-scroll-state')) })
    expect(list.style.getPropertyValue('--categories-sticky-top')).toBe('127px')
    bar.classList.remove('fixed-name')
    await act(async () => { window.dispatchEvent(new Event('header-dock-change')) })
    expect(list.style.getPropertyValue('--categories-sticky-top')).toBe('0px')
    bar.remove()
    header.remove()
  })
})
