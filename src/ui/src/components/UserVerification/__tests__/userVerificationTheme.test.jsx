import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { baseUserVerificationUIProps } from '../../__tests__/helpers/authTestUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '../../../design-system/lib/componentVars'

import { UserVerification } from '../index'

// /verify with the theme: its form is a form of components
// .auth_form (its scope and its slots submit and cancel).

const { verificationPropsRef, configTuple, sessionTuple } = vi.hoisted(() => {
  return {
    verificationPropsRef: { current: null },
    configTuple: [{ configs: {} }],
    sessionTuple: [{
      auth: true,
      user: { email_verified: false, phone_verified: false, email: 'user@example.com', cellphone: '5551234567', country_phone_code: '+1' }
    }, { login: vi.fn() }]
  }
})

vi.mock('~components/components/UserVerification', () => ({
  UserVerification: ({ UIComponent, ...rest }) => (
    <UIComponent {...verificationPropsRef.current} {...rest} />
  )
}))
vi.mock('~components/components/UserFormDetails', () => ({
  UserFormDetails: () => <div data-testid='user-form-details' />
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => configTuple
}))
vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => sessionTuple
}))
vi.mock('~ui/src/components/UserFormDetails', () => ({
  UserFormDetailsUI: () => null
}))
vi.mock('~ui/src/components/Overlay/overlays', () => ({
  DialogOverlay: ({ children, open }) => (open ? <div data-testid='modal'>{children}</div> : null)
}))

const emailRequired = () => {
  configTuple[0].configs = {
    verification_email_required: { value: '1' },
    verification_phone_required: { value: '0' }
  }
}

const codeSent = {
  verifyEmailState: { loading: false, loadingSendCode: false, loadingCheckCode: false, codeOutcome: { action: 'send', success: true, response: { error: false } } }
}

const renderVerify = (theme, uiProps = {}) => {
  emailRequired()
  verificationPropsRef.current = { ...baseUserVerificationUIProps, ...uiProps }
  return renderWithProviders(<UserVerification />, { theme })
}

const STYLE = ['--ui-button-height', '--ui-button-background', '--ui-button-color', '--ui-button-border', '--ui-button-radius']
const expectLook = (button, expected) => {
  expect(button).toHaveAttribute('data-slot', 'button')
  STYLE.forEach((name) => expect(button.style.getPropertyValue(name)).toBe(expected[name] ?? ''))
}
const slotTheme = (submit, cancel, mutate = (values) => values) => themeWithValues((values) => {
  values.components.auth_form.slots.submit = { ...values.components.auth_form.slots.submit, ...submit }
  values.components.auth_form.slots.cancel = { ...values.components.auth_form.slots.cancel, ...cancel }
  return mutate(values)
})

describe('UserVerification — components.auth_form', () => {
  it('"Send code" takes slots.submit (primary solid lg)', () => {
    const theme = themeWithValues()
    const { getByText } = renderVerify(theme)
    expectLook(getByText('Send code').closest('button'), componentVars(theme, 'button', { size: 'lg', color: 'primary', appearance: 'solid' }))
  })

  it('Cancel and "Resend again?" take slots.cancel (secondary solid lg)', () => {
    const theme = themeWithValues()
    const { getByText } = renderVerify(theme, codeSent)
    ;['Cancel', 'Resend again?'].forEach((label) => {
      expectLook(getByText(label).closest('button'), componentVars(theme, 'button', { size: 'lg', color: 'secondary', appearance: 'solid' }))
    })
  })

  it('what the store chose for slots.submit and slots.cancel reaches the buttons (size, color, appearance)', () => {
    const theme = slotTheme({ size: 'xs', color: 'danger', appearance: 'outline' }, { size: 'sm', color: 'neutral', appearance: 'tonal' })
    const submit = componentVars(theme, 'button', { size: 'xs', color: 'danger', appearance: 'outline' })
    const cancel = componentVars(theme, 'button', { size: 'sm', color: 'neutral', appearance: 'tonal' })
    const defaults = componentVars(theme, 'button', { size: 'lg', color: 'primary', appearance: 'solid' })
    expect(submit['--ui-button-height']).not.toBe(defaults['--ui-button-height'])
    expect(cancel['--ui-button-height']).not.toBe(defaults['--ui-button-height'])
    const first = renderVerify(theme)
    expectLook(first.getByText('Send code').closest('button'), submit)
    first.unmount()
    const second = renderVerify(theme, codeSent)
    ;['Cancel', 'Resend again?'].forEach((label) => expectLook(second.getByText(label).closest('button'), cancel))
  })

  it('its controls see the components auth_form.scope changes', () => {
    const theme = themeWithValues((values) => {
      values.components.auth_form.scope = {
        ...values.components.auth_form.scope,
        button: {
          ...values.components.button,
          base: { ...values.components.button.base, radius: 3 }
        }
      }
      return values
    })
    const { getByText } = renderVerify(theme)
    expect(getByText('Send code').closest('button').style.getPropertyValue('--ui-button-radius')).toBe('3px')
    expect(componentVars(theme, 'button')['--ui-button-radius']).not.toBe('3px')
  })
})
