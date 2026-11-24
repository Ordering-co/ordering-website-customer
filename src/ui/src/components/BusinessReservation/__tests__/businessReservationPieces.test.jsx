import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { BusinessReservation } from '../index'

// implementation notes"Place Table Reservation Now" is the design system's Button (primary solid md);
// a reservation in flight is `loading`.

const state = vi.hoisted(() => ({ loading: false, add: null }))
vi.mock('~ui/src/components/Cart', () => ({ Cart: () => null }))
vi.mock('~ui/src/components/UserDetails', () => ({ UserDetails: () => null }))
// a time picked stands for the day and time steps
vi.mock('~ui/src/components/PreorderDateTimeSteps', () => ({
  PreorderDateTimeSteps: ({ handleChangeTime }) => <button type='button' onClick={() => handleChangeTime('12:00')}>pick 12:00</button>
}))
vi.mock('~components/components/BusinessReservation', () => ({
  BusinessReservation: ({ UIComponent, ...rest }) => (
    <UIComponent
      business={businessFixture}
      cart={{ products: [] }}
      reservationState={{ changes: { guests_reservation: 2 }, loading: state.loading }}
      setReservationState={vi.fn()}
      reservationSetting={{ min_guests_reservation: 2, max_guests_reservation: 4, allow_preorder_reservation: true }}
      handleAddReservation={state.add}
      checkoutFieldsState={{ fields: [] }}
      isCheckout={false}
      {...rest}
    />
  )
}))

const theme = themeWithValues()
const render = () => {
  const view = renderWithProviders(<BusinessReservation orderingMethod={1} setOrderingMethod={vi.fn()} />, { theme })
  return { view, place: () => view.getByRole('button', { name: 'Place Table Reservation Now' }) }
}

beforeEach(() => {
  state.loading = false
  state.add = vi.fn(async () => null)
})

describe('BusinessReservation: "Place Table Reservation Now" is the base Button', () => {
  it('primary solid md; disabled until a time is picked, then it reserves', () => {
    const { view, place } = render()
    expect(place()).toHaveAttribute('data-slot', 'button')
    expect(place().style.getPropertyValue('--ui-button-background')).toBe(componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'solid' })['--ui-button-background'])
    expect(place()).toBeDisabled()
    fireEvent.click(view.getByRole('button', { name: 'pick 12:00' }))
    expect(place()).toBeEnabled()
    expect(place()).not.toHaveAttribute('aria-busy')
    fireEvent.click(place())
    expect(state.add).toHaveBeenCalledTimes(1)
  })

  it('while the reservation is sent: loading (aria-busy, spinner), no click', () => {
    state.loading = true
    const { view, place } = render()
    fireEvent.click(view.getByRole('button', { name: 'pick 12:00' }))
    expect(place()).toHaveAttribute('aria-busy', 'true')
    expect(place().querySelector('[data-slot="button-spinner"]')).not.toBeNull()
    fireEvent.click(place())
    expect(state.add).not.toHaveBeenCalled()
  })
})
