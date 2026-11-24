import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { schemaDefault, schemaKeys } from '../themeSchema'
import { specs } from './fixtures/schemaSpecs'
import { cssFor, renderWith, themeWithValues } from '../../ui/src/styles/__tests__/themeTestUtils'
import {
  authPartnerProps,
  authPasswordToggleCss,
  authRedirectColorCss,
  authSocialProps,
  authSocialVisible,
  authSignupLinkVisible,
  authLoginLinkVisible,
  baseCss,
  signupPromotionsVisible
} from '../authForm'
import { signupBandRatio } from '../signupPage'
import { componentVars } from '~ui/src/design-system/lib/componentVars'

// The auth forms of the theme: the new props and slots of
// components.auth_form, components.signup_page and components.reset_password,
// and the sub-elements visibility may hide.

vi.mock('~components/components/FacebookLoginButton', () => ({
  FacebookLoginButton: ({ UIComponent, ...rest }) => (
    <UIComponent handleFacebookLogin={() => {}} formState={{ loading: false }} {...rest} />
  )
}))

// setupTests.js mocks these styles globally: the real CSS here.
const LoginStyles = await vi.importActual('~ui/src/components/LoginForm/styles')
const SignUpStyles = await vi.importActual('~ui/src/components/SignUpForm/styles')
const VerificationStyles = await vi.importActual('~ui/src/components/UserVerification/styles')
const ForgotStyles = await import('~ui/src/components/ForgotPasswordForm/styles')
const { FacebookLoginButton } = await import('~ui/src/components/FacebookLogin')

describe('schema', () => {
  it('auth_form: the props of its texts, social block and eye, and the slots social and partner', () => {
    // (its title is the page title of components.section_header)
    expect(specs('components.auth_form.base')).toEqual({
      redirect_text: { type: 'text', default: '{typography.body}' },
      redirect_color: { type: 'color', default: '{color.text}' },
      social_icon_size: { type: 'icon', default: '{icon.lg}' },
      social_gap: { type: 'space', default: '{space.md}' },
      social_margin: { type: 'space', default: '{space.xl}' },
      checkbox_label_text: { type: 'text', default: '{typography.body}' },
      checkbox_label_color: { type: 'color', default: '{color.text}' }
    })
    expect(specs('components.auth_form.slots')).toMatchObject({
      social: { type: 'slot', default: { component: 'button', size: 'lg', appearance: 'outline', color: 'neutral', shape: null } },
      partner: { type: 'slot', default: { component: 'button', size: 'md', appearance: 'tonal', color: 'primary', shape: null } }
    })
  })

  it('signup_page: the props of both pages, no layout variants', () => {
    expect(schemaKeys('components.signup_page.base')).toEqual([
      'description_title_text', 'description_title_color', 'description_title_color_on_page', 'description_text', 'description_color', 'description_color_on_page', 'description_overlay', 'description_gap',
      'form_padding',
      'padding_y', 'padding_x', 'max_width', 'band_ratio'
    ])
    // the page's padding on phones (platforms.mobile_web)
    expect(specs('components.signup_page.platforms.mobile_web')).toEqual({
      padding_y: { type: 'space', default: '{space.xl}' },
      padding_x: { type: 'space', default: '{space.xxl}' }
    })
    expect(schemaDefault('components.signup_page.base.band_ratio')).toBe('16:9')
    expect(schemaKeys('components.signup_page')).not.toContain('variants')
  })

  it('reset_password: the hero of /password/reset', () => {
    expect(specs('components.reset_password.base')).toEqual({
      background: { type: 'color', default: '{color.primary}' },
      color: { type: 'color', default: '{color.on_primary}' },
      text: { type: 'text', default: '{typography.h4}' }
    })
    expect(specs('components.reset_password.platforms.mobile_web')).toEqual({ text: { type: 'text', default: '{typography.body}' } })
  })

  it('visibility: the sub-elements of the auth forms, visible by default', () => {
    ;['auth.social', 'auth.signup_link', 'auth.login_link', 'signup.promotions_optin'].forEach((key) => {
      expect(schemaDefault(['visibility', key])).toBe(true)
    })
  })
})

describe('helpers', () => {
  it('the defaults reproduce today\'s look', () => {
    const theme = themeWithValues()
    const { tokens } = theme.values
    expect(authRedirectColorCss(theme)).toBe(`color: ${tokens.color.text};`)
    // the eye is an icon inside a field: components.input icon_color / icon_size
    expect(authPasswordToggleCss(theme)).toBe(`font-size: ${tokens.icon.md}px;\ncolor: ${tokens.color.text_muted};`)
    expect(authSocialProps(theme)).toEqual({ $size: 'lg', $color: 'neutral', $appearance: 'outline' })
    expect(authPartnerProps(theme)).toEqual({ $size: 'md', $color: 'primary', $appearance: 'tonal' })
    expect(signupBandRatio(theme)).toBe('16 / 9')
  })

  it('baseCss: a mobile_web value over the base when asked', () => {
    const theme = themeWithValues()
    const { body, h4 } = theme.values.tokens.typography
    expect(baseCss(theme, 'reset_password', { text: 'text' })).toContain(`font-size: ${h4.size}px;`)
    expect(baseCss(theme, 'reset_password', { text: 'text' }, { mobile: true })).toContain(`font-size: ${body.size}px;`)
  })

  it('visibility hides each sub-element; shown by default', () => {
    const theme = themeWithValues((values) => {
      ;['auth.social', 'auth.signup_link', 'auth.login_link', 'signup.promotions_optin'].forEach((key) => { values.visibility[key] = false })
      return values
    })
    const helpers = [authSocialVisible, authSignupLinkVisible, authLoginLinkVisible, signupPromotionsVisible]
    expect(helpers.some((fn) => fn(theme))).toBe(false)
    expect(helpers.every((fn) => fn(themeWithValues()))).toBe(true)
  })
})

// A complete theme whose auth_form props (and page title, of section_header)
// are easy to spot
const withAuthForm = (extra = (values) => values) => themeWithValues((values) => {
  values.components.section_header.base = { ...values.components.section_header.base, title_color: '#111111', align: 'end' }
  values.components.section_header.variants.page = {
    ...values.components.section_header.variants.page,
    title: { size: 41, line: 1.24, weight: 700 },
    margin_bottom: 33
  }
  values.components.modal.base = { ...values.components.modal.base, title: { size: 22, line: 1.32, weight: 500 } }
  values.components.auth_form.base = {
    ...values.components.auth_form.base,
    redirect_text: { size: 15, line: 1.53, weight: 400 },
    redirect_color: '#222222',
    social_icon_size: 31,
    social_gap: 21,
    social_margin: 37,
    checkbox_label_text: { size: 13, line: 1.46, weight: 400 },
    checkbox_label_color: '#444444'
  }
  return extra(values)
})

describe('the parts of the forms', () => {
  it('the title of the login, the sign up and the forgot password as a page: the page title of section_header (centered with the form)', () => {
    const theme = withAuthForm()
    ;[LoginStyles.Title, SignUpStyles.Title].forEach((Title) => {
      const { getByText, unmount } = renderWith(theme, <Title>Login</Title>)
      const css = cssFor(getByText('Login'))
      expect(css).toContain('font-size:41px;line-height:1.24;font-weight:700;')
      expect(css).toContain('color:#111111;')
      expect(css).toContain('margin-bottom:33px;')
      expect(css).not.toContain('text-align:end')
      unmount()
    })
    const { container } = renderWith(theme, <ForgotStyles.ForgotPasswordContainer><h1>Forgot</h1></ForgotStyles.ForgotPasswordContainer>)
    const css = cssFor(container.firstChild)
    expect(css).toMatch(/> h1\{[^}]*font-size:41px;[^}]*color:#111111;[^}]*margin-bottom:33px;/)
    // the popup's h2 (a modal with no title row): the modal's title text
    expect(css).toMatch(/> h2\{[^}]*font-size:22px;line-height:1\.32;/)
  })

  it('the sentence of the redirect links (the link stays components.link)', () => {
    const theme = withAuthForm()
    ;[LoginStyles.RedirectLink, SignUpStyles.RedirectLink, ForgotStyles.RedirectLink].forEach((RedirectLink) => {
      const { container, unmount } = renderWith(theme, <RedirectLink register><span>New?</span><a href='#'>Sign up</a></RedirectLink>)
      const css = cssFor(container.firstChild)
      expect(css).toContain('font-size:15px;line-height:1.53;')
      expect(css).toMatch(/ span\{[^}]*color:#222222;/)
      unmount()
    })
  })

  it('the social block: its margin and gap (no space after the last button), one over the other', () => {
    const theme = withAuthForm()
    ;[LoginStyles.SocialButtons, SignUpStyles.SocialButtons].forEach((SocialButtons) => {
      const { container, unmount } = renderWith(theme, <SocialButtons><button type='button'>fb</button></SocialButtons>)
      const css = cssFor(container.firstChild)
      expect(css).toContain('margin-top:37px;')
      // a grid of one column (the buttons are the base Button's: no rule of the block reaches them)
      expect(css).toContain('display:grid;')
      expect(css).not.toMatch(/button\{/)
      expect(css).toContain('gap:21px;')
      expect(css).not.toContain('margin-bottom:21px')
      unmount()
    })
  })

  it('the social icon size reaches the base Button of a social login', () => {
    const theme = withAuthForm()
    const { getByText } = renderWith(theme, <FacebookLoginButton />)
    expect(getByText('Facebook').closest('button').style.getPropertyValue('--ui-auth-form-social-icon-size')).toBe('31px')
  })

  it('the social block in a modal: one over the other on a phone, side by side in equal columns from 576px (login and sign up alike)', () => {
    const theme = withAuthForm()
    ;[LoginStyles.SocialButtons, SignUpStyles.SocialButtons].forEach((SocialButtons) => {
      const { container, unmount } = renderWith(theme, <SocialButtons isPopup><button type='button'>fb</button></SocialButtons>)
      expect(cssFor(container.firstChild)).toMatch(/@media \(min-width:576px\)\{\.[\w-]+\{grid-auto-flow:column;grid-auto-columns:minmax\(0,1fr\);/)
      unmount()
    })
  })

  it('the label of the checkboxes (terms, promotions)', () => {
    const theme = withAuthForm()
    const { container } = renderWith(theme, <SignUpStyles.TermsConditionWrapper><input type='checkbox' /><label>Terms</label></SignUpStyles.TermsConditionWrapper>)
    expect(cssFor(container.firstChild)).toMatch(/ > label\{(font-family:[^;]+;)?font-size:13px;line-height:1\.46;font-weight:400;color:#444444;/)
  })

  it('the title of /verify', () => {
    const theme = withAuthForm()
    const { container } = renderWith(theme, <VerificationStyles.WrapperText><h1>Verification Code</h1></VerificationStyles.WrapperText>)
    expect(cssFor(container.firstChild)).toMatch(/ h1\{[^}]*font-size:41px;[^}]*color:#111111;/)
  })
})

describe('the social logins take slots.social', () => {
  it('the look the slot chose (a solid primary here)', () => {
    const theme = themeWithValues((values) => {
      values.components.auth_form.slots.social = { component: 'button', size: 'lg', appearance: 'solid', color: 'primary', shape: null }
      return values
    })
    const { getByText } = renderWith(theme, <FacebookLoginButton />)
    const button = getByText('Facebook').closest('button')
    expect(button.getAttribute('data-slot')).toBe('button')
    expect(button.style.getPropertyValue('--ui-button-background')).toBe(componentVars(theme, 'button', { size: 'lg', color: 'primary', appearance: 'solid' })['--ui-button-background'])
  })

  it('by default: the neutral outline, no primary fill', () => {
    const theme = themeWithValues()
    const { getByText } = renderWith(theme, <FacebookLoginButton />)
    const vars = getByText('Facebook').closest('button').style
    const neutral = componentVars(theme, 'button', { size: 'lg', color: 'neutral', appearance: 'outline' })
    expect(vars.getPropertyValue('--ui-button-border')).toBe(neutral['--ui-button-border'])
    expect(vars.getPropertyValue('--ui-button-background')).not.toBe(componentVars(theme, 'button', { size: 'lg', color: 'primary', appearance: 'solid' })['--ui-button-background'])
  })
})

describe('the code step and the form spacing', () => {
  it('the countdown is a number (no pointer) and the form gap is its only space', () => {
    const { container } = renderWith(themeWithValues(), <LoginStyles.CountdownTimer><span>9:59</span></LoginStyles.CountdownTimer>)
    const css = cssFor(container.firstChild)
    expect(css).toMatch(/\.[\w-]+\.[\w-]+\{margin:0 auto;\}/)
    expect(css).toMatch(/ span\{[^}]*cursor:auto;/)
  })

  it('"Send again" has no space of its own under it (the form gap)', () => {
    const { container } = renderWith(themeWithValues(), <LoginStyles.ResendCode>Send again?</LoginStyles.ResendCode>)
    expect(container.firstChild).toHaveClass('ui:m-none')
  })

  it('the sign up code step is a column of the form gap, its width', () => {
    const theme = themeWithValues((values) => { values.components.field.base.gap = 14; return values })
    const { container } = renderWith(theme, <SignUpStyles.OtpStep isPopup />)
    const css = cssFor(container.firstChild)
    expect(css).toContain('width:100%;')
    expect(css).toContain('gap:14px;')
  })

  it('forgot password: no space of its own over the form under 992px', () => {
    const { container } = renderWith(themeWithValues(), <ForgotStyles.FormSide />)
    expect(cssFor(container.firstChild)).not.toMatch(/margin-top:(?!0[;}])/)
  })
})
