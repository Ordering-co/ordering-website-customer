import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { PlaceSpot } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~components/components/PlaceSpot', () => ({
  PlaceSpot: ({ UIComponent, ...rest }) => (
    <UIComponent
      cart={{
        delivery_type: 3,
        place: { place_group_id: 1, id: 1 },
        place_id: 1
      }}
      orderTypes={[{ id: 3, name: 'Eat in' }]}
      placesState={{
        loading: false,
        placeGroups: [{ id: 1, name: 'Tables', enabled: true }],
        places: [{ id: 1, name: 'Table 1', enabled: true, place_group_id: 1 }]
      }}
      spotNumber=''
      spotState={{}}
      isCheckout={false}
      vehicle=''
      isInputMode={false}
      onClose={vi.fn()}
      setSpotNumber={vi.fn()}
      setVehicle={vi.fn()}
      setSpotState={vi.fn()}
      handleChangeSpot={vi.fn()}
      setHasBusinessPlaces={vi.fn()}
      setPlaceSpotNumber={vi.fn()}
      {...rest}
    />
  )
}))

describe('PlaceSpot', () => {
  it('selects another table using the real Select and passes the complete place to the controller', async () => {
    const handleChangeSpot = vi.fn()
    const first = { id: 1, name: 'Table 1', enabled: true, place_group_id: 1 }
    const next = { id: 2, name: 'Table 2', enabled: true, place_group_id: 1 }
    const { getByRole, findByRole } = renderWithProviders(
      <PlaceSpot
        placesState={{ loading: false, placeGroups: [{ id: 1, name: 'Tables', enabled: true }], places: [first, next] }}
        handleChangeSpot={handleChangeSpot}
        isFetchOrder
      />
    )
    const field = getByRole('button', { name: 'Select your table' })
    expect(field).toHaveAccessibleDescription('Table 1')
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    fireEvent.click(await findByRole('option', { name: 'Table 2' }))
    expect(handleChangeSpot).toHaveBeenCalledExactlyOnceWith(next, true)
    expect(field).toHaveAccessibleDescription('Table 2')
    expect(field).toHaveFocus()
  })

  // implementation notesthe vehicle fields, the spot field and the buttons are base pieces of the theme in scope
  it('input mode: the fields and Update are pieces and keep their behavior (digits only, ref, keyup, update)', () => {
    const handleChangeSpot = vi.fn()
    const setVehicle = vi.fn()
    const setSpotNumber = vi.fn()
    const setPlaceSpotNumber = vi.fn()
    const vehicle = { model: 'Civic', car_registration: 'ABC', color: 'Red' }
    const { getByLabelText, getByText } = renderWithProviders(
      <PlaceSpot isInputMode cart={{ delivery_type: 4, place: {}, place_id: 1 }} vehicle={vehicle} spotNumber={5} handleChangeSpot={handleChangeSpot} setVehicle={setVehicle} setSpotNumber={setSpotNumber} setPlaceSpotNumber={setPlaceSpotNumber} />,
      { theme: themeWithValues() }
    )
    const model = getByLabelText('Model')
    expect(model).toHaveAttribute('data-slot', 'input')
    expect(model).toHaveAttribute('type', 'text')
    expect(model).toHaveValue('Civic')
    fireEvent.change(model, { target: { value: 'Golf' } })
    expect(setVehicle).toHaveBeenCalledWith({ ...vehicle, model: 'Golf' })

    const spot = getByLabelText('Spot number')
    expect(spot).toHaveAttribute('data-slot', 'input')
    expect(spot).toHaveAttribute('name', 'spot_number')
    // the ref reaches the <input>: the effect writes the spot number into it
    expect(spot).toHaveValue('5')
    // only digits get typed
    expect(fireEvent.keyPress(spot, { key: 'a', charCode: 97 })).toBe(false)
    expect(fireEvent.keyPress(spot, { key: '7', charCode: 55 })).toBe(true)
    // the hand-assigned onkeyup still reports the number
    spot.value = '12'
    fireEvent.keyUp(spot)
    expect(setSpotNumber).toHaveBeenCalledWith(12)
    expect(setPlaceSpotNumber).toHaveBeenCalledWith(12)

    const update = getByText('Update').closest('button')
    expect(update).toHaveAttribute('data-slot', 'button')
    expect(update).not.toBeDisabled()
    fireEvent.click(update)
    expect(handleChangeSpot).toHaveBeenCalledWith({ bodyToSend: { spot_number: 5, vehicle }, isCheckout: false })
  })

  it('Update stays disabled (and sends nothing) without a spot number or a whole vehicle', () => {
    const handleChangeSpot = vi.fn()
    const { getByText } = renderWithProviders(
      <PlaceSpot isInputMode cart={{ delivery_type: 4, place: {}, place_id: 1 }} vehicle={{ model: 'Civic', color: '' }} spotNumber={null} handleChangeSpot={handleChangeSpot} />,
      { theme: themeWithValues() }
    )
    const update = getByText('Update').closest('button')
    expect(update).toHaveAttribute('data-slot', 'button')
    expect(update).toBeDisabled()
    fireEvent.click(update)
    expect(handleChangeSpot).not.toHaveBeenCalled()
  })

  it('Continue is a full width piece that closes the modal', () => {
    const onClose = vi.fn()
    const { getByText } = renderWithProviders(<PlaceSpot onClose={onClose} />, { theme: themeWithValues() })
    const next = getByText('Continue').closest('button')
    expect(next).toHaveAttribute('data-slot', 'button')
    expect(next.className).toContain('ui:w-full')
    fireEvent.click(next)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
