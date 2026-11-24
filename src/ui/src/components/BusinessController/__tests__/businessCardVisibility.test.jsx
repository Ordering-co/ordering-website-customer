import { themeValue } from '~/utils/themeTokens'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessController } from '../index'

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
// no moment picked: the card says how soon it closes
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [{ options: { type: 1, moment: null }, carts: {}, loading: false }, {}]
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

const hide = (...keys) => themeWithValues((values) => {
  keys.forEach((key) => { values.visibility[key] = false })
  return values
})
const logos = (container) => [
  ...container.querySelectorAll('[style*="logo.png"]'),
  ...container.querySelectorAll('img[src*="logo.png"]')
]
const closingSoon = (container) => container.querySelector('.closing-soon')

describe('BusinessController: parts the theme hides (visibility business_card.*)', () => {
  it('by default: logo, favorite and "minutes to close" are shown', () => {
    const { container, getByRole } = renderCard(themeWithValues(), { fromBusinessListing: true, businessWillCloseSoonMinutes: 20 })
    expect(logos(container).length).toBeGreaterThan(0)
    expect(getByRole('button', { name: 'Favorite' })).toBeInTheDocument()
    expect(closingSoon(container)).not.toBeNull()
  })

  it('business_card.logo, .favorite and .closing_soon hide them', () => {
    const { container, queryByRole } = renderCard(
      hide('business_card.logo', 'business_card.favorite', 'business_card.closing_soon'),
      { fromBusinessListing: true, businessWillCloseSoonMinutes: 20 }
    )
    expect(logos(container)).toHaveLength(0)
    expect(queryByRole('button', { name: 'Favorite' })).toBeNull()
    expect(closingSoon(container)).toBeNull()
  })
})

describe('BusinessController: a listing card without a logo', () => {
  const noLogo = { ...businessFixture, logo: null }
  const logoBox = (theme, business) => {
    const view = renderCard(theme, { fromBusinessListing: true, business, businessState: { business, loading: false } })
    const box = view.container.querySelector('.info').firstElementChild
    const css = cssFor(box).replace(/\s+/g, '')
    view.unmount()
    return css
  }

  it('no gap before the name (the empty logo box keeps no margin)', () => {
    expect(logoBox(themeWithValues(), noLogo)).toMatch(/margin-right:0;/)
    expect(logoBox(themeWithValues(), businessFixture)).not.toMatch(/margin-right:0;/)
  })
})

describe('BusinessController: the logo and favorite outside the listing (A8, withLogoAndFavorite)', () => {
  it('a card of a carousel or the appointments list shows them by default', () => {
    const { container, getByRole } = renderCard(themeWithValues(), { withLogoAndFavorite: true })
    expect(container.querySelector('.info [style*="logo.png"]')).not.toBeNull()
    expect(getByRole('button', { name: 'Favorite' })).toBeInTheDocument()
  })

  it('business_card.logo and .favorite hide them there too', () => {
    const { container, queryByRole } = renderCard(hide('business_card.logo', 'business_card.favorite'), { withLogoAndFavorite: true })
    expect(logos(container)).toHaveLength(0)
    expect(queryByRole('button', { name: 'Favorite' })).toBeNull()
  })

  it('a card that does not ask for them (e.g. the search\'s) keeps none beside its name', () => {
    const { container, queryByRole } = renderCard(themeWithValues())
    expect(container.querySelector('.info [style*="logo.png"]')).toBeNull()
    expect(queryByRole('button', { name: 'Favorite' })).toBeNull()
  })
})

describe('BusinessController: the featured crown and the tags (business_card.featured / .preorder / .offer)', () => {
  const featured = { ...businessFixture, featured: true, ribbon: null }
  const offers = vi.fn(() => '10%')
  const renderTags = (theme, props = {}) => renderCard(theme, { business: featured, getBusinessOffer: offers, ...props })
  const crown = (container) => container.querySelector('.crown')

  it('by default: no crown on a featured business', () => {
    expect(crown(renderTags(themeWithValues()).container)).toBeNull()
  })

  it('uses the compiled showcase switch independently of the global visibility', () => {
    const theme = themeWithValues()
    const showFeaturedBadge = themeValue(theme, 'business_listing_page', 'base.showcase_featured_badge')
    expect(showFeaturedBadge).toBe(true)
    expect(crown(renderTags(theme, { showFeaturedBadge }).container)).not.toBeNull()
    const globalOn = themeWithValues((values) => {
      values.visibility['business_card.featured'] = true
      values.components.business_listing_page.base.showcase_featured_badge = false
    })
    const hidden = renderTags(globalOn, { showFeaturedBadge: themeValue(globalOn, 'business_listing_page', 'base.showcase_featured_badge') })
    expect(crown(hidden.container)).toBeNull()
  })

  it('business_card.featured shows the crown of a featured business only', () => {
    const on = themeWithValues((values) => {
      values.visibility['business_card.featured'] = true
      return values
    })
    const view = renderTags(on)
    expect(crown(view.container)).not.toBeNull()
    view.unmount()
    expect(crown(renderTags(on, { business: { ...featured, featured: false } }).container)).toBeNull()
  })

  it('by default a closed business shows "Preorder" and the discount', () => {
    const { getByText } = renderTags(themeWithValues(), { isBusinessOpen: false })
    expect(getByText('Preorder')).toBeInTheDocument()
    expect(getByText(/Discount/)).toBeInTheDocument()
  })

  it('business_card.preorder hides "Preorder" alone; business_card.offer the discount alone', () => {
    const noPreorder = renderTags(hide('business_card.preorder'), { isBusinessOpen: false })
    expect(noPreorder.queryByText('Preorder')).toBeNull()
    expect(noPreorder.getByText(/Discount/)).toBeInTheDocument()
    noPreorder.unmount()
    const noOffer = renderTags(hide('business_card.offer'), { isBusinessOpen: false })
    expect(noOffer.queryByText(/Discount/)).toBeNull()
    expect(noOffer.getByText('Preorder')).toBeInTheDocument()
  })

  it('an open business has no "Preorder" tag', () => {
    expect(renderTags(themeWithValues(), { isBusinessOpen: true }).queryByText('Preorder')).toBeNull()
  })
})
