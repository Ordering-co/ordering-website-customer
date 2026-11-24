import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { orderWithAddressFixture } from '../../__tests__/helpers/shellTestMocks'
import { Header } from '../index'
import { ORDER_CONTEXT_DOCK_EVENT } from '../orderContextDock'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { themedScroll } from './scrollTheme'

// The header's row below 1024px: the chip the fixed header shows once the bar docked under it is out of view
const windowSize = vi.hoisted(() => ({ width: 800, height: 900 }))
vi.mock('~ui/hooks/useWindowSize', () => ({ useWindowSize: () => windowSize }))
vi.mock('~ui/utils', () => ({
  getDistance: () => 0,
  getCateringValues: () => ({}),
  getTraduction: (_key, fallback) => fallback
}))
vi.mock('../../../../config', () => ({ default: { franchiseSlug: null, businessSlug: null } }))
vi.mock('~ui/src/components/LanguageSelector', () => ({ LanguageSelector: () => null }))
vi.mock('~ui/src/components/HeaderOption', () => ({ HeaderOption: () => null }))
vi.mock('~ui/src/components/AddressOrderType', () => ({ AddressOrderType: () => <div data-testid='address-order-type' /> }))
vi.mock('@loadable/component', () => ({ default: () => () => null }))
vi.mock('~components/contexts/EventContext', () => ({ useEvent: () => [{ emit: vi.fn(), on: vi.fn(), off: vi.fn() }] }))
vi.mock('~components/contexts/SessionContext', () => ({ useSession: () => [{ auth: false, user: null }, { login: vi.fn() }] }))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [orderWithAddressFixture, { refreshOrderOptions: vi.fn() }]
}))
vi.mock('~components/contexts/CustomerContext', () => ({
  useCustomer: () => [{ user: null, loading: false }, { deleteUserCustomer: vi.fn() }]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: { preorder_status_enabled: { value: '1' }, order_types_allowed: { value: '1,2' } } }]
}))

const dockOut = (out) => act(() => {
  window.dispatchEvent(new CustomEvent(ORDER_CONTEXT_DOCK_EVENT, { detail: { out } }))
})

const renderHeader = (theme) => renderWithProviders(
  <Header isHome={false} location={{ pathname: '/search' }} />,
  { initialEntries: ['/search'], routePath: '/search', theme }
)

const hiding = (...keys) => themeWithValues((values) => {
  keys.forEach((key) => { values.visibility[key] = false })
  return values
})

describe('the header\'s order context chip', () => {
  beforeEach(() => {
    windowSize.width = 800
    Object.defineProperty(global.navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn() } })
  })
  afterEach(() => dockOut(false))

  it('fixed: no chip while the docked bar is in view, the address in the row once it is out, and gone when it is back', () => {
    const { queryByRole } = renderHeader(themedScroll('fixed'))
    expect(queryByRole('button', { name: /Your order/ })).toBeNull()
    dockOut(true)
    const chip = queryByRole('button', { name: 'Your order: 123 Main St' })
    expect(chip).not.toBeNull()
    expect(chip).toHaveAttribute('data-slot', 'button')
    expect(chip).toHaveAttribute('title', '123 Main St')
    expect(chip.closest('[data-app-header]')).not.toBeNull()
    expect(chip.textContent).toBe('123 Main St')
    dockOut(false)
    expect(queryByRole('button', { name: /Your order/ })).toBeNull()
  })

  it('the chip stays while its sheet is open, even if the docked bar comes back into view', () => {
    const { queryByRole } = renderHeader(themedScroll('fixed'))
    dockOut(true)
    act(() => { queryByRole('button', { name: 'Your order: 123 Main St' }).click() })
    expect(queryByRole('button', { name: /Your order/ })).toHaveAttribute('aria-expanded', 'true')
    dockOut(false)
    expect(queryByRole('button', { name: 'Your order: 123 Main St' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('without scroll_behavior the header is fixed: the chip shows', () => {
    const { queryByRole } = renderHeader(themedScroll(undefined))
    dockOut(true)
    expect(queryByRole('button', { name: /Your order/ })).not.toBeNull()
  })

  it('reveal: never (the bar is its dock and goes with it)', () => {
    const { queryByRole } = renderHeader(themedScroll('reveal'))
    dockOut(true)
    expect(queryByRole('button', { name: /Your order/ })).toBeNull()
  })

  it('the theme hides the address: the chip is the moment; hiding it too, there is none', () => {
    const noAddress = renderHeader(hiding('order_context.address'))
    dockOut(true)
    expect(noAddress.queryByRole('button', { name: 'Your order: ASAP' })).not.toBeNull()
    noAddress.unmount()
    const none = renderHeader(hiding('order_context.address', 'order_context.moment'))
    dockOut(true)
    expect(none.queryByRole('button', { name: /Your order/ })).toBeNull()
  })
})
