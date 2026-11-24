import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'

vi.unmock('~ui/src/components/InputPhoneNumber')
// setupTests stubs the library for the screens' tests; the base InputPhone is the real thing here
vi.unmock('react-phone-number-input')
vi.mock('libphonenumber-js', () => ({
  default: (number) => ({ isValid: () => number === '+15555550123' })
}))

import { InputPhoneNumber } from '../index'

const draw = (props, mutate) => renderWith(
  themeWithValues(mutate),
  <InputPhoneNumber label='Phone' setValue={vi.fn()} handleIsValid={vi.fn()} user={{}} {...props} />
)

describe('InputPhoneNumber', () => {
  it('renders phone number input', () => {
    const { getByPlaceholderText } = renderWithProviders(
      <InputPhoneNumber value='' setValue={vi.fn()} handleIsValid={vi.fn()} user={{}} />
    )
    expect(getByPlaceholderText('Phone number')).toBeInTheDocument()
  })

  it('is the base InputPhone: the number is the base Input and the country a native select named in the user\'s language', () => {
    const { container, getByRole } = draw({ value: '' })
    expect(container.querySelector('.phone_number [data-slot=input-phone]')).not.toBeNull()
    expect(getByRole('textbox', { name: 'Phone' })).toHaveAttribute('data-slot', 'input')
    expect(container.querySelector('[data-slot=input-phone-country] select')).toHaveAttribute('aria-label', 'Phone number country')
  })

  it('`align` goes to the piece: the number is centered only when a screen asks for it', () => {
    const plain = draw({ value: '' })
    expect(plain.getByRole('textbox', { name: 'Phone' }).className).not.toContain('ui:text-center')
    plain.unmount()
    expect(draw({ value: '', align: 'center' }).getByRole('textbox', { name: 'Phone' }).className).toContain('ui:text-center')
  })

  // implementation notesthe phone's keyboard offers the phone number to fill in, and the number pad
  it('the number is a tel field that says it is a phone number, with the Enter hint of its screen', () => {
    const { getByRole, container } = draw({ value: '', enterKeyHint: 'done' })
    const input = getByRole('textbox', { name: 'Phone' })
    expect(input).toHaveAttribute('type', 'tel')
    expect(input).toHaveAttribute('autocomplete', 'tel')
    expect(input).toHaveAttribute('inputmode', 'tel')
    expect(input).toHaveAttribute('enterkeyhint', 'done')
    // the country select stays the platform's select, not an input to fill in
    expect(container.querySelector('[data-slot=input-phone-country] select')).not.toHaveAttribute('autocomplete', 'tel')
  })

  it('typing a number sends it with whether it validates', () => {
    const setValue = vi.fn()
    const { getByRole } = draw({ value: '', setValue })
    fireEvent.change(getByRole('textbox', { name: 'Phone' }), { target: { value: '+15555550123' } })
    expect(setValue).toHaveBeenCalledWith('+15555550123', true)
  })
})

describe('InputPhoneNumber label (field.base.label_position)', () => {
  it('above: its label over the number, tied to its input', () => {
    const { container, getByRole } = draw({ value: '' }, (values) => {
      values.components.field.base.label_position = 'above'
      return values
    })
    const input = getByRole('textbox', { name: 'Phone' })
    expect(input.id).toBeTruthy()
    expect(container.querySelector(`label[for="${input.id}"]`)).toHaveTextContent('Phone')
  })

  it('by default (placeholder): no label', () => {
    const { container } = draw({ value: '' })
    expect(container.querySelector('label')).toBeNull()
  })
})

describe('InputPhoneNumber: its name and its error (a11y)', () => {
  it('labels as placeholders: the number is named by its label', () => {
    const { getByRole } = draw({ value: '' })
    expect(getByRole('textbox', { name: 'Phone' })).not.toHaveAttribute('aria-labelledby')
  })

  it('labels above: the <label> names it, no aria-label', () => {
    const { getByRole } = draw({ value: '' }, (values) => {
      values.components.field.base.label_position = 'above'
      return values
    })
    expect(getByRole('textbox', { name: 'Phone' })).not.toHaveAttribute('aria-label')
  })

  it('an invalid number: its message tied to the number, aria-invalid', () => {
    const { getByRole, container } = draw({ value: '+1234' })
    const input = getByRole('textbox', { name: 'Phone' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const message = container.querySelector(`#${CSS.escape(input.getAttribute('aria-describedby'))}`)
    expect(message).toHaveTextContent('The Phone Number field is invalid')
  })

  it('the screen\'s error (isError, errorText): shown and tied the same way, with the theme\'s error border', () => {
    const { getByRole, container } = draw({ value: '', isError: true, errorText: 'The field Mobile phone is required.' })
    const input = getByRole('textbox', { name: 'Phone' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('class')).toContain('ui:aria-invalid:[border:var(--ui-input-error-border,var(--ui-input-border))]')
    expect(container.querySelector(`#${CSS.escape(input.getAttribute('aria-describedby'))}`)).toHaveTextContent('The field Mobile phone is required.')
  })

  it('a valid number: no error', () => {
    const { getByRole, container } = draw({ value: '+15555550123' })
    const input = getByRole('textbox', { name: 'Phone' })
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-describedby')
    expect(container.textContent).not.toContain('invalid')
  })
})
