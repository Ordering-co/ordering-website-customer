import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { defaultTheme, renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { CouponControl } from '../index'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { themeSpace } from '~/utils/themeTokens'
import { componentVars } from '~ui/src/design-system/lib/componentVars'

const mocks = vi.hoisted(() => ({
  setConfirm: vi.fn(),
  handleButtonApplyClick: vi.fn(),
  handleLoadOffers: vi.fn(),
  handleOfferApplyClick: vi.fn(),
  handleOfferRemoveClick: vi.fn(),
  controllerProps: {}
}))

vi.mock('~components/components/CouponControl', () => ({
  CouponControl: ({ UIComponent, ...rest }) => (
    <UIComponent
      couponInput='SAVE10'
      couponDefault={null}
      handleButtonApplyClick={mocks.handleButtonApplyClick}
      handleLoadOffers={mocks.handleLoadOffers}
      handleOfferApplyClick={mocks.handleOfferApplyClick}
      handleOfferRemoveClick={mocks.handleOfferRemoveClick}
      handleRemoveCouponClick={vi.fn()}
      onChangeInputCoupon={vi.fn()}
      offersState={{ offers: [], loading: false, error: null }}
      applyingOfferId={null}
      removingOfferId={null}
      canLoadOffers
      cart={{ uuid: 'cart-uuid', offers: [] }}
      confirm={{ open: false, content: [] }}
      setConfirm={mocks.setConfirm}
      {...mocks.controllerProps}
      {...rest}
    />
  )
}))

vi.mock('~ui/src/components/Confirm', () => ({
  Confirm: () => null
}))

describe('CouponControl', () => {
  afterEach(() => {
    vi.clearAllMocks()
    mocks.controllerProps = {}
  })

  it('opens the selector and loads saved offers; Close closes it', async () => {
    const { getByPlaceholderText, getByRole, queryByRole } = renderWithProviders(<CouponControl />)

    fireEvent.click(getByRole('button', { name: /offers and coupons/i }))

    expect(getByRole('dialog', { name: 'Offers and coupons' })).toHaveAttribute('data-doc-section', 'coupon-selector-dialog')
    expect(getByPlaceholderText('Discount coupon')).toBeInTheDocument()
    expect(mocks.handleLoadOffers).toHaveBeenCalledOnce()
    fireEvent.click(getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('a long applied coupon code wraps to 2 lines before it is cut, never on one line with "…"; its text is the title', () => {
    const longCode = 'SOME-VERY-LONG-COUPON-CODE-WINTER-2026-SALE'
    mocks.controllerProps = { couponDefault: longCode }
    const { getByRole, getByText } = renderWithProviders(<CouponControl />)

    fireEvent.click(getByRole('button', { name: /offers and coupons/i }))
    const code = getByText(longCode).closest('strong')
    expect(code).toHaveAttribute('title', longCode)
    const style = window.getComputedStyle(code)
    expect(style.webkitLineClamp).toBe('2')
    expect(style.whiteSpace).not.toBe('nowrap')
  })

  it('applies an available saved offer', async () => {
    const offer = {
      id: 15,
      name: 'Lunch reward',
      coupon: 'LUNCH15',
      description: 'Save on your next lunch',
      applicable: true,
      stackable: true,
      rate_type: 1,
      rate: 15
    }
    mocks.controllerProps = {
      offersState: { offers: [offer], loading: false, error: null }
    }
    mocks.handleOfferApplyClick.mockResolvedValue(true)
    const { getByRole, getByText, queryByRole } = renderWithProviders(<CouponControl />)

    fireEvent.click(getByRole('button', { name: /offers and coupons/i }))
    const offerCard = getByText('Lunch reward').closest('article')
    fireEvent.click(within(offerCard).getByRole('button', { name: 'Apply' }))

    expect(mocks.handleOfferApplyClick).toHaveBeenCalledWith(offer)
    await waitFor(() => expect(queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows applied offers in the current tab and confirms removal', () => {
    const appliedOffer = {
      id: 21,
      name: 'Current lunch reward',
      coupon: 'CURRENT15',
      description: 'Applied to this cart',
      rate_type: 1,
      rate: 15
    }
    mocks.controllerProps = {
      cart: { uuid: 'cart-uuid', offers: [appliedOffer] }
    }
    // The remove action is the danger button: the theme carries its color.
    const { getByRole, getByText } = renderWithProviders(<CouponControl />, { theme: defaultTheme })

    fireEvent.click(getByRole('button', { name: /offers and coupons/i }))
    fireEvent.click(getByRole('tab', { name: /current offers/i }))

    const offerCard = getByText('Current lunch reward').closest('article')
    fireEvent.click(within(offerCard).getByRole('button', { name: /remove current lunch reward/i }))

    expect(mocks.setConfirm).toHaveBeenCalledWith({
      open: true,
      content: 'Are you sure that you want to delete the offer?'
    })
  })

  it('keeps manual entry for guests without rendering saved offers', () => {
    mocks.controllerProps = { canLoadOffers: false }
    const { getByRole, getByPlaceholderText, queryByText } = renderWithProviders(<CouponControl />)

    fireEvent.click(getByRole('button', { name: /offers and coupons/i }))

    expect(getByPlaceholderText('Discount coupon')).toHaveAttribute('autocomplete', 'off')
    expect(queryByText('Available offers')).not.toBeInTheDocument()
    expect(mocks.handleLoadOffers).not.toHaveBeenCalled()
  })

  it('renders an empty state when there are no saved offers', () => {
    const { getByRole, getByText } = renderWithProviders(<CouponControl />)

    fireEvent.click(getByRole('button', { name: /offers and coupons/i }))

    expect(getByText('No offers available right now')).toBeInTheDocument()
  })

  it('marks the offer list as busy while saved offers load', () => {
    mocks.controllerProps = {
      offersState: { offers: [], loading: true, error: null }
    }
    const { getByRole } = renderWithProviders(<CouponControl />)

    fireEvent.click(getByRole('button', { name: /offers and coupons/i }))

    expect(getByRole('dialog').querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('lets customers retry when loading offers fails', () => {
    mocks.controllerProps = {
      offersState: { offers: [], loading: false, error: 'NETWORK_ERROR' }
    }
    const { getByRole } = renderWithProviders(<CouponControl />)

    fireEvent.click(getByRole('button', { name: /offers and coupons/i }))
    fireEvent.click(getByRole('button', { name: 'Retry' }))

    expect(mocks.handleLoadOffers).toHaveBeenCalledTimes(2)
  })
})

// implementation notes M4: the entry row and the code field are base pieces used by their own props: the Button grows with its
// two lines (layout='multiline', keeping the theme's height as its minimum) and the Input keeps the theme's border; the
// container writes no height, border or width over them.
describe('CouponControl entry row and code field', () => {
  it('the entry row is the ghost Button of the theme, multiline, with nothing written over it', () => {
    const view = renderWithProviders(<CouponControl />, { theme: themeWithValues() })
    const row = view.getByRole('button', { name: /offers and coupons/i })
    expect(row).toHaveAttribute('data-slot', 'button')
    expect(row.className).toContain('ui:h-auto')
    expect(row.className).toContain('ui:min-h-(--ui-button-height)')
    // the tag is a Lucide stroke of the base Icon, in the rating color
    expect(row.querySelector('svg.lucide-tag')).not.toBeNull()
    const css = cssFor(row.parentElement).replace(/\s+/g, '')
    expect(css).not.toMatch(/>button\{(height|min-height|box-shadow|border)/)
    // the card clips: the row's own ring is inside its edge (the Button's focusInset), not a rule of the card
    expect(row.className).toContain('ui:focus-visible:[outline-offset:calc(-1*var(--ot-focus-ring-width))]!')
    expect(css).not.toMatch(/>button/)
  })

  it('the code field is the base Input on the theme\'s border; the form writes no rule over it or its Button', () => {
    const view = renderWithProviders(<CouponControl />, { theme: themeWithValues() })
    mocks.controllerProps = { canLoadOffers: false }
    fireEvent.click(view.getByRole('button', { name: /offers and coupons/i }))
    const field = view.getByPlaceholderText('Discount coupon')
    expect(field).toHaveAttribute('data-slot', 'input')
    expect(field).toHaveAttribute('autocomplete', 'off')
    const css = cssFor(field.parentElement).replace(/\s+/g, '')
    expect(css).not.toContain('input')
    expect(css).not.toContain('button')
    expect(css).not.toContain('92px')
    expect(view.getByRole('button', { name: 'Apply' })).toHaveAttribute('data-slot', 'button')
  })

  it('the dialog is the base Dialog\'s medium size, not 620px', () => {
    const theme = themeWithValues()
    const view = renderWithProviders(<CouponControl />, { theme })
    fireEvent.click(view.getByRole('button', { name: /offers and coupons/i }))
    const width = document.querySelector('[style*="--ui-modal-width"]').style.getPropertyValue('--ui-modal-width')
    expect(width).toBe(componentVars(theme, 'modal', { size: 'md' })['--ui-modal-width'])
    expect(width).not.toContain('620')
  })

  it('an offer\'s action is a Button in its own box: no width or min-width written over it', () => {
    mocks.controllerProps = { offersState: { offers: [{ id: 1, name: 'Lunch reward', applicable: true }], loading: false, error: null } }
    const view = renderWithProviders(<CouponControl />, { theme: themeWithValues() })
    fireEvent.click(view.getByRole('button', { name: /offers and coupons/i }))
    const card = view.getByRole('article')
    const apply = within(card).getByRole('button', { name: 'Apply' })
    expect(apply).toHaveAttribute('data-slot', 'button')
    expect(cssFor(card).replace(/\s+/g, '')).not.toMatch(/>button|88px/)
    // its box is content-wide, and the whole line of the card on a phone, where the Button stretches
    const box = cssFor(apply.parentElement).replace(/\s+/g, '')
    expect(box).toMatch(/[^-]flex:00auto;/)
    expect(box).toMatch(/[^-]flex-direction:column;/)
    expect(box).toMatch(/@media\(max-width:480px\)\{[^}]*flex-basis:100%/)
  })
})

describe('CouponControl offer tabs', () => {
  const open = (props = {}) => {
    mocks.controllerProps = { offersState: { offers: [{ id: 1, name: 'Lunch reward', applicable: true }], loading: false, error: null }, ...props }
    const view = renderWithProviders(<CouponControl />, { theme: themeWithValues() })
    fireEvent.click(view.getByRole('button', { name: /offers and coupons/i }))
    return view
  }

  it('are the base Tabs of the theme: two tabs of equal width, the label before its count', () => {
    const { getByRole, getByText } = open()
    const list = getByRole('tablist', { name: 'Offers and coupons' })
    const [available, current] = within(list).getAllByRole('tab')
    expect(list).toHaveAttribute('data-slot', 'tabs-list')
    expect(available).toHaveAttribute('data-slot', 'tabs-trigger')
    expect(available).toHaveAttribute('aria-selected', 'true')
    expect(current).toHaveAttribute('aria-selected', 'false')
    expect(available.className).toContain('ui:flex-[1_1_0]')
    expect(current.className).toContain('ui:flex-[1_1_0]')
    // the count keeps its size beside the label, which ends in … instead
    expect(getByText('Available offers').nextElementSibling).toHaveTextContent('1')
    expect(window.getComputedStyle(getByText('1')).flexShrink).toBe('0')
    expect(window.getComputedStyle(getByText('1')).minWidth).toBe('20px')
  })

  // implementation notes B1: the bar and the panel were siblings of a section with space.lg between them; inside Tabs the panel keeps that distance
  it('each panel starts space.lg under the tab bar, on both tabs', async () => {
    const { getByRole, getByText } = open()
    const lg = themeSpace(themeWithValues(), 'lg')
    expect(window.getComputedStyle(getByText('Choose an offer and apply it instantly.')).marginTop).toBe(lg)
    const tabs = within(getByRole('tablist')).getAllByRole('tab')
    tabs[0].focus()
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' })
    await waitFor(() => expect(tabs[1]).toHaveAttribute('aria-selected', 'true'))
    expect(window.getComputedStyle(getByText('Review or remove discounts applied to this cart.')).marginTop).toBe(lg)
  })

  it('the selected tab shows its panel only, named by its tab; the arrows change tab', async () => {
    const { getByRole, queryByText, getByText } = open()
    const tabs = within(getByRole('tablist')).getAllByRole('tab')
    expect(getByRole('tabpanel')).toHaveAccessibleName(/available offers/i)
    expect(getByText('Choose an offer and apply it instantly.')).toBeInTheDocument()
    tabs[0].focus()
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' })
    await waitFor(() => expect(tabs[1]).toHaveAttribute('aria-selected', 'true'))
    expect(getByRole('tabpanel')).toHaveAccessibleName(/current offers/i)
    expect(queryByText('Choose an offer and apply it instantly.')).not.toBeInTheDocument()
    expect(getByText('Review or remove discounts applied to this cart.')).toBeInTheDocument()
  })
})
