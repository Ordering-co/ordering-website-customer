import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { resetGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { renderToString } from 'react-dom/server'
import { ServerStyleSheet, ThemeProvider } from 'styled-components'
import { AddressForm } from '../index'
import { WrapperMap, FormActions, AddressFormContainer } from '../styles'
import { focusRingReach } from '../../../styles/Focus'

// implementation notesthe form's fields (the address of the Mapbox alternative, the number, the postal
// code, the notes) and its Cancel / Save are the design system's pieces. The Google field and its
// GPS button are the SDK's (they keep their own controls), as are the Mapbox suggestions.

const fixture = vi.hoisted(() => ({
  changes: {},
  loading: false,
  address: { address: '123 Main St', location: { lat: 1, lng: 2 } },
  configs: {},
  error: null,
  retrieveSuggestResult: null,
  actualSave: null
}))

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
vi.mock('~components/contexts/SessionContext', () => ({ useSession: () => [{ auth: true, user: {}, token: 't' }, {}] }))
vi.mock('~components/contexts/ConfigContext', () => ({ useConfig: () => [{ configs: fixture.configs }] }))
vi.mock('~components/components/GoogleAutocompleteInput', () => ({
  AutocompleteInput: (props) => <input data-testid='google-autocomplete' id={props.id} className={props.className} style={props.style} aria-invalid={props['aria-invalid']} placeholder={props.placeholder} autoComplete={props.autoComplete} enterKeyHint={props.enterKeyHint} />
}))
// the global rule of Google's list is a style sheet of its own: a marker stands for it here, and the real one is read below
vi.mock('../styles', async (importOriginal) => ({ ...(await importOriginal()), PlacesSuggestions: () => <i data-testid='places-suggestions' /> }))
vi.mock('~components/components/GoogleMaps', () => ({ GoogleMaps: () => <div /> }))
vi.mock('~ui/src/components/GoogleGpsButton', () => ({
  GoogleGpsButton: ({ IconButton, ...rest }) => (
    <button type='button'>
      GPS
      <span data-testid='gps-icon'><IconButton /></span>
      <span data-testid='gps-props'>{Object.keys(rest).join(',')}</span>
    </button>
  )
}))
vi.mock('~ui/utils', async (importOriginal) => await importOriginal())
vi.mock('~components/components/AddressForm', () => ({
  AddressForm: ({ UIComponent, ...rest }) => {
    const [changes, setChanges] = React.useState(fixture.changes)
    return (
      <UIComponent
        addressesList={[]}
        googleMapsControls={{}}
        formState={{ loading: fixture.loading, changes, error: fixture.error }}
        addressState={{ address: fixture.address, loading: false }}
        isRequiredField={() => false}
        showField={() => true}
        updateChanges={(fields) => setChanges(previous => ({ ...previous, ...fields }))}
        onCancel={vi.fn()}
        handleChangeInput={({ target }) => setChanges(previous => ({ ...previous, [target.name]: target.value }))}
        // the real controller sends what it is given with the changes over it
        saveAddress={(values) => fixture.actualSave?.({ ...values, ...changes })}
        setIsEdit={vi.fn()}
        getSuggestedResult={vi.fn()}
        mapBoxSuggests={[]}
        retrieveSuggestResult={fixture.retrieveSuggestResult ?? vi.fn()}
        {...rest}
      />
    )
  }
}))

const theme = themeWithValues()
const varOf = (el, name) => el.style.getPropertyValue(name)
const expectLook = (button, options) => {
  const vars = componentVars(theme, 'button', options)
  ;['--ui-button-height', '--ui-button-background', '--ui-button-border', '--ui-button-color'].forEach((name) => {
    expect(varOf(button, name)).toBe(vars[name] ?? '')
  })
}
const save = (container) => container.querySelector('[data-doc-control="address-save"]')
const render = (props = {}, options = {}) => renderWithProviders(<AddressForm onCancel={vi.fn()} {...props} />, { theme, ...options })

beforeEach(() => {
  resetGoogleMapsFailed()
  Object.assign(fixture, { changes: {}, loading: false, address: { id: 7, address: '123 Main St', location: { lat: 1, lng: 2 } }, configs: {}, error: null, retrieveSuggestResult: null, actualSave: null })
})

describe('AddressForm: the number, the postal code and the notes are the base Input and Textarea', () => {
  it('each is the piece, full width, with the props the legacy field had', () => {
    fixture.address = { ...fixture.address, internal_number: '4B', zipcode: '10001', address_notes: 'Ring twice' }
    const { getByPlaceholderText } = render()
    const number = getByPlaceholderText('APT / Suite')
    const zipcode = getByPlaceholderText('Postal Code')
    const notes = getByPlaceholderText('Address Notes')
    ;[number, zipcode].forEach((input) => {
      expect(input).toHaveAttribute('data-slot', 'input')
      expect(input).toHaveAttribute('maxlength', '30')
      expect(input.className).toContain('ui:w-full')
    })
    expect(number).toHaveValue('4B')
    expect(zipcode).toHaveValue('10001')
    expect(notes.tagName).toBe('TEXTAREA')
    expect(notes).toHaveAttribute('data-slot', 'textarea')
    expect(notes).toHaveAttribute('rows', '3')
    expect(notes).toHaveAttribute('maxlength', '250')
    expect(notes).toHaveValue('Ring twice')
    // none carries a message, so none is invalid
    ;[number, zipcode, notes].forEach((field) => expect(field).not.toHaveAttribute('aria-invalid'))
  })

  // implementation notesthe phone's keyboard offers to fill these in
  it('each says what it is to the keyboard (autocomplete) and what Enter does (enterkeyhint)', () => {
    const { getByPlaceholderText, getByTestId, container } = render()
    // a form set to off would stop Safari from filling any of its fields
    expect(container.querySelector('form')).not.toHaveAttribute('autocomplete')
    const number = getByPlaceholderText('APT / Suite')
    const zipcode = getByPlaceholderText('Postal Code')
    const notes = getByPlaceholderText('Address Notes')
    expect(number).toHaveAttribute('autocomplete', 'address-line2')
    expect(zipcode).toHaveAttribute('autocomplete', 'postal-code')
    // free text: no address fits it
    expect(notes).toHaveAttribute('autocomplete', 'off')
    // the postal code is not forced to numeric: some codes have letters
    ;[number, zipcode].forEach((input) => {
      expect(input).not.toHaveAttribute('inputmode')
      expect(input).toHaveAttribute('enterkeyhint', 'next')
    })
    // Google Places: its own suggestion list would sit under the browser's autofill list, so it stays off
    expect(getByTestId('google-autocomplete')).toHaveAttribute('autocomplete', 'new-password')
    expect(getByTestId('google-autocomplete')).toHaveAttribute('enterkeyhint', 'next')
  })

  it('the last field says done', () => {
    const { getByPlaceholderText } = render({ showField: (name) => name !== 'address_notes' })
    expect(getByPlaceholderText('Postal Code')).toHaveAttribute('enterkeyhint', 'done')
    expect(getByPlaceholderText('APT / Suite')).toHaveAttribute('enterkeyhint', 'next')
  })

  it('the field shows the changes', () => {
    fixture.changes = { zipcode: '99999' }
    const { getByPlaceholderText } = render()
    expect(getByPlaceholderText('Postal Code')).toHaveValue('99999')
  })

  it('no rule of the form targets the fields (they are not styled from outside)', () => {
    const { getByPlaceholderText, container } = render()
    const form = container.querySelector('form')
    const css = cssFor(form).replace(/\s+/g, '')
    expect(css).not.toMatch(/(^|[}\s,])input\{/)
    expect(css).not.toMatch(/(^|[}\s,])textarea\{/)
    // the layout is its cell's (the class of the field is the cell's)
    // (the field's own wrapper, the touch strip of the base Input, is not the cell)
    expect(getByPlaceholderText('Postal Code').closest('[data-slot=input-touch]').parentElement).toHaveClass('zipcode')
    expect(getByPlaceholderText('Postal Code').className).not.toContain('zipcode')
  })

  it('while it saves the form is locked: the fields are disabled', () => {
    fixture.loading = true
    const { getByPlaceholderText } = render()
    expect(getByPlaceholderText('Postal Code')).toBeDisabled()
    expect(getByPlaceholderText('Address Notes')).toBeDisabled()
  })

  it('with the labels above, each field is named by its label', () => {
    const labeled = themeWithValues((values) => { values.components.field.base.label_position = 'above'; return values })
    const { getByLabelText } = render({}, { theme: labeled })
    expect(getByLabelText('Postal Code')).toHaveAttribute('data-slot', 'input')
    expect(getByLabelText('Address Notes')).toHaveAttribute('data-slot', 'textarea')
  })
})

// implementation notesthe pin and the progress of the GPS button are Lucide strokes of the base Icon, not the legacy glyphs
describe('AddressForm: the GPS button\'s glyphs', () => {
  it('the pin is the map pin; the progress is the button\'s own loader, so the form passes no loading glyph', () => {
    const { getByTestId } = render()
    expect(getByTestId('gps-icon').querySelector('svg.lucide-map-pin')).not.toBeNull()
    expect(getByTestId('gps-props').textContent.split(',')).not.toContain('IconLoadingButton')
  })
})

// implementation notesthe form's map is a fluid box, the sticky bar's seal a multiple of the theme's space
describe('AddressForm: fluid layout', () => {
  it('the map is 2:1 of its width, 19dvh at most (170px at 390 and 1440 wide, measured)', () => {
    const { container } = renderWithProviders(<WrapperMap>map</WrapperMap>, { theme })
    const css = cssFor(container.firstChild).replace(/\s+/g, '')
    expect(css).toContain('aspect-ratio:2/1;max-height:19dvh;')
    expect(css).not.toContain('170px')
  })

  it('the seal under the sticky bar is four lg sizes of the theme', () => {
    const roomy = themeWithValues((values) => { values.tokens.space.lg = 20; return values })
    const { container } = renderWithProviders(<FormActions />, { theme: roomy })
    expect(cssFor(container.firstChild).replace(/\s+/g, '')).toContain('box-shadow:0calc(4*20px)00')
  })

  // implementation notesthe form clips its sides (overflow-x: clip), so the ring of the fields at its edges needs room
  it('leaves the focus ring of the fields room at its sides, as wide as the ring reaches', () => {
    const { container } = renderWithProviders(<AddressFormContainer />, { theme })
    const reach = focusRingReach(theme)
    expect(reach).toBeGreaterThan(0)
    const css = cssFor(container.firstChild).replace(/\s+/g, '')
    expect(css).toContain('overflow-x:clip')
    expect(css).toContain(`width:calc(100%+${2 * reach}px)`)
    expect(css).toContain(`margin-left:-${reach}px;margin-right:-${reach}px;padding-left:${reach}px;padding-right:${reach}px`)
  })
})

describe('AddressForm: the address field', () => {
  it('Google (the default): the SDK\'s input is the field of the theme (SdkField): the classes and variables of the piece, no class of its own', () => {
    const { getByTestId, container } = render()
    const input = getByTestId('google-autocomplete')
    expect(input.className).toContain('ui:h-(--ui-input-height)')
    expect(input.className).not.toContain('input-autocomplete')
    expect(input.style.getPropertyValue('--ui-input-height')).toBe(componentVars(theme, 'input', { variant: 'default', radius: 'md' })['--ui-input-height'])
    expect(input.closest('[data-slot="sdk-field"]')).not.toBeNull()
    // the suggestions of Google's list are the menu of the theme (a global rule)
    expect(getByTestId('places-suggestions')).toBeInTheDocument()
    expect(container.querySelector('[data-doc-control="address-search"]')).toContainElement(input)
  })

  it('the global rule of Google\'s list is the menu of the theme (placesSuggestionsCss)', async () => {
    const { PlacesSuggestions } = await vi.importActual('../styles')
    const sheet = new ServerStyleSheet()
    renderToString(sheet.collectStyles(<ThemeProvider theme={theme}><PlacesSuggestions /></ThemeProvider>))
    const css = sheet.getStyleTags()
    sheet.seal()
    expect(css).toMatch(/\.pac-container\{[^}]*overflow:\s?hidden !important;/)
    expect(css).toContain('.pac-item-selected')
  })

  describe('Mapbox (use_alternative_to_google_maps)', () => {
    beforeEach(() => { fixture.configs = { use_alternative_to_google_maps: { value: '1' } } })

    it('is the base Input with its current value, autocomplete and no GPS room', () => {
      fixture.changes = { address: '5 Oak Ave' }
      const { getByPlaceholderText, queryByText, queryByTestId, container } = render()
      const input = getByPlaceholderText('Address')
      expect(input).toHaveAttribute('data-slot', 'input')
      expect(input).toHaveValue('5 Oak Ave')
      // a mouse: the autofill popup would cover the suggestions below, so `off` (a standard value)
      expect(input).toHaveAttribute('autocomplete', 'off')
      expect(input).not.toHaveClass('input-autocomplete')
      expect(queryByText('GPS')).toBeNull()
      expect(queryByTestId('places-suggestions')).toBeNull()
      expect(cssFor(container.querySelector('[data-doc-control="address-search"]'))).not.toContain('padding-right')
    })

    // implementation noteson a phone the autofill sits in the keyboard bar and offers the saved address
    it('says it is an address (address-line1) on a touch screen, so the phone offers the saved one', () => {
      const original = window.matchMedia
      window.matchMedia = (query) => ({ matches: query === '(pointer: coarse)', media: query, addEventListener () {}, removeEventListener () {} })
      try {
        const { getByPlaceholderText } = render()
        expect(getByPlaceholderText('Address')).toHaveAttribute('autocomplete', 'address-line1')
      } finally {
        window.matchMedia = original
      }
    })

    it('keeps typing, picking and clearing the address in sync without a FieldControl warning', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const getSuggestedResult = vi.fn()
      const retrieveSuggestResult = vi.fn()
      try {
        const { getByPlaceholderText, getByText, queryByRole } = render({
          getSuggestedResult,
          mapBoxSuggests: [{ mapbox_id: 'm1', full_address: '5 Oak Ave, Town' }],
          retrieveSuggestResult
        })
        const input = getByPlaceholderText('Address')
        fireEvent.focus(input)
        fireEvent.change(input, { target: { value: '5 Oak' } })
        expect(input).toHaveValue('5 Oak')
        expect(getSuggestedResult).toHaveBeenLastCalledWith('5 Oak')
        fireEvent.click(getByText('5 Oak Ave, Town'))
        expect(retrieveSuggestResult).toHaveBeenCalledWith('m1', expect.any(Function))
        expect(input).toHaveValue('5 Oak Ave, Town')
        fireEvent.change(input, { target: { value: '' } })
        expect(input).toHaveValue('')
        expect(getSuggestedResult).toHaveBeenLastCalledWith('')
        expect(queryByRole('group', { name: 'Address suggestions' })).toBeNull()
        expect([...warn.mock.calls, ...error.mock.calls].flat().join('\n')).not.toMatch(/changing the (default )?value state of an (un)?controlled FieldControl/)
      } finally {
        warn.mockRestore()
        error.mockRestore()
      }
    })

    // implementation notes M3: the form keeps Enter in the field from submitting, but a suggestion is a button that Enter activates
    it('Enter on a suggestion is not cancelled, Enter in the field is; picking returns the focus to the field', () => {
      fixture.changes = { address: '5 Oak' }
      const { getByPlaceholderText, getByText, queryByText } = render({ mapBoxSuggests: [{ mapbox_id: 'm1', full_address: '5 Oak Ave, Town' }] })
      const input = getByPlaceholderText('Address')
      fireEvent.focus(input)
      expect(fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 })).toBe(false)
      const suggestion = getByText('5 Oak Ave, Town').closest('button')
      suggestion.focus()
      expect(fireEvent.keyDown(suggestion, { key: 'Enter', keyCode: 13 })).toBe(true)
      fireEvent.click(suggestion)
      expect(document.activeElement).toBe(input)
      expect(queryByText('5 Oak Ave, Town')).toBeNull()
    })
  })
})

describe('AddressForm: Cancel and Save are the base Button, side by side', () => {
  const noModalClose = ({ children }) => children

  it('Cancel is neutral outline md, type button, full width; Save is primary md, submit, full width', () => {
    const { container, getByRole } = render({}, { wrapper: noModalClose })
    const cancel = getByRole('button', { name: 'Cancel' })
    const submit = save(container)
    ;[cancel, submit].forEach((button) => {
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button.className).toContain('ui:w-full')
    })
    expect(cancel).toHaveAttribute('type', 'button')
    expectLook(cancel, { size: 'md', color: 'neutral', appearance: 'outline' })
    expect(submit).toHaveAttribute('type', 'submit')
    expect(submit).toHaveAttribute('id', 'submit-btn')
    expectLook(submit, { size: 'md', color: 'primary', appearance: 'solid' })
    // each in its own box of the row, not a rule over the buttons
    expect(cancel.parentElement.parentElement).toBe(submit.parentElement.parentElement)
    expect(cssFor(submit.parentElement)).toContain('flex:1 1 0')
    expect(cssFor(submit.parentElement.parentElement).replace(/\s+/g, '')).not.toContain('button{')
  })

  it('Save names what it misses (aria-describedby) and shows no loading until it saves', () => {
    fixture.address = { address: '' }
    fixture.changes = { tag: 'home' }
    const { container } = render()
    const submit = save(container)
    expect(submit).toBeDisabled()
    expect(document.getElementById(submit.getAttribute('aria-describedby'))).toHaveTextContent('Required')
    expect(submit).not.toHaveAttribute('aria-busy')
  })

  it('while it saves: busy, still named, the label stays', () => {
    fixture.loading = true
    fixture.changes = { address: '1 Elm St', location: { lat: 1, lng: 2 } }
    const { container } = render()
    expect(save(container)).toHaveAttribute('aria-busy', 'true')
    expect(save(container).querySelector('[data-slot="button-spinner"]')).not.toBeNull()
    expect(save(container)).toHaveAccessibleName('Update')
  })
})

// implementation notesa rejected save is told in the theme's words, never the API's own text
describe('AddressForm: the API rejects the save (422)', () => {
  beforeEach(() => { fixture.configs = { use_alternative_to_google_maps: { value: '1' } } })

  it('shows a translated message, not the raw diagnostic, and clears it when the form is edited', () => {
    fixture.error = ['RAW_QA_ADDRESS_BACKEND_DIAGNOSTIC_E143']
    const { getByPlaceholderText, queryByText, getByRole } = render()
    expect(queryByText(/RAW_QA_ADDRESS_BACKEND_DIAGNOSTIC_E143/)).toBeNull()
    expect(getByRole('alert')).toHaveTextContent('Please try again')
    fireEvent.change(getByPlaceholderText('Address Notes'), { target: { value: 'Ring twice' } })
    expect(queryByText('Please try again')).toBeNull()
  })

  it('a field the API names is told under that field, which is marked invalid and named by it', () => {
    fixture.error = { zipcode: ['The zipcode is invalid.'] }
    const { getByPlaceholderText, queryByRole, getByText } = render({ isRequiredField: (name) => name === 'zipcode' })
    const zipcode = getByPlaceholderText('Postal Code')
    const message = getByText('Check this field and try again.')
    expect(zipcode).toHaveAttribute('aria-invalid', 'true')
    expect(zipcode.getAttribute('aria-describedby')).toBe(message.id)
    expect(queryByRole('alert')).toBeNull()
    expect(getByPlaceholderText('APT / Suite')).not.toHaveAttribute('aria-invalid')
  })
})

// implementation notes"Use my current location" in the Mapbox field
describe('AddressForm: use my location (Mapbox)', () => {
  const FOUND = {
    properties: {
      mapbox_id: 'mb1',
      full_address: '3535 Odyssey Drive, Mississauga, Ontario L5M 7Z7, Canada',
      context: {
        postcode: { name: 'L5M 7Z7' },
        place: { name: 'Mississauga' },
        region: { name: 'Ontario', region_code: 'ON' },
        country: { name: 'Canada', country_code: 'CA' }
      }
    }
  }
  const geolocation = { getCurrentPosition: vi.fn() }
  const pressRow = (getByText) => fireEvent.click(getByText('Use my current location'))
  // what the browser says about the permission: 'prompt' until it is given
  const setPermission = (state) => Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: vi.fn(async () => ({ state })) } })

  beforeEach(() => {
    fixture.configs = { use_alternative_to_google_maps: { value: '1' }, map_box_token: { value: 'tk' } }
    fixture.address = {}
    geolocation.getCurrentPosition.mockReset()
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: geolocation })
    setPermission('prompt')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ features: [FOUND] }) })
  })
  afterEach(() => globalThis.fetch.mockRestore())

  it('focusing the empty field offers it, and the location is not asked until it is pressed', () => {
    const { getByPlaceholderText, queryByText, getByText } = render()
    expect(queryByText('Use my current location')).toBeNull()
    fireEvent.focus(getByPlaceholderText('Address'))
    expect(getByText('Use my current location')).toBeInTheDocument()
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
  })

  it('not granted yet: pressing asks, the address found waits for "Use this address" and then goes to the form with its coordinates', async () => {
    geolocation.getCurrentPosition.mockImplementation((ok) => ok({ coords: { latitude: 43.5, longitude: -79.7 } }))
    const updateChanges = vi.fn()
    const { getByPlaceholderText, getByText, queryByText } = render({ updateChanges })
    fireEvent.focus(getByPlaceholderText('Address'))
    pressRow(getByText)
    await waitFor(() => expect(getByText('We found this address')).toBeInTheDocument())
    expect(getByText(FOUND.properties.full_address)).toBeInTheDocument()
    expect(updateChanges).not.toHaveBeenCalled()
    fireEvent.click(getByText('Use this address'))
    expect(updateChanges).toHaveBeenCalledWith(expect.objectContaining({
      address: FOUND.properties.full_address,
      location: { lat: 43.5, lng: -79.7 },
      zipcode: 'L5M 7Z7'
    }))
    expect(globalThis.fetch.mock.calls[0][0]).toContain('latitude=43.5')
    expect(queryByText('We found this address')).toBeNull()
    // nothing saved by pressing it; the field is still the person's to edit
    expect(getByPlaceholderText('Address')).not.toBeDisabled()
  })

  it('"It\'s not correct" drops the address found and leaves the field to type in', async () => {
    geolocation.getCurrentPosition.mockImplementation((ok) => ok({ coords: { latitude: 43.5, longitude: -79.7 } }))
    const updateChanges = vi.fn()
    const { getByPlaceholderText, getByText, queryByText } = render({ updateChanges })
    fireEvent.focus(getByPlaceholderText('Address'))
    pressRow(getByText)
    await waitFor(() => expect(getByText('We found this address')).toBeInTheDocument())
    fireEvent.click(getByText('It\'s not correct'))
    expect(queryByText('We found this address')).toBeNull()
    expect(updateChanges).not.toHaveBeenCalled()
    expect(getByPlaceholderText('Address')).toHaveValue('')
  })

  // implementation notes
  it('already granted: the row shows the address it will use without asking, and pressing it applies that address', async () => {
    setPermission('granted')
    geolocation.getCurrentPosition.mockImplementation((ok) => ok({ coords: { latitude: 43.5, longitude: -79.7 } }))
    const updateChanges = vi.fn()
    const { getByPlaceholderText, getByText } = render({ updateChanges })
    await waitFor(() => expect(navigator.permissions.query).toHaveBeenCalledWith({ name: 'geolocation' }))
    // nothing is read from the device until the person opens the field
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
    fireEvent.focus(getByPlaceholderText('Address'))
    await waitFor(() => expect(getByText(FOUND.properties.full_address)).toBeInTheDocument())
    expect(getByText('Use my current location')).toBeInTheDocument()
    expect(updateChanges).not.toHaveBeenCalled()
    pressRow(getByText)
    expect(updateChanges).toHaveBeenCalledWith(expect.objectContaining({ address: FOUND.properties.full_address, location: { lat: 43.5, lng: -79.7 } }))
    // no confirmation step when the address was already shown
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('the permission is never asked just to show the row (not granted: no position read on focus)', async () => {
    const { getByPlaceholderText, getByText } = render()
    await waitFor(() => expect(navigator.permissions.query).toHaveBeenCalled())
    fireEvent.focus(getByPlaceholderText('Address'))
    expect(getByText('Use my current location')).toBeInTheDocument()
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('permission denied: says so, keeps the field to type in and the row to try again', async () => {
    geolocation.getCurrentPosition.mockImplementation((ok, fail) => fail({ code: 1 }))
    const { getByPlaceholderText, getByText, getByRole } = render()
    fireEvent.focus(getByPlaceholderText('Address'))
    pressRow(getByText)
    await waitFor(() => expect(getByRole('alert')).toHaveTextContent('Location access is blocked'))
    expect(getByPlaceholderText('Address')).not.toBeDisabled()
    fireEvent.change(getByPlaceholderText('Address'), { target: { value: '5 Oak' } })
    expect(getByPlaceholderText('Address')).toHaveValue('5 Oak')
  })

  it('no answer from the device, or no address there: a message, the manual entry stays', async () => {
    geolocation.getCurrentPosition.mockImplementation((ok, fail) => fail({ code: 3 }))
    const { getByPlaceholderText, getByText, getByRole } = render()
    fireEvent.focus(getByPlaceholderText('Address'))
    pressRow(getByText)
    await waitFor(() => expect(getByRole('alert')).toHaveTextContent('We couldn\'t get your location'))
    globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({ features: [] }) })
    geolocation.getCurrentPosition.mockImplementation((ok) => ok({ coords: { latitude: 1, longitude: 2 } }))
    pressRow(getByText)
    await waitFor(() => expect(getByRole('alert')).toHaveTextContent('Error, address not found'))
    expect(getByPlaceholderText('Address')).not.toBeDisabled()
  })

  // implementation notes / implementation notesthe text and the place the form saves are the same address; the GPS decides
  describe('the address typed or picked after the device\'s location', () => {
    const PICKED = { address: '9 Picked Road', location: { lat: 9, lng: 9 }, zipcode: 'P1P 1P1', map_data: { library: 'mapbox', place_id: 'mb9' } }
    const SUGGEST = { mapbox_id: 'mb9', full_address: PICKED.address }
    const GPS = { lat: 43.5, lng: -79.7 }
    const located = async (props) => {
      geolocation.getCurrentPosition.mockImplementation((ok) => ok({ coords: { latitude: GPS.lat, longitude: GPS.lng } }))
      fixture.actualSave = vi.fn()
      const view = render(props)
      const input = view.getByPlaceholderText('Address')
      fireEvent.focus(input)
      pressRow(view.getByText)
      await waitFor(() => expect(view.getByText('Use this address')).toBeInTheDocument())
      fireEvent.click(view.getByText('Use this address'))
      // the field holds the street line, its pieces are fields of their own
      await waitFor(() => expect(input).toHaveValue('3535 Odyssey Drive'))
      return { ...view, input }
    }
    const sent = (input) => {
      fireEvent.submit(input.closest('form'))
      return fixture.actualSave.mock.calls[0][0]
    }

    it('shows the pieces in fields of their own, with the country as a datum', async () => {
      const { getByPlaceholderText, getByText } = await located()
      expect(getByPlaceholderText('City')).toHaveValue('Mississauga')
      expect(getByPlaceholderText('State / Province')).toHaveValue('Ontario')
      expect(getByPlaceholderText('Postal Code')).toHaveValue('L5M 7Z7')
      expect(getByPlaceholderText('APT / Suite')).toHaveValue('')
      expect(getByText('Canada')).toBeInTheDocument()
      expect(getByText('Country')).toBeInTheDocument()
    })

    it('no pieces before an address is chosen', () => {
      const { queryByPlaceholderText } = render()
      expect(queryByPlaceholderText('City')).toBeNull()
      expect(queryByPlaceholderText('State / Province')).toBeNull()
    })

    it('correcting the street keeps the GPS point and details, and the address text is the corrected one', async () => {
      const { input, container } = await located()
      fireEvent.change(input, { target: { value: '3537 Odyssey Drive' } })
      expect(save(container)).toBeEnabled()
      expect(sent(input)).toMatchObject({
        address: '3537 Odyssey Drive, Mississauga, Ontario L5M 7Z7, Canada',
        location: GPS,
        zipcode: 'L5M 7Z7',
        city: 'Mississauga',
        map_data: { library: 'mapbox', place_id: 'mb1' },
        mapbox_id: 'mb1'
      })
    })

    it('correcting the postal code or the city keeps the GPS point and rewrites the address text', async () => {
      const { getByPlaceholderText, input, container } = await located()
      fireEvent.change(getByPlaceholderText('Postal Code'), { target: { value: 'L5M 7Z8' } })
      fireEvent.change(getByPlaceholderText('City'), { target: { value: 'Brampton' } })
      expect(save(container)).toBeEnabled()
      expect(sent(input)).toMatchObject({
        address: '3535 Odyssey Drive, Brampton, Ontario L5M 7Z8, Canada',
        location: GPS,
        zipcode: 'L5M 7Z8',
        city: 'Brampton',
        map_data: { library: 'mapbox', place_id: 'mb1' }
      })
    })

    it('emptying the street asks for it again: nothing is saved without an address', async () => {
      const { input, container } = await located()
      fireEvent.change(input, { target: { value: '' } })
      expect(save(container)).toBeDisabled()
    })

    it('with Google loaded the corrected text is not geocoded: the GPS point stays', async () => {
      const geocode = vi.fn()
      window.google = { maps: { Geocoder: function () { this.geocode = geocode } } }
      try {
        const { input } = await located()
        fireEvent.change(input, { target: { value: '15 Other Street' } })
        expect(sent(input)).toMatchObject({ location: GPS, address: '15 Other Street, Mississauga, Ontario L5M 7Z7, Canada' })
        expect(geocode).not.toHaveBeenCalled()
      } finally {
        delete window.google
      }
    })

    it('typing another street after a picked suggestion drops its place (only the GPS keeps its point)', async () => {
      fixture.retrieveSuggestResult = vi.fn((id, callback) => callback(PICKED))
      fixture.actualSave = vi.fn()
      const { getByPlaceholderText, queryByPlaceholderText, getByText, container } = render({ mapBoxSuggests: [SUGGEST] })
      const input = getByPlaceholderText('Address')
      fireEvent.change(input, { target: { value: '9 Pic' } })
      fireEvent.focus(input)
      fireEvent.click(getByText(PICKED.address))
      expect(save(container)).toBeEnabled()
      fireEvent.change(input, { target: { value: '15 Other Street' } })
      expect(save(container)).toBeDisabled()
      expect(getByText('The address needs a location, please select one of the suggested')).toBeInTheDocument()
      expect(queryByPlaceholderText('City')).toBeNull()
      fireEvent.submit(input.closest('form'))
      expect(fixture.actualSave).not.toHaveBeenCalled()
    })

    it('picking a suggestion after that saves its text with its own place', async () => {
      fixture.retrieveSuggestResult = vi.fn((id, callback) => callback(PICKED))
      const { input, container, getByText } = await located({ mapBoxSuggests: [SUGGEST] })
      fireEvent.change(input, { target: { value: '9 Pic' } })
      fireEvent.focus(input)
      fireEvent.click(getByText(PICKED.address))
      expect(save(container)).toBeEnabled()
      fireEvent.submit(input.closest('form'))
      const payload = fixture.actualSave.mock.calls[0][0]
      expect(payload).toMatchObject({ address: PICKED.address, location: PICKED.location, zipcode: PICKED.zipcode })
      expect(payload.map_data.place_id).toBe('mb9')
      expect(payload.location).not.toEqual(GPS)
    })

    it('a slow answer of the device does not overwrite what was typed after pressing it', async () => {
      let resolvePosition
      geolocation.getCurrentPosition.mockImplementation((ok) => { resolvePosition = ok })
      fixture.actualSave = vi.fn()
      const { getByPlaceholderText, getByText } = render()
      const input = getByPlaceholderText('Address')
      fireEvent.focus(input)
      pressRow(getByText)
      fireEvent.change(input, { target: { value: '15 Other Street' } })
      resolvePosition({ coords: { latitude: 43.5, longitude: -79.7 } })
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
      await new Promise((resolve) => setTimeout(resolve))
      expect(input).toHaveValue('15 Other Street')
      fireEvent.submit(input.closest('form'))
      expect(fixture.actualSave).not.toHaveBeenCalled()
    })

    it('nor does it overwrite a suggestion picked after pressing it', async () => {
      let resolvePosition
      geolocation.getCurrentPosition.mockImplementation((ok) => { resolvePosition = ok })
      fixture.retrieveSuggestResult = vi.fn((id, callback) => callback(PICKED))
      fixture.actualSave = vi.fn()
      const { getByPlaceholderText, getByText } = render({ mapBoxSuggests: [SUGGEST] })
      const input = getByPlaceholderText('Address')
      fireEvent.change(input, { target: { value: '9 Pic' } })
      fireEvent.focus(input)
      pressRow(getByText)
      fireEvent.click(getByText(PICKED.address))
      resolvePosition({ coords: { latitude: 43.5, longitude: -79.7 } })
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
      await new Promise((resolve) => setTimeout(resolve))
      expect(input).toHaveValue(PICKED.address)
      fireEvent.submit(input.closest('form'))
      expect(fixture.actualSave.mock.calls[0][0]).toMatchObject({ address: PICKED.address, location: PICKED.location })
    })

    it('changing only APT / Suite keeps the place', async () => {
      const { getByPlaceholderText, input, container } = await located()
      fireEvent.change(getByPlaceholderText('APT / Suite'), { target: { value: '12B' } })
      expect(save(container)).toBeEnabled()
      fireEvent.submit(input.closest('form'))
      expect(fixture.actualSave.mock.calls[0][0]).toMatchObject({
        address: FOUND.properties.full_address, location: { lat: 43.5, lng: -79.7 }, internal_number: '12B'
      })
    })
  })

  it('no row without the token, the theme\'s pin button or a browser location', () => {
    fixture.configs = { use_alternative_to_google_maps: { value: '1' } }
    const withoutToken = render()
    fireEvent.focus(withoutToken.getByPlaceholderText('Address'))
    expect(withoutToken.queryByText('Use my current location')).toBeNull()
    withoutToken.unmount()
    fixture.configs = { use_alternative_to_google_maps: { value: '1' }, map_box_token: { value: 'tk' } }
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
    const withoutBrowser = render()
    fireEvent.focus(withoutBrowser.getByPlaceholderText('Address'))
    expect(withoutBrowser.queryByText('Use my current location')).toBeNull()
  })
})
