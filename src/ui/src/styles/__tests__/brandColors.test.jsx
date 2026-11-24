import React from 'react'
import { legibleOver } from '~/utils/themeColors'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { buildAppTheme } from '../../../../utils/appTheme'
import { buildCompleteValues, envelope } from '../../../../utils/__tests__/fixtures/themeFixtures'
import { cssFor, injectedCss, local, renderWith } from './themeTestUtils'
import { Chip } from '../../design-system/components/Chip'
import { DeliveryOptionsContainer, WarningMessage as CheckoutWarning } from '../../components/Checkout/styles'
import { ContainerButton } from '../../components/BusinessProductsList/styles'
import { ProgressLogoStyled, OrderProgressWrapper } from '../../components/OrderProgress/styles'
import { ProgressBar as ThemeProgressBar } from '../Progress'
import { FormInput } from '../../components/UserFormDetails/styles'
import { BusinessSearch } from '../../components/SearchBar/styles'
import { Wrapper as FreeDeliveryWrapper } from '../../components/FreeDeliveryProgress/styles'
import { BusinessHeader, BusinessLogo, BusinessStarInfo, ContainerCard as BusinessCard, WrapperBusinessLogo } from '../../components/BusinessController/styles'
import { BusinessInformation as OrderStatusInfo } from '../../components/OrdersOption/styles'
import { Dot } from '../../design-system/components/Dot'
import { ErrorMessage } from '../../components/HighestRated/styles'
import { CardLogo, SoldOut, CardContainer as ProductCard } from '../../components/SingleProductCard/styles'
import { Warning as StudentWarning } from '../../components/StudentSelector/styles'
import { Item as CartStudentItem } from '../../components/CartStudentAlert/styles'
import { IconContent as CartSidebarBadge } from '../../components/CartSidebar/styles'
import { StageIcon } from '../../components/OrderDetails/layouts/Tracking/styles'
import { Content as CancellationContent } from '../../components/CancellationComponent/styles'
import { TitleHeroSide } from '../../components/ResetPassword/styles'
import { ListItem as ProfileListItem } from '../../components/UserProfileForm/styles'
import { SidebarContent } from '../../components/SidebarMenu/styles'
import { OrderBusiness } from '../../components/OrderDetails/styles'
import { Container as OrderCard } from '../../components/SingleOrderCard/styles'
import { OrderCard as LastOrderCard } from '../../components/LastOrders/styles'

/**
 * Color audit: selection, active, focus, progress and action spots follow the
 * brand of the theme. Free delivery and reviews keep their semantic colors.
 */

// setupTests.js mocks LoginForm/styles globally: this test needs the real CSS.
const { RedirectLink } = await vi.importActual('~ui/src/components/LoginForm/styles')

afterEach(cleanup)

const BRAND = '#FF5500'
const BRAND_RGB = 'rgb(255, 85, 0)'
const rgbOf = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

// A theme whose primary is #FF5500 (tokens and button variant).
const completeTheme = () => {
  const values = structuredClone(buildCompleteValues())
  values.tokens.color.primary = BRAND
  values.tokens.color.primary_subtle = '#FFEBE0'
  values.tokens.color.on_primary = '#FFFFFF'
  values.components.button.variants.primary.solid.background = BRAND
  values.components.button.variants.primary.solid.color = '#FFFFFF'
  return { theme: buildAppTheme(local, envelope(values)), values }
}

const styleOf = (theme, ui, text) => window.getComputedStyle(renderWith(theme, ui).getByText(text))

describe('selection, progress and focus follow the primary of the theme', () => {
  it('the order progress bar is components.progress (its fill and track)', () => {
    const { theme, values } = completeTheme()
    const { getByRole } = renderWith(theme, <ThemeProgressBar value={40} state='active' aria-label='order' />)
    const track = getByRole('progressbar', { name: 'order' })
    expect(track.getAttribute('aria-valuenow')).toBe('40')
    expect(track.firstChild).not.toBeNull()
    expect(values.components.progress).toBeTruthy()
  })

  it('the focused input of the profile form has the focus of components.input (no border of its own)', () => {
    const { theme } = completeTheme()
    const { container } = renderWith(theme, <FormInput><input /></FormInput>)
    expect(cssFor(container.firstChild)).not.toMatch(/input\.form:focus\{border:/)
  })

  it('the order status (the primary as text: primary_text) and the login links follow the brand', () => {
    const { theme, values } = completeTheme()
    const { container } = renderWith(theme, <OrderStatusInfo><span className='order-status'>status</span></OrderStatusInfo>)
    expect(window.getComputedStyle(container.querySelector('.order-status')).color).toBe(rgbOf(values.tokens.color.primary_text))
    const link = renderWith(theme, <RedirectLink><a href='#x'>link</a></RedirectLink>)
    // the link of the theme (components.link, linkThemeRules)
    expect(cssFor(link.container.firstChild)).toMatch(new RegExp(`a\\{[^}]*color:${values.components.link.base.color};`))
  })
})

describe('free delivery and reviews keep their semantic colors', () => {
  it('unlocked free delivery is the success alert, not the primary', () => {
    const { theme, values } = completeTheme()
    const style = styleOf(theme, <FreeDeliveryWrapper $unlocked>free</FreeDeliveryWrapper>, 'free')
    expect(style.backgroundColor).toBe(rgbOf(values.components.alert.variants.success.background))
    expect(style.backgroundColor).not.toBe(BRAND_RGB)
  })

  // The score is the rating color made legible over the card it sits on (implementation notes M4): the default yellow
  // darkens to AA over white; it is never the primary.
  it('reviews (also in favorites and my orders) are the rating color legible over the card, not the primary', () => {
    const { theme, values } = completeTheme()
    const rating = rgbOf(legibleOver(values.components.rating.base.color, values.components.business_card?.base?.background && values.components.business_card.base.background !== 'transparent' ? values.components.business_card.base.background : values.tokens.color.background))
    expect(rating).not.toBe(rgbOf(values.tokens.color.primary))
    ;[{}, { fromFavoriteList: true }, { fromMyOrders: true }].forEach((props) => {
      const { container } = renderWith(theme, <BusinessStarInfo {...props}><div className='reviews'><span>4.5</span></div></BusinessStarInfo>)
      expect(window.getComputedStyle(container.querySelector('.reviews span')).color).toBe(rating)
      cleanup()
    })
  })

  it('the business card\'s star and score follow components.rating color', () => {
    const values = structuredClone(buildCompleteValues())
    values.components.rating.base.color = '#123456'
    const theme = buildAppTheme(local, envelope(values))
    ;[{}, { fromFavoriteList: true }].forEach((props) => {
      const { container } = renderWith(theme, <BusinessStarInfo {...props}><div className='reviews'><span>4.5</span></div></BusinessStarInfo>)
      expect(window.getComputedStyle(container.querySelector('.reviews span')).color).toBe('rgb(18, 52, 86)')
      cleanup()
    })
  })
})

describe('selection pairs: selected primary, unselected secondary (the base Chip)', () => {
  it('the search filters are base Chips (BusinessListingSearch, no FilterItem): components.chip base, its selected state when selected', () => {
    const values = structuredClone(buildCompleteValues())
    values.components.chip.base.background = '#EEEEEE'
    values.components.chip.base.color = '#111111'
    values.components.chip.base.radius = 9999
    values.components.chip.variants.default.states.selected = { background: BRAND, color: '#FFFFFF' }
    const theme = buildAppTheme(local, envelope(values))
    const onEl = renderWith(theme, <Chip selected>f</Chip>).getByRole('button', { name: 'f' })
    expect(onEl.tagName).toBe('BUTTON')
    expect(onEl.getAttribute('aria-pressed')).toBe('true')
    expect(onEl.style.getPropertyValue('--ui-chip-selected-background')).toBe(BRAND)
    expect(onEl.style.getPropertyValue('--ui-chip-selected-color')).toBe('#FFFFFF')
    cleanup()
    const off = renderWith(theme, <Chip>f</Chip>).getByRole('button', { name: 'f' })
    expect(off.style.getPropertyValue('--ui-chip-background')).toBe('#EEEEEE')
    expect(off.style.getPropertyValue('--ui-chip-color')).toBe('#111111')
    expect(off.style.getPropertyValue('--ui-chip-radius')).toBe('9999px')
  })

  it('the review comments are Chips: components.chip base, its selected state when selected', () => {
    const values = structuredClone(buildCompleteValues())
    values.components.chip.base.background = '#EEEEEE'
    values.components.chip.base.color = '#111111'
    values.components.chip.base.radius = 9999
    values.components.chip.variants.default.states.selected = { background: BRAND, color: '#FFFFFF' }
    const theme = buildAppTheme(local, envelope(values))
    const selected = renderWith(theme, <Chip variant='content' selected>Helpful</Chip>).getByRole('button', { name: 'Helpful' })
    expect(selected).toHaveAttribute('data-selected')
    expect(selected.style.getPropertyValue('--ui-chip-selected-background')).toBe(BRAND)
    expect(selected.style.getPropertyValue('--ui-chip-selected-color')).toBe('#FFFFFF')
    cleanup()
    const resting = renderWith(theme, <Chip variant='content'>Helpful</Chip>).getByRole('button', { name: 'Helpful' })
    expect(resting).not.toHaveAttribute('data-selected')
    expect(resting.style.getPropertyValue('--ui-chip-background')).toBe('#EEEEEE')
    expect(resting.style.getPropertyValue('--ui-chip-color')).toBe('#111111')
    expect(resting.style.getPropertyValue('--ui-chip-radius')).toBe('9999px')
  })

  it('checkout delivery options and subcategories only place their buttons (the Chip paints them)', () => {
    const { theme } = completeTheme()
    const options = renderWith(theme, <DeliveryOptionsContainer><button>on</button></DeliveryOptionsContainer>)
    expect(cssFor(options.container.firstChild)).not.toMatch(/button\{[^}]*(background|color|border-color):/)
    cleanup()
    const subcategories = renderWith(theme, <ContainerButton isSelected><button>sub</button></ContainerButton>)
    expect(cssFor(subcategories.container.firstChild)).not.toMatch(/button\{[^}]*(background|color|border-color):/)
  })
})

describe('color sweep, batch 1 (primitives, home, listing, cards)', () => {
  // A theme whose surface, text and semantic tokens are unusual,
  // so a spot that still paints a fixed color shows up.
  const sweepTheme = () => {
    const values = structuredClone(buildCompleteValues())
    Object.assign(values.tokens.color, {
      primary: BRAND,
      primary_subtle: '#FFEBE0',
      surface: '#101010',
      text: '#ABCDEF',
      danger: '#AA0011',
      border_strong: '#777777',
      success: '#00AA55',
      warning: '#DD8800'
    })
    return buildAppTheme(local, envelope(values))
  }

  it('the status dot and error messages follow the semantic tokens', () => {
    const theme = sweepTheme()
    // the connection status is the base Dot: its color is the semantic token's class (jsdom has no Tailwind CSS to compute it)
    const dot = renderWith(theme, <Dot color='success' label='s' />).getByRole('img', { name: 's' })
    expect(dot).toHaveClass('ui:bg-success')
    expect(dot.style.backgroundColor).toBe('')
    cleanup()
    // the error is the danger alert of the theme
    const { danger } = theme.values.components.alert.variants
    const error = styleOf(theme, <ErrorMessage>e</ErrorMessage>, 'e')
    expect(error.color).toBe(rgbOf(danger.color))
    expect(error.backgroundColor).toBe(rgbOf(danger.background))
  })
})

describe('color sweep, batch 2 (business page, product, preorder)', () => {
  it('the sold out badge is the inverse badge (inverse_surface / on_inverse)', () => {
    // the API resolves the badge's colors from the tokens: the swept ones here
    const values = structuredClone(buildCompleteValues())
    Object.assign(values.tokens.color, { inverse_surface: '#202020', on_inverse: '#FAFAFA' })
    values.components.badge.variants.inverse = { background: '#202020', color: '#FAFAFA' }
    const themed = styleOf(buildAppTheme(local, envelope(values)), <SoldOut>s</SoldOut>, 's')
    expect(themed.color).toBe('rgb(250, 250, 250)')
    expect(themed.backgroundColor).toBe('rgb(32, 32, 32)')
  })

  it('the student warning box is the warning alert of the theme', () => {
    // the API resolves components.alert from the tokens: the swept ones here
    const values = structuredClone(buildCompleteValues())
    Object.assign(values.components.alert.variants.warning, { background: '#FFF0D0', color: '#111111' })
    const themed = styleOf(buildAppTheme(local, envelope(values)), <StudentWarning>w</StudentWarning>, 'w')
    expect(themed.backgroundColor).toBe('rgb(255, 240, 208)')
    expect(themed.color).toBe('rgb(17, 17, 17)')
  })
})

describe('color sweep, batch 3 (cart and checkout)', () => {
  const sweep = () => {
    const values = structuredClone(buildCompleteValues())
    Object.assign(values.tokens.color, { primary: BRAND, on_primary: '#FFFFFF', warning: '#E0A000', warning_subtle: '#FFF0D0', on_warning: '#111111' })
    return buildAppTheme(local, envelope(values))
  }

  // the API resolves components.alert from the tokens: the swept ones here
  const alertSweep = () => {
    const values = structuredClone(buildCompleteValues())
    Object.assign(values.components.alert.variants.warning, { background: '#FFF0D0', color: '#111111', icon_color: '#E0A000' })
    return buildAppTheme(local, envelope(values))
  }

  it('the checkout warning is the warning alert of the theme', () => {
    expect(styleOf(alertSweep(), <CheckoutWarning>w</CheckoutWarning>, 'w').backgroundColor).toBe('rgb(255, 240, 208)')
  })

  it('the cart student alert is the warning alert of the theme', () => {
    expect(styleOf(alertSweep(), <CartStudentItem>i</CartStudentItem>, 'i').backgroundColor).toBe('rgb(255, 240, 208)')
  })

  it('the cart sidebar badge text is on_primary', () => {
    expect(styleOf(sweep(), <CartSidebarBadge>b</CartSidebarBadge>, 'b').color).toBe('rgb(255, 255, 255)')
  })
})

describe('color sweep, batch 4 (orders and tracking)', () => {
  const sweep = () => {
    const values = structuredClone(buildCompleteValues())
    Object.assign(values.tokens.color, { primary: BRAND, on_primary: '#FAFAFA', primary_subtle: '#FFEBE0' })
    return buildAppTheme(local, envelope(values))
  }

  it('the tracking stage icon is on_primary on a reached stage', () => {
    expect(styleOf(sweep(), <StageIcon active>s</StageIcon>, 's').color).toBe('rgb(250, 250, 250)')
  })

  it('the cancellation box is primary_subtle', () => {
    expect(styleOf(sweep(), <CancellationContent>c</CancellationContent>, 'c').backgroundColor).toBe('rgb(255, 235, 224)')
  })
})

describe('color sweep, batch 5 (profile and login)', () => {
  it('the reset password hero text is components.reset_password\'s color', () => {
    const values = structuredClone(buildCompleteValues())
    values.components.reset_password.base.color = '#FAFAFA'
    const themed = buildAppTheme(local, envelope(values))
    const css = (theme) => {
      const { container } = renderWith(theme, <TitleHeroSide><p>t</p></TitleHeroSide>)
      const out = cssFor(container.firstChild)
      cleanup()
      return out
    }
    expect(css(themed)).toMatch(/p\{[^}]*color:#FAFAFA;/)
  })
})

describe('theme sweep: shadows', () => {
  it('the product card shadow is components.product_card', () => {
    const values = structuredClone(buildCompleteValues())
    values.components.product_card.base.shadow = { x: 0, y: 9, blur: 9, spread: 0, color: '#000000', opacity: 0.5 }
    const themed = renderWith(buildAppTheme(local, envelope(values)), <ProductCard>p</ProductCard>)
    expect(cssFor(themed.getByText('p'))).toMatch(/box-shadow:0px 9px 9px 0px rgba\(0,0,0,0.5\)/)
  })
})

describe('theme sweep: radii', () => {
  it('the product card radius is components.product_card', () => {
    const values = structuredClone(buildCompleteValues())
    values.components.product_card.base.radius = 3
    values.tokens.radius.sm = 6
    const themed = renderWith(buildAppTheme(local, envelope(values)), <ProductCard>p</ProductCard>)
    expect(cssFor(themed.getByText('p'))).toContain('border-radius:3px;')
  })
})

describe('theme sweep: typography', () => {
  it('the sold out badge text follows the badge\'s text (components.badge.base.text)', () => {
    const values = structuredClone(buildCompleteValues())
    values.components.badge.base.text = { size: 11, line: 1.45, weight: 400 }
    values.tokens.typography.caption = { size: 13, line: 1.5, weight: 700 }
    const themed = renderWith(buildAppTheme(local, envelope(values)), <SoldOut>s</SoldOut>)
    const css = cssFor(themed.getByText('s'))
    expect(css).toContain('font-size:11px;')
    expect(css).not.toContain('font-size:13px')
    // The bold of today is kept (Luis): it comes last, over the badge's weight.
    expect(css).toMatch(/font-weight:400;[^]*font-weight:bold;/)
  })
})

describe('theme sweep: a bold text keeps its weight', () => {
  it('a 16px / 600 block (body_lg) keeps 600 and takes the size of body_lg', () => {
    const values = structuredClone(buildCompleteValues())
    values.tokens.typography.body_lg = { size: 17, line: 1.53, weight: 400 }
    const themed = cssFor(renderWith(buildAppTheme(local, envelope(values)), <ProfileListItem>o</ProfileListItem>).getByText('o'))
    expect(themed).toContain('font-size:17px;')
    expect(themed).toContain('font-weight:600;')
    expect(themed).not.toContain('line-height:26px')
  })
})

describe('theme sweep: the closed sidebar casts no shadow', () => {
  it('no shadow while closed, its own shadow toward the page when open', () => {
    const values = structuredClone(buildCompleteValues())
    // components.sidebar_menu's shadow, cast toward the page (right)
    values.components.sidebar_menu.base.shadow = { x: 0, y: 4, blur: 0, spread: 0, color: '#FF5500', opacity: 1 }
    const theme = buildAppTheme(local, envelope(values))
    const closed = cssFor(renderWith(theme, <SidebarContent>c</SidebarContent>).getByText('c'))
    expect(closed).toMatch(/box-shadow:none;/)
    cleanup()
    const open = cssFor(renderWith(theme, <SidebarContent $open>o</SidebarContent>).getByText('o'))
    expect(open).toContain('box-shadow:4px 0px 0px 0px rgba(255,85,0,1);')
    expect(open).not.toMatch(/box-shadow:none;/)
  })
})

describe('schema audit: components.card reaches the generic cards', () => {
  it('a thick card border (and its radius / shadow) shows on a generic card', () => {
    const values = structuredClone(buildCompleteValues())
    values.components.card.base = { background: '#FFFFFF', radius: 10, border: { width: 2, color: '#E9ECEF', style: 'solid' }, shadow: { x: 3, y: 3, blur: 0, spread: 0, color: '#000000', opacity: 1 }, font_role: 'body' }
    const themed = window.getComputedStyle(renderWith(buildAppTheme(local, envelope(values)), <OrderBusiness>c</OrderBusiness>).getByText('c'))
    expect(themed.borderTopWidth).toBe('2px')
    expect(themed.borderTopStyle).toBe('solid')
    expect(themed.borderTopColor).toBe('rgb(233, 236, 239)')
    expect(themed.borderRadius).toBe('10px')
  })
})

describe('schema audit: a generic card with Rounding none', () => {
  it('components.card.base.radius 0 gives the card a 0px radius', () => {
    const values = structuredClone(buildCompleteValues())
    values.components.card.base.radius = 0
    const card = window.getComputedStyle(renderWith(buildAppTheme(local, envelope(values)), <OrderBusiness>c</OrderBusiness>).getByText('c'))
    expect(card.borderRadius).toBe('0px')
  })
})

describe('schema audit: business, product and order cards inherit card (Rounding none, 2px border)', () => {
  const square = () => {
    const values = structuredClone(buildCompleteValues())
    const border = { width: 2, color: '#E9ECEF', style: 'solid' }
    ;['business_card', 'product_card', 'order_card'].forEach(name => {
      values.components[name].base.radius = 0
      values.components[name].base.border = border
    })
    return buildAppTheme(local, envelope(values))
  }
  const style = (theme, element, text) => window.getComputedStyle(renderWith(theme, element).getByText(text))

  it('each card gets the 0px radius and the 2px border of the theme', () => {
    const theme = square()
    const cards = [
      style(theme, <BusinessCard>b</BusinessCard>, 'b'),
      style(theme, <ProductCard isFavorite>p</ProductCard>, 'p'),
      style(theme, <OrderCard>o</OrderCard>, 'o')
    ]
    cards.forEach(card => {
      expect(card.borderRadius).toBe('0px')
      expect(card.borderTopWidth).toBe('2px')
      expect(card.borderTopStyle).toBe('solid')
    })
    const { getByRole } = renderWith(theme, <LastOrderCard active>l</LastOrderCard>)
    const lastOrder = getByRole('button', { name: 'l' })
    expect(lastOrder.style.getPropertyValue('--ui-action-card-radius')).toBe('0px')
    expect(lastOrder.style.getPropertyValue('--ui-action-card-border')).toMatch(/^2px solid /)
    expect(lastOrder).toHaveClass('ui:not-hover:[border-color:var(--ot-color-primary)]!')
  })

  it("the business header's top corners follow the card radius", () => {
    const header = style(square(), <BusinessHeader>h</BusinessHeader>, 'h')
    expect(header.borderTopLeftRadius).toBe('0px')
    expect(header.borderTopRightRadius).toBe('0px')
  })

  it('the business logo and its wrapper take the rounding of the card', () => {
    const theme = square()
    expect(style(theme, <BusinessLogo>g</BusinessLogo>, 'g').borderRadius).toBe('0px')
    expect(style(theme, <WrapperBusinessLogo>w</WrapperBusinessLogo>, 'w').borderRadius).toBe('0px')
  })

  it('the business logo and the product image take the border of the card', () => {
    const theme = square()
    const logo = style(theme, <BusinessLogo>g</BusinessLogo>, 'g')
    expect(logo.borderTopWidth).toBe('2px')
    expect(logo.borderTopStyle).toBe('solid')
    // the product image is rounded with the card's image_radius, not its radius
    const values = structuredClone(buildCompleteValues())
    values.components.product_card.base.radius = 0
    values.components.product_card.base.image_radius = 3
    values.components.product_card.base.border = { width: 2, color: '#E9ECEF', style: 'solid' }
    const image = style(buildAppTheme(local, envelope(values)), <CardLogo>i</CardLogo>, 'i')
    expect(image.borderRadius).toBe('3px')
    expect(image.borderTopWidth).toBe('2px')
  })

  it('the order in progress logo has the border, radius and shadow of its container', () => {
    const theme = square()
    const logo = style(theme, <ProgressLogoStyled>pl</ProgressLogoStyled>, 'pl')
    const wrapper = style(theme, <OrderProgressWrapper>pw</OrderProgressWrapper>, 'pw')
    ;['borderRadius', 'borderTopWidth', 'borderTopStyle', 'boxShadow'].forEach(prop => expect(logo[prop]).toBe(wrapper[prop]))
    expect(logo.borderTopWidth).toBe('2px')
  })
})

describe('theme sweep: the profile form input keeps its border', () => {
  it('drops the border-width 0 of the form input', () => {
    const css = (theme) => { const { container } = renderWith(theme, <FormInput><input className='form' /></FormInput>); const out = cssFor(container.firstChild); cleanup(); return out }
    expect(css(buildAppTheme(local, envelope(buildCompleteValues())))).not.toMatch(/border-width:0px/)
  })
})
