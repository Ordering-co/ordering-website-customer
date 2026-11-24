import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { schemaDefault, schemaEntry, schemaKeys } from '~/utils/themeSchema'
import { cssFor, injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { BusinessController } from '../index'
import { BusinessContent, BusinessHeader, BusinessHero, BusinessInfo, BusinessName, BusinessTags, Bullet, CallCenterInformationBullet, ContainerCard, Medadata, WrapperBusinessCard, WrapperBusinessLogo, businessCardHeaderHeights, businessCardPadding, businessCardSideSpace } from '../styles'

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

const tight = (css) => css.replace(/\s+/g, '')

const custom = themeWithValues((values) => {
  Object.assign(values.components.business_card.base, {
    padding: 16,
    header_height: 150,
    header_height_listing: 220,
    header_background: '#ABCDEF',
    status: { size: 18, line: 1.22, weight: 700 },
    status_color: '#FAFAFA',
    status_opacity: 0.9,
    name: { size: 22, line: 1.27, weight: 800 },
    name_color: '#112233',
    meta: { size: 13, line: 1.46, weight: 400 },
    meta_lg: { size: 17, line: 1.47, weight: 400 },
    meta_color: '#445566',
    meta_icon_size: 18,
    bullet_color: '#778899',
    logo_shadow: { x: 0, y: 3, blur: 6, spread: 0, color: '#000000', opacity: 0.2 }
  })
  Object.assign(values.platforms.mobile_web.components.business_card.base, { header_height: 120, header_height_listing: 130 })
  values.components.business_card.slots.tag = { component: 'badge', variant: 'success', size: 'md' }
  values.components.business_card.slots.cta = { component: 'button', size: 'lg', appearance: 'outline', color: 'primary', shape: null }
  return values
})

describe('components.business_card in the schema', () => {
  it('the new props keep today\'s look (tokens) and the pieces are slots', () => {
    const base = (prop) => schemaEntry(`components.business_card.base.${prop}`)
    expect(base('padding')).toMatchObject({ type: 'space', value: '{space.md}' })
    expect(base('header_height')).toMatchObject({ type: 'number', value: 140 })
    expect(base('header_height_listing')).toMatchObject({ type: 'number', value: 200 })
    // the phone values are overrides of platforms.mobile_web (below 576px), no props of their own
    expect([...schemaKeys('components.business_card.platforms.mobile_web')].sort()).toEqual(['header_height', 'header_height_listing', 'logo_size'])
    Object.entries({ logo_size: 75, header_height: 145, header_height_listing: 145 }).forEach(([prop, value]) => {
      expect(schemaEntry(`components.business_card.platforms.mobile_web.${prop}`)).toMatchObject({ type: 'number', value })
    })
    expect(base('header_height_mobile')).toBeUndefined()
    expect(base('logo_size_mobile')).toBeUndefined()
    expect(base('name')).toMatchObject({ type: 'text', value: '{typography.h3}' })
    expect(base('meta')).toMatchObject({ type: 'text', value: '{typography.body}' })
    expect(base('meta_lg')).toMatchObject({ type: 'text', value: '{typography.body_lg}' })
    expect(base('logo_shadow')).toMatchObject({ type: 'shadow', value: '{shadow.sm}' })
    expect(schemaDefault('components.business_card.slots.tag')).toEqual({ component: 'badge', variant: 'inverse', size: 'sm' })
    expect(schemaDefault('components.business_card.slots.cta')).toMatchObject({ component: 'button', size: 'md', appearance: 'solid', color: 'secondary' })
  })
})

describe('business card (components.business_card)', () => {
  it('helpers: padding and header heights of the theme', () => {
    expect(businessCardPadding(themeWithValues())).toBe(12)
    expect(businessCardPadding(custom)).toBe(16)
    expect(businessCardHeaderHeights(themeWithValues())).toEqual({ mobile: '145px', mobileListing: '145px', size: '140px', listing: '200px' })
    expect(businessCardHeaderHeights(custom)).toEqual({ mobile: '120px', mobileListing: '130px', size: '150px', listing: '220px' })
  })

  it('the card\'s padding: the card, the ribbon and the header bleed follow it', () => {
    const { container } = renderWithProviders(<BusinessController handleClick={vi.fn()} fromBusinessListing />, { theme: custom })
    // the literal fallback is px-map sm (was 10px); the card's own padding wins after it
    expect(tight(cssFor(container.firstChild))).toMatch(/padding:8px;[^}]*padding:16px;/)
    const ribbon = Array.from(container.querySelectorAll('div')).find((el) => el.textContent === 'New')
    expect(tight(cssFor(ribbon))).toContain('top:16px;left:16px;')
  })

  it('the header: bleed, heights (listing), statuses and the background without an image', () => {
    const withImage = renderWith(custom, (
      <BusinessHeader bgimage='a.png' fromBusinessListing data-testid='h'>
        <p className='closing-soon'>soon</p>
      </BusinessHeader>
    )).getByTestId('h')
    const css = tight(cssFor(withImage))
    // the listing's header height, and its mobile_web value below 576px
    // (doubled class: over the header's own steps at 481px)
    expect(css).toContain('margin:-16px-16px0-16px;width:calc(100%+32px);')
    expect(css).toMatch(/\.([\w-]+)\.\1\{min-height:220px;\}/)
    expect(css).toMatch(/@media\(max-width:575px\)\{\.([\w-]+)\.\1\{min-height:130px;\}/)
    const plain = tight(cssFor(renderWith(custom, <BusinessHeader bgimage='a.png' data-testid='p' />).getByTestId('p')))
    expect(plain).toMatch(/\.([\w-]+)\.\1\{min-height:150px;\}/)
    expect(plain).toMatch(/@media\(max-width:575px\)\{\.([\w-]+)\.\1\{min-height:120px;\}/)
    expect(css).toMatch(/\.closing-soon,\.\w+\.closed\{(font-family:[^;]+;)?font-size:18px;line-height:1\.22;font-weight:700;/)
    expect(css).toMatch(/\.disabled\{color:#FAFAFA;/)
    expect(css).toMatch(/\.closing-soon\{opacity:0\.9;/)
    const noImage = renderWith(custom, <BusinessHeader name='Demo' data-testid='n' />).getByTestId('n')
    const noImageCss = tight(cssFor(noImage))
    expect(noImageCss).toContain('background-color:#ABCDEF;')
    // without an image the statuses keep their dark text (not the color over the image)
    expect(noImageCss).not.toContain('color:#FAFAFA')
  })

  it('the tags are badges of the tag slot', () => {
    const { getByText } = renderWith(custom, <BusinessTags><div><span>Discount</span></div></BusinessTags>)
    // the badge of the slot's variant (success) and size (md: 24px)
    expect(getByText('Discount').closest('[class]')).toBeTruthy()
    const css = tight(cssFor(getByText('Discount').parentElement.parentElement))
    expect(css).toContain('height:24px;')
    expect(css).toContain(`background:${schemaDefault('tokens.color.success')}`)
  })

  it('name, metadata and the logo\'s shadow', () => {
    const name = renderWith(custom, <BusinessName>Demo</BusinessName>).getByText('Demo')
    expect(tight(cssFor(name))).toContain('font-size:22px;line-height:1.27;font-weight:800;color:#112233;')
    const meta = renderWith(custom, <Medadata data-testid='m'><p>10 min</p></Medadata>).getByTestId('m')
    const metaCss = tight(cssFor(meta))
    expect(metaCss).toContain('font-size:13px;line-height:1.46;')
    expect(metaCss).toContain('color:#445566;')
    expect(metaCss).toContain('psvg{font-size:18px;')
    expect(metaCss).not.toContain('.bulletsvg')
    expect(tight(cssFor(renderWith(custom, <Bullet data-testid='b' />).getByTestId('b')))).toContain('color:#778899;')
    const metaLg = renderWith(custom, <Medadata $largeText data-testid='l'><p>x</p></Medadata>).getByTestId('l')
    expect(tight(cssFor(metaLg))).toContain('font-size:17px;line-height:1.47;')
    const logo = renderWith(custom, <WrapperBusinessLogo data-testid='g' />).getByTestId('g')
    expect(tight(cssFor(logo))).toContain('box-shadow:0px3px6px0pxrgba(0,0,0,0.2);')
  })

  it('"Order now" takes the cta slot (favorites list)', () => {
    const { container } = renderWithProviders(<BusinessController handleClick={vi.fn()} fromFavoriteList />, { theme: custom })
    const cta = container.querySelector('.order-now-button')
    expect(cta).toBeInTheDocument()
    const defaults = renderWithProviders(<BusinessController handleClick={vi.fn()} fromFavoriteList />, { theme: themeWithValues() })
    const plain = defaults.container.querySelector('.order-now-button')
    // the base Button, out of the tab order and of the accessibility tree
    ;[cta, plain].forEach((button) => {
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button).toHaveAttribute('aria-hidden', 'true')
      expect(button).toHaveAttribute('tabindex', '-1')
    })
    // another size, color and appearance than the default slot (md, secondary, solid)
    const look = (theme, options) => componentVars(theme, 'button', options)
    const lg = look(custom, { size: 'lg', color: 'primary', appearance: 'outline' })
    const md = look(themeWithValues(), { size: 'md', color: 'secondary', appearance: 'solid' })
    ;['--ui-button-height', '--ui-button-background', '--ui-button-border', '--ui-button-color'].forEach((name) => {
      expect(cta.style.getPropertyValue(name)).toBe(lg[name] ?? '')
      expect(plain.style.getPropertyValue(name)).toBe(md[name] ?? '')
    })
    expect(cta.style.getPropertyValue('--ui-button-height')).toBe(`${schemaDefault('tokens.size.lg')}px`)
    expect(plain.style.getPropertyValue('--ui-button-height')).toBe(`${schemaDefault('tokens.size.md')}px`)
  })
})

describe('business card name (two lines)', () => {
  it('a closed business\'s name is a button: it takes the name\'s two-line clamp (the shared CardLink rule), with the full name as its title', () => {
    const { container } = renderWithProviders(
      <BusinessController handleClick={vi.fn()} isBusinessOpen={false} onPreorderBusiness={vi.fn()} />,
      { theme: themeWithValues() }
    )
    const button = container.querySelector('[data-card-link]')
    expect(button.tagName).toBe('BUTTON')
    const name = button.parentElement
    expect(['H2', 'H3', 'H4']).toContain(name.tagName)
    expect(tight(cssFor(name))).toContain('-webkit-line-clamp:2;')
    expect(name).toHaveAttribute('title', businessFixture.name)
    // the button inherits that clamp (one rule for every card, in CardLink)
    const rules = tight(injectedCss())
    const cls = [...button.classList].pop()
    expect(rules).toContain(`${name.tagName.toLowerCase()}>.${cls}:is(button)`)
    expect(rules).toContain(':is(button){display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:inherit;overflow:hidden;max-width:100%;}')
  })
})

describe('the card is a column (no height formula)', () => {
  const theme = themeWithValues()
  // the element's rules without the vendor prefixes, the spaces only around
  // the punctuation (flex: 1 1 auto stays readable)
  const css = (el) => cssFor(el)
    .replace(/\s*([{};:,>])\s*/g, '$1')
    .replace(/display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;/g, '')
    .replace(/-(webkit|ms)-(flex|box-pack|box-align|box-direction|box-orient|justify-content|align-items)[\w-]*:[^;]*;/g, '')

  it('the card and its wrapper are columns; the header keeps its height, the content takes the rest', () => {
    const card = renderWith(theme, <ContainerCard data-testid='c' />).getByTestId('c')
    expect(css(card)).toContain('display:flex;flex-direction:column;')
    // no cap on its height: what is in it never runs past its edge
    expect(css(card)).not.toMatch(/max-height:3[24]0px/)
    expect(css(renderWith(theme, <WrapperBusinessCard data-testid='w' />).getByTestId('w'))).toContain('flex:1 1 auto;min-height:0;display:flex;flex-direction:column;')
    expect(css(renderWith(theme, <BusinessHero data-testid='h' />).getByTestId('h'))).toContain('flex:none;')
    const content = css(renderWith(theme, <BusinessContent data-testid='k' />).getByTestId('k'))
    expect(content).toContain('flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding-top:8px;') // px-map sm (was 10px)
    expect(content).not.toContain('calc(100%')
    expect(content).not.toContain('max-height')
    // the info takes the content's height: the facts stay at the bottom
    expect(css(renderWith(theme, <BusinessInfo data-testid='i' />).getByTestId('i'))).toContain('flex:1 1 auto;')
  })

  it('the call center card keeps its height as a floor, so a two-line name grows it instead of being cut', () => {
    const customer = renderWith(theme, <ContainerCard isCustomerMode data-testid='m' />).getByTestId('m')
    expect(css(customer)).toContain('min-height:calc(7.5 * 56px);')
    expect(css(customer)).toMatch(/@media \(min-width:481px\)\{\.[\w-]+\{min-height:calc\(6\.8 \* 56px\);/)
    expect(css(customer)).not.toContain('max-height')
    expect(css(customer)).not.toMatch(/[;{]height:calc\(7\.5/)
  })

  it('the theme\'s header heights size the header only, never the content', () => {
    const content = renderWith(custom, <BusinessContent data-testid='k' />).getByTestId('k')
    expect(css(content)).not.toContain('calc(100%')
    const header = renderWith(custom, <BusinessHeader bgimage='h.png' data-testid='h' />).getByTestId('h')
    expect(css(header)).toContain('{min-height:150px;}')
  })

  // every place the card is used: the props each one passes
  const variants = {
    'listing grid (fromBusinessListing)': { fromBusinessListing: true },
    'carousels and appointments (withLogoAndFavorite)': { withLogoAndFavorite: true },
    'custom layout': { isCustomLayout: true },
    'business search': { fromBusinessListing: true, fromBusinessListingSearch: true, nameAs: 'h2' },
    'search map': { fromBusinessListing: true, isShowMap: true },
    favorites: { fromFavoriteList: true },
    'previous orders': { fromMyOrders: true, hideRibbon: true },
    'cart stores': { isCartStore: true },
    'call center': { isCustomerMode: true },
    skeleton: { isSkeleton: true, business: {}, withLogoAndFavorite: true },
    'skeleton of the listing': { isSkeleton: true, business: {}, fromBusinessListing: true }
  }
  Object.entries(variants).forEach(([label, props]) => {
    it(`${label}: the content is the rest of the column, no height formula`, () => {
      const { container } = renderWithProviders(<BusinessController handleClick={vi.fn()} {...props} />, { theme })
      const content = container.querySelector('[class*="BusinessContent-"]')
      expect(content).not.toBeNull()
      expect(css(content)).toContain('flex:1 1 auto;min-height:0;')
      expect(tight(injectedCss())).not.toMatch(/height:calc\(100%-\d+px\)/)
      const card = content.closest('[class*="ContainerCard-"]')
      expect(css(card)).toContain('display:flex;flex-direction:column;')
    })
  })
})

describe('the grid spacing of the card (tokens.space)', () => {
  const spaced = themeWithValues((values) => {
    values.tokens.space.sm = 6
    values.tokens.space.lg = 18
    return values
  })
  const css = (el) => cssFor(el).replace(/\s+/g, '')

  it('its margins are space.sm above and under, space.lg at the sides; the widths take them out', () => {
    expect(businessCardSideSpace(spaced)).toBe('18px')
    const card = css(renderWith(spaced, <ContainerCard data-testid='c' />).getByTestId('c'))
    expect(card).toContain('margin:6px18px;')
    expect(card).toContain('width:calc(100%-2*18px);')
    expect(card).toContain('width:calc(50%-2*18px);')
    expect(card).not.toMatch(/-40px|-37px|10px20px/)
    const map = css(renderWith(spaced, <ContainerCard isShowMap data-testid='m' />).getByTestId('m'))
    expect(map).toContain('margin:18px;')
  })

  it('a card does not lift on hover: no transform of its own, no transition but the theme\'s', () => {
    const card = css(renderWith(spaced, <ContainerCard data-testid='c' />).getByTestId('c'))
    expect(card).not.toContain('translateY')
    expect(card).not.toContain('transition:all')
  })

  it('the call center counts are badges of the theme (success, danger, warning)', () => {
    const view = renderWith(spaced, (
      <>
        <CallCenterInformationBullet $variant='success' data-testid='s'>1</CallCenterInformationBullet>
        <CallCenterInformationBullet $variant='danger' data-testid='d'>2</CallCenterInformationBullet>
        <CallCenterInformationBullet $variant='warning' data-testid='w'>3</CallCenterInformationBullet>
      </>
    ))
    const colors = spaced.values.components.badge.variants
    const style = (id) => window.getComputedStyle(view.getByTestId(id))
    expect(style('s').backgroundColor).toBe(hexToRgb(colors.success.background))
    expect(style('d').backgroundColor).toBe(hexToRgb(colors.danger.background))
    expect(style('w').color).toBe(hexToRgb(colors.warning.color))
    expect(injectedCss()).not.toMatch(/#4CAF50|#E91E63|#FF9800/i)
  })
})

// '#RRGGBB' as the computed style writes it
function hexToRgb (hex) {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}
