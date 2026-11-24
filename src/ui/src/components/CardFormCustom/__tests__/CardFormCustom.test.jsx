import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { CardFormCustom } from '../index'

const formErrors = vi.hoisted(() => ({ current: {} }))

vi.mock('react-credit-cards-2/es/styles-compiled.css', () => ({}))
vi.mock('react-credit-cards-2', () => ({
  default: () => <div data-testid='credit-card-preview' />
}))
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    handleSubmit: (fn) => fn,
    register: () => null,
    errors: formErrors.current,
    formState: { errors: formErrors.current }
  })
}))

describe('CardFormCustom', () => {
  it('renders custom card form fields', () => {
    const { getByPlaceholderText, getByText, getByTestId } = renderWithProviders(
      <CardFormCustom handleNewCard={vi.fn()} setAddCardOpen={vi.fn()} />
    )
    expect(getByTestId('credit-card-preview')).toBeInTheDocument()
    expect(getByPlaceholderText('Card number')).toBeInTheDocument()
    expect(getByText('Save')).toBeInTheDocument()
  })

  it('draws the fields and the submit with the base pieces and keeps their behavior', () => {
    formErrors.current = {}
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <CardFormCustom handleNewCard={vi.fn()} setAddCardOpen={vi.fn()} />
    )
    const number = getByPlaceholderText('Card number')
    expect(number).toHaveAttribute('data-slot', 'input')
    expect(number).toHaveAttribute('type', 'tel')
    expect(number).toHaveAttribute('inputmode', 'numeric')
    expect(number).toHaveAttribute('maxlength', '19')
    expect(number).not.toHaveAttribute('aria-invalid')
    expect(getByPlaceholderText('Expiry')).toHaveAttribute('data-slot', 'input')
    expect(getByPlaceholderText('CVC')).toHaveAttribute('data-slot', 'input')

    fireEvent.change(number, { target: { value: '4242424242424242' } })
    expect(number.value).toBe('4242 4242 4242 4242')

    const save = getByText('Save').closest('button')
    expect(save).toHaveAttribute('data-slot', 'button')
    expect(save).toHaveAttribute('type', 'submit')
    expect(save).not.toBeDisabled()
  })

  it('marks the field with an error as invalid and disables the submit', () => {
    formErrors.current = { number: { type: 'required' } }
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <CardFormCustom handleNewCard={vi.fn()} setAddCardOpen={vi.fn()} />
    )
    expect(getByPlaceholderText('Card number')).toHaveAttribute('aria-invalid', 'true')
    expect(getByPlaceholderText('Name')).not.toHaveAttribute('aria-invalid')
    expect(getByText('Save').closest('button')).toBeDisabled()
    formErrors.current = {}
  })
})
