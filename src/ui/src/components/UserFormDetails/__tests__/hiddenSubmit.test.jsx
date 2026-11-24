import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture, validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { UserFormDetailsUI } from '../index'

vi.mock('react-hook-form', () => ({
  useForm: () => ({ register: () => null, handleSubmit: (fn) => (event) => { event?.preventDefault?.(); fn() }, errors: {}, formState: { errors: {} } })
}))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/LanguageSelectorList', () => ({ LanguageSelectorList: () => null }))
vi.mock('~ui/src/components/DatePicker', () => ({ DatePickerUI: () => null }))
vi.mock('~ui/src/hooks/useEnabledLanguages', () => ({
  useEnabledLanguages: () => ({ loading: false, languages: [], hasMultiple: false })
}))

// The checkout's invisible submit is the base Button srOnly: it keeps the form's submit (Enter, requestSubmit)
describe('UserFormDetails: the hidden submit', () => {
  const draw = (formState = formStateFixture) => renderWithProviders(
    <UserFormDetailsUI
      view='account'
      isEdit
      requiredFields={['email']}
      isCheckout
      isCheckoutGuestForm
      formState={formState}
      validationFields={validationFieldsFixture}
      userData={userFixture}
      handleChangeInput={vi.fn()}
      handleButtonUpdateClick={vi.fn()}
      handleChangeNotifications={vi.fn()}
      notificationList={{}}
      showField={() => true}
      isRequiredField={() => false}
      toggleIsEdit={vi.fn()}
      cleanFormState={vi.fn()}
    />
  )

  it('is a clipped submit that no one reaches by tab and that submits the form when it is pressed', () => {
    const { container } = draw()
    const hidden = container.querySelector('button[type="submit"]')
    expect(hidden).toHaveClass('ui:sr-only!', 'ui:min-h-[0]!')
    expect(hidden).toHaveAttribute('tabindex', '-1')
    const submit = vi.fn((event) => event.preventDefault())
    container.querySelector('form').addEventListener('submit', submit)
    fireEvent.click(hidden)
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('does not answer while the form sends', () => {
    const { container } = draw({ ...formStateFixture, loading: true })
    expect(container.querySelector('button[type="submit"]')).toBeDisabled()
  })
})
