import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { BusinessReservation } from '../index'

vi.mock('~ui/src/components/Cart', () => ({
  Cart: () => <div data-testid='cart' />
}))
vi.mock('~ui/src/components/UserDetails', () => ({
  UserDetails: () => <div data-testid='user-details' />
}))

vi.mock('~components/components/BusinessReservation', () => ({
  BusinessReservation: ({ UIComponent, ...rest }) => (
    <UIComponent
      business={businessFixture}
      cart={{ products: [] }}
      reservationState={{ changes: {} }}
      setReservationState={vi.fn()}
      datesList={['2026-07-15']}
      hoursList={[{ value: '12:00', text: '12:00' }]}
      reservationSetting={{
        min_guests_reservation: 2,
        max_guests_reservation: 4,
        allow_preorder_reservation: true,
        late_arrival_hold_minutes: 15
      }}
      handleAddReservation={vi.fn()}
      checkoutFieldsState={{ fields: [] }}
      isCheckout={false}
      isEnabled
      {...rest}
    />
  )
}))

describe('BusinessReservation', () => {
  it('renders the guests select of the theme', () => {
    const { container } = renderWithProviders(<BusinessReservation />)
    expect(container.querySelector('[data-slot=select-trigger]')).not.toBeNull()
  })
  it('gives the primary action full width through the Button piece', () => {
    const { getByRole } = renderWithProviders(<BusinessReservation />)
    expect(getByRole('button', { name: 'Place Table Reservation Now' }).classList.contains('ui:w-full')).toBe(true)
  })
})

const completeTheme = (showIndicator = true) => themeWithValues((values) => {
  values.components.choice.base.show_indicator = showIndicator
  values.components.choice.variants.default.states.selected = { background: '#FFEBE0', border: { width: 1, color: '#FF5500', style: 'solid' }, color: '#111111' }
  return values
})

describe('BusinessReservation ordering methods (complete theme)', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('are a single choice list: the selected one, its indicator, 10px apart', () => {
    const setOrderingMethod = vi.fn()
    const theme = completeTheme()
    const { getAllByRole } = renderWithProviders(
      <BusinessReservation orderingMethod={2} setOrderingMethod={setOrderingMethod} />,
      { theme }
    )
    // the ordering methods are the first radiogroup (the day strip is another, later one)
    const orderingMethods = getAllByRole('radiogroup')[0]
    const [table, preorder] = within(orderingMethods).getAllByRole('radio')
    expect(table).toHaveTextContent('Table reservation')
    expect(preorder).toHaveAttribute('aria-checked', 'true')
    expect(table).toHaveAttribute('aria-checked', 'false')
    expect(preorder).toHaveAttribute('data-slot', 'choice')
    expect(preorder.style.getPropertyValue('--ui-choice-selected-background')).toBe(theme.css.components.choice.variants.default.states.selected.background)
    expect(cssFor(orderingMethods)).toContain('gap:10px')
    expect(preorder.querySelectorAll('[data-slot=choice-indicator]')).toHaveLength(1)
    vi.stubGlobal('PointerEvent', MouseEvent)
    fireEvent.click(table)
    expect(setOrderingMethod).toHaveBeenCalledWith(1)
  })

  it('only the methods available for the cart; no indicator with show_indicator false', () => {
    const { getAllByRole } = renderWithProviders(
      <BusinessReservation orderingMethod={2} setOrderingMethod={vi.fn()} cart={{ products: [{ id: 1 }] }} />,
      { theme: completeTheme(false) }
    )
    const orderingMethods = within(getAllByRole('radiogroup')[0]).getAllByRole('radio')
    expect(orderingMethods).toHaveLength(1)
    expect(orderingMethods[0].querySelectorAll('[data-slot=choice-indicator]')).toHaveLength(0)
  })
})
