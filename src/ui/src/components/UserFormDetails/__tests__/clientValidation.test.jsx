import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { UserFormDetailsUI } from '../index'

// What the form itself finds wrong (a text field, the phone) is painted under its field, not in the «Profile»
// Alert: on a phone the Alert covered the very fields it named. The Alert is for what the server answered.
// (The real form library on purpose: it is what blocks the submit.)

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
  const handleButtonUpdateClick = vi.fn()
  const view = renderWithProviders(
    <UserFormDetailsUI
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
  return { ...view, onSaved, handleButtonUpdateClick }
}

const messageOf = (input) => input.getAttribute('aria-describedby')
  ?.split(' ').map((id) => document.getElementById(id)?.textContent).join(' ')

describe('UserFormDetails: a submit the form refuses', () => {
  it('paints the missing name under its field, focuses it and keeps the Alert closed', async () => {
    const { container, queryByRole, getByPlaceholderText, onSaved, handleButtonUpdateClick } = render()
    const name = getByPlaceholderText('Name')
    expect(name).not.toHaveAttribute('aria-invalid')

    fireEvent.submit(container.querySelector('form'))

    await waitFor(() => expect(name).toHaveAttribute('aria-invalid', 'true'))
    expect(messageOf(name)).toBe('Name is required')
    // the first field with an error, in screen order, has the focus
    await waitFor(() => expect(document.activeElement).toBe(name))
    expect(queryByRole('dialog')).toBeNull()
    // the checkout is told, so its button lets go of its spinner
    expect(onSaved).toHaveBeenCalledWith(false)
    expect(handleButtonUpdateClick).not.toHaveBeenCalled()
  })

  it('every field with an error says so, and the message goes when the field is corrected', async () => {
    const { container, getByPlaceholderText } = render()
    const name = getByPlaceholderText('Name')
    const email = getByPlaceholderText('Email')

    fireEvent.submit(container.querySelector('form'))
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    expect(messageOf(email)).toBe('The field Email is required')

    fireEvent.input(name, { target: { value: 'Ana' } })
    await waitFor(() => expect(name).not.toHaveAttribute('aria-invalid'))
    expect(name).not.toHaveAttribute('aria-describedby')
    expect(email).toHaveAttribute('aria-invalid', 'true')

    // a malformed email has no message of its own in the rules: the field still says what is wrong
    fireEvent.input(email, { target: { value: 'not-an-email' } })
    await waitFor(() => expect(messageOf(email)).toBe('Invalid email address'))
    fireEvent.input(email, { target: { value: 'ana@example.com' } })
    await waitFor(() => expect(email).not.toHaveAttribute('aria-invalid'))
  })

  it('saves once corrected (the failure left nothing locked)', async () => {
    const { container, getByPlaceholderText, onSaved, handleButtonUpdateClick } = render({
      formState: { loading: false, changes: { name: 'Ana' }, result: { error: false } }
    })
    const form = container.querySelector('form')
    fireEvent.submit(form)
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(false))
    expect(handleButtonUpdateClick).not.toHaveBeenCalled()

    fireEvent.input(getByPlaceholderText('Name'), { target: { value: 'Ana' } })
    fireEvent.input(getByPlaceholderText('Email'), { target: { value: 'ana@example.com' } })
    await waitFor(() => expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0))
    fireEvent.submit(form)
    await waitFor(() => expect(handleButtonUpdateClick).toHaveBeenCalledTimes(1))
  })

  it('a missing required phone is painted under the phone, which takes the focus', async () => {
    const { container, queryByRole, getByPlaceholderText, onSaved } = render({
      requiredFields: ['mobile_phone'],
      checkoutFields: [...checkoutFields, phoneField],
      formState: { loading: false, changes: { name: 'Ana', email: 'ana@example.com' }, result: { error: false } },
      userData: { id: 9, guest_id: 'guest-9', name: 'Ana', email: 'ana@example.com' }
    })
    fireEvent.submit(container.querySelector('form'))

    const phone = await waitFor(() => {
      const invalid = container.querySelector('[aria-invalid="true"]')
      expect(invalid).not.toBeNull()
      return invalid
    })
    expect(phone).toHaveAttribute('type', 'tel')
    expect(messageOf(phone)).toBe('The field Phone Number is required.')
    await waitFor(() => expect(document.activeElement).toBe(phone))
    expect(queryByRole('dialog')).toBeNull()
    expect(onSaved).toHaveBeenCalledWith(false)
    expect(getByPlaceholderText('Name')).not.toHaveAttribute('aria-invalid')
  })

  it('a required phone this form does not draw is said in the Alert, beside the fields it does paint', async () => {
    // the checkout's gate asks only for name and email here, so the phone is not drawn; the order type still
    // requires it
    const { container, getByRole, getByPlaceholderText, onSaved } = render({
      isCheckoutPlace: true,
      checkoutFields: [...checkoutFields, phoneField]
    })
    expect(container.querySelector('input[type="tel"]')).toBeNull()
    fireEvent.submit(container.querySelector('form'))

    const name = getByPlaceholderText('Name')
    await waitFor(() => expect(name).toHaveAttribute('aria-invalid', 'true'))
    await waitFor(() => expect(document.activeElement).toBe(name))
    expect(getByRole('dialog', { name: 'Profile' })).toHaveTextContent('The field Phone Number is required.')
    expect(onSaved).toHaveBeenCalledTimes(1)
  })
})

describe('UserFormDetails: the Alert is for the server', () => {
  it('shows a translated fallback for an unexpected save error', () => {
    const diagnostic = 'Unexpected SQL error in users service'
    const { getByRole, queryByText } = render({
      formState: { loading: false, changes: {}, result: { error: true, result: [diagnostic] } }
    })
    expect(getByRole('dialog', { name: 'Profile' })).toHaveTextContent('We couldn’t save your details. Check them and try again.')
    expect(queryByText(diagnostic)).toBeNull()
  })

  it('links a known save error to the email field without an alert', async () => {
    const { getByPlaceholderText, queryByRole } = render({
      formState: {
        loading: false,
        changes: { name: 'Ana', email: 'ana@example.com' },
        result: { error: true, error_codes: ['email.unique'], result: ['The email has already been taken.'] }
      }
    })
    const email = getByPlaceholderText('Email')
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    expect(messageOf(email)).toBe('This email is already in use.')
    expect(document.activeElement).toBe(email)
    expect(queryByRole('dialog')).toBeNull()
    fireEvent.input(email, { target: { value: 'new@example.com' } })
    await waitFor(() => expect(email).not.toHaveAttribute('aria-invalid'))
  })
})
