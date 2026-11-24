import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { ProductIngredient } from '../index'

// jsdom has no PointerEvent, which Base UI builds to click its hidden input
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

const toggleSelect = vi.hoisted(() => vi.fn())

vi.mock('~components/components/ProductIngredient', () => ({
  ProductIngredient: ({ UIComponent, ...rest }) => (
    <UIComponent
      ingredient={{ name: 'Mozzarella' }}
      state={{ selected: false }}
      toggleSelect={toggleSelect}
      isSoldOut={false}
      {...rest}
    />
  )
}))

describe('ProductIngredient', () => {
  it('renders ingredient name', () => {
    const { getByText } = renderWithProviders(<ProductIngredient />)
    expect(getByText('Mozzarella')).toBeInTheDocument()
  })

  it('calls toggleSelect when clicked', () => {
    toggleSelect.mockClear()
    const { getByText } = renderWithProviders(<ProductIngredient />)
    fireEvent.click(getByText('Mozzarella'))
    expect(toggleSelect).toHaveBeenCalledTimes(1)
  })
})
