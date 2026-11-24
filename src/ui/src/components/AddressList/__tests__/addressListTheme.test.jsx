import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { AddressListContainer } from '../styles'
import { AddressList } from '../index'
import { DialogOverlay } from '../../Overlay/overlays'
import { ModalTitleContext } from '../../Overlay/ModalHeading'
import { ADDRESS_TAG_ICONS } from '../../SavedAddressItem/tags'
import { Icon } from '../../../design-system/components/Icon'

// The tag icon is the base Icon: find it by the class of its glyph, decorative.
const tagIcon = (name) => {
  const { container, unmount } = render(<Icon name={name} />)
  const cls = container.querySelector('svg').getAttribute('class').split(' ').find(c => c.startsWith('lucide-'))
  unmount()
  return `svg.${cls}[aria-hidden="true"]`
}

const handleSetDefault = vi.fn()
const handleDelete = vi.fn()

const HOME = { id: 1, address: '123 Main St', tag: 'home', location: { lat: 1, lng: 1 } }
const OFFICE = { id: 2, address: '9 Elm Rd', tag: 'office', default: true, location: { lat: 2, lng: 2 } }

// The order's address (the selected item)
const order = vi.hoisted(() => ({ address: {} }))
// The controller's saved addresses, when a test gives its own
const saved = vi.hoisted(() => ({ addresses: null }))

// (data-modal-close: the form hides its own close in a modal with one, AddressForm:475)
vi.mock('~ui/src/components/AddressForm', () => ({
  AddressForm: () => <div data-testid='address-form' data-modal-close={String(!!React.useContext(ModalTitleContext))} />
}))
vi.mock('~ui/src/components/NotFoundSource', () => ({
  NotFoundSource: ({ image }) => <div data-testid='not-found' data-image={image || ''} />
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [
    { options: { type: 1, address: order.address }, loading: false, carts: {} },
    { refreshOrderOptions: vi.fn() }
  ]
}))
vi.mock('~components/components/AddressList', () => ({
  AddressList: ({ UIComponent, ...rest }) => (
    <UIComponent
      actionStatus={{ loading: false, error: null }}
      addressList={{
        loading: false,
        addresses: saved.addresses ?? [
          { id: 1, address: '123 Main St', tag: 'home', location: { lat: 1, lng: 1 } },
          { id: 2, address: '9 Elm Rd', tag: 'office', default: true, location: { lat: 2, lng: 2 } }
        ]
      }}
      handleDelete={handleDelete}
      setAddressList={vi.fn()}
      handleSetDefault={handleSetDefault}
      isModal
      {...rest}
    />
  )
}))

const theme = themeWithValues()

// The actions of an address (out of its item, on its row): the
// actions whose buttons are described by that address
const actionsOf = (address) => [...document.querySelectorAll('[data-doc-control="address-item-actions"]')].find((actions) => {
  const button = actions.querySelector('button')
  return button && document.getElementById(button.getAttribute('aria-describedby'))?.textContent === address
})

beforeEach(() => {
  order.address = {}
  saved.addresses = null
  handleSetDefault.mockClear()
})

describe('address picker', () => {
  it('each address is an option of a single choice list: its tag icon (the form\'s), the address and its tag', () => {
    const { getByText, getAllByRole } = renderWithProviders(<AddressList isModal />, { theme })
    expect(getAllByRole('radio')).toHaveLength(2)
    const item = getByText(HOME.address).closest('li')
    expect(item).toHaveAttribute('data-doc-control', 'address-item')
    expect(item).toHaveAttribute('data-doc-default', 'false')
    expect(item.querySelector(tagIcon(ADDRESS_TAG_ICONS.home))).not.toBeNull()
    expect(getByText(OFFICE.address).closest('li').querySelector(tagIcon(ADDRESS_TAG_ICONS.office))).not.toBeNull()
    expect(item.querySelector('[role="radio"]')).toHaveTextContent('123 Main StHome')
    // none of the old markup
    expect(item.querySelector('.wrapAddress')).toBeNull()
  })

  it('address.icons hidden (no tag selector in the form): no tag icon nor tag name', () => {
    const noTags = themeWithValues((values) => ({ ...values, visibility: { ...values.visibility, 'address.icons': false } }))
    const { getByText } = renderWithProviders(<AddressList isModal />, { theme: noTags })
    const item = getByText(HOME.address).closest('li')
    expect(item.querySelector(tagIcon(ADDRESS_TAG_ICONS.home))).toBeNull()
    expect(item.querySelector('[role="radio"]')).toHaveTextContent(/^123 Main St$/)
  })

  it('the order\'s address is the selected option', () => {
    order.address = { address: HOME.address, location: HOME.location, address_notes: null, zipcode: null, internal_number: null }
    const { getByText } = renderWithProviders(<AddressList isModal />, { theme })
    expect(getByText(HOME.address).closest('li').querySelector('[role="radio"]')).toHaveAttribute('aria-checked', 'true')
    expect(getByText(OFFICE.address).closest('li').querySelector('[role="radio"]')).toHaveAttribute('aria-checked', 'false')
  })

  it('edit and delete are icon buttons of the theme that do not pick the address', () => {
    const { container, getByTestId } = renderWithProviders(<AddressList isModal />, { theme })
    const actions = actionsOf(HOME.address)
    expect(actions).toHaveAttribute('data-doc-default', 'false')
    const edit = actions.querySelector('[data-doc-control="address-edit"]')
    const remove = actions.querySelector('[data-doc-control="address-delete"]')
    expect(edit.tagName).toBe('BUTTON')
    expect(edit).toHaveAttribute('aria-label', 'Edit address')
    expect(remove).toHaveAttribute('aria-label', 'Remove')
    expect(remove).not.toBeDisabled()
    expect(container.querySelectorAll('a[data-doc-control]')).toHaveLength(0)

    // the default address cannot be deleted
    expect(actionsOf(OFFICE.address).querySelector('[data-doc-control="address-delete"]')).toBeDisabled()

    fireEvent.click(remove)
    fireEvent.click(edit)
    expect(handleSetDefault).not.toHaveBeenCalled()
    expect(getByTestId('address-form')).toBeInTheDocument()
  })

  it('the radiogroup owns the radios alone: the actions are out of it, after it, each described by its address', () => {
    const { getByRole, getAllByRole } = renderWithProviders(<AddressList isModal />, { theme })
    const group = getByRole('radiogroup', { name: 'Saved addresses' })
    expect(within(group).queryAllByRole('button')).toHaveLength(0)
    expect(within(group).getAllByRole('radio')).toHaveLength(2)
    const actions = [...document.querySelectorAll('[data-doc-control="address-item-actions"]')]
    expect(actions).toHaveLength(2)
    actions.forEach((cell) => expect(group.contains(cell)).toBe(false))
    // the actions of the rows, row by row, after the group in the tab order
    const buttons = getAllByRole('button').filter((b) => actions.some((cell) => cell.contains(b)))
    expect(buttons.map((b) => `${b.getAttribute('aria-label')}:${document.getElementById(b.getAttribute('aria-describedby')).textContent}`))
      .toEqual(['Edit address:123 Main St', 'Remove:123 Main St', 'Edit address:9 Elm Rd', 'Remove:9 Elm Rd'])
    expect(group.compareDocumentPosition(buttons[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a click on the option picks the address', () => {
    const { getByText } = renderWithProviders(<AddressList isModal />, { theme })
    fireEvent.click(getByText(HOME.address))
    expect(handleSetDefault).toHaveBeenCalledWith(expect.objectContaining({ id: HOME.id }), undefined)
  })
})

describe('saved places', () => {
  const renderProfile = () => renderWithProviders(<AddressList isModal isProfile titleAs='h1' title='Addresses' />, { theme })

  it('one single choice list under one "Saved addresses" section: no "Explore nearby", no divider', () => {
    const { getAllByRole, getByRole, queryByText, container } = renderProfile()
    expect(getAllByRole('radiogroup')).toHaveLength(1)
    expect(getAllByRole('heading').map((h) => `${h.tagName}:${h.textContent}`)).toEqual(['H1:Addresses', 'H2:Saved addresses'])
    // the group is named by its section's title
    const group = getByRole('radiogroup', { name: 'Saved addresses' })
    expect(group.getAttribute('aria-labelledby')).toBe(getByRole('heading', { level: 2 }).id)
    expect(queryByText('Explore nearby')).toBeNull()
    expect(container.querySelector('.divider')).toBeNull()
    expect(container.querySelector('.explore-nearby')).toBeNull()
    // every address is in the group
    expect(group.querySelectorAll('[data-doc-control="address-item"]')).toHaveLength(2)
  })

  it('the default address first, selected, "Current location", only edits; then the rest, not selected', () => {
    const { getAllByRole } = renderProfile()
    const radios = getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false'])
    const [current, saved] = radios.map((r) => r.closest('li'))
    expect(current).toHaveTextContent(OFFICE.address)
    expect(current).toHaveTextContent('Current location')
    expect(current).toHaveAttribute('data-doc-control', 'address-item')
    expect(current).toHaveAttribute('data-doc-default', 'true')
    expect(current.querySelector(tagIcon(ADDRESS_TAG_ICONS.office))).not.toBeNull()
    const currentActions = actionsOf(OFFICE.address)
    expect(currentActions).toHaveAttribute('data-doc-default', 'true')
    expect(currentActions.querySelector('[data-doc-control="address-edit"]').tagName).toBe('BUTTON')
    expect(currentActions.querySelector('[data-doc-control="address-delete"]')).toBeNull()

    expect(saved).toHaveTextContent(HOME.address)
    expect(saved).toHaveTextContent('Home')
    expect(saved).toHaveAttribute('data-doc-default', 'false')
    expect(saved.querySelector(tagIcon(ADDRESS_TAG_ICONS.home))).not.toBeNull()
    expect(actionsOf(HOME.address).querySelector('[data-doc-control="address-delete"]').tagName).toBe('BUTTON')
    // none of the old tag icons or markup
    expect(saved.querySelector('[data-testid="icon-house"]')).toBeNull()
    expect(saved.querySelector('.wrapAddress')).toBeNull()
  })

  it('the options have the choice\'s look (as the picker), not a card\'s, 15px apart', () => {
    const profile = renderProfile()
    // the Choice card adds Tailwind classes after the styled one: read the rules of all of them
    const rulesOf = (el) => injectedCss().split('}').filter((rule) => el.className.split(' ').some((cls) => cls && rule.includes(`.${cls}`))).join('}')
    const profileCss = rulesOf(profile.getByText(HOME.address).closest('li'))
    profile.unmount()
    const picker = renderWithProviders(<AddressList isModal />, { theme })
    const pickerCss = rulesOf(picker.getByText(HOME.address).closest('li'))
    expect(profileCss).toBe(pickerCss)
    expect(profileCss).toContain('margin:0 0 15px')
  })

  it('picking another address (click, Enter or Space on its radio) makes it the default', () => {
    const { getByText, getAllByRole } = renderProfile()
    fireEvent.click(getByText(HOME.address))
    expect(handleSetDefault).toHaveBeenCalledWith(expect.objectContaining({ id: HOME.id }), undefined)
    const [, home] = getAllByRole('radio')
    fireEvent.keyDown(home, { key: 'Enter' })
    fireEvent.keyDown(home, { key: ' ' })
    expect(handleSetDefault).toHaveBeenCalledTimes(3)
  })

  it('the group is one tab stop (the selected option); the arrows move the focus between the options without picking', () => {
    const { getAllByRole } = renderProfile()
    const radios = getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('tabindex'))).toEqual(['0', '-1'])
    radios[0].focus()
    fireEvent.keyDown(radios[0], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(radios[1])
    fireEvent.keyDown(radios[1], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(radios[0])
    expect(handleSetDefault).not.toHaveBeenCalled()
  })

  it('the default address (selected) picks nothing', () => {
    const { getByText, getAllByRole } = renderProfile()
    fireEvent.click(getByText(OFFICE.address))
    fireEvent.keyDown(getAllByRole('radio')[0], { key: 'Enter' })
    expect(handleSetDefault).not.toHaveBeenCalled()
  })
})

describe('address picker list', () => {
  it('the options are one radiogroup named by the list\'s title', () => {
    const { getByRole } = renderWithProviders(<AddressList isModal />, { theme })
    const group = getByRole('radiogroup', { name: 'Saved addresses' })
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(2)
    // none is the order's address: the options keep the controller's order
    expect([...group.querySelectorAll('[role="radio"]')].map((r) => r.textContent)).toEqual(['123 Main StHome', '9 Elm RdOffice'])
  })

  it('while loading, the actions (which take the pointer back over the options) do not answer it either', () => {
    // (the boxes of the actions, not a rule over every button: the piece is not targeted)
    const loading = renderWith(theme, <AddressListContainer data-testid='list' isLoading />)
    expect(cssFor(loading.getByTestId('list'))).toContain('pointer-events:none')
    expect(injectedCss()).toMatch(/\.(\w+)\.\1\.\1 \.AddressActionSlot[\w-]*\{pointer-events:none;\}/)
    expect(injectedCss()).not.toMatch(/button\{pointer-events:none/)
    loading.unmount()
    const idle = renderWith(theme, <AddressListContainer data-testid='list' />)
    expect(cssFor(idle.getByTestId('list'))).not.toContain('pointer-events')
  })

  it('no saved addresses: no radiogroup (an empty one owns no radio)', () => {
    saved.addresses = []
    const { queryByRole } = renderWithProviders(<AddressList isModal />, { theme })
    expect(queryByRole('radiogroup')).toBeNull()
  })
})

describe('the selected address first', () => {
  const PARK = { id: 3, address: '7 Park Ave', tag: 'favorite', location: { lat: 3, lng: 3 } }
  const SCHOOL = { id: 4, address: '1 School Ln', tag: 'other', location: { lat: 4, lng: 4 } }
  const orderAt = (address) => ({ address: address.address, location: address.location, address_notes: null, zipcode: null, internal_number: null })
  const radios = (getByRole) => [...getByRole('radiogroup').querySelectorAll('[role="radio"]')]
  // the id of the address each element shows, in order
  const idsOf = (elements) => elements.map((el) => [HOME, OFFICE, PARK, SCHOOL].find((a) => el.textContent.includes(a.address)).id)
  const addressesOf = (getByRole) => idsOf(radios(getByRole))

  beforeEach(() => {
    saved.addresses = [HOME, OFFICE, PARK, SCHOOL].map((address) => ({ ...address }))
  })

  it('picker: the order\'s address is the first option, checked; the rest keep their order', () => {
    order.address = orderAt(PARK)
    const { getByRole } = renderWithProviders(<AddressList isModal />, { theme })
    expect(addressesOf(getByRole)).toEqual([3, 1, 2, 4])
    expect(radios(getByRole).map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false', 'false'])
    // its option still picks its address
    fireEvent.click(radios(getByRole)[1])
    expect(handleSetDefault).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), undefined)
  })

  // implementation notesthe API may leave an empty optional field out instead of sending null
  it('picker: the order\'s address is checked whether its empty optional fields come as null, as \'\' or left out', () => {
    ;[
      { address: PARK.address, location: PARK.location },
      { address: PARK.address, location: PARK.location, address_notes: '', zipcode: null }
    ].forEach((fromApi) => {
      order.address = fromApi
      saved.addresses = [HOME, PARK].map((address) => ({ ...address, address_notes: null, internal_number: null }))
      const { getByRole, unmount } = renderWithProviders(<AddressList isModal />, { theme })
      expect(radios(getByRole).map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false'])
      unmount()
    })
  })

  it('picker: a field the order has and the saved address lacks is a different address', () => {
    order.address = { ...orderAt(PARK), address_notes: 'Ring twice' }
    const { getByRole } = renderWithProviders(<AddressList isModal />, { theme })
    expect(radios(getByRole).every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true)
  })

  it('picker: an order address that is none of the saved ones keeps the list as is', () => {
    order.address = orderAt({ address: '50 Somewhere Else', location: { lat: 9, lng: 9 } })
    const { getByRole } = renderWithProviders(<AddressList isModal />, { theme })
    expect(addressesOf(getByRole)).toEqual([1, 2, 3, 4])
    expect(radios(getByRole).every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true)
  })

  it('picker: the controller\'s list is not reordered', () => {
    order.address = orderAt(SCHOOL)
    const list = saved.addresses
    const { getByRole } = renderWithProviders(<AddressList isModal />, { theme })
    expect(addressesOf(getByRole)).toEqual([4, 1, 2, 3])
    expect(list.map((a) => a.id)).toEqual([1, 2, 3, 4])
  })

  it('profile: the default address first (selected), the rest keep their order', () => {
    order.address = orderAt(PARK)
    const { getByRole } = renderWithProviders(<AddressList isModal isProfile titleAs='h1' title='Addresses' />, { theme })
    expect(addressesOf(getByRole)).toEqual([2, 1, 3, 4])
    expect(radios(getByRole).map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false', 'false'])
  })
})

describe('the address form opened from a list in a modal, on desktop', () => {
  const onCloseList = vi.fn()
  const renderInModal = (theme) => renderWithProviders(
    <DialogOverlay open onClose={onCloseList}><AddressList isModal /></DialogOverlay>,
    { theme }
  )
  // the base Dialogs, the hidden ones too (the list's, under the form's)
  const dialogs = () => document.querySelectorAll('[data-slot="dialog-content"]')

  beforeEach(() => {
    window.innerWidth = 1024
    onCloseList.mockClear()
  })

  it('opens in its own dialog over the list, titled and with one close; its close goes back to the list', async () => {
    renderInModal(theme)
    const add = await screen.findByRole('button', { name: 'Add New Address' })
    add.focus()
    fireEvent.click(add)

    const form = await screen.findByRole('dialog', { name: 'What\'s your address?' })
    expect(dialogs()).toHaveLength(2)
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    expect(form).toContainElement(screen.getByTestId('address-form'))
    // one close: the dialog's (the form hides its own)
    expect(within(form).getAllByRole('button', { name: 'Close' })).toHaveLength(1)
    expect(screen.getByTestId('address-form')).toHaveAttribute('data-modal-close', 'true')
    // the list stays open under it
    expect(dialogs()[0]).toHaveTextContent(HOME.address)

    fireEvent.click(within(form).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByTestId('address-form')).toBeNull())
    await waitFor(() => expect(dialogs()).toHaveLength(1))
    expect(screen.getByText(HOME.address)).toBeInTheDocument()
    expect(onCloseList).not.toHaveBeenCalled()
    // the focus goes back to what opened the form
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add New Address' })))
  })

  it('Escape closes only the form\'s dialog', async () => {
    renderInModal(theme)
    await screen.findByText(HOME.address)
    fireEvent.click(actionsOf(HOME.address).querySelector('[data-doc-control="address-edit"]'))
    const form = await screen.findByTestId('address-form')

    fireEvent.keyDown(form, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByTestId('address-form')).toBeNull())
    expect(screen.getByText(HOME.address)).toBeInTheDocument()
    expect(onCloseList).not.toHaveBeenCalled()

    // with the form closed, Escape closes the list
    fireEvent.keyDown(screen.getByText(HOME.address), { key: 'Escape' })
    await waitFor(() => expect(onCloseList).toHaveBeenCalledTimes(1))
  })
})

// implementation notesthe picker shows the form instead of the notice; the profile keeps the notice (and its image)
describe('no saved addresses in the profile: the image of the theme (images.empty.address_list)', () => {
  const IMAGE = 'https://cdn.test/no-addresses.png'

  it('the empty state gets the image (NotFoundSource paints it)', () => {
    saved.addresses = []
    const themed = themeWithValues((values) => ({ ...values, images: { ...values.images, 'empty.address_list': IMAGE } }))
    const { getByTestId } = renderWithProviders(<AddressList isModal isProfile />, { theme: themed })
    expect(getByTestId('not-found')).toHaveAttribute('data-image', IMAGE)
  })

  it('without it: no image (the icon stays)', () => {
    saved.addresses = []
    const { getByTestId } = renderWithProviders(<AddressList isModal isProfile />, { theme })
    expect(getByTestId('not-found')).toHaveAttribute('data-image', '')
  })
})

// visibility.address.list_details (the internal number and the zipcode under
// a saved address, off by default) and visibility.address.add_button
describe('the saved addresses: visibility address.list_details and address.add_button', () => {
  const withVisibility = (visibility) => themeWithValues((values) => {
    Object.assign(values.visibility, visibility)
    return values
  })
  const DETAILED = { id: 3, address: '7 Oak Ave', tag: 'home', zipcode: '10001', internal_number: 'Apt 4B', location: { lat: 3, lng: 3 } }

  it('the details: hidden by default, under the address when the theme shows them', () => {
    saved.addresses = [DETAILED, OFFICE]
    const hidden = renderWithProviders(<AddressList isModal />, { theme })
    expect(hidden.queryByText(/10001/)).toBeNull()
    expect(hidden.queryByText(/Apt 4B/)).toBeNull()
    hidden.unmount()
    const { getByText } = renderWithProviders(<AddressList isModal />, { theme: withVisibility({ 'address.list_details': true }) })
    expect(getByText('Apt 4B 10001')).toBeInTheDocument()
  })

  it('the add button: shown by default (picker and profile), hidden by the theme', () => {
    const picker = renderWithProviders(<AddressList isModal />, { theme })
    expect(picker.getByText('Add New Address')).toBeInTheDocument()
    picker.unmount()
    const profile = renderWithProviders(<AddressList isModal isProfile titleAs='h1' title='Addresses' />, { theme })
    expect(profile.container.querySelector('[data-doc-control="address-add"]')).not.toBeNull()
    profile.unmount()
    const off = withVisibility({ 'address.add_button': false })
    const pickerOff = renderWithProviders(<AddressList isModal />, { theme: off })
    expect(pickerOff.queryByText('Add New Address')).toBeNull()
    expect(pickerOff.getByText(HOME.address)).toBeInTheDocument()
    pickerOff.unmount()
    const profileOff = renderWithProviders(<AddressList isModal isProfile titleAs='h1' title='Addresses' />, { theme: off })
    expect(profileOff.container.querySelector('[data-doc-control="address-add"]')).toBeNull()
  })

  it('the add button of a product form without addresses follows it too', () => {
    saved.addresses = []
    const shown = renderWithProviders(<AddressList isModal isProductForm />, { theme })
    expect(shown.getByText('Add New Address')).toBeInTheDocument()
    shown.unmount()
    const { queryByText } = renderWithProviders(<AddressList isModal isProductForm />, { theme: withVisibility({ 'address.add_button': false }) })
    expect(queryByText('Add New Address')).toBeNull()
  })
})
