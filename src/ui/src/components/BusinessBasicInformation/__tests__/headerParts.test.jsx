import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { businessFixture } from '../../__tests__/helpers/menuTestMocks'
import { cssFor, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { BusinessInfoComponent } from '../BusinessInfoComponent'
import { SocialNetWork } from '../SocialNetWork'
import { BusinessContainer, BusinessInfoItem, TitleWrapper, WrapperBusinessLogo } from '../styles'

// The store's header (components.business_header): the parts the theme hides
// (visibility business.header.*) and its props.

const viewport = vi.hoisted(() => ({ width: 1024, height: 768 }))
vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => viewport
}))
vi.mock('~ui/src/components/BusinessReservation', () => ({ BusinessReservation: () => null }))
vi.mock('~ui/src/components/BusinessStickyHeader', () => ({ BusinessStickyHeader: () => null }))
vi.mock('~ui/src/components/LoginForm', () => ({ LoginForm: () => <div data-testid='login-form' /> }))

const business = {
  ...businessFixture,
  address: 'Main St 1',
  description: 'Best burgers',
  facebook_profile: 'https://facebook.com/demo',
  reviews: { total: 4 },
  delivery_price: 2,
  delivery_time: '00:30'
}

const props = {
  loading: false,
  business,
  categoryState: { products: [] },
  setOpenBusinessInformation: vi.fn(),
  setIsBusinessReviews: vi.fn(),
  setIsPreOrder: vi.fn(),
  handleFavoriteBusiness: vi.fn()
}

const PARTS = ['logo', 'favorite', 'social', 'address', 'description', 'info', 'fee']

const hiddenTheme = themeWithValues((values) => {
  PARTS.forEach((part) => { values.visibility[`business.header.${part}`] = false })
  return values
})

// What of the header is painted.
const parts = (container) => ({
  logo: !!container.querySelector('[style*="logo.png"]'),
  favorite: !!container.querySelector('[data-testid^="icon-heart"], button[aria-pressed]'),
  social: !!container.querySelector('a[href="https://facebook.com/demo"], [data-testid="icon-facebook"]'),
  address: !!container.querySelector('.address'),
  description: !!container.querySelector('.description'),
  info: !!container.querySelector('[data-doc-control="business-information"]'),
  fee: /Delivery fee|Service fee|DELIVERY_FEE|SERVICE_FEE/.test(container.textContent)
})

const ALL = Object.fromEntries(PARTS.map((part) => [part, true]))
const NONE = Object.fromEntries(PARTS.map((part) => [part, false]))

beforeEach(() => {
  viewport.width = 1024
})

describe('store header: the parts the theme hides (visibility business.header.*)', () => {
  it('by default: every part', () => {
    expect(parts(renderWithProviders(<BusinessInfoComponent {...props} />, { theme: themeWithValues() }).container)).toEqual(ALL)
  })

  it('hides each part the theme hides', () => {
    expect(parts(renderWithProviders(<BusinessInfoComponent {...props} />, { theme: hiddenTheme }).container)).toEqual(NONE)
  })

  it('without the fee and the time the data line goes away', () => {
    const theme = themeWithValues((values) => {
      values.visibility['business.header.fee'] = false
      values.visibility['business.header.time'] = false
      return values
    })
    const { container } = renderWithProviders(<BusinessInfoComponent {...props} />, { theme })
    expect(container.querySelector('[data-testid="business-data-line"]')).toBeNull()
  })
})

describe('store header: the logo (visibility business.header.logo, hidden on phones by default)', () => {
  const logoShown = (theme) => !!renderWithProviders(<BusinessInfoComponent {...props} />, { theme }).container.querySelector('[style*="logo.png"]')
  const realWidth = window.innerWidth
  const atWidth = (width) => {
    viewport.width = width
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
  }
  afterEach(() => atWidth(realWidth))

  it('one key: shown from 576px, hidden below (its platforms.mobile_web default)', () => {
    atWidth(375)
    expect(logoShown(themeWithValues())).toBe(false)
    atWidth(600)
    expect(logoShown(themeWithValues())).toBe(true)
    atWidth(1024)
    expect(logoShown(themeWithValues())).toBe(true)
  })

  it('the theme shows it on phones too (platforms.mobile_web.visibility), or hides it on wider screens', () => {
    atWidth(375)
    expect(logoShown(themeWithValues((values) => {
      values.platforms.mobile_web.visibility['business.header.logo'] = true
      return values
    }))).toBe(true)
    atWidth(1024)
    expect(logoShown(themeWithValues((values) => {
      values.visibility['business.header.logo'] = false
      return values
    }))).toBe(false)
  })
  it('the logo of mobile_web below 576px', () => {
    const theme = themeWithValues((values) => {
      values.platforms.mobile_web.components.business_header.base.logo_size = 56
      return values
    })
    const { getByTestId } = renderWith(theme, <WrapperBusinessLogo data-testid='logo' />)
    const css = cssFor(getByTestId('logo'))
    expect(css).toMatch(/width: ?56px/)
    expect(css).toMatch(/min-width: ?576px[^}]*width: ?120px/)
  })
})

describe('store header: props of components.business_header', () => {
  const header = (base, mobile) => themeWithValues((values) => {
    Object.assign(values.components.business_header.base, base)
    if (mobile) Object.assign(values.platforms.mobile_web.components.business_header.base, mobile)
    return values
  })

  it('cover_height (and its mobile_web value) sets the height of the cover', () => {
    const { getByTestId } = renderWith(header({ cover_height: 280 }, { cover_height: 120 }), <BusinessContainer data-testid='cover' />)
    const css = cssFor(getByTestId('cover'))
    expect(css).toMatch(/height: ?280px/)
    expect(css).toMatch(/height: ?120px/)
  })

  it('by default the heights of today (150 and 324)', () => {
    const css = cssFor(renderWith(themeWithValues(), <BusinessContainer data-testid='cover' />).getByTestId('cover'))
    expect(css).toMatch(/height: ?324px/)
    expect(css).toMatch(/height: ?150px/)
  })

  it('overlay_when: only over a closed store by default, always with `always`', () => {
    const open = (theme) => cssFor(renderWith(theme, <BusinessContainer bgimage='cover.png' />).container.firstChild)
    expect(open(themeWithValues())).not.toMatch(/linear-gradient/)
    expect(open(header({ overlay_when: 'always' }))).toMatch(/linear-gradient/)
  })

  it('the name, the address and the description of the theme; the lines of the description', () => {
    const theme = header({ name_color: '#123456', address_color: '#654321', description_lines: 2 })
    const title = cssFor(renderWith(theme, <TitleWrapper data-testid='title'><h1>Store</h1></TitleWrapper>).getByTestId('title'))
    expect(title).toMatch(/color: ?#123456/)
    const item = cssFor(renderWith(theme, <BusinessInfoItem data-testid='item' />).getByTestId('item'))
    expect(item).toMatch(/color: ?#654321/)
    expect(item).toMatch(/-webkit-line-clamp: ?2/)
  })

  it('by default the description keeps its 3 lines', () => {
    const item = cssFor(renderWith(themeWithValues(), <BusinessInfoItem data-testid='item' />).getByTestId('item'))
    expect(item).toMatch(/-webkit-line-clamp: ?3/)
  })

  it('details_separators false: no "·" between the details of the data line', () => {
    const store = { ...business, distance: 3 }
    const { container } = renderWithProviders(
      <BusinessInfoComponent {...props} business={store} />,
      {
        theme: themeWithValues((values) => {
          Object.assign(values.components.business_header.base, { details_separators: false })
          values.visibility['business.header.distance'] = true
          return values
        })
      }
    )
    const dataLine = container.querySelector('[data-testid="business-data-line"]')
    expect(dataLine).not.toBeNull()
    expect(dataLine.textContent).not.toContain('·')
  })

  it('details_separators true (its default): "·" between the details of the data line', () => {
    const store = { ...business, distance: 3 }
    const { container } = renderWithProviders(
      <BusinessInfoComponent {...props} business={store} />,
      {
        theme: themeWithValues((values) => {
          values.visibility['business.header.distance'] = true
          return values
        })
      }
    )
    const dataLine = container.querySelector('[data-testid="business-data-line"]')
    expect(dataLine).not.toBeNull()
    expect(dataLine.textContent).toContain('·')
  })

  it('the social slot changes the look of the social links', () => {
    const solid = themeWithValues((values) => {
      values.components.business_header.slots.social.appearance = 'solid'
      values.components.business_header.slots.social.color = 'primary'
      return values
    })
    const social = <SocialNetWork url='https://example.com' icon={<svg />} label='Facebook' />
    const normal = renderWith(themeWithValues(), social)
    const ghost = normal.getByRole('link', { name: 'Facebook' }).style.getPropertyValue('--ui-button-background')
    normal.unmount()
    const primary = renderWith(solid, social).getByRole('link', { name: 'Facebook' }).style.getPropertyValue('--ui-button-background')
    expect(primary).not.toEqual(ghost)
    expect(primary).toBe(solid.values.components.button.variants.primary.solid.background)
  })
})

describe('store header: the distance, the ribbon and the preorder (visibility business.header.*)', () => {
  const withKeys = (keys) => themeWithValues((values) => {
    Object.assign(values.visibility, keys)
    return values
  })
  const store = {
    ...business,
    distance: 3,
    ribbon: { enabled: true, text: 'New here', color: '#ff0000', shape: 'rectangle' }
  }
  const render = (theme) => renderWithProviders(<BusinessInfoComponent {...props} business={store} />, { theme }).container

  it('by default: no distance and no ribbon (both off), the preorder action', () => {
    const container = render(themeWithValues())
    expect(container.querySelector('.distance')).toBeNull()
    expect(container.textContent).not.toContain('New here')
    expect(container.querySelector('[data-doc-control="business-preorder-entry"]')).not.toBeNull()
  })

  it('distance on: the distance in the data line, beside the fee and the time', () => {
    const container = render(withKeys({ 'business.header.distance': true }))
    expect(container.querySelector('[data-testid="business-data-line"]')).toHaveTextContent('3 mi')
  })

  it('distance on alone keeps the data line when the fee and the time are hidden', () => {
    const container = render(withKeys({
      'business.header.distance': true,
      'business.header.fee': false,
      'business.header.time': false
    }))
    expect(container.querySelector('[data-testid="business-data-line"]')).toHaveTextContent('3 mi')
  })

  it('ribbon on: the store\'s ribbon beside its name (only when the store has one)', () => {
    const theme = withKeys({ 'business.header.ribbon': true })
    expect(render(theme).textContent).toContain('New here')
    const withoutRibbon = renderWithProviders(<BusinessInfoComponent {...props} business={{ ...store, ribbon: { enabled: false, text: 'New here' } }} />, { theme }).container
    expect(withoutRibbon.textContent).not.toContain('New here')
  })

  it('preorder off: no Preorder action', () => {
    const container = render(withKeys({ 'business.header.preorder': false }))
    expect(container.querySelector('[data-doc-control="business-preorder-entry"]')).toBeNull()
    // the other actions stay
    expect(container.querySelector('[data-doc-control="business-information"]')).not.toBeNull()
  })
})

describe('BusinessInfoComponent: the guest\'s favorite', () => {
  it('opens the login in the base dialog, whose close closes it', async () => {
    const { container, findByRole, queryByRole } = renderWithProviders(<BusinessInfoComponent {...props} />, { theme: themeWithValues() })
    fireEvent.click(container.querySelector('button[aria-pressed]'))
    const dialog = await findByRole('dialog')
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    expect(within(dialog).getByTestId('login-form')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })
})
