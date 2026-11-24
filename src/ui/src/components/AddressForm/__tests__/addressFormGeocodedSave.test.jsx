import React from 'react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { resetGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { AddressForm } from '../index'

// implementation noteswith Google, editing the street after a place was picked (GPS) drops that place from
// the draft (location, map_data, zipcode: null) and the form geocodes the new text on save. The real
// controller (not mocked) merges `values` with the draft changes, so the nulls used to win over what
// Google had just resolved and the payload lost the coordinates. The test captures what reaches
// users().addresses().save.

const fixture = vi.hoisted(() => ({ save: null, addressesList: [] }))

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: (fn) => fn,
    formState: { errors: {} },
    errors: {},
    setValue: vi.fn(),
    watch: vi.fn(() => ({}))
  })
}))
vi.mock('~components/contexts/SessionContext', () => ({ useSession: () => [{ auth: true, user: { id: 41 }, token: 't' }, { refreshUserInfo: vi.fn() }] }))
vi.mock('~components/contexts/ConfigContext', () => ({ useConfig: () => [{ configs: {} }] }))
vi.mock('~components/contexts/ApiContext', () => ({ useApi: () => [{ users: () => ({ addresses: () => ({ save: fixture.save }) }) }] }))
vi.mock('~components/contexts/OrderContext', () => ({ useOrder: () => [{ options: { type: 1 } }, { changeAddress: vi.fn() }] }))
vi.mock('~components/contexts/CustomerContext', () => ({ useCustomer: () => [{}, { setUserCustomer: vi.fn() }] }))
vi.mock('~components/contexts/ValidationsFieldsContext', () => ({ useValidationFields: () => [{ loading: false, fields: {} }] }))
vi.mock('~components/contexts/ToastContext', () => ({ useToast: () => [{}, { showToast: vi.fn() }], ToastType: {} }))
vi.mock('~components/components/GoogleMaps', () => ({ GoogleMaps: () => <div /> }))
// Google's input: typing calls onChange; the GPS button hands over the place it found
vi.mock('~components/components/GoogleAutocompleteInput', () => ({
  AutocompleteInput: (props) => <input data-testid='google-autocomplete' id={props.id} placeholder={props.placeholder} onChange={props.onChange} />
}))
vi.mock('~ui/src/components/GoogleGpsButton', () => ({
  GoogleGpsButton: ({ onAddress }) => (
    <button
      type='button'
      onClick={() => onAddress({ address: 'GPS Street 1', location: { lat: 43.5, lng: -79.7 }, utc_offset: 0, map_data: { library: 'google', place_id: 'gps-place' }, zipcode: 'GPS 111' })}
    >
      GPS
    </button>
  )
}))
vi.mock('~ui/utils', async (importOriginal) => await importOriginal())

const GOOGLE_RESULT = {
  address_components: [{ types: ['postal_code'], short_name: 'A1B 2C3' }],
  geometry: { location: { lat: () => 44.2, lng: () => -79.1 } },
  place_id: 'new-place'
}

const theme = themeWithValues()
const render = (props = {}) => renderWithProviders(<AddressForm onCancel={vi.fn()} addressesList={fixture.addressesList} {...props} />, { theme })

// the person picks the GPS place, then edits the street and saves
const editStreetAndSave = async (view, text = '15 Other Street') => {
  fireEvent.click(view.getByText('GPS'))
  fireEvent.change(view.getByTestId('google-autocomplete'), { target: { value: text } })
  fireEvent.submit(view.getByTestId('google-autocomplete').closest('form'))
  await waitFor(() => expect(fixture.save).toHaveBeenCalledTimes(1))
  return fixture.save.mock.calls[0][0]
}

describe('AddressForm with Google: the geocoded place reaches the saved address', () => {
  const previousGoogle = window.google
  beforeEach(() => {
    resetGoogleMapsFailed()
    fixture.addressesList = []
    fixture.save = vi.fn().mockResolvedValue({ content: { error: false, result: { id: 99, address: '15 Other Street' } } })
    function Geocoder () {
      this.geocode = (_, callback) => callback([GOOGLE_RESULT], 'OK')
    }
    window.google = { maps: { Geocoder } }
  })
  afterEach(() => { window.google = previousGoogle })

  const expectGeocoded = (payload) => {
    expect(payload).toMatchObject({
      address: '15 Other Street',
      location: { lat: 44.2, lng: -79.1 },
      map_data: { library: 'google', place_id: 'new-place' },
      zipcode: 'A1B 2C3'
    })
    // nothing of the GPS place stays
    expect(JSON.stringify(payload)).not.toMatch(/43\.5|-79\.7|gps-place|GPS 111/)
  }

  it('create: the payload carries the street and the coordinates Google resolved for it', async () => {
    expectGeocoded(await editStreetAndSave(render()))
  })

  it('edit: the payload carries the street and the new coordinates, not the nulls of the dropped place', async () => {
    const view = render({ address: { id: 7, address: 'Old Street 9', location: { lat: 1, lng: 2 }, map_data: { library: 'google', place_id: 'old' } } })
    expectGeocoded(await editStreetAndSave(view))
  })

  it('what the person typed in other fields is kept over Google\'s value', async () => {
    const view = render()
    fireEvent.click(view.getByText('GPS'))
    fireEvent.change(view.getByTestId('google-autocomplete'), { target: { value: '15 Other Street' } })
    fireEvent.change(view.container.querySelector('.zipcode input'), { target: { name: 'zipcode', value: 'MINE 1' } })
    fireEvent.submit(view.getByTestId('google-autocomplete').closest('form'))
    await waitFor(() => expect(fixture.save).toHaveBeenCalledTimes(1))
    expect(fixture.save.mock.calls[0][0]).toMatchObject({ location: { lat: 44.2, lng: -79.1 }, zipcode: 'MINE 1' })
  })

  it('a second submit while the geocoded save is pending does not save twice', async () => {
    let finish
    fixture.save = vi.fn().mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const view = render()
    fireEvent.click(view.getByText('GPS'))
    fireEvent.change(view.getByTestId('google-autocomplete'), { target: { value: '15 Other Street' } })
    const form = view.getByTestId('google-autocomplete').closest('form')
    fireEvent.submit(form)
    fireEvent.submit(form)
    await waitFor(() => expect(fixture.save).toHaveBeenCalledTimes(1))
    finish({ content: { error: false, result: { id: 99 } } })
    expect(fixture.save).toHaveBeenCalledTimes(1)
  })
})
