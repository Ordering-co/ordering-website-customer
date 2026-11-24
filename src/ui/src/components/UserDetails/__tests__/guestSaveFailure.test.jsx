import React, { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture, validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { UserDetails } from '../index'

vi.mock('react-hook-form', () => ({
  useForm: () => ({ register: () => null, handleSubmit: (fn) => (event) => { event?.preventDefault?.(); fn() }, errors: {}, formState: { errors: {} } })
}))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/LanguageSelectorList', () => ({ LanguageSelectorList: () => null }))
vi.mock('~ui/src/components/DatePicker', () => ({ DatePickerUI: () => null }))
vi.mock('~ui/src/hooks/useEnabledLanguages', () => ({
  useEnabledLanguages: () => ({ loading: false, languages: [], hasMultiple: false })
}))
vi.mock('~ui/hooks/useCountdownTimer', () => ({ useCountdownTimer: () => [60, vi.fn(), vi.fn()] }))

// The controller keeps the save's state like the real one: `loading` while it sends, then the result
vi.mock('~components/components/UserFormDetails', () => ({
  UserFormDetails: ({ UIComponent, ...rest }) => {
    const [formState, setFormState] = useState(formStateFixture)
    return (
      <>
        <button type='button' data-testid='send' onClick={() => setFormState({ ...formState, loading: true })} />
        <button type='button' data-testid='reject' onClick={() => setFormState({ ...formState, loading: false, result: { error: true, result: ['nope'] } })} />
        <UIComponent
          isEdit
          isCheckout
          isCheckoutGuestForm
          requiredFields={['email']}
          cartStatus={0}
          formState={formState}
          setFormState={setFormState}
          validationFields={validationFieldsFixture}
          userState={{ loading: false }}
          userData={userFixture}
          loading={false}
          handleChangeInput={vi.fn()}
          handleButtonUpdateClick={vi.fn()}
          handleChangeNotifications={vi.fn()}
          notificationList={{}}
          showField={() => true}
          isRequiredField={() => false}
          toggleIsEdit={vi.fn()}
          cleanFormState={vi.fn()}
          handleSendVerifyCode={vi.fn()}
          verifyPhoneState={{ result: null }}
          {...rest}
        />
      </>
    )
  }
}))

// UserDetails shows skeletons instead of the form while the save sends, so the form unmounts and remounts:
// the failure must still reach the checkout (onSaved(false)) or its "Placing your order..." never ends
describe('UserDetails: a save that the server rejects', () => {
  it('tells onSaved(false) once, even though the form is unmounted while it sends', () => {
    const onSaved = vi.fn()
    const { getByTestId, container } = renderWithProviders(<UserDetails onSaved={onSaved} />)
    fireEvent.click(getByTestId('send'))
    expect(container.querySelector('form')).toBeNull()
    act(() => { fireEvent.click(getByTestId('reject')) })
    expect(container.querySelector('form')).not.toBeNull()
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(onSaved).toHaveBeenCalledWith(false)
  })
})
