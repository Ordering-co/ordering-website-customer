import React, { useState } from 'react'
import { fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { PaymentOptionSquare } from '../index'

vi.mock('react-loading-skeleton/dist/skeleton.css', () => ({}))
vi.mock('react-loading-skeleton', () => ({
  default: () => <div data-testid='skeleton' />
}))
// the loader reports its size and height, so what each screen asks for can be read (the global mock does not)
vi.mock('~ui/src/components/SpinnerLoader', () => ({
  SpinnerLoader: ({ size, style }) => <div data-testid='spinner' data-size={size} data-height={style?.height}>loading</div>
}))
vi.mock('~ui/src/components/Confirm', () => ({
  Alert: () => null
}))
vi.mock('~components/components/PaymentOptionSquare', () => ({
  PaymentOptionSquare: ({ UIComponent, ...rest }) => (
    <UIComponent
      paymentMethods={[{ name: 'Card', value: 'card_payments' }]}
      methodSelected='card_payments'
      handleChangeMethodSelected={vi.fn()}
      isLoading={false}
      isLoadingMethod={false}
      isLoadingPlace={false}
      alertState={{ open: false, content: [] }}
      setAlertState={vi.fn()}
      {...rest}
    />
  )
}))

describe('PaymentOptionSquare', () => {
  it('renders square card payment container', () => {
    const { getByText } = renderWithProviders(<PaymentOptionSquare />)
    expect(getByText('Card')).toBeInTheDocument()
    expect(document.getElementById('card-container')).toBeInTheDocument()
  })

  it.each([
    ['card_payments', 'card-button', 'Accept'],
    ['ach_bank_transfer', 'ach-button', 'Pay with Bank Account'],
    ['gift_cards', 'gift-card-button', 'Pay with Gift Card']
  ])('the %s action is the base button and keeps the id Square binds', (methodSelected, id, text) => {
    const { getByText } = renderWithProviders(<PaymentOptionSquare methodSelected={methodSelected} />)
    const button = document.getElementById(id)
    expect(button).toBe(getByText(text).closest('button'))
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).toHaveAttribute('type', 'button')
    expect(button).not.toBeDisabled()
  })

  it('while the place loads: the md spinner, under the action, which is disabled and not covered', () => {
    const { getByTestId, queryByTestId, rerender } = renderWithProviders(<PaymentOptionSquare />)
    expect(queryByTestId('spinner')).toBeNull()
    rerender(<PaymentOptionSquare isLoadingPlace />)
    const spinner = getByTestId('spinner')
    const button = document.getElementById('card-button')
    expect(spinner).toHaveAttribute('data-size', 'md')
    expect(spinner).not.toHaveAttribute('data-height')
    expect(button).toBeDisabled()
    // in the flow after the button: not an overlay positioned over it
    expect(button.compareDocumentPosition(spinner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(spinner.parentElement).toBe(button.closest('div[class]').parentElement)
  })
})

it('moves tab focus without mounting a different Square method until activation', async () => {
  const paymentMethods = [
    { name: 'Card', value: 'card_payments' },
    { name: 'ACH', value: 'ach_bank_transfer' },
    { name: 'Gift', value: 'gift_cards' }
  ]
  const Fixture = () => {
    const [methodSelected, setMethod] = useState(paymentMethods[0].value)
    return <PaymentOptionSquare paymentMethods={paymentMethods} methodSelected={methodSelected} handleChangeMethodSelected={setMethod} />
  }
  const { getByRole } = renderWithProviders(<Fixture />)
  const card = getByRole('tab', { name: 'Card' })
  const cardMount = document.getElementById('card-container')
  card.focus()
  fireEvent.keyDown(document.activeElement, { key: 'ArrowRight' })
  await waitFor(() => expect(getByRole('tab', { name: 'ACH' })).toHaveFocus())
  expect(card).toHaveAttribute('aria-selected', 'true')
  expect(document.getElementById('card-container')).toBe(cardMount)
  expect(document.getElementById('ach-button')).toBeNull()
  fireEvent.click(document.activeElement)
  expect(document.getElementById('ach-button')).toBeInTheDocument()
  fireEvent.keyDown(document.activeElement, { key: 'ArrowRight' })
  await waitFor(() => expect(getByRole('tab', { name: 'Gift' })).toHaveFocus())
  expect(document.getElementById('gift-card-container')).toBeNull()
  fireEvent.click(document.activeElement)
  expect(document.getElementById('gift-card-container')).toBeInTheDocument()
  expect(document.getElementById('gift-card-button')).toBeInTheDocument()
})
