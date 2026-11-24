import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { baseLoginUIProps } from '../../__tests__/helpers/authTestUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// The sub-elements of the login a theme may hide (visibility auth.social,
// auth.signup_link).

const { loginUIPropsRef, configTuple, optimizationTuple } = vi.hoisted(() => {
  return {
    loginUIPropsRef: { current: null },
    configTuple: [{
      configs: {
        facebook_id: { value: '1234567890' },
        apple_login_client_id: { value: 'apple-id' },
        twilio_service_enabled: { value: '1' }
      }
    }],
    optimizationTuple: [{
      loading: false,
      result: {
        configs: {
          google_login_enabled: { value: '0' },
          facebook_login_enabled: { value: '1' },
          apple_login_enabled: { value: '1' }
        }
      }
    }]
  }
})

vi.mock('react-hook-form', () => {
  const { createStableUseFormMock } = require('../../__tests__/helpers/authUiTestMocks.js')
  return createStableUseFormMock()
})
vi.mock('~components/components/LoginForm', () => ({
  LoginForm: ({ UIComponent, ...rest }) => (
    <UIComponent {...rest} {...loginUIPropsRef.current} />
  )
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => configTuple
}))
vi.mock('~components/contexts/OptimizationLoadContext', () => ({
  useOptimizationLoad: () => optimizationTuple
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
vi.mock('~ui/src/components/SmsLogin', () => ({
  SmsLoginButton: () => <button type='button'>sms</button>
}))

import { LoginForm } from '../index'

const hiding = (keys) => themeWithValues((values) => {
  keys.forEach((key) => { values.visibility[key] = false })
  return values
})

const renderLogin = (theme, uiProps = {}) => {
  loginUIPropsRef.current = { ...baseLoginUIProps, isCustomerMode: false, ...uiProps }
  return renderWithProviders(
    <LoginForm elementLinkToSignup={<a href='/signup'>Sign up</a>} />,
    { theme }
  )
}

describe('LoginForm — sub-elements the theme hides', () => {
  it('by default: the social logins and the link to sign up', () => {
    const { getByText } = renderLogin(themeWithValues())
    expect(getByText('fb')).toBeInTheDocument()
    expect(getByText('apple')).toBeInTheDocument()
    expect(getByText('Sign up')).toBeInTheDocument()
  })

  it('auth.social hidden: no social login, the SMS login (a method) stays', () => {
    const { queryByText, getByText } = renderLogin(hiding(['auth.social']), {
      loginTab: 'cellphone',
      useLoginByCellphone: true
    })
    expect(queryByText('fb')).toBeNull()
    expect(queryByText('apple')).toBeNull()
    expect(getByText('sms')).toBeInTheDocument()
  })

  it('auth.signup_link hidden: no "New on…? Sign up"', () => {
    const { queryByText } = renderLogin(hiding(['auth.signup_link']))
    expect(queryByText('Sign up')).toBeNull()
    expect(queryByText('New on Ordering?')).toBeNull()
  })

  it('auth.forgot_password_link: hides "Forgot your password?" and its link; the default shows them', () => {
    const renderWithForgot = (theme) => {
      loginUIPropsRef.current = { ...baseLoginUIProps, isCustomerMode: false }
      return renderWithProviders(
        <LoginForm elementLinkToForgotPassword={<a href='/password/forgot'>Reset password</a>} />,
        { theme }
      )
    }
    const shown = renderWithForgot(themeWithValues())
    expect(shown.getByText('Forgot your password?')).toBeInTheDocument()
    expect(shown.getByText('Reset password')).toBeInTheDocument()
    shown.unmount()
    const hidden = renderWithForgot(hiding(['auth.forgot_password_link']))
    expect(hidden.queryByText('Forgot your password?')).toBeNull()
    expect(hidden.queryByText('Reset password')).toBeNull()
  })
})

// components.field.base.label_position: above puts each field's label over it
const labelsAbove = () => themeWithValues((values) => {
  values.components.field.base.label_position = 'above'
  return values
})
const labelOf = (container, input) => input.id ? container.querySelector(`label[for="${input.id}"]`) : null

describe('LoginForm — labels above the fields (field.base.label_position)', () => {
  it('above: the email and password fields have their label, tied by id', () => {
    const { container } = renderLogin(labelsAbove())
    const email = container.querySelector('input[name="email"]')
    const password = container.querySelector('input[name="password"]')
    expect(labelOf(container, email)).toHaveTextContent('Email')
    expect(labelOf(container, password)).toHaveTextContent('Password')
  })

  it('by default (placeholder): no labels over the fields', () => {
    const { container } = renderLogin(themeWithValues())
    expect(container.querySelector('label[for]')).toBeNull()
  })
})
