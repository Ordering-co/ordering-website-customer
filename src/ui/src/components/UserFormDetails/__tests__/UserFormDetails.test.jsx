import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture, validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { UserFormDetailsUI } from '../index'

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: () => null,
    handleSubmit: (fn) => fn,
    errors: {},
    formState: { errors: {} }
  })
}))

vi.mock('~ui/src/components/SignUpForm', () => ({
  SignUpForm: () => null
}))

vi.mock('~ui/src/components/LanguageSelectorList', () => ({
  LanguageSelectorList: () => null
}))

vi.mock('~ui/src/components/DatePicker', () => ({
  DatePickerUI: () => null
}))

vi.mock('~ui/src/hooks/useEnabledLanguages', () => ({
  useEnabledLanguages: () => ({ loading: false, languages: [], hasMultiple: false })
}))


describe('UserFormDetails', () => {
  it('renders save action in account edit mode', () => {
    const { getByText } = renderWithProviders(
      <UserFormDetailsUI
        view='account'
        isEdit
        formState={formStateFixture}
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
    expect(getByText('Save')).toBeInTheDocument()
  })

  // implementation notesthe checkout's guest step (isCheckoutGuestForm) is opt-in;
  // every other caller (profile, here, without the prop) keeps "Continue"
  // and no data attribute, unaffected by that change.
  it('a non-checkout render (no isCheckoutGuestForm) keeps "Continue" and no guest-form data attribute, same as before', () => {
    const { getByText, container } = renderWithProviders(
      <UserFormDetailsUI
        isEdit
        formState={formStateFixture}
        validationFields={validationFieldsFixture}
        userData={userFixture}
        requiredFields={['email']}
        isCheckout
        isCheckoutSection
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
    expect(getByText('Continue')).toBeInTheDocument()
    expect(container.querySelector('[data-checkout-guest-form]')).toBeNull()
  })

  // implementation notes round 3: one primary CTA on screen — the checkout's own
  // button places the order; this form's submit stays real (so Enter and
  // requestSubmit still reach it) but hidden and out of the tab order, and
  // it marks the <form> for the CTA to find.
  it('the checkout guest step (isCheckoutGuestForm) hides its own submit button but keeps it real and marks its form for the CTA to submit', () => {
    const { queryByText, container } = renderWithProviders(
      <UserFormDetailsUI
        isEdit
        formState={formStateFixture}
        validationFields={validationFieldsFixture}
        userData={userFixture}
        requiredFields={['email']}
        isCheckout
        isCheckoutSection
        isCheckoutGuestForm
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
    expect(queryByText('Continue to payment')).not.toBeInTheDocument()
    expect(queryByText('Continue')).not.toBeInTheDocument()
    const hiddenSubmit = container.querySelector('button[type="submit"]')
    expect(hiddenSubmit).toBeInTheDocument()
    expect(hiddenSubmit).toHaveAttribute('tabindex', '-1')
    expect(hiddenSubmit).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('[data-checkout-guest-form="true"]')).toBeInTheDocument()
  })

  // implementation notes round 2: onDirtyChange (opt-in) reports unsaved input so the
  // checkout's CTA never discards it; absent, nothing changes for any
  // other caller (covered by the two tests above, which don't pass it).
  it('reports dirty/clean through onDirtyChange as formState.changes fills and clears', () => {
    const onDirtyChange = vi.fn()
    const { rerender } = renderWithProviders(
      <UserFormDetailsUI
        isEdit
        formState={{ loading: false, changes: {}, result: { error: false } }}
        validationFields={validationFieldsFixture}
        userData={userFixture}
        isCheckout
        isCheckoutSection
        isCheckoutGuestForm
        onDirtyChange={onDirtyChange}
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
    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
    onDirtyChange.mockClear()

    rerender(
      <UserFormDetailsUI
        isEdit
        formState={{ loading: false, changes: { name: 'Ana' }, result: { error: false } }}
        validationFields={validationFieldsFixture}
        userData={userFixture}
        isCheckout
        isCheckoutSection
        isCheckoutGuestForm
        onDirtyChange={onDirtyChange}
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
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)
    onDirtyChange.mockClear()

    rerender(
      <UserFormDetailsUI
        isEdit
        formState={{ loading: false, changes: {}, result: { error: false } }}
        validationFields={validationFieldsFixture}
        userData={userFixture}
        isCheckout
        isCheckoutSection
        isCheckoutGuestForm
        onDirtyChange={onDirtyChange}
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
    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
  })

  it('reports clean when the form unmounts with changes (a save closes it before they clear)', () => {
    const onDirtyChange = vi.fn()
    const { unmount } = renderWithProviders(
      <UserFormDetailsUI
        isEdit
        formState={{ loading: false, changes: { name: 'Ana' }, result: { error: false } }}
        validationFields={validationFieldsFixture}
        userData={userFixture}
        isCheckout
        isCheckoutSection
        isCheckoutGuestForm
        onDirtyChange={onDirtyChange}
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
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)
    unmount()
    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
  })
})
