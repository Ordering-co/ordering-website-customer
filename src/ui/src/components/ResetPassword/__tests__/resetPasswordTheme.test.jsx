import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { baseResetPasswordUIProps } from '../../__tests__/helpers/authTestUtils'
import { cssFor, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'

// /password/reset with the theme: its sections (pages
// .reset_password: the hero and the form), the hero of
// components.reset_password and the submit of components.auth_form.

const { resetPropsRef } = vi.hoisted(() => ({ resetPropsRef: { current: null } }))

vi.mock('react-hook-form', () => {
  const { createStableUseFormMock } = require('../../__tests__/helpers/authUiTestMocks.js')
  return createStableUseFormMock()
})
vi.mock('~components/components/ResetPassword', () => ({
  ResetPassword: ({ UIComponent, ...rest }) => (
    <UIComponent {...rest} {...resetPropsRef.current} />
  )
}))
vi.mock('~ui/src/components/LoginForm', () => ({
  LoginForm: () => <div data-testid='login-form-modal' />
}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ children, open }) => (open ? <div data-testid='modal'>{children}</div> : null)
}))

import { ResetPassword } from '../index'

const withSections = (sections, mutate = (values) => values) => themeWithValues((values) => {
  values.pages.reset_password = { ...values.pages.reset_password, sections }
  return mutate(values)
})

const renderReset = (theme, uiProps = {}) => {
  resetPropsRef.current = { ...baseResetPasswordUIProps, ...uiProps }
  const view = renderWithProviders(<ResetPassword code='abc' random='xyz' />, { theme })
  const page = view.container.querySelector('[data-doc-section="password-reset"]')
  return { ...view, page }
}

// The keys of the sides in the order of the page
const order = (page) => [...page.children].map((child) => (child.querySelector('h1') ? 'hero' : child.querySelector('form') ? 'form' : null)).filter(Boolean)

describe('ResetPassword — sections (pages.reset_password)', () => {
  it('by default: the hero, then the form', () => {
    const { page } = renderReset(themeWithValues())
    expect(order(page)).toEqual(['hero', 'form'])
  })

  it('the theme swaps them (the form first)', () => {
    const { page } = renderReset(withSections([{ key: 'form', visible: true }, { key: 'hero', visible: true }]))
    expect(order(page)).toEqual(['form', 'hero'])
  })

  it('the theme hides the hero; the form cannot be hidden', () => {
    const { page, queryByText, getByText } = renderReset(withSections([{ key: 'hero', visible: false }, { key: 'form', visible: false }]))
    expect(order(page)).toEqual(['form'])
    expect(queryByText('Reset your password')).toBeNull()
    expect(getByText('Change password')).toBeInTheDocument()
    // the page keeps its one h1 (the hero's title), only for assistive technology
    const headings = page.querySelectorAll('h1')
    expect(headings).toHaveLength(1)
    expect(headings[0].textContent).toBe('Reset password')
    expect(headings[0].parentElement).toBe(page)
  })

  it('with the hero: no hidden title of its own (one h1)', () => {
    const { page } = renderReset(themeWithValues())
    expect(page.querySelectorAll('h1')).toHaveLength(1)
  })

  it('the form keeps xxl above and below while stacked (any order)', () => {
    const { page } = renderReset(themeWithValues())
    const form = [...page.children].find((child) => child.querySelector('form'))
    expect(cssFor(form)).toMatch(/@media \(max-width:\s*991px\)\s*\{[^}]*margin:\s*32px 0/)
  })

  it('the fields are named by their translated placeholder', () => {
    const { getByLabelText } = renderReset(themeWithValues())
    expect(getByLabelText('New password')).toBeInTheDocument()
    expect(getByLabelText('Confirm Password')).toBeInTheDocument()
  })

})

describe('ResetPassword — the hero (components.reset_password)', () => {
  const hero = (page) => page.querySelector('h1').parentElement.parentElement

  it('by default: the primary background and the on_primary color of the tokens', () => {
    const theme = themeWithValues()
    const { page } = renderReset(theme)
    const css = cssFor(hero(page))
    expect(css).toContain(`background-color:${theme.values.tokens.color.primary};`)
    expect(css).toContain(`color:${theme.values.tokens.color.on_primary};`)
  })

  it('the background, color and texts the theme chose (the title\'s text, the page title of section_header)', () => {
    const theme = themeWithValues((values) => {
      values.components.reset_password.base = {
        ...values.components.reset_password.base,
        background: '#123456',
        color: '#ABCDEF',
        text: { size: 19, line: 1.42, weight: 400 }
      }
      values.components.section_header.variants.page = {
        ...values.components.section_header.variants.page,
        title: { size: 40, line: 1.2, weight: 700 },
        title_color: '#010203'
      }
      return values
    })
    const { page } = renderReset(theme)
    expect(cssFor(hero(page))).toContain('background-color:#123456;')
    const titleCss = cssFor(page.querySelector('h1').parentElement)
    expect(titleCss).toMatch(/ h1\{[^}]*font-size:40px;line-height:1\.2;font-weight:700;[^}]*color:#ABCDEF;/)
    // over the panel, its color is the panel's, not the page title's
    expect(titleCss).not.toContain('#010203')
    expect(titleCss).toMatch(/ p\{[^}]*font-size:19px;line-height:1\.42;/)
  })

})

describe('ResetPassword — "Change password" takes slots.submit', () => {
  const buttonVars = (theme, options) => componentVars(theme, 'button', options)
  const styleOf = (button, name) => button.style.getPropertyValue(name)

  it('the submit slot (primary solid lg by default)', () => {
    const theme = themeWithValues()
    const { getByText } = renderReset(theme)
    const button = getByText('Change password').closest('button')
    const lg = buttonVars(theme, { size: 'lg', color: 'primary', appearance: 'solid' })
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(styleOf(button, '--ui-button-height')).toBe(lg['--ui-button-height'])
    expect(styleOf(button, '--ui-button-background')).toBe(lg['--ui-button-background'])
  })

  it('the slot the theme chose', () => {
    const theme = themeWithValues((values) => {
      values.components.auth_form.slots.submit = { component: 'button', size: 'md', appearance: 'outline', color: 'secondary', shape: null }
      return values
    })
    const { getByText } = renderReset(theme)
    const button = getByText('Change password').closest('button')
    const chosen = buttonVars(theme, { size: 'md', color: 'secondary', appearance: 'outline' })
    expect(styleOf(button, '--ui-button-height')).toBe(chosen['--ui-button-height'])
    expect(styleOf(button, '--ui-button-border')).toBe(chosen['--ui-button-border'])
    expect(styleOf(button, '--ui-button-background')).toBe(chosen['--ui-button-background'])
  })

})

describe('ResetPassword — the logo without one', () => {
  const withName = (name) => withSections(undefined, (values) => ({ ...values, site: { ...values.site, name }, images: { ...values.images, logotype: '', isotype: '' } }))

  it('without a logo, shows the site\'s own name as text, never an image', () => {
    const { container } = renderReset(withName('Wegoo'))
    expect(container.querySelector('img[alt="Logo"]')).toBeNull()
    expect(container.querySelector('[title="Wegoo"]')?.textContent).toBe('Wegoo')
  })

  it('without a logo nor an own name ("My Site"), shows nothing', () => {
    const { container } = renderReset(withName('My Site'))
    expect(container.querySelector('img[alt="Logo"]')).toBeNull()
    expect(container.querySelector('[title="My Site"]')).toBeNull()
  })
})
