import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../../styles/__tests__/themeTestUtils'
import { sendGiftCardFixture } from '../../../__tests__/helpers/giftCardStudentTestMocks'
import { SendGiftCard } from '../index'

vi.mock('~components/components/GiftCard/SendGiftCard', () => ({
  SendGiftCard: ({ UIComponent, ...rest }) => (
    <UIComponent {...sendGiftCardFixture} {...rest} />
  )
}))

describe('SendGiftCard', () => {
  it('renders send gift card form: its title an h2, the email field of type email', () => {
    const { getByText, getByRole, getByLabelText } = renderWithProviders(<SendGiftCard />)
    expect(getByRole('heading', { level: 2, name: 'Gift Card details' })).toBeInTheDocument()
    expect(getByText('Send gift card')).toBeInTheDocument()
    expect(getByLabelText('To')).toHaveAttribute('type', 'email')
  })

  it('labels follow the theme (field.label_position)', () => {
    const placeholder = renderWithProviders(<SendGiftCard />)
    expect(placeholder.container.querySelectorAll('label')).toHaveLength(0)
    placeholder.unmount()
    const theme = themeWithValues((values) => {
      values.components.field.base.label_position = 'above'
      return values
    })
    const above = renderWithProviders(<SendGiftCard />, { theme })
    expect(Array.from(above.container.querySelectorAll('label')).map((l) => l.textContent)).toEqual(['To', 'Name', 'Title', 'Messages'])
  })

  it('a missing email shows its error under the field', async () => {
    const handleSendGiftCard = vi.fn()
    const { getByText, getByLabelText } = renderWithProviders(<SendGiftCard handleSendGiftCard={handleSendGiftCard} />)
    await act(async () => {
      fireEvent.submit(getByText('Send gift card').closest('form'))
    })
    expect(handleSendGiftCard).not.toHaveBeenCalled()
    const email = getByLabelText('To')
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(email.getAttribute('aria-describedby'))).not.toBeNull()
    expect(document.getElementById(email.getAttribute('aria-describedby')).textContent).toBe('The field Email is required')
  })
})
