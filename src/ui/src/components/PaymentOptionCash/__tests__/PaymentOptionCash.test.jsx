import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { PaymentOptionCash } from '../index'

describe('PaymentOptionCash', () => {
  it('renders cash amount helper label', () => {
    const { getByText } = renderWithProviders(
      <PaymentOptionCash orderTotal={20} onChangeData={() => {}} />
    )
    expect(getByText(/Don't have exact amount/)).toBeInTheDocument()
  })

  it('reports that a prefilled cash amount below the total is insufficient', () => {
    const setErrorCash = vi.fn()
    const { getByRole, getByText } = renderWithProviders(
      <PaymentOptionCash defaultValue={10} orderTotal={20} setErrorCash={setErrorCash} />
    )
    expect(getByRole('textbox')).toHaveValue('10')
    expect(getByText(/This value must be greater than order total/)).toBeInTheDocument()
    expect(setErrorCash).toHaveBeenLastCalledWith(true)
  })

  it('the amount is the base Input, tied to its label; its touch redirect sits under it', () => {
    const { getByRole, getByText, container } = renderWithProviders(<PaymentOptionCash orderTotal={20} />)
    const field = getByRole('textbox')
    expect(field).toHaveAttribute('data-slot', 'input')
    expect(getByText(/Don't have exact amount/)).toHaveAttribute('for', field.id)
    expect(container.querySelector('label[aria-hidden="true"]')).toHaveAttribute('for', field.id)
  })

  describe('typing an amount (the controller hears it after a pause)', () => {
    const type = (field, value) => { field.value = value; fireEvent.keyUp(field, { key: '0' }) }

    it('a decimal amount that covers the total is reported; one that does not is only flagged', async () => {
      vi.useFakeTimers()
      try {
        const onChangeData = vi.fn()
        const setErrorCash = vi.fn()
        const { getByRole, getByText } = renderWithProviders(<PaymentOptionCash orderTotal={20} onChangeData={onChangeData} setErrorCash={setErrorCash} />)
        const field = getByRole('textbox')
        type(field, '25.50')
        await act(async () => { vi.advanceTimersByTime(1100) })
        expect(onChangeData).toHaveBeenCalledWith({ cash: 25.5 })
        expect(setErrorCash).toHaveBeenLastCalledWith(false)
        onChangeData.mockClear()
        type(field, '12.5')
        await act(async () => { vi.advanceTimersByTime(1100) })
        expect(onChangeData).not.toHaveBeenCalled()
        expect(setErrorCash).toHaveBeenLastCalledWith(true)
        expect(getByText(/This value must be greater than order total/)).toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })

    it('keys that are not digits, a space or a dot are blocked', () => {
      const { getByRole } = renderWithProviders(<PaymentOptionCash orderTotal={20} />)
      const field = getByRole('textbox')
      expect(fireEvent.keyPress(field, { key: 'a', charCode: 97 })).toBe(false)
      expect(fireEvent.keyPress(field, { key: '5', charCode: 53 })).toBe(true)
    })
  })
})
