import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { formStateFixture, userFixture } from '../../__tests__/helpers/profileWalletTestMocks'
import { UserFormDetailsUI } from '../index'

// What the form registers (each field's name and rules), and the picker's props
const state = vi.hoisted(() => ({ registered: [], picker: null }))

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: (rules) => (element) => element && state.registered.push({ name: element.name, rules }),
    setValue: vi.fn(),
    handleSubmit: (fn) => fn,
    errors: {},
    formState: { errors: {} }
  })
}))
vi.mock('~ui/src/components/SignUpForm', () => ({ SignUpForm: () => null }))
vi.mock('~ui/src/components/LanguageSelectorList', () => ({ LanguageSelectorList: () => null }))
vi.mock('~ui/src/hooks/useEnabledLanguages', () => ({
  useEnabledLanguages: () => ({ loading: false, languages: [], hasMultiple: false })
}))
// only the birthday (none of the other fields of the form)
vi.mock('~ui/utils', async (importOriginal) => ({ ...(await importOriginal()), sortInputFields: () => [] }))

vi.mock('~ui/src/components/DatePicker', () => ({
  DatePickerUI: (props) => {
    state.picker = props
    return <button type='button' id={props.id} aria-haspopup='dialog'>{props.placeholder}</button>
  }
}))

// The birthday enabled (and required) in the checkout's fields
const VALIDATION = { loading: false, fields: { checkout: { birthdate: { enabled: true, required: true } } } }

const renderForm = (props = {}) => {
  state.registered = []
  const handleChangeInput = vi.fn()
  const utils = renderWithProviders(
    <UserFormDetailsUI
      view='account'
      isEdit
      formState={formStateFixture}
      validationFields={VALIDATION}
      userData={{ ...userFixture, birthdate: '1990-03-04' }}
      handleChangeInput={handleChangeInput}
      handleButtonUpdateClick={vi.fn()}
      handleChangeNotifications={vi.fn()}
      showField={() => true}
      isRequiredField={(code) => code === 'birthdate'}
      toggleIsEdit={vi.fn()}
      cleanFormState={vi.fn()}
      {...props}
    />
  )
  return { ...utils, handleChangeInput }
}

describe('UserFormDetails: the birthday', () => {
  it('a date picker with the user\'s birthday, named as the field', () => {
    renderForm()
    const { value, label, placeholder, id } = state.picker
    expect(value).toBeInstanceOf(Date)
    expect([value.getFullYear(), value.getMonth(), value.getDate()]).toEqual([1990, 2, 4])
    expect(label).toBe('Birthdate')
    expect(placeholder).toBe('Birthdate')
    expect(document.getElementById(id)).toHaveAttribute('aria-haspopup', 'dialog')
  })

  it('the date it applies is the form\'s birthdate (YYYY-MM-DD), and the field shows it', () => {
    const { handleChangeInput } = renderForm()
    act(() => state.picker.onChange(new Date(1985, 11, 25)))
    expect(handleChangeInput).toHaveBeenCalledWith({ target: { name: 'birthdate', value: '1985-12-25' } })
    const { value } = state.picker
    expect([value.getFullYear(), value.getMonth(), value.getDate()]).toEqual([1985, 11, 25])
  })

  it('its value is still a field of the form, required when the birthdate is', () => {
    const { container } = renderForm()
    const hidden = container.querySelector('input[type="hidden"][name="birthdate"]')
    expect(hidden).toHaveValue('1990-03-04')
    const field = state.registered.find((entry) => entry.name === 'birthdate')
    expect(field.rules.required).toBe('Birthdate is required')
  })
})
