import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// setupTests.js mocks LoginForm/styles globally: these tests need the real CSS.
const { RedirectLink, ResendCode } = await vi.importActual('~ui/src/components/LoginForm/styles')
const { RedirectLink: SignUpRedirectLink } = await vi.importActual('~ui/src/components/SignUpForm/styles')

// A complete theme with a components.link easy to spot
const withLink = () => themeWithValues((values) => {
  values.components.link = {
    base: { color: '#1A2B3C', underline: 'hover' },
    sizes: { md: { text: { size: 14, line: 1.43, weight: 600, family: 'archivo' } } },
    variants: { default: { states: { pressed: { opacity: 0.85 }, disabled: { color: '#B1BCCC' } } } }
  }
  return values
})

// CSS of the wrapper's generated class (its last class is 'new-account').
const redirectCss = (el) => {
  const cls = [...el.classList].filter((c) => c !== 'new-account').pop()
  return injectedCss().split('}').filter((rule) => rule.includes(`.${cls}`)).join('}')
}

const renderRedirect = (theme) => renderWith(theme, (
  <RedirectLink className='new-account'>
    <span>New on My Site?</span>
    <a href='#'>Sign up</a>
  </RedirectLink>
))

describe('the sign up / login block shares the form\'s axis', () => {
  it.each([['Login', RedirectLink], ['Sign up', SignUpRedirectLink]])('%s: narrower than the form, centered on it; the sentence\'s space only beside the link', (_, Link) => {
    const { getByText } = renderWith(themeWithValues(), (
      <Link register className='new-account'><span>New on My Site?</span><a href='#'>Sign up</a></Link>
    ))
    const css = redirectCss(getByText('Sign up').parentElement).replace(/\s+/g, '')
    expect(css).toMatch(/margin-inline:auto;/)
    // the space after the sentence is only inside the row layout, where sentence and link share a line
    expect(css).not.toMatch(/(^|\})&?[^{}]*span\{[^}]*margin-inline-end/)
    expect(css).toMatch(/@media\(min-width:425px\)\{[^}]*span\{margin-inline-end:/)
  })
})

describe('LoginForm links (components.link)', () => {
  it('the Sign up link takes components.link, not the forced links color', () => {
    const { getByText } = renderRedirect(withLink())
    const css = redirectCss(getByText('Sign up').parentElement)
    expect(css).toMatch(/ a\{[^}]*color:#1A2B3C;/)
    expect(css).toMatch(/ a:hover\{[^}]*text-decoration:underline;/)
    expect(css).not.toContain('!important')
  })

  it('the plain links of the wrapper are of components.link\'s color, not primary_text', () => {
    const theme = themeWithValues((values) => {
      values.components.link.base.color = '#1A2B3C'
      values.tokens.color.primary_text = '#123456'
      return values
    })
    const { getByText } = renderRedirect(theme)
    const css = redirectCss(getByText('Sign up').parentElement).replace(/\s+/g, '')
    expect(css).toMatch(/a\{[^}]*color:#1A2B3C;/)
    expect(css).not.toContain('#123456')
  })

  it('"Send again" is a button of components.link (disabled while the code is valid)', () => {
    const { getByText } = renderWith(withLink(), <ResendCode disabled>Send again?</ResendCode>)
    const resend = getByText('Send again?')
    expect(resend.tagName).toBe('BUTTON')
    expect(resend).toHaveAttribute('type', 'button')
    expect(resend).toBeDisabled()
    expect(resend.style.getPropertyValue('--ui-link-color')).toBe('#1A2B3C')
    expect(resend.style.getPropertyValue('--ui-link-disabled-color')).toBe('#B1BCCC')
  })
})
