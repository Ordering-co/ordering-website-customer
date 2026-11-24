import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../styles/__tests__/themeTestUtils'
import { redeemGiftCardFixture } from '../../../__tests__/helpers/giftCardStudentTestMocks'
import { RedeemGiftCard } from '../index'

vi.mock('~components/components/GiftCard/RedeemGiftCard', () => ({
  RedeemGiftCard: ({ UIComponent, ...rest }) => (
    <UIComponent {...redeemGiftCardFixture} {...rest} />
  )
}))

const labelsAbove = () => themeWithValues((values) => {
  values.components.field.base.label_position = 'above'
  return values
})

describe('RedeemGiftCard', () => {
  it('renders redeem form fields, each named', () => {
    const { getByText, getByLabelText } = renderWithProviders(<RedeemGiftCard onClose={vi.fn()} />)
    expect(getByText('Redeem a gift card')).toBeInTheDocument()
    expect(getByText('Apply to your balance')).toBeInTheDocument()
    expect(getByLabelText('Gift card code')).toHaveAttribute('type', 'text')
    expect(getByLabelText('Gift card password')).toHaveAttribute('type', 'password')
  })

  it('labels above the fields when the theme says so (field.label_position)', () => {
    const placeholder = renderWithProviders(<RedeemGiftCard onClose={vi.fn()} />)
    expect(placeholder.container.querySelectorAll('label')).toHaveLength(0)
    placeholder.unmount()
    const above = renderWithProviders(<RedeemGiftCard onClose={vi.fn()} />, { theme: labelsAbove() })
    const labels = Array.from(above.container.querySelectorAll('label'))
    expect(labels.map((l) => l.textContent)).toEqual(['Gift card code', 'Gift card password'])
    labels.forEach((label) => expect(above.container.querySelector(`#${CSS.escape(label.htmlFor)}`)).not.toBeNull())
  })

  it('a missing field shows its error under it, read with the field, not in an alert', async () => {
    const handleApply = vi.fn()
    const { getByText, getByLabelText, queryByText } = renderWithProviders(<RedeemGiftCard onClose={vi.fn()} handleApply={handleApply} />)
    await act(async () => {
      fireEvent.click(getByText('Apply to your balance'))
    })
    expect(handleApply).not.toHaveBeenCalled()
    const code = getByLabelText('Gift card code')
    expect(code).toHaveAttribute('aria-invalid', 'true')
    const error = document.getElementById(code.getAttribute('aria-describedby'))
    expect(error).not.toBeNull()
    expect(error.textContent).toBe('Code is required')
    const password = getByLabelText('Gift card password')
    expect(document.getElementById(password.getAttribute('aria-describedby')).textContent).toBe('The field Password is required')
    expect(queryByText('Error')).toBeNull()
  })

  it('an error of the request is shown in an alert', () => {
    const { getByText } = renderWithProviders(
      <RedeemGiftCard onClose={vi.fn()} actionState={{ loading: false, error: ['Invalid code'] }} />
    )
    expect(getByText('Invalid code')).toBeInTheDocument()
  })

  it('shows redeemed gift card summary: from its sender, its type translated', () => {
    const { getByText, queryByText } = renderWithProviders(
      <RedeemGiftCard
        onClose={vi.fn()}
        redeemedGiftCard={{
          type: 'cash',
          amount: 25,
          author: { name: 'Ann', lastname: 'Smith' },
          receiver: { name: 'Jane', lastname: 'Doe' },
          title: 'Happy Birthday',
          message: 'Enjoy!'
        }}
      />
    )
    expect(getByText('Gift card')).toBeInTheDocument()
    expect(getByText(/From: Ann Smith/)).toBeInTheDocument()
    expect(queryByText(/Jane Doe/)).toBeNull()
    expect(getByText(/Type: Cash Wallet/)).toBeInTheDocument()
    fireEvent.click(getByText('Ok'))
  })
})
