import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessController } from '../index'
import { businessCardLogoSizes } from '../styles'

const businessFixture = vi.hoisted(() => ({
  id: 1,
  name: 'Demo Store',
  slug: 'demo-store',
  logo: 'logo.png',
  enabled: true,
  open: true,
  favorite: false,
  ribbon: { enabled: true, color: '#FF0000', text: 'New', shape: 'rectangle_round' }
}))

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => null }))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({ ForgotPasswordForm: () => null }))

vi.mock('~components/components/BusinessController', () => ({
  BusinessController: ({ UIComponent, ...rest }) => (
    <UIComponent
      business={businessFixture}
      isBusinessOpen
      getBusinessOffer={vi.fn(() => null)}
      businessState={{ business: businessFixture, loading: false }}
      orderType={1}
      isSkeleton={false}
      businessUrlTemplate='/store/:business_slug'
      {...rest}
    />
  )
}))

const renderCard = (theme, props = {}) => renderWithProviders(
  <BusinessController handleClick={vi.fn()} {...props} />,
  { theme }
)

describe('BusinessController: stretched link', () => {
  it('the name is the only link of the card, inside its h3, with the business name', () => {
    const { container, getByRole } = renderCard(themeWithValues(), { fromBusinessListing: true })
    const heading = getByRole('heading', { level: 3 })
    const link = within(heading).getByRole('link', { name: 'Demo Store' })
    expect(link).toHaveAttribute('href', '/store/demo-store')
    expect(link).toHaveAttribute('data-card-link')
    expect(container.querySelectorAll('a')).toHaveLength(1)
    // no control inside a link
    expect(link.querySelector('button, a')).toBeNull()
    expect(container.querySelector('a button, a a, button button')).toBeNull()
  })

  it('a click on the name opens the business; the favorite does not', async () => {
    const handleClick = vi.fn()
    const { getByRole, findByRole, queryByRole } = renderCard(themeWithValues(), { fromBusinessListing: true, handleClick })
    const favorite = getByRole('button', { name: 'Favorite' })
    expect(favorite).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(favorite)
    expect(handleClick).not.toHaveBeenCalled()
    // a guest's favorite opens the login in the base dialog, whose close closes it
    const dialog = await findByRole('dialog')
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
    fireEvent.click(getByRole('link', { name: 'Demo Store' }))
    expect(handleClick).toHaveBeenCalledWith(businessFixture)
  })

  it('a preorder card (no URL) opens with a button named by the business', () => {
    const onPreorderBusiness = vi.fn()
    const { getByRole, container } = renderCard(themeWithValues(), { isBusinessOpen: false, onPreorderBusiness })
    const button = within(getByRole('heading', { level: 3 })).getByRole('button', { name: 'Demo Store' })
    expect(container.querySelector('a')).toBeNull()
    fireEvent.click(button)
    expect(onPreorderBusiness).toHaveBeenCalledWith(businessFixture)
  })

  it('favorites list: "Order now" is not a control (aria-hidden, out of the tab order)', () => {
    const { container, getByRole } = renderCard(themeWithValues(), { fromFavoriteList: true })
    const orderNow = container.querySelector('.order-now-button')
    expect(orderNow).toHaveAttribute('aria-hidden', 'true')
    expect(orderNow).toHaveAttribute('tabindex', '-1')
    // the only controls: the name's link and the favorite
    expect(getByRole('link', { name: 'Demo Store' })).toBeInTheDocument()
    expect(getByRole('button', { name: 'Favorite' })).toHaveAttribute('data-doc-control', 'favorite-business-toggle')
    expect(container.querySelectorAll('[data-card-link]')).toHaveLength(1)
  })

  it('without a handler, skeleton or disabled: the name is plain text', () => {
    const { container } = renderCard(themeWithValues(), { handleClick: undefined })
    expect(container.querySelector('[data-card-link]')).toBeNull()
  })

  it('the card places the cover; the ribbon and tags let the pointer through', () => {
    const { container } = renderCard(themeWithValues(), { fromBusinessListing: true })
    const card = container.firstChild
    expect(card).toContainElement(container.querySelector('[data-card-link]'))
    expect(cssFor(card)).toMatch(/position: ?relative/)
    // the link's wrapper is static: the cover spans the whole card
    expect(cssFor(card.firstChild)).toMatch(/position: ?static/)
    const ribbon = Array.from(container.querySelectorAll('div')).find((el) => el.textContent === 'New')
    const ribbonCss = cssFor(ribbon)
    expect(ribbonCss).toMatch(/pointer-events: ?none/)
    // in its place: the card's padding (components.business_card.base.padding) from the card's edge
    expect(ribbonCss).toMatch(/top: ?12px/)
    expect(ribbonCss).toMatch(/left: ?12px/)
  })
})

describe('BusinessController: logo sizes (components.business_card)', () => {
  it('logo_size of the theme and its platforms.mobile_web value below 576px', () => {
    expect(businessCardLogoSizes(themeWithValues())).toEqual({ size: '80px', mobile: '75px' })
    const custom = themeWithValues((values) => {
      values.components.business_card.base.logo_size = 96
      values.platforms.mobile_web.components.business_card.base.logo_size = 64
      return values
    })
    expect(businessCardLogoSizes(custom)).toEqual({ size: '96px', mobile: '64px' })
    renderCard(custom, { fromBusinessListing: true })
    const css = injectedCss()
    expect(css).toMatch(/width: ?96px; ?height: ?96px; ?min-width: ?96px/)
    expect(css).toMatch(/@media \(max-width: ?575px\) ?\{[^}]*width: ?64px; ?height: ?64px; ?min-width: ?64px; ?min-height: ?64px/)
  })

  it('without a mobile_web logo_size: the base size on a phone too', () => {
    // the defaults always bring one (the engine completes the platforms): a
    // view without it, by hand
    const theme = themeWithValues()
    const noMobile = { ...theme, css: { ...theme.css, platforms: { mobile_web: { components: {} } } } }
    expect(businessCardLogoSizes(noMobile)).toEqual({ size: '80px', mobile: null })
  })
})

describe('BusinessController: heading level and the hover of a card that opens nothing', () => {
  const card = (container) => container.firstElementChild
  const hoverShadow = (css) => (css.replace(/\s+/g, '').match(/:hover\{box-shadow:([^;}]+)/g) || []).pop()

  it('nameAs sets the name\'s heading level (h2 under an h1); its look stays', () => {
    const { getByRole } = renderCard(themeWithValues(), { fromBusinessListing: true, nameAs: 'h2' })
    expect(getByRole('heading', { level: 2, name: 'Demo Store' })).toBeInTheDocument()
  })

  it('a card that opens its business takes the hover shadow of the theme', () => {
    const theme = themeWithValues()
    const { container } = renderCard(theme, { fromBusinessListing: true })
    expect(hoverShadow(cssFor(card(container)))).not.toContain(':hover{box-shadow:none')
  })

  it('a disabled business keeps its resting shadow on hover', () => {
    const theme = themeWithValues((values) => {
      values.components.business_card.base.shadow = { x: 0, y: 1, blur: 2, spread: 0, color: 'rgba(0,0,0,0.1)' }
      values.components.business_card.variants.default.states.hover.shadow = { x: 0, y: 9, blur: 9, spread: 0, color: 'rgba(0,0,0,0.5)' }
      return values
    })
    const { container } = renderCard(theme, { fromBusinessListing: true, business: { ...businessFixture, enabled: false } })
    expect(hoverShadow(cssFor(card(container)))).toBe(':hover{box-shadow:0px1px2px0pxrgba(0,0,0,0.1)')
  })
})
