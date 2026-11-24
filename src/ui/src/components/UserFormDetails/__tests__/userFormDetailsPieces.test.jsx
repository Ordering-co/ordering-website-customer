import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture, validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { UserFormDetailsUI } from '../index'

// implementation notesthe fields (email, a generic one, the password) and the row of
// actions (Cancel, Save, Continue) are the design system's pieces. The hidden
// submit of the checkout guest form and the phone field are not: they stay
// native / legacy (migration gaps).

vi.mock('react-hook-form', () => ({
  useForm: () => ({ register: () => null, handleSubmit: (fn) => fn, errors: {}, formState: { errors: {} } })
}))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/LanguageSelectorList', () => ({ LanguageSelectorList: () => null }))
// the global stub of the phone field, showing the hint of its Enter key (its own attributes are InputPhoneNumber's tests)
vi.mock('~ui/src/components/InputPhoneNumber', () => ({
  InputPhoneNumber: ({ enterKeyHint }) => <input data-testid='phone-input' enterKeyHint={enterKeyHint} />
}))
vi.mock('~ui/src/components/DatePicker', () => ({ DatePickerUI: () => null }))
vi.mock('~ui/src/hooks/useEnabledLanguages', () => ({
  useEnabledLanguages: () => ({ loading: false, languages: [], hasMultiple: false })
}))

const checkoutFields = [
  { enabled: true, validation_field: { id: 1, code: 'email', name: 'Email', type: 'email' } },
  { enabled: true, validation_field: { id: 2, code: 'name', name: 'Name', type: 'text' } }
]

const render = (props) => {
  const handleButtonUpdateClick = vi.fn()
  const view = renderWithProviders(
    <UserFormDetailsUI
      view='account'
      isEdit
      formState={formStateFixture}
      validationFields={validationFieldsFixture}
      userData={userFixture}
      isOrderTypeValidationField
      checkoutFields={checkoutFields}
      handleChangeInput={vi.fn()}
      handleButtonUpdateClick={handleButtonUpdateClick}
      handleChangeNotifications={vi.fn()}
      notificationList={{}}
      showField={() => true}
      isRequiredField={() => false}
      toggleIsEdit={vi.fn()}
      cleanFormState={vi.fn()}
      {...props}
    />
  )
  return { ...view, handleButtonUpdateClick }
}

describe('UserFormDetails: the fields are the base Input', () => {
  it('the email and the generic field, with their label, value and name', () => {
    const { getByPlaceholderText, container } = render()
    const email = getByPlaceholderText('Email')
    const name = getByPlaceholderText('Name')
    ;[email, name].forEach((field) => {
      expect(field).toHaveAttribute('data-slot', 'input')
      expect(field).not.toBeDisabled()
    })
    expect(email).toHaveAttribute('type', 'email')
    expect(email).toHaveAttribute('name', 'email')
    expect(email).toHaveValue('jane@example.com')
    expect(name).toHaveValue('Jane')
    // no legacy class left behind, and the hidden birthdate input is not a piece
    expect(container.querySelector('input.form')).toBeNull()
  })

  it('a field is disabled when the form is not being edited', () => {
    const { getByPlaceholderText } = render({ isEdit: false })
    expect(getByPlaceholderText('Email')).toBeDisabled()
    expect(getByPlaceholderText('Email')).toHaveAttribute('data-slot', 'input')
  })

  it('the password field is the base Input of type password', () => {
    const { getByPlaceholderText } = render({ checkoutFields: [], isCheckout: false })
    const password = getByPlaceholderText('Password')
    expect(password).toHaveAttribute('data-slot', 'input')
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveAttribute('name', 'password')
  })

  it('typing reaches the change handlers', () => {
    const handleChangeInput = vi.fn()
    const { getByPlaceholderText } = render({ handleChangeInput })
    fireEvent.change(getByPlaceholderText('Name'), { target: { value: 'Janet' } })
    expect(handleChangeInput).toHaveBeenCalledTimes(1)
  })
})

describe('UserFormDetails: what the phone offers to fill in', () => {
  // the form draws these five codes (fieldsToSort), in this order
  const codes = ['name', 'middle_name', 'lastname', 'second_lastname', 'email']
  const field = (code, i) => ({ enabled: true, validation_field: { id: i + 1, code, name: code, type: code === 'email' ? 'email' : 'text' } })
  const allFields = codes.map(field)
  const phone = { enabled: true, validation_field: { id: 9, code: 'mobile_phone', name: 'Phone', type: 'text' } }
  const attrs = (container, code) => {
    const input = container.querySelector(`input[name="${code}"]`)
    return [input.getAttribute('autocomplete'), input.getAttribute('type'), input.getAttribute('inputmode'), input.getAttribute('enterkeyhint')]
  }

  it('each field says what it is (autocomplete) and what its Enter key does (enterkeyhint); second_lastname, with no standard token, says off', () => {
    const { container, getByTestId } = render({ checkoutFields: [...allFields, phone], isCheckout: true })
    expect(attrs(container, 'name')).toEqual(['given-name', 'text', null, 'next'])
    expect(attrs(container, 'middle_name')).toEqual(['additional-name', 'text', null, 'next'])
    expect(attrs(container, 'lastname')).toEqual(['family-name', 'text', null, 'next'])
    // no standard token for it: another name's would fill the wrong one
    expect(attrs(container, 'second_lastname')).toEqual(['off', 'text', null, 'next'])
    expect(attrs(container, 'email')).toEqual(['email', 'email', 'email', 'next'])
    // the phone is the last field of the form
    expect(getByTestId('phone-input')).toHaveAttribute('enterkeyhint', 'done')
  })

  it('without a phone, the last field is the one that says done', () => {
    const { container } = render({ checkoutFields: allFields, isCheckout: true })
    expect(attrs(container, 'second_lastname')[3]).toBe('next')
    expect(attrs(container, 'email')[3]).toBe('done')
  })
})

describe('UserFormDetails: the fields keep the value they mounted with', () => {
  // the legacy native input ignored a later change of its defaultValue; Base UI's uncontrolled
  // Field warns about it (the form's `changes` follow every keystroke)
  it('typing (the form state changes) does not warn nor move the shown value', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { getByPlaceholderText, rerender } = render()
      const name = getByPlaceholderText('Name')
      fireEvent.change(name, { target: { value: 'Janet' } })
      rerender(<UserFormDetailsUI
        view='account'
        isEdit
        formState={{ ...formStateFixture, changes: { ...formStateFixture.changes, name: 'Janet', email: 'janet@example.com' } }}
        validationFields={validationFieldsFixture}
        userData={userFixture}
        isOrderTypeValidationField
        checkoutFields={checkoutFields}
        handleChangeInput={vi.fn()}
        handleButtonUpdateClick={vi.fn()}
        handleChangeNotifications={vi.fn()}
        notificationList={{}}
        showField={() => true}
        isRequiredField={() => false}
        toggleIsEdit={vi.fn()}
        cleanFormState={vi.fn()}
      />)
      expect(error.mock.calls.filter(([message]) => /default value/i.test(String(message)))).toEqual([])
      expect(getByPlaceholderText('Name')).toBe(name)
      expect(getByPlaceholderText('Name')).toHaveValue('Janet')
      expect(getByPlaceholderText('Email')).toHaveValue('jane@example.com')
    } finally {
      error.mockRestore()
    }
  })
})

describe('UserFormDetails: the actions are base Buttons', () => {
  it('Save is a submit Button with its id and doc control, and saves through the form', () => {
    const { getByRole, container, handleButtonUpdateClick } = render()
    const save = getByRole('button', { name: 'Save' })
    expect(save).toBe(container.querySelector('[data-doc-control="profile-save"]'))
    expect(save).toHaveAttribute('data-slot', 'button')
    expect(save).toHaveAttribute('type', 'submit')
    expect(save).toHaveAttribute('id', 'form-btn')
    expect(save).not.toHaveAttribute('aria-busy')
    const form = container.querySelector('form')
    const submitted = vi.fn((event) => event.preventDefault())
    form.addEventListener('submit', submitted)
    fireEvent.click(save)
    expect(submitted).toHaveBeenCalledTimes(1)
    expect(handleButtonUpdateClick).toHaveBeenCalled()
  })

  it('the form still submits through requestSubmit', () => {
    const { container, handleButtonUpdateClick } = render()
    const form = container.querySelector('form')
    form.addEventListener('submit', (event) => event.preventDefault())
    form.requestSubmit()
    expect(handleButtonUpdateClick).toHaveBeenCalled()
  })

  it('while it sends, Save is busy and keeps its name', () => {
    const { getByRole } = render({ formState: { ...formStateFixture, loading: true } })
    const save = getByRole('button', { name: 'Save' })
    expect(save).toHaveAttribute('aria-busy', 'true')
    expect(save.querySelector('[data-slot="button-spinner"]')).not.toBeNull()
  })

  it('Cancel is an outline secondary Button of type button, beside Save, disabled while it sends', () => {
    const onCancel = vi.fn()
    const { getByRole } = render({ onCancel, isOldLayout: true })
    const cancel = getByRole('button', { name: 'Cancel' })
    expect(cancel).toHaveAttribute('data-slot', 'button')
    expect(cancel).toHaveAttribute('type', 'button')
    expect(cancel.style.getPropertyValue('--ui-button-background')).toBe('transparent')
    expect(cancel.closest('form > div')).toBe(getByRole('button', { name: 'Save' }).closest('form > div'))
    fireEvent.click(cancel)
    expect(onCancel).toHaveBeenCalledWith(false)
  })

  it('Cancel is disabled while the form sends', () => {
    const { getByRole } = render({ onCancel: vi.fn(), isOldLayout: true, formState: { ...formStateFixture, loading: true } })
    expect(getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('Continue (required fields) is a submit Button', () => {
    const { getByRole } = render({ requiredFields: ['email'], isCheckout: true })
    const next = getByRole('button', { name: 'Continue' })
    expect(next).toHaveAttribute('data-slot', 'button')
    expect(next).toHaveAttribute('type', 'submit')
    expect(next).toHaveAttribute('id', 'form-btn')
  })

  it('the guest form keeps its real hidden submit: the base Button srOnly, out of sight and of the tab order', () => {
    const { container } = render({ requiredFields: ['email'], isCheckout: true, isCheckoutGuestForm: true })
    const hidden = container.querySelector('button[type="submit"]')
    expect(hidden).toHaveAttribute('aria-hidden', 'true')
    expect(hidden).toHaveAttribute('tabindex', '-1')
    expect(hidden).toHaveAttribute('data-slot', 'button')
    expect(hidden).toHaveClass('ui:sr-only!')
    // it is the only button of the form: no visible Continue beside it
    expect(container.querySelectorAll('[data-slot="button"]')).toHaveLength(1)
  })
})
