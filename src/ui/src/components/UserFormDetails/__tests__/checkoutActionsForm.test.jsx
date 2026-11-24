import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { formStateFixture, userFixture, validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { cssFor, defaultTheme, renderWith } from '../../../styles/__tests__/themeTestUtils'
import { UserFormDetailsUI } from '../index'

vi.mock('react-hook-form', () => ({
  useForm: () => ({ register: () => null, handleSubmit: (fn) => fn, errors: {}, formState: { errors: {} } })
}))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/LanguageSelectorList', () => ({ LanguageSelectorList: () => null }))
vi.mock('~ui/src/components/DatePicker', () => ({ DatePickerUI: () => null }))
vi.mock('~ui/src/hooks/useEnabledLanguages', () => ({
  useEnabledLanguages: () => ({ loading: false, languages: [], hasMultiple: false })
}))

const renderForm = (props) => renderWith(defaultTheme, (
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
    {...props}
  />
))

// jsdom does not evaluate media queries, so this asserts the generated CSS.
// implementation notesthe sticky bar painted over the phone row inside the checkout StepCard.
describe('UserFormDetails ActionsForm on mobile', () => {
  const actionsCss = (props) => {
    const { container } = renderForm(props)
    return cssFor(container.querySelector('button[type="submit"]').closest('form > div'))
  }

  it('is in flow and plain in a checkout section, after the themed padding', () => {
    const css = actionsCss({})
    expect(css).toMatch(/@media \(max-width:768px\)\{[^}]*position:static;/)
    expect(css).toMatch(/padding:[^0;][^;]*;\}[\s\S]*position:static;background:none;z-index:auto;padding:0;/)
  })

  it('is in flow for the guest form too', () => {
    expect(actionsCss({ isCheckoutGuestForm: true })).toMatch(/@media \(max-width:768px\)\{[^}]*position:static;/)
  })

  it('keeps the sticky Save bar in the profile', () => {
    const css = actionsCss({ isCheckoutSection: false })
    expect(css).toMatch(/@media \(max-width:768px\)\{[^}]*position:sticky;/)
    expect(css).not.toMatch(/position:static/)
  })

  it('keeps the sticky bar in the checkout modal', () => {
    const css = actionsCss({ isModal: true })
    expect(css).toMatch(/position:sticky;/)
    expect(css).not.toMatch(/position:static/)
  })

  // implementation notesa modal covers the NavigationBar, so there is nothing to clear
  it('sticks to the bottom of a modal below 576px (the layer selector follows the lifted bottom)', () => {
    const css = actionsCss({ isModal: true })
    expect(css).toMatch(/@media \(max-width:575px\)\{[^}]*bottom:65px;\}\s*#app-modals \.[\w-]+,\[data-base-ui-portal\] \.[\w-]+\{bottom:0;\}/)
  })
})
