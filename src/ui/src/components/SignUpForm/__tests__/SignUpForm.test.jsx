import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { baseSignupUIProps } from '../../__tests__/helpers/authTestUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

import { SignUpForm } from '../index'

// Base UI forwards a pointer event to the radio's native input.
if (!window.PointerEvent) window.PointerEvent = class PointerEvent extends MouseEvent {}

const { signupUIPropsRef, optimizationTuple, configTuple } = vi.hoisted(() => {
  const { createAuthUiPrimitives } = require('../../__tests__/helpers/authUiTestMocks.js')
  const { Primitive } = createAuthUiPrimitives()
  const optimizationConfigs = {
    google_login_enabled: { value: '0' },
    facebook_login_enabled: { value: '0' },
    apple_login_enabled: { value: '0' }
  }
  const configs = {
    business_signup_allow: { value: '1' },
    driver_signup_allow: { value: '0' },
    terms_and_conditions: { value: 'true' }
  }
  return {
    Primitive,
    signupUIPropsRef: { current: null },
    optimizationTuple: [{ loading: false, result: { configs: optimizationConfigs } }],
    configTuple: [{ configs }]
  }
})

vi.mock('react-hook-form', () => {
  const { createStableUseFormMock } = require('../../__tests__/helpers/authUiTestMocks.js')
  return createStableUseFormMock()
})
// the setup's parser returns null for every number: this file's parses a +1 number (implementation notes phone prefill)
vi.mock('libphonenumber-js', () => {
  const parse = (value) => value ? { countryCallingCode: '1', nationalNumber: String(value).replace(/\D/g, '').slice(-10) } : null
  return { default: parse, parsePhoneNumber: parse }
})
// the loader reports its size and height, so what each screen asks for can be read (the global mock does not)
vi.mock('~ui/src/components/SpinnerLoader', () => ({
  SpinnerLoader: ({ size, style }) => <div data-testid='spinner' data-size={size} data-height={style?.height}>loading</div>
}))
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

const setSocialLoginConfigs = ({ facebookFlag, googleFlag }) => {
  const configs = {
    business_signup_allow: { value: '1' },
    driver_signup_allow: { value: '0' },
    terms_and_conditions: { value: 'true' },
    google_login_client_id: { value: 'google-id' },
    google_login_auth_domain: { value: 'google.example.com' },
    google_login_api_key: { value: 'google-api-key' },
    facebook_id: { value: '1234567890' },
    apple_login_enabled: { value: '0', enabled: true }
  }

  if (facebookFlag !== undefined) configs.facebook_login_enabled = facebookFlag
  if (googleFlag !== undefined) configs.google_login_enabled = googleFlag

  configTuple[0].configs = configs
}

describe('SignUpForm', () => {
  afterEach(() => {
    delete window.__FIRST_LOAD__
    delete window.__CONFIG__
    setSocialLoginConfigs({
      facebookFlag: { value: '0' },
      googleFlag: { value: '0' }
    })
  })

  it('renders signup form title', async () => {
    signupUIPropsRef.current = { ...baseSignupUIProps, isCustomerMode: false }
    const { getByText } = renderWithProviders(<SignUpForm />)
    await waitFor(() => {
      expect(getByText('Sign up')).toBeInTheDocument()
    })
  })

  it('shows alert on signup error', async () => {
    signupUIPropsRef.current = {
      ...baseSignupUIProps,
      isCustomerMode: false,
      formState: { loading: false, result: { error: true, result: ['Email taken'] } }
    }
    const { getByTestId } = renderWithProviders(<SignUpForm />)
    await waitFor(() => {
      expect(getByTestId('alert')).toHaveTextContent('Please try again')
      expect(getByTestId('alert')).not.toHaveTextContent('Email taken')
    })
  })

  it('renders business signup link when allowed', async () => {
    signupUIPropsRef.current = { ...baseSignupUIProps, isCustomerMode: false, isGuest: false }
    const { getByText } = renderWithProviders(<SignUpForm />)
    await waitFor(() => {
      expect(getByText('Sign up for business')).toBeInTheDocument()
    })
  })

  it('submits signup and calls handler', async () => {
    const handleButtonSignupClick = vi.fn()
    signupUIPropsRef.current = {
      ...baseSignupUIProps,
      isCustomerMode: false,
      handleButtonSignupClick
    }
    const { getByText } = renderWithProviders(<SignUpForm />)
    fireEvent.click(getByText('Create an account'))
    await waitFor(() => {
      expect(handleButtonSignupClick).toHaveBeenCalled()
    })
  })

  it('changes email input and toggles password visibility', async () => {
    const handleChangeInput = vi.fn()
    signupUIPropsRef.current = {
      ...baseSignupUIProps,
      isCustomerMode: false,
      handleChangeInput
    }
    const { getByLabelText, getByRole } = renderWithProviders(<SignUpForm />)
    fireEvent.change(getByLabelText('email'), { target: { value: 'user@test.com' } })
    expect(handleChangeInput).toHaveBeenCalled()
    expect(getByLabelText('Password', { selector: 'input' })).toHaveAttribute('type', 'password')
    fireEvent.click(getByRole('button', { name: 'Show password' }))
    expect(getByLabelText('Password', { selector: 'input' })).toHaveAttribute('type', 'text')
    // the eye is the Lucide stroke glyph of the base Icon, and the button says the state
    const hide = getByRole('button', { name: 'Hide password' })
    expect(hide).toHaveAttribute('aria-pressed', 'true')
    expect(hide.querySelector('svg').classList.contains('lucide-eye-off')).toBe(true)
  })

  it('the eye takes its size and color from components.input, in the field\'s suffix', () => {
    signupUIPropsRef.current = { ...baseSignupUIProps, isCustomerMode: false }
    const theme = themeWithValues((values) => {
      values.components.input.base = { ...values.components.input.base, icon_size: 19, icon_color: '#333333' }
      return values
    })
    const { getByRole } = renderWithProviders(<SignUpForm />, { theme })
    const eye = getByRole('button', { name: 'Show password' })
    const group = eye.closest('[data-slot="input-group"]')
    expect(group.querySelector('[data-slot="input-suffix"]')).toContainElement(eye)
    expect(group.style.getPropertyValue('--ui-input-icon-size')).toBe('19px')
    expect(group.style.getPropertyValue('--ui-input-icon-color')).toBe('#333333')
  })

  it('renders signup method tabs when multiple flows enabled', () => {
    const setSignUpTab = vi.fn()
    signupUIPropsRef.current = {
      ...baseSignupUIProps,
      isCustomerMode: false,
      setSignUpTab,
      useSignUpFullDetails: true,
      useSignUpOtpEmail: true,
      useSignUpOtpCellphone: false
    }
    const { getByRole } = renderWithProviders(<SignUpForm />)
    expect(getByRole('radio', { name: 'Default', checked: true })).toBeInTheDocument()
    fireEvent.click(getByRole('radio', { name: 'by Otp Email', checked: false }))
    expect(setSignUpTab).toHaveBeenCalledWith('otpEmail')
  })

  it('shows OTP verification UI when willVerifyOtpState is true', () => {
    signupUIPropsRef.current = {
      ...baseSignupUIProps,
      isCustomerMode: false,
      willVerifyOtpState: true,
      checkPhoneCodeState: { loading: false }
    }
    const { getByRole } = renderWithProviders(<SignUpForm />)
    // the code is the base InputCode: one box per digit (6 by default), a pasted code fills them
    const code = getByRole('group', { name: 'Verification Code' })
    expect(code.querySelectorAll('input')).toHaveLength(6)
  })

  it('a pasted code goes to setOtpState, with the length the controller asks (numOtpInputs)', () => {
    const setOtpState = vi.fn()
    signupUIPropsRef.current = {
      ...baseSignupUIProps,
      isCustomerMode: false,
      willVerifyOtpState: true,
      checkPhoneCodeState: { loading: false },
      numOtpInputs: 4,
      otpState: '',
      setOtpState
    }
    const { getByRole } = renderWithProviders(<SignUpForm />)
    const code = getByRole('group', { name: 'Verification Code' })
    expect(code.querySelectorAll('input')).toHaveLength(4)
    fireEvent.paste(code.querySelector('input'), { clipboardData: { getData: () => '1234' } })
    expect(setOtpState).toHaveBeenCalledWith('1234')
  })

  it('shows spinner when phone code check is loading', () => {
    signupUIPropsRef.current = {
      ...baseSignupUIProps,
      isCustomerMode: false,
      checkPhoneCodeState: { loading: true }
    }
    const { getByTestId } = renderWithProviders(<SignUpForm />)
    expect(getByTestId('spinner')).toBeInTheDocument()
    // a spinner inside the form: the md ring, no height of its own
    expect(getByTestId('spinner')).toHaveAttribute('data-size', 'md')
    expect(getByTestId('spinner')).not.toHaveAttribute('data-height')
  })

  it('renders login redirect when elementLinkToLogin is provided', () => {
    signupUIPropsRef.current = {
      ...baseSignupUIProps,
      isCustomerMode: false,
      elementLinkToLogin: <a href='/login'>Login</a>
    }
    const { getByText } = renderWithProviders(<SignUpForm />)
    expect(getByText('Already have an account?')).toBeInTheDocument()
    expect(getByText('Login')).toBeInTheDocument()
  })

  it('renders terms and promotions checkboxes', () => {
    signupUIPropsRef.current = { ...baseSignupUIProps, isCustomerMode: false }
    const { getByText } = renderWithProviders(<SignUpForm />)
    expect(getByText('Terms & Conditions')).toBeInTheDocument()
    expect(getByText('Receive newsletters and exclusive promotions')).toBeInTheDocument()
  })

  it('shows recaptcha error alert for verification code failure', async () => {
    configTuple[0].configs = {
      ...configTuple[0].configs,
      security_recaptcha_site_key: { value: 'site-key' }
    }
    signupUIPropsRef.current = {
      ...baseSignupUIProps,
      isCustomerMode: false,
      formState: {
        loading: false,
        result: { error: true, result: ['ERROR_AUTH_VERIFICATION_CODE'] }
      }
    }
    const { getByTestId } = renderWithProviders(<SignUpForm />)
    await waitFor(() => {
      expect(getByTestId('alert')).toBeInTheDocument()
    })
  })

  it('renders social login buttons when worker-injected configs enable them', () => {
    window.__CONFIG__ = { project: 'buzzgrabit' }
    window.__FIRST_LOAD__ = { result: { configs: {} } }
    configTuple[0].configs = {
      ...configTuple[0].configs,
      google_login_enabled: { value: '1' },
      facebook_login_enabled: { value: '1' },
      apple_login_enabled: { value: '1' },
      google_login_client_id: { value: 'g-id' },
      google_login_auth_domain: { value: 'domain' },
      google_login_api_key: { value: 'api-key' },
      facebook_id: { value: '1234567890' },
      apple_login_client_id: { value: 'apple-id' }
    }
    signupUIPropsRef.current = { ...baseSignupUIProps, isCustomerMode: false }
    const { getByText } = renderWithProviders(<SignUpForm />)
    expect(getByText('google')).toBeInTheDocument()
    expect(getByText('fb')).toBeInTheDocument()
    expect(getByText('apple')).toBeInTheDocument()
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
    signupUIPropsRef.current = { ...baseSignupUIProps, isCustomerMode: false }

    const { queryByText } = renderWithProviders(<SignUpForm />)

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
    signupUIPropsRef.current = { ...baseSignupUIProps, isCustomerMode: false }

    const { queryByText } = renderWithProviders(<SignUpForm />)

    expect(Boolean(queryByText('fb'))).toBe(showFacebook)
  })

  it.each([
    ['reduced zero', { value: '0' }],
    ['dictionary zero', { value: '0', enabled: true }],
    ['missing flags', undefined]
  ])("keeps Facebook and Google disabled for %s", (_label, flag) => {
    setSocialLoginConfigs({ facebookFlag: flag, googleFlag: flag })
    signupUIPropsRef.current = { ...baseSignupUIProps, isCustomerMode: false }

    const { queryByText } = renderWithProviders(<SignUpForm />)

    expect(queryByText('fb')).not.toBeInTheDocument()
    expect(queryByText('google')).not.toBeInTheDocument()
    expect(queryByText('apple')).not.toBeInTheDocument()
  })

  it("removes Facebook and Google after their flags change from on to off", () => {
    setSocialLoginConfigs({
      facebookFlag: { value: '1' },
      googleFlag: { value: '1' }
    })
    signupUIPropsRef.current = { ...baseSignupUIProps, isCustomerMode: false }
    const view = renderWithProviders(<SignUpForm />)
    expect(view.getByText('fb')).toBeInTheDocument()
    expect(view.getByText('google')).toBeInTheDocument()

    setSocialLoginConfigs({
      facebookFlag: { value: '0', enabled: true },
      googleFlag: { value: '0', enabled: true }
    })
    view.rerender(<SignUpForm />)

    expect(view.queryByText('fb')).not.toBeInTheDocument()
    expect(view.queryByText('google')).not.toBeInTheDocument()
  })

  it('navigates to business signup page', () => {
    signupUIPropsRef.current = { ...baseSignupUIProps, isCustomerMode: false, isGuest: false }
    const { getByText } = renderWithProviders(<SignUpForm />)
    fireEvent.click(getByText('Sign up for business'))
  })

  // implementation notes"Sign up for faster checkout" prefills name, lastname and
  // email once on mount via the controller's handleChangeInput(…, true)
  it('prefills name, lastname and email once via handleChangeInput when initialValues is given', () => {
    const handleChangeInput = vi.fn()
    signupUIPropsRef.current = {
      ...baseSignupUIProps,
      isCustomerMode: false,
      handleChangeInput,
      initialValues: { name: 'Ana', lastname: 'García', email: 'ana@example.com' }
    }
    renderWithProviders(<SignUpForm />)
    expect(handleChangeInput).toHaveBeenCalledWith({
      name: { name: 'name', value: 'Ana' },
      lastname: { name: 'lastname', value: 'García' },
      email: { name: 'email', value: 'ana@example.com' }
    }, true)
  })

  // implementation notesthe controller's handleChangeInput merges into the signupData of its render, so two calls
  // on mount (the phone, then the initial values) keep only the last one: the prefill batch must carry the
  // parsed phone too, or the sign-up sends '+12015550123' with no country_phone_code
  it('keeps the parsed external phone when initialValues are applied on mount', () => {
    const handleChangeInput = vi.fn()
    signupUIPropsRef.current = {
      ...baseSignupUIProps,
      isCustomerMode: false,
      handleChangeInput,
      externalPhoneNumber: '+12015550123',
      initialValues: { name: 'Ana', lastname: 'García', email: 'ana@example.com' }
    }
    renderWithProviders(<SignUpForm />)
    const [last] = handleChangeInput.mock.calls.at(-1)
    expect(last).toMatchObject({
      name: { name: 'name', value: 'Ana' },
      cellphone: { name: 'cellphone', value: '2015550123' },
      country_phone_code: { name: 'country_phone_code', value: '1' }
    })
  })

  it('renders whatsapp and sms buttons on otp cellphone tab', () => {
    signupUIPropsRef.current = {
      ...baseSignupUIProps,
      isCustomerMode: false,
      signUpTab: 'otpCellphone',
      useSignUpFullDetails: true,
      useSignUpOtpEmail: false,
      useSignUpOtpCellphone: true,
      useSignUpOtpWhatsapp: true
    }
    const { getByText } = renderWithProviders(<SignUpForm />)
    expect(getByText('Send by SMS')).toBeInTheDocument()
    expect(getByText('Send by WhatsApp')).toBeInTheDocument()
  })
})
