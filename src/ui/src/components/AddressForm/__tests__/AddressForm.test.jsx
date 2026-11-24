import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { resetGoogleMapsFailed } from '~ui/hooks/useGoogleMapsFailed'
import { createLanguageWrapper } from '../../../../../__tests__/helpers/languageTestUtils'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { ModalTitleContext } from '../../Overlay/ModalHeading'
import { AddressForm, getSubmitState } from '../index'
import { FormActions, FormControl } from '../styles'
import { ADDRESS_TAG_ICONS } from '../../SavedAddressItem/tags'
import { Icon } from '~ui/src/design-system/components/Icon'

const addressFixture = vi.hoisted(() => ({
  id: 1,
  address: '123 Main St',
  location: { lat: 40.7, lng: -74.0 }
}))

const formStateFixture = vi.hoisted(() => ({
  loading: false,
  changes: {}
}))

// What the mocked controller and contexts hand the UI, per test
const controllerFixture = vi.hoisted(() => ({
  address: null,
  isRequiredField: () => false,
  auth: false,
  configs: {}
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
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: controllerFixture.auth, user: {}, token: 'test-token' }, {}]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: controllerFixture.configs }]
}))
vi.mock('~components/components/GoogleAutocompleteInput', () => ({
  AutocompleteInput: (props) => <input data-testid='google-autocomplete' id={props.id} className={props.className} style={props.style} placeholder={props.placeholder} />
}))
vi.mock('~components/components/GoogleMaps', () => ({
  GoogleMaps: () => <div data-testid='google-maps' />
}))
vi.mock('~ui/src/components/GoogleGpsButton', () => ({
  GoogleGpsButton: () => <button type='button'>GPS</button>
}))
// the real getGoogleMapImage builds the Mapbox failover's URL (implementation notes
// follow-up); Confirm's getTraduction (used by the save alert) stays real too
vi.mock('~ui/utils', async (importOriginal) => await importOriginal())

vi.mock('~components/components/AddressForm', () => ({
  AddressForm: ({ UIComponent, ...rest }) => (
    <UIComponent
      addressesList={[]}
      googleMapsControls={{ center: { lat: 0, lng: 0 }, zoom: 15 }}
      formState={formStateFixture}
      addressState={{ address: controllerFixture.address ?? addressFixture, loading: false }}
      isRequiredField={controllerFixture.isRequiredField}
      showField={() => true}
      updateChanges={vi.fn()}
      onCancel={vi.fn()}
      handleChangeInput={vi.fn()}
      saveAddress={vi.fn()}
      setIsEdit={vi.fn()}
      getSuggestedResult={vi.fn()}
      mapBoxSuggests={[]}
      retrieveSuggestResult={vi.fn()}
      {...rest}
    />
  )
}))

// A modal that shows its close provides its title context
const InModalWithClose = ({ children }) => (
  <ModalTitleContext.Provider value={{ register: () => 1, unregister: () => {} }}>
    {children}
  </ModalTitleContext.Provider>
)

const setup = ({ changes = {}, loading = false, address = null, auth = false, configs = {}, isRequiredField = () => false } = {}) => {
  formStateFixture.changes = changes
  formStateFixture.loading = loading
  controllerFixture.address = address
  controllerFixture.auth = auth
  controllerFixture.configs = configs
  controllerFixture.isRequiredField = isRequiredField
}

const newAddress = { address: '' }
const picked = { address: '1 Elm St', location: { lat: 1, lng: 2 } }
const saveButton = (container) => container.querySelector('[data-doc-control="address-save"]')
const saveHint = (container) => container.querySelector('[data-doc-control="address-save-hint"]')
// The lines of the save's helper text
const hintLines = (container) => [...saveHint(container).querySelectorAll('span')].map((line) => line.textContent)
// The names the inputs show (the helper text names the fields alike)
const addressLabel = (container) => container.querySelector('[data-testid="google-autocomplete"]').placeholder
const zipcodeLabel = (container) => container.querySelector('.zipcode input').placeholder
const zipcodeRequired = (name) => name === 'zipcode'
const locationRequired = { google_autocomplete_selection_required: { value: '1' } }

// every render calls useGoogleMapsFailed; without a key (most of this
// file's tests) it fails the shared module state, so each test starts clean
beforeEach(() => resetGoogleMapsFailed())

describe('AddressForm', () => {
  beforeEach(() => setup())

  it.each([
    ['es', 'Inicio', 'Casa'],
    ['bg', 'Начало', 'Дом']
  ])('translates the address label independently and keeps its home tag in %s', async (code, nav, address) => {
    const handleChangeInput = vi.fn()
    const dictionary = { WEBSITE_HOME: nav, WEBSITE_ADDRESS_HOME: address }
    const { findByRole, queryByText, rerender } = renderWithProviders(
      <AddressForm handleChangeInput={handleChangeInput} />,
      { wrapper: createLanguageWrapper(dictionary, code) }
    )
    const button = await findByRole('button', { name: address })
    fireEvent.click(button)
    expect(handleChangeInput).toHaveBeenCalledWith({ target: { name: 'tag', value: 'home' } })
    expect(button).toHaveClass('active')
    dictionary.WEBSITE_HOME = 'Custom navigation label'
    rerender(<AddressForm handleChangeInput={handleChangeInput} />)
    expect(await findByRole('button', { name: address })).toHaveClass('active')
    expect(queryByText('Custom navigation label')).not.toBeInTheDocument()
  })

  it('uses an address fallback when only the legacy navigation key exists', async () => {
    const { findByRole, queryByText } = renderWithProviders(<AddressForm />, {
      wrapper: createLanguageWrapper({ WEBSITE_HOME: 'Inicio', WEBSITE_OFFICE: 'Oficina' }, 'es')
    })
    expect(await findByRole('button', { name: 'Oficina' })).toBeInTheDocument()
    expect(await findByRole('button', { name: 'Home' })).toBeInTheDocument()
    expect(queryByText('Inicio')).not.toBeInTheDocument()
  })

  it('renders address form fields', () => {
    const { getByTestId } = renderWithProviders(<AddressForm />)
    expect(getByTestId('google-autocomplete')).toBeInTheDocument()
  })

  it('each tag button shows the tag\'s icon of the shared mapping (the saved address items\')', () => {
    const { getByText } = renderWithProviders(<AddressForm />)
    const tags = { home: 'Home', office: 'Office', other: 'Other' }
    Object.entries(tags).forEach(([tag, label]) => {
      const chip = getByText(label).closest('button')
      const expected = renderWith(themeWithValues(), <Icon name={ADDRESS_TAG_ICONS[tag]} />).container.querySelector('svg')
      expect(chip.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
      expect(chip.querySelector('svg').innerHTML).toBe(expected.innerHTML)
      // its full label stays available as the title when "…" cuts it
      expect(chip).toHaveAttribute('title', label)
    })
  })

  it('offers exactly Home, Office and Other (no Favorite)', () => {
    const { getByText, queryByText } = renderWithProviders(<AddressForm />)
    const chips = getByText('Address labels').parentElement.nextElementSibling.querySelectorAll('button')
    expect([...chips].map((chip) => chip.textContent)).toEqual(['Home', 'Office', 'Other'])
    expect(queryByText('Favorite')).toBeNull()
  })

  it('an address saved with the favorite tag is edited as Other, without rewriting it', () => {
    const handleChangeInput = vi.fn()
    setup({ address: { ...addressFixture, tag: 'favorite' } })
    const { getByRole } = renderWithProviders(<AddressForm handleChangeInput={handleChangeInput} />)
    expect(getByRole('button', { name: 'Other' })).toHaveAttribute('aria-pressed', 'true')
    expect(getByRole('button', { name: 'Home' })).toHaveAttribute('aria-pressed', 'false')
    expect(handleChangeInput).not.toHaveBeenCalled()
  })

  describe('save and cancel', () => {
    const theme = themeWithValues()
    const renderThemed = (props = {}, wrapper = InModalWithClose) =>
      renderWithProviders(<AddressForm onCancel={vi.fn()} {...props} />, { theme, wrapper })

    it('has no Cancel inside a modal with its own close', () => {
      setup({ address: newAddress, auth: true })
      const { queryByText } = renderThemed()
      expect(queryByText('Cancel')).toBeNull()
    })

    it('keeps Cancel next to the save where there is no modal close', () => {
      setup({ address: newAddress, auth: true })
      const { container, queryByText } = renderThemed({}, null)
      expect(queryByText('Cancel')).toBeInTheDocument()
      expect(saveButton(container)).toBeInTheDocument()
    })

    it('shows Add address disabled with an empty form', () => {
      setup({ address: newAddress, auth: true })
      const { container } = renderThemed()
      const save = saveButton(container)
      expect(save).toHaveTextContent('Add address')
      expect(save).toBeDisabled()
    })

    it('enables Add address once an address with its location is picked', () => {
      setup({ address: newAddress, auth: true, changes: picked })
      const { container } = renderThemed()
      expect(saveButton(container)).toBeEnabled()
    })

    it('stays disabled while a required field is empty, enabled once filled', () => {
      const isRequiredField = (name) => name === 'zipcode'
      setup({ address: newAddress, auth: true, changes: picked, isRequiredField })
      const { container, unmount } = renderThemed()
      expect(saveButton(container)).toBeDisabled()
      unmount()

      setup({ address: newAddress, auth: true, changes: { ...picked, zipcode: '10001' }, isRequiredField })
      const { container: filled } = renderThemed()
      expect(saveButton(filled)).toBeEnabled()
    })

    it('needs a picked location when the config requires one', () => {
      const configs = { google_autocomplete_selection_required: { value: '1' } }
      setup({ address: newAddress, auth: true, changes: { address: '1 Elm St' }, configs })
      const { container, unmount } = renderThemed()
      expect(saveButton(container)).toBeDisabled()
      unmount()

      // without the requirement a typed address is geocoded on submit
      setup({ address: newAddress, auth: true, changes: { address: '1 Elm St' } })
      const { container: geocoded } = renderThemed()
      expect(saveButton(geocoded)).toBeEnabled()
    })

    it('editing: enabled on a change that keeps the address, disabled when it is cleared', () => {
      setup({ changes: { address_notes: 'Ring twice' }, auth: true })
      const { container, unmount } = renderThemed()
      expect(saveButton(container)).toHaveTextContent('Update')
      expect(saveButton(container)).toBeEnabled()
      unmount()

      setup({ changes: { address: '' }, auth: true })
      const { container: cleared } = renderThemed()
      expect(saveButton(cleared)).toBeDisabled()
    })

    it('a guest created on save sends only the changes, so it needs a typed address', () => {
      const orderAddress = { address: '9 Oak Ave', location: { lat: 1, lng: 1 } }
      setup({ address: orderAddress, changes: { address_notes: 'Gate B' } })
      const { container, unmount } = renderThemed({ createGuestOnSave: true })
      expect(saveButton(container)).toBeDisabled()
      unmount()

      // a guest without guest creation merges the changes into its order address
      const { container: merged } = renderThemed()
      expect(saveButton(merged)).toBeEnabled()
    })

    it('is disabled while saving', () => {
      setup({ address: newAddress, auth: true, changes: picked, loading: true })
      const { container } = renderThemed()
      const save = saveButton(container)
      expect(save).toBeDisabled()
      // busy on the piece, its label stays (no "Loading" text)
      expect(save).toHaveAttribute('aria-busy', 'true')
      expect(save).toHaveTextContent('Add address')
    })
  })

  describe('what the disabled save misses', () => {
    const theme = themeWithValues()
    const renderThemed = (props = {}) =>
      renderWithProviders(<AddressForm onCancel={vi.fn()} {...props} />, { theme, wrapper: InModalWithClose })

    it('names an empty address', () => {
      setup({ address: newAddress, auth: true, changes: { tag: 'home' } })
      const { container } = renderThemed()
      expect(saveButton(container)).toBeDisabled()
      expect(hintLines(container)).toEqual([`Required: ${addressLabel(container)}`])
    })

    it('names the empty required fields after the address, by their inputs\' names', () => {
      setup({ address: newAddress, auth: true, changes: { tag: 'home' }, isRequiredField: zipcodeRequired })
      const { container } = renderThemed()
      expect(hintLines(container)).toEqual([`Required: ${addressLabel(container)}, ${zipcodeLabel(container)}`])
    })

    it('a required address is named once', () => {
      setup({ address: newAddress, auth: true, changes: { tag: 'home' }, isRequiredField: (name) => name === 'address' })
      const { container } = renderThemed()
      expect(hintLines(container)).toEqual([`Required: ${addressLabel(container)}`])
    })

    it('gives the location message when the config requires picking a suggestion', () => {
      setup({ address: newAddress, auth: true, changes: { address: '1 Elm St' }, configs: locationRequired, isRequiredField: zipcodeRequired })
      const { container } = renderThemed()
      expect(saveButton(container)).toBeDisabled()
      expect(hintLines(container)).toEqual([
        `Required: ${zipcodeLabel(container)}`,
        'The address needs a location, please select one of the suggested'
      ])
    })

    it('the save is described by it', () => {
      setup({ address: newAddress, auth: true, changes: picked, isRequiredField: zipcodeRequired })
      const { container } = renderThemed()
      const hint = saveHint(container)
      expect(hint.id).toBeTruthy()
      expect(saveButton(container)).toHaveAttribute('aria-describedby', hint.id)
    })

    it('none when the save goes through, while it is locked, or on an untouched form', () => {
      const cases = [
        { address: newAddress, auth: true, changes: picked },
        { address: newAddress, auth: true, changes: { tag: 'home' }, loading: true },
        { address: newAddress, auth: true, isRequiredField: zipcodeRequired },
        { auth: true, isRequiredField: zipcodeRequired }
      ]
      cases.forEach((state) => {
        setup(state)
        const { container, unmount } = renderThemed()
        expect(saveHint(container)).toBeNull()
        expect(saveButton(container)).not.toHaveAttribute('aria-describedby')
        unmount()
      })
    })

    it('lists exactly what keeps the save disabled (getSubmitState)', () => {
      const base = {
        savedAddress: { address: '' },
        keepsSavedAddress: false,
        isLocationRequired: false,
        isRequiredField: () => false,
        showField: () => true,
        isLocked: false
      }
      expect(getSubmitState({ ...base, changes: {} })).toEqual({ canSubmit: false, missing: ['address'] })
      expect(getSubmitState({ ...base, changes: picked })).toEqual({ canSubmit: true, missing: [] })
      expect(getSubmitState({ ...base, changes: picked, isRequiredField: (name) => name !== 'address_notes' }))
        .toEqual({ canSubmit: false, missing: ['internal_number', 'zipcode'] })
      // a hidden field is not required
      expect(getSubmitState({ ...base, changes: picked, isRequiredField: zipcodeRequired, showField: (name) => name !== 'zipcode' }))
        .toEqual({ canSubmit: true, missing: [] })
      expect(getSubmitState({ ...base, changes: { address: '1 Elm St' }, isLocationRequired: true }))
        .toEqual({ canSubmit: false, missing: ['location'] })
      // an edit keeps its saved address
      expect(getSubmitState({ ...base, savedAddress: { address: '9 Oak Ave' }, keepsSavedAddress: true, changes: { tag: 'home' } }))
        .toEqual({ canSubmit: true, missing: [] })
      // locked: nothing missing, still not submittable
      expect(getSubmitState({ ...base, changes: picked, isLocked: true })).toEqual({ canSubmit: false, missing: [] })
    })
  })

  describe('visibility', () => {
    it('hides the fields and the tags the theme turns off (address.*)', () => {
      const theme = themeWithValues((values) => {
        values.visibility['address.zipcode'] = false
        values.visibility['address.notes'] = false
        values.visibility['address.icons'] = false
        return values
      })
      const { container, queryByText } = renderWithProviders(<AddressForm />, { theme })
      expect(container.querySelector('.zipcode input')).toBeNull()
      expect(container.querySelector('textarea')).toBeNull()
      expect(container.querySelector('.internal_number input')).not.toBeNull()
      expect(queryByText('Home')).toBeNull()
    })

    it('a required field shows although the theme hides it', () => {
      setup({ isRequiredField: zipcodeRequired })
      const theme = themeWithValues((values) => {
        values.visibility['address.zipcode'] = false
        return values
      })
      const { container } = renderWithProviders(<AddressForm />, { theme })
      expect(container.querySelector('.zipcode input')).not.toBeNull()
    })
  })

  describe('labels above the fields (field.base.label_position)', () => {
    const fields = (container) => Array.from(container.querySelectorAll('form input:not([type="hidden"]), form textarea'))
      .filter((field) => !field.closest('button'))
    const labelOf = (container, field) => field.id ? container.querySelector(`label[for="${field.id}"]`) : null

    it('above: the address, each field and the notes have their label, tied by id', () => {
      const theme = themeWithValues((values) => {
        values.components.field.base.label_position = 'above'
        return values
      })
      const { container, getByTestId } = renderWithProviders(<AddressForm />, { theme })
      expect(labelOf(container, getByTestId('google-autocomplete'))).toHaveTextContent('Address')
      const all = fields(container)
      expect(all.length).toBeGreaterThan(1)
      all.forEach((field) => expect(labelOf(container, field)).not.toBeNull())
    })

    it('by default (placeholder): no labels over the fields', () => {
      const { container } = renderWithProviders(<AddressForm />, { theme: themeWithValues() })
      fields(container).forEach((field) => expect(labelOf(container, field)).toBeNull())
    })
  })
})

describe('AddressForm styles', () => {
  it('the form writes no rule over the address input: the placeholder, the box and the focus are the field\'s (SdkField)', () => {
    const { getByTestId } = renderWith(themeWithValues(), <FormControl data-testid='form'><input /></FormControl>)
    const css = cssFor(getByTestId('form')).replace(/\s+/g, '')
    expect(css).not.toContain('placeholder')
    expect(css).not.toContain('input-autocomplete')
  })

  it('the pinned actions are of the window\'s surface', () => {
    const theme = themeWithValues((values) => {
      values.tokens.color.background = '#FAFAFA'
      values.tokens.color.surface = '#111111'
      return values
    })
    const css = cssFor(renderWith(theme, <FormActions data-testid='actions' />).getByTestId('actions'))
    expect(css).toContain('background-color:#111111;')
    expect(css.replace(/\s+/g, '')).toContain('box-shadow:0calc(4*16px)00#111111;')
  })
})

// visibility.address.gps_button: the button that finds the user's location
describe('AddressForm: visibility address.gps_button', () => {
  beforeEach(() => setup())
  const search = (container) => container.querySelector('[data-doc-control="address-search"]')

  it('reserves room for the theme’s wide GPS button, its inset and the touch floor', () => {
    const theme = themeWithValues((values) => {
      values.components.button.sizes.md.height = 56
      return values
    })
    const { getByText, getByTestId, container } = renderWithProviders(<AddressForm />, { theme })
    expect(getByText('GPS')).toBeInTheDocument()
    const styles = cssFor(search(container)).replace(/\s+/g, '')
    expect(styles).toContain('--gps-button-width:56px')
    expect(styles).toContain('--gps-touch-floor:44px')
    // the room is the input's own style, read from those variables: no rule of the container reaches the input
    expect(styles).not.toContain('input')
    expect(getByTestId('google-autocomplete').style.paddingInlineEnd).toBe('calc(max(var(--gps-touch-floor), var(--gps-button-width)) + var(--gps-field-inset))')
  })

  it('the theme hides it, and the room it took in the input', () => {
    const theme = themeWithValues((values) => { values.visibility['address.gps_button'] = false; return values })
    const { queryByText, getByTestId, container } = renderWithProviders(<AddressForm />, { theme })
    expect(queryByText('GPS')).toBeNull()
    expect(getByTestId('google-autocomplete')).toBeInTheDocument()
    expect(cssFor(search(container)).replace(/\s+/g, '')).not.toContain('--gps-button-width')
    expect(getByTestId('google-autocomplete').style.paddingInlineEnd).toBe('')
  })
})

// The pin's Google JS map -> Mapbox static map failover (implementation notes follow-up).
// auth: true keeps the edit flow (addressFixture's location); a guest
// (auth: false) resets locationChange from formState/orderState instead, a
// separate, pre-existing branch this failover does not touch.
describe('AddressForm: map -> Mapbox static map failover', () => {
  it('Google available draws the interactive pin', () => {
    setup({ auth: true, configs: { google_maps_api_key: { value: 'test-google-key' }, map_box_token: { value: 'pk.test-token' } } })
    const { getByTestId, container } = renderWithProviders(<AddressForm />)
    expect(getByTestId('google-maps')).toBeInTheDocument()
    expect(container.querySelector('img[alt="Location map"]')).toBeNull()
  })

  it('without a Google key, a still Mapbox shot of the same point replaces it', () => {
    setup({ auth: true, configs: { map_box_token: { value: 'pk.test-token' } } })
    const { queryByTestId, container } = renderWithProviders(<AddressForm />)
    expect(queryByTestId('google-maps')).toBeNull()
    const img = container.querySelector('img[alt="Location map"]')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toContain('api.mapbox.com')
  })

  it('without a Google key or a Mapbox token, no map renders', () => {
    setup({ auth: true, configs: {} })
    const { queryByTestId, container } = renderWithProviders(<AddressForm />)
    expect(queryByTestId('google-maps')).toBeNull()
    expect(container.querySelector('img[alt="Location map"]')).toBeNull()
  })

  it('use_alternative_to_google_maps=1 stays hidden, same as today, even with a Mapbox token', () => {
    setup({ auth: true, configs: { use_alternative_to_google_maps: { value: '1' }, map_box_token: { value: 'pk.test-token' } } })
    const { queryByTestId, container } = renderWithProviders(<AddressForm />)
    expect(queryByTestId('google-maps')).toBeNull()
    expect(container.querySelector('img[alt="Location map"]')).toBeNull()
  })
})
