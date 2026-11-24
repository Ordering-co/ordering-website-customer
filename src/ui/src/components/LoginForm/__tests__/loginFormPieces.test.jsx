import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { baseLoginUIProps } from '../../__tests__/helpers/authTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'

// implementation notesthe buttons of the form (submit, SMS / WhatsApp, cancel, the
// eye of the password) and its fields are the design system's pieces. The
// social logins, the tabs, "Send again", the OTP boxes and the phone field are
// not (they keep their own controls).

const { loginUIPropsRef, formErrorsRef, configTuple, optimizationTuple } = vi.hoisted(() => ({
  loginUIPropsRef: { current: null },
  formErrorsRef: { current: {} },
  configTuple: [{ configs: { twilio_service_enabled: { value: '1' } } }],
  optimizationTuple: [{ loading: false, result: { configs: {} } }]
}))

vi.unmock('~ui/src/components/LoginForm/styles')
vi.mock('react-hook-form', () => {
  const { createStableUseFormMock } = require('../../__tests__/helpers/authUiTestMocks.js')
  const form = createStableUseFormMock().useForm()
  return { useForm: () => ({ ...form, get errors () { return formErrorsRef.current } }) }
})
vi.mock('~components/components/LoginForm', () => ({
  LoginForm: ({ UIComponent, ...rest }) => <UIComponent {...rest} {...loginUIPropsRef.current} />
}))
vi.mock('~components/contexts/ConfigContext', () => ({ useConfig: () => configTuple }))
vi.mock('~components/contexts/OptimizationLoadContext', () => ({ useOptimizationLoad: () => optimizationTuple }))
vi.mock('~ui/src/components/FacebookLogin', () => ({
  FacebookLoginButton: ({ onLoadingChange }) => <button type='button' onClick={() => onLoadingChange(true)}>fb</button>
}))
vi.mock('~ui/src/components/SmsLogin', () => ({
  SmsLoginButton: ({ handleSmsLogin, disabled }) => <button type='button' disabled={disabled} onClick={handleSmsLogin}>sms</button>
}))

import { LoginForm } from '../index'

const render = (uiProps = {}, theme = themeWithValues()) => {
  loginUIPropsRef.current = { ...baseLoginUIProps, isCustomerMode: false, ...uiProps }
  return renderWithProviders(<LoginForm />, { theme })
}
const buttonVar = (button, name) => button.style.getPropertyValue(name)
const withSlot = (slot, value) => themeWithValues((values) => {
  values.components.auth_form.slots[slot] = { component: 'button', shape: null, ...value }
  return values
})

describe('LoginForm — fields are the base Input', () => {
  it('email and password', () => {
    const { getByPlaceholderText } = render()
    ;['Email', 'Password'].forEach((name) => {
      expect(getByPlaceholderText(name)).toHaveAttribute('data-slot', 'input')
    })
  })

  it('a field with an error is invalid and points at its message', () => {
    formErrorsRef.current = {
      email: { type: 'required', message: 'The field Email is required' },
      password: { type: 'required', message: 'The field Password is required' }
    }
    const { getByPlaceholderText, getByText } = render()
    ;[['Email', /The field Email is required/], ['Password', /The field Password is required/]].forEach(([name, message]) => {
      const field = getByPlaceholderText(name)
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(field.getAttribute('aria-describedby')).toBe(getByText(message).id)
    })
    formErrorsRef.current = {}
  })

  it('without errors they are not invalid', () => {
    const { getByPlaceholderText } = render()
    ;['Email', 'Password'].forEach((name) => {
      expect(getByPlaceholderText(name)).not.toHaveAttribute('aria-invalid')
      expect(getByPlaceholderText(name)).not.toHaveAttribute('aria-describedby')
    })
  })

  it('the project field carries its icon as the Input\'s prefix (a base Icon)', () => {
    const { getByPlaceholderText } = render({ useRootPoint: true })
    const group = getByPlaceholderText('Project').closest('[data-slot="input-group"]')
    expect(group.querySelector('[data-slot="input-prefix"] svg.lucide')).toHaveAttribute('aria-hidden', 'true')
  })

  it('the email keeps blocking the space key', () => {
    const { getByPlaceholderText } = render()
    expect(fireEvent.keyDown(getByPlaceholderText('Email'), { key: ' ' })).toBe(false)
  })
})

describe('LoginForm — the eye of the password', () => {
  it('is a base icon Button (xs ghost neutral) in the field\'s suffix with a base Icon, named and pressed as before', () => {
    const { getByPlaceholderText, getByLabelText } = render()
    const password = getByPlaceholderText('Password')
    const eye = getByLabelText('Show password')
    expect(eye.tagName).toBe('BUTTON')
    expect(eye).toHaveAttribute('data-slot', 'button')
    expect(eye.className).toContain('ui:w-(--ui-button-height)')
    expect(eye.querySelector('svg')).not.toBeNull()
    expect(eye).toHaveAttribute('type', 'button')
    expect(eye).toHaveAttribute('aria-pressed', 'false')
    expect(eye.querySelector('svg.lucide-eye')).not.toBeNull()
    expect(password.closest('[data-slot="input-group"]').querySelector('[data-slot="input-suffix"]')).toContainElement(eye)

    fireEvent.click(eye)
    expect(password).toHaveAttribute('type', 'text')
    const hide = getByLabelText('Hide password')
    expect(hide).toBe(eye)
    expect(hide).toHaveAttribute('aria-pressed', 'true')
    expect(hide.querySelector('svg.lucide-eye-off')).not.toBeNull()

    fireEvent.click(hide)
    expect(password).toHaveAttribute('type', 'password')
  })

  it('does not submit the form', () => {
    const handleButtonLoginClick = vi.fn()
    const { getByLabelText } = render({ handleButtonLoginClick })
    fireEvent.click(getByLabelText('Show password'))
    expect(handleButtonLoginClick).not.toHaveBeenCalled()
  })
})

describe('LoginForm — the submit (slots.submit)', () => {
  const submit = (container) => container.querySelector('[data-doc-control="authentication-submit"]')

  it('is the base Button, the form\'s submit, named Login', () => {
    const { container, getByRole } = render()
    expect(getByRole('button', { name: 'Login' })).toBe(submit(container))
    expect(submit(container)).toHaveAttribute('data-slot', 'button')
    expect(submit(container)).toHaveAttribute('type', 'submit')
  })

  it('a theme slot with shape icon does not turn the text submit into an icon button', () => {
    const theme = withSlot('submit', { size: 'lg', appearance: 'solid', color: 'primary', shape: 'icon' })
    const { container } = render({}, theme)
    const login = submit(container)
    expect(login).toHaveTextContent('Login')
    expect(login.className).not.toContain('ui:p-none')
    expect(login.className).toContain('ui:px-(--ui-button-padding-x)')
  })

  it('the get-verify-code label on the otp tab', () => {
    const { getByRole } = render({ loginTab: 'otp', otpType: 'email', useLoginOtpEmail: true })
    expect(getByRole('button', { name: 'Get verify code' })).toHaveAttribute('data-slot', 'button')
  })

  it('takes the primary lg of the default slot, and the slot the theme chose', () => {
    const base = themeWithValues()
    const lg = componentVars(base, 'button', { size: 'lg', color: 'primary', appearance: 'solid' })
    const byDefault = render({}, base)
    expect(buttonVar(submit(byDefault.container), '--ui-button-height')).toBe(lg['--ui-button-height'])
    expect(buttonVar(submit(byDefault.container), '--ui-button-background')).toBe(lg['--ui-button-background'])
    byDefault.unmount()

    const theme = withSlot('submit', { size: 'sm', appearance: 'outline', color: 'secondary' })
    const chosen = componentVars(theme, 'button', { size: 'sm', color: 'secondary', appearance: 'outline' })
    const { container } = render({}, theme)
    expect(buttonVar(submit(container), '--ui-button-height')).toBe(chosen['--ui-button-height'])
    expect(buttonVar(submit(container), '--ui-button-height')).not.toBe(lg['--ui-button-height'])
    expect(buttonVar(submit(container), '--ui-button-border')).toBe(chosen['--ui-button-border'])
  })

  it('while it sends: busy, keeps its name, shows no "Loading..." text', () => {
    const { container, queryByText } = render({ formState: { loading: true, result: null } })
    expect(submit(container)).toHaveAttribute('aria-busy', 'true')
    expect(submit(container)).toHaveAccessibleName('Login')
    expect(submit(container).querySelector('[data-slot="button-spinner"]')).not.toBeNull()
    expect(queryByText('Loading...')).toBeNull()
  })

  it('runs the login on click', () => {
    const handleButtonLoginClick = vi.fn()
    const { container } = render({ handleButtonLoginClick })
    fireEvent.click(submit(container))
    expect(handleButtonLoginClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled while a social login loads, and enabled otherwise', () => {
    configTuple[0].configs = { facebook_id: { value: '1234567890' }, facebook_login_enabled: { value: '1' } }
    const { container, getByText } = render()
    expect(submit(container)).not.toBeDisabled()
    fireEvent.click(getByText('fb'))
    expect(submit(container)).toBeDisabled()
    configTuple[0].configs = { twilio_service_enabled: { value: '1' } }
  })
})

describe('LoginForm — "Send by SMS" and "Send by WhatsApp" (slots.submit, one row)', () => {
  const channelProps = { loginTab: 'otp', otpType: 'cellphone', useLoginOtpCellphone: true, useLoginOtpWhatsapp: true }

  it('are two base Buttons that share the row, each in a wrapper that stretches it', () => {
    const { getByRole } = render(channelProps)
    const sms = getByRole('button', { name: 'Send by SMS' })
    const whatsapp = getByRole('button', { name: 'Send by WhatsApp' })
    expect(sms).toHaveAttribute('data-doc-control', 'authentication-otp-sms-submit')
    expect(whatsapp).toHaveAttribute('data-doc-control', 'authentication-otp-whatsapp-submit')
    ;[sms, whatsapp].forEach((button) => {
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button).toHaveAttribute('type', 'button')
      expect(button.parentElement.style.flex).toBe('1 1 0%')
    })
    expect(sms.parentElement.parentElement).toBe(whatsapp.parentElement.parentElement)
    // nothing on the piece itself
    expect(sms.style.flex).toBe('')
  })

  it('both take the slot, and both show the spinner while it sends', () => {
    const theme = withSlot('submit', { size: 'md', appearance: 'tonal', color: 'primary' })
    const chosen = componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'tonal' })
    const { getByRole } = render({ ...channelProps, formState: { loading: true, result: null } }, theme)
    ;['Send by SMS', 'Send by WhatsApp'].forEach((name) => {
      const button = getByRole('button', { name })
      expect(buttonVar(button, '--ui-button-height')).toBe(chosen['--ui-button-height'])
      expect(buttonVar(button, '--ui-button-background')).toBe(chosen['--ui-button-background'])
      expect(button).toHaveAttribute('aria-busy', 'true')
    })
  })
})

describe('LoginForm — "Cancel" (slots.cancel)', () => {
  const openSmsStep = (theme) => {
    const view = render({ loginTab: 'cellphone', useLoginByCellphone: true }, theme)
    fireEvent.click(view.getByText('sms'))
    return view
  }

  it('is a base Button of the cancel slot, and goes back on click', () => {
    const theme = themeWithValues()
    const view = openSmsStep(theme)
    const cancel = view.getByRole('button', { name: 'Cancel' })
    const lg = componentVars(theme, 'button', { size: 'lg', color: 'secondary', appearance: 'solid' })
    expect(cancel).toHaveAttribute('data-slot', 'button')
    expect(cancel).toHaveAttribute('type', 'button')
    expect(buttonVar(cancel, '--ui-button-height')).toBe(lg['--ui-button-height'])
    expect(buttonVar(cancel, '--ui-button-background')).toBe(lg['--ui-button-background'])
    fireEvent.click(cancel)
    expect(view.queryByRole('button', { name: 'Cancel' })).toBeNull()
  })

  it('takes the slot the theme chose', () => {
    const theme = withSlot('cancel', { size: 'sm', appearance: 'outline', color: 'neutral' })
    const chosen = componentVars(theme, 'button', { size: 'sm', color: 'neutral', appearance: 'outline' })
    const cancel = openSmsStep(theme).getByRole('button', { name: 'Cancel' })
    expect(buttonVar(cancel, '--ui-button-height')).toBe(chosen['--ui-button-height'])
    expect(buttonVar(cancel, '--ui-button-border')).toBe(chosen['--ui-button-border'])
  })

  it('is disabled while the form sends', () => {
    const view = render({ loginTab: 'cellphone', useLoginByCellphone: true, formState: { loading: true, result: null } })
    fireEvent.click(view.getByText('sms'))
    expect(view.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
