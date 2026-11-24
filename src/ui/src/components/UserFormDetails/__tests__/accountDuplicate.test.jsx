import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { UserFormDetailsUI } from '../index'

// implementation notesa guest whose email or phone belongs to an account is told so under that field, with a way to sign in,
// even while the API still rejects the save. Nothing of the other account is shown.

vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/LanguageSelectorList', () => ({ LanguageSelectorList: () => null }))
vi.mock('~ui/src/components/DatePicker', () => ({ DatePickerUI: () => null }))
vi.mock('~ui/src/hooks/useEnabledLanguages', () => ({
  useEnabledLanguages: () => ({ loading: false, languages: [], hasMultiple: false })
}))
// the phone field as the form drives it: its error and invalid state come in as props (its own text and ids are
// InputPhoneNumber's tests)
vi.mock('~ui/src/components/InputPhoneNumber', () => ({
  InputPhoneNumber: ({ isError, errorText }) => (
    <>
      <input type='tel' aria-label='Phone' aria-invalid={isError || undefined} aria-describedby={errorText ? 'phone-error' : undefined} />
      {errorText && <span id='phone-error'>{errorText}</span>}
    </>
  )
}))
// the lazy dialog, as a plain one: whether it is open, and what it says
vi.mock('~ui/src/components/Confirm', () => ({
  Alert: ({ open, title, content }) => open ? <div role='dialog' aria-label={title}>{[].concat(content).join(' ')}</div> : null
}))

const checkoutFields = [
  { enabled: true, required: true, validation_field: { id: 1, code: 'name', name: 'Name', type: 'text' } },
  { enabled: true, required: true, validation_field: { id: 2, code: 'email', name: 'Email', type: 'email' } }
]
const phoneField = { enabled: true, required: true, validation_field: { id: 3, code: 'mobile_phone', name: 'Phone', type: 'text' } }

const render = (props = {}) => {
  const onSaved = vi.fn()
  const onRequestLogin = vi.fn()
  const handleButtonUpdateClick = vi.fn()
  const view = renderWithProviders(
    <UserFormDetailsUI
      onRequestLogin={onRequestLogin}
      view='account'
      isEdit
      isCheckout
      isCheckoutGuestForm
      requiredFields={['name', 'email']}
      formState={{ loading: false, changes: {}, result: { error: false } }}
      validationFields={validationFieldsFixture}
      userData={{ id: 9, guest_id: 'guest-9', name: '', email: '' }}
      isOrderTypeValidationField
      checkoutFields={checkoutFields}
      handleChangeInput={vi.fn()}
      handleButtonUpdateClick={handleButtonUpdateClick}
      handleChangeNotifications={vi.fn()}
      showField={() => true}
      isRequiredField={(code) => code === 'name' || code === 'email'}
      toggleIsEdit={vi.fn()}
      cleanFormState={vi.fn()}
      onSaved={onSaved}
      {...props}
    />
  )
  return { ...view, onSaved, onRequestLogin, handleButtonUpdateClick }
}

const messageOf = (input) => input.getAttribute('aria-describedby')
  ?.split(' ').map((id) => document.getElementById(id)?.textContent).join(' ')

const saved = { name: 'Ana', email: 'ana@example.com' }
const rejected = (result) => ({ loading: false, changes: saved, result: { error: true, ...result } })
const masked = 'j***@example.com'

describe('UserFormDetails: an email or phone that belongs to an account', () => {
  it('email: a notice under the field with Sign in, no Alert, and nothing of the other account', async () => {
    const { getByRole, getByText, queryByRole, queryByText, getByPlaceholderText, onRequestLogin, container } = render({
      formState: rejected({ error_codes: ['email.unique'], result: [`The email has already been taken by ${masked}`] })
    })
    const notice = await waitFor(() => getByText(/This email already has an account/))
    expect(notice).toHaveTextContent('Sign in to use your saved details, or continue as a guest.')
    expect(getByPlaceholderText('Email')).not.toHaveAttribute('aria-invalid')
    expect(queryByRole('dialog')).toBeNull()
    expect(container).not.toHaveTextContent(masked)
    expect(queryByText('Please try again')).toBeNull()
    fireEvent.click(getByRole('button', { name: 'Sign in' }))
    expect(onRequestLogin).toHaveBeenCalledTimes(1)
    // typing another email takes the notice away
    fireEvent.input(getByPlaceholderText('Email'), { target: { value: 'other@example.com' } })
    await waitFor(() => expect(queryByText(/already has an account/)).toBeNull())
  })

  it('email: the sentence alone (no codes) is a duplicate too', async () => {
    const { getByText, queryByRole } = render({ formState: rejected({ result: ['The email has already been taken.'] }) })
    await waitFor(() => getByText(/This email already has an account/))
    expect(queryByRole('dialog')).toBeNull()
  })

  it('phone: a notice under the phone, with the masked email left out', async () => {
    const { getByRole, getByText, queryByRole, container, onRequestLogin } = render({
      requiredFields: ['mobile_phone'],
      checkoutFields: [...checkoutFields, phoneField],
      formState: rejected({ error_codes: ['cellphone.unique'], result: [`The cellphone has already been taken by ${masked}`] })
    })
    await waitFor(() => getByText(/This phone number already has an account/))
    expect(queryByRole('dialog')).toBeNull()
    expect(container).not.toHaveTextContent(masked)
    fireEvent.click(getByRole('button', { name: 'Sign in' }))
    expect(onRequestLogin).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['codes of a field the form does not draw', { error_codes: ['foo.max'], result: ['Server detail'] }],
    ['no codes at all', { result: [`Server detail about ${masked}`] }]
  ])('an unknown error (%s) says what failed, never a bare "Please try again"', async (_name, result) => {
    const { getByRole, queryByText, container } = render({ formState: rejected(result) })
    await waitFor(() => getByRole('dialog', { name: 'Profile' }))
    expect(getByRole('dialog')).toHaveTextContent('We couldn’t save your details. Check them and try again.')
    expect(queryByText('Please try again')).toBeNull()
    expect(container).not.toHaveTextContent('Server detail')
    expect(container).not.toHaveTextContent(masked)
  })

  it('without a way to sign in (the profile) the duplicate stays an error of its field', async () => {
    const { getByPlaceholderText, queryByRole } = render({
      onRequestLogin: undefined,
      formState: rejected({ error_codes: ['email.unique'], result: ['The email has already been taken.'] })
    })
    await waitFor(() => expect(getByPlaceholderText('Email')).toHaveAttribute('aria-invalid', 'true'))
    expect(messageOf(getByPlaceholderText('Email'))).toBe('This email is already in use.')
    expect(queryByRole('dialog')).toBeNull()
  })
})
