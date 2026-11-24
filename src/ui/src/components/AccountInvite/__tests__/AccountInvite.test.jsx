import React, { Suspense, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { AccountInvite } from '../index'

// The sign-up controller's network call, the session and the contexts the setup does not cover
const mocks = vi.hoisted(() => ({
  session: { auth: true, user: null },
  login: vi.fn(),
  configs: {},
  validationFields: { loading: false, fields: { checkout: {} } },
  save: vi.fn(),
  signUp: null,
  logIn: null
}))

vi.mock('~components/contexts/SessionContext', () => ({
  useSession: () => [mocks.session, { login: mocks.login }]
}))
vi.mock('~components/contexts/ConfigContext', () => ({
  useConfig: () => [{ configs: mocks.configs }]
}))
vi.mock('~components/contexts/ValidationsFieldsContext', () => ({
  useValidationFields: () => [mocks.validationFields]
}))
vi.mock('~components/contexts/ApiContext', () => ({
  useApi: () => [{ users: () => ({ save: mocks.save }), root: 'https://api.test' }, {}]
}))
vi.mock('~components/contexts/WebsocketContext', () => ({
  useWebsocket: () => ({ getId: () => 'socket' })
}))
// the controller reads the country of the phone number it sends
vi.mock('libphonenumber-js', () => ({ default: () => ({ country: 'US' }) }))
// the setup's loadable never resolves a lazy chunk: React.lazy does
vi.mock('@loadable/component', async () => {
  const { lazy } = await import('react')
  return { default: (loader) => lazy(() => loader().then((component) => ({ default: component }))) }
})
vi.mock('~ui/src/components/SignUpForm', () => ({
  SignUpForm: (props) => {
    mocks.signUp = props
    return (
      <div data-testid='signup-form'>
        {props.elementLinkToLogin}
        <button type='button' onClick={() => props.handleSuccessSignup({ id: 7, session: { access_token: 'new-token' } })}>finish sign-up</button>
      </div>
    )
  }
}))
vi.mock('~ui/src/components/LoginForm', () => ({
  LoginForm: (props) => {
    mocks.logIn = props
    return (
      <div data-testid='login-form'>
        {props.elementLinkToForgotPassword}
        <button type='button' onClick={() => props.handleSuccessLogin({ id: 7 })}>finish login</button>
      </div>
    )
  }
}))
vi.mock('~ui/src/components/ForgotPasswordForm', () => ({
  ForgotPasswordForm: ({ elementLinkToLogin }) => <div>{elementLinkToLogin}</div>
}))

const guest = { guest_id: 'g-1', name: 'Ana', lastname: 'Torres', guest_email: 'ana.torres@example.com', guest_cellphone: '4155550134', country_phone_code: '1' }
const inWindow = themeWithValues((values) => {
  values.components.account_invite.base.flow = 'in_window'
  return values
})

const Host = ({ entry, onDone, onClose }) => {
  const [open, setOpen] = useState(true)
  return (
    <Suspense fallback={null}>
      <button type='button' onClick={() => setOpen(true)}>reopen</button>
      <AccountInvite entry={entry} open={open} onDone={onDone} onClose={() => { setOpen(false); onClose?.() }} />
    </Suspense>
  )
}

const show = (entry = 'confirmation', { theme, onDone = vi.fn(), onClose = vi.fn() } = {}) => {
  const view = renderWithProviders(<Host entry={entry} onDone={onDone} onClose={onClose} />, { theme })
  return { ...view, onDone, onClose }
}

beforeEach(() => {
  mocks.session = { auth: true, user: { ...guest } }
  mocks.configs = {}
  mocks.validationFields = { loading: false, fields: { checkout: { name: { enabled: true, required: true }, lastname: { enabled: true, required: true }, cellphone: { enabled: true, required: true } } } }
  mocks.signUp = null
  mocks.logIn = null
  mocks.save.mockReset()
  mocks.save.mockResolvedValue({ content: { error: false, result: { id: 7, session: { access_token: 'new-token' } } } })
})

describe('AccountInvite, the invitation (signup_form, the default)', () => {
  it.each([
    ['confirmation', 'Save this order to an account', 'Not now'],
    ['orders', 'Keep all your orders in one place', 'Continue to my orders'],
    ['profile', 'Create your account', 'Continue as guest']
  ])('%s: its title and its secondary action', async (entry, title, decline) => {
    show(entry)
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName(title)
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: decline })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'I already have an account' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('names the guest\'s email when there is one', async () => {
    show('orders')
    expect(await screen.findByText('We\'ll use ana.torres@example.com')).toBeInTheDocument()
  })

  it('without an email there is no "We\'ll use" line', async () => {
    mocks.session = { auth: true, user: { ...guest, guest_email: undefined, email: '' } }
    show('orders')
    await screen.findByRole('dialog')
    expect(screen.queryByText(/We'll use/)).toBeNull()
  })

  it('a visitor gets text that does not say they ordered as a guest, and a plain Not now', async () => {
    mocks.session = { auth: false, user: {} }
    show('orders')
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleDescription('Create an account to see your orders, track them and order again.')
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument()
    expect(screen.queryByText(/We'll use/)).toBeNull()
  })

  it('Not now closes it', async () => {
    const { onClose, onDone } = show('confirmation')
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onDone).not.toHaveBeenCalled()
  })

  it('Escape closes it', async () => {
    const { onClose } = show('profile')
    await screen.findByRole('dialog')
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('opens again each time it is opened, from the start', async () => {
    const { onClose } = show('confirmation')
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByText('reopen'))
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Save this order to an account')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Create account hands over to the sign-up form, one layer at a time, with the guest\'s details', async () => {
    show('confirmation')
    fireEvent.click(await screen.findByRole('button', { name: 'Create account' }))
    expect(await screen.findByTestId('signup-form')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Save this order to an account')).toBeNull())
    expect(mocks.signUp.isGuest).toBe(true)
    expect(mocks.signUp.useChekoutFileds).toBe(true)
    expect(mocks.signUp.initialValues).toEqual({ name: 'Ana', lastname: 'Torres', email: 'ana.torres@example.com' })
    expect(mocks.signUp.externalPhoneNumber).toBe('+14155550134')
    expect(mocks.signUp.autoPlace).toBeUndefined()
  })

  it('a visitor signs up with an empty form, not as a guest', async () => {
    mocks.session = { auth: false, user: {} }
    show('profile')
    fireEvent.click(await screen.findByRole('button', { name: 'Create account' }))
    await screen.findByTestId('signup-form')
    expect(mocks.signUp.isGuest).toBe(false)
    expect(mocks.signUp.initialValues).toBeUndefined()
    expect(mocks.signUp.externalPhoneNumber).toBeUndefined()
  })

  it('a guest without a phone code gets no fixed phone', async () => {
    mocks.session = { auth: true, user: { ...guest, country_phone_code: undefined } }
    show('profile')
    fireEvent.click(await screen.findByRole('button', { name: 'Create account' }))
    await screen.findByTestId('signup-form')
    expect(mocks.signUp.externalPhoneNumber).toBeUndefined()
  })

  it('a created account logs in with its token, then it is done and closed', async () => {
    const { onDone, onClose } = show('confirmation')
    fireEvent.click(await screen.findByRole('button', { name: 'Create account' }))
    fireEvent.click(await screen.findByText('finish sign-up'))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(mocks.login).toHaveBeenCalledWith({ user: { id: 7, session: { access_token: 'new-token' } }, token: 'new-token' })
    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByTestId('signup-form')).toBeNull())
  })

  it('the sign-up form links to the login, and I already have an account opens it', async () => {
    show('orders')
    fireEvent.click(await screen.findByRole('button', { name: 'Create account' }))
    fireEvent.click(await screen.findByText('Login'))
    expect(await screen.findByTestId('login-form')).toBeInTheDocument()
    expect(screen.queryByTestId('signup-form')).toBeNull()
    expect(mocks.logIn.isGuest).toBe(true)
  })

  it('I already have an account opens the login, and a login is done', async () => {
    const { onDone, onClose } = show('orders')
    fireEvent.click(await screen.findByRole('button', { name: 'I already have an account' }))
    fireEvent.click(await screen.findByText('finish login'))
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    // the login form logs in on its own: only the sign-up asks the session for it
    expect(mocks.login).not.toHaveBeenCalled()
  })

  it.each(['orders', 'profile'])('returns from password recovery to the Login action in %s', async (entry) => {
    const { onClose } = show(entry)
    fireEvent.click(await screen.findByRole('button', { name: 'I already have an account' }))
    const recoveryLink = await screen.findByRole('link', { name: 'Reset password' })
    fireEvent.click(recoveryLink)
    expect(await screen.findByRole('dialog', { name: 'Forgot your password?' })).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('link', { name: 'Login' }))
    expect(recoveryLink).toHaveFocus()

    fireEvent.click(recoveryLink)
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    await waitFor(() => expect(recoveryLink).toHaveFocus())
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps going after the session stops being a guest (the account was created)', async () => {
    show('confirmation')
    fireEvent.click(await screen.findByRole('button', { name: 'Create account' }))
    await screen.findByTestId('signup-form')
    mocks.session = { auth: true, user: { id: 7, name: 'Ana' } }
    fireEvent.click(screen.getByText('reopen'))
    await screen.findByTestId('signup-form')
  })
})

describe('AccountInvite, finished in the window (in_window)', () => {
  const openPassword = async (entry = 'confirmation') => {
    const view = show(entry, { theme: inWindow })
    await screen.findByLabelText('Create a password')
    return view
  }

  it('an eligible guest sees their details and a password, not the invitation', async () => {
    await openPassword('confirmation')
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Your order is in. Save your details?')
    const details = screen.getByRole('list', { name: 'Your details' })
    expect(details).toHaveTextContent('Ana Torres')
    expect(details).toHaveTextContent('ana.torres@example.com')
    expect(details).toHaveTextContent('+1 4155550134')
    expect(screen.queryByLabelText('Email')).toBeNull()
    // not the invitation: none of its benefits
    expect(screen.queryByText('Track and reorder past orders')).toBeNull()
  })

  it.each([
    ['orders', 'See your orders with an account', 'Continue as guest'],
    ['profile', 'Set a password to keep your profile', 'Continue as guest']
  ])('%s: its title and its secondary action', async (entry, title, decline) => {
    await openPassword(entry)
    expect(screen.getByRole('dialog')).toHaveAccessibleName(title)
    expect(screen.getByRole('button', { name: decline })).toBeInTheDocument()
  })

  it('the password shows and hides', async () => {
    await openPassword()
    const field = screen.getByLabelText('Create a password')
    expect(field).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(field).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sends the guest\'s details and the password with the guest token, logs in and says it is created', async () => {
    const { onDone, onClose } = await openPassword('orders')
    fireEvent.change(screen.getByLabelText('Create a password'), { target: { value: 'correct-horse' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Account created. Your order is in My orders.')).toBeInTheDocument()
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(mocks.save.mock.calls[0][0]).toEqual({
      name: 'Ana',
      lastname: 'Torres',
      email: 'ana.torres@example.com',
      cellphone: '4155550134',
      country_phone_code: '1',
      country_code: 'US',
      password: 'correct-horse',
      guest_token: 'g-1'
    })
    expect(mocks.login).toHaveBeenCalledWith({ user: { id: 7, session: { access_token: 'new-token' } }, token: 'new-token' })
    // it is not done until the guest closes the message
    expect(onDone).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stays open when the session stops being a guest during it', async () => {
    await openPassword()
    fireEvent.change(screen.getByLabelText('Create a password'), { target: { value: 'correct-horse' } })
    mocks.login.mockImplementation(() => { mocks.session = { auth: true, user: { id: 7 } } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Account created')).toBeInTheDocument()
  })

  it('asks an email with the password when the order has none, and sends it', async () => {
    mocks.session = { auth: true, user: { ...guest, guest_email: undefined, email: '' } }
    show('confirmation', { theme: inWindow })
    const email = await screen.findByLabelText('Email')
    fireEvent.change(screen.getByLabelText('Create a password'), { target: { value: 'correct-horse' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('The field Email is required')).toBeInTheDocument()
    expect(mocks.save).not.toHaveBeenCalled()
    fireEvent.change(email, { target: { value: 'ana@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByText('Account created')
    expect(mocks.save.mock.calls[0][0]).toMatchObject({ email: 'ana@example.com', password: 'correct-horse' })
  })

  it('asks for a password of at least 8 characters before sending', async () => {
    await openPassword()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('The field Password is required')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Create a password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('The Password must be at least 8 characters.')).toBeInTheDocument()
    expect(screen.getByLabelText('Create a password')).toHaveAttribute('aria-invalid', 'true')
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('shows the API\'s error next to the password field and lets the guest try again', async () => {
    mocks.save.mockResolvedValueOnce({ content: { error: true, result: ['The email has already been taken.'] } })
    await openPassword()
    fireEvent.change(screen.getByLabelText('Create a password'), { target: { value: 'correct-horse' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    const message = await screen.findByText('The email has already been taken.')
    expect(message).toHaveAttribute('role', 'alert')
    expect(screen.getByLabelText('Create a password')).toHaveAttribute('aria-describedby', message.id)
    expect(mocks.login).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create account' })).not.toHaveAttribute('aria-busy', 'true'))
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByText('Account created')
  })

  it('blocks a second submit while the first is on its way', async () => {
    let finish
    mocks.save.mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))
    await openPassword()
    fireEvent.change(screen.getByLabelText('Create a password'), { target: { value: 'correct-horse' } })
    const button = screen.getByRole('button', { name: 'Create account' })
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.submit(button.closest('form'))
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'))
    expect(mocks.save).toHaveBeenCalledTimes(1)
    await act(async () => finish({ content: { error: false, result: { id: 7, session: { access_token: 'new-token' } } } }))
    await screen.findByText('Account created')
    expect(mocks.save).toHaveBeenCalledTimes(1)
  })

  it('Edit details opens the sign-up form with the guest\'s details', async () => {
    await openPassword()
    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }))
    expect(await screen.findByTestId('signup-form')).toBeInTheDocument()
    expect(mocks.signUp.isGuest).toBe(true)
    expect(mocks.signUp.initialValues).toEqual({ name: 'Ana', lastname: 'Torres', email: 'ana.torres@example.com' })
  })

  it('a sign-up finished from Edit details also says it is created', async () => {
    await openPassword()
    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }))
    fireEvent.click(await screen.findByText('finish sign-up'))
    expect(await screen.findByText('Account created')).toBeInTheDocument()
  })

  // an email that already has an account: the guest logs in from here (implementation notes, review finding 4)
  it('I already have an account opens the login as the guest, with or without an email, and a login is done', async () => {
    const { onDone, onClose } = await openPassword('orders')
    fireEvent.click(screen.getByRole('button', { name: 'I already have an account' }))
    expect(await screen.findByTestId('login-form')).toBeInTheDocument()
    expect(mocks.logIn.isGuest).toBe(true)
    fireEvent.click(screen.getByText('finish login'))
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('offers I already have an account also when the order has no email', async () => {
    mocks.session = { auth: true, user: { ...guest, guest_email: '' } }
    await openPassword()
    expect(screen.getByRole('button', { name: 'I already have an account' })).toBeInTheDocument()
  })

  it('Not now closes it without creating anything', async () => {
    const { onClose } = await openPassword()
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it.each([
    ['the theme says signup_form', undefined, () => {}],
    ['the sign-up asks a field the guest does not have', inWindow, () => { mocks.validationFields.fields.checkout.birthdate = { enabled: true, required: true } }],
    ['recaptcha is on', inWindow, () => { mocks.configs = { security_recaptcha_signup: { value: '1' } } }],
    ['the terms are on', inWindow, () => { mocks.configs = { terms_and_conditions: { value: 'true' } } }],
    ['the fields are not loaded', inWindow, () => { mocks.validationFields = { loading: true, fields: {} } }],
    ['it is a visitor', inWindow, () => { mocks.session = { auth: false, user: {} } }]
  ])('falls back to the invitation when %s', async (_name, theme, arrange) => {
    arrange()
    show('confirmation', { theme })
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Save this order to an account')
    expect(screen.queryByLabelText('Create a password')).toBeNull()
  })
})
