import React from 'react'
import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { themeControlHeight } from '../../../../../utils/themeTokens'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { HomeHero } from '../index'

const sessionState = vi.hoisted(() => ({
  auth: false,
  loading: false,
  login: vi.fn()
}))

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [{ auth: sessionState.auth, loading: sessionState.loading, user: {} }, { login: sessionState.login }]
}))

const orderState = vi.hoisted(() => ({
  current: { options: { address: {} }, loading: false, carts: {} }
}))

vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => [orderState.current, { refreshOrderOptions: vi.fn() }]
}))

vi.mock('~ui/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ width: 400, height: 800 })
}))
// the window of that phone, for the theme's platform too (below 576px
// themeVisible answers platforms.mobile_web.visibility)
const realInnerWidth = window.innerWidth
const setInnerWidth = (value) => Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value })
beforeAll(() => setInnerWidth(400))
afterAll(() => setInnerWidth(realInnerWidth))

vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ open, children, title, onRemove: authModal }) => (
    open ? <div data-testid={authModal ? 'auth-modal' : 'modal'} data-title={title}>{children}</div> : null
  )
}))
vi.mock('~ui/src/components/AddressForm', () => ({
  AddressForm: () => <div data-testid='address-form' />
}))
vi.mock('~ui/src/components/AddressList', () => ({
  AddressList: () => <div data-testid='address-list' />
}))
vi.mock('~ui/src/components/LoginForm', () => ({
  LoginForm: ({ elementLinkToSignup, elementLinkToForgotPassword }) => (
    <div data-testid='login-form'>
      {elementLinkToSignup}
      {elementLinkToForgotPassword}
    </div>
  )
}))
vi.mock('~ui/src/components/SignUpForm', () => ({
  SignUpForm: () => <div data-testid='signup-form' />
}))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({
  ForgotPasswordForm: () => <div data-testid='forgot-form' />
}))

const withHeroImages = (values) => {
  values.images.home_hero = 'hero.jpg'
  values.images.home_hero_mobile = 'hero-m.jpg'
  // a configured logo: these tests are about the logo's visibility and
  // sizing, not about the white-label-without-a-logo fallback (its own test
  // lives in HomeHero.test.jsx)
  values.images.logotype = 'https://cdn.test/logo.png'
  return values
}

const heroTheme = (mutate = (values) => values) => themeWithValues((values) => mutate(withHeroImages(values)) ?? values)
const setHero = (values, base) => {
  values.components.home_hero.base = { ...values.components.home_hero.base, ...base }
  return values
}
const renderHero = (theme) => renderWithProviders(<HomeHero onFindBusiness={vi.fn()} />, { theme })
const flat = (text) => text.replace(/\s+/g, '')

describe('HomeHero with the theme (home_hero, pages.home)', () => {
  beforeEach(() => {
    sessionState.auth = false
    orderState.current = { options: { address: {} }, loading: false, carts: {} }
  })

  it('the "Use your account" block is the login_account section of the home', () => {
    const shown = renderHero(heroTheme())
    expect(shown.getByText('Use your account')).toBeInTheDocument()
    shown.unmount()
    const hidden = renderHero(heroTheme((values) => {
      values.pages.home = { footer: null, sections: [{ key: 'login_account', visible: false }] }
      return values
    }))
    expect(hidden.queryByText('Use your account')).toBeNull()
  })

  it('the title\'s shadow (title_shadow, as a text-shadow; null none), alignment and highlight weight', () => {
    const shadow = { x: 1, y: 2, blur: 5, spread: 9, color: '#123456', opacity: 1 }
    const view = renderHero(heroTheme((values) => setHero(values, { title_shadow: shadow, title_align: 'center', highlight_weight: 700 })))
    const css = flat(cssFor(view.getByRole('heading', { level: 1 })))
    // (its spread left out: a text-shadow has none)
    expect(css).toContain('text-shadow:1px2px5pxrgba(18,52,86,1);')
    expect(css).toContain('text-align:center;')
    expect(css).toMatch(/span\.highlight\{[^}]*text-shadow:1px2px5pxrgba\(18,52,86,1\);[^}]*font-weight:700;/)
    view.unmount()
    const none = renderHero(heroTheme((values) => setHero(values, { title_shadow: null })))
    expect(flat(cssFor(none.getByRole('heading', { level: 1 })))).toContain('text-shadow:none;')
  })

  it('min_height, padding_x and content_align of the hero', () => {
    const view = renderHero(heroTheme((values) => setHero(values, { min_height: 500, padding_x: 24, content_align: 'center' })))
    const hero = view.container.querySelector('[data-doc-section="website-home-hero"]')
    expect(flat(cssFor(hero))).toContain('min-height:500px;')
    const title = view.getByRole('heading', { level: 1 })
    const content = title.parentElement
    expect(flat(cssFor(content.parentElement))).toContain('padding:024px;')
    expect(flat(cssFor(content))).toMatch(/@media\(min-width:768px\)\{[^{]*\.input-wrapper\{[^}]*[^-]justify-content:center;/)
  })

  it('the address field (field_max_width, field_icon_color, field_text with its mobile_web, field_text_color)', () => {
    const theme = heroTheme((values) => setHero(values, { field_max_width: 600, field_icon_color: '#AA0000', field_text_color: '#00AA00', field_text: { size: 19, line: 1.42, weight: 400 } }))
    const view = renderHero(theme)
    const button = view.container.querySelector('[data-doc-control="website-location-open"]')
    const lane = flat(cssFor(button.parentElement))
    const label = flat(cssFor(button.querySelector('span')))
    expect(lane).toMatch(/@media\(min-width:1024px\)\{[^}]*max-width:600px;/)
    expect(button.style.getPropertyValue('--ui-home-hero-field-icon-color')).toBe('#AA0000')
    expect(label).toContain('color:#00AA00;')
    const mobile = theme.values.platforms.mobile_web.components.home_hero.base.field_text
    expect(label).toContain(`font-size:${mobile.size}px;`)
    expect(label).toMatch(/@media\(min-width:576px\)\{[^{]*\.\w+\{[^}]*font-size:19px;line-height:1\.42;/)
  })

  it('the field is as tall as the search button of its slot (slots.search)', () => {
    const theme = heroTheme((values) => {
      values.components.home_hero.slots.search = { ...values.components.home_hero.slots.search, size: 'md' }
      return values
    })
    const view = renderHero(theme)
    const button = view.container.querySelector('[data-doc-control="website-location-open"]')
    expect(button.style.getPropertyValue('--ui-hero-field-height')).toBe(`${themeControlHeight(theme, 'button', 'md')}px`)
  })

  it('the search button grows with its text from 768px (254px at least) and the field gives it room', () => {
    const view = renderHero(heroTheme())
    const content = flat(cssFor(view.getByRole('heading', { level: 1 }).parentElement))
    // the search button's slot sizes it (the Button fills it); no rule of the row reaches the Button
    const search = view.container.querySelector('[data-doc-control="website-find-businesses"]')
    expect(search).toHaveClass('ui:w-full')
    expect(flat(cssFor(search.parentElement))).toMatch(/@media\(min-width:768px\)\{[^}]*[^-]flex:00auto;min-width:254px;/)
    expect(content).not.toMatch(/button/)
    const field = flat(cssFor(view.container.querySelector('[data-doc-control="website-location-open"]').parentElement))
    expect(field).toContain('width:100%;min-width:0;')
  })

  it('the search button\'s minimum width is the theme\'s (search_min_width)', () => {
    const view = renderHero(heroTheme((values) => setHero(values, { search_min_width: 320 })))
    const slot = flat(cssFor(view.container.querySelector('[data-doc-control="website-find-businesses"]').parentElement))
    expect(slot).toMatch(/@media\(min-width:768px\)\{[^}]*min-width:320px;/)
    expect(slot).not.toContain('min-width:254px')
  })

  it('the search button keeps the side space of its slot\'s size (slots.search)', () => {
    const theme = heroTheme((values) => {
      values.components.home_hero.slots.search = { ...values.components.home_hero.slots.search, size: 'md' }
      return values
    })
    const view = renderHero(theme)
    const button = view.container.querySelector('[data-doc-control="website-find-businesses"]')
    // the base Button: the side space of the slot's size
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).toHaveAttribute('name', 'find-business')
    expect(button.style.getPropertyValue('--ui-button-padding-x')).toBe(`${theme.values.components.button.sizes.md.padding_x}px`)
  })

  it('the account buttons take their slots (login, signup)', () => {
    const theme = heroTheme((values) => {
      values.components.home_hero.slots.signup = { ...values.components.home_hero.slots.signup, color: 'secondary', appearance: 'solid' }
      return values
    })
    const view = renderHero(theme)
    const signup = view.getByText('Sign up').closest('button')
    const login = view.getByText('login').closest('button')
    // the base Button: signup of its slot (secondary solid), login of the default one (primary solid)
    expect(signup).toHaveAttribute('data-slot', 'button')
    expect(login).toHaveAttribute('data-slot', 'button')
    const look = (options) => componentVars(theme, 'button', { size: 'md', ...options })['--ui-button-background']
    expect(signup.style.getPropertyValue('--ui-button-background')).toBe(look({ color: 'secondary', appearance: 'solid' }))
    expect(login.style.getPropertyValue('--ui-button-background')).toBe(look({ color: 'primary', appearance: 'solid' }))
  })

  it('the account title (a section title, section_header) and the logo height (logo_height)', () => {
    const view = renderHero(heroTheme((values) => {
      values.components.section_header.base = { ...values.components.section_header.base, title: { size: 30, line: 1.27, weight: 700 }, title_color: '#334455' }
      return setHero(values, { logo_height: 44 })
    }))
    expect(view.getByText('Use your account')).toHaveStyle({ fontSize: '30px', color: '#334455' })
    // one xl over its buttons (not the fixed 27px)
    expect(flat(cssFor(view.getByText('Use your account')))).toMatch(/margin-bottom:24px;/)
    const logo = flat(cssFor(view.getByAltText('Logo').parentElement))
    expect(logo).toMatch(/img\{[^}]*max-height:44px;/)
  })

  it('the theme hides the logo (home.hero.logo) and the title (home.hero.title, still the h1)', () => {
    const shown = renderHero(heroTheme())
    expect(shown.getByAltText('Logo')).toBeInTheDocument()
    expect(flat(cssFor(shown.getByRole('heading', { level: 1 })))).not.toContain('clip:rect(0000)')
    shown.unmount()

    // a phone: the logo's value there (platforms.mobile_web.visibility)
    const view = renderHero(heroTheme((values) => {
      values.platforms.mobile_web.visibility['home.hero.logo'] = false
      values.visibility['home.hero.title'] = false
      return values
    }))
    expect(view.queryByAltText('Logo')).toBeNull()
    const title = view.getByRole('heading', { level: 1 })
    expect(flat(cssFor(title))).toContain('clip:rect(0000)')
  })

  it('home.hero.logo is one key: on wide screens hidden by default, shown when the theme turns it on', () => {
    setInnerWidth(1024)
    try {
      const hidden = renderHero(heroTheme())
      expect(hidden.queryByAltText('Logo')).toBeNull()
      hidden.unmount()
      const shown = renderHero(heroTheme((values) => {
        values.visibility['home.hero.logo'] = true
        return values
      }))
      expect(shown.getByAltText('Logo')).toBeInTheDocument()
      // it heads the content from 576px, on the title's side
      expect(flat(cssFor(shown.getByAltText('Logo').parentElement))).toMatch(/@media\(min-width:576px\)\{[^}]*justify-content:flex-start;/)
    } finally {
      setInnerWidth(400)
    }
  })
})
