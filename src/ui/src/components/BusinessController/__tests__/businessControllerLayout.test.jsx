import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessController } from '../index'
import { BusinessInfo, BusinessInfoItem, ContainerCard, Medadata, BusinessHeader, RibbonBox, WrapperBusinessLogo } from '../styles'

// implementation notesthe card's boxes use the media scale, fluid units and the Dot piece, no fixed px.
const businessFixture = vi.hoisted(() => ({ id: 1, name: 'Demo Store', slug: 'demo-store', logo: 'logo.png', enabled: true, open: true, description: 'Pizza, Burgers' }))

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({ default: () => <div data-testid='skeleton' /> }))
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

const theme = themeWithValues()
const media = theme.values.components.media.base
const size = theme.values.tokens.size
const css = (node) => {
  cleanup()
  const { container } = renderWith(theme, node)
  return cssFor(container.firstChild).replace(/\s+/g, ' ')
}

describe('BusinessController layout', () => {
  it('the call center logo box and its room are the 3xs medium', () => {
    const logo = css(<WrapperBusinessLogo isCustomerMode />)
    expect(logo).toContain(`width:${media['3xs']}px;`)
    expect(logo).toContain(`min-height:${media['3xs']}px;`)
    expect(css(<WrapperBusinessLogo isCustomerMode isSkeleton />)).not.toMatch(/(?:width|height):(65|75)px/)
    expect(css(<BusinessInfo isCustomerMode $logoRoom />)).toContain(`min-height:${media['3xs']}px;`)
  })

  it('the carousel card and the call center heights are fluid', () => {
    expect(css(<ContainerCard hideProductList={false} fromBusinessListingSearch />)).toContain('min-width:min(85%,44ch);')
    expect(css(<ContainerCard isCustomerMode />)).not.toMatch(/(?:350|380|420)px/)
  })

  it('the orders row and the ribbon: a multiple of the control size and a measure in ch', () => {
    expect(css(<BusinessInfoItem fromMyOrders />)).toContain(`min-height:calc(1.25 * ${size.xl}px);`)
    expect(css(<RibbonBox />)).toContain('max-width:min(100%,22ch);')
  })

  it('the closed notice takes its line height from the theme text', () => {
    expect(css(<BusinessHeader bgimage='a.png' />)).not.toContain('35px')
  })

  it('the bullet before the types is a base Dot', () => {
    const { container } = renderWithProviders(<BusinessController fromFavoriteList />, { theme })
    const bullet = container.querySelector('p.bullet [data-slot="dot"]')
    expect(bullet).not.toBeNull()
    expect(bullet.style.getPropertyValue('--ui-dot-size')).toContain('* 3 / 4')
    expect(container.querySelector('p.bullet svg')).toBeNull()
  })

  it('the bullet before the distance on the map is a small Dot', () => {
    const { container } = renderWithProviders(<BusinessController isShowMap businessDistance={1200} />, { theme })
    const dot = container.querySelector('p.business-info-item [data-slot="dot"]')
    expect(dot).not.toBeNull()
    expect(dot.style.getPropertyValue('--ui-dot-size')).toContain('* 3 / 8')
  })
})
