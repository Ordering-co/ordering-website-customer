import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { OriginalBusinessesListing } from '../layouts/OriginalBusinessesListing'
import { AppointmentsBusinessListing } from '../layouts/AppointmentsBusinessListing'

// implementation notesthe city, map and filters buttons of the listings (and the empty state of the
// appointments one) are the design system's Button, with the base Icon; the icon ones keep
// `icon-action` (the layout rule of WrapperSearch) and the city does not.

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('~ui/utils', () => ({
  getCateringValues: () => ({}),
  checkSiteUrl: (_u, f) => f,
  capitalize: (s) => s,
  priceList: []
}))
vi.mock('../layouts/OriginalBusinessesListing/OrdersSection', () => ({ OrdersSection: () => null }))
vi.mock('~ui/src/components/SearchBar', () => ({ SearchBar: () => <input data-testid='search' /> }))
vi.mock('~ui/src/components/BusinessTypes', () => ({ BusinessTypes: () => null }))
vi.mock('~ui/src/components/BusinessTypeFilter', () => ({ BusinessTypeFilter: () => null }))
vi.mock('~ui/src/components/MomentControl', () => ({ MomentControl: () => null }))
vi.mock('~ui/src/components/OrderTypeSelectorHeader', () => ({ OrderTypeSelectorHeader: () => null }))
vi.mock('~ui/src/components/BusinessController', () => ({ BusinessController: () => <div data-testid='business-card' /> }))
vi.mock('~ui/src/components/BusinessesMap', () => ({ BusinessesMap: () => <div data-testid='businesses-map' /> }))
vi.mock('~ui/src/components/HighestRated', () => ({ HighestRated: () => null }))
vi.mock('~ui/src/components/BusinessPreorder', () => ({ BusinessPreorder: () => null }))
vi.mock('~ui/src/components/PageBanner', () => ({ PageBanner: () => null }))
vi.mock('~ui/src/components/CitiesControl', () => ({ CitiesControl: () => <div data-testid='cities-control' /> }))
vi.mock('~ui/src/components/OrderContextUI', () => ({ OrderContextUI: () => null }))
vi.mock('~ui/src/components/AddressList', () => ({ AddressList: () => <div data-testid='address-list' /> }))
vi.mock('~ui/src/components/AddressForm', () => ({ AddressForm: () => <div data-testid='address-form' /> }))
vi.mock('~ui/src/components/OrderProgress', () => ({ OrderProgress: () => null }))
vi.mock('~ui/src/components/CustomOrderBanner', () => ({ CustomOrderBanner: () => null }))
vi.mock('~ui/src/components/CustomOrderModal', () => ({ CustomOrderModal: () => null }))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children }) => (open ? <div data-testid='modal'>{children}</div> : null)
}))
vi.mock('~ui/src/components/NotFoundSource', () => ({
  NotFoundSource: ({ content, children }) => <div data-testid='empty'>{content}{children}</div>
}))
vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => ({ width: 1300, height: 800 }) }))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: true, user: { id: 1 }, loading: false }, { login: vi.fn() }]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { order_types_allowed: { value: '1|2' }, advanced_business_search_enabled: { value: '1' } }, loading: false }]
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{
    options: { type: 1, address: { address: '1 Main St', location: { lat: 1, lng: 2 } } },
    carts: {},
    loading: false
  }, { changeType: vi.fn(), changeCityFilter: vi.fn(), refreshOrderOptions: vi.fn() }]
}))
const fixture = vi.hoisted(() => ({ current: {} }))
vi.mock('~components/components/BusinessList', () => ({
  BusinessList: ({ UIComponent, ...rest }) => <UIComponent {...fixture.current} {...rest} />
}))

const onRedirectPage = vi.fn()
const withCities = (mutate = (values) => values) => themeWithValues((values) => {
  values.visibility['business_listing.cities'] = true
  return mutate(values)
})
const varOf = (el, name) => el.style.getPropertyValue(name)
const iconLook = (theme) => componentVars(theme, 'button', { size: 'md', shape: 'icon', color: 'primary', appearance: 'ghost' })
const expectIconButton = (button, theme, glyph) => {
  expect(button).toHaveAttribute('data-slot', 'button')
  expect(button).toHaveAttribute('type', 'button')
  expect(button).toHaveClass('icon-action')
  expect(button.className).toContain('ui:w-(--ui-button-height)')
  ;['--ui-button-height', '--ui-button-background', '--ui-button-color'].forEach((name) => {
    expect(varOf(button, name)).toBe(iconLook(theme)[name] ?? '')
  })
  expect(button.querySelector(`svg.lucide-${glyph}`)).toHaveAttribute('aria-hidden', 'true')
}

beforeEach(() => {
  onRedirectPage.mockClear()
  fixture.current = {
    businessesList: { loading: false, error: null, businesses: [{ id: 1, name: 'Demo Cafe', open: true, slug: 'demo' }], fetched: true },
    paginationProps: { currentPage: 1, totalPages: 1, pageSize: 25 },
    searchValue: '',
    getBusinesses: vi.fn(),
    handleChangeSearch: vi.fn(),
    handleBusinessClick: vi.fn(),
    handleUpdateBusinessList: vi.fn(),
    onBusinessClick: vi.fn(),
    citiesState: { cities: [{ id: 9, name: 'Austin', enabled: true }] },
    getCities: vi.fn(),
    changeCityFilter: vi.fn(),
    handleChangeBusinessType: vi.fn(),
    handleChangePriceLevel: vi.fn(),
    businessTypeSelected: null,
    priceLevelSelected: null
  }
})

describe('OriginalBusinessesListing: the search row is the base Button', () => {
  it('the city: primary solid md, not an icon action; it opens the cities', () => {
    const theme = withCities()
    const { getByRole, getByTestId } = renderWithProviders(<OriginalBusinessesListing isCustomLayout onRedirectPage={onRedirectPage} />, { theme })
    const city = getByRole('button', { name: 'Select a city' })
    expect(city).toHaveAttribute('data-slot', 'button')
    expect(city).not.toHaveClass('icon-action')
    // it fills its slot (CityAction sizes it)
    expect(city).toHaveClass('ui:w-full')
    const look = componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'solid' })
    expect(varOf(city, '--ui-button-background')).toBe(look['--ui-button-background'])
    fireEvent.click(city)
    expect(getByTestId('cities-control')).toBeInTheDocument()
  })

  it('the map toggle: an icon Button (primary ghost md) with the base map icon, pressed when the map shows', () => {
    const theme = withCities()
    const { getByRole, getByTestId, queryByTestId } = renderWithProviders(<OriginalBusinessesListing isCustomLayout onRedirectPage={onRedirectPage} />, { theme })
    const map = getByRole('button', { name: 'Show map' })
    expectIconButton(map, theme, 'map')
    expect(map).toHaveAttribute('aria-pressed', 'false')
    expect(queryByTestId('businesses-map')).toBeNull()
    fireEvent.click(map)
    expect(map).toHaveAttribute('aria-pressed', 'true')
    expect(getByTestId('businesses-map')).toBeInTheDocument()
  })

  it('call center: filters, map and city are base Buttons; filters opens the advanced search', () => {
    const theme = withCities()
    const { getByRole } = renderWithProviders(<OriginalBusinessesListing isCustomLayout isCustomerMode userCustomer={{ id: 9 }} onRedirectPage={onRedirectPage} />, { theme })
    const filters = getByRole('button', { name: 'Filters' })
    expectIconButton(filters, theme, 'funnel')
    expectIconButton(getByRole('button', { name: 'Show map' }), theme, 'map')
    const city = getByRole('button', { name: 'Select a city' })
    expect(city).toHaveAttribute('data-slot', 'button')
    expect(city).not.toHaveClass('icon-action')
    fireEvent.click(filters)
    expect(onRedirectPage).toHaveBeenCalledWith(expect.objectContaining({ page: 'business_search' }))
  })

  it('the city follows the theme: another primary solid background, another --ui-button-background', () => {
    const backgroundIn = (theme) => {
      const view = renderWithProviders(<OriginalBusinessesListing onRedirectPage={onRedirectPage} />, { theme })
      const value = varOf(view.getByRole('button', { name: 'Select a city' }), '--ui-button-background')
      view.unmount()
      return value
    }
    const plain = withCities()
    const branded = withCities((values) => {
      values.components.button.variants.primary.solid.background = '#7A1FA2'
      return values
    })
    const a = backgroundIn(plain)
    const b = backgroundIn(branded)
    expect(a).toBe(componentVars(plain, 'button', { size: 'md', color: 'primary', appearance: 'solid' })['--ui-button-background'])
    expect(b).toBe(componentVars(branded, 'button', { size: 'md', color: 'primary', appearance: 'solid' })['--ui-button-background'])
    expect(a).not.toBe(b)
  })
})

describe('AppointmentsBusinessListing: filters and the empty state are the base Button', () => {
  it('filters: an icon Button with the base filter icon; it opens the advanced search', () => {
    const theme = themeWithValues()
    const { getByRole } = renderWithProviders(<AppointmentsBusinessListing onRedirectPage={onRedirectPage} />, { theme })
    const filters = getByRole('button', { name: 'Filters' })
    expect(filters).toHaveAttribute('data-slot', 'button')
    expect(filters.className).toContain('ui:w-(--ui-button-height)')
    expect(varOf(filters, '--ui-button-color')).toBe(iconLook(theme)['--ui-button-color'])
    expect(filters.querySelector('svg.lucide-funnel')).toBeInTheDocument()
    fireEvent.click(filters)
    expect(onRedirectPage).toHaveBeenCalledWith({ page: 'business_search' })
  })

  it('empty list: "Change address" is an outline Button that opens the addresses', () => {
    fixture.current.businessesList = { loading: false, error: null, businesses: [], fetched: true }
    const theme = themeWithValues()
    const { getByRole, getByTestId } = renderWithProviders(<AppointmentsBusinessListing onRedirectPage={onRedirectPage} />, { theme })
    const change = getByRole('button', { name: 'Change address' })
    expect(change).toHaveAttribute('data-slot', 'button')
    const look = componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'outline' })
    expect(varOf(change, '--ui-button-border')).toBe(look['--ui-button-border'])
    fireEvent.click(change)
    expect(getByTestId('modal')).toBeInTheDocument()
  })

  it('the address "Change" is a text action of components.link (sm): the base link Button, one line, opens the addresses', () => {
    const theme = themeWithValues()
    const { getByRole, getByTestId } = renderWithProviders(<AppointmentsBusinessListing onRedirectPage={onRedirectPage} />, { theme })
    const change = getByRole('button', { name: 'Change' })
    expect(change).toHaveAttribute('data-slot', 'button')
    expect(change).toHaveAttribute('type', 'button')
    expect(change.className).toContain('ui:button-link-style')
    const look = componentVars(theme, 'link', { size: 'sm', variant: 'default' })
    Object.entries(look).forEach(([name, value]) => expect(varOf(change, name)).toBe(String(value)))
    fireEvent.click(change)
    expect(getByTestId('modal')).toBeInTheDocument()
  })
})
