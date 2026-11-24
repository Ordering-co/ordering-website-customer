import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { defaultTheme, renderWith } from '../../../styles/__tests__/themeTestUtils'
import { UserFormDetailsUI } from '../index'

vi.mock('react-hook-form', () => ({
  useForm: () => ({ register: () => null, handleSubmit: (fn) => fn, errors: {}, formState: { errors: {} }, setValue: vi.fn() })
}))
// the field is the number it is given
vi.mock('~ui/src/components/InputPhoneNumber', () => ({
  InputPhoneNumber: ({ value }) => <input data-testid='phone' value={value ?? ''} readOnly />
}))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/LanguageSelectorList', () => ({ LanguageSelectorList: () => null }))
vi.mock('~ui/src/components/DatePicker', () => ({ DatePickerUI: () => null }))
vi.mock('~ui/src/hooks/useEnabledLanguages', () => ({
  useEnabledLanguages: () => ({ loading: false, languages: [], hasMultiple: false })
}))

// implementation notesthe guest form remounts when the server rejects the save (UserDetails shows skeletons while it sends):
// what the customer typed, the phone included, is still in the form afterwards.
const guest = { ...userFixture, cellphone: undefined, guest_id: 'g1' }
const validationFields = { loading: false, fields: { checkout: { cellphone: { code: 'cellphone', enabled: true, required: true } } } }
const renderGuest = (formState, userData = guest) => renderWith(defaultTheme, (
  <UserFormDetailsUI
    isEdit
    isCheckout
    isCheckoutSection
    isCheckoutGuestForm
    formState={formState}
    validationFields={validationFields}
    userData={userData}
    requiredFields={['email', 'cellphone']}
    handleChangeInput={vi.fn()}
    handleButtonUpdateClick={vi.fn()}
    handleChangeNotifications={vi.fn()}
    notificationList={{}}
    showField={() => true}
    isRequiredField={() => false}
    toggleIsEdit={vi.fn()}
    cleanFormState={vi.fn()}
  />
))
const phone = (container) => container.querySelector('[data-testid=phone]')?.value

describe('UserFormDetails: the guest phone after a rejected save', () => {
  it('shows the number that was sent', () => {
    const { container } = renderGuest({ loading: false, changes: { name: 'Jane', email: 'jane@example.com', cellphone: '2015550123', country_phone_code: '1' }, result: { error: true, result: ['nope'] } })
    expect(phone(container)).toBe('+12015550123')
  })

  it('shows what was typed even when the form is opened again with unsaved changes', () => {
    const { container } = renderGuest({ loading: false, changes: { cellphone: '2015550123', country_phone_code: '1' }, result: { error: false } })
    expect(phone(container)).toBe('+12015550123')
  })

  it('is empty when nothing was typed', () => {
    const { container } = renderGuest({ loading: false, changes: {}, result: { error: false } })
    expect(phone(container)).toBe('')
  })

  // implementation notesthe phone input takes an E.164 number; a space made react-phone-number-input log an error
  it('the saved number reaches the input as E.164, with no spaces, and the country and number sent are untouched', () => {
    const handleChangeInput = vi.fn()
    const { container } = renderWith(defaultTheme, (
      <UserFormDetailsUI
        isEdit
        formState={{ loading: false, changes: {}, result: { error: false } }}
        validationFields={validationFields}
        userData={{ ...userFixture, cellphone: '202 555-0199', country_phone_code: '1', guest_id: undefined }}
        requiredFields={[]}
        handleChangeInput={handleChangeInput}
        handleButtonUpdateClick={vi.fn()}
        handleChangeNotifications={vi.fn()}
        notificationList={{}}
        showField={() => true}
        isRequiredField={() => false}
        toggleIsEdit={vi.fn()}
        cleanFormState={vi.fn()}
      />
    ))
    expect(phone(container)).toBe('+12025550199')
    expect(handleChangeInput).not.toHaveBeenCalledWith(expect.objectContaining({ cellphone: expect.anything() }), expect.anything())
  })
})
