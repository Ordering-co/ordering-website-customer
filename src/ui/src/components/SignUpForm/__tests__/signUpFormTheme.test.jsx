import React from 'react'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { getThemeCss } from '~/utils/themeCss'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { baseSignupUIProps } from '../../__tests__/helpers/authTestUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

import { SignUpForm } from '../index'

// The sign up with the theme: the method tabs and the business /
// driver buttons take their slots of components.auth_form, and the theme may
// hide the social logins, the link to log in and the promotions opt-in.

const { signupUIPropsRef, optimizationTuple, configTuple } = vi.hoisted(() => {
  return {
    signupUIPropsRef: { current: null },
    optimizationTuple: [{ loading: false, result: { configs: {} } }],
    configTuple: [{
      configs: {
        business_signup_allow: { value: '1' },
        driver_signup_allow: { value: '1' },
        terms_and_conditions: { value: 'true' },
        facebook_login_enabled: { value: '1' },
        facebook_id: { value: '1234567890' }
      }
    }]
  }
})

vi.mock('react-hook-form', () => {
  const { createStableUseFormMock } = require('../../__tests__/helpers/authUiTestMocks.js')
  return createStableUseFormMock()
})
vi.mock('~components/components/SignupForm', () => ({
  SignupForm: ({ UIComponent, ...rest }) => (
    <UIComponent {...rest} {...signupUIPropsRef.current} />
  )
}))
vi.mock('~components/contexts/OptimizationLoadContext', () => ({
  useOptimizationLoad: () => optimizationTuple
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => configTuple
}))
vi.mock('~ui/src/components/FacebookLogin', () => ({
  FacebookLoginButton: () => <button type='button'>fb</button>
}))
vi.mock('~ui/src/components/GoogleLogin', () => ({
  GoogleLoginButton: () => <button type='button'>google</button>
}))
vi.mock('~ui/src/components/AppleLogin', () => ({
  AppleLogin: () => <button type='button'>apple</button>
}))

const renderSignup = (theme, uiProps = {}) => {
  signupUIPropsRef.current = { ...baseSignupUIProps, isCustomerMode: false, isGuest: false, ...uiProps }
  return renderWithProviders(
    <SignUpForm elementLinkToLogin={<a href='/login'>Log in</a>} />,
    { theme }
  )
}

const withMethods = { useSignUpFullDetails: true, useSignUpOtpEmail: true }

describe('SignUpForm — slots of components.auth_form', () => {
  it('the method tabs take slots.method_tabs (md by default), as the login\'s', () => {
    const theme = themeWithValues()
    const { getByRole } = renderSignup(theme, withMethods)
    const tabs = getByRole('radiogroup')
    expect(tabs.style.getPropertyValue('--ui-tabs-height')).toBe(getThemeCss(theme, 'tabs').sizes.md.height)
    expect(getByRole('radio', { name: 'Default' })).toHaveAttribute('data-slot', 'radio')
    expect(getByRole('radio', { name: 'by Otp Email' })).toHaveAttribute('data-slot', 'radio')
  })

  it('the method tabs follow the slot the theme chose', () => {
    const theme = themeWithValues((values) => {
      values.components.auth_form.slots.method_tabs = { component: 'tabs', size: 'sm', variant: 'underline' }
      return values
    })
    const { getByRole } = renderSignup(theme, withMethods)
    const tabs = getByRole('radiogroup')
    expect(tabs.style.getPropertyValue('--ui-tabs-height')).toBe(getThemeCss(theme, 'tabs').sizes.sm.height)
    expect(tabs).toHaveAttribute('data-variant', 'underline')
  })

  it('the business and driver buttons take slots.partner (primary tonal md by default)', () => {
    const theme = themeWithValues()
    const { getByRole } = renderSignup(theme)
    const look = componentVars(theme, 'button', { color: 'primary', appearance: 'tonal', size: 'md' })
    ;['Sign up for business', 'Sign up for driver'].forEach((label) => {
      const button = getByRole('button', { name: label })
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button.style.getPropertyValue('--ui-button-background')).toBe(look['--ui-button-background'])
      expect(button.style.getPropertyValue('--ui-button-height')).toBe(look['--ui-button-height'])
    })
  })
})

describe('SignUpForm — sub-elements the theme hides', () => {
  const hiding = (keys) => themeWithValues((values) => {
    keys.forEach((key) => { values.visibility[key] = false })
    return values
  })

  it('by default: social logins, the link to log in and the promotions', () => {
    const { getByText } = renderSignup(themeWithValues())
    expect(getByText('fb')).toBeInTheDocument()
    expect(getByText('Log in')).toBeInTheDocument()
    expect(getByText('Receive newsletters and exclusive promotions')).toBeInTheDocument()
  })

  it('hiding auth.social, auth.login_link and signup.promotions_optin; the terms stay', () => {
    const { queryByText, getByText } = renderSignup(hiding(['auth.social', 'auth.login_link', 'signup.promotions_optin']))
    expect(queryByText('fb')).toBeNull()
    expect(queryByText('Log in')).toBeNull()
    expect(queryByText('Already have an account?')).toBeNull()
    expect(queryByText('Receive newsletters and exclusive promotions')).toBeNull()
    expect(getByText('Terms & Conditions')).toBeInTheDocument()
  })

  it('auth.partner_signup: hides the business and driver sign ups; the default shows them', () => {
    const shown = renderSignup(themeWithValues())
    expect(shown.getByText('Sign up for business')).toBeInTheDocument()
    expect(shown.getByText('Sign up for driver')).toBeInTheDocument()
    shown.unmount()
    const hidden = renderSignup(hiding(['auth.partner_signup']))
    expect(hidden.queryByText('Sign up for business')).toBeNull()
    expect(hidden.queryByText('Sign up for driver')).toBeNull()
    expect(hidden.getByText('Terms & Conditions')).toBeInTheDocument()
  })
})

// components.field.base.label_position: above puts each field's label over it
const labelsAbove = () => themeWithValues((values) => {
  values.components.field.base.label_position = 'above'
  return values
})
const textInputs = (container) => Array.from(container.querySelectorAll('input:not([type="checkbox"])'))

describe('SignUpForm — labels above the fields (field.base.label_position)', () => {
  it('above: every field has its label, tied by id', () => {
    const { container } = renderSignup(labelsAbove())
    const inputs = textInputs(container)
    expect(inputs.length).toBeGreaterThan(0)
    inputs.forEach((input) => {
      expect(input.id).toBeTruthy()
      expect(container.querySelector(`label[for="${input.id}"]`)).not.toBeNull()
    })
  })

  it('by default (placeholder): no labels over the fields', () => {
    const { container } = renderSignup(themeWithValues())
    textInputs(container).forEach((input) => {
      expect(input.id ? container.querySelector(`label[for="${input.id}"]`) : null).toBeNull()
    })
  })
})
