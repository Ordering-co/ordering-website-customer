import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '~ui/src/styles/__tests__/themeTestUtils'
import { checkoutCartFixture } from '../../__tests__/helpers/checkoutTestMocks'
import { sampleBusiness } from '../../__tests__/helpers/ordersTestMocks'
import { schemaDefault } from '~/utils/themeSchema'
import { MultiCheckout } from '../index'

// The totals of /multi-checkout: the rewards row (a section of
// pages.multi_checkout), the note under the total
// (visibility.multi_checkout.description) and the totals as the
// checkout's card.
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 1 }, carts: {} }, { refreshOrderOptions: () => {} }]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { cash_wallet: { value: '1' }, wallet_cash_enabled: { value: '1' } } }]
}))
vi.mock('~ui/hooks/useBusinessVerticals', () => ({ useBusinessVerticals: () => ({}) }))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useHistory: () => ({ push: vi.fn(), replace: vi.fn(), goBack: vi.fn() }) }
})
vi.mock('~components/components/MultiCheckout', () => ({
  MultiCheckout: ({ UIComponent, ...rest }) => (
    <UIComponent
      openCarts={[{ ...checkoutCartFixture, subtotal: 10, business: sampleBusiness }]}
      cartGroup={{ loading: false, result: { status: 'pending', balance: 15.5 } }}
      walletState={{ error: null }}
      checkoutFieldsState={{ loading: false, fields: [] }}
      loyaltyPlansState={{ result: [{ type: 'credit_point', accumulation_rate: 1, businesses: [] }] }}
      paymethodSelected={{ id: 1, gateway: 'cash', paymethod_id: 1 }}
      handleGroupPlaceOrder={vi.fn()}
      onRedirectPage={vi.fn()}
      placing={false}
      {...rest}
    />
  )
}))
vi.mock('~ui/src/components/Cart', () => ({ Cart: () => null }))
vi.mock('~ui/src/components/DriverTips', () => ({ DriverTips: () => null }))
vi.mock('~ui/src/components/AddressDetails', () => ({ AddressDetails: () => null }))
vi.mock('~ui/src/components/UserDetails', () => ({ UserDetails: () => null }))
vi.mock('~ui/src/components/MultiCartsPaymethodsAndWallets', () => ({ MultiCartsPaymethodsAndWallets: () => null }))

const REWARD = /on loyalty points/
const DESCRIPTION = /You will receive a receipt for each business/

const render = (theme) => renderWithProviders(<MultiCheckout cartUuid={checkoutCartFixture.uuid} />, { theme })

const themedWith = ({ sections, visibility } = {}) => themeWithValues((values) => {
  if (visibility) Object.assign(values.visibility, visibility)
  if (sections) values.pages = { ...values.pages, multi_checkout: { ...values.pages.multi_checkout, sections } }
  return values
})

describe('MultiCheckout totals', () => {
  it('the schema: rewards is a hideable section of the side (fixed), the description a visibility key shown by default', () => {
    const sections = schemaDefault('pages.multi_checkout.sections')
    expect(sections.find((section) => section.key === 'rewards')).toEqual({ key: 'rewards', visible: true, hideable: true, group: null })
    expect(schemaDefault('visibility.multi_checkout.description')).toBe(true)
  })

  it('the schema defaults show the rewards row and the description', () => {
    const { getByText } = render(themedWith())
    expect(getByText(REWARD)).toBeInTheDocument()
    expect(getByText(DESCRIPTION)).toBeInTheDocument()
  })

  it('pages.multi_checkout hides the rewards row and visibility.multi_checkout.description the note', () => {
    const { queryByText, getByText, unmount } = render(themedWith({ sections: [{ key: 'rewards', visible: false }] }))
    expect(queryByText(REWARD)).toBeNull()
    expect(getByText(DESCRIPTION)).toBeInTheDocument()
    unmount()

    const noNote = render(themedWith({ visibility: { 'multi_checkout.description': false } }))
    expect(noNote.queryByText(DESCRIPTION)).toBeNull()
    expect(noNote.getByText(REWARD)).toBeInTheDocument()
  })

  it('the totals are a card with the checkout\'s totals padding', () => {
    const totals = (container) => container.querySelector('[data-doc-section="multi-checkout-order-summary"]').parentElement.lastElementChild

    const themed = render(themedWith())
    const themedCss = cssFor(totals(themed.container))
    expect(themedCss).toMatch(/padding:16px/)
    expect(themedCss).toMatch(/margin-top:24px/)
    expect(themedCss).toMatch(/gap:8px/)
  })

  it('the total line first in the card (no rows above it) has no divider over it', () => {
    const totals = (container) => container.querySelector('[data-doc-section="multi-checkout-order-summary"]').parentElement.lastElementChild
    const themed = render(themedWith())
    const card = totals(themed.container)
    expect(card.firstElementChild.tagName).toBe('DIV')
    const css = cssFor(card)
    expect(css).toMatch(/> ?div:first-child\{border-top:none;padding-top:0;/)
  })
})
