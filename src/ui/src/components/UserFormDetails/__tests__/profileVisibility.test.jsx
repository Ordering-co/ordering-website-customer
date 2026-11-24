import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { formStateFixture, userFixture, validationFieldsFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { UserFormDetailsUI } from '../index'

// The pieces of the profile the theme shows or hides: the SMS and
// push channels (profile.notifications.*) and the titles over the fields
// (components.field.base.label_position: placeholder by default)
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: () => null,
    handleSubmit: (fn) => fn,
    errors: {},
    formState: { errors: {} }
  })
}))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/LanguageSelectorList', () => ({ LanguageSelectorList: () => null }))
vi.mock('~ui/src/components/DatePicker', () => ({ DatePickerUI: () => null }))
vi.mock('~ui/src/hooks/useEnabledLanguages', () => ({
  useEnabledLanguages: () => ({ loading: false, languages: [], hasMultiple: false })
}))

const visible = (visibility) => themeWithValues((values) => {
  values.visibility = { ...values.visibility, ...visibility }
  return values
})

const renderView = (theme, view) => renderWith(theme, (
  <UserFormDetailsUI
    view={view}
    isEdit
    formState={{ ...formStateFixture, changes: {}, loading: false }}
    validationFields={validationFieldsFixture}
    userData={userFixture}
    handleChangeInput={vi.fn()}
    handleButtonUpdateClick={vi.fn()}
    handleChangeNotifications={vi.fn()}
    showField={() => true}
    isRequiredField={() => false}
    toggleIsEdit={vi.fn()}
    cleanFormState={vi.fn()}
  />
))

const channels = (theme) => {
  const { getAllByRole, unmount } = renderView(theme, 'notifications')
  const names = getAllByRole('switch').map((row) => row.textContent)
  unmount()
  return names
}

describe('UserFormDetails: visibility profile.*', () => {
  it('the three channels, no titles over the fields', () => {
    expect(channels(themeWithValues())).toEqual(['Emails', 'Sms', 'Push Notifications'])
    const { container } = renderView(themeWithValues(), 'account')
    expect(container.querySelectorAll('input[data-slot="input"]').length).toBeGreaterThan(0)
    expect(container.querySelector('label[for]')).toBeNull()
  })

  it('profile.notifications.sms and .push leave out their channels', () => {
    expect(channels(visible({ 'profile.notifications.sms': false }))).toEqual(['Emails', 'Push Notifications'])
    expect(channels(visible({ 'profile.notifications.push': false }))).toEqual(['Emails', 'Sms'])
  })

  it('field.base.label_position above shows each field\'s title, the label of its input', () => {
    const above = themeWithValues((values) => {
      values.components.field.base.label_position = 'above'
      return values
    })
    const { container } = renderView(above, 'account')
    const inputs = Array.from(container.querySelectorAll('input[data-slot="input"]'))
    expect(inputs.length).toBeGreaterThan(0)
    inputs.forEach((input) => {
      expect(container.querySelector(`label[for="${input.id}"]`)).not.toBeNull()
    })
  })
})
