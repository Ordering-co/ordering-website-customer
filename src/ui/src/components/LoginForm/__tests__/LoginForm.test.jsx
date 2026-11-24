import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { baseLoginUIProps } from '../../__tests__/helpers/authTestUtils'

import { LoginForm } from '../index'

// Base UI forwards a pointer event to the radio's native input.
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

const { loginUIPropsRef, configTuple, optimizationTuple } = vi.hoisted(() => {
  const configs = {
    spoonity_title: { value: 'Spoonity Rewards' },
    google_login_client_id: { value: 'google-id' }
  }
  const optimizationConfigs = {
    google_login_enabled: { value: '0' },
    facebook_login_enabled: { value: '0' },
    apple_login_enabled: { value: '0' }
  }
  return {
    loginUIPropsRef: { current: null },
    configTuple: [{ configs }],
    optimizationTuple: [{ loading: false, result: { configs: optimizationConfigs } }]
  }
})

vi.mock('react-hook-form', () => {
  const { createStableUseFormMock } = require('../../__tests__/helpers/authUiTestMocks.js')
  return createStableUseFormMock()
})
// the loader reports its size and height, so what each screen asks for can be read (the global mock does not)
vi.mock('~ui/src/components/SpinnerLoader', () => ({
  SpinnerLoader: ({ size, style }) => <div data-testid='spinner' data-size={size} data-height={style?.height}>loading</div>
}))
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

const setSocialLoginConfigs = ({ facebookFlag, googleFlag }) => {
  const configs = {
    spoonity_title: { value: 'Spoonity Rewards' },
    google_login_client_id: { value: 'google-id' },
    google_login_auth_domain: { value: 'google.example.com' },
    google_login_api_key: { value: 'google-api-key' },
    facebook_id: { value: '1234567890' },
    apple_login_enabled: { value: '0', enabled: true }
  }
  const optimizationConfigs = {
    apple_login_enabled: { value: '0', enabled: true }
  }

  if (facebookFlag !== undefined) {
    configs.facebook_login_enabled = facebookFlag
    optimizationConfigs.facebook_login_enabled = facebookFlag
  }
  if (googleFlag !== undefined) {
    configs.google_login_enabled = googleFlag
    optimizationConfigs.google_login_enabled = googleFlag
  }

  configTuple[0].configs = configs
  optimizationTuple[0].result.configs = optimizationConfigs
}

describe('LoginForm', () => {
  afterEach(() => {
    delete window.__FIRST_LOAD__
    delete window.__CONFIG__
    setSocialLoginConfigs({
      facebookFlag: { value: '0' },
      googleFlag: { value: '0' }
    })
  })

  it('renders email login fields', () => {
    loginUIPropsRef.current = { ...baseLoginUIProps, loginTab: 'email', useLoginByEmail: true, isCustomerMode: false }
    const { getByPlaceholderText, getAllByText } = renderWithProviders(<LoginForm useLoginByEmail />)
    expect(getAllByText('Login').length).toBeGreaterThan(0)
    expect(getByPlaceholderText('Email')).toBeInTheDocument()
    expect(getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('exposes its method selection and can switch to email OTP', () => {
    const handleChangeTab = vi.fn()
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'email',
      useLoginByEmail: true,
      useLoginOtpEmail: true,
      handleChangeTab
    }
    const { getByRole } = renderWithProviders(<LoginForm />)
    expect(getByRole('radio', { name: 'by Email', checked: true })).toBeInTheDocument()
    fireEvent.click(getByRole('radio', { name: 'by Otp Email', checked: false }))
    expect(handleChangeTab).toHaveBeenCalledWith('otp')
  })

  it('renders cellphone login tab', () => {
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'cellphone',
      useLoginByEmail: true,
      useLoginByCellphone: true,
      isCustomerMode: false
    }
    const { getByText, getByTestId } = renderWithProviders(
      <LoginForm useLoginByEmail useLoginByCellphone />
    )
    fireEvent.click(getByText('by Phone'))
    expect(getByTestId('phone-input')).toBeInTheDocument()
  })

  it('renders OTP email tab and spoonity tab', () => {
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'email',
      otpType: 'email',
      useLoginByEmail: true,
      useLoginOtpEmail: true,
      useLoginSpoonity: true,
      isCustomerMode: false
    }
    const { getByText } = renderWithProviders(
      <LoginForm useLoginByEmail useLoginOtpEmail useLoginSpoonity />
    )
    expect(getByText('by Otp Email')).toBeInTheDocument()
    fireEvent.click(getByText('Spoonity Rewards'))
    expect(getByText('Spoonity Rewards')).toBeInTheDocument()
  })

  it('shows project field when useRootPoint is enabled', () => {
    loginUIPropsRef.current = { ...baseLoginUIProps, useRootPoint: true, isCustomerMode: false }
    const { getByPlaceholderText } = renderWithProviders(
      <LoginForm useLoginByEmail useRootPoint />
    )
    expect(getByPlaceholderText('Project')).toBeInTheDocument()
  })

  it('shows alert when form returns an error', async () => {
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      isCustomerMode: false,
      formState: { loading: false, result: { error: true, result: ['Invalid credentials'] } }
    }
    const { getByTestId } = renderWithProviders(<LoginForm useLoginByEmail />)
    await waitFor(() => {
      expect(getByTestId('alert')).toHaveTextContent('Please try again')
      expect(getByTestId('alert')).not.toHaveTextContent('Invalid credentials')
    })
  })

  it('renders spoonity login fields when spoonity tab is active', () => {
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'spoonity',
      useLoginByEmail: true,
      useLoginSpoonity: true,
      isCustomerMode: false
    }
    const { getByPlaceholderText } = renderWithProviders(
      <LoginForm useLoginByEmail useLoginSpoonity />
    )
    expect(getByPlaceholderText('Email')).toBeInTheDocument()
  })

  it('shows OTP verification UI after requesting verify code on otp tab', () => {
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'otp',
      otpType: 'email',
      useLoginByEmail: true,
      useLoginOtpEmail: true,
      isCustomerMode: false
    }
    const { getByText, getByRole, getByLabelText } = renderWithProviders(
      <LoginForm useLoginByEmail useLoginOtpEmail />
    )
    fireEvent.click(getByText('Get verify code'))
    // the base InputCode: six boxes on the otp tab, the first one focused
    const group = getByRole('group', { name: 'Verification Code' })
    expect(group).toHaveAttribute('data-slot', 'input-code')
    expect(group.querySelectorAll('input')).toHaveLength(6)
    expect(getByLabelText('Verification Code 1/6')).toHaveFocus()
    fireEvent.paste(getByLabelText('Verification Code 1/6'), { clipboardData: { getData: () => '123456' } })
    expect(loginUIPropsRef.current.setOtpState).toHaveBeenLastCalledWith('123456')
  })

  it('shows spinner when verify phone is loading', () => {
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'cellphone',
      useLoginByCellphone: true,
      isCustomerMode: false,
      verifyPhoneState: { loading: true }
    }
    const { getByTestId } = renderWithProviders(<LoginForm useLoginByCellphone />)
    expect(getByTestId('spinner')).toBeInTheDocument()
    // a spinner inside the form: the md ring, no height of its own
    expect(getByTestId('spinner')).toHaveAttribute('data-size', 'md')
    expect(getByTestId('spinner')).not.toHaveAttribute('data-height')
  })

  it('toggles password visibility and renders auth links', () => {
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'email',
      useLoginByEmail: true,
      isCustomerMode: false,
      elementLinkToSignup: <a href='/signup'>Sign up</a>,
      elementLinkToForgotPassword: <a href='/forgot'>Forgot password</a>
    }
    const { getByPlaceholderText, getByText, getByLabelText } = renderWithProviders(
      <LoginForm useLoginByEmail />
    )
    fireEvent.click(getByLabelText('Show password'))
    expect(getByPlaceholderText('Password')).toHaveAttribute('type', 'text')
    expect(getByText('Forgot password')).toBeInTheDocument()
    expect(getByText('Sign up')).toBeInTheDocument()
    // the site's name, never the vendor's ("My Site" without one)
    expect(getByText('New on My Site?')).toBeInTheDocument()
  })

  it('submits login form', () => {
    const handleButtonLoginClick = vi.fn()
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'email',
      useLoginByEmail: true,
      isCustomerMode: false,
      handleButtonLoginClick
    }
    const { getAllByText } = renderWithProviders(<LoginForm useLoginByEmail />)
    fireEvent.click(getAllByText('Login').pop())
    expect(handleButtonLoginClick).toHaveBeenCalled()
  })

  it('renders social login buttons when worker-injected optimization enables them', () => {
    window.__CONFIG__ = { project: 'buzzgrabit' }
    window.__FIRST_LOAD__ = { result: { configs: {} } }
    optimizationTuple[0].result.configs = {
      google_login_enabled: { value: '1' },
      facebook_login_enabled: { value: '1' },
      apple_login_enabled: { value: '1' }
    }
    configTuple[0].configs = {
      spoonity_title: { value: 'Spoonity Rewards' },
      google_login_client_id: { value: 'g-id' },
      google_login_auth_domain: { value: 'domain' },
      google_login_api_key: { value: 'api-key' },
      facebook_id: { value: '1234567890' },
      facebook_login_enabled: { value: '1' },
      apple_login_client_id: { value: 'apple-id' }
    }
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'email',
      useLoginByEmail: true,
      isCustomerMode: false
    }
    const { getByText } = renderWithProviders(<LoginForm useLoginByEmail />)
    expect(getByText('google')).toBeInTheDocument()
    expect(getByText('fb')).toBeInTheDocument()
    expect(getByText('apple')).toBeInTheDocument()
  })

  it('does not render Facebook login when optimize-load disables it', () => {
    optimizationTuple[0].result.configs = {
      google_login_enabled: { value: '0' },
      facebook_login_enabled: { value: '0' },
      apple_login_enabled: { value: '0' }
    }
    configTuple[0].configs = {
      spoonity_title: { value: 'Spoonity Rewards' },
      facebook_id: { value: 'fb-id' },
      facebook_login_enabled: { value: '1' }
    }
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'email',
      useLoginByEmail: true,
      isCustomerMode: false
    }
    const { queryByText } = renderWithProviders(<LoginForm useLoginByEmail />)
    expect(queryByText('fb')).not.toBeInTheDocument()
  })

  it.each([
    ['1', true],
    ['0', false]
  ])("falls back to config Facebook flag %s when optimize-load omits it", (facebookValue, showFacebook) => {
    setSocialLoginConfigs({ googleFlag: { value: '0' } })
    configTuple[0].configs.facebook_login_enabled = { value: facebookValue }
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'email',
      useLoginByEmail: true,
      isCustomerMode: false
    }

    const { queryByText } = renderWithProviders(<LoginForm useLoginByEmail />)

    expect(Boolean(queryByText('fb'))).toBe(showFacebook)
    expect(queryByText('google')).not.toBeInTheDocument()
  })

  it.each([
    ['0', '0', false, false],
    ['0', '1', false, true],
    ['1', '0', true, false],
    ['1', '1', true, true]
  ])("gates Facebook and Google independently for flags %s/%s", (facebookValue, googleValue, showFacebook, showGoogle) => {
    setSocialLoginConfigs({
      facebookFlag: { value: facebookValue },
      googleFlag: { value: googleValue }
    })
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'email',
      useLoginByEmail: true,
      isCustomerMode: false
    }

    const { queryByText } = renderWithProviders(<LoginForm useLoginByEmail />)

    expect(Boolean(queryByText('fb'))).toBe(showFacebook)
    expect(Boolean(queryByText('google'))).toBe(showGoogle)
    expect(queryByText('apple')).not.toBeInTheDocument()
  })

  it.each([
    ['1234567890', true],
    ['', false],
    ['0', false],
    ['Add your Facebook ID', false]
  ])('shows Facebook login only for a valid numeric facebook_id (%s) [implementation notes]', (facebookId, showFacebook) => {
    setSocialLoginConfigs({ facebookFlag: { value: '1' } })
    configTuple[0].configs.facebook_id = { value: facebookId }
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'email',
      useLoginByEmail: true,
      isCustomerMode: false
    }

    const { queryByText } = renderWithProviders(<LoginForm useLoginByEmail />)

    expect(Boolean(queryByText('fb'))).toBe(showFacebook)
  })

  it.each([
    ['reduced zero', { value: '0' }],
    ['dictionary zero', { value: '0', enabled: true }],
    ['missing flags', undefined]
  ])("keeps Facebook and Google disabled for %s", (_label, flag) => {
    setSocialLoginConfigs({ facebookFlag: flag, googleFlag: flag })
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'email',
      useLoginByEmail: true,
      isCustomerMode: false
    }

    const { queryByText } = renderWithProviders(<LoginForm useLoginByEmail />)

    expect(queryByText('fb')).not.toBeInTheDocument()
    expect(queryByText('google')).not.toBeInTheDocument()
    expect(queryByText('apple')).not.toBeInTheDocument()
  })

  it("removes Facebook and Google after their flags change from on to off", () => {
    setSocialLoginConfigs({
      facebookFlag: { value: '1' },
      googleFlag: { value: '1' }
    })
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'email',
      useLoginByEmail: true,
      isCustomerMode: false
    }
    const view = renderWithProviders(<LoginForm useLoginByEmail />)
    expect(view.getByText('fb')).toBeInTheDocument()
    expect(view.getByText('google')).toBeInTheDocument()

    setSocialLoginConfigs({
      facebookFlag: { value: '0', enabled: true },
      googleFlag: { value: '0', enabled: true }
    })
    view.rerender(<LoginForm useLoginByEmail />)

    expect(view.queryByText('fb')).not.toBeInTheDocument()
    expect(view.queryByText('google')).not.toBeInTheDocument()
  })

  it('changes email input on login form', () => {
    const handleChangeInput = vi.fn()
    loginUIPropsRef.current = {
      ...baseLoginUIProps,
      loginTab: 'email',
      useLoginByEmail: true,
      isCustomerMode: false,
      handleChangeInput
    }
    const { getByPlaceholderText } = renderWithProviders(<LoginForm useLoginByEmail />)
    fireEvent.change(getByPlaceholderText('Email'), { target: { value: 'user@test.com' } })
    expect(handleChangeInput).toHaveBeenCalled()
  })
})
