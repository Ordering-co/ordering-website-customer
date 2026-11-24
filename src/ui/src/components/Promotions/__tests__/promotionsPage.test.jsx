import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { ACCOUNT_PAGE, pagePadding } from '../../../styles/Page'
import { pageGutter } from '~/utils/themeTokens'
import { UserProfileForm } from '../../UserProfileForm'
import { Promotions } from '../index'

// the page's side space with the default theme (tokens.layout.page_gutter)
const HEADER_SIDE = pageGutter(themeWithValues())

// /promotions next to "My addresses" (/profile?view=savedPlaces): the same
// page box and title

const ADDRESSES = [
  { id: 1, address: '123 Main St', tag: 'home', location: { lat: 1, lng: 1 } },
  { id: 2, address: '9 Elm Rd', tag: 'office', default: true, location: { lat: 2, lng: 2 } }
]
const OFFERS = [
  { id: 1, name: 'Summer Deal', description: '10% off', type: 2, coupon: 'SUMMER', target: 1, rate_type: 1, rate: 10, end: '2026-12-01', businesses: [{ id: 1, name: 'Cafe', slug: 'cafe' }] },
  { id: 2, name: 'Free Delivery', description: 'No fee', type: 1, target: 2, rate_type: 1, rate: 100, end: '2026-12-01', businesses: [{ id: 1, name: 'Cafe', slug: 'cafe' }] }
]

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('~components/contexts/UtilsContext', () => ({
  useUtils: () => [{ parseDate: () => 'Jan 1', parsePrice: (v) => `$${v}`, optimizeImage: (url) => url }]
}))
vi.mock('~ui/src/components/SearchBar', () => ({
  SearchBar: ({ placeholder }) => <input placeholder={placeholder} />
}))
vi.mock('~components/components/PromotionsController', () => ({
  PromotionsController: ({ UIComponent, ...rest }) => (
    <UIComponent
      offersState={{ loading: false, error: null, offers: OFFERS }}
      handleSearchValue={vi.fn()}
      searchValue=''
      offerSelected={null}
      setOfferSelected={vi.fn()}
      {...rest}
    />
  )
}))
// My addresses: the profile form with the real address list
vi.mock('~components/components/UserFormDetails', () => ({
  UserFormDetails: ({ UIComponent, ...rest }) => (
    <UIComponent
      isEdit={false}
      formState={formStateFixture}
      userData={{ ...userFixture, addresses: ADDRESSES }}
      user={userFixture}
      toggleIsEdit={vi.fn()}
      handleButtonUpdateClick={vi.fn()}
      handlechangeImage={vi.fn()}
      handleSendOtp={vi.fn()}
      verifyPhoneState={{ result: null }}
      setFormState={vi.fn()}
      cleanFormState={vi.fn()}
      isHiddenAddress={false}
      {...rest}
    />
  )
}))
vi.mock('~ui/src/components/UserFormDetails', () => ({
  UserFormDetailsUI: () => <div data-testid='user-form-details-stub' />
}))
vi.mock('~ui/src/components/StudentsList', () => ({
  StudentsList: () => null
}))
vi.mock('~ui/hooks/useCountdownTimer', () => ({
  useCountdownTimer: () => [60, vi.fn(), vi.fn()]
}))
vi.mock('~ui/src/components/AddressForm', () => ({
  AddressForm: () => <div data-testid='address-form' />
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [
    { options: { type: 1, address: {} }, loading: false, carts: {} },
    { refreshOrderOptions: vi.fn() }
  ]
}))
vi.mock('~components/components/AddressList', () => ({
  AddressList: ({ UIComponent, ...rest }) => (
    <UIComponent
      {...rest}
      actionStatus={{ loading: false, error: null }}
      addressList={{ loading: false, addresses: ADDRESSES }}
      handleDelete={vi.fn()}
      setAddressList={vi.fn()}
      handleSetDefault={vi.fn()}
    />
  )
}))

// The page's box (the root of the page component) and its h1
const renderPage = (ui, theme) => {
  const view = renderWithProviders(ui, { theme })
  const h1 = view.getAllByRole('heading', { level: 1 })
  expect(h1).toHaveLength(1)
  return { view, box: view.container.firstChild, title: h1[0] }
}
const renderPromotions = (theme) => renderPage(<Promotions />, theme)
const renderAddresses = (theme) => renderPage(<UserProfileForm view='savedPlaces' />, theme)

const BOX = ['box-sizing', 'width', 'max-width', 'margin-left', 'margin-right', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left']
const TITLE = ['display', 'width', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left']
const computed = (el, props) => {
  const style = window.getComputedStyle(el)
  return Object.fromEntries(props.map((p) => [p, style.getPropertyValue(p)]))
}
// the wide-screen rule of the box (from 769px), as styled-components writes it
const WIDE = '@media (min-width:769px){'
const widePadding = (theme) => `padding:${pagePadding(theme, ACCOUNT_PAGE)}`

describe('/promotions page box and title', () => {
  it('the box and title of "My addresses", same computed styles', () => {
    const theme = themeWithValues()
    const addresses = renderAddresses(theme)
    const addressesBox = computed(addresses.box, BOX)
    const addressesTitle = computed(addresses.title, TITLE)
    addresses.view.unmount()

    const promotions = renderPromotions(theme)
    expect(promotions.box).toHaveAttribute('data-doc-section', 'promotions')
    expect(computed(promotions.box, BOX)).toEqual(addressesBox)
    expect(computed(promotions.title, TITLE)).toEqual(addressesTitle)
    // the values of the shared box and title
    expect(promotions.box).toHaveStyle({ width: '100%', paddingTop: `${theme.values.tokens.space.xxl}px`, paddingLeft: `${HEADER_SIDE}px`, paddingRight: `${HEADER_SIDE}px`, paddingBottom: `${theme.values.components.account_page.base.padding_bottom}px` })
    expect(promotions.title).toHaveStyle({ marginTop: '0px', marginBottom: `${theme.values.tokens.space.xl}px`, fontSize: `${theme.values.tokens.typography.h1.size}px` })
  })

  it('on wide screens the shared 75% box wins over the page\'s own 70% / no padding', () => {
    const theme = themeWithValues()
    const { box } = renderPromotions(theme)
    const css = cssFor(box).replace(/\s+/g, ' ')
    const wide = css.lastIndexOf(WIDE)
    expect(wide).toBeGreaterThan(-1)
    expect(css.slice(wide)).toContain(`width:75%;${widePadding(theme)}`)
    // the page's own rule (from 993px) comes first: the shared one is the later
    expect(css.indexOf('width:70%')).toBeLessThan(wide)
  })

  it('one h1, the offers h2 (no skipped level) with the card title\'s look', () => {
    const theme = themeWithValues()
    const { view, title } = renderPromotions(theme)
    expect(title).toHaveTextContent('Offers')
    const names = view.getAllByRole('heading', { level: 2 })
    expect(names.map((h) => h.textContent)).toEqual(['Summer Deal', 'Free Delivery'])
    ;[3, 4, 5, 6].forEach((level) => expect(view.queryAllByRole('heading', { level })).toHaveLength(0))
    names.forEach((h2) => expect(h2).toHaveStyle({ fontSize: `${theme.values.tokens.typography.h4.size}px`, marginTop: '0px', marginBottom: '0px' }))
  })

  it('the offers the theme\'s md apart, none under the last one (the box\'s bottom space alone)', () => {
    const theme = themeWithValues()
    const gap = `${theme.values.tokens.space.md}px`
    const { view } = renderPromotions(theme)
    const cards = Array.from(view.container.querySelectorAll('[data-doc-section="promotion-card"]'))
    expect(cards).toHaveLength(2)
    cards.forEach((card) => expect(card).toHaveStyle({ marginBottom: '0px' }))
    expect(cards[0]).not.toHaveStyle({ marginTop: gap })
    expect(cards[1]).toHaveStyle({ marginTop: gap })
  })
})
