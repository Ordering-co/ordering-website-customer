import React, { useEffect, useMemo, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, waitFor, within } from '@testing-library/react'
import { mockFetch, renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { ApiResponse } from '~components/sdk/lib/classes/ApiResponse'
import { User } from '~components/sdk/lib/models/User'
import { UserVerification } from '../index'
import { componentVars } from '../../../design-system/lib/componentVars'
import { defaultTheme, rebuildTheme } from '../../../styles/__tests__/themeTestUtils'

// getByText answers the label inside the Button; the state is the button's
const buttonOf = (label) => label.closest('button')
// the look the base Button takes from a slot of components.auth_form (size, color, appearance)
const expectSlotLook = (button, { size, color, appearance }) => {
  const expected = componentVars(defaultTheme, 'button', { size, color, appearance })
  expect(button).toHaveAttribute('data-slot', 'button')
  ;['--ui-button-height', '--ui-button-background', '--ui-button-color'].forEach((name) => {
    expect(button.style.getPropertyValue(name)).toBe(expected[name])
  })
}

const {
  verificationPropsRef,
  configTuple,
  sessionTuple,
  apiTuple,
  sessionActionsRef,
  sessionStateRef,
  SessionMockContext,
  ordering,
  orderTuple,
  useRealVerification
} = vi.hoisted(() => {
  const React = require('react')
  const configs = {
    verification_email_required: { value: '1' },
    verification_phone_required: { value: '0' }
  }
  const ordering = {
    project: 'demo',
    root: 'https://api.ordering.test',
    appId: 'marketplace-test',
    appInternalName: 'ordering-internal-test'
  }
  ordering.setAccessToken = vi.fn(() => ordering)
  ordering.users = vi.fn()
  return {
    verificationPropsRef: { current: null },
    useRealVerification: { current: false },
    configTuple: [{ configs }],
    sessionTuple: [{ auth: true, user: {}, token: 'test-token' }, { login: vi.fn(), changeUser: vi.fn(), logout: vi.fn() }],
    orderTuple: [{ options: { type: 1 }, carts: {} }, { setStateInitialValues: vi.fn(async () => ({})) }],
    apiTuple: [ordering, { setOrdering: vi.fn() }],
    sessionActionsRef: { current: null },
    sessionStateRef: { current: null },
    SessionMockContext: React.createContext(null),
    ordering
  }
})

vi.mock('../styles', async (importOriginal) => {
  const styles = await importOriginal()
  const React = await import('react')
  return {
    ...styles,
    FormInput: ({ children, ...props }) => React.createElement('form', props, children)
  }
})
vi.mock('~ui/src/components/Confirm', () => ({
  Alert: ({ open, title, content, onAccept }) => open && (
    <div role='alert' data-testid='alert' aria-label={title}>
      {content}
      <button type='button' onClick={onAccept}>Accept</button>
    </div>
  )
}))

vi.mock('~components/components/UserVerification', async (importOriginal) => {
  const actual = await importOriginal()
  const React = await import('react')
  return {
    UserVerification: (props) => {
      if (useRealVerification.current) {
        return React.createElement(actual.UserVerification, props)
      }
      const { UIComponent, ...rest } = props
      return React.createElement(UIComponent, { ...verificationPropsRef.current, ...rest })
    }
  }
})
vi.mock('~components/components/UserFormDetails', async (importOriginal) => await importOriginal())
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => configTuple
}))
vi.mock('~components/contexts/SessionContext', async () => {
  const React = await import('react')
  return {
    useSession: () => React.useContext(SessionMockContext) || sessionTuple
  }
})
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => apiTuple
}))
vi.mock('~components/contexts/CustomerContext', () => ({
  useCustomer: () => [{ user: {} }, { setUserCustomer: vi.fn() }]
}))
vi.mock('~components/contexts/OrderContext', () => ({
  useOrder: () => orderTuple
}))
vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [{ loading: false, fields: { checkout: {} } }]
}))
vi.mock('~components/contexts/WebsocketContext', () => ({
  useWebsocket: () => ({ on: vi.fn(), off: vi.fn(), getId: () => 'socket-id' })
}))
vi.mock('~ui/src/components/UserFormDetails', () => ({
  UserFormDetailsUI: () => null
}))

const baseUser = {
  id: 7,
  email_verified: false,
  phone_verified: false,
  email: 'user@example.com',
  cellphone: '5551234567',
  country_phone_code: '+1'
}

const guestUser = {
  id: 21,
  email_verified: false,
  phone_verified: false,
  email: null,
  guest_id: 'guest-token',
  cellphone: '5551234567',
  country_phone_code: '+1'
}

const emailRequiredConfigs = () => ({
  verification_email_required: { value: '1' },
  verification_phone_required: { value: '0' }
})

const idleEmailState = () => ({
  loading: false,
  loadingSendCode: false,
  loadingCheckCode: false,
  resultSendCode: null,
  errorSendCode: null,
  resultCheckCode: null,
  errorCheckCode: null
})

const idlePhoneState = () => ({
  loading: false,
  loadingSendCode: false,
  loadingCheckCode: false,
  resultSendCode: null,
  errorSendCode: null,
  resultCheckCode: null,
  errorCheckCode: null
})

const makeVerificationProps = (overrides = {}) => ({
  verifyEmailState: idleEmailState(),
  verifyPhoneState: idlePhoneState(),
  sendVerifyEmailCode: vi.fn(),
  sendVerifyPhoneCode: vi.fn(),
  checkVerifyEmailCode: vi.fn(),
  checkVerifyPhoneCode: vi.fn(),
  cleanErrorsState: vi.fn(),
  useWhatsappVerification: false,
  ...overrides
})

const StatefulSession = ({ initialSession, children }) => {
  const [session, setSession] = useState(initialSession)
  const actions = useMemo(() => ({
    login: vi.fn(),
    changeUser: (nextUser) => setSession((prev) => ({ ...prev, user: nextUser })),
    logout: () => setSession((prev) => ({ ...prev, auth: false, user: null, token: null }))
  }), [])
  useEffect(() => {
    sessionActionsRef.current = actions
    sessionStateRef.current = session
  })
  return (
    <SessionMockContext.Provider value={[session, actions]}>
      {children}
    </SessionMockContext.Provider>
  )
}

// the code is the base InputCode: a group of one box per digit; a pasted code fills the boxes
const CODE_GROUP = { name: 'Verification Code' }
const pasteCode = (group, code) => fireEvent.paste(group.querySelector('input'), { clipboardData: { getData: () => code } })

const renderVerification = ({ session, ...options } = {}) => {
  const wrapper = session
    ? ({ children }) => (
        <StatefulSession initialSession={session}>{children}</StatefulSession>
      )
    : undefined
  return renderWithProviders(<UserVerification />, { ...options, wrapper })
}

describe('UserVerification', () => {
  beforeEach(() => {
    verificationPropsRef.current = makeVerificationProps()
    configTuple[0].configs = emailRequiredConfigs()
    sessionTuple[0] = { auth: true, user: { ...baseUser }, token: 'test-token' }
    ordering.users.mockReset()
    ordering.users.mockImplementation(() => ({ save: vi.fn(), get: vi.fn() }))
    sessionActionsRef.current = null
    sessionStateRef.current = null
    useRealVerification.current = false
  })

  it('renders email verification prompt when required', () => {
    const { getByText } = renderVerification()
    expect(getByText('Verification Code')).toBeInTheDocument()
    expect(getByText(/please verify your email/)).toBeInTheDocument()
  })

  it('sends the stored email code when send code is clicked', async () => {
    const sendVerifyEmailCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({ sendVerifyEmailCode })
    const { getByText } = renderVerification()
    fireEvent.click(getByText('Send code'))
    await waitFor(() => {
      expect(sendVerifyEmailCode).toHaveBeenCalledWith({ email: 'user@example.com' })
    })
    expect(ordering.users).not.toHaveBeenCalled()
  })

  it('keeps the stored email read-only and never triggers a profile update', () => {
    const usersSave = vi.fn()
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    const { getByLabelText, getByText, queryByText } = renderVerification({
      session: { auth: true, user: { ...guestUser, email: 'user@example.com' }, token: 'sess-token-1' }
    })
    const emailInput = getByLabelText('Email')
    expect(emailInput).toHaveAttribute('readonly')
    expect(emailInput).toHaveAttribute('placeholder', 'user@example.com')
    expect(getByText('Change')).toBeInTheDocument()
    expect(queryByText('Save')).not.toBeInTheDocument()
    expect(usersSave).not.toHaveBeenCalled()
  })

  it('starts phone verification flow when send code is clicked', async () => {
    const sendVerifyPhoneCode = vi.fn()
    configTuple[0].configs = {
      verification_email_required: { value: '0' },
      verification_phone_required: { value: '1' }
    }
    verificationPropsRef.current = makeVerificationProps({ sendVerifyPhoneCode })

    const { getByText } = renderVerification()
    fireEvent.click(getByText('Send code'))
    await waitFor(() => {
      expect(sendVerifyPhoneCode).toHaveBeenCalledWith({
        cellphone: '5551234567',
        country_phone_code: '+1',
        channel: 2
      })
    })
  })

  it('renders OTP inputs after email code is sent', () => {
    verificationPropsRef.current = makeVerificationProps({
      verifyEmailState: { ...idleEmailState(), codeOutcome: { action: 'send', success: true, response: { error: false } } }
    })
    const { getByRole } = renderVerification()
    expect(getByRole('group', CODE_GROUP)).toBeInTheDocument()
  })

  it('shows alert when email verification returns an error', async () => {
    verificationPropsRef.current = makeVerificationProps({
      verifyEmailState: { ...idleEmailState(), codeOutcome: { action: 'send', success: false, response: { error: true, result: ['Internal mail transport error'] } } }
    })
    const { getByTestId } = renderVerification()
    await waitFor(() => {
      expect(getByTestId('alert')).toHaveTextContent('Please try again')
    })
  })

  it('identifies a failed WhatsApp send and allows a retry via SMS', async () => {
    useRealVerification.current = true
    configTuple[0].configs = {
      verification_email_required: { value: '0' },
      verification_phone_required: { value: '1' },
      whatsapp_otp_login_enabled: { value: '1' }
    }
    mockFetch({ error: true, result: ['Internal SMS gateway diagnostic'], error_codes: ['channel.in'] })
    const view = renderVerification()
    fireEvent.click(view.getByText('Send by WhatsApp'))
    const feedback = await view.findByRole('alert')
    expect(feedback).toHaveTextContent('Check this field and try again.')
    expect(view.getByRole('button', { name: 'Send by WhatsApp' })).toHaveAccessibleDescription(feedback.textContent)
    expect(view.queryByText('Internal SMS gateway diagnostic')).toBeNull()
    mockFetch({ error: false, result: { available: true } })
    fireEvent.click(view.getByText('Send by SMS'))
    expect(await view.findByRole('group', CODE_GROUP)).toBeInTheDocument()
  })

  it('retries the phone code after an API check error on the real controller', async () => {
    useRealVerification.current = true
    configTuple[0].configs = {
      verification_email_required: { value: '0' },
      verification_phone_required: { value: '1' }
    }
    mockFetch({ error: false, result: { available: true } })
    const view = renderVerification()
    fireEvent.click(view.getByText('Send code'))
    const code = await view.findByRole('group', CODE_GROUP)
    mockFetch({ error: true, result: ['Internal code diagnostic'], error_codes: ['code.invalid'] })
    pasteCode(code, '1234')
    const feedback = await view.findByText('Check the verification code or request a new one.')
    const firstDigit = within(code).getAllByRole('textbox')[0]
    expect(firstDigit).toHaveAccessibleDescription(feedback.textContent)
    fireEvent.keyDown(firstDigit, { key: 'Delete' })
    mockFetch({ error: false, result: { id: 7, phone_verified: true } })
    pasteCode(code, '1234')
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'https://api.ordering.test/users/7/verify',
      expect.objectContaining({ body: JSON.stringify({ channel: 2, code: '1234' }) })
    ))
    expect(feedback).not.toBeInTheDocument()
  })

  it.each([
    ['phone', { error: true, error_codes: ['ERROR_VERIFICATION_CODE_INVALID'] }],
    ['email', { error: true, error_codes: ['ERROR_VERIFICATION_CODE_INVALID'], result: ['Internal OTP diagnostic'] }]
  ])('shows invalid-code feedback and sends a new %s code on request', async (channel, payload) => {
    useRealVerification.current = true
    const email = channel === 'email'
    configTuple[0].configs = {
      verification_email_required: { value: email ? '1' : '0' },
      verification_phone_required: { value: email ? '0' : '1' }
    }
    mockFetch({ error: false, result: { available: true } })
    const view = renderVerification()
    fireEvent.click(view.getByText('Send code'))
    const code = await view.findByRole('group', CODE_GROUP)
    mockFetch(payload)
    pasteCode(code, email ? '123456' : '1234')

    const feedback = await view.findByText('Check the verification code or request a new one.')
    expect(within(code).getAllByRole('textbox')[0]).toHaveAccessibleDescription(feedback.textContent)
    expect(view.queryByText('Internal OTP diagnostic')).toBeNull()
    const resend = view.getByRole('button', { name: 'Resend again?' })
    expect(resend).toBeEnabled()
    mockFetch({ error: false, result: { available: true } })
    fireEvent.click(resend)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledOnce())
    expect(global.fetch).toHaveBeenCalledWith('https://api.ordering.test/codes/generate', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining(`"channel":${email ? 1 : 2}`)
    }))
    expect(feedback).not.toBeInTheDocument()
    expect(within(code).getAllByRole('textbox').every(input => input.value === '')).toBe(true)
  })

  it('renders phone OTP inputs after code is sent', () => {
    configTuple[0].configs = {
      verification_email_required: { value: '0' },
      verification_phone_required: { value: '1' }
    }
    verificationPropsRef.current = makeVerificationProps({
      verifyPhoneState: { ...idlePhoneState(), codeOutcome: { action: 'send', success: true, response: { error: false } } }
    })
    const { getByRole } = renderVerification()
    expect(getByRole('group', CODE_GROUP)).toBeInTheDocument()
  })

  it.each([null, undefined, ''])('renders an editable email form when the session email is %s', (email) => {
    sessionTuple[0] = { auth: true, user: { ...guestUser, email }, token: 'test-token' }
    const { getByLabelText, getByText, queryByText } = renderVerification()
    const input = getByLabelText('Email')
    expect(input).not.toBeDisabled()
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('placeholder', 'Email')
    expect(getByText('Save')).toBeInTheDocument()
    expect(queryByText('Send code')).not.toBeInTheDocument()
  })

  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['not-an-email', 'Invalid email'],
    ['a@b', 'Invalid email']
  ])('blocks saving an empty or invalid draft like %s', (draft, expectedMessage) => {
    sessionTuple[0] = { auth: true, user: { ...guestUser }, token: 'test-token' }
    const usersSave = vi.fn()
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    const sendVerifyEmailCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({ sendVerifyEmailCode })

    const { getByLabelText, getByText, getByRole } = renderVerification()
    if (draft) {
      fireEvent.change(getByLabelText('Email'), { target: { value: draft } })
    }
    fireEvent.click(getByText('Save'))
    expect(usersSave).not.toHaveBeenCalled()
    expect(getByRole('alert')).toHaveTextContent(expectedMessage)
    expect(getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(sendVerifyEmailCode).not.toHaveBeenCalled()
  })

  it('does not save twice while a save is in flight', async () => {
    sessionTuple[0] = { auth: true, user: { ...guestUser }, token: 'test-token' }
    let resolveSave
    const usersSave = vi.fn(() => new Promise((resolve) => { resolveSave = resolve }))
    ordering.users.mockImplementation(() => ({ save: usersSave }))

    const { getByLabelText, getByText } = renderVerification()
    fireEvent.change(getByLabelText('Email'), { target: { value: 'guest@example.com' } })
    const saveButton = buttonOf(getByText('Save'))
    fireEvent.click(saveButton)
    // busy (the piece's loading: aria-busy, no click answered, its name kept)
    await waitFor(() => expect(saveButton).toHaveAttribute('aria-busy', 'true'))
    expect(saveButton).toHaveAttribute('data-disabled')
    expect(saveButton).toHaveTextContent('Save')
    fireEvent.click(saveButton)
    expect(usersSave).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolveSave({ content: { error: false, result: { ...guestUser, email: 'guest@example.com' } } })
    })
  })

  it.each([
    { name: 'array', result: ['Email already registered', 'Field is invalid'] },
    { name: 'sdk model-cast array', result: new ApiResponse({ status: 200, data: { error: true, result: ['Email already registered'] } }, { json: true, CastClass: User }).content.result },
    { name: 'object', result: { code: 500 } }
  ])('shows the $name save error and keeps the draft without sending a code', async ({ result }) => {
    sessionTuple[0] = { auth: true, user: { ...guestUser }, token: 'test-token' }
    const usersSave = vi.fn().mockResolvedValue({ content: { error: true, result } })
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    const sendVerifyEmailCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({ sendVerifyEmailCode })

    const { getByLabelText, getByText, getByTestId } = renderVerification()
    fireEvent.change(getByLabelText('Email'), { target: { value: 'guest@example.com' } })
    fireEvent.click(getByText('Save'))

    await waitFor(() => expect(getByTestId('alert')).toHaveTextContent('Please try again'))
    expect(getByLabelText('Email')).toHaveValue('guest@example.com')
    expect(sendVerifyEmailCode).not.toHaveBeenCalled()
  })

  it('associates a structured email error with the draft and clears it when edited', async () => {
    sessionTuple[0] = { auth: true, user: { ...guestUser }, token: 'test-token' }
    ordering.users.mockImplementation(() => ({
      save: vi.fn().mockResolvedValue({
        content: { error: true, result: ['Internal duplicate email diagnostic'], error_codes: ['email.unique'] }
      })
    }))
    const view = renderVerification()
    const email = view.getByLabelText('Email')
    fireEvent.change(email, { target: { value: 'taken@example.com' } })
    fireEvent.click(view.getByText('Save'))

    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    expect(email).toHaveAccessibleDescription()
    expect(view.queryByText('Internal duplicate email diagnostic')).toBeNull()
    expect(view.queryByTestId('alert')).toBeNull()
    fireEvent.change(email, { target: { value: 'other@example.com' } })
    expect(email).not.toHaveAttribute('aria-invalid')
  })

  it('shows a network save error, keeps the draft, and retries successfully via Enter', async () => {
    const guest = { ...guestUser }
    const usersSave = vi.fn()
      .mockRejectedValueOnce(new Error('Connection lost'))
      .mockResolvedValue({
        content: { error: false, result: { id: 21, email: 'guest@example.com', guest_id: 'guest-token' } }
      })
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    const sendVerifyEmailCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({ sendVerifyEmailCode })

    const { getByLabelText, getByText, getByRole, getByPlaceholderText } = renderVerification({
      session: { auth: true, user: guest, token: 'sess-token-1' }
    })

    const input = getByLabelText('Email')
    fireEvent.change(input, { target: { value: 'guest@example.com' } })
    fireEvent.click(getByText('Save'))

    await waitFor(() => expect(getByRole('alert')).toHaveTextContent('Please try again'))
    expect(input).toHaveValue('guest@example.com')
    expect(buttonOf(getByText('Save'))).toBeEnabled()
    expect(usersSave).toHaveBeenCalledTimes(1)
    expect(sendVerifyEmailCode).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(usersSave).toHaveBeenCalledTimes(2))
    expect(ordering.users).toHaveBeenCalledWith(21)
    expect(usersSave).toHaveBeenLastCalledWith(
      { email: 'guest@example.com', guest_token: 'guest-token' },
      { accessToken: 'sess-token-1' }
    )
    const retryPayload = usersSave.mock.calls[1][0]
    expect(retryPayload.password).toBeUndefined()
    expect(retryPayload.email_verified).toBeUndefined()

    const emailDisplay = await waitFor(() => getByPlaceholderText('guest@example.com'))
    expect(emailDisplay).toHaveAttribute('readonly')
    expect(getByText('Send code')).toBeInTheDocument()
    expect(sendVerifyEmailCode).not.toHaveBeenCalled()
  })

  it('saves a guest email, keeps the guest session, then sends and checks the code for the saved email', async () => {
    const guest = { ...guestUser }
    const usersSave = vi.fn().mockResolvedValue({
      content: { error: false, result: { id: 21, email: 'guest@example.com', guest_id: 'guest-token' } }
    })
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    const sendVerifyEmailCode = vi.fn()
    const checkVerifyEmailCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({ sendVerifyEmailCode, checkVerifyEmailCode })

    const { getByLabelText, getByRole, getByText, getByPlaceholderText, rerender } = renderVerification({
      session: { auth: true, user: guest, token: 'sess-token-1' }
    })

    fireEvent.change(getByLabelText('Email'), { target: { value: '  Guest@Example.COM ' } })
    fireEvent.click(getByText('Save'))

    await waitFor(() => expect(usersSave).toHaveBeenCalledTimes(1))
    expect(ordering.users).toHaveBeenCalledWith(21)
    expect(usersSave).toHaveBeenCalledWith(
      { email: 'guest@example.com', guest_token: 'guest-token' },
      { accessToken: 'sess-token-1' }
    )
    expect(sessionStateRef.current.user.guest_id).toBe('guest-token')
    expect(sessionStateRef.current.user.password).toBeUndefined()

    const emailDisplay = await waitFor(() => getByPlaceholderText('guest@example.com'))
    expect(emailDisplay).toHaveAttribute('readonly')

    fireEvent.click(getByText('Send code'))
    expect(sendVerifyEmailCode).toHaveBeenCalledWith({ email: 'guest@example.com' })

    verificationPropsRef.current = makeVerificationProps({
      sendVerifyEmailCode,
      checkVerifyEmailCode,
      verifyEmailState: { ...idleEmailState(), codeOutcome: { action: 'send', success: true, response: { error: false } } }
    })
    rerender(<UserVerification />)

    const otp = await waitFor(() => getByRole('group', CODE_GROUP))
    pasteCode(otp, '123456')
    await waitFor(() => expect(checkVerifyEmailCode).toHaveBeenCalledWith({ code: '123456' }))

    fireEvent.click(getByText('Resend again?'))
    expect(sendVerifyEmailCode).toHaveBeenCalledTimes(2)
    expect(sendVerifyEmailCode).toHaveBeenLastCalledWith({ email: 'guest@example.com' })
  })

  it('never sends an email code while the session email is missing', async () => {
    sessionTuple[0] = { auth: true, user: { ...guestUser }, token: 'test-token' }
    const sendVerifyEmailCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({
      sendVerifyEmailCode,
      verifyEmailState: { ...idleEmailState(), codeOutcome: { action: 'send', success: true, response: { error: false } } }
    })
    const { getByText } = renderVerification()
    const resend = await waitFor(() => getByText('Resend again?'))
    fireEvent.click(resend)
    expect(sendVerifyEmailCode).not.toHaveBeenCalled()
  })

  it('does not send another email code while one is being generated', () => {
    const sendVerifyEmailCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({
      sendVerifyEmailCode,
      verifyEmailState: { ...idleEmailState(), loadingSendCode: true }
    })
    const { getByText } = renderVerification()
    const sendButton = buttonOf(getByText('Send code'))
    expect(sendButton).toHaveAttribute('aria-busy', 'true')
    expect(sendButton).toHaveAttribute('data-disabled')
    fireEvent.click(sendButton)
    expect(sendVerifyEmailCode).not.toHaveBeenCalled()
  })

  it('clears the typed email when the session user changes', async () => {
    const guest = { ...guestUser }
    const { getByLabelText } = renderVerification({
      session: { auth: true, user: guest, token: 'test-token' }
    })
    fireEvent.change(getByLabelText('Email'), { target: { value: 'draft@example.com' } })
    expect(getByLabelText('Email')).toHaveValue('draft@example.com')
    act(() => {
      sessionActionsRef.current.changeUser({ ...guest, id: 99 })
    })
    expect(getByLabelText('Email')).toHaveValue('')
  })

  it('"Update profile" (phone required, none stored) opens the base dialog titled Update Profile; its close closes it', async () => {
    configTuple[0].configs = {
      verification_email_required: { value: '0' },
      verification_phone_required: { value: '1' }
    }
    sessionTuple[0] = { auth: true, user: { ...baseUser, cellphone: null, country_phone_code: null }, token: 'test-token' }
    const { getByRole, findByRole, queryByRole } = renderVerification()
    fireEvent.click(getByRole('button', { name: 'Update profile' }))
    const dialog = await findByRole('dialog', { name: 'Update Profile' })
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content')
    expect(document.querySelector('#app-modals .popup-component')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(queryByRole('dialog')).toBeNull())
  })

  it('keeps the phone flow for guests without email when only phone verification is required', async () => {
    configTuple[0].configs = {
      verification_email_required: { value: '0' },
      verification_phone_required: { value: '1' }
    }
    sessionTuple[0] = {
      auth: true,
      user: { ...guestUser, cellphone: '5551234567', country_phone_code: '+1' },
      token: 'test-token'
    }
    const sendVerifyPhoneCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({ sendVerifyPhoneCode })

    const { getByText, queryByLabelText } = renderVerification()
    expect(queryByLabelText('Email')).not.toBeInTheDocument()
    fireEvent.click(getByText('Send code'))
    await waitFor(() => {
      expect(sendVerifyPhoneCode).toHaveBeenCalledWith({
        cellphone: '5551234567',
        country_phone_code: '+1',
        channel: 2
      })
    })
  })

  it('requests the email code through the real controller contract', async () => {
    const { UserVerification: RealUserVerificationController } = await vi.importActual('~components/components/UserVerification')
    const captured = { current: null }
    const SpyUI = (props) => {
      captured.current = props
      return null
    }
    mockFetch({ error: false, result: { generated: true } })
    renderWithProviders(<RealUserVerificationController UIComponent={SpyUI} />)
    await act(async () => {
      await captured.current.sendVerifyEmailCode({ email: 'guest@example.com' })
    })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.ordering.test/codes/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        body: JSON.stringify({ type: 3, channel: 1, size: 6, email: 'guest@example.com' })
      })
    )
  })

  it.each([false, true])('keeps the legacy check state with includeResponse=%s', async (includeResponse) => {
    const { UserVerification: RealUserVerificationController } = await vi.importActual('~components/components/UserVerification')
    const payload = { error: true, error_codes: ['ERROR_VERIFICATION_CODE_INVALID'], result: 'Diagnostic', errors: { code: ['invalid'] } }
    let controller
    const Capture = (props) => {
      controller = props
      return null
    }
    mockFetch(payload)
    renderWithProviders(<RealUserVerificationController UIComponent={Capture} includeResponse={includeResponse || undefined} />)
    await act(async () => { await controller.checkVerifyEmailCode({ code: '123456' }) })
    const legacyState = {
      loadingSendCode: false,
      resultSendCode: null,
      errorSendCode: [payload.result],
      loadingCheckCode: false,
      resultCheckCode: null,
      errorCheckCode: null
    }
    expect(controller.verifyEmailState).toEqual(includeResponse
      ? { ...legacyState, codeOutcome: { action: 'check', success: false, response: payload } }
      : legacyState)
  })

  it('prevents native form navigation after saving the email with Enter', async () => {
    const usersSave = vi.fn().mockResolvedValue({
      content: { error: false, result: { id: 21, email: 'guest@example.com', guest_id: 'guest-token' } }
    })
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    const sendVerifyEmailCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({ sendVerifyEmailCode })
    const { getByLabelText, getByPlaceholderText } = renderVerification({
      session: { auth: true, user: { ...guestUser }, token: 'sess-token-1' }
    })
    const input = getByLabelText('Email')
    fireEvent.change(input, { target: { value: 'guest@example.com' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    const savedInput = await waitFor(() => getByPlaceholderText('guest@example.com'))
    const submit = new Event('submit', { bubbles: true, cancelable: true })
    fireEvent(savedInput.closest('form'), submit)
    expect(submit.defaultPrevented).toBe(true)
    expect(savedInput).toHaveAttribute('readonly')
    expect(sessionStateRef.current.user.email).toBe('guest@example.com')
    expect(usersSave).toHaveBeenCalledTimes(1)
    expect(sendVerifyEmailCode).not.toHaveBeenCalled()
  })
})

describe('UserVerification stored-email editing', () => {
  beforeEach(() => {
    verificationPropsRef.current = makeVerificationProps()
    configTuple[0].configs = emailRequiredConfigs()
    sessionTuple[0] = { auth: true, user: { ...guestUser, email: 'user@example.com' }, token: 'test-token' }
    ordering.users.mockReset()
    ordering.users.mockImplementation(() => ({ save: vi.fn(), get: vi.fn() }))
    sessionActionsRef.current = null
    sessionStateRef.current = null
    useRealVerification.current = false
  })

  it('opens an editable form prefilled with the stored email', () => {
    const { getByText, getByLabelText } = renderVerification()
    fireEvent.click(getByText('Change'))
    const input = getByLabelText('Email')
    expect(input).not.toBeDisabled()
    expect(input).toHaveValue('user@example.com')
    expect(getByText('Save')).toBeInTheDocument()
    expect(getByText('Cancel')).toBeInTheDocument()
  })

  it('cancelling an edit restores the readonly email without saving', () => {
    const usersSave = vi.fn()
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    const { getByText, getByLabelText, getByPlaceholderText } = renderVerification()
    fireEvent.click(getByText('Change'))
    fireEvent.change(getByLabelText('Email'), { target: { value: 'draft@example.com' } })
    fireEvent.click(getByText('Cancel'))
    expect(usersSave).not.toHaveBeenCalled()
    expect(getByPlaceholderText('user@example.com')).toHaveAttribute('readonly')
    expect(getByText('Send code')).toBeInTheDocument()
  })

  it.each([
    ['not-an-email', 'Invalid email'],
    ['a@b', 'Invalid email'],
    ['   ', 'required']
  ])('blocks saving an invalid edited email like %s', (draft, expectedMessage) => {
    const usersSave = vi.fn()
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    const sendVerifyEmailCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({ sendVerifyEmailCode })
    const { getByText, getByLabelText, getByRole } = renderVerification()
    fireEvent.click(getByText('Change'))
    fireEvent.change(getByLabelText('Email'), { target: { value: draft } })
    fireEvent.click(getByText('Save'))
    expect(usersSave).not.toHaveBeenCalled()
    expect(getByRole('alert')).toHaveTextContent(expectedMessage)
    expect(getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(sendVerifyEmailCode).not.toHaveBeenCalled()
  })

  it('saves a corrected guest email with guest_token and uses it for send and resend', async () => {
    const guest = { ...guestUser, email: 'typo@guest.com' }
    const usersSave = vi.fn().mockResolvedValue({
      content: { error: false, result: { id: 21, email: 'fixed@guest.com', guest_id: 'guest-token' } }
    })
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    const sendVerifyEmailCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({ sendVerifyEmailCode })

    const { getByText, getByLabelText, getByPlaceholderText, rerender } = renderVerification({
      session: { auth: true, user: guest, token: 'sess-token-1' }
    })
    fireEvent.click(getByText('Change'))
    const input = getByLabelText('Email')
    expect(input).toHaveValue('typo@guest.com')
    fireEvent.change(input, { target: { value: 'fixed@guest.com' } })
    fireEvent.click(getByText('Save'))

    await waitFor(() => expect(usersSave).toHaveBeenCalledTimes(1))
    expect(ordering.users).toHaveBeenCalledWith(21)
    expect(usersSave).toHaveBeenCalledWith(
      { email: 'fixed@guest.com', guest_token: 'guest-token' },
      { accessToken: 'sess-token-1' }
    )
    const payload = usersSave.mock.calls[0][0]
    expect(payload.password).toBeUndefined()
    expect(payload.email_verified).toBeUndefined()

    const emailDisplay = await waitFor(() => getByPlaceholderText('fixed@guest.com'))
    expect(emailDisplay).toHaveAttribute('readonly')
    fireEvent.click(getByText('Send code'))
    expect(sendVerifyEmailCode).toHaveBeenCalledWith({ email: 'fixed@guest.com' })

    verificationPropsRef.current = makeVerificationProps({
      sendVerifyEmailCode,
      verifyEmailState: { ...idleEmailState(), codeOutcome: { action: 'send', success: true, response: { error: false } } }
    })
    rerender(<UserVerification />)
    fireEvent.click(await waitFor(() => getByText('Resend again?')))
    expect(sendVerifyEmailCode).toHaveBeenLastCalledWith({ email: 'fixed@guest.com' })
  })

  it('keeps the edited draft after a rejected save and Cancel returns to the stored email', async () => {
    const guest = { ...guestUser, email: 'old@guest.com' }
    const usersSave = vi.fn().mockResolvedValue({
      content: { error: true, result: ['Email already registered'] }
    })
    ordering.users.mockImplementation(() => ({ save: usersSave }))

    const { getByText, getByLabelText, getByRole, getByPlaceholderText } = renderVerification({
      session: { auth: true, user: guest, token: 'sess-token-1' }
    })
    fireEvent.click(getByText('Change'))
    const input = getByLabelText('Email')
    fireEvent.change(input, { target: { value: 'taken@guest.com' } })
    fireEvent.click(getByText('Save'))

    await waitFor(() => expect(getByRole('alert')).toHaveTextContent('Please try again'))
    expect(getByLabelText('Email')).toHaveValue('taken@guest.com')
    fireEvent.click(getByText('Cancel'))
    expect(getByPlaceholderText('old@guest.com')).toHaveAttribute('readonly')
    expect(usersSave).toHaveBeenCalledTimes(1)
  })

  it.each(['same@guest.com', 'SAME@GUEST.COM'])('does not save when the edited email is unchanged like %s', async (draft) => {
    const guest = { ...guestUser, email: 'same@guest.com' }
    const usersSave = vi.fn()
    ordering.users.mockImplementation(() => ({ save: usersSave }))

    const { getByText, getByLabelText, getByPlaceholderText, queryByText } = renderVerification({
      session: { auth: true, user: guest, token: 'sess-token-1' }
    })
    fireEvent.click(getByText('Change'))
    fireEvent.change(getByLabelText('Email'), { target: { value: draft } })
    fireEvent.click(getByText('Save'))
    expect(usersSave).not.toHaveBeenCalled()
    expect(await waitFor(() => getByPlaceholderText('same@guest.com'))).toHaveAttribute('readonly')
    expect(queryByText('Save')).not.toBeInTheDocument()
  })

  it('does not offer Change or Save to a registered user and still sends the stored email', async () => {
    const usersSave = vi.fn()
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    const sendVerifyEmailCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({ sendVerifyEmailCode })

    const { getByText, queryByText, queryByRole, getByLabelText, getByPlaceholderText } = renderVerification({
      session: { auth: true, user: { ...baseUser }, token: 'sess-token-1' }
    })
    expect(getByPlaceholderText('user@example.com')).toBeInTheDocument()
    expect(getByLabelText('Email')).toHaveAttribute('readonly')
    expect(queryByText('Change')).not.toBeInTheDocument()
    expect(queryByText('Save')).not.toBeInTheDocument()
    expect(buttonOf(getByText('Send code'))).not.toBeDisabled()
    expect(queryByRole('status')).not.toBeInTheDocument()
    fireEvent.click(getByText('Send code'))
    expect(sendVerifyEmailCode).toHaveBeenCalledWith({ email: 'user@example.com' })
    expect(usersSave).not.toHaveBeenCalled()
  })

  it.each([null, undefined, ''])('disables send and explains why to a registered user with email %s', (email) => {
    const usersSave = vi.fn()
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    const sendVerifyEmailCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({ sendVerifyEmailCode })

    const { getByText, getByLabelText, queryByText, getByRole } = renderVerification({
      session: { auth: true, user: { ...baseUser, email }, token: 'sess-token-1' }
    })
    expect(getByLabelText('Email')).toHaveAttribute('readonly')
    expect(queryByText('Save')).not.toBeInTheDocument()
    expect(queryByText('Change')).not.toBeInTheDocument()
    expect(getByRole('status')).toHaveTextContent('This account has no email address. An email address is required to send a verification code.')
    const sendButton = buttonOf(getByText('Send code'))
    expect(sendButton).toBeDisabled()
    fireEvent.click(sendButton)
    expect(sendVerifyEmailCode).not.toHaveBeenCalled()
    expect(usersSave).not.toHaveBeenCalled()
  })

  it('resets the email verification flow after a correction so an abandoned OTP is never checked', async () => {
    useRealVerification.current = true
    const guest = { ...guestUser, email: 'old@guest.com' }
    const usersSave = vi.fn().mockResolvedValue({
      content: { error: false, result: { id: 21, email: 'new@guest.com', guest_id: 'guest-token' } }
    })
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    global.fetch = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => String(url).includes('/verify')
        ? { error: false, result: { id: 21, email_verified: true } }
        : { error: false, result: { available: true } }
    }))

    const { getByText, getByLabelText, getByPlaceholderText, getByRole, queryByRole } = renderVerification({
      session: { auth: true, user: guest, token: 'sess-token-1' }
    })

    fireEvent.click(getByText('Send code'))
    await waitFor(() => expect(getByRole('group', CODE_GROUP)).toBeInTheDocument())
    fireEvent.click(getByText('Cancel'))
    await waitFor(() => expect(getByPlaceholderText('old@guest.com')).toHaveAttribute('readonly'))

    fireEvent.click(getByText('Change'))
    fireEvent.change(getByLabelText('Email'), { target: { value: 'new@guest.com' } })
    fireEvent.click(getByText('Save'))
    await waitFor(() => expect(usersSave).toHaveBeenCalledTimes(1))

    const emailDisplay = await waitFor(() => getByPlaceholderText('new@guest.com'))
    expect(emailDisplay).toHaveAttribute('readonly')
    expect(queryByRole('group', CODE_GROUP)).not.toBeInTheDocument()
    expect(global.fetch.mock.calls.filter(([url]) => String(url).includes('/verify'))).toHaveLength(0)

    fireEvent.click(getByText('Send code'))
    await waitFor(() => {
      const generateCalls = global.fetch.mock.calls.filter(([url]) => String(url).includes('/codes/generate'))
      expect(generateCalls).toHaveLength(2)
      expect(JSON.parse(generateCalls[0][1].body).email).toBe('old@guest.com')
      expect(JSON.parse(generateCalls[1][1].body).email).toBe('new@guest.com')
    })

    const otp = await waitFor(() => getByRole('group', CODE_GROUP))
    pasteCode(otp, '654321')
    await waitFor(() => {
      const verifyCalls = global.fetch.mock.calls.filter(([url]) => String(url).includes('/users/21/verify'))
      expect(verifyCalls).toHaveLength(1)
      expect(JSON.parse(verifyCalls[0][1].body).code).toBe('654321')
    })
  })

  it('does not reuse the old email code result when sending to the corrected email fails', async () => {
    useRealVerification.current = true
    const guest = { ...guestUser, email: 'old@guest.com' }
    const usersSave = vi.fn().mockResolvedValue({
      content: { error: false, result: { id: 21, email: 'new@guest.com', guest_id: 'guest-token' } }
    })
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ error: false, result: { available: true } }) })
      .mockRejectedValueOnce(new Error('Connection lost'))
    const { getByText, getByLabelText, getByPlaceholderText, getByRole, getByTestId, queryByRole } = renderVerification({
      session: { auth: true, user: guest, token: 'sess-token-1' }
    })
    fireEvent.click(getByText('Send code'))
    const oldOtp = await waitFor(() => getByRole('group', CODE_GROUP))
    pasteCode(oldOtp, '12')
    fireEvent.click(getByText('Cancel'))
    fireEvent.click(getByText('Change'))
    fireEvent.change(getByLabelText('Email'), { target: { value: 'new@guest.com' } })
    fireEvent.click(getByText('Save'))
    await waitFor(() => expect(getByPlaceholderText('new@guest.com')).toHaveAttribute('readonly'))
    fireEvent.click(getByText('Send code'))
    await waitFor(() => expect(getByTestId('alert')).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).email).toBe('old@guest.com')
    expect(JSON.parse(global.fetch.mock.calls[1][1].body).email).toBe('new@guest.com')
    expect(queryByRole('group', CODE_GROUP)).not.toBeInTheDocument()
    expect(getByPlaceholderText('new@guest.com')).toHaveAttribute('readonly')
    expect(getByText('Send code')).toBeInTheDocument()
  })

  it('prefills the draft from guest_email and still requires Save before send', async () => {
    const guest = { ...guestUser, email: null, guest_email: 'hint@guest.com' }
    const usersSave = vi.fn().mockResolvedValue({
      content: { error: false, result: { id: 21, email: 'hint@guest.com', guest_id: 'guest-token' } }
    })
    ordering.users.mockImplementation(() => ({ save: usersSave }))
    const sendVerifyEmailCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({ sendVerifyEmailCode })

    const { getByText, getByLabelText, getByPlaceholderText, queryByText } = renderVerification({
      session: { auth: true, user: guest, token: 'sess-token-1' }
    })
    const input = getByLabelText('Email')
    expect(input).toHaveValue('hint@guest.com')
    expect(queryByText('Send code')).not.toBeInTheDocument()
    fireEvent.click(getByText('Save'))
    await waitFor(() => expect(usersSave).toHaveBeenCalledTimes(1))
    expect(usersSave).toHaveBeenCalledWith(
      { email: 'hint@guest.com', guest_token: 'guest-token' },
      { accessToken: 'sess-token-1' }
    )
    expect(await waitFor(() => getByPlaceholderText('hint@guest.com'))).toHaveAttribute('readonly')
    fireEvent.click(getByText('Send code'))
    expect(sendVerifyEmailCode).toHaveBeenCalledWith({ email: 'hint@guest.com' })
  })

  it('prefers the stored email over guest_email for the draft', () => {
    const guest = { ...guestUser, email: 'stored@guest.com', guest_email: 'hint@guest.com' }
    const { getByText, getByLabelText, getByPlaceholderText } = renderVerification({
      session: { auth: true, user: guest, token: 'sess-token-1' }
    })
    expect(getByPlaceholderText('stored@guest.com')).toHaveAttribute('readonly')
    fireEvent.click(getByText('Change'))
    expect(getByLabelText('Email')).toHaveValue('stored@guest.com')
  })

  describe('guest email save failure recovery', () => {
    const saveOccupiedEmail = () => {
      const guest = { ...guestUser, email: 'old@guest.com' }
      const logoutApi = vi.fn().mockResolvedValue({ content: { error: false, result: true } })
      const usersSave = vi.fn().mockResolvedValue({
        content: { error: true, result: ['Email already registered'] }
      })
      ordering.users.mockImplementation(() => ({ save: usersSave, get: vi.fn(), logout: logoutApi }))
      const sendVerifyEmailCode = vi.fn()
      verificationPropsRef.current = makeVerificationProps({ sendVerifyEmailCode })
      const rendered = renderVerification({
        session: { auth: true, user: guest, token: 'sess-token-1' }
      })
      fireEvent.click(rendered.getByText('Change'))
      fireEvent.change(rendered.getByLabelText('Email'), { target: { value: 'taken@guest.com' } })
      fireEvent.click(rendered.getByText('Save'))
      return { ...rendered, guest, usersSave, logoutApi, sendVerifyEmailCode }
    }

    it('shows safe save feedback, a recovery hint and Logout while keeping the draft and no OTP', async () => {
      const { getByRole, getByLabelText, getByText, queryByRole } = saveOccupiedEmail()
      await waitFor(() => expect(getByRole('alert')).toHaveTextContent('Please try again'))
      expect(getByText('If this email is already in use, enter another email or log out, then log in or sign up with this email.')).toBeInTheDocument()
      expect(getByText('Logout')).toBeInTheDocument()
      expect(getByLabelText('Email')).toHaveValue('taken@guest.com')
      expect(queryByRole('group', CODE_GROUP)).not.toBeInTheDocument()
      expect(verificationPropsRef.current.sendVerifyEmailCode).not.toHaveBeenCalled()
    })

    it('logout success clears the session and resets order through the real controller', async () => {
      const { getByText, logoutApi, sendVerifyEmailCode } = saveOccupiedEmail()
      await waitFor(() => expect(getByText('Logout')).toBeInTheDocument())
      fireEvent.click(getByText('Logout'))
      await waitFor(() => expect(logoutApi).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(sessionStateRef.current.auth).toBe(false))
      expect(sessionStateRef.current.user).toBeNull()
      expect(orderTuple[1].setStateInitialValues).toHaveBeenCalled()
      expect(ordering.setAccessToken).toHaveBeenCalledWith(null)
      expect(sendVerifyEmailCode).not.toHaveBeenCalled()
    })

    it('logout failure keeps the guest session, shows the error and re-enables Save and Logout', async () => {
      const guest = { ...guestUser, email: 'old@guest.com' }
      const logoutApi = vi.fn().mockResolvedValue({ content: { error: true, result: 'Cannot logout' } })
      const usersSave = vi.fn().mockResolvedValue({
        content: { error: true, result: ['Email already registered'] }
      })
      ordering.users.mockImplementation(() => ({ save: usersSave, get: vi.fn(), logout: logoutApi }))
      const rendered = renderVerification({
        session: { auth: true, user: guest, token: 'sess-token-1' }
      })
      fireEvent.click(rendered.getByText('Change'))
      fireEvent.change(rendered.getByLabelText('Email'), { target: { value: 'taken@guest.com' } })
      fireEvent.click(rendered.getByText('Save'))
      await waitFor(() => expect(rendered.getByText('Logout')).toBeInTheDocument())

      fireEvent.click(rendered.getByText('Logout'))
      await waitFor(() => expect(logoutApi).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(buttonOf(rendered.getByText('Logout'))).not.toBeDisabled())
      expect(sessionStateRef.current.auth).toBe(true)
      expect(sessionStateRef.current.user?.guest_id).toBe('guest-token')
      expect(rendered.getByLabelText('Email')).not.toBeDisabled()
      expect(buttonOf(rendered.getByText('Save'))).not.toBeDisabled()
      expect(rendered.getByText('Logout. Please try again')).toBeInTheDocument()
    })

    it('disables Save, Cancel and the email input while logout is pending', async () => {
      const guest = { ...guestUser, email: 'old@guest.com' }
      let resolveLogout
      const logoutApi = vi.fn(() => new Promise((resolve) => { resolveLogout = resolve }))
      const usersSave = vi.fn().mockResolvedValue({
        content: { error: true, result: ['Email already registered'] }
      })
      ordering.users.mockImplementation(() => ({ save: usersSave, get: vi.fn(), logout: logoutApi }))
      const rendered = renderVerification({
        session: { auth: true, user: guest, token: 'sess-token-1' }
      })
      fireEvent.click(rendered.getByText('Change'))
      fireEvent.change(rendered.getByLabelText('Email'), { target: { value: 'taken@guest.com' } })
      fireEvent.click(rendered.getByText('Save'))
      await waitFor(() => expect(rendered.getByText('Logout')).toBeInTheDocument())

      fireEvent.click(rendered.getByText('Logout'))
      await waitFor(() => expect(rendered.getByLabelText('Email')).toBeDisabled())
      expect(buttonOf(rendered.getByText('Save'))).toBeDisabled()
      expect(buttonOf(rendered.getByText('Cancel'))).toBeDisabled()
      expect(buttonOf(rendered.getByText('Logout'))).toBeDisabled()

      await act(async () => {
        resolveLogout({ content: { error: false, result: true } })
      })
      await waitFor(() => expect(sessionStateRef.current.auth).toBe(false))
    })

    it('takes the slots of components.auth_form: Save is slots.submit; Change, Cancel and Logout are slots.cancel', async () => {
      const guest = { ...guestUser, email: 'old@guest.com' }
      const usersSave = vi.fn().mockResolvedValue({
        content: { error: true, result: ['Email already registered'] }
      })
      ordering.users.mockImplementation(() => ({ save: usersSave, get: vi.fn(), logout: vi.fn() }))
      const rendered = renderVerification({
        session: { auth: true, user: guest, token: 'sess-token-1' }
      })
      expectSlotLook(buttonOf(rendered.getByText('Change')), { size: 'lg', color: 'secondary', appearance: 'solid' })
      fireEvent.click(rendered.getByText('Change'))
      fireEvent.change(rendered.getByLabelText('Email'), { target: { value: 'taken@guest.com' } })
      fireEvent.click(rendered.getByText('Save'))
      await waitFor(() => expect(rendered.getByText('Logout')).toBeInTheDocument())

      expectSlotLook(buttonOf(rendered.getByText('Save')), { size: 'lg', color: 'primary', appearance: 'solid' })
      ;['Cancel', 'Logout'].forEach((label) => {
        expectSlotLook(buttonOf(rendered.getByText(label)), { size: 'lg', color: 'secondary', appearance: 'solid' })
      })
    })
  })
})

describe('UserVerification — its buttons and fields are the base pieces', () => {
  beforeEach(() => {
    verificationPropsRef.current = makeVerificationProps()
    configTuple[0].configs = emailRequiredConfigs()
    sessionTuple[0] = { auth: true, user: { ...baseUser }, token: 'test-token' }
    ordering.users.mockReset()
    ordering.users.mockImplementation(() => ({ save: vi.fn(), get: vi.fn() }))
    sessionActionsRef.current = null
    sessionStateRef.current = null
    useRealVerification.current = false
  })

  const phoneOnly = (user = {}) => {
    configTuple[0].configs = {
      verification_email_required: { value: '0' },
      verification_phone_required: { value: '1' }
    }
    sessionTuple[0] = { auth: true, user: { ...baseUser, ...user }, token: 'test-token' }
  }

  it('the stored email is a read-only base Input with its envelope in the prefix and the email as placeholder', () => {
    const { getByLabelText } = renderVerification()
    const email = getByLabelText('Email')
    expect(email).toHaveAttribute('data-slot', 'input')
    expect(email).toHaveAttribute('readonly')
    expect(email).toHaveAttribute('placeholder', 'user@example.com')
    expect(email).not.toHaveAttribute('value', 'user@example.com')
    expect(email.parentElement).toHaveAttribute('data-slot', 'input-group')
    expect(email.parentElement.querySelector('[data-slot="input-prefix"] svg')).not.toBeNull()
  })

  it('Send code is the base Button of slots.submit: a main action, type button, disabled without an email', () => {
    const { getByText } = renderVerification()
    const send = buttonOf(getByText('Send code'))
    expect(send).toHaveAttribute('data-slot', 'button')
    expect(send).toHaveAttribute('type', 'button')
    expect(send).toHaveAttribute('data-doc-control', 'verification-send-email')
    expectSlotLook(send, { size: 'lg', color: 'primary', appearance: 'solid' })
  })

  it('a main action is full width when the theme says so (cta), the cancel one is not', () => {
    const theme = rebuildTheme(defaultTheme, (values) => {
      values.components.button.base.cta_full_width = true
      return values
    })
    const first = renderVerification({ theme })
    expect(buttonOf(first.getByText('Send code')).className).toContain('ui:w-full')
    first.unmount()
    sessionTuple[0] = { auth: true, user: { ...guestUser, email: 'old@guest.com' }, token: 'test-token' }
    const second = renderVerification({ theme })
    expect(buttonOf(second.getByText('Change')).className).not.toContain('ui:w-full')
  })

  it('the editable email is a base Input: invalid with aria-invalid when the email is wrong, disabled while it saves', () => {
    sessionTuple[0] = { auth: true, user: { ...guestUser }, token: 'test-token' }
    const first = renderVerification()
    const input = first.getByLabelText('Email')
    expect(input).toHaveAttribute('data-slot', 'input')
    expect(input).not.toHaveAttribute('aria-invalid')
    fireEvent.change(input, { target: { value: 'not-an-email' } })
    fireEvent.click(first.getByText('Save'))
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(first.getByRole('alert')).toHaveTextContent('Invalid email address')
    fireEvent.change(input, { target: { value: 'ok@example.com' } })
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input.parentElement.querySelector('[data-slot="input-prefix"] svg')).not.toBeNull()
    first.unmount()
    verificationPropsRef.current = makeVerificationProps({ verifyEmailState: { ...idleEmailState(), loadingSendCode: true } })
    const second = renderVerification()
    expect(second.getByLabelText('Email')).toBeDisabled()
    const save = buttonOf(second.getByText('Save'))
    expect(save).toBeDisabled()
    expect(save).toHaveAttribute('data-slot', 'button')
  })

  it('Cancel and Resend again? share the row, each button across its half (no 48% width)', () => {
    verificationPropsRef.current = makeVerificationProps({ verifyEmailState: { ...idleEmailState(), codeOutcome: { action: 'send', success: true, response: { error: false } } } })
    const { getByText } = renderVerification()
    ;['Cancel', 'Resend again?'].forEach((label) => {
      const button = buttonOf(getByText(label))
      expect(button).toHaveAttribute('data-slot', 'button')
      expect(button).toHaveAttribute('type', 'button')
      expect(button.parentElement).not.toHaveAttribute('style')
      expectSlotLook(button, { size: 'lg', color: 'secondary', appearance: 'solid' })
    })
  })

  it('the phone: Send by SMS and Send by WhatsApp are base Buttons of one row, each one half', () => {
    phoneOnly()
    const sendVerifyPhoneCode = vi.fn()
    verificationPropsRef.current = makeVerificationProps({ useWhatsappVerification: true, sendVerifyPhoneCode })
    const { getByText } = renderVerification()
    const sms = buttonOf(getByText('Send by SMS'))
    const whatsapp = buttonOf(getByText('Send by WhatsApp'))
    ;[sms, whatsapp].forEach((button) => {
      expect(button).toHaveAttribute('data-slot', 'button')
      // nothing of the layout goes on the piece: each sits in its half of the row
      expect(button).not.toHaveAttribute('style', expect.stringContaining('flex'))
      expect(button.parentElement.style.flex).toBeTruthy()
      expectSlotLook(button, { size: 'lg', color: 'primary', appearance: 'solid' })
    })
    expect(sms.parentElement.parentElement).toBe(whatsapp.parentElement.parentElement)
    expect(sms.parentElement).not.toBe(whatsapp.parentElement)
    fireEvent.click(whatsapp)
    expect(sendVerifyPhoneCode).toHaveBeenCalledWith(expect.objectContaining({ channel: 4 }))
  })

  it('the phone without a number: Update profile is a base Button of slots.submit', () => {
    phoneOnly({ cellphone: null, country_phone_code: null })
    const { getByText } = renderVerification()
    const update = buttonOf(getByText('Update profile'))
    expect(update).toHaveAttribute('data-slot', 'button')
    expect(update).toHaveAttribute('data-doc-control', 'verification-update-contact')
    expectSlotLook(update, { size: 'lg', color: 'primary', appearance: 'solid' })
  })

  it('only the channel that was asked for is busy while its code is being sent', () => {
    phoneOnly()
    verificationPropsRef.current = makeVerificationProps({ useWhatsappVerification: true, verifyPhoneState: { ...idlePhoneState(), loadingSendCode: true } })
    const { getByText } = renderVerification()
    // the default channel (SMS) is the busy one; the other waits, disabled
    expect(buttonOf(getByText('Send by SMS'))).toHaveAttribute('aria-busy', 'true')
    expect(buttonOf(getByText('Send by WhatsApp'))).not.toHaveAttribute('aria-busy')
    expect(buttonOf(getByText('Send by WhatsApp'))).toBeDisabled()
  })

  it('a slot of the theme with shape icon does not turn the text buttons into icons', () => {
    const theme = rebuildTheme(defaultTheme, (values) => {
      values.components.auth_form.slots.submit.shape = 'icon'
      values.components.auth_form.slots.cancel.shape = 'icon'
      return values
    })
    const { getByText, unmount } = renderVerification({ theme })
    const send = buttonOf(getByText('Send code'))
    expect(send).toHaveTextContent('Send code')
    expect(send.className).not.toContain('ui:p-none')
    expect(send.className).toContain('ui:px-(--ui-button-padding-x)')
    unmount()
    sessionTuple[0] = { auth: true, user: { ...guestUser, email: 'old@guest.com' }, token: 'test-token' }
    const second = renderVerification({ theme })
    expect(buttonOf(second.getByText('Change')).className).toContain('ui:px-(--ui-button-padding-x)')
  })
})
